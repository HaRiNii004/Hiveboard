package com.h.hiveboard.backend.card.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public class CardDtos {

    // labelIds: options from the card's board to select (null or empty = none).
    // dueDate: "yyyy-MM-dd" or null for no due date.
    // dueTime: "HH:mm" or null for an all-day due date; needs a dueDate.
    public record CreateCardRequest(@NotBlank String title, String description, List<UUID> labelIds,
                                    LocalDate dueDate, LocalTime dueTime) {}

    // labelIds: the full new selection; null leaves the card's labels unchanged.
    // dueDate / dueTime: replace the due date/time like title/description do — null clears them.
    public record UpdateCardRequest(@NotBlank String title, String description, List<UUID> labelIds,
                                    LocalDate dueDate, LocalTime dueTime) {}

    // Moving a card to a different column (drag across lists).
    public record MoveCardRequest(@NotNull UUID targetListId) {}

    // Reordering cards within one column (drag within the same list) —
    // same "send the full ordered array" contract as lists.
    public record ReorderCardsRequest(@NotEmpty List<UUID> orderedCardIds) {}
}
