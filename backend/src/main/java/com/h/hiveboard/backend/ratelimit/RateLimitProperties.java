package com.h.hiveboard.backend.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;
import java.util.Map;

// Per-IP limits on the login / sign-up endpoints (app.rate-limit.* in application.properties).
@ConfigurationProperties(prefix = "app.rate-limit")
public record RateLimitProperties(
        @DefaultValue("true") boolean enabled,
        // Requests allowed per IP within one window, by rule name (see RateLimitFilter.RULES).
        // Rules left out use defaultLimit.
        Map<String, Integer> limits,
        @DefaultValue("20") int defaultLimit,
        @DefaultValue("1m") Duration window,
        // Use the first X-Forwarded-For address as the client IP. Only turn this on behind a
        // proxy you control that sets the header; otherwise clients could fake their IP.
        @DefaultValue("false") boolean trustForwardedFor
) {
    public int limitFor(String rule) {
        return limits != null && limits.containsKey(rule) ? limits.get(rule) : defaultLimit;
    }
}
