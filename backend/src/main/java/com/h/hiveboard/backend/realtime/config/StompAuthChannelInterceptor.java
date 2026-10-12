package com.h.hiveboard.backend.realtime.config;

import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.member.repository.BoardMemberRepository;
import com.h.hiveboard.backend.security.CustomUserDetailsService;
import com.h.hiveboard.backend.security.JwtUtil;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Authentication and authorization for the STOMP layer. Browsers can't put an
// Authorization header on the WebSocket handshake, so /ws is permitAll in
// SecurityConfig and the JWT arrives in the STOMP CONNECT frame instead.
//
//   CONNECT    -> validate the JWT and attach the user to the session
//   SUBSCRIBE  -> personal queues for anyone logged in; board topics only for members
//   SEND       -> only to a board's /app destinations, and presence.join only for members
//                 (cursor/leave are checked against presence, see BoardRealtimeController)
//
// Known limitation: a JWT can expire (24h) while its socket stays open.
@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final String UUID_RE = "([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})";
    private static final Pattern BOARD_TOPIC = Pattern.compile("^/topic/boards/" + UUID_RE + "/(presence|cursors)$");
    private static final Pattern BOARD_APP = Pattern.compile("^/app/boards/" + UUID_RE + "/(presence\\.join|presence\\.leave|cursor)$");
    private static final Set<String> PERSONAL_QUEUES = Set.of("/user/queue/boards", "/user/queue/notifications", "/user/queue/presence");

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;
    private final BoardMemberRepository boardMemberRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        switch (accessor.getCommand()) {
            case CONNECT -> accessor.setUser(authenticate(accessor, message));
            case SUBSCRIBE -> authorizeSubscribe(accessor, message);
            case SEND -> authorizeSend(accessor, message);
            default -> { }
        }
        return message;
    }

    private Principal authenticate(StompHeaderAccessor accessor, Message<?> message) {
        String header = accessor.getFirstNativeHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new MessageDeliveryException(message, "Missing Authorization: Bearer <token> header");
        }
        String token = header.substring(7);

        try {
            String email = jwtUtil.extractEmail(token);
            User user = (User) userDetailsService.loadUserByUsername(email);
            if (!jwtUtil.isTokenValid(token, user)) {
                throw new MessageDeliveryException(message, "Invalid token");
            }
            // getName() is the email, which is also how convertAndSendToUser finds this session
            return new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
        } catch (JwtException | UsernameNotFoundException | IllegalArgumentException e) {
            // Expired / malformed / unknown user: reject cleanly, no stack trace to the client
            throw new MessageDeliveryException(message, "Invalid or expired token");
        }
    }

    private void authorizeSubscribe(StompHeaderAccessor accessor, Message<?> message) {
        User user = requireUser(accessor, message);
        String destination = accessor.getDestination();
        if (destination == null) {
            throw new MessageDeliveryException(message, "Missing destination");
        }
        if (PERSONAL_QUEUES.contains(destination)) {
            return;
        }

        // Without this check anyone logged in could watch any board by guessing its id
        Matcher topic = BOARD_TOPIC.matcher(destination);
        if (topic.matches() && isMember(UUID.fromString(topic.group(1)), user)) {
            return;
        }
        throw new MessageDeliveryException(message, "You can't subscribe to " + destination);
    }

    private void authorizeSend(StompHeaderAccessor accessor, Message<?> message) {
        User user = requireUser(accessor, message);
        String destination = accessor.getDestination();
        Matcher app = destination == null ? null : BOARD_APP.matcher(destination);
        if (app == null || !app.matches()) {
            throw new MessageDeliveryException(message, "You can't send to " + destination);
        }
        // Joining a board's presence needs membership. Cursor and leave messages are only
        // accepted from sessions that joined (and get dropped when the member is removed),
        // so the 10-20 cursor messages a second don't each hit the database.
        if (app.group(2).equals("presence.join") && !isMember(UUID.fromString(app.group(1)), user)) {
            throw new MessageDeliveryException(message, "Not a member of this board");
        }
    }

    private boolean isMember(UUID boardId, User user) {
        return boardMemberRepository.findByBoardIdAndUserId(boardId, user.getId()).isPresent();
    }

    public static User userOf(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth && auth.getPrincipal() instanceof User user) {
            return user;
        }
        return null;
    }

    private static User requireUser(StompHeaderAccessor accessor, Message<?> message) {
        User user = userOf(accessor.getUser());
        if (user == null) {
            throw new MessageDeliveryException(message, "Not authenticated");
        }
        return user;
    }
}
