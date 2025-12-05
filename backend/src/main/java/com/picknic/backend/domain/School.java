package com.picknic.backend.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter @Setter
@NoArgsConstructor
public class School {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name; // 학교 이름
    private String type; // "HIGH"(고등) or "MIDDLE"(중등)
    private String region; // 지역 (예: 서울특별시, 경기도)
    private String address; // 도로명 주소
    private LocalDateTime lastUpdated; // 마지막 업데이트 시간

    public School(String name, String type) {
        this.name = name;
        this.type = type;
    }

    public School(String name, String type, String region, String address) {
        this.name = name;
        this.type = type;
        this.region = region;
        this.address = address;
        this.lastUpdated = LocalDateTime.now();
    }
}