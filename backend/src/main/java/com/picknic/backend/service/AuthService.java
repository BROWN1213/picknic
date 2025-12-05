package com.picknic.backend.service;

import com.picknic.backend.dto.auth.AuthResponse;
import com.picknic.backend.dto.auth.OAuthUserInfo;
import com.picknic.backend.dto.auth.UserLoginDto;
import com.picknic.backend.dto.auth.UserSignupDto;
import com.picknic.backend.entity.User;
import com.picknic.backend.repository.UserRepository;
import com.picknic.backend.util.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final CognitoService cognitoService;

    @Transactional
    public String login(UserLoginDto dto) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(dto.getEmail(), dto.getPassword())
        );

        return tokenProvider.generateToken(authentication);
    }

    @Transactional
    public AuthResponse handleOAuthCallback(String code) {
        // 1. Exchange code for Cognito tokens
        Map<String, Object> tokens = cognitoService.exchangeCodeForTokens(code);
        String accessToken = (String) tokens.get("access_token");

        // 2. Get user info from Cognito
        OAuthUserInfo oauthUser = cognitoService.getUserInfo(accessToken);

        // 3. Check if user exists in our database
        Optional<User> existingUser = userRepository.findByEmail(oauthUser.getEmail());

        if (existingUser.isPresent()) {
            // 4a. Existing user - generate custom JWT
            User user = existingUser.get();
            String customJwt = tokenProvider.generateTokenForUser(user);
            return AuthResponse.builder()
                    .token(customJwt)
                    .needsSignup(false)
                    .build();
        } else {
            // 4b. New user - needs signup
            return AuthResponse.builder()
                    .needsSignup(true)
                    .email(oauthUser.getEmail())
                    .name(oauthUser.getName())
                    .providerId(oauthUser.getCognitoSub())
                    .build();
        }
    }

    @Transactional
    public User register(UserSignupDto dto) {
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("Email already in use");
        }

        if (userRepository.existsByNickname(dto.getNickname())) {
            throw new RuntimeException("Nickname already in use");
        }

        User.UserBuilder builder = User.builder()
                .email(dto.getEmail())
                .nickname(dto.getNickname())
                .gender(dto.getGender())
                .birthYear(dto.getBirthYear())
                .schoolName(dto.getSchoolName())
                .interests(dto.getInterests());

        // Handle OAuth vs Local signup
        if (dto.getProviderId() != null && !dto.getProviderId().equals("local")) {
            // OAuth signup - no password needed
            builder.provider(User.AuthProvider.GOOGLE)
                    .providerId(dto.getProviderId())
                    .password(null);
        } else {
            // Local signup - password required
            builder.provider(User.AuthProvider.LOCAL)
                    .password(passwordEncoder.encode(dto.getPassword()));
        }

        return userRepository.save(builder.build());
    }
}
