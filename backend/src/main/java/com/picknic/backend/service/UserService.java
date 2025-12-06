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

import java.util.List;

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
    private final OAuthUserService oauthUserService;

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
                .profileCompleted(oauthUserService.isProfileComplete(user))
                .build();

        log.info("프로필 조회 완료 - userId: {}, points: {}, rank: {}, level: {}",
                userId, points, rank, level.getDisplayName());

        return response;
    }

    /**
     * 실제 랭킹 계산 (시스템 계정 및 학교 미인증 사용자 제외)
     * RankingService와 동일한 DB 기반 로직 사용
     *
     * @param userId 사용자 ID
     * @return 실제 랭킹 (1-based)
     */
    private Long calculateActualRank(String userId) {
        try {
            // 1. DB에서 유효한 모든 사용자 조회
            List<User> allValidUsers = userRepository.findAll().stream()
                    .filter(user -> !user.getIsSystemAccount())
                    .filter(user -> user.getSchoolName() != null && !user.getSchoolName().trim().isEmpty())
                    .toList();

            // 2. 각 사용자의 UserPoint 조회
            List<String> userIds = allValidUsers.stream()
                    .map(User::getEmail)
                    .toList();

            List<com.picknic.backend.domain.UserPoint> userPoints = userPointRepository.findAllByUserIdIn(userIds);
            java.util.Map<String, com.picknic.backend.domain.UserPoint> userPointMap = userPoints.stream()
                    .collect(java.util.stream.Collectors.toMap(com.picknic.backend.domain.UserPoint::getUserId, up -> up));

            // 3. 각 사용자의 포인트로 정렬
            java.util.List<UserWithPoints> userWithPointsList = new java.util.ArrayList<>();
            for (User user : allValidUsers) {
                com.picknic.backend.domain.UserPoint userPoint = userPointMap.getOrDefault(
                        user.getEmail(),
                        new com.picknic.backend.domain.UserPoint(user.getEmail())
                );
                userWithPointsList.add(new UserWithPoints(user.getEmail(), userPoint.getTotalAccumulatedPoints()));
            }

            // 포인트 기준으로 정렬 (내림차순)
            userWithPointsList.sort((a, b) -> Long.compare(b.points, a.points));

            // 4. 내 순위 찾기
            for (int i = 0; i < userWithPointsList.size(); i++) {
                if (userWithPointsList.get(i).userId.equals(userId)) {
                    return (long) (i + 1);
                }
            }

            return null; // 유효한 사용자가 아닌 경우
        } catch (Exception e) {
            log.error("랭킹 계산 실패 - userId: {}", userId, e);
            return null;
        }
    }

    /**
     * 사용자와 포인트를 결합한 헬퍼 클래스 (정렬용)
     */
    private static class UserWithPoints {
        final String userId;
        final long points;

        UserWithPoints(String userId, long points) {
            this.userId = userId;
            this.points = points;
        }
    }
}
