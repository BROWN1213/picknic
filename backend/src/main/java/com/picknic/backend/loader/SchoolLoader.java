package com.picknic.backend.loader;

import com.picknic.backend.domain.SchoolRepository;
import com.picknic.backend.service.NEISService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SchoolLoader implements CommandLineRunner {

    private final SchoolRepository schoolRepository;
    private final NEISService neisService;

    /**
     * 서버가 시작되면 이 run 함수가 자동으로 딱 한 번 실행됩니다.
     * DB에 학교 데이터가 없으면 NEIS API에서 가져옵니다.
     */
    @Override
    public void run(String... args) throws Exception {

        // 1. DB에 데이터가 이미 있는지 검사 (있으면 로딩 안 함)
        long existingCount = schoolRepository.count();
        if (existingCount > 0) {
            log.info("School data already exists ({} schools), skipping initial load", existingCount);
            return;
        }

        // 2. DB가 비어있으면 NEISService를 통해 동기화
        // NEISService가 자동으로 NEIS API를 시도하고 실패 시 JSON 파일을 사용합니다
        log.info("No school data found, performing initial sync...");
        neisService.syncSchools();

        long finalCount = schoolRepository.count();
        log.info("Initial school data load completed: {} schools", finalCount);
    }
}