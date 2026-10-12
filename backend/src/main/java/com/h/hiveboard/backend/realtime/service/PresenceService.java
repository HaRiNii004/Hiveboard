package com.h.hiveboard.backend.realtime.service;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.realtime.dto.RealtimeDtos.PresenceResponse;
import com.h.hiveboard.backend.realtime.dto.RealtimeDtos.PresenceUser;
import com.h.hiveboard.backend.realtime.event.BoardChanged;
import com.h.hiveboard.backend.realtime.event.BoardEventPayloads.MemberRemovedPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

// In-memory "who's on this board right now": boardId -> (sessionId -> user).
// Ephemeral by design: lost on restart, rebuilt as clients reconnect and re-join.
// Also the gate for cursor messages: only sessions that joined a board (which needs
// membership) may send cursors to it.
@Service
@RequiredArgsConstructor
public class PresenceService {

    // A stable colour per user, shared by presence avatars and cursors
    private static final String[] COLORS = {
            "#f28f0f", "#e8814a", "#43a047", "#1e88e5", "#8e44ad", "#e84a6f", "#14a098", "#d4643b"
    };

    private final SimpMessagingTemplate messagingTemplate;
    private final Map<UUID, Map<String, PresenceUser>> boards = new ConcurrentHashMap<>();

    public static String colorFor(Long userId) {
        return COLORS[(int) Math.floorMod(userId * 2654435761L, (long) COLORS.length)];
    }

    // Joining tells everyone on the board (if anything changed) and always sends the joiner
    // the current list on their personal queue, which they subscribed to when connecting.
    // That way nobody misses the list even if their topic SUBSCRIBE is still being processed.
    public void join(UUID boardId, String sessionId, User user) {
        PresenceUser person = new PresenceUser(user.getId(), user.getFullName(), colorFor(user.getId()));
        PresenceUser previous = boards.computeIfAbsent(boardId, id -> new ConcurrentHashMap<>()).put(sessionId, person);
        if (previous == null) {
            broadcast(boardId);
        }
        messagingTemplate.convertAndSendToUser(user.getEmail(), "/queue/presence", snapshot(boardId));
    }

    public void leave(UUID boardId, String sessionId) {
        Map<String, PresenceUser> sessions = boards.get(boardId);
        if (sessions != null && sessions.remove(sessionId) != null) {
            broadcast(boardId);
        }
    }

    public PresenceUser sessionUser(UUID boardId, String sessionId) {
        Map<String, PresenceUser> sessions = boards.get(boardId);
        return sessions == null ? null : sessions.get(sessionId);
    }

    // Tab closed / connection lost: drop that session from every board it was on
    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        boards.forEach((boardId, sessions) -> {
            if (sessions.remove(event.getSessionId()) != null) {
                broadcast(boardId);
            }
        });
    }

    // Removed from (or left) a board: stop their presence and cursors there right away
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onBoardChanged(BoardChanged change) {
        if (change.payload() instanceof MemberRemovedPayload removed) {
            Map<String, PresenceUser> sessions = boards.get(change.boardId());
            if (sessions != null && sessions.values().removeIf(p -> p.userId().equals(removed.userId()))) {
                broadcast(change.boardId());
            }
        }
    }

    private void broadcast(UUID boardId) {
        PresenceResponse snapshot = snapshot(boardId);
        if (snapshot.users().isEmpty()) {
            boards.remove(boardId);
        }
        messagingTemplate.convertAndSend("/topic/boards/" + boardId + "/presence", snapshot);
    }

    // One entry per person, even with several tabs open
    private PresenceResponse snapshot(UUID boardId) {
        Map<Long, PresenceUser> unique = new LinkedHashMap<>();
        boards.getOrDefault(boardId, Map.of()).values().forEach(p -> unique.putIfAbsent(p.userId(), p));
        return new PresenceResponse(boardId, new ArrayList<>(unique.values()));
    }

    // For tests / diagnostics
    public List<PresenceUser> usersOn(UUID boardId) {
        return new ArrayList<>(boards.getOrDefault(boardId, Map.of()).values());
    }
}
