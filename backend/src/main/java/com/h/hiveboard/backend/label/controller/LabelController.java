package com.h.hiveboard.backend.label.controller;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.label.dto.LabelDtos.CreateLabelRequest;
import com.h.hiveboard.backend.label.dto.LabelDtos.LabelResponse;
import com.h.hiveboard.backend.label.dto.LabelDtos.UpdateLabelRequest;
import com.h.hiveboard.backend.label.service.LabelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class LabelController {

    private final LabelService labelService;

    // Nested under the board because label options are shared by all its cards.
    @GetMapping("/api/boards/{boardId}/labels")
    public ResponseEntity<List<LabelResponse>> getLabels(@AuthenticationPrincipal User user,
                                                         @PathVariable UUID boardId) {
        return ResponseEntity.ok(labelService.getLabels(boardId, user));
    }

    @PostMapping("/api/boards/{boardId}/labels")
    public ResponseEntity<LabelResponse> create(@AuthenticationPrincipal User user,
                                                @PathVariable UUID boardId,
                                                @Valid @RequestBody CreateLabelRequest request) {
        return ResponseEntity.ok(labelService.createLabel(boardId, user, request));
    }

    // Flat routes below, same as cards: a label id is enough to find its board.
    @PutMapping("/api/labels/{labelId}")
    public ResponseEntity<LabelResponse> update(@AuthenticationPrincipal User user,
                                                @PathVariable UUID labelId,
                                                @Valid @RequestBody UpdateLabelRequest request) {
        return ResponseEntity.ok(labelService.updateLabel(labelId, user, request));
    }

    @DeleteMapping("/api/labels/{labelId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable UUID labelId) {
        labelService.deleteLabel(labelId, user);
        return ResponseEntity.noContent().build();
    }
}
