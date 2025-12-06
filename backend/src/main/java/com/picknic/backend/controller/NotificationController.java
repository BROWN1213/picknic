package com.picknic.backend.controller;

import com.picknic.backend.domain.Notification;
import com.picknic.backend.dto.common.ApiResponse;
import com.picknic.backend.service.NotificationService;
import com.picknic.backend.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 알림 관련 REST API 컨트롤러
 */
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final SecurityUtils securityUtils;

    /**
     * 내 알림 목록 조회
     */
    @GetMapping
    public ApiResponse<List<Notification>> getMyNotifications() {
        String userId = securityUtils.getCurrentUserId();
        List<Notification> notifications = notificationService.getMyNotifications(userId);
        return ApiResponse.success(notifications);
    }

    /**
     * 알림 읽음 처리
     */
    @PatchMapping("/{id}/read")
    public ApiResponse<String> markAsRead(@PathVariable Long id) {
        String userId = securityUtils.getCurrentUserId();
        notificationService.markAsRead(id, userId);
        return ApiResponse.success("알림이 읽음 처리되었습니다.");
    }
}
