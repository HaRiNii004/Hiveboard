package com.h.hiveboard.backend.boardlist.controller;

import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.ListResponse;
import com.h.hiveboard.backend.boardlist.dto.BoardListDtos.CreateListRequest;
import com.h.hiveboard.backend.boardlist.dto.BoardListDtos.UpdateListRequest;
import com.h.hiveboard.backend.boardlist.dto.BoardListDtos.ReorderListsRequest;
import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.boardlist.service.BoardListService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/boards")
public class BoardListController {

    private final BoardListService boardListService;

    // Nested under the board because a list can't exist without one.
    @PostMapping("/{boardId}/lists")
    public ResponseEntity<ListResponse> create(@AuthenticationPrincipal User user,
                                               @PathVariable UUID boardId,
                                               @Valid @RequestBody CreateListRequest request) {
        return ResponseEntity.ok(boardListService.createList(boardId, user, request));
    }

    // Reordering needs the boardId too, since it validates against every
    // list currently on that board.
    @PatchMapping("/{boardId}/lists/reorder")
    public ResponseEntity<Void> reorder(@AuthenticationPrincipal User user,
                                        @PathVariable UUID boardId,
                                        @Valid @RequestBody ReorderListsRequest request) {
        boardListService.reorderLists(boardId, user, request);
        return ResponseEntity.noContent().build();
    }

    // Flat routes below: once you have a list's id, you don't need the
    // board id to touch it — matches the AuthController/BoardController style.
    @PutMapping("/lists/{listId}")
    public ResponseEntity<ListResponse> update(@AuthenticationPrincipal User user,
                                               @PathVariable UUID listId,
                                               @Valid @RequestBody UpdateListRequest request) {
        return ResponseEntity.ok(boardListService.updateList(listId, user, request));
    }

    @DeleteMapping("/lists/{listId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable UUID listId) {
        boardListService.deleteList(listId, user);
        return ResponseEntity.noContent().build();
    }
}
