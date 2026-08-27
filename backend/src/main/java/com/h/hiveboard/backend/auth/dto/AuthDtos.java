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
            @Size(min = 8, message = "Password must be at least 8 characters") String password
    ) {}

    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String password
    ) {}

    public record AuthResponse(
            String token,
            String email,
            String fullName
    ) {}
}
