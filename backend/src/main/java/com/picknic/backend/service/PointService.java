package com.picknic.backend.service;

import com.picknic.backend.domain.PointHistory;
import com.picknic.backend.domain.PointType;
import com.picknic.backend.domain.Reward;
import com.picknic.backend.domain.UserPoint;
import com.picknic.backend.dto.point.DailyCheckInResponse;
import com.picknic.backend.dto.point.PointHistoryDto;
import com.picknic.backend.dto.point.PointHistoryResponse;
import com.picknic.backend.entity.User;
import com.picknic.backend.exception.BadRequestException;
import com.picknic.backend.repository.PointHistoryRepository;
import com.picknic.backend.repository.RewardRepository;
import com.picknic.backend.repository.UserPointRepository;
import com.picknic.backend.repository.UserRepository;
import com.picknic.backend.util.RedisUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PointService {

    private final UserPointRepository userPointRepository;
    private final PointHistoryRepository pointHistoryRepository;
    private final RewardRepository rewardRepository;
    private final UserRepository userRepository;
    private final RedisUtil redisUtil;

    // 일일 제한 설정
    private static final int VOTE_DAILY_LIMIT = 10;
    private static final int CREATE_DAILY_LIMIT = 5;
    private static final long TTL_24_HOURS = 86400L; // 24시간 (초 단위)

    /**
     * 포인트 적립
     *
     * @param userId 사용자 ID
     * @param type 포인트 타입 (VOTE, CREATE 등)
     * @param amount 적립 포인트
     * @param schoolName 학교 이름 (학교별 랭킹용, nullable)
     * @param referenceId 참조 ID (voteId 등, nullable)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void earnPoints(String userId, PointType type, int amount, String schoolName, String referenceId) {
        // 0. Check if user is a system account - skip point earning
        User user = userRepository.findByEmail(userId).orElse(null);
        if (user != null && user.getIsSystemAccount()) {
            log.info("시스템 계정은 포인트를 받지 않습니다 - userId: {}", userId);
            return;
        }

        // 1. Redis로 일일 제한 체크 - 제한 초과시 포인트만 지급하지 않음
        if (!checkDailyLimit(userId, type)) {
            log.info("일일 제한 초과로 포인트를 지급하지 않습니다 - userId: {}, type: {}", userId, type);
            return;
        }

        // 2. DB 트랜잭션: UserPoint 업데이트
        UserPoint userPoint = userPointRepository.findByUserId(userId)
                .orElse(new UserPoint(userId));

        userPoint.addPoints(amount);
        userPointRepository.save(userPoint);

        // 3. PointHistory 저장
        String description = generateDescription(type, amount);
        PointHistory history = new PointHistory(
                userId,
                type,
                amount,
                description,
                referenceId // voteId 등 추적용
        );
        pointHistoryRepository.save(history);

        // 4. Redis Leaderboard 업데이트
        // 주간 랭킹에 추가
        redisUtil.incrementScore("leaderboard:weekly", userId, amount);

        // 학교별 랭킹은 실시간 합산으로 계산 (Redis 업데이트 제거)

        log.info("포인트 적립 완료 - userId: {}, type: {}, amount: {}", userId, type, amount);
    }

    /**
     * 리워드 교환
     *
     * @param userId 사용자 ID
     * @param rewardId 리워드 ID
     * @throws IllegalStateException 재고 부족 또는 포인트 부족 시
     * @throws ObjectOptimisticLockingFailureException 동시성 충돌 시
     */
    @Transactional
    public void redeemReward(String userId, Long rewardId) {
        try {
            // 1. Reward 조회
            Reward reward = rewardRepository.findById(rewardId)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 리워드입니다."));

            // 2. UserPoint 조회
            UserPoint userPoint = userPointRepository.findByUserId(userId)
                    .orElseThrow(() -> new IllegalStateException("사용자 포인트 정보를 찾을 수 없습니다."));

            // 3. 검증
            if (reward.getStock() <= 0) {
                throw new BadRequestException("리워드 재고가 부족합니다.");
            }

            if (userPoint.getCurrentPoints() < reward.getCost()) {
                throw new BadRequestException(
                        String.format("포인트가 부족합니다. (필요: %d, 보유: %d)",
                                reward.getCost(), userPoint.getCurrentPoints())
                );
            }

            // 4. DB 업데이트
            reward.decreaseStock();
            userPoint.usePoints(reward.getCost());

            rewardRepository.save(reward);
            userPointRepository.save(userPoint);

            // 5. PointHistory 저장 (음수로 기록)
            PointHistory history = new PointHistory(
                    userId,
                    PointType.USE_REWARD,
                    -reward.getCost(),
                    String.format("리워드 교환: %s", reward.getName()),
                    String.valueOf(rewardId)
            );
            pointHistoryRepository.save(history);

            log.info("리워드 교환 완료 - userId: {}, rewardId: {}, cost: {}",
                    userId, rewardId, reward.getCost());

        } catch (ObjectOptimisticLockingFailureException e) {
            log.error("동시성 충돌 발생 - userId: {}, rewardId: {}", userId, rewardId, e);
            throw new IllegalStateException(
                    "동시에 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.", e
            );
        }
    }

    /**
     * 주간 랭킹 조회 (Top 20)
     *
     * @return 상위 20명의 사용자 ID 집합
     */
    public Set<String> getWeeklyRanking() {
        return redisUtil.getTopRankers("leaderboard:weekly", 0, 19);
    }

    /**
     * 학교별 랭킹 조회 (Top 20)
     *
     * @return 상위 20개 학교명 집합
     */
    public Set<String> getSchoolRanking() {
        return redisUtil.getTopRankers("leaderboard:school", 0, 19);
    }

    /**
     * 내 랭킹 조회
     *
     * @param userId 사용자 ID
     * @return 랭킹 순위 (0-based, null이면 랭킹 없음)
     */
    public Long getMyRank(String userId) {
        return redisUtil.getMyRank("leaderboard:weekly", userId);
    }

    /**
     * 일일 제한 체크
     *
     * @param userId 사용자 ID
     * @param type 포인트 타입
     * @return 제한 내인 경우 true, 제한 초과인 경우 false
     */
    private boolean checkDailyLimit(String userId, PointType type) {
        // VOTE와 CREATE 타입만 제한 적용
        if (type != PointType.VOTE && type != PointType.CREATE) {
            return true;
        }

        // Redis 키 생성: limit:{type}:{date}:{userId}
        String limitKey = String.format("limit:%s:%s:%s",
                type.name(),
                LocalDate.now().toString(),
                userId);

        // Redis INCR로 카운트 증가
        Long currentCount = redisUtil.incrementCounterWithLimit(limitKey, TTL_24_HOURS);

        // 제한 체크
        int limit = (type == PointType.VOTE) ? VOTE_DAILY_LIMIT : CREATE_DAILY_LIMIT;

        if (currentCount != null && currentCount > limit) {
            log.info("일일 제한 초과 - userId: {}, type: {}, count: {}/{}",
                    userId, type, currentCount, limit);
            return false;
        }

        log.debug("일일 제한 체크 통과 - userId: {}, type: {}, count: {}/{}",
                userId, type, currentCount, limit);
        return true;
    }

    /**
     * 일일 남은 횟수 조회
     *
     * @param userId 사용자 ID
     * @param type 포인트 타입 (VOTE 또는 CREATE)
     * @return 남은 횟수 (제한 - 현재 사용량)
     */
    public int getRemainingCount(String userId, PointType type) {
        // VOTE와 CREATE 타입만 제한 적용
        if (type != PointType.VOTE && type != PointType.CREATE) {
            return -1; // 제한 없음
        }

        // Redis 키 생성: limit:{type}:{date}:{userId}
        String limitKey = String.format("limit:%s:%s:%s",
                type.name(),
                LocalDate.now().toString(),
                userId);

        // 현재 카운트 조회
        Long currentCount = redisUtil.getCounter(limitKey);
        if (currentCount == null) {
            currentCount = 0L;
        }

        // 제한값
        int limit = (type == PointType.VOTE) ? VOTE_DAILY_LIMIT : CREATE_DAILY_LIMIT;

        // 남은 횟수 계산
        int remaining = Math.max(0, limit - currentCount.intValue());

        log.debug("남은 횟수 조회 - userId: {}, type: {}, remaining: {}/{}",
                userId, type, remaining, limit);

        return remaining;
    }

    /**
     * 일일 제한 정보 조회
     *
     * @param userId 사용자 ID
     * @return DailyLimitResponse (voteRemaining, createRemaining, voteLimit, createLimit)
     */
    public com.picknic.backend.dto.point.DailyLimitResponse getDailyLimit(String userId) {
        int voteRemaining = getRemainingCount(userId, PointType.VOTE);
        int createRemaining = getRemainingCount(userId, PointType.CREATE);

        return com.picknic.backend.dto.point.DailyLimitResponse.builder()
                .voteRemaining(voteRemaining)
                .createRemaining(createRemaining)
                .voteLimit(VOTE_DAILY_LIMIT)
                .createLimit(CREATE_DAILY_LIMIT)
                .build();
    }

    /**
     * 출석 체크 (일일 1회 제한)
     *
     * API Spec: Section 5.4 - POST /daily-check-in
     *
     * @param userId 사용자 ID
     * @return DailyCheckInResponse (earnedPoints, totalPoints, consecutiveDays)
     * @throws IllegalStateException 이미 출석 체크한 경우
     */
    @Transactional
    public DailyCheckInResponse dailyCheckIn(String userId) {
        log.info("출석 체크 요청 - userId: {}", userId);

        // 1. Redis Key 생성: limit:ATTENDANCE:{date}:{userId}
        String limitKey = String.format("limit:ATTENDANCE:%s:%s",
                LocalDate.now().toString(),
                userId);

        // 2. 이미 출석 체크했는지 확인
        Long currentCount = redisUtil.incrementCounterWithLimit(limitKey, TTL_24_HOURS);

        if (currentCount != null && currentCount > 1) {
            throw new BadRequestException("오늘 이미 출석 체크를 완료했습니다.");
        }

        // 3. 포인트 적립 (+5P)
        int earnedPoints = 5;
        earnPoints(userId, PointType.ATTENDANCE, earnedPoints, null, null);

        // 4. 현재 총 포인트 조회
        UserPoint userPoint = userPointRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("사용자 포인트 정보를 찾을 수 없습니다."));

        // 5. 응답 구성
        DailyCheckInResponse response = DailyCheckInResponse.builder()
                .earnedPoints(earnedPoints)
                .totalPoints(userPoint.getCurrentPoints())
                .consecutiveDays(null) // 향후 구현
                .build();

        log.info("출석 체크 완료 - userId: {}, earnedPoints: {}, totalPoints: {}",
                userId, earnedPoints, userPoint.getCurrentPoints());

        return response;
    }

    /**
     * 포인트 내역 조회 (DTO 변환)
     *
     * API Spec: Section 5.1 - GET /points/history
     *
     * @param userId 사용자 ID
     * @param pageable 페이징 정보
     * @return PointHistoryResponse (currentPoints, history)
     */
    @Transactional(readOnly = true)
    public PointHistoryResponse getPointHistory(String userId, Pageable pageable) {
        log.info("포인트 내역 조회 요청 - userId: {}", userId);

        // 1. UserPoint 조회
        UserPoint userPoint = userPointRepository.findByUserId(userId)
                .orElse(new UserPoint(userId));

        long currentPoints = userPoint.getCurrentPoints();

        // 2. PointHistory 조회 (페이징)
        Page<PointHistory> historyPage = pointHistoryRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);

        // 3. PointHistory → PointHistoryDto 변환
        List<PointHistoryDto> historyDtos = historyPage.getContent().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());

        // 4. 응답 구성
        PointHistoryResponse response = PointHistoryResponse.builder()
                .currentPoints(currentPoints)
                .history(historyDtos)
                .build();

        log.info("포인트 내역 조회 완료 - userId: {}, currentPoints: {}, 내역 수: {}",
                userId, currentPoints, historyDtos.size());

        return response;
    }

    /**
     * PointHistory → PointHistoryDto 변환 헬퍼
     *
     * @param history PointHistory 엔티티
     * @return PointHistoryDto
     */
    private PointHistoryDto convertToDto(PointHistory history) {
        // PointType enum을 소문자 문자열로 변환 (vote, create, attendance, event, use_reward)
        String typeString = history.getType().name().toLowerCase();

        // ISO 8601 형식으로 timestamp 변환 (2025-11-19T10:30:00Z)
        String timestamp = history.getCreatedAt()
                .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z";

        return PointHistoryDto.builder()
                .type(typeString)
                .description(history.getDescription())
                .points(history.getAmount())
                .timestamp(timestamp)
                .build();
    }

    /**
     * 포인트 타입별 설명 생성
     *
     * @param type 포인트 타입
     * @param amount 포인트 양
     * @return 설명 문자열
     */
    private String generateDescription(PointType type, int amount) {
        return switch (type) {
            case VOTE -> String.format("투표 참여 +%d점", amount);
            case CREATE -> String.format("투표 생성 +%d점", amount);
            case ATTENDANCE -> String.format("출석 체크 +%d점", amount);
            case EVENT -> String.format("이벤트 참여 +%d점", amount);
            case USE_REWARD -> String.format("리워드 사용 %d점", amount);
        };
    }
}
