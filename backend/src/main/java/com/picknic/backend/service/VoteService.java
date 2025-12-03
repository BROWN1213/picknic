package com.picknic.backend.service;

import com.picknic.backend.domain.PointType;
import com.picknic.backend.domain.Vote;
import com.picknic.backend.domain.VoteOption;
import com.picknic.backend.domain.VoteRecord;
import com.picknic.backend.dto.vote.CastVoteRequest;
import com.picknic.backend.dto.vote.CreateVoteRequest;
import com.picknic.backend.dto.vote.VoteResponse;
import com.picknic.backend.dto.vote.VoteResultResponse;
import com.picknic.backend.event.VoteCompletedEvent;
import com.picknic.backend.repository.VoteOptionRepository;
import com.picknic.backend.repository.VoteRecordRepository;
import com.picknic.backend.repository.VoteRepository;
import com.picknic.backend.util.RedisUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class VoteService {

    private final VoteRepository voteRepository;
    private final VoteOptionRepository voteOptionRepository;
    private final VoteRecordRepository voteRecordRepository;
    private final RedisUtil redisUtil;
    private final ApplicationEventPublisher eventPublisher;

    // 투표 생성
    public VoteResponse createVote(CreateVoteRequest request, String userId) {


        // 1. Vote 엔티티 생성
        Vote vote = Vote.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .creatorId(userId)
                .expiresAt(request.getExpiresAt())
                .build();

        // 2. 옵션 추가
        for (String optionText : request.getOptions()) {
            VoteOption option = VoteOption.builder()
                    .optionText(optionText)
                    .build();
            vote.addOption(option);
        }

        // 3. 저장
        Vote savedVote = voteRepository.save(vote);

        // 4. 포인트 적립 이벤트 발행 (+10P)
        eventPublisher.publishEvent(new VoteCompletedEvent(
                this,
                userId,
                savedVote.getId(),
                PointType.CREATE,
                10,
                null // schoolName (향후 사용자 정보에서 가져올 수 있음)
        ));

        // 5. 응답 생성
        return VoteResponse.from(savedVote, false, null);
    }

    // 투표하기
    public VoteResponse castVote(Long voteId, CastVoteRequest request, String userId) {
        // 1. 일일 투표 제한 체크 (20회)
        /*String limitKey = "limit:VOTE:" + LocalDate.now() + ":" + userId;
        Long todayVotes = redisUtil.increment(limitKey);

        if (todayVotes == 1) {
            redisUtil.setExpire(limitKey, Duration.ofDays(1));
        }

        if (todayVotes > 20) {
            throw new IllegalStateException("일일 투표 제한(20회)을 초과했습니다.");
        }*/

        // 2. 투표 존재 확인
        Vote vote = voteRepository.findById(voteId)
                .orElseThrow(() -> new IllegalArgumentException("투표를 찾을 수 없습니다."));

        // 3. 투표 활성 상태 확인
        if (!vote.getIsActive()) {
            throw new IllegalStateException("종료된 투표입니다.");
        }

        // 4. 마감 시간 확인
        if (vote.getExpiresAt() != null && vote.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("마감된 투표입니다.");
        }

        // 5. 중복 투표 확인
        if (voteRecordRepository.existsByVoteIdAndUserId(voteId, userId)) {
            throw new IllegalStateException("이미 투표한 항목입니다.");
        }

        // 6. 옵션 유효성 확인
        VoteOption option = voteOptionRepository.findById(request.getOptionId())
                .orElseThrow(() -> new IllegalArgumentException("선택지를 찾을 수 없습니다."));

        if (!option.getVote().getId().equals(voteId)) {
            throw new IllegalArgumentException("잘못된 선택지입니다.");
        }

        // 7. 투표 기록 저장
        VoteRecord record = VoteRecord.builder()
                .voteId(voteId)
                .userId(userId)
                .selectedOptionId(request.getOptionId())
                .build();
        voteRecordRepository.save(record);

        // 8. 투표 수 증가
        option.incrementVoteCount();
        vote.incrementTotalVotes();

        // 9. 포인트 적립 이벤트 발행 (+1P)
        eventPublisher.publishEvent(new VoteCompletedEvent(
                this,
                userId,
                voteId,
                PointType.VOTE,
                1,
                null // schoolName (향후 사용자 정보에서 가져올 수 있음)
        ));

        // 10. 응답 생성
        return VoteResponse.from(vote, true, request.getOptionId());
    }

    @Transactional(readOnly = true)
    public List<VoteResponse> getVotes(String userId, String status, String creatorId) {
        List<Vote> votes;

        if (creatorId != null) {
            votes = voteRepository.findByCreatorIdOrderByCreatedAtDesc(creatorId);
        } else if ("active".equals(status)) {
            votes = voteRepository.findActiveVotes(LocalDateTime.now());
        } else if ("closed".equals(status)) {
            votes = voteRepository.findByIsActiveFalseOrderByCreatedAtDesc();
        } else {
            votes = voteRepository.findAllByOrderByCreatedAtDesc();
        }

        return votes.stream()
                .map(vote -> {
                    VoteRecord record = voteRecordRepository
                            .findByVoteIdAndUserId(vote.getId(), userId)
                            .orElse(null);

                    boolean hasVoted = record != null;
                    Long selectedOptionId = hasVoted ? record.getSelectedOptionId() : null;

                    return VoteResponse.from(vote, hasVoted, selectedOptionId);
                })
                .collect(Collectors.toList());
    }

    // 활성 투표 목록 조회
//    @Transactional(readOnly = true)
//    public List<VoteResponse> getActiveVotes(String userId) {
//        List<Vote> votes = voteRepository.findActiveVotes(LocalDateTime.now());
//
//        return votes.stream()
//                .map(vote -> {
//                    VoteRecord record = voteRecordRepository
//                            .findByVoteIdAndUserId(vote.getId(), userId)
//                            .orElse(null);
//
//                    boolean hasVoted = record != null;
//                    Long selectedOptionId = hasVoted ? record.getSelectedOptionId() : null;
//
//                    return VoteResponse.from(vote, hasVoted, selectedOptionId);
//                })
//                .collect(Collectors.toList());
//    }

    // 투표 상세 조회
    @Transactional(readOnly = true)
    public VoteResponse getVote(Long voteId, String userId) {
        Vote vote = voteRepository.findById(voteId)
                .orElseThrow(() -> new IllegalArgumentException("투표를 찾을 수 없습니다."));

        VoteRecord record = voteRecordRepository
                .findByVoteIdAndUserId(voteId, userId)
                .orElse(null);

        boolean hasVoted = record != null;
        Long selectedOptionId = hasVoted ? record.getSelectedOptionId() : null;

        return VoteResponse.from(vote, hasVoted, selectedOptionId);
    }

    // 투표 수정 (본인만 가능)
    public VoteResponse updateVote(Long voteId, CreateVoteRequest request, String userId) {
        Vote vote = voteRepository.findById(voteId)
                .orElseThrow(() -> new IllegalArgumentException("투표를 찾을 수 없습니다."));

        // 본인 확인
        if (!vote.getCreatorId().equals(userId)) {
            throw new IllegalStateException("투표 작성자만 수정할 수 있습니다.");
        }

        // 이미 투표가 진행 중이면 수정 불가
        if (vote.getTotalVotes() > 0) {
            throw new IllegalStateException("이미 투표가 진행 중인 경우 수정할 수 없습니다.");
        }

        // 제목, 설명, 마감일만 수정 (선택지는 불변)
        vote.updateInfo(request.getTitle(), request.getDescription(), request.getExpiresAt());

        return VoteResponse.from(vote, false, null);
    }

    // 투표 삭제 (본인만 가능)
    public void deleteVote(Long voteId, String userId) {
        Vote vote = voteRepository.findById(voteId)
                .orElseThrow(() -> new IllegalArgumentException("투표를 찾을 수 없습니다."));

        // 본인 확인
        if (!vote.getCreatorId().equals(userId)) {
            throw new IllegalStateException("투표 작성자만 삭제할 수 있습니다.");
        }

        voteRepository.delete(vote);
    }

    // 투표 조기 마감 (본인만 가능)
    public VoteResponse closeVote(Long voteId, String userId) {
        Vote vote = voteRepository.findById(voteId)
                .orElseThrow(() -> new IllegalArgumentException("투표를 찾을 수 없습니다."));

        // 본인 확인
        if (!vote.getCreatorId().equals(userId)) {
            throw new IllegalStateException("투표 작성자만 마감할 수 있습니다.");
        }

        vote.close();

        return VoteResponse.from(vote, false, null);
    }

    // 내가 만든 투표 목록
    @Transactional(readOnly = true)
    public List<VoteResponse> getMyVotes(String userId) {
        List<Vote> votes = voteRepository.findByCreatorIdOrderByCreatedAtDesc(userId);

        return votes.stream()
                .map(vote -> {
                    VoteRecord record = voteRecordRepository
                            .findByVoteIdAndUserId(vote.getId(), userId)
                            .orElse(null);

                    boolean hasVoted = record != null;
                    Long selectedOptionId = hasVoted ? record.getSelectedOptionId() : null;

                    return VoteResponse.from(vote, hasVoted, selectedOptionId);
                })
                .collect(Collectors.toList());
    }

    // 내가 참여한 투표 목록
    @Transactional(readOnly = true)
    public List<VoteResponse> getParticipatedVotes(String userId) {
        List<VoteRecord> records = voteRecordRepository.findByUserIdOrderByVotedAtDesc(userId);

        return records.stream()
                .map(record -> {
                    Vote vote = voteRepository.findById(record.getVoteId())
                            .orElse(null);
                    if (vote == null) return null;

                    return VoteResponse.from(vote, true, record.getSelectedOptionId());
                })
                .filter(response -> response != null)
                .collect(Collectors.toList());
    }

    // 투표 결과 조회
    @Transactional(readOnly = true)
    public VoteResultResponse getVoteResults(Long voteId) {
        Vote vote = voteRepository.findById(voteId)
                .orElseThrow(() -> new IllegalArgumentException("투표를 찾을 수 없습니다."));

        return VoteResultResponse.from(vote);
    }
}