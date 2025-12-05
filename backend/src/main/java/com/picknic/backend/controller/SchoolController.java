package com.picknic.backend.controller;

import com.picknic.backend.domain.School;
import com.picknic.backend.domain.SchoolRepository;
import com.picknic.backend.dto.school.SchoolDto;
import com.picknic.backend.service.NEISService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/schools")
@RequiredArgsConstructor
public class SchoolController {

    private final SchoolRepository schoolRepository;
    private final NEISService neisService;

    /**
     * [LEGACY] 학교 목록 조회 API (이름만 반환)
     * 고등학교 목록: GET /schools/type?type=HIGH
     * 중학교 목록: GET /schools/type?type=MIDDLE
     *
     * 이전 버전과의 호환성을 위해 유지됨
     */
    @GetMapping("/type")
    @Operation(summary = "학교 목록 조회 (레거시)", description = "타입별 학교 이름 목록 반환")
    public List<String> getSchoolList(
            @Parameter(description = "중/고등학교(HIGH: 고등학교/ MIDDLE: 중학교)",example = "HIGH")
            @RequestParam("type") String type
    ) {
        // DB에서 해당 타입(HIGH/MIDDLE)의 학교를 가나다순으로 다 가져옴
        List<School> schools = schoolRepository.findByTypeOrderByNameAsc(type);
        // 학교 정보(ID, 타입 등)는 필요 없고, '이름'만 뽑아서 리스트로 만듦
        return schools.stream()
                .map(School::getName)
                .collect(Collectors.toList());
    }

    /**
     * [NEW] 전체 학교 목록 조회 API (ID, 이름, 타입, 지역 포함)
     * GET /schools/all
     *
     * 프론트엔드에서 클라이언트 사이드 필터링을 위한 전체 학교 정보 제공
     */
    @GetMapping("/all")
    @Operation(
        summary = "전체 학교 목록 조회",
        description = "모든 학교의 ID, 이름, 타입, 지역 정보를 반환합니다. 프론트엔드에서 필터링에 사용됩니다.",
        responses = {
            @ApiResponse(responseCode = "200", description = "성공")
        }
    )
    public List<SchoolDto> getAllSchools() {
        List<School> schools = schoolRepository.findAllByOrderByNameAsc();
        return schools.stream()
                .map(SchoolDto::from)
                .collect(Collectors.toList());
    }

    /**
     * [ADMIN] 학교 데이터 수동 동기화
     * POST /schools/sync
     *
     * NEIS API에서 학교 데이터를 수동으로 동기화합니다.
     * 관리자용 엔드포인트 (인증 필요 시 SecurityConfig에서 설정)
     */
    @PostMapping("/sync")
    @Operation(
        summary = "학교 데이터 수동 동기화",
        description = "NEIS API에서 학교 데이터를 즉시 동기화합니다. 관리자용 기능입니다.",
        responses = {
            @ApiResponse(responseCode = "200", description = "동기화 성공"),
            @ApiResponse(responseCode = "500", description = "동기화 실패")
        }
    )
    public Map<String, Object> manualSync() {
        try {
            neisService.syncSchools();
            long count = schoolRepository.count();
            return Map.of(
                "success", true,
                "message", "School data synced successfully",
                "totalSchools", count
            );
        } catch (Exception e) {
            return Map.of(
                "success", false,
                "message", "Sync failed: " + e.getMessage()
            );
        }
    }
}