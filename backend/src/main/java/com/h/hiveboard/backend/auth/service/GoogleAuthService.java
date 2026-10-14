package com.h.hiveboard.backend.auth.service;

import com.h.hiveboard.backend.auth.dto.AuthDtos.AuthResponse;
import com.h.hiveboard.backend.auth.dto.AuthDtos.GoogleConfigResponse;
import com.h.hiveboard.backend.auth.dto.AuthDtos.GoogleLoginRequest;
import com.h.hiveboard.backend.auth.entity.Role;
import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.auth.repository.UserRepository;
import com.h.hiveboard.backend.security.JwtUtil;
import com.h.hiveboard.backend.util.SecureTokens;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;
import java.util.Set;

// "Continue with Google". The browser opens Google's sign-in popup and gets back a
// one-time authorization code; we exchange it with Google (using the client secret,
// which never leaves the server) for an ID token, and have Google check that token.
// Needs app.google.client-id and app.google.client-secret; without them it's switched off.
@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleAuthService {

    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo?id_token={idToken}";
    private static final Set<String> ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");
    private static final String FAILED = "Google sign-in failed. Please try again.";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RestClient http = RestClient.create();

    @Value("${app.google.client-id:}")
    private String clientId;

    @Value("${app.google.client-secret:}")
    private String clientSecret;

    public boolean isEnabled() {
        return !clientId.isBlank() && !clientSecret.isBlank();
    }

    public GoogleConfigResponse config() {
        return new GoogleConfigResponse(isEnabled(), isEnabled() ? clientId : null);
    }

    // Logs in the Google account's HiveBoard user, creating one on first sign-in.
    // An existing account with the same (Google-verified) email is linked to it; that's
    // safe because accounts only exist once their email has been confirmed.
    @Transactional
    public AuthResponse login(GoogleLoginRequest request) {
        if (!isEnabled()) {
            throw new IllegalArgumentException("Google sign-in isn't set up on this server.");
        }
        GoogleProfile profile = fetchProfile(request.code());

        User user = userRepository.findByGoogleSubject(profile.subject())
                .or(() -> userRepository.findFirstByEmailIgnoreCase(profile.email()))
                .orElseGet(() -> User.builder()
                        .fullName(profile.name())
                        .email(profile.email())
                        // Google-only accounts have no usable password ("Forgot password" can set one)
                        .password(passwordEncoder.encode(SecureTokens.newToken()))
                        .role(Role.USER)
                        .build());
        if (user.getGoogleSubject() == null) {
            user.setGoogleSubject(profile.subject());
        }
        userRepository.save(user);

        String token = jwtUtil.generateToken(user, Boolean.TRUE.equals(request.rememberMe()));
        return new AuthResponse(token, user.getEmail(), user.getFullName());
    }

    private record GoogleProfile(String subject, String email, String name) {}

    private GoogleProfile fetchProfile(String code) {
        Map<?, ?> info;
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("code", code);
            form.add("client_id", clientId);
            form.add("client_secret", clientSecret);
            form.add("redirect_uri", "postmessage"); // what Google's popup flow uses
            form.add("grant_type", "authorization_code");
            Map<?, ?> tokens = http.post().uri(TOKEN_URL)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
            Object idToken = tokens == null ? null : tokens.get("id_token");
            if (idToken == null) {
                throw new IllegalArgumentException(FAILED);
            }
            // Google checks the signature and expiry and returns the token's claims
            info = http.get().uri(TOKEN_INFO_URL, idToken).retrieve().body(Map.class);
        } catch (RestClientException e) {
            log.warn("Google sign-in: talking to Google failed: {}", e.getMessage());
            throw new IllegalArgumentException(FAILED);
        }

        if (info == null
                || !clientId.equals(info.get("aud"))
                || !ISSUERS.contains(String.valueOf(info.get("iss")))
                || info.get("sub") == null
                || info.get("email") == null) {
            log.warn("Google sign-in: ID token rejected (wrong audience/issuer or missing claims)");
            throw new IllegalArgumentException(FAILED);
        }
        if (!"true".equals(String.valueOf(info.get("email_verified")))) {
            throw new IllegalArgumentException("Your Google account's email address isn't verified.");
        }

        String email = String.valueOf(info.get("email"));
        Object name = info.get("name");
        return new GoogleProfile(String.valueOf(info.get("sub")), email,
                name == null || String.valueOf(name).isBlank() ? email.substring(0, email.indexOf('@')) : String.valueOf(name));
    }
}
