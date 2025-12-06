package com.picknic.backend.service;

import com.picknic.backend.entity.User;
import com.picknic.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * OAuth 사용자 관리 서비스
 *
 * OAuth 첫 로그인 시 자동으로 기본 사용자 계정을 생성하고,
 * 프로필 완성 여부를 판단하는 로직을 제공합니다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OAuthUserService {

    private final UserRepository userRepository;

    /**
     * OAuth 사용자 조회 또는 생성
     *
     * 기존 사용자가 있으면 반환하고, 없으면 최소한의 정보로 새 사용자를 생성합니다.
     *
     * @param email OAuth provider에서 받은 이메일
     * @param providerId OAuth provider의 사용자 ID (Cognito sub)
     * @param provider OAuth provider 종류 (GOOGLE, LOCAL 등)
     * @return 기존 또는 새로 생성된 User 객체
     */
    @Transactional
    public User getOrCreateOAuthUser(String email, String providerId, User.AuthProvider provider) {
        // 1. 기존 사용자 조회
        Optional<User> existingUser = userRepository.findByEmail(email);
        if (existingUser.isPresent()) {
            log.info("Existing OAuth user found: email={}, provider={}", email, provider);
            return existingUser.get();
        }

        // 2. 신규 사용자 생성
        log.info("Auto-creating new OAuth user: email={}, provider={}", email, provider);

        String tempNickname = generateTemporaryNickname(email);

        User newUser = User.builder()
                .email(email)
                .provider(provider)
                .providerId(providerId)
                .password(null) // OAuth 사용자는 비밀번호 없음
                .nickname(tempNickname) // 임시 닉네임 (회원가입 2단계에서 변경)
                .isSystemAccount(false)
                // gender, birthYear, schoolName, interests는 null로 유지
                // → 회원가입 2단계에서 입력받음
                .build();

        try {
            User savedUser = userRepository.save(newUser);
            log.info("New OAuth user created successfully: userId={}, email={}", savedUser.getId(), email);
            return savedUser;
        } catch (DataIntegrityViolationException e) {
            // 동시 요청으로 인한 중복 생성 시도
            log.warn("Concurrent user creation detected for email: {}. Fetching existing user.", email);
            return userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User creation failed and user not found: " + email));
        }
    }

    /**
     * 임시 닉네임 생성
     *
     * 이메일의 username 부분 + 랜덤 suffix로 임시 닉네임을 생성합니다.
     * 예: example@gmail.com → example_a1b2c3
     *
     * @param email 사용자 이메일
     * @return 생성된 임시 닉네임
     */
    private String generateTemporaryNickname(String email) {
        String username = email.substring(0, email.indexOf('@'));
        String randomSuffix = UUID.randomUUID().toString().substring(0, 6);
        return username + "_" + randomSuffix;
    }

    /**
     * 프로필 완성 여부 확인
     *
     * schoolName이 있으면 회원가입 Step 3(학교 인증)까지 완료한 것으로 판단합니다.
     * Step 3 완료 = Step 2(nickname, gender, birthYear)도 완료되었음을 의미합니다.
     *
     * @param user 확인할 사용자
     * @return 프로필 완성 여부 (schoolName이 있으면 true)
     */
    public boolean isProfileComplete(User user) {
        return user.getSchoolName() != null && !user.getSchoolName().trim().isEmpty();
    }
}
