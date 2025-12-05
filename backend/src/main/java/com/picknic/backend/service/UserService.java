package com.picknic.backend.service;

import com.picknic.backend.domain.Level;
import com.picknic.backend.domain.UserPoint;
import com.picknic.backend.dto.user.UserProfileResponse;
import com.picknic.backend.entity.User;
import com.picknic.backend.repository.UserPointRepository;
import com.picknic.backend.repository.UserRepository;
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
    private final UserRepository userRepository;
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

        // 2. Redis에서 랭킹 조회 (시스템 계정 및 학교 미인증 사용자 제외)
        Long rank = calculateActualRank(userId);

        // 3. Level 계산
        Level level = Level.fromPoints(points);

        // 4. 실제 사용자 정보 조회
        User user = userRepository.findByEmail(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 5. 응답 구성
        UserProfileResponse response = UserProfileResponse.builder()
                .userId(userId)
                .username(user.getNickname())
                .points(points)
                .rank(rank)
                .level(level.getDisplayName())
                .levelIcon(level.getIcon())
                .verifiedSchool(user.getSchoolName())
                .isSystemAccount(user.getIsSystemAccount())
                .build();

        log.info("프로필 조회 완료 - userId: {}, points: {}, rank: {}, level: {}",
                userId, points, rank, level.getDisplayName());

        return response;
    }

    /**
     * 실제 랭킹 계산 (시스템 계정 및 학교 미인증 사용자 제외)
     * RankingService와 동일한 로직 사용
     *
     * @param userId 사용자 ID
     * @return 실제 랭킹 (1-based)
     */
    private Long calculateActualRank(String userId) {
        try {
            // Get all users from Redis leaderboard
            var allUserIds = redisUtil.getTopRankers("leaderboard:weekly", 0, -1);
            int actualRank = 1;

            for (String otherId : allUserIds) {
                if (otherId.equals(userId)) {
                    return (long) actualRank;
                }

                // Count only valid users (not system accounts and have school)
                User otherUser = userRepository.findByEmail(otherId).orElse(null);
                if (otherUser == null || otherUser.getIsSystemAccount() ||
                    otherUser.getSchoolName() == null || otherUser.getSchoolName().trim().isEmpty()) {
                    continue; // Skip invalid users
                }

                // This user is valid and ranked above me, increment rank
                actualRank++;
            }

            return (long) actualRank;
        } catch (Exception e) {
            log.error("랭킹 계산 실패 - userId: {}", userId, e);
            return null;
        }
    }
}
