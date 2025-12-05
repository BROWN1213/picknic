package com.picknic.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.picknic.backend.dto.auth.OAuthUserInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class CognitoService {

    @Value("${aws.cognito.user-pool-id}")
    private String userPoolId;

    @Value("${aws.cognito.client-id}")
    private String clientId;

    @Value("${aws.cognito.region}")
    private String region;

    @Value("${aws.cognito.domain}")
    private String cognitoDomain;

    @Value("${oauth.callback.url}")
    private String callbackUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Exchange authorization code for Cognito tokens
     */
    public Map<String, Object> exchangeCodeForTokens(String code) {
        try {
            String tokenUrl = String.format("https://%s/oauth2/token", cognitoDomain);

            // Prepare request body
            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("grant_type", "authorization_code");
            body.add("client_id", clientId);
            body.add("code", code);
            body.add("redirect_uri", callbackUrl);

            // Prepare headers (Public client - no Basic Auth needed)
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

            // Make request
            ResponseEntity<Map> response = restTemplate.exchange(
                    tokenUrl,
                    HttpMethod.POST,
                    request,
                    Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return response.getBody();
            } else {
                throw new RuntimeException("Failed to exchange code for tokens");
            }
        } catch (Exception e) {
            throw new RuntimeException("Error exchanging authorization code: " + e.getMessage(), e);
        }
    }

    /**
     * Get user information from Cognito using access token
     */
    public OAuthUserInfo getUserInfo(String accessToken) {
        try {
            String userInfoUrl = String.format("https://%s/oauth2/userInfo", cognitoDomain);

            // Prepare headers with Bearer token
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + accessToken);

            HttpEntity<String> request = new HttpEntity<>(headers);

            // Make request
            ResponseEntity<Map> response = restTemplate.exchange(
                    userInfoUrl,
                    HttpMethod.GET,
                    request,
                    Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> userInfoMap = response.getBody();

                return OAuthUserInfo.builder()
                        .email((String) userInfoMap.get("email"))
                        .name((String) userInfoMap.getOrDefault("name", ""))
                        .cognitoSub((String) userInfoMap.get("sub"))
                        .provider("GOOGLE")
                        .build();
            } else {
                throw new RuntimeException("Failed to get user info from Cognito");
            }
        } catch (Exception e) {
            throw new RuntimeException("Error fetching user info: " + e.getMessage(), e);
        }
    }
}
