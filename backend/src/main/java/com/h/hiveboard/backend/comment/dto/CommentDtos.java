package com.h.hiveboard.backend.comment.dto;

import com.h.hiveboard.backend.comment.entity.Comment;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public class CommentDtos {

    public record CreateCommentRequest(@NotBlank @Size(max = 2000) String text) {}

    public record CommentResponse(UUID id, String text, String authorName, Instant createdAt) {
        public static CommentResponse from(Comment comment) {
            return new CommentResponse(comment.getId(), comment.getText(),
                    comment.getAuthor().getFullName(), comment.getCreatedAt());
        }
    }
}
