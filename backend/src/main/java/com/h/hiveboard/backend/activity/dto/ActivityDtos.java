package com.h.hiveboard.backend.activity.dto;

import com.h.hiveboard.backend.activity.entity.ActivityEntry;
import com.h.hiveboard.backend.activity.entity.ActivityType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ActivityDtos {

    // message contains "{card}" where the card belongs (see ActivityEntry)
    public record ActivityResponse(Long id, ActivityType type, String message, UUID cardId, String cardTitle,
                                   Long actorId, String actorName, Instant createdAt) {
        public static ActivityResponse from(ActivityEntry entry) {
            return new ActivityResponse(entry.getId(), entry.getType(), entry.getMessage(), entry.getCardId(),
                    entry.getCardTitle(), entry.getActor() != null ? entry.getActor().getId() : null,
                    entry.getActorName(), entry.getCreatedAt());
        }
    }

    // hasMore: there are older entries (ask again with before = the last item's id)
    public record ActivityPageResponse(List<ActivityResponse> items, boolean hasMore) {}
}
