package com.picknic.backend.config;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.picknic.backend.entity.User;
import com.picknic.backend.repository.UserRepository;
import com.picknic.backend.service.CustomUserDetailsService;
import com.picknic.backend.util.CognitoTokenValidator;
import com.picknic.backend.util.JwtTokenProvider;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final CognitoTokenValidator cognitoValidator;
    private final CustomUserDetailsService customUserDetailsService;
    private final UserRepository userRepository;
    private final com.picknic.backend.service.OAuthUserService oauthUserService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        System.out.println("JwtAuthenticationFilter processing request: " + request.getRequestURI());

        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt)) {
                // 1단계: Cognito ID 토큰 시도
                try {
                    DecodedJWT cognitoToken = cognitoValidator.validateAndDecode(jwt);
                    String email = cognitoValidator.getEmailFromToken(cognitoToken);
                    String providerId = cognitoValidator.getCognitoSubFromToken(cognitoToken);

                    // OAuth 사용자 자동 생성 또는 조회
                    User user = oauthUserService.getOrCreateOAuthUser(
                            email,
                            providerId,
                            User.AuthProvider.GOOGLE
                    );

                    // 인증 컨텍스트 설정 (프로필 미완성 사용자도 인증됨)
                    setAuthentication(user, request);
                    System.out.println("OAuth user authenticated: email=" + email +
                            ", profileComplete=" + oauthUserService.isProfileComplete(user));

                } catch (JWTVerificationException cognitoEx) {
                    // 2단계: 커스텀 JWT 시도 (LOCAL 사용자)
                    try {
                        if (tokenProvider.validateToken(jwt)) {
                            String email = tokenProvider.getEmailFromToken(jwt);
                            UserDetails userDetails = customUserDetailsService.loadUserByUsername(email);
                            setAuthentication(userDetails, request);

                            System.out.println("Authenticated via custom JWT: " + email);
                        }
                    } catch (Exception jwtEx) {
                        logger.error("Both token validation methods failed", jwtEx);
                    }
                }
            }
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    private void setAuthentication(User user, HttpServletRequest request) {
        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
            user.getEmail(), "", new ArrayList<>()
        );
        UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private void setAuthentication(UserDetails userDetails, HttpServletRequest request) {
        UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
