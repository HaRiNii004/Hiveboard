package com.h.hiveboard.backend.comment.dto;

import com.h.hiveboard.backend.comment.entity.Comment;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

public class CommentDtos {

    // parentId: the comment being replied to (null for a new top-level comment)
    // mentionedUserIds: board members picked with @ (each must appear as "@Full Name" in the text)
    public record CreateCommentRequest(@NotBlank @Size(max = 2000) String text, UUID parentId,
                                       @Size(max = 20) List<Long> mentionedUserIds) {}

    public record MentionResponse(Long id, String fullName) {}

    // Top-level comments carry their replies; replies have parentId set and no replies.
    // mentions: who "@Name" in the text refers to (for highlighting)
    public record CommentResponse(UUID id, String text, String authorName, Instant createdAt,
                                  UUID parentId, List<CommentResponse> replies, List<MentionResponse> mentions) {
        public static CommentResponse from(Comment comment, List<CommentResponse> replies) {
            List<MentionResponse> mentions = comment.getMentions().stream()
                    .map(u -> new MentionResponse(u.getId(), u.getFullName()))
                    .sorted(Comparator.comparing(MentionResponse::fullName))
                    .toList();
            return new CommentResponse(comment.getId(), comment.getText(),
                    comment.getAuthor().getFullName(), comment.getCreatedAt(),
                    comment.getParent() != null ? comment.getParent().getId() : null, replies, mentions);
        }

        public static CommentResponse from(Comment comment) {
            return from(comment, List.of());
        }
    }
}
