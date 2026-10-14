package com.h.hiveboard.backend.auth.controller;

import com.h.hiveboard.backend.auth.dto.AuthDtos.AuthResponse;
import com.h.hiveboard.backend.auth.dto.AuthDtos.ForgotPasswordRequest;
import com.h.hiveboard.backend.auth.dto.AuthDtos.GoogleConfigResponse;
import com.h.hiveboard.backend.auth.dto.AuthDtos.GoogleLoginRequest;
import com.h.hiveboard.backend.auth.dto.AuthDtos.LoginRequest;
import com.h.hiveboard.backend.auth.dto.AuthDtos.MessageResponse;
import com.h.hiveboard.backend.auth.dto.AuthDtos.RegisterRequest;
import com.h.hiveboard.backend.auth.dto.AuthDtos.ResetPasswordRequest;
import com.h.hiveboard.backend.auth.dto.AuthDtos.ResetTokenInfoResponse;
import com.h.hiveboard.backend.auth.service.AuthService;
import com.h.hiveboard.backend.auth.service.GoogleAuthService;
import com.h.hiveboard.backend.auth.service.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final GoogleAuthService googleAuthService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    // Always the same answer, whether or not the email has an account
    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request);
        return ResponseEntity.ok(new MessageResponse(
                "If there's an account for that email, we've sent a link to reset the password."));
    }

    // Is this reset link still good? (400 if not)
    @GetMapping("/reset-password/{token}")
    public ResponseEntity<ResetTokenInfoResponse> checkResetToken(@PathVariable String token) {
        return ResponseEntity.ok(passwordResetService.checkToken(token));
    }

    @PostMapping("/reset-password/{token}")
    public ResponseEntity<Void> resetPassword(@PathVariable String token,
                                              @Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(token, request);
        return ResponseEntity.noContent().build();
    }

    // Whether to show "Continue with Google", and the client id the button needs
    @GetMapping("/google/config")
    public ResponseEntity<GoogleConfigResponse> googleConfig() {
        return ResponseEntity.ok(googleAuthService.config());
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> google(@Valid @RequestBody GoogleLoginRequest request) {
        return ResponseEntity.ok(googleAuthService.login(request));
    }
}
