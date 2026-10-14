package com.h.hiveboard.backend.archive.dto;

import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.CardResponse;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ArchiveDtos {

    // listArchived: the card's list is archived too, so restoring needs another list
    public record ArchivedCardResponse(CardResponse card, UUID listId, String listName, boolean listArchived,
                                       Instant archivedAt, String archivedByName) {}

    // cardCount: cards that come back with the list
    public record ArchivedListResponse(UUID id, String name, long cardCount, Instant archivedAt, String archivedByName) {}

    public record ArchiveResponse(List<ArchivedCardResponse> cards, List<ArchivedListResponse> lists) {}
}
