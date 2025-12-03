package com.picknic.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS 설정 (환경변수 기반)
 *
 * 프론트엔드에서 백엔드 API 호출을 허용하기 위한 설정
 * allowed.origins 환경변수에서 허용할 origin 목록을 읽어옴
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${allowed.origins}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(allowedOrigins.split(","))  // 환경변수에서 읽어온 origin 목록
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)  // 쿠키/인증 정보 허용
                .maxAge(3600); // Pre-flight 캐시 1시간
    }
}
