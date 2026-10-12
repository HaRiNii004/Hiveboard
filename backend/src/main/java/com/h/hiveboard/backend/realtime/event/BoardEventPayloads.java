package com.h.hiveboard.backend.realtime.event;

import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.CardResponse;
import com.h.hiveboard.backend.board.dto.BoardDetailsDtos.ListResponse;
import com.h.hiveboard.backend.label.dto.LabelDtos.LabelResponse;
import com.h.hiveboard.backend.member.dto.MemberDtos.MemberResponse;

import java.util.List;
import java.util.UUID;

// Payload shapes for BoardEvent. Each says "this is now the state of X", so applying
// the same event twice (e.g. your own action echoed back) changes nothing.
public class BoardEventPayloads {

    public record CardPayload(UUID listId, CardResponse card) {}

    public record CardMovedPayload(UUID fromListId, UUID listId, CardResponse card) {}

    public record CardDeletedPayload(UUID listId, UUID cardId) {}

    // The list's authoritative order after a reorder (last write wins; the server is the referee)
    public record ListPayload(ListResponse list) {}

    public record ListRenamedPayload(UUID listId, String name) {}

    public record ListDeletedPayload(UUID listId) {}

    public record ListsReorderedPayload(List<UUID> orderedListIds) {}

    public record CommentAddedPayload(UUID listId, UUID cardId, long commentCount) {}

    public record LabelPayload(LabelResponse label) {}

    public record LabelDeletedPayload(UUID labelId) {}

    public record BoardUpdatedPayload(String name, String description, String labelsTitle) {}

    public record BoardDeletedPayload(UUID boardId) {}

    public record MemberPayload(MemberResponse member) {}

    // left = true when they left on their own, false when an admin removed them
    public record MemberRemovedPayload(Long userId, String fullName, boolean left) {}
}
