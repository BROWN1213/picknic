package com.picknic.backend.dto.vote;

import com.picknic.backend.domain.Vote;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
@AllArgsConstructor
public class VoteResponse {
    private Long id;
    private String title;
    private String description;
    private String imageUrl;
    private String creatorId;
    private String creatorName;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private Boolean isActive;
    private Integer totalVotes;
    private List<VoteOptionResponse> options;
    private Boolean hasVoted;  // 현재 사용자가 투표했는지
    private Long userSelectedOptionId;  // 사용자가 선택한 옵션
    private String type;  // 투표 타입 (balance, multiple, ox)
    private String category;  // 카테고리
    private String schoolName;  // 학교명
    private String timeLeft;  // 남은 시간 (예: "23시간 남음", "30분 남음")
    private String status;  // 투표 상태 (active, closed, expired)

    public static VoteResponse from(Vote vote, boolean hasVoted, Long selectedOptionId) {
        List<VoteOptionResponse> optionResponses = vote.getOptions().stream()
                .map(option -> VoteOptionResponse.from(option, vote.getTotalVotes()))
                .collect(Collectors.toList());

        // Determine vote type based on options
        String type = determineVoteType(vote);

        // Calculate time left
        String timeLeft = calculateTimeLeft(vote.getExpiresAt());

        // Calculate status
        String status = calculateStatus(vote);

        return VoteResponse.builder()
                .id(vote.getId())
                .title(vote.getTitle())
                .description(vote.getDescription())
                .imageUrl(vote.getImageUrl())
                .creatorId(vote.getCreatorId())
                .creatorName("User_" + vote.getCreatorId())  // Mock
                .createdAt(vote.getCreatedAt())
                .expiresAt(vote.getExpiresAt())
                .isActive(vote.getIsActive())
                .totalVotes(vote.getTotalVotes())
                .options(optionResponses)
                .hasVoted(hasVoted)
                .userSelectedOptionId(selectedOptionId)
                .type(type)
                .category(vote.getCategory())
                .schoolName(vote.getSchoolName())
                .timeLeft(timeLeft)
                .status(status)
                .build();
    }

    private static String calculateTimeLeft(LocalDateTime expiresAt) {
        if (expiresAt == null) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now();
        if (expiresAt.isBefore(now)) {
            return "마감됨";
        }

        Duration duration = Duration.between(now, expiresAt);
        long hours = duration.toHours();
        long minutes = duration.toMinutes();
        long days = duration.toDays();

        if (days >= 1) {
            return days + "일 남음";
        } else if (hours >= 1) {
            return hours + "시간 남음";
        } else if (minutes >= 1) {
            return minutes + "분 남음";
        } else {
            return "곧 마감";
        }
    }

    private static String determineVoteType(Vote vote) {
        if (vote.getOptions().size() == 2) {
            // Check if it's an O/X vote by examining option texts
            List<String> optionTexts = vote.getOptions().stream()
                    .map(option -> option.getOptionText().trim())
                    .collect(Collectors.toList());

            // If options are exactly "O" and "X", it's an ox vote
            if (optionTexts.contains("O") && optionTexts.contains("X")) {
                return "ox";
            }
            return "balance";
        }
        return "multiple";
    }

    private static String calculateStatus(Vote vote) {
        // Check if vote is manually closed
        if (!vote.getIsActive()) {
            return "closed";
        }

        // Check if vote has expired
        if (vote.getExpiresAt() != null && vote.getExpiresAt().isBefore(LocalDateTime.now())) {
            return "expired";
        }

        // Vote is active
        return "active";
    }
}