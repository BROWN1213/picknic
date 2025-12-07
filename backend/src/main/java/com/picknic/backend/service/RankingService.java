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
     * DB 기반으로 모든 사용자를 조회하여 0포인트 사용자도 포함
     *
     * @param userId 현재 사용자 ID
     * @param limit 조회할 랭커 수 (default: 20)
     * @param offset 시작 위치 (default: 0)
     * @return PersonalRankingResponse
     */
    @Transactional(readOnly = true)
    public PersonalRankingResponse getPersonalRanking(String userId, int limit, int offset) {
        log.info("개인 랭킹 조회 요청 - userId: {}, limit: {}, offset: {}", userId, limit, offset);

        // 1. 모든 사용자 정렬된 리스트 조회
        List<UserWithPoints> userWithPointsList = getAllUsersSortedByPoints();

        // 2. RankerDto 생성 (순위 할당)
        List<RankerDto> allRankers = new ArrayList<>();
        for (int i = 0; i < userWithPointsList.size(); i++) {
            UserWithPoints user = userWithPointsList.get(i);
            allRankers.add(RankerDto.builder()
                    .userId(user.userId)
                    .username(user.username)
                    .points(user.points)
                    .rank(i + 1)
                    .build());
        }

        // 3. offset과 limit에 맞게 슬라이싱
        List<RankerDto> topRankers = allRankers.stream()
                .skip(offset)
                .limit(limit)
                .toList();

        // 4. 내 랭킹 정보 조회
        UserPoint myUserPoint = userPointRepository.findByUserId(userId)
                .orElse(new UserPoint(userId));

        String myUsername = userRepository.findByEmail(userId)
                .map(User::getNickname)
                .orElse("User_" + userId);

        // 내 순위 찾기
        Long myActualRank = null;
        for (int i = 0; i < allRankers.size(); i++) {
            if (allRankers.get(i).getUserId().equals(userId)) {
                myActualRank = (long) (i + 1);
                break;
            }
        }

        MyRankDto myRank = MyRankDto.builder()
                .rank(myActualRank)
                .points(myUserPoint.getTotalAccumulatedPoints())
                .username(myUsername)
                .build();

        // 5. 응답 구성
        PersonalRankingResponse response = PersonalRankingResponse.builder()
                .topRankers(topRankers)
                .myRank(myRank)
                .build();

        log.info("개인 랭킹 조회 완료 - Top {} 랭커, myRank: {}", topRankers.size(), myRank.getRank());

        return response;
    }

    /**
     * 특정 사용자의 랭킹 조회
     * 
     * @param userId 사용자 ID
     * @return 랭킹 (1-based), 없으면 null
     */
    @Transactional(readOnly = true)
    public Long getUserRank(String userId) {
        List<UserWithPoints> sortedUsers = getAllUsersSortedByPoints();
        for (int i = 0; i < sortedUsers.size(); i++) {
            if (sortedUsers.get(i).userId.equals(userId)) {
                return (long) (i + 1);
            }
        }
        return null;
    }

    /**
     * 모든 사용자를 포인트 순으로 정렬하여 조회 (동점자 처리 포함)
     */
    private List<UserWithPoints> getAllUsersSortedByPoints() {
        // 1. DB에서 유효한 모든 사용자 조회 (학교가 있고, 시스템 계정이 아닌)
        List<User> allValidUsers = userRepository.findAll().stream()
                .filter(user -> !user.getIsSystemAccount())
                .filter(user -> user.getSchoolName() != null && !user.getSchoolName().trim().isEmpty())
                .toList();

        // 2. 각 사용자의 UserPoint 조회하여 Map 생성
        List<String> userIds = allValidUsers.stream()
                .map(User::getEmail)
                .toList();

        List<UserPoint> userPoints = userPointRepository.findAllByUserIdIn(userIds);
        java.util.Map<String, UserPoint> userPointMap = userPoints.stream()
                .collect(java.util.stream.Collectors.toMap(UserPoint::getUserId, up -> up));

        // 3. User와 UserPoint를 결합
        List<UserWithPoints> userWithPointsList = new ArrayList<>();

        for (User user : allValidUsers) {
            UserPoint userPoint = userPointMap.getOrDefault(user.getEmail(), new UserPoint(user.getEmail()));
            userWithPointsList.add(new UserWithPoints(
                    user.getEmail(),
                    user.getNickname(),
                    userPoint.getTotalAccumulatedPoints()
            ));
        }

        // 포인트 기준으로 정렬 (내림차순), 동점자는 userId 오름차순
        userWithPointsList.sort((a, b) -> {
            int pointCompare = Long.compare(b.points, a.points);
            if (pointCompare != 0) {
                return pointCompare;
            }
            return a.userId.compareTo(b.userId);
        });

        return userWithPointsList;
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

    /**
     * 사용자와 포인트를 결합한 헬퍼 클래스 (정렬용)
     */
    private static class UserWithPoints {
        final String userId;
        final String username;
        final long points;

        UserWithPoints(String userId, String username, long points) {
            this.userId = userId;
            this.username = username;
            this.points = points;
        }
    }
}
