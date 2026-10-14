package com.h.hiveboard.backend.auth.service;

import com.h.hiveboard.backend.auth.dto.AuthDtos.AuthResponse;
import com.h.hiveboard.backend.auth.dto.AuthDtos.LoginRequest;
import com.h.hiveboard.backend.auth.dto.AuthDtos.RegisterRequest;
import com.h.hiveboard.backend.auth.entity.Role;
import com.h.hiveboard.backend.auth.entity.User;
import com.h.hiveboard.backend.auth.repository.UserRepository;
import com.h.hiveboard.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.findFirstByEmailIgnoreCase(email).isPresent()) {
            throw new IllegalArgumentException("An account with this email already exists");
        }

        User user = User.builder()
                .fullName(request.fullName().trim())
                .email(email)
                .password(passwordEncoder.encode(request.password())) // never store plain text
                .role(Role.USER)
                .build();

        userRepository.save(user);

        String token = jwtUtil.generateToken(user);
        return new AuthResponse(token, user.getEmail(), user.getFullName());
    }

    public AuthResponse login(LoginRequest request) {
        // Delegates to Spring Security's AuthenticationManager, which uses
        // CustomUserDetailsService + PasswordEncoder under the hood.
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = userRepository.findByEmail(request.email())
                .or(() -> userRepository.findFirstByEmailIgnoreCase(request.email()))
                .orElseThrow(() -> new IllegalStateException("User disappeared after authentication"));

        String token = jwtUtil.generateToken(user, Boolean.TRUE.equals(request.rememberMe()));
        return new AuthResponse(token, user.getEmail(), user.getFullName());
    }
}
