package com.h.hiveboard.backend.realtime.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

// STOMP over WebSocket. Writes still go through REST; this channel only pushes:
//   /user/queue/boards          board events for boards you're a member of (per member, role-filtered)
//   /user/queue/notifications   your notifications, the moment they're created
//   /user/queue/presence        who's on a board, sent to you when you join it
//   /topic/boards/{id}/presence who's looking at the board
//   /topic/boards/{id}/cursors  live cursors
// Clients send only to /app/boards/{id}/presence.join|presence.leave|cursor.
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthChannelInterceptor stompAuthChannelInterceptor;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins(frontendUrl);
        // Note: setPreserveReceiveOrder(true) is deliberately NOT used: with it, Spring 7.0.8
        // never delivers the STOMP ERROR frame when this interceptor rejects a frame, so a
        // client with a bad token just hangs. Inbound frames may therefore be handled out of
        // order, which is why presence.join also replies on the personal /user/queue/presence.
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Heartbeats every 10s both ways, so dead connections behind proxies get noticed
        ThreadPoolTaskScheduler heartbeatScheduler = new ThreadPoolTaskScheduler();
        heartbeatScheduler.setPoolSize(1);
        heartbeatScheduler.setThreadNamePrefix("ws-heartbeat-");
        heartbeatScheduler.initialize();

        // In-memory broker: fine for one server. With several instances, swap for
        // enableStompBrokerRelay(...) backed by RabbitMQ (or fan out via Redis).
        registry.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[]{10000, 10000})
                .setTaskScheduler(heartbeatScheduler);
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
        registry.setPreservePublishOrder(true);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompAuthChannelInterceptor);
    }
}
