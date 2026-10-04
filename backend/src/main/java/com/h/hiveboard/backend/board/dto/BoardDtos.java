package com.h.hiveboard.backend.board.dto;

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

    // Lightweight shape for "my boards" list page.
    public record BoardSummaryResponse(UUID id, String name, String description,
                                       String createdBy, Instant createdAt) {}
}
