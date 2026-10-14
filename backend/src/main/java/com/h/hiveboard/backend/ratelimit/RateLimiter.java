package com.h.hiveboard.backend.ratelimit;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

// In-memory fixed-window counter: at most `limit` hits per key per window.
// Fine for a single server; several servers would need a shared store (e.g. Redis).
@Component
public class RateLimiter {

    private record Window(long startMillis, int count) {}

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    // Returns 0 if allowed, otherwise the seconds until the key may try again
    public long tryAcquire(String key, int limit, Duration window) {
        long now = System.currentTimeMillis();
        long windowMillis = window.toMillis();
        Window updated = windows.compute(key, (k, current) ->
                current == null || now - current.startMillis() >= windowMillis
                        ? new Window(now, 1)
                        : new Window(current.startMillis(), current.count() + 1));
        if (updated.count() <= limit) {
            return 0;
        }
        long waitMillis = updated.startMillis() + windowMillis - now;
        return Math.max(1, (waitMillis + 999) / 1000);
    }

    // Forget windows that have ended (called by the cleanup job), so memory stays small
    public void evictExpired(Duration window) {
        long cutoff = Instant.now().toEpochMilli() - window.toMillis();
        windows.entrySet().removeIf(entry -> entry.getValue().startMillis() < cutoff);
    }
}
