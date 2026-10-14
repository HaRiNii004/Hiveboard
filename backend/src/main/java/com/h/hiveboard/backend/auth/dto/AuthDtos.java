package com.h.hiveboard.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Grouping the small auth DTOs in one file to keep things easy to navigate while learning.
// Feel free to split each into its own file later.
public class AuthDtos {

    public record RegisterRequest(
            @NotBlank String fullName,
            @Email @NotBlank String email,
            @NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String password
    ) {}

    // rememberMe: a long-lived login (see jwt.remember-me-expiration-ms); null = no
    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String password,
            Boolean rememberMe
    ) {}

    public record AuthResponse(
            String token,
            String email,
            String fullName
    ) {}

    // --- Forgot password ---

    public record ForgotPasswordRequest(@Email @NotBlank String email) {}

    // The same answer whether or not the email has an account
    public record MessageResponse(String message) {}

    // Shown on the reset page so you know which account you're resetting
    public record ResetTokenInfoResponse(String email) {}

    public record ResetPasswordRequest(
            @NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String newPassword
    ) {}

    // --- Sign in with Google ---

    // code: the authorization code from Google's sign-in popup
    public record GoogleLoginRequest(@NotBlank String code, Boolean rememberMe) {}

    // clientId is null when Google sign-in isn't set up (the button is then hidden)
    public record GoogleConfigResponse(boolean enabled, String clientId) {}
}
