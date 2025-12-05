package com.picknic.backend.dto.common;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 공통 API 응답 래퍼
 *
 * API 명세(api_spec.md)에 따라 모든 응답은 다음 형식을 따릅니다:
 * {
 *   "success": true,
 *   "data": { ... }
 * }
 *
 * @param <T> 응답 데이터 타입
 */
@Getter
@AllArgsConstructor
public class ApiResponse<T> {

    /**
     * 요청 성공 여부
     */
    private boolean success;

    /**
     * 실제 응답 데이터
     */
    private T data;

    /**
     * 성공 응답 생성 헬퍼 메서드
     *
     * @param data 응답 데이터
     * @param <T> 응답 데이터 타입
     * @return ApiResponse 객체
     */
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data);
    }

    /**
     * 실패 응답 생성 헬퍼 메서드
     *
     * @param message 에러 메시지
     * @return ApiResponse 객체
     */
    public static ApiResponse<ErrorData> error(String message) {
        return new ApiResponse<>(false, new ErrorData(message));
    }

    /**
     * 에러 데이터 클래스
     */
    @Getter
    @AllArgsConstructor
    public static class ErrorData {
        private String message;
    }
}
