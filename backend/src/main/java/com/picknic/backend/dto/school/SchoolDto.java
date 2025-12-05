package com.picknic.backend.dto.school;

import com.picknic.backend.domain.School;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SchoolDto {
    private Long id;
    private String name;
    private String type;
    private String region;

    public static SchoolDto from(School school) {
        return SchoolDto.builder()
                .id(school.getId())
                .name(school.getName())
                .type(school.getType())
                .region(school.getRegion())
                .build();
    }
}
