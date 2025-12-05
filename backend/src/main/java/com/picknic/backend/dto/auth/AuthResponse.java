package com.picknic.backend.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;           // Custom JWT token
    private Boolean needsSignup;    // true if OAuth user needs to complete profile
    private String email;           // Pre-filled for OAuth signup
    private String name;            // Pre-filled name
    private String providerId;      // Cognito sub
}
