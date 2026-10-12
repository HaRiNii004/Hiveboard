package com.h.hiveboard.backend.notification.controller;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.notification.dto.NotificationDtos.NotificationResponse;
import com.h.hiveboard.backend.notification.dto.NotificationDtos.NotificationsResponse;
import com.h.hiveboard.backend.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

// Always the current user's own notifications.
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    // ?after=2026-10-12T10:00:00Z returns only newer ones (used when polling)
    @GetMapping
    public ResponseEntity<NotificationsResponse> list(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant after) {
        return ResponseEntity.ok(notificationService.getNotifications(user, after));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<NotificationResponse> markRead(@AuthenticationPrincipal User user,
                                                         @PathVariable UUID notificationId) {
        return ResponseEntity.ok(notificationService.markRead(notificationId, user));
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal User user) {
        notificationService.markAllRead(user);
        return ResponseEntity.noContent().build();
    }
}
