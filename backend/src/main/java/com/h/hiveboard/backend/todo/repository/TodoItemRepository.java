package com.h.hiveboard.backend.todo.repository;

import com.h.hiveboard.backend.todo.entity.TodoItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

// Every query is scoped to an owner, so one user can never reach another's items.
@Repository
public interface TodoItemRepository extends JpaRepository<TodoItem, UUID> {

    @EntityGraph(attributePaths = "board")
    List<TodoItem> findByOwnerIdOrderByPositionAsc(Long ownerId);

    // Just the tasks linked to one board (the board page's "My tasks" panel)
    @EntityGraph(attributePaths = "board")
    List<TodoItem> findByOwnerIdAndBoardIdOrderByPositionAsc(Long ownerId, UUID boardId);

    Optional<TodoItem> findByIdAndOwnerId(UUID id, Long ownerId);

    long countByOwnerId(Long ownerId);

    @Query("SELECT MAX(t.position) FROM TodoItem t WHERE t.owner.id = :ownerId")
    Optional<Double> findMaxPositionByOwnerId(Long ownerId);

    @Modifying
    @Query("DELETE FROM TodoItem t WHERE t.owner.id = :ownerId AND t.done = true")
    int deleteCompletedByOwnerId(Long ownerId);

    // Someone left / was removed from a board: their tasks stay, without the link
    @Modifying
    @Query("UPDATE TodoItem t SET t.board = null WHERE t.owner.id = :ownerId AND t.board.id = :boardId")
    int unlinkBoard(Long ownerId, UUID boardId);
}
