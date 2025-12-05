package com.picknic.backend.service;

import com.picknic.backend.domain.UserPoint;
import com.picknic.backend.dto.ranking.*;
import com.picknic.backend.entity.User;
import com.picknic.backend.repository.UserPointRepository;
import com.picknic.backend.repository.UserRepository;
import com.picknic.backend.util.RedisUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * 랭킹 조회 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RankingService {

    private final UserPointRepository userPointRepository;
    private final UserRepository userRepository;
    private final RedisUtil redisUtil;
    private final RedisTemplate<String, String> redisTemplate;

    /**
     * 개인 랭킹 조회 (Top N + 내 랭킹)
     *
     * API Spec: Section 4.1 - GET /rankings/personal
     *
     * @param userId 현재 사용자 ID
     * @param limit 조회할 랭커 수 (default: 20)
     * @param offset 시작 위치 (default: 0)
     * @return PersonalRankingResponse
     */
    @Transactional(readOnly = true)
    public PersonalRankingResponse getPersonalRanking(String userId, int limit, int offset) {
        log.info("개인 랭킹 조회 요청 - userId: {}, limit: {}, offset: {}", userId, limit, offset);

        // 1. Redis에서 Top N userId 조회 (ZREVRANGE)
        Set<String> topUserIds = redisUtil.getTopRankers("leaderboard:weekly", offset, offset + limit - 1);

        // 2. 각 userId별 정보 조회 → RankerDto 구성
        List<RankerDto> topRankers = new ArrayList<>();
        int displayRank = 1; // 표시할 순위 (skip된 항목 제외)

        for (String topUserId : topUserIds) {
            // Skip system accounts and users without school from rankings
            User user = userRepository.findByEmail(topUserId).orElse(null);
            if (user == null || user.getIsSystemAccount() || user.getSchoolName() == null || user.getSchoolName().trim().isEmpty()) {
                continue;
            }

            UserPoint userPoint = userPointRepository.findByUserId(topUserId)
                    .orElse(new UserPoint(topUserId));

            RankerDto rankerDto = RankerDto.builder()
                    .userId(topUserId)
                    .username(user.getNickname())
                    .points(userPoint.getTotalAccumulatedPoints())
                    .rank(displayRank++)
                    .build();

            topRankers.add(rankerDto);
        }

        // 3. 내 랭킹 정보 조회
        UserPoint myUserPoint = userPointRepository.findByUserId(userId)
                .orElse(new UserPoint(userId));

        // Get my nickname
        String myUsername = userRepository.findByEmail(userId)
                .map(User::getNickname)
                .orElse("User_" + userId);

        // Calculate my actual rank by counting valid users above me
        Long myActualRank = null;
        Set<String> allUserIds = redisUtil.getTopRankers("leaderboard:weekly", 0, -1); // Get all users from Redis
        int actualRank = 1;

        for (String otherId : allUserIds) {
            if (otherId.equals(userId)) {
                myActualRank = (long) actualRank;
                break;
            }

            // Count only valid users (not system accounts and have school)
            User otherUser = userRepository.findByEmail(otherId).orElse(null);
            if (otherUser == null || otherUser.getIsSystemAccount() || otherUser.getSchoolName() == null || otherUser.getSchoolName().trim().isEmpty()) {
                continue; // Skip invalid users
            }

            // This user is valid and ranked above me, increment rank
            actualRank++;
        }

        MyRankDto myRank = MyRankDto.builder()
                .rank(myActualRank)
                .points(myUserPoint.getTotalAccumulatedPoints())
                .username(myUsername)
                .build();

        // 4. 응답 구성
        PersonalRankingResponse response = PersonalRankingResponse.builder()
                .topRankers(topRankers)
                .myRank(myRank)
                .build();

        log.info("개인 랭킹 조회 완료 - Top {} 랭커, myRank: {}", topRankers.size(), myRank.getRank());

        return response;
    }

    /**
     * 학교별 랭킹 조회 (Top N + 내 학교 랭킹)
     *
     * DB에서 실시간으로 학교 소속 학생들의 포인트를 합산하여 계산
     *
     * API Spec: Section 4.2 - GET /rankings/schools
     *
     * @param userSchool 현재 사용자의 학교명 (nullable)
     * @param limit 조회할 학교 수 (default: 20)
     * @param offset 시작 위치 (default: 0)
     * @return SchoolRankingResponse
     */
    @Transactional(readOnly = true)
    public SchoolRankingResponse getSchoolRanking(String userSchool, int limit, int offset) {
        log.info("학교별 랭킹 조회 요청 - userSchool: {}, limit: {}, offset: {}", userSchool, limit, offset);

        // 1. DB에서 학교별 포인트 합산 조회 (이미 정렬됨)
        List<Object[]> allSchoolRankings = userPointRepository.findSchoolPointsRanking();

        // 2. offset과 limit에 맞게 슬라이싱
        List<SchoolRankDto> topSchools = new ArrayList<>();
        int rank = 1; // 전체 랭킹에서의 순위

        for (int i = 0; i < allSchoolRankings.size(); i++) {
            Object[] row = allSchoolRankings.get(i);
            String schoolName = (String) row[0];
            Long totalPoints = ((Number) row[1]).longValue();

            // offset과 limit에 해당하는 학교만 추가
            if (i >= offset && i < offset + limit) {
                SchoolRankDto schoolRankDto = SchoolRankDto.builder()
                        .schoolName(schoolName)
                        .totalPoints(totalPoints)
                        .rank(rank)
                        .memberCount(null) // 선택 사항 (향후 구현)
                        .build();

                topSchools.add(schoolRankDto);
            }

            rank++;
        }

        // 3. 내 학교 랭킹 정보 조회
        MySchoolDto mySchool = null;

        if (userSchool != null && !userSchool.trim().isEmpty()) {
            // 내 학교의 총 포인트 조회
            Long totalPoints = userPointRepository.findTotalPointsBySchool(userSchool);

            // 내 학교의 순위 찾기
            Long myRank = null;
            for (int i = 0; i < allSchoolRankings.size(); i++) {
                String schoolName = (String) allSchoolRankings.get(i)[0];
                if (schoolName.equals(userSchool)) {
                    myRank = (long) (i + 1); // 1-based 순위
                    break;
                }
            }

            mySchool = MySchoolDto.builder()
                    .schoolName(userSchool)
                    .rank(myRank)
                    .totalPoints(totalPoints)
                    .build();
        }

        // 4. 응답 구성
        SchoolRankingResponse response = SchoolRankingResponse.builder()
                .topSchools(topSchools)
                .mySchool(mySchool)
                .build();

        log.info("학교별 랭킹 조회 완료 - Top {} 학교", topSchools.size());

        return response;
    }
}
