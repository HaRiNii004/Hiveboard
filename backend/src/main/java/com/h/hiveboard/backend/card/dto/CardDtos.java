package com.h.hiveboard.backend.card.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public class CardDtos {

    public record CreateCardRequest(@NotBlank String title, String description) {}

    public record UpdateCardRequest(@NotBlank String title, String description) {}

    // Moving a card to a different column (drag across lists).
    public record MoveCardRequest(@NotNull UUID targetListId) {}

    // Reordering cards within one column (drag within the same list) —
    // same "send the full ordered array" contract as lists.
    public record ReorderCardsRequest(@NotEmpty List<UUID> orderedCardIds) {}
}
