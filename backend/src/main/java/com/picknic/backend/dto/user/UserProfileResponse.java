package com.picknic.backend.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * 내 프로필 조회 응답 DTO
 *
 * API Spec: Section 2.1 - GET /users/me
 *
 * Example:
 * {
 *   "userId": "user_123abc",
 *   "username": "지민",
 *   "points": 1750,
 *   "rank": 6,
 *   "level": "실버",
 *   "levelIcon": "🥈",
 *   "verifiedSchool": "서울고등학교"
 * }
 */
@Getter
@Builder
@AllArgsConstructor
public class UserProfileResponse {

    /**
     * 사용자 ID
     */
    private String userId;

    /**
     * 사용자 닉네임
     */
    private String username;

    /**
     * 현재 포인트
     */
    private long points;

    /**
     * 주간 랭킹 순위 (1-based, null이면 랭킹 없음)
     */
    private Long rank;

    /**
     * 레벨명 (브론즈, 실버, 골드, 다이아, 마스터)
     */
    private String level;

    /**
     * 레벨 아이콘 (🥉, 🥈, 🥇, 💎, 🏆)
     */
    private String levelIcon;

    /**
     * 인증된 학교명 (null이면 미인증)
     */
    private String verifiedSchool;

    /**
     * 시스템 계정 여부 (시스템 계정은 모든 투표 삭제 가능)
     */
    private Boolean isSystemAccount;
}
