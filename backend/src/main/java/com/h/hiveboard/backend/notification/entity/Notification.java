package com.h.hiveboard.backend.notification.entity;

import com.h.hiveboard.backend.auth.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

// Something that happened that one user should hear about.
// boardId/cardId are plain ids (not foreign keys) and the message is a snapshot,
// so a notification still makes sense after its board or card is deleted.
@Entity
@Table(name = "notifications",
        indexes = @Index(name = "idx_notification_recipient_created", columnList = "recipient_id, created_at"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    // Who caused it (e.g. the person who assigned the card)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Convert(converter = NotificationTypeConverter.class)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    private UUID boardId;

    private UUID cardId;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean read = false;

    @CreationTimestamp
    private Instant createdAt;
}
