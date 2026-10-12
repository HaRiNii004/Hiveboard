package com.h.hiveboard.backend.realtime.service;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.member.repository.BoardMemberRepository;
import com.h.hiveboard.backend.realtime.event.BoardChanged;
import com.h.hiveboard.backend.realtime.event.BoardChanged.Recipient;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

// What services call after a change. Call it inside the service's transaction, with
// payloads already built as DTOs: it snapshots the board's current members, and the
// event is only sent once the transaction commits (see BoardEventBroadcaster).
@Service
@RequiredArgsConstructor
public class BoardEventPublisher {

    private final ApplicationEventPublisher applicationEventPublisher;
    private final BoardMemberRepository boardMemberRepository;

    // Everyone on the board gets the same event.
    public void publish(UUID boardId, String type, User actor, Object payload) {
        publish(boardId, type, actor, payload, type, payload);
    }

    // Viewers get viewerType/viewerPayload instead; viewerType == null means viewers get nothing.
    public void publish(UUID boardId, String type, User actor, Object payload, String viewerType, Object viewerPayload) {
        List<Recipient> recipients = boardMemberRepository.findByBoardIdOrderByJoinedAtAsc(boardId).stream()
                .map(m -> new Recipient(m.getUser().getId(), m.getUser().getEmail(), m.getRole()))
                .toList();

        applicationEventPublisher.publishEvent(new BoardChanged(boardId, type,
                actor != null ? actor.getId() : null, actor != null ? actor.getFullName() : null,
                payload, viewerType, viewerPayload, recipients, Instant.now()));
    }
}
