package com.h.hiveboard.backend.comment.service;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.card.entity.Card;
import com.h.hiveboard.backend.card.service.CardService;
import com.h.hiveboard.backend.comment.dto.CommentDtos.CommentResponse;
import com.h.hiveboard.backend.comment.dto.CommentDtos.CreateCommentRequest;
import com.h.hiveboard.backend.comment.entity.Comment;
import com.h.hiveboard.backend.comment.repository.CommentRepository;
import com.h.hiveboard.backend.exception.ResourceNotFoundException;
import com.h.hiveboard.backend.member.entity.BoardRole;
import com.h.hiveboard.backend.notification.service.NotificationService;
import com.h.hiveboard.backend.realtime.service.BoardEventPublisher;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.CommentAddedPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final CardService cardService; // finds cards with a role check
    private final NotificationService notificationService;
    private final BoardEventPublisher boardEventPublisher;

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
        Card card = cardService.getCardForRole(cardId, user, BoardRole.MEMBER);
        Comment repliedTo = request.parentId() != null ? findParent(request.parentId(), card) : null;
        // Threads are one level deep: replying to a reply joins its thread
        Comment threadRoot = repliedTo == null ? null
                : repliedTo.getParent() != null ? repliedTo.getParent() : repliedTo;

        Comment comment = Comment.builder()
                .text(request.text().trim())
                .card(card)
                .author(user)
                .parent(threadRoot)
                .build();

        // Flush so @CreationTimestamp is filled in before we build the response
        commentRepository.saveAndFlush(comment);

        if (repliedTo != null) {
            // The person replied to, and whoever started the thread
            notificationService.commentReplied(comment, List.of(repliedTo.getAuthor(), threadRoot.getAuthor()), user);
        }

        // Lets open boards update the card's comment count (and open comment popups refresh)
        CommentAddedPayload payload = new CommentAddedPayload(card.getBoardList().getId(), card.getId(),
                commentRepository.countByCardId(card.getId()));
        boardEventPublisher.publish(card.getBoardList().getBoard().getId(), "COMMENT_ADDED", user, payload,
                card.isHiddenFromViewers() ? null : "COMMENT_ADDED", payload);
        return CommentResponse.from(comment);
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
