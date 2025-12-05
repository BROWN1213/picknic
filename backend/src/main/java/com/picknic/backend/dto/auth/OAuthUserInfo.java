package com.picknic.backend.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OAuthUserInfo {
    private String email;
    private String name;
    private String cognitoSub;  // Cognito's unique identifier
    private String provider;    // "GOOGLE"
}
