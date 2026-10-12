package com.h.hiveboard.backend.realtime.service;

import com.h.hiveboard.backend.member.entity.BoardRole;
import com.h.hiveboard.backend.realtime.event.BoardChanged;
import com.h.hiveboard.backend.realtime.event.BoardChanged.Recipient;
import com.h.hiveboard.backend.realtime.event.BoardEvent;
import com.h.hiveboard.backend.realtime.event.NotificationCreated;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

// Sends events only AFTER the transaction commits, so clients never see a change
// that was rolled back. Board events go to each member's own queue rather than a
// shared topic, so that:
//   - viewers get the filtered version (cards hidden from viewers stay hidden), and
//   - someone removed from the board stops receiving events immediately.
@Slf4j
@Component
@RequiredArgsConstructor
public class BoardEventBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onBoardChanged(BoardChanged change) {
        for (Recipient recipient : change.recipients()) {
            boolean viewer = recipient.role() == BoardRole.VIEWER;
            String type = viewer ? change.viewerType() : change.type();
            if (type == null) {
                continue;
            }
            Object payload = viewer ? change.viewerPayload() : change.payload();
            send(recipient.email(), "/queue/boards", new BoardEvent(type, change.boardId(),
                    change.actorId(), change.actorName(), payload, change.timestamp()));
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onNotificationCreated(NotificationCreated created) {
        send(created.recipientEmail(), "/queue/notifications", created.notification());
    }

    // A failed push must never break the request that caused it: the data is already saved,
    // and clients resync from REST when they reconnect.
    private void send(String email, String destination, Object body) {
        try {
            messagingTemplate.convertAndSendToUser(email, destination, body);
        } catch (Exception e) {
            log.warn("Could not push {} to {}: {}", destination, email, e.getMessage());
        }
    }
}
