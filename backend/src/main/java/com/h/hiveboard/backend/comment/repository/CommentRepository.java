package com.h.hiveboard.backend.comment.repository;

import com.h.hiveboard.backend.comment.entity.Comment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID> {
    // Newest first; author fetched in the same query since every comment shows its name.
    @EntityGraph(attributePaths = "author")
    List<Comment> findByCardIdOrderByCreatedAtDesc(UUID cardId);
}
