package com.h.hiveboard.backend.comment.service;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.card.entity.Card;
import com.h.hiveboard.backend.card.service.CardService;
import com.h.hiveboard.backend.comment.dto.CommentDtos.CommentResponse;
import com.h.hiveboard.backend.comment.dto.CommentDtos.CreateCommentRequest;
import com.h.hiveboard.backend.comment.entity.Comment;
import com.h.hiveboard.backend.comment.repository.CommentRepository;
import com.h.hiveboard.backend.exception.ResourceNotFoundException;
import com.h.hiveboard.backend.member.entity.BoardMember;
import com.h.hiveboard.backend.member.entity.BoardRole;
import com.h.hiveboard.backend.member.repository.BoardMemberRepository;
import com.h.hiveboard.backend.notification.service.NotificationService;
import com.h.hiveboard.backend.activity.entity.ActivityType;
import com.h.hiveboard.backend.activity.service.ActivityRecorder;
import com.h.hiveboard.backend.realtime.service.BoardEventPublisher;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.CommentAddedPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final CardService cardService; // finds cards with a role check
    private final BoardMemberRepository boardMemberRepository;
    private final NotificationService notificationService;
    private final BoardEventPublisher boardEventPublisher;
    private final ActivityRecorder activityRecorder;         // the board's history

    // Threads: top-level comments newest first, each with its replies oldest first.
    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(UUID cardId, User user) {
        Card card = cardService.getCardForRole(cardId, user, BoardRole.VIEWER);
        List<Comment> all = commentRepository.findByCardIdOrderByCreatedAtAsc(card.getId());

        Map<UUID, List<CommentResponse>> repliesByParent = new HashMap<>();
        for (Comment comment : all) {
            if (comment.getParent() != null) {
                repliesByParent.computeIfAbsent(comment.getParent().getId(), id -> new ArrayList<>())
                        .add(CommentResponse.from(comment));
            }
        }

        List<CommentResponse> threads = new ArrayList<>();
        for (Comment comment : all) {
            if (comment.getParent() == null) {
                threads.add(0, CommentResponse.from(comment,
                        repliesByParent.getOrDefault(comment.getId(), List.of())));
            }
        }
        return threads;
    }

    @Transactional
    public CommentResponse addComment(UUID cardId, User user, CreateCommentRequest request) {
        Card card = cardService.getEditableCard(cardId, user); // not on archived cards
        Comment repliedTo = request.parentId() != null ? findParent(request.parentId(), card) : null;
        // Threads are one level deep: replying to a reply joins its thread
        Comment threadRoot = repliedTo == null ? null
                : repliedTo.getParent() != null ? repliedTo.getParent() : repliedTo;

        String text = request.text().trim();
        Comment comment = Comment.builder()
                .text(text)
                .card(card)
                .author(user)
                .parent(threadRoot)
                .mentions(resolveMentions(card, text, request.mentionedUserIds()))
                .build();

        // Flush so @CreationTimestamp is filled in before we build the response
        commentRepository.saveAndFlush(comment);

        activityRecorder.card(card, user, ActivityType.COMMENT_ADDED,
                (repliedTo != null ? "replied to " + repliedTo.getAuthor().getFullName() + " on {card}: "
                        : "commented on {card}: ") + ActivityRecorder.quote(comment.getText()));

        // Mentioned people get "mentioned you"; the people replied to get "replied to you"
        // (unless they were mentioned too: one notification each)
        notificationService.commentMentioned(comment, comment.getMentions(), user);
        if (repliedTo != null) {
            List<User> repliedToAuthors = Stream
                    .of(repliedTo.getAuthor(), threadRoot.getAuthor())
                    .filter(author -> comment.getMentions().stream().noneMatch(m -> m.getId().equals(author.getId())))
                    .toList();
            notificationService.commentReplied(comment, repliedToAuthors, user);
        }

        // Lets open boards update the card's comment count (and open comment popups refresh)
        CommentAddedPayload payload = new CommentAddedPayload(card.getBoardList().getId(), card.getId(),
                commentRepository.countByCardId(card.getId()));
        boardEventPublisher.publish(card.getBoardList().getBoard().getId(), "COMMENT_ADDED", user, payload,
                card.isHiddenFromViewers() ? null : "COMMENT_ADDED", payload);
        return CommentResponse.from(comment);
    }

    // Mentions must be people on the board who can see the card, and must actually be in
    // the text as "@Full Name" (a mention deleted while typing doesn't notify anyone).
    private Set<User> resolveMentions(Card card, String text, List<Long> userIds) {
        Set<User> mentioned = new HashSet<>();
        if (userIds == null) return mentioned;
        UUID boardId = card.getBoardList().getBoard().getId();
        String lower = text.toLowerCase(Locale.ROOT);
        for (Long userId : new LinkedHashSet<>(userIds)) {
            BoardMember member = boardMemberRepository.findByBoardIdAndUserId(boardId, userId)
                    .orElseThrow(() -> new IllegalArgumentException("You can only mention people on this board"));
            if (card.isHiddenFromViewers() && member.getRole() == BoardRole.VIEWER) {
                throw new IllegalArgumentException(member.getUser().getFullName()
                        + " can't see this card (it's hidden from viewers), so they can't be mentioned");
            }
            if (lower.contains("@" + member.getUser().getFullName().toLowerCase(Locale.ROOT))) {
                mentioned.add(member.getUser());
            }
        }
        return mentioned;
    }

    // The comment being replied to must be on the same card.
    private Comment findParent(UUID parentId, Card card) {
        Comment parent = commentRepository.findById(parentId)
                .orElseThrow(() -> new ResourceNotFoundException("No comment with id " + parentId));

        if (!parent.getCard().getId().equals(card.getId())) {
            throw new IllegalArgumentException("You can only reply to comments on the same card");
        }
        return parent;
    }
}
