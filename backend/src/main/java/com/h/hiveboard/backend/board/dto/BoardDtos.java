package com.h.hiveboard.backend.board.dto;

import com.h.hiveboard.backend.member.entity.BoardRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public class BoardDtos {

    public record CreateBoardRequest(@NotBlank String name, String description) {}

    public record UpdateBoardRequest(@NotBlank String name, String description) {}

    // Renames the board's labels field (e.g. "Labels" -> "Tags").
    public record UpdateLabelsTitleRequest(@NotBlank @Size(max = 50) String labelsTitle) {}

    public record LabelsTitleResponse(String labelsTitle) {}

    // Lightweight shape for "my boards" list page. myRole/ownedByMe let the UI
    // badge boards shared with you ("Shared with you · Viewer").
    public record BoardSummaryResponse(UUID id, String name, String description,
                                       String createdBy, Instant createdAt,
                                       BoardRole myRole, boolean ownedByMe) {}
}
