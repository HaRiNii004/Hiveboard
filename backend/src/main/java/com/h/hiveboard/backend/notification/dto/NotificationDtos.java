package com.h.hiveboard.backend.notification.dto;

import com.h.hiveboard.backend.notification.entity.Notification;
import com.h.hiveboard.backend.notification.entity.NotificationType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class NotificationDtos {

    public record NotificationResponse(UUID id, NotificationType type, String message, String actorName,
                                       UUID boardId, UUID cardId, boolean read, Instant createdAt) {
        public static NotificationResponse from(Notification n) {
            return new NotificationResponse(n.getId(), n.getType(), n.getMessage(),
                    n.getActor() != null ? n.getActor().getFullName() : null,
                    n.getBoardId(), n.getCardId(), n.isRead(), n.getCreatedAt());
        }
    }

    // One poll returns the notifications and the unread count for the bell badge.
    public record NotificationsResponse(List<NotificationResponse> notifications, long unreadCount) {}
}
