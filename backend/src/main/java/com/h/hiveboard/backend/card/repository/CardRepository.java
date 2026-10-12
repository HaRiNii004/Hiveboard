package com.h.hiveboard.backend.card.repository;

import com.h.hiveboard.backend.boardlist.entity.BoardList;
import com.h.hiveboard.backend.card.entity.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CardRepository extends JpaRepository<Card, UUID> {
    List<Card> findByBoardListOrderByPositionAsc(BoardList boardList);

    @Query("SELECT MAX(c.position) FROM Card c WHERE c.boardList.id = :listId")
    Optional<Double> findMaxPositionByListId(UUID listId);

    // When someone leaves or is removed from a board, their cards there become unassigned.
    @Modifying
    @Query("UPDATE Card c SET c.assignee = null, c.assignedBy = null, c.assignedAt = null, c.version = c.version + 1 "
            + "WHERE c.assignee.id = :userId "
            + "AND c.boardList.id IN (SELECT l.id FROM BoardList l WHERE l.board.id = :boardId)")
    int unassignUserOnBoard(UUID boardId, Long userId);
}
