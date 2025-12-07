package com.picknic.backend.service;

import com.picknic.backend.domain.PointType;
import com.picknic.backend.domain.Vote;
import com.picknic.backend.domain.VoteOption;
import com.picknic.backend.domain.VoteRecord;
import com.picknic.backend.dto.vote.CastVoteRequest;
import com.picknic.backend.dto.vote.CreateVoteRequest;
import com.picknic.backend.dto.vote.VoteAnalysisDto;
import com.picknic.backend.dto.vote.VoteResponse;
import com.picknic.backend.dto.vote.VoteResultResponse;
import com.picknic.backend.entity.User;
import com.picknic.backend.event.HotVoteEvent;
import com.picknic.backend.event.VoteCompletedEvent;
import com.picknic.backend.repository.UserRepository;
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
import java.time.Year;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class VoteService {

    private final VoteRepository voteRepository;
    private final VoteOptionRepository voteOptionRepository;
    private final VoteRecordRepository voteRecordRepository;
    private final UserRepository userRepository;
    private final RedisUtil redisUtil;
    private final ApplicationEventPublisher eventPublisher;

    // 투표 생성
    public VoteResponse createVote(CreateVoteRequest request, String userId) {

        // 1. 사용자 학교 정보 조회
        String schoolName = userRepository.findByEmail(userId)
                .map(User::getSchoolName)
                .orElse(null);

        // 2. Vote 엔티티 생성 (expiresAt이 null이면 자동으로 24시간 후로 설정)
        LocalDateTime expiresAt = request.getExpiresAt() != null
                ? request.getExpiresAt()
                : LocalDateTime.now().plusHours(24);

        Vote vote = Vote.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .imageUrl(request.getImageUrl())
                .category(request.getCategory())
                .creatorId(userId)
                .schoolName(schoolName)
                .expiresAt(expiresAt)
                .build();

        // 3. 옵션 추가
        for (String optionText : request.getOptions()) {
            VoteOption option = VoteOption.builder()
                    .optionText(optionText)
                    .build();
            vote.addOption(option);
        }

        // 4. 저장
        Vote savedVote = voteRepository.save(vote);

        // 5. 포인트 적립 이벤트 발행 (+10P)
        eventPublisher.publishEvent(new VoteCompletedEvent(
                this,
                userId,
                savedVote.getId(),
                PointType.CREATE,
                10,
                schoolName
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

        // 2. 투표 존재 확인 (with options to avoid N+1)
        Vote vote = voteRepository.findByIdWithOptions(voteId)
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

        // 9. 사용자 학교 정보 조회
        String schoolName = userRepository.findByEmail(userId)
                .map(User::getSchoolName)
                .orElse(null);

        // 10. 포인트 적립 이벤트 발행 (+1P)
        eventPublisher.publishEvent(new VoteCompletedEvent(
                this,
                userId,
                voteId,
                PointType.VOTE,
                1,
                schoolName
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

        // FIX N+1 QUERY: Batch load all vote records for this user in a single query
        List<Long> voteIds = votes.stream()
                .map(Vote::getId)
                .collect(Collectors.toList());

        Map<Long, VoteRecord> userVoteRecordMap = voteRecordRepository
                .findByUserIdAndVoteIdIn(userId, voteIds)
                .stream()
                .collect(Collectors.toMap(VoteRecord::getVoteId, record -> record));

        return votes.stream()
                .map(vote -> {
                    VoteRecord record = userVoteRecordMap.get(vote.getId());
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
        Vote vote = voteRepository.findByIdWithOptions(voteId)
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
        Vote vote = voteRepository.findByIdWithOptions(voteId)
                .orElseThrow(() -> new IllegalArgumentException("투표를 찾을 수 없습니다."));

        // 본인 확인
        if (!vote.getCreatorId().equals(userId)) {
            throw new IllegalStateException("투표 작성자만 수정할 수 있습니다.");
        }

        // 이미 투표가 진행 중이면 수정 불가
        if (vote.getTotalVotes() > 0) {
            throw new IllegalStateException("이미 투표가 진행 중인 경우 수정할 수 없습니다.");
        }

        // 제목, 설명, 카테고리, 마감일, 이미지 수정 (선택지는 불변)
        vote.updateInfo(request.getTitle(), request.getDescription(), request.getCategory(), request.getExpiresAt(), request.getImageUrl());

        return VoteResponse.from(vote, false, null);
    }

    // 투표 삭제 (작성자 또는 시스템 계정만 가능)
    public void deleteVote(Long voteId, String userId) {
        Vote vote = voteRepository.findByIdWithOptions(voteId)
                .orElseThrow(() -> new IllegalArgumentException("투표를 찾을 수 없습니다."));

        // Check if user is creator or system account
        User user = userRepository.findByEmail(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        boolean isCreator = vote.getCreatorId().equals(userId);
        boolean isSystemAccount = user.getIsSystemAccount();

        if (!isCreator && !isSystemAccount) {
            throw new IllegalStateException("투표 작성자 또는 시스템 계정만 삭제할 수 있습니다.");
        }

        voteRepository.delete(vote);
    }

    // 투표 조기 마감 (본인만 가능)
    public VoteResponse closeVote(Long voteId, String userId) {
        Vote vote = voteRepository.findByIdWithOptions(voteId)
                .orElseThrow(() -> new IllegalArgumentException("투표를 찾을 수 없습니다."));

        // 본인 확인
        if (!vote.getCreatorId().equals(userId)) {
            throw new IllegalStateException("투표 작성자만 마감할 수 있습니다.");
        }

        vote.close();

        return VoteResponse.from(vote, false, null);
    }

    // Hot 투표 상태 토글 (시스템 계정만 가능)
    public VoteResponse toggleHotStatus(Long voteId, String userId) {
        // 1. 투표 조회
        Vote vote = voteRepository.findByIdWithOptions(voteId)
                .orElseThrow(() -> new IllegalArgumentException("투표를 찾을 수 없습니다."));

        // 2. 시스템 계정 확인
        User user = userRepository.findByEmail(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (!user.getIsSystemAccount()) {
            throw new IllegalStateException("시스템 계정만 HOT 투표를 지정할 수 있습니다.");
        }

        // 3. Hot 상태 토글
        boolean newHotStatus = !vote.getIsHot();
        if (newHotStatus) {
            vote.markAsHot();
        } else {
            vote.unmarkAsHot();
        }

        // 4. Hot으로 마킹된 경우에만 이벤트 발행 (알림 발송)
        if (newHotStatus) {
            eventPublisher.publishEvent(new HotVoteEvent(
                    this,
                    vote.getId(),
                    vote.getTitle(),
                    vote.getCategory(),
                    true
            ));
        }

        // 5. 응답 반환
        return VoteResponse.from(vote, false, null);
    }

    // 내가 만든 투표 목록
    @Transactional(readOnly = true)
    public List<VoteResponse> getMyVotes(String userId) {
        List<Vote> votes = voteRepository.findByCreatorIdOrderByCreatedAtDesc(userId);

        // FIX N+1 QUERY: Batch load all vote records
        List<Long> voteIds = votes.stream()
                .map(Vote::getId)
                .collect(Collectors.toList());

        Map<Long, VoteRecord> userVoteRecordMap = voteRecordRepository
                .findByUserIdAndVoteIdIn(userId, voteIds)
                .stream()
                .collect(Collectors.toMap(VoteRecord::getVoteId, record -> record));

        return votes.stream()
                .map(vote -> {
                    VoteRecord record = userVoteRecordMap.get(vote.getId());
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

        // FIX N+1 QUERY: Batch load all votes
        List<Long> voteIds = records.stream()
                .map(VoteRecord::getVoteId)
                .distinct()
                .collect(Collectors.toList());

        Map<Long, Vote> voteMap = voteRepository.findAllById(voteIds)
                .stream()
                .collect(Collectors.toMap(Vote::getId, vote -> vote));

        return records.stream()
                .map(record -> {
                    Vote vote = voteMap.get(record.getVoteId());
                    if (vote == null) return null;

                    return VoteResponse.from(vote, true, record.getSelectedOptionId());
                })
                .filter(response -> response != null)
                .collect(Collectors.toList());
    }

    // 투표 결과 조회
    @Transactional(readOnly = true)
    public VoteResultResponse getVoteResults(Long voteId) {
        Vote vote = voteRepository.findByIdWithOptions(voteId)
                .orElseThrow(() -> new IllegalArgumentException("투표를 찾을 수 없습니다."));

        // 실제 투표 참여 데이터 기반 분석 생성
        VoteAnalysisDto analysis = generateVoteAnalysis(vote);

        return VoteResultResponse.from(vote, analysis);
    }

    // 실제 투표 참여 데이터 기반 분석 생성
    private VoteAnalysisDto generateVoteAnalysis(Vote vote) {
        // 1. 투표 참여자 조회
        List<VoteRecord> records = voteRecordRepository.findByVoteId(vote.getId());

        if (records.isEmpty()) {
            // 참여자가 없을 경우 기본 메시지 반환
            return VoteAnalysisDto.builder()
                    .mostParticipatedAgeGroup("데이터 없음")
                    .mostParticipatedPercentage(0)
                    .genderStats(Map.of())
                    .ageGroupStats(List.of())
                    .relatedInterests(List.of())
                    .funFact("아직 참여자가 없습니다. 첫 투표를 해보세요!")
                    .build();
        }

        // 2. 참여자 ID 목록 (email) - Set으로 중복 제거
        List<String> participantEmails = records.stream()
                .map(VoteRecord::getUserId)
                .distinct()
                .collect(Collectors.toList());

        // 3. 참여자 정보 조회 (2007~2012년생만 필터링)
        // OPTIMIZATION: Batch query is already optimal, but we filter early to reduce memory
        List<User> participants = userRepository.findAllByEmailIn(participantEmails).stream()
                .filter(user -> user.getBirthYear() != null
                        && user.getBirthYear() >= 2007
                        && user.getBirthYear() <= 2012)
                .collect(Collectors.toList());

        if (participants.isEmpty()) {
            return VoteAnalysisDto.builder()
                    .mostParticipatedAgeGroup("데이터 없음")
                    .mostParticipatedPercentage(0)
                    .genderStats(Map.of())
                    .ageGroupStats(List.of())
                    .relatedInterests(List.of())
                    .funFact("참여자 연령대 정보가 충분하지 않습니다.")
                    .build();
        }

        int totalParticipants = participants.size();

        // 4. 나이 그룹별 통계 (birthYear + gender)
        int currentYear = Year.now().getValue();
        Map<String, Long> ageGroupCounts = participants.stream()
                .filter(user -> user.getBirthYear() != null && user.getGender() != null)
                .collect(Collectors.groupingBy(
                        user -> {
                            int age = currentYear - user.getBirthYear();
                            String genderLabel = "MALE".equals(user.getGender()) ? "남성" : "여성";
                            return age + "세 " + genderLabel;
                        },
                        Collectors.counting()
                ));

        // 5. 나이 그룹별 퍼센티지 계산 및 정렬
        List<VoteAnalysisDto.AgeGroupStat> ageGroupStats = ageGroupCounts.entrySet().stream()
                .map(entry -> VoteAnalysisDto.AgeGroupStat.builder()
                        .label(entry.getKey())
                        .percentage((int) Math.round(entry.getValue() * 100.0 / totalParticipants))
                        .build())
                .sorted((a, b) -> Integer.compare(b.getPercentage(), a.getPercentage()))
                .limit(5)
                .collect(Collectors.toList());

        // 6. 가장 많은 나이 그룹 찾기
        String mostParticipatedAgeGroup = ageGroupStats.isEmpty() ? "데이터 없음" : ageGroupStats.get(0).getLabel();
        int mostParticipatedPercentage = ageGroupStats.isEmpty() ? 0 : ageGroupStats.get(0).getPercentage();

        // 7. 성별 통계
        Map<String, Long> genderCounts = participants.stream()
                .filter(user -> user.getGender() != null)
                .collect(Collectors.groupingBy(
                        user -> "MALE".equals(user.getGender()) ? "남성" : "여성",
                        Collectors.counting()
                ));

        Map<String, Integer> genderStats = genderCounts.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> (int) Math.round(entry.getValue() * 100.0 / totalParticipants)
                ));

        // 8. 관심사 통계 (가장 많은 관심사 Top 5)
        Map<String, Long> interestCounts = new HashMap<>();
        participants.stream()
                .filter(user -> user.getInterests() != null)
                .flatMap(user -> user.getInterests().stream())
                .forEach(interest -> interestCounts.merge(interest, 1L, Long::sum));

        List<String> relatedInterests = interestCounts.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(5)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        // 9. 재미있는 사실 생성
        String funFact = generateFunFact(vote, participants, genderStats, mostParticipatedAgeGroup);

        // 10. 선택지별 분석 (각 선택지를 선택한 사람들의 성별 분포 및 관심사)
        // OPTIMIZATION: Build lookup maps once instead of filtering repeatedly
        List<VoteAnalysisDto.OptionAnalysis> optionAnalyses = new ArrayList<>();
        Map<String, User> userMap = participants.stream()
                .collect(Collectors.toMap(User::getEmail, user -> user));

        // Group records by option for efficient processing
        Map<Long, List<VoteRecord>> recordsByOption = records.stream()
                .filter(record -> userMap.containsKey(record.getUserId()))
                .collect(Collectors.groupingBy(VoteRecord::getSelectedOptionId));

        for (VoteOption option : vote.getOptions()) {
            List<VoteRecord> optionRecords = recordsByOption.getOrDefault(option.getId(), List.of());

            if (optionRecords.isEmpty()) {
                continue; // 참여자가 없으면 스킵
            }

            // 해당 선택지를 선택한 사용자들 - Map lookup으로 최적화
            List<User> optionParticipants = optionRecords.stream()
                    .map(record -> userMap.get(record.getUserId()))
                    .filter(user -> user != null)
                    .collect(Collectors.toList());

            int optionParticipantCount = optionParticipants.size();
            if (optionParticipantCount == 0) continue;

            // 성별 통계
            Map<String, Long> optionGenderCounts = optionParticipants.stream()
                    .filter(user -> user.getGender() != null)
                    .collect(Collectors.groupingBy(
                            user -> "MALE".equals(user.getGender()) ? "남성" : "여성",
                            Collectors.counting()
                    ));

            Map<String, Integer> optionGenderStats = optionGenderCounts.entrySet().stream()
                    .collect(Collectors.toMap(
                            Map.Entry::getKey,
                            entry -> (int) Math.round(entry.getValue() * 100.0 / optionParticipantCount)
                    ));

            // 관심사 통계 (Top 3)
            Map<String, Long> optionInterestCounts = new HashMap<>();
            optionParticipants.stream()
                    .filter(user -> user.getInterests() != null)
                    .flatMap(user -> user.getInterests().stream())
                    .forEach(interest -> optionInterestCounts.merge(interest, 1L, Long::sum));

            List<String> topInterests = optionInterestCounts.entrySet().stream()
                    .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                    .limit(3)
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());

            optionAnalyses.add(VoteAnalysisDto.OptionAnalysis.builder()
                    .optionId(option.getId())
                    .optionText(option.getOptionText())
                    .genderStats(optionGenderStats)
                    .topInterests(topInterests)
                    .build());
        }

        return VoteAnalysisDto.builder()
                .mostParticipatedAgeGroup(mostParticipatedAgeGroup)
                .mostParticipatedPercentage(mostParticipatedPercentage)
                .genderStats(genderStats)
                .ageGroupStats(ageGroupStats)
                .relatedInterests(relatedInterests)
                .funFact(funFact)
                .optionAnalyses(optionAnalyses)
                .build();
    }

    // 재미있는 사실 생성
    private String generateFunFact(Vote vote, List<User> participants, Map<String, Integer> genderStats, String mostParticipatedAgeGroup) {
        int totalVotes = vote.getTotalVotes();

        StringBuilder funFact = new StringBuilder();
        funFact.append("이 투표는 현재 ").append(totalVotes).append("명이 참여했으며, ");

        // 성별 정보
        if (!genderStats.isEmpty()) {
            Map.Entry<String, Integer> dominantGender = genderStats.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .orElse(null);

            if (dominantGender != null) {
                funFact.append(dominantGender.getKey())
                        .append(" 참여자가 전체의 ")
                        .append(dominantGender.getValue())
                        .append("%를 차지하고 있습니다. ");
            }
        }

        // 나이 그룹 정보
        if (!"데이터 없음".equals(mostParticipatedAgeGroup)) {
            funFact.append("가장 활발한 연령대는 ")
                    .append(mostParticipatedAgeGroup)
                    .append("입니다!");
        }

        return funFact.toString();
    }
}