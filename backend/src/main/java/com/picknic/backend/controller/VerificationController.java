package com.picknic.backend.controller;

import com.picknic.backend.service.StudentCardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
@RestController
@RequestMapping("/api/school-auth")
@RequiredArgsConstructor

public class VerificationController {

    private final StudentCardService studentCardService;

    // 스웨거에서 파일 업로드 테스트를 하려면 consumes 설정을 해줘야 함
    @PostMapping(value = "/verify", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> verify(
            @RequestParam("schoolName") String schoolName,
            @RequestParam("studentName") String studentName,
            @RequestParam("image") MultipartFile image
    ) {
        Map<String, Object> response = new HashMap<>();

        try {
            // 1. 서비스에게 "이거 확인해줘"라고 시킴
            boolean isSuccess = studentCardService.verifyStudent(schoolName,studentName ,image);
            String cleanName = studentName.replace(" ", "");

            // 2. 결과에 따라 성공/실패 메시지 작성
            if (isSuccess) {
                response.put("status", "success");
                response.put("message", "인증 성공! (" + schoolName+"  "+cleanName + ")");
                return ResponseEntity.ok(response);
            } else {
                response.put("status", "fail");
                response.put("message", "인증 실패: 학생증내에 학교명 또는 이름을 찾을 수 없습니다.");
                return ResponseEntity.ok(response);
            }

        } catch (Exception e) {
            // 에러가 나면 콘솔에 출력하고 500 에러 반환
            e.printStackTrace();
            response.put("status", "error");
            response.put("message", "서버 에러: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
