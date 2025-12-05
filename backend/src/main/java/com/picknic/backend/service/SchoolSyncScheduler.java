package com.picknic.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class SchoolSyncScheduler {

    private final NEISService neisService;

    /**
     * 매일 새벽 3시에 학교 데이터 자동 동기화
     * Runs daily at 3:00 AM KST (low traffic time)
     * Cron: second minute hour day month weekday
     * "0 0 3 * * *" = 매일 3시 0분 0초
     */
    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Seoul")
    public void scheduledSchoolSync() {
        log.info("========================================");
        log.info("Starting scheduled school sync at {}", LocalDateTime.now());
        log.info("========================================");

        try {
            neisService.syncSchools();
            log.info("========================================");
            log.info("Scheduled school sync completed successfully at {}", LocalDateTime.now());
            log.info("========================================");
        } catch (Exception e) {
            log.error("========================================");
            log.error("Scheduled school sync failed at {}: {}", LocalDateTime.now(), e.getMessage(), e);
            log.error("========================================");
            // Don't throw - let scheduler continue running
        }
    }

    /**
     * 수동 동기화 메서드 (SchoolController에서 호출)
     * Manual sync method (called from SchoolController)
     */
    public void manualSync() {
        log.info("Manual school sync triggered at {}", LocalDateTime.now());
        neisService.syncSchools();
    }
}
