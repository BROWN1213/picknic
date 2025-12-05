package com.picknic.backend.dto.vote;

import com.picknic.backend.domain.Vote;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
@AllArgsConstructor
public class VoteResultResponse {
    private Long id;
    private String title;
    private Integer totalVotes;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private Boolean isActive;
    private String category;
    private String schoolName;
    private List<VoteOptionResponse> options;
    private VoteOptionResponse winningOption;  // 1등 선택지
    private VoteAnalysisDto analysis;  // 투표 분석 데이터

    public static VoteResultResponse from(Vote vote, VoteAnalysisDto analysis) {
        List<VoteOptionResponse> optionResponses = vote.getOptions().stream()
                .map(option -> VoteOptionResponse.from(option, vote.getTotalVotes()))
                .collect(Collectors.toList());

        // 1등 찾기
        VoteOptionResponse winner = optionResponses.stream()
                .max((o1, o2) -> Integer.compare(o1.getVoteCount(), o2.getVoteCount()))
                .orElse(null);

        return VoteResultResponse.builder()
                .id(vote.getId())
                .title(vote.getTitle())
                .totalVotes(vote.getTotalVotes())
                .createdAt(vote.getCreatedAt())
                .expiresAt(vote.getExpiresAt())
                .isActive(vote.getIsActive())
                .category(vote.getCategory())
                .schoolName(vote.getSchoolName())
                .options(optionResponses)
                .winningOption(winner)
                .analysis(analysis)
                .build();
    }
}