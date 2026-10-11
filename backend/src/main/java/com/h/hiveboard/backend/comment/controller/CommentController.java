package com.h.hiveboard.backend.comment.controller;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.comment.dto.CommentDtos.CommentResponse;
import com.h.hiveboard.backend.comment.dto.CommentDtos.CreateCommentRequest;
import com.h.hiveboard.backend.comment.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    // Nested under the card because a comment can't exist without one.
    @GetMapping("/api/cards/{cardId}/comments")
    public ResponseEntity<List<CommentResponse>> getComments(@AuthenticationPrincipal User user,
                                                             @PathVariable UUID cardId) {
        return ResponseEntity.ok(commentService.getComments(cardId, user));
    }

    @PostMapping("/api/cards/{cardId}/comments")
    public ResponseEntity<CommentResponse> addComment(@AuthenticationPrincipal User user,
                                                      @PathVariable UUID cardId,
                                                      @Valid @RequestBody CreateCommentRequest request) {
        return ResponseEntity.ok(commentService.addComment(cardId, user, request));
    }
}
