package com.picknic.backend.service;

import com.picknic.backend.domain.Level;
import com.picknic.backend.domain.UserPoint;
import com.picknic.backend.dto.user.UserProfileResponse;
import com.picknic.backend.repository.UserPointRepository;
import com.picknic.backend.util.RedisUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 사용자 프로필 관리 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserPointRepository userPointRepository;
    private final RedisUtil redisUtil;

    /**
     * 내 프로필 조회
     *
     * API Spec: Section 2.1 - GET /users/me
     *
     * @param userId 사용자 ID
     * @return UserProfileResponse (userId, username, points, rank, level, levelIcon, verifiedSchool)
     */
    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfile(String userId) {
        log.info("프로필 조회 요청 - userId: {}", userId);

        // 1. UserPoint 조회 (없으면 기본값 생성)
        UserPoint userPoint = userPointRepository.findByUserId(userId)
                .orElse(new UserPoint(userId));

        long points = userPoint.getCurrentPoints();

        // 2. Redis에서 랭킹 조회 (0-based → 1-based 변환)
        Long redisRank = redisUtil.getMyRank("leaderboard:weekly", userId);
        Long rank = (redisRank != null) ? redisRank + 1 : null;

        // 3. Level 계산
        Level level = Level.fromPoints(points);

        // 4. Mock 데이터 (Auth 모듈 준비 전까지)
        String mockUsername = "User_" + userId;
        String mockSchool = null; // 학교 미인증

        // 5. 응답 구성
        UserProfileResponse response = UserProfileResponse.builder()
                .userId(userId)
                .username(mockUsername)
                .points(points)
                .rank(rank)
                .level(level.getDisplayName())
                .levelIcon(level.getIcon())
                .verifiedSchool(mockSchool)
                .build();

        log.info("프로필 조회 완료 - userId: {}, points: {}, rank: {}, level: {}",
                userId, points, rank, level.getDisplayName());

        return response;
    }
}
