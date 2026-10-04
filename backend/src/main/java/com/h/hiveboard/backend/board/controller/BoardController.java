package com.h.hiveboard.backend.board.controller;

import com.h.hiveboard.backend.board.dto.BoardDtos.CreateBoardRequest;
import com.h.hiveboard.backend.board.dto.BoardDtos.UpdateBoardRequest;
import com.h.hiveboard.backend.board.dto.BoardDtos.UpdateLabelsTitleRequest;
import com.h.hiveboard.backend.board.dto.BoardDtos.LabelsTitleResponse;
import com.h.hiveboard.backend.board.dto.BoardDtos.BoardSummaryResponse;
import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.BoardDetailResponse;
import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.board.service.BoardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    @PostMapping
    public ResponseEntity<BoardSummaryResponse> create(@AuthenticationPrincipal User user,
                                                       @Valid @RequestBody CreateBoardRequest request) {
        return ResponseEntity.ok(boardService.createBoard(user, request));
    }

    @GetMapping
    public ResponseEntity<List<BoardSummaryResponse>> getMyBoards(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(boardService.getMyBoards(user));
    }

    @GetMapping("/{boardId}")
    public ResponseEntity<BoardDetailResponse> getDetail(@AuthenticationPrincipal User user,
                                                         @PathVariable UUID boardId) {
        return ResponseEntity.ok(boardService.getBoardDetail(boardId, user));
    }

    @PutMapping("/{boardId}")
    public ResponseEntity<BoardSummaryResponse> update(@AuthenticationPrincipal User user,
                                                       @PathVariable UUID boardId,
                                                       @Valid @RequestBody UpdateBoardRequest request) {
        return ResponseEntity.ok(boardService.updateBoard(boardId, user, request));
    }

    // Renames the board's labels field; the options themselves live under /labels.
    @PatchMapping("/{boardId}/labels-title")
    public ResponseEntity<LabelsTitleResponse> updateLabelsTitle(@AuthenticationPrincipal User user,
                                                                 @PathVariable UUID boardId,
                                                                 @Valid @RequestBody UpdateLabelsTitleRequest request) {
        return ResponseEntity.ok(boardService.updateLabelsTitle(boardId, user, request));
    }

    @DeleteMapping("/{boardId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable UUID boardId) {
        boardService.deleteBoard(boardId, user);
        return ResponseEntity.noContent().build();
    }
}
