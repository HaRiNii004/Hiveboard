package com.h.hiveboard.backend.ratelimit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.regex.Pattern;

// Limits how often one IP can hit the login / sign-up endpoints (guessing passwords or
// codes, mass sign-ups, flooding inboxes). Each endpoint has its own budget, so being
// limited on "resend code" doesn't block logging in. Over the limit: 429 + Retry-After.
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10) // before Spring Security and any body parsing
@RequiredArgsConstructor
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private record Rule(String name, Pattern path) {}

    // POST endpoints only; names are the keys for app.rate-limit.limits.<name>
    static final List<Rule> RULES = List.of(
            new Rule("login", Pattern.compile("^/api/auth/login$")),
            new Rule("register", Pattern.compile("^/api/auth/register$")),
            new Rule("forgot-password", Pattern.compile("^/api/auth/forgot-password$")),
            new Rule("reset-password", Pattern.compile("^/api/auth/reset-password/[^/]+$")),
            new Rule("google", Pattern.compile("^/api/auth/google$"))
    );

    private final RateLimiter rateLimiter;
    private final RateLimitProperties properties;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        Rule rule = properties.enabled() && "POST".equals(request.getMethod()) ? match(request.getRequestURI()) : null;
        if (rule != null) {
            String ip = clientIp(request);
            long retryAfter = rateLimiter.tryAcquire(rule.name() + "|" + ip,
                    properties.limitFor(rule.name()), properties.window());
            if (retryAfter > 0) {
                log.warn("Rate limit hit: {} from {}", rule.name(), ip);
                response.setStatus(429);
                response.setHeader("Retry-After", String.valueOf(retryAfter));
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write("{\"error\":\"Too many attempts. Please wait "
                        + retryAfter + (retryAfter == 1 ? " second" : " seconds") + " and try again.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private static Rule match(String uri) {
        for (Rule rule : RULES) {
            if (rule.path().matcher(uri).matches()) return rule;
        }
        return null;
    }

    private String clientIp(HttpServletRequest request) {
        if (properties.trustForwardedFor()) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
