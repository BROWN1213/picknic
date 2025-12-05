package com.picknic.backend.controller;

import com.picknic.backend.dto.auth.AuthResponse;
import com.picknic.backend.dto.auth.CognitoCallbackRequest;
import com.picknic.backend.dto.auth.ProfileCompletionDto;
import com.picknic.backend.dto.auth.UserLoginDto;
import com.picknic.backend.dto.auth.UserSignupDto;
import com.picknic.backend.entity.User;
import com.picknic.backend.repository.UserRepository;
import com.picknic.backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @Value("${aws.cognito.domain}")
    private String cognitoDomain;

    @Value("${aws.cognito.client-id}")
    private String clientId;

    @Value("${oauth.callback.url}")
    private String callbackUrl;

    // KEEP: Local login for existing users
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody UserLoginDto dto) {
        System.out.println("Login attempt for: " + dto.getEmail());
        try {
            String token = authService.login(dto);
            return ResponseEntity.ok(Map.of("token", token));
        } catch (org.springframework.security.core.userdetails.UsernameNotFoundException e) {
            return ResponseEntity.status(401).body(Map.of("message", "등록되지 않은 이메일입니다."));
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            return ResponseEntity.status(401).body(Map.of("message", "비밀번호가 일치하지 않습니다."));
        } catch (Exception e) {
            System.err.println("Login error: " + e.getMessage());
            return ResponseEntity.status(401).body(Map.of("message", "이메일 또는 비밀번호가 올바르지 않습니다."));
        }
    }

    // KEEP: Registration for LOCAL users (email/password)
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody UserSignupDto dto) {
        try {
            User user = authService.register(dto);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // NEW: Profile completion endpoint (replaces /auth/cognito/callback logic)
    @PostMapping("/complete-profile")
    public ResponseEntity<?> completeProfile(@RequestBody ProfileCompletionDto dto) {
        try {
            // 현재 인증된 사용자 가져오기
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String email = authentication.getName();

            User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

            // 프로필 정보 업데이트
            user.setNickname(dto.getNickname());
            user.setGender(dto.getGender());
            user.setBirthYear(dto.getBirthYear());
            user.setSchoolName(dto.getSchoolName());
            user.setInterests(dto.getInterests());

            userRepository.save(user);

            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // DEPRECATED: OAuth callback (handled by react-oidc-context on frontend)
    @Deprecated
    @PostMapping("/cognito/callback")
    public ResponseEntity<?> handleCognitoCallback(@RequestBody CognitoCallbackRequest request) {
        return ResponseEntity.status(410).body(Map.of(
            "message", "This endpoint is deprecated. Please use react-oidc-context for OAuth flow."
        ));
    }

    // KEEP: For backward compatibility
    @GetMapping("/cognito/login-url")
    public ResponseEntity<?> getCognitoLoginUrl() {
        String loginUrl = String.format(
                "https://%s/oauth2/authorize?client_id=%s&response_type=code&scope=email+openid+profile&redirect_uri=%s",
                cognitoDomain,
                clientId,
                URLEncoder.encode(callbackUrl, StandardCharsets.UTF_8)
        );
        return ResponseEntity.ok(Map.of("url", loginUrl));
    }
}
