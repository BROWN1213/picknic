package com.picknic.backend.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CognitoCallbackRequest {
    private String code;  // Authorization code from Cognito
}
