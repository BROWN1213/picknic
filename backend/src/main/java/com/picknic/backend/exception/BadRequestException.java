package com.picknic.backend.exception;

/**
 * 잘못된 요청 예외
 *
 * HTTP 400 Bad Request로 반환될 예외
 */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }

    public BadRequestException(String message, Throwable cause) {
        super(message, cause);
    }
}
