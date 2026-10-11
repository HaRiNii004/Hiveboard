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

        Comment comment = Comment.builder()
                .text(request.text().trim())
                .card(card)
                .author(user)
                .parent(request.parentId() != null ? findThreadRoot(request.parentId(), card) : null)
                .build();

        // Flush so @CreationTimestamp is filled in before we build the response
        commentRepository.saveAndFlush(comment);
        return CommentResponse.from(comment);
    }

    // The comment being replied to must be on the same card. Replying to a reply
    // joins the same thread, keeping threads one level deep.
    private Comment findThreadRoot(UUID parentId, Card card) {
        Comment parent = commentRepository.findById(parentId)
                .orElseThrow(() -> new ResourceNotFoundException("No comment with id " + parentId));

        if (!parent.getCard().getId().equals(card.getId())) {
            throw new IllegalArgumentException("You can only reply to comments on the same card");
        }
        return parent.getParent() != null ? parent.getParent() : parent;
    }
}
