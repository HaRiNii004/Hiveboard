package com.h.hiveboard.backend.realtime.event;

import com.h.hiveboard.backend.member.entity.BoardRole;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

// Internal Spring application event, published inside the service's transaction and
// delivered by BoardEventBroadcaster only AFTER the transaction commits.
//
// Everything is captured up front (recipients, payloads as DTOs), because after
// commit there's no transaction to lazy-load from, and for deletions/removals the
// membership rows may already be gone.
//
// Viewers get `viewerType`/`viewerPayload` instead of the member version — e.g. a card
// that was just hidden from viewers reaches them as CARD_DELETED. A null viewerType
// means viewers don't hear about it at all.
public record BoardChanged(UUID boardId, String type, Long actorId, String actorName,
                           Object payload, String viewerType, Object viewerPayload,
                           List<Recipient> recipients, Instant timestamp) {

    public record Recipient(Long userId, String email, BoardRole role) {}
}
