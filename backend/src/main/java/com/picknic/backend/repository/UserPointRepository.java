package com.picknic.backend.repository;

import com.picknic.backend.domain.UserPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface UserPointRepository extends JpaRepository<UserPoint, String> {
    Optional<UserPoint> findByUserId(String userId);

    /**
     * 학교별 포인트 합산 조회 (schoolName이 null이 아닌 경우만)
     *
     * @return List of Object[] where [0] = schoolName, [1] = totalPoints
     */
    @Query("SELECT u.schoolName, SUM(up.totalAccumulatedPoints) " +
           "FROM UserPoint up " +
           "JOIN User u ON up.userId = u.email " +
           "WHERE u.schoolName IS NOT NULL AND u.schoolName != '' AND u.isSystemAccount = false " +
           "GROUP BY u.schoolName " +
           "ORDER BY SUM(up.totalAccumulatedPoints) DESC")
    List<Object[]> findSchoolPointsRanking();

    /**
     * 특정 학교의 총 포인트 조회
     *
     * @param schoolName 학교명
     * @return 총 포인트 (해당 학교가 없으면 0)
     */
    @Query("SELECT COALESCE(SUM(up.totalAccumulatedPoints), 0) " +
           "FROM UserPoint up " +
           "JOIN User u ON up.userId = u.email " +
           "WHERE u.schoolName = :schoolName AND u.isSystemAccount = false")
    Long findTotalPointsBySchool(String schoolName);
}