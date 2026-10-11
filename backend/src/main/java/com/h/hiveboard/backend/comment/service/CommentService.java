package com.h.hiveboard.backend.comment.service;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.card.entity.Card;
import com.h.hiveboard.backend.card.service.CardService;
import com.h.hiveboard.backend.comment.dto.CommentDtos.CommentResponse;
import com.h.hiveboard.backend.comment.dto.CommentDtos.CreateCommentRequest;
import com.h.hiveboard.backend.comment.entity.Comment;
import com.h.hiveboard.backend.comment.repository.CommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final CardService cardService; // reused for its ownership check

    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(UUID cardId, User user) {
        Card card = cardService.getOwnedCard(cardId, user);
        return commentRepository.findByCardIdOrderByCreatedAtDesc(card.getId())
                .stream()
                .map(CommentResponse::from)
                .toList();
    }

    @Transactional
    public CommentResponse addComment(UUID cardId, User user, CreateCommentRequest request) {
        Card card = cardService.getOwnedCard(cardId, user);

        Comment comment = Comment.builder()
                .text(request.text().trim())
                .card(card)
                .author(user)
                .build();

        // Flush so @CreationTimestamp is filled in before we build the response
        commentRepository.saveAndFlush(comment);
        return CommentResponse.from(comment);
    }
}
