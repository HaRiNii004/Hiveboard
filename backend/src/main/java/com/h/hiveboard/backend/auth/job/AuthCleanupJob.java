package com.h.hiveboard.backend.auth.job;

import com.h.hiveboard.backend.auth.repository.PasswordResetTokenRepository;
import com.h.hiveboard.backend.ratelimit.RateLimitProperties;
import com.h.hiveboard.backend.ratelimit.RateLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

// Housekeeping, every hour by default (app.cleanup.interval): expired password reset
// links and old rate-limit counters.
@Component
@RequiredArgsConstructor
@Slf4j
public class AuthCleanupJob {

    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final RateLimiter rateLimiter;
    private final RateLimitProperties rateLimitProperties;

    @Scheduled(initialDelayString = "${app.cleanup.initial-delay:PT1M}", fixedDelayString = "${app.cleanup.interval:PT1H}")
    @Transactional
    public void cleanUp() {
        Instant now = Instant.now();
        int resetLinks = passwordResetTokenRepository.deleteExpiredBefore(now);
        rateLimiter.evictExpired(rateLimitProperties.window());
        if (resetLinks > 0) {
            log.info("Cleanup: removed {} expired reset links", resetLinks);
        }
    }
}
