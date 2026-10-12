package com.h.hiveboard.backend.notification.repository;

import com.h.hiveboard.backend.notification.entity.Notification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    // Latest 50, newest first (the bell's list)
    @EntityGraph(attributePaths = "actor")
    List<Notification> findTop50ByRecipientIdOrderByCreatedAtDesc(Long recipientId);

    // Anything newer than `after` (polling for new ones)
    @EntityGraph(attributePaths = "actor")
    List<Notification> findTop50ByRecipientIdAndCreatedAtAfterOrderByCreatedAtDesc(Long recipientId, Instant after);

    long countByRecipientIdAndReadFalse(Long recipientId);

    Optional<Notification> findByIdAndRecipientId(UUID id, Long recipientId);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.recipient.id = :recipientId AND n.read = false")
    int markAllRead(Long recipientId);
}
