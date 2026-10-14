package com.h.hiveboard.backend.todo.controller;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.todo.dto.TodoDtos.CreateTodoRequest;
import com.h.hiveboard.backend.todo.dto.TodoDtos.ReorderTodosRequest;
import com.h.hiveboard.backend.todo.dto.TodoDtos.TodoResponse;
import com.h.hiveboard.backend.todo.dto.TodoDtos.UpdateTodoRequest;
import com.h.hiveboard.backend.todo.service.TodoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

// "My Tasks": always the logged-in user's own to-do list
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/todos")
public class TodoController {

    private final TodoService todoService;

    // ?boardId=... returns only the tasks linked to that board
    @GetMapping
    public ResponseEntity<List<TodoResponse>> list(@AuthenticationPrincipal User user,
                                                   @RequestParam(required = false) UUID boardId) {
        return ResponseEntity.ok(todoService.getTodos(user, boardId));
    }

    @PostMapping
    public ResponseEntity<TodoResponse> add(@AuthenticationPrincipal User user,
                                            @Valid @RequestBody CreateTodoRequest request) {
        return ResponseEntity.ok(todoService.addTodo(user, request));
    }

    // Edit text and/or tick off (partial update)
    @PatchMapping("/{id}")
    public ResponseEntity<TodoResponse> update(@AuthenticationPrincipal User user, @PathVariable UUID id,
                                               @Valid @RequestBody UpdateTodoRequest request) {
        return ResponseEntity.ok(todoService.updateTodo(id, user, request));
    }

    @PatchMapping("/reorder")
    public ResponseEntity<List<TodoResponse>> reorder(@AuthenticationPrincipal User user,
                                                      @Valid @RequestBody ReorderTodosRequest request) {
        return ResponseEntity.ok(todoService.reorder(user, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        todoService.deleteTodo(id, user);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/completed")
    public ResponseEntity<Void> clearCompleted(@AuthenticationPrincipal User user) {
        todoService.clearCompleted(user);
        return ResponseEntity.noContent().build();
    }
}
