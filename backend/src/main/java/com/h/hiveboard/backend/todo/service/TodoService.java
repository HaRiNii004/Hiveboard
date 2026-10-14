package com.h.hiveboard.backend.todo.service;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.board.entity.Board;
import com.h.hiveboard.backend.exception.ResourceNotFoundException;
import com.h.hiveboard.backend.member.entity.BoardRole;
import com.h.hiveboard.backend.member.service.BoardAccessService;
import com.h.hiveboard.backend.todo.dto.TodoDtos.CreateTodoRequest;
import com.h.hiveboard.backend.todo.dto.TodoDtos.ReorderTodosRequest;
import com.h.hiveboard.backend.todo.dto.TodoDtos.TodoResponse;
import com.h.hiveboard.backend.todo.dto.TodoDtos.UpdateTodoRequest;
import com.h.hiveboard.backend.todo.entity.TodoItem;
import com.h.hiveboard.backend.todo.repository.TodoItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

// The current user's personal to-do list. Everything is looked up by (id, owner),
// so someone else's item simply doesn't exist for you (404).
@Service
@RequiredArgsConstructor
public class TodoService {

    private static final int MAX_ITEMS = 500;

    private final TodoItemRepository todoItemRepository;
    private final BoardAccessService boardAccessService; // you can only link boards you're on

    // All your tasks, or (with boardId) just the ones linked to that board
    @Transactional(readOnly = true)
    public List<TodoResponse> getTodos(User user, UUID boardId) {
        List<TodoItem> items;
        if (boardId != null) {
            boardAccessService.requireRole(boardId, user, BoardRole.VIEWER); // 404 if not your board
            items = todoItemRepository.findByOwnerIdAndBoardIdOrderByPositionAsc(user.getId(), boardId);
        } else {
            items = todoItemRepository.findByOwnerIdOrderByPositionAsc(user.getId());
        }
        return items.stream().map(TodoResponse::from).toList();
    }

    // New items go to the bottom of the list
    @Transactional
    public TodoResponse addTodo(User user, CreateTodoRequest request) {
        if (todoItemRepository.countByOwnerId(user.getId()) >= MAX_ITEMS) {
            throw new IllegalArgumentException("Your list is full (" + MAX_ITEMS + " items). Clear some completed tasks first.");
        }
        double position = todoItemRepository.findMaxPositionByOwnerId(user.getId()).orElse(-1.0) + 1.0;
        TodoItem item = TodoItem.builder()
                .owner(user)
                .text(request.text().trim())
                .position(position)
                .board(request.boardId() != null ? linkableBoard(request.boardId(), user) : null)
                .build();
        // Flush so createdAt is filled in for the response
        todoItemRepository.saveAndFlush(item);
        return TodoResponse.from(item);
    }

    @Transactional
    public TodoResponse updateTodo(UUID id, User user, UpdateTodoRequest request) {
        TodoItem item = findOwned(id, user);

        if (request.text() != null) {
            String text = request.text().trim();
            if (text.isEmpty()) {
                throw new IllegalArgumentException("A task can't be empty");
            }
            item.setText(text);
        }
        if (Boolean.TRUE.equals(request.unlinkBoard())) {
            item.setBoard(null);
        } else if (request.boardId() != null) {
            item.setBoard(linkableBoard(request.boardId(), user));
        }
        if (request.done() != null && request.done() != item.isDone()) {
            item.setDone(request.done());
            item.setCompletedAt(request.done() ? Instant.now().truncatedTo(ChronoUnit.MICROS) : null);
        }
        todoItemRepository.save(item);
        return TodoResponse.from(item);
    }

    @Transactional
    public void deleteTodo(UUID id, User user) {
        todoItemRepository.delete(findOwned(id, user));
    }

    @Transactional
    public int clearCompleted(User user) {
        return todoItemRepository.deleteCompletedByOwnerId(user.getId());
    }

    // Same contract as card reordering: send every one of your item ids in the new order
    @Transactional
    public List<TodoResponse> reorder(User user, ReorderTodosRequest request) {
        List<TodoItem> items = todoItemRepository.findByOwnerIdOrderByPositionAsc(user.getId());
        Map<UUID, TodoItem> byId = items.stream().collect(Collectors.toMap(TodoItem::getId, Function.identity()));

        List<UUID> orderedIds = request.orderedIds();
        if (orderedIds.size() != byId.size() || !byId.keySet().equals(new HashSet<>(orderedIds))) {
            throw new IllegalArgumentException("Your list changed (maybe in another tab). Reload and try again.");
        }
        for (int i = 0; i < orderedIds.size(); i++) {
            byId.get(orderedIds.get(i)).setPosition((double) i);
        }
        todoItemRepository.saveAll(items);
        return orderedIds.stream().map(byId::get).map(TodoResponse::from).toList();
    }

    // Any board you're a member of (viewers too: the task is still only yours)
    private Board linkableBoard(UUID boardId, User user) {
        return boardAccessService.requireRole(boardId, user, BoardRole.VIEWER);
    }

    private TodoItem findOwned(UUID id, User user) {
        return todoItemRepository.findByIdAndOwnerId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No task with id " + id));
    }
}
