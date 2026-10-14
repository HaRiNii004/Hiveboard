package com.h.hiveboard.backend.archive.controller;

import com.h.hiveboard.backend.archive.dto.ArchiveDtos.ArchiveResponse;
import com.h.hiveboard.backend.archive.service.ArchiveService;
import com.h.hiveboard.backend.auth.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ArchiveController {

    private final ArchiveService archiveService;

    // Archived cards and lists of a board (archive / restore / delete live on the card and list endpoints)
    @GetMapping("/api/boards/{boardId}/archive")
    public ResponseEntity<ArchiveResponse> archive(@AuthenticationPrincipal User user, @PathVariable UUID boardId) {
        return ResponseEntity.ok(archiveService.getArchive(boardId, user));
    }
}
