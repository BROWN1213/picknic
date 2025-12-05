package com.picknic.backend.controller;

import com.picknic.backend.dto.common.ApiResponse;
import com.picknic.backend.dto.ranking.PersonalRankingResponse;
import com.picknic.backend.dto.ranking.SchoolRankingResponse;
import com.picknic.backend.entity.User;
import com.picknic.backend.repository.UserRepository;
import com.picknic.backend.service.RankingService;
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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 랭킹 조회 API
 *
 * API Spec: Section 4 - Rankings
 */
@Tag(name = "Ranking", description = "랭킹 조회 API")
@Slf4j
@RestController
@RequestMapping("/rankings")
@RequiredArgsConstructor
public class RankingController {

    private final RankingService rankingService;
    private final SecurityUtils securityUtils;
    private final UserRepository userRepository;

    /**
     * 개인 랭킹 조회
     *
     * GET /rankings/personal
     *
     * @param limit 조회할 랭커 수 (default: 20)
     * @param offset 시작 위치 (default: 0)
     * @return ApiResponse<PersonalRankingResponse>
     */
    @Operation(
            summary = "개인 랭킹 조회",
            description = "주간 포인트 랭킹 Top N과 현재 사용자의 랭킹을 조회합니다."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "랭킹 조회 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = ApiResponse.class),
                            examples = @ExampleObject(value = """
                                    {
                                      "success": true,
                                      "data": {
                                        "topRankers": [
                                          {
                                            "userId": "user123",
                                            "username": "User_user123",
                                            "points": 2500,
                                            "rank": 1
                                          }
                                        ],
                                        "myRank": {
                                          "rank": 6,
                                          "points": 1750,
                                          "username": "User_test_user_123"
                                        }
                                      }
                                    }
                                    """)
                    )
            )
    })
    @GetMapping("/personal")
    public ResponseEntity<ApiResponse<PersonalRankingResponse>> getPersonalRanking(
            @Parameter(description = "조회할 랭커 수", example = "20")
            @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "시작 위치 (오프셋)", example = "0")
            @RequestParam(defaultValue = "0") int offset
    ) {
        log.info("개인 랭킹 조회 요청 - limit: {}, offset: {}", limit, offset);

        // 현재 사용자 ID 조회 (Mock)
        String userId = securityUtils.getCurrentUserId();

        // RankingService를 통해 랭킹 조회
        PersonalRankingResponse ranking = rankingService.getPersonalRanking(userId, limit, offset);

        // ApiResponse로 래핑하여 반환
        return ResponseEntity.ok(ApiResponse.success(ranking));
    }

    /**
     * 학교별 랭킹 조회
     *
     * GET /rankings/schools
     *
     * @param limit 조회할 학교 수 (default: 20)
     * @param offset 시작 위치 (default: 0)
     * @return ApiResponse<SchoolRankingResponse>
     */
    @Operation(
            summary = "학교별 랭킹 조회",
            description = "학교별 포인트 랭킹 Top N과 내 학교 랭킹을 조회합니다."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "학교 랭킹 조회 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = ApiResponse.class),
                            examples = @ExampleObject(value = """
                                    {
                                      "success": true,
                                      "data": {
                                        "topSchools": [
                                          {
                                            "schoolName": "Seoul High School",
                                            "totalPoints": 15000,
                                            "rank": 1,
                                            "memberCount": null
                                          }
                                        ],
                                        "mySchool": null
                                      }
                                    }
                                    """)
                    )
            )
    })
    @GetMapping("/schools")
    public ResponseEntity<ApiResponse<SchoolRankingResponse>> getSchoolRanking(
            @Parameter(description = "조회할 학교 수", example = "20")
            @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "시작 위치 (오프셋)", example = "0")
            @RequestParam(defaultValue = "0") int offset
    ) {
        log.info("학교별 랭킹 조회 요청 - limit: {}, offset: {}", limit, offset);

        // 현재 사용자 ID 조회
        String userId = securityUtils.getCurrentUserId();

        // 사용자의 학교 정보 조회
        String userSchool = userRepository.findByEmail(userId)
                .map(User::getSchoolName)
                .orElse(null);

        log.info("사용자 학교: {}", userSchool);

        // RankingService를 통해 랭킹 조회
        SchoolRankingResponse ranking = rankingService.getSchoolRanking(userSchool, limit, offset);

        // ApiResponse로 래핑하여 반환
        return ResponseEntity.ok(ApiResponse.success(ranking));
    }
}
