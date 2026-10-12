package com.h.hiveboard.backend.realtime.event;

import java.time.Instant;
import java.util.UUID;

// What clients receive on /user/queue/boards. The payload is always a DTO
// (never a JPA entity), usually the same one the matching REST endpoint returns.
//
// Types: CARD_CREATED, CARD_UPDATED, CARD_MOVED, CARDS_REORDERED, CARD_DELETED, COMMENT_ADDED,
//        LIST_CREATED, LIST_UPDATED, LISTS_REORDERED, LIST_DELETED,
//        LABEL_CREATED, LABEL_UPDATED, LABEL_DELETED, BOARD_UPDATED, BOARD_DELETED,
//        MEMBER_ADDED, MEMBER_ROLE_CHANGED, MEMBER_REMOVED
public record BoardEvent(String type, UUID boardId, Long actorId, String actorName,
                         Object payload, Instant timestamp) {}
