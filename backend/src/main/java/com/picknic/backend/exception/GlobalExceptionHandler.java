package com.picknic.backend.exception;

import com.picknic.backend.dto.common.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 전역 예외 처리 핸들러
 *
 * 모든 컨트롤러에서 발생하는 예외를 처리하여 일관된 에러 응답 제공
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * BadRequestException 처리
     * HTTP 400 Bad Request로 반환
     */
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse<ApiResponse.ErrorData>> handleBadRequestException(BadRequestException e) {
        log.warn("Bad request exception: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(e.getMessage()));
    }

    /**
     * IllegalStateException 처리
     * HTTP 400 Bad Request로 반환
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<ApiResponse.ErrorData>> handleIllegalStateException(IllegalStateException e) {
        log.warn("Illegal state exception: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(e.getMessage()));
    }

    /**
     * IllegalArgumentException 처리
     * HTTP 400 Bad Request로 반환
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<ApiResponse.ErrorData>> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn("Illegal argument exception: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(e.getMessage()));
    }

    /**
     * 기타 예외 처리
     * HTTP 500 Internal Server Error로 반환
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<ApiResponse.ErrorData>> handleException(Exception e) {
        log.error("Unexpected exception occurred", e);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("서버 오류가 발생했습니다."));
    }
}
