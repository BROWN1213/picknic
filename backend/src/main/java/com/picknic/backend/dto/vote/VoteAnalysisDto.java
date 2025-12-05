package com.picknic.backend.dto.vote;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoteAnalysisDto {
    private String mostParticipatedAgeGroup; // e.g., "19세 여성"
    private int mostParticipatedPercentage; // e.g., 35
    private Map<String, Integer> genderStats; // e.g., {"여성": 65, "남성": 35}
    private List<AgeGroupStat> ageGroupStats;
    private List<String> relatedInterests; // e.g., ["아이돌", "패션"]
    private String funFact; // e.g., "이 투표는 지금 진행 중이며..."
    private List<OptionAnalysis> optionAnalyses; // 선택지별 분석

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgeGroupStat {
        private String label; // e.g., "16세 여성"
        private int percentage; // e.g., 18
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptionAnalysis {
        private Long optionId;
        private String optionText;
        private Map<String, Integer> genderStats; // e.g., {"남성": 60, "여성": 40}
        private List<String> topInterests; // e.g., ["게임", "축구", "음악"]
    }
}
