package com.h.hiveboard.backend.realtime.event;

import com.h.hiveboard.backend.notification.dto.NotificationDtos.NotificationResponse;

// Published when a notification is saved; pushed to its recipient after commit.
public record NotificationCreated(String recipientEmail, NotificationResponse notification) {}
