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
    // assigneeId: user id of a board member, or null for unassigned.
    // highPriority: flag the new card (null = not flagged).
    // hiddenFromViewers: hide the new card from Viewers (null = visible).
    public record CreateCardRequest(@NotBlank String title, String description, List<UUID> labelIds,
                                    LocalDate dueDate, LocalTime dueTime, Long assigneeId,
                                    Boolean highPriority, Boolean hiddenFromViewers) {}

    // labelIds: the full new selection; null leaves the card's labels unchanged.
    // dueDate / dueTime: replace the due date/time like title/description do — null clears them.
    // assigneeId: replaces the assignee like the due date does — null unassigns.
    // highPriority: flag / unflag; null leaves the flag unchanged.
    // hiddenFromViewers: hide / show for Viewers; null leaves it unchanged.
    // version: the card version the client loaded; if the card has changed since -> 409.
    public record UpdateCardRequest(@NotBlank String title, String description, List<UUID> labelIds,
                                    LocalDate dueDate, LocalTime dueTime, Long assigneeId,
                                    Boolean highPriority, Boolean hiddenFromViewers, Long version) {}

    // Moving a card to a different column (drag across lists).
    // orderedCardIds: the target list's cards in their new order, INCLUDING the moved card,
    // so it lands exactly where it was dropped. Leave it out to put the card at the end.
    public record MoveCardRequest(@NotNull UUID targetListId, List<UUID> orderedCardIds) {}

    // Flag / unflag a card as high priority.
    public record SetPriorityRequest(@NotNull Boolean highPriority) {}

    // Reordering cards within one column (drag within the same list) —
    // same "send the full ordered array" contract as lists.
    public record ReorderCardsRequest(@NotEmpty List<UUID> orderedCardIds) {}

    // Restore an archived card. listId: where to put it (null = the list it was in;
    // needed when that list is archived too)
    public record RestoreCardRequest(UUID listId) {}
}
