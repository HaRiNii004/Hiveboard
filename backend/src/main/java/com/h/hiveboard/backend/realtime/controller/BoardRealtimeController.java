package com.h.hiveboard.backend.realtime.controller;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.realtime.config.StompAuthChannelInterceptor;
import com.h.hiveboard.backend.realtime.dto.RealtimeDtos.CursorBroadcast;
import com.h.hiveboard.backend.realtime.dto.RealtimeDtos.CursorMessage;
import com.h.hiveboard.backend.realtime.dto.RealtimeDtos.PresenceUser;
import com.h.hiveboard.backend.realtime.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.UUID;

// The only messages clients send over the socket: presence and cursors.
// (Board changes always go through REST.) Membership for presence.join is checked
// in StompAuthChannelInterceptor; cursors are accepted only from joined sessions.
@Controller
@RequiredArgsConstructor
public class BoardRealtimeController {

    private static final double MAX_COORDINATE = 100_000;

    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/boards/{boardId}/presence.join")
    public void join(@DestinationVariable UUID boardId, SimpMessageHeaderAccessor accessor) {
        User user = StompAuthChannelInterceptor.userOf(accessor.getUser());
        if (user != null) {
            presenceService.join(boardId, accessor.getSessionId(), user);
        }
    }

    @MessageMapping("/boards/{boardId}/presence.leave")
    public void leave(@DestinationVariable UUID boardId, SimpMessageHeaderAccessor accessor) {
        presenceService.leave(boardId, accessor.getSessionId());
    }

    // Identity and colour are stamped from the session, never taken from the client.
    @MessageMapping("/boards/{boardId}/cursor")
    public void cursor(@DestinationVariable UUID boardId, @Payload CursorMessage message,
                       SimpMessageHeaderAccessor accessor) {
        PresenceUser sender = presenceService.sessionUser(boardId, accessor.getSessionId());
        if (sender == null) {
            return; // not on this board (never joined, or was removed)
        }

        boolean visible = !Boolean.FALSE.equals(message.visible());
        double x = clamp(message.x());
        double y = clamp(message.y());

        messagingTemplate.convertAndSend("/topic/boards/" + boardId + "/cursors",
                new CursorBroadcast(sender.userId(), sender.fullName(), sender.color(), x, y, visible));
    }

    private static double clamp(Double value) {
        if (value == null || value.isNaN() || value.isInfinite()) {
            return 0;
        }
        return Math.max(0, Math.min(MAX_COORDINATE, value));
    }
}
