package com.picknic.backend.dto.vote;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class CreateVoteRequest {

    @NotBlank(message = "제목은 필수입니다")
    private String title;

    private String description;

    private String imageUrl;

    private String category;

    @NotNull(message = "선택지는 필수입니다")
    @Size(min = 2, max = 10, message = "선택지는 2개 이상 10개 이하여야 합니다")
    private List<String> options;

    private LocalDateTime expiresAt;  // 선택적 마감일
}