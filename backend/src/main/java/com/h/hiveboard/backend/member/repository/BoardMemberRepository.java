package com.h.hiveboard.backend.member.repository;

import com.h.hiveboard.backend.member.entity.BoardMember;
import com.h.hiveboard.backend.member.entity.BoardRole;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BoardMemberRepository extends JpaRepository<BoardMember, UUID> {

    Optional<BoardMember> findByBoardIdAndUserId(UUID boardId, Long userId);

    // "My boards": every board I'm a member of, with the board and its creator loaded.
    @EntityGraph(attributePaths = {"board", "board.owner"})
    List<BoardMember> findByUserId(Long userId);

    // Members list, oldest first, with each user loaded for name/email.
    @EntityGraph(attributePaths = "user")
    List<BoardMember> findByBoardIdOrderByJoinedAtAsc(UUID boardId);

    long countByBoardIdAndRole(UUID boardId, BoardRole role);

    boolean existsByBoardIdAndUserEmailIgnoreCase(UUID boardId, String email);
}
