package com.h.hiveboard.backend.comment.dto;

import com.h.hiveboard.backend.comment.entity.Comment;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class CommentDtos {

    // parentId: the comment being replied to (null for a new top-level comment)
    public record CreateCommentRequest(@NotBlank @Size(max = 2000) String text, UUID parentId) {}

    // Top-level comments carry their replies; replies have parentId set and no replies.
    public record CommentResponse(UUID id, String text, String authorName, Instant createdAt,
                                  UUID parentId, List<CommentResponse> replies) {
        public static CommentResponse from(Comment comment, List<CommentResponse> replies) {
            return new CommentResponse(comment.getId(), comment.getText(),
                    comment.getAuthor().getFullName(), comment.getCreatedAt(),
                    comment.getParent() != null ? comment.getParent().getId() : null, replies);
        }

        public static CommentResponse from(Comment comment) {
            return from(comment, List.of());
        }
    }
}
