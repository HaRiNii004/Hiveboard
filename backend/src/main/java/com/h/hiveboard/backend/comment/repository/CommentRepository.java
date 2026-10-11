package com.h.hiveboard.backend.comment.repository;

import com.h.hiveboard.backend.comment.entity.Comment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID> {
    // Every comment and reply on a card in one query (oldest first), author
    // included; CommentService arranges them into threads.
    @EntityGraph(attributePaths = "author")
    List<Comment> findByCardIdOrderByCreatedAtAsc(UUID cardId);
}
