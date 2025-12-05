package com.picknic.backend.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

/**
 * Spring Security 기반 인증 유틸리티
 */
@Component
public class SecurityUtils {

    /**
     * 현재 로그인된 사용자 이메일(ID)을 반환합니다
     *
     * @return 현재 사용자의 이메일(username)
     * @throws IllegalStateException 인증되지 않은 경우
     */
    public String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("No authenticated user found");
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof UserDetails) {
            return ((UserDetails) principal).getUsername();
        } else if (principal instanceof String) {
            return (String) principal;
        }

        throw new IllegalStateException("Unknown principal type: " + principal.getClass());
    }
}
