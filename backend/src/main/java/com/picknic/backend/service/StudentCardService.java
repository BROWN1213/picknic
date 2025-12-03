package com.picknic.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Service
@RequiredArgsConstructor
public class StudentCardService {

    @Value("${google.vision.api-key}")
    private String apiKey;
    /**
     * 학생증 인증 로직
     *
     * @param school_name 사용자가 선택한 학교 이름 (예: "한국고등학교")
     * @param file           업로드한 학생증 이미지
     * @return 인증 성공 여부 (true/false)
     */
    public boolean verifyStudent(String school_name,String student_name, MultipartFile file) throws IOException {

        // 1. 구글 Vision API로 텍스트 추출
        String ocrText = extractTextFromImage(file);
        // 2. 텍스트가 안 읽혔으면 실패
        if (ocrText == null || ocrText.isEmpty()) {
            System.out.println("OCR 실패: 텍스트를 찾을 수 없음");
            return false;
        }
        // 로그 확인용 (나중에 지우셔도 됩니다)
        System.out.println("--- [사용자 입력 학교명] : " + school_name);
        System.out.println("--- [사용자 이름] : " + student_name);
        System.out.println("--- [OCR 결과] ---\n" + ocrText + "\n------------------");


        // 3. 학교 이름 비교 (핵심 로직)
        // 공백을 다 없애고 비교합니다. (예: "한국 고등학교" == "한국고등학교")
        String cleanOcrText = ocrText.replace(" ", "");
        String cleanSchool = school_name.replace(" ", "");
        String cleanName = student_name.replace(" ", "");
        // 학생증 내용 안에 선택한 학교 이름이 포함되어 있는지 확인
        // 예: 학생증에 "한국고등학교 1학년..." 이라고 써있으면 통과
        if (cleanOcrText.contains(cleanSchool) && cleanOcrText.contains(cleanName)) {
            return true; // 인증 성공!
        } else {
            return false; // 인증 실패
        }
    }
    // cloud vision api
    private String extractTextFromImage(MultipartFile file){

        try {

            String url ="https://vision.googleapis.com/v1/images:annotate?key=" + apiKey;

            String base64Image = Base64.getEncoder().encodeToString(file.getBytes());
            Map<String, Object> imageContent = new HashMap<>();
            imageContent.put("content", base64Image);

            Map<String, Object> feature = new HashMap<>();
            feature.put("type", "TEXT_DETECTION");

            Map<String, Object> requestItem = new HashMap<>();
            requestItem.put("image", imageContent);
            requestItem.put("features", Collections.singletonList(feature));

            Map<String, Object> finalPayload = new HashMap<>();
            finalPayload.put("requests", Collections.singletonList(requestItem));

            // 4. 헤더 설정 (나는 JSON을 보낼 거야)
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // 5. 요청 전송 (RestTemplate 사용)
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(finalPayload, headers);
            RestTemplate restTemplate = new RestTemplate();

            // 결과 받기 (문자열로 받음)
            String response = restTemplate.postForObject(url, entity, String.class);

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(response);
            JsonNode responses = root.path("responses");

            if (responses.isArray() && !responses.isEmpty()) {
                JsonNode textAnnotations = responses.get(0).path("textAnnotations");
                // 0번째 요소가 전체 텍스트입니다.
                if (textAnnotations.isArray() && !textAnnotations.isEmpty()) {
                    return textAnnotations.get(0).path("description").asText();
                }
            }
            return null;

        } catch(Exception e) {
            System.err.println("Google API 호출 중 에러 발생: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }
}


