package com.picknic.backend.controller;

import com.picknic.backend.domain.UserPoint;
import com.picknic.backend.dto.common.ApiResponse;
import com.picknic.backend.dto.point.DailyCheckInResponse;
import com.picknic.backend.dto.point.DailyLimitResponse;
import com.picknic.backend.dto.point.PointHistoryResponse;
import com.picknic.backend.dto.reward.RewardRedeemResponse;
import com.picknic.backend.repository.UserPointRepository;
import com.picknic.backend.service.PointService;
import com.picknic.backend.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 포인트 관리 API
 *
 * API Spec: Section 5 - Points & Rewards
 */
@Tag(name = "Point", description = "포인트 관리 API")
@Slf4j
@RestController
@RequiredArgsConstructor
public class PointController {

    private final PointService pointService;
    private final SecurityUtils securityUtils;
    private final UserPointRepository userPointRepository;

    /**
     * 포인트 변동 이력 조회
     *
     * GET /points/history
     *
     * @param limit 조회할 내역 수 (default: 20)
     * @param offset 시작 위치 (default: 0)
     * @return ApiResponse<PointHistoryResponse>
     */
    @Operation(
            summary = "포인트 내역 조회",
            description = "현재 사용자의 포인트 변동 이력을 조회합니다. 최신 내역이 먼저 표시됩니다."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "포인트 내역 조회 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = ApiResponse.class),
                            examples = @ExampleObject(value = """
                                    {
                                      "success": true,
                                      "data": {
                                        "currentPoints": 1750,
                                        "history": [
                                          {
                                            "type": "vote",
                                            "description": "투표 참여 +1점",
                                            "points": 1,
                                            "timestamp": "2025-11-19T10:30:00Z"
                                          }
                                        ]
                                      }
                                    }
                                    """)
                    )
            )
    })
    @GetMapping("/points/history")
    public ResponseEntity<ApiResponse<PointHistoryResponse>> getPointHistory(
            @Parameter(description = "조회할 내역 수", example = "20")
            @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "시작 위치 (페이지 오프셋)", example = "0")
            @RequestParam(defaultValue = "0") int offset
    ) {
        log.info("포인트 내역 조회 요청 - limit: {}, offset: {}", limit, offset);

        // 현재 사용자 ID 조회 (Mock)
        String userId = securityUtils.getCurrentUserId();

        // offset을 페이지 번호로 변환 (offset / limit)
        int page = offset / limit;
        Pageable pageable = PageRequest.of(page, limit);

        // PointService를 통해 내역 조회
        PointHistoryResponse history = pointService.getPointHistory(userId, pageable);

        // ApiResponse로 래핑하여 반환
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    /**
     * 일일 제한 정보 조회
     *
     * GET /points/daily-limit
     *
     * @return ApiResponse<DailyLimitResponse>
     */
    @Operation(
            summary = "일일 제한 정보 조회",
            description = "투표 참여 및 생성의 일일 남은 횟수를 조회합니다."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "일일 제한 정보 조회 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = ApiResponse.class),
                            examples = @ExampleObject(value = """
                                    {
                                      "success": true,
                                      "data": {
                                        "voteRemaining": 8,
                                        "createRemaining": 3,
                                        "voteLimit": 10,
                                        "createLimit": 5
                                      }
                                    }
                                    """)
                    )
            )
    })
    @GetMapping("/points/daily-limit")
    public ResponseEntity<ApiResponse<DailyLimitResponse>> getDailyLimit() {
        log.info("일일 제한 정보 조회 요청");

        // 현재 사용자 ID 조회
        String userId = securityUtils.getCurrentUserId();

        // PointService를 통해 일일 제한 정보 조회
        DailyLimitResponse response = pointService.getDailyLimit(userId);

        // ApiResponse로 래핑하여 반환
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 출석 체크
     *
     * POST /daily-check-in
     *
     * @return ApiResponse<DailyCheckInResponse>
     */
    @Operation(
            summary = "출석 체크",
            description = "일일 출석 체크를 하고 +5P를 획득합니다. (일일 1회 제한)"
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "출석 체크 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = ApiResponse.class),
                            examples = @ExampleObject(value = """
                                    {
                                      "success": true,
                                      "data": {
                                        "earnedPoints": 5,
                                        "totalPoints": 1755,
                                        "consecutiveDays": null
                                      }
                                    }
                                    """)
                    )
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "이미 출석 체크 완료",
                    content = @Content(mediaType = "application/json")
            )
    })
    @PostMapping("/daily-check-in")
    public ResponseEntity<ApiResponse<DailyCheckInResponse>> dailyCheckIn() {
        log.info("출석 체크 요청");

        // 현재 사용자 ID 조회 (Mock)
        String userId = securityUtils.getCurrentUserId();

        // PointService를 통해 출석 체크 처리
        DailyCheckInResponse response = pointService.dailyCheckIn(userId);

        // ApiResponse로 래핑하여 반환
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 리워드 교환
     *
     * POST /rewards/{rewardId}/redeem
     *
     * @param rewardId 교환할 리워드 ID
     * @return ApiResponse<RewardRedeemResponse>
     */
    @Operation(
            summary = "리워드 교환",
            description = "포인트를 사용하여 리워드를 교환합니다. 재고와 포인트 잔액을 확인합니다."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "리워드 교환 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = ApiResponse.class),
                            examples = @ExampleObject(value = """
                                    {
                                      "success": true,
                                      "data": {
                                        "message": "리워드 교환이 완료되었습니다.",
                                        "rewardId": 123,
                                        "remainingPoints": 1250
                                      }
                                    }
                                    """)
                    )
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "재고 부족 또는 포인트 부족",
                    content = @Content(mediaType = "application/json")
            )
    })
    @PostMapping("/rewards/{rewardId}/redeem")
    public ResponseEntity<ApiResponse<RewardRedeemResponse>> redeemReward(
            @Parameter(description = "교환할 리워드 ID", example = "1", required = true)
            @PathVariable Long rewardId
    ) {
        log.info("리워드 교환 요청 - rewardId: {}", rewardId);

        // 현재 사용자 ID 조회 (Mock)
        String userId = securityUtils.getCurrentUserId();

        // 리워드 교환 처리
        pointService.redeemReward(userId, rewardId);

        // 교환 후 남은 포인트 조회
        UserPoint userPoint = userPointRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("사용자 포인트 정보를 찾을 수 없습니다."));

        // 응답 구성
        RewardRedeemResponse response = RewardRedeemResponse.builder()
                .message("리워드 교환이 완료되었습니다.")
                .rewardId(rewardId)
                .remainingPoints(userPoint.getCurrentPoints())
                .build();

        log.info("리워드 교환 완료 - userId: {}, rewardId: {}", userId, rewardId);

        // ApiResponse로 래핑하여 반환
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
