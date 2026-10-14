package com.h.hiveboard.backend.auth.service;

import com.h.hiveboard.backend.auth.dto.AuthDtos.ForgotPasswordRequest;
import com.h.hiveboard.backend.auth.dto.AuthDtos.ResetPasswordRequest;
import com.h.hiveboard.backend.auth.dto.AuthDtos.ResetTokenInfoResponse;
import com.h.hiveboard.backend.auth.entity.PasswordResetToken;
import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.auth.repository.PasswordResetTokenRepository;
import com.h.hiveboard.backend.auth.repository.UserRepository;
import com.h.hiveboard.backend.mail.service.EmailService;
import com.h.hiveboard.backend.util.SecureTokens;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

// "Forgot password": email a one-time link, then set a new password with it.
@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private static final Duration LINK_VALID_FOR = Duration.ofHours(1);
    // Asking again within this time doesn't send another email (stops inbox flooding)
    private static final Duration RESEND_AFTER = Duration.ofMinutes(1);

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    // Says nothing about whether the email has an account: the caller always gets the
    // same answer, so this can't be used to find out who is registered.
    @Transactional
    public void requestReset(ForgotPasswordRequest request) {
        User user = userRepository.findFirstByEmailIgnoreCase(request.email().trim()).orElse(null);
        if (user == null) {
            log.info("Password reset requested for an email with no account");
            return;
        }
        if (tokenRepository.existsByUserIdAndCreatedAtAfter(user.getId(), Instant.now().minus(RESEND_AFTER))) {
            return; // a link was just sent
        }

        tokenRepository.deleteByUserId(user.getId()); // only the newest link works
        String token = SecureTokens.newToken();
        tokenRepository.save(PasswordResetToken.builder()
                .user(user)
                .tokenHash(SecureTokens.hash(token))
                .expiresAt(Instant.now().plus(LINK_VALID_FOR))
                .build());

        String link = frontendUrl + "/reset-password/" + token;
        emailService.send(user.getEmail(), "Reset your HiveBoard password", """
                Hi %s,

                Someone (hopefully you) asked to reset the password for your HiveBoard account.
                Open this link to choose a new password. It works once and expires in 1 hour:

                %s

                If you didn't ask for this, you can ignore this email; your password won't change.
                """.formatted(user.getFullName(), link));
    }

    // Lets the reset page show which account it's for, or say the link is no good
    @Transactional(readOnly = true)
    public ResetTokenInfoResponse checkToken(String token) {
        return new ResetTokenInfoResponse(findUsable(token).getUser().getEmail());
    }

    // Sets the new password, uses up the link and logs out every existing session
    @Transactional
    public void resetPassword(String token, ResetPasswordRequest request) {
        User user = findUsable(token).getUser();
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        user.setPasswordChangedAt(Instant.now()); // older logins stop working (see JwtUtil)
        userRepository.save(user);
        tokenRepository.deleteByUserId(user.getId());
    }

    private PasswordResetToken findUsable(String token) {
        return tokenRepository.findByTokenHash(SecureTokens.hash(token))
                .filter(PasswordResetToken::isUsable)
                .orElseThrow(() -> new IllegalArgumentException(
                        "This reset link is invalid or has expired. Please ask for a new one."));
    }
}
