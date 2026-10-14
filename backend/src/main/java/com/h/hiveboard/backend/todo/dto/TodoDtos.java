package com.h.hiveboard.backend.todo.dto;

import com.h.hiveboard.backend.todo.entity.TodoItem;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class TodoDtos {

    // boardId: optionally link the new task to a board you're a member of
    public record CreateTodoRequest(@NotBlank @Size(max = 500) String text, UUID boardId) {}

    // Partial update: leave a field out (null) to keep it as it is.
    // boardId links the task to that board; unlinkBoard = true removes the link.
    public record UpdateTodoRequest(@Size(max = 500) String text, Boolean done,
                                    UUID boardId, Boolean unlinkBoard) {}

    public record TodoBoardResponse(UUID id, String name) {}

    // Every one of your item ids, in the new order
    public record ReorderTodosRequest(@NotEmpty List<UUID> orderedIds) {}

    // board is null when the task isn't linked to one
    public record TodoResponse(UUID id, String text, boolean done, Double position,
                               Instant createdAt, Instant completedAt, TodoBoardResponse board) {
        public static TodoResponse from(TodoItem item) {
            TodoBoardResponse board = item.getBoard() == null ? null
                    : new TodoBoardResponse(item.getBoard().getId(), item.getBoard().getName());
            return new TodoResponse(item.getId(), item.getText(), item.isDone(), item.getPosition(),
                    item.getCreatedAt(), item.getCompletedAt(), board);
        }
    }
}
