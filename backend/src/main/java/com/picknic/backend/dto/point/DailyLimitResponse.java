package com.picknic.backend.dto.point;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 일일 포인트 제한 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyLimitResponse {

    /**
     * 투표 참여 남은 횟수
     */
    private int voteRemaining;

    /**
     * 투표 생성 남은 횟수
     */
    private int createRemaining;

    /**
     * 투표 참여 제한
     */
    private int voteLimit;

    /**
     * 투표 생성 제한
     */
    private int createLimit;
}
