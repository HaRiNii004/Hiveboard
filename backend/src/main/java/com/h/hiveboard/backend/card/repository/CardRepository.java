package com.h.hiveboard.backend.card.repository;

import com.h.hiveboard.backend.boardlist.entity.BoardList;
import com.h.hiveboard.backend.card.entity.Card;
import com.h.hiveboard.backend.member.entity.BoardRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CardRepository extends JpaRepository<Card, UUID> {
    List<Card> findByBoardListOrderByPositionAsc(BoardList boardList);

    // Cards still on the board in this list (not archived), in position order
    List<Card> findByBoardListAndArchivedFalseOrderByPositionAsc(BoardList boardList);

    // The board's archive, most recently archived first
    @Query("SELECT c FROM Card c JOIN FETCH c.boardList l LEFT JOIN FETCH c.archivedBy "
            + "WHERE l.board.id = :boardId AND c.archived = true ORDER BY c.archivedAt DESC")
    List<Card> findArchivedByBoardId(UUID boardId);

    @Query("SELECT MAX(c.position) FROM Card c WHERE c.boardList.id = :listId")
    Optional<Double> findMaxPositionByListId(UUID listId);

    // When someone leaves or is removed from a board, their cards there become unassigned.
    @Modifying
    @Query("UPDATE Card c SET c.assignee = null, c.assignedBy = null, c.assignedAt = null, c.version = c.version + 1 "
            + "WHERE c.assignee.id = :userId "
            + "AND c.boardList.id IN (SELECT l.id FROM BoardList l WHERE l.board.id = :boardId)")
    int unassignUserOnBoard(UUID boardId, Long userId);

    // The calendar: cards due between from and to (inclusive) on every board the user is a
    // member of. Cards hidden from viewers are left out on boards where the user is a viewer.
    @Query("SELECT c FROM Card c JOIN FETCH c.boardList l JOIN FETCH l.board b LEFT JOIN FETCH c.assignee "
            + "WHERE c.dueDate BETWEEN :from AND :to AND c.archived = false AND l.archived = false "
            + "AND EXISTS (SELECT m.id FROM BoardMember m WHERE m.board = b AND m.user.id = :userId "
            + "AND (c.hiddenFromViewers = false OR m.role <> :viewer))")
    List<Card> findDueBetweenForMember(Long userId, LocalDate from, LocalDate to, BoardRole viewer);
}
