package com.picknic.backend.controller;

import com.picknic.backend.dto.common.ApiResponse;
import com.picknic.backend.entity.User;
import com.picknic.backend.domain.Vote;
import com.picknic.backend.domain.VoteOption;
import com.picknic.backend.domain.VoteRecord;
import com.picknic.backend.repository.UserRepository;
import com.picknic.backend.repository.VoteRecordRepository;
import com.picknic.backend.repository.VoteRepository;
import com.picknic.backend.repository.VoteOptionRepository;
import com.picknic.backend.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final UserRepository userRepository;
    private final VoteRecordRepository voteRecordRepository;
    private final VoteRepository voteRepository;
    private final VoteOptionRepository voteOptionRepository;
    private final SecurityUtils securityUtils;

    /**
     * 2007~2012년생이 아닌 사용자 및 해당 사용자의 투표 기록 정리
     * 시스템 계정만 호출 가능
     */
    @PostMapping("/cleanup-invalid-users")
    @Transactional
    public ApiResponse<Map<String, Object>> cleanupInvalidUsers() {
        // 1. 시스템 계정 확인
        String currentUserId = securityUtils.getCurrentUserId();
        User currentUser = userRepository.findByEmail(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (!currentUser.getIsSystemAccount()) {
            throw new IllegalStateException("시스템 계정만 실행할 수 있습니다.");
        }

        log.info("=== 데이터 정리 시작 ===");

        // 2. 2007~2012년생이 아닌 사용자 찾기 (시스템 계정 제외)
        List<User> invalidUsers = userRepository.findAll().stream()
                .filter(user -> !user.getIsSystemAccount())
                .filter(user -> {
                    if (user.getBirthYear() == null) return true;
                    return user.getBirthYear() < 2007 || user.getBirthYear() > 2012;
                })
                .collect(Collectors.toList());

        log.info("2007~2012년생이 아닌 사용자 {}명 발견", invalidUsers.size());

        // 3. 해당 사용자들의 이메일 목록
        Set<String> invalidUserEmails = invalidUsers.stream()
                .map(User::getEmail)
                .collect(Collectors.toSet());

        // 4. 해당 사용자들의 투표 기록 찾기
        List<VoteRecord> invalidRecords = voteRecordRepository.findAll().stream()
                .filter(record -> invalidUserEmails.contains(record.getUserId()))
                .collect(Collectors.toList());

        log.info("삭제할 투표 기록 {}개 발견", invalidRecords.size());

        // 5. 영향받는 투표들의 ID 수집
        Set<Long> affectedVoteIds = invalidRecords.stream()
                .map(VoteRecord::getVoteId)
                .collect(Collectors.toSet());

        // 6. 투표 기록 삭제
        voteRecordRepository.deleteAll(invalidRecords);
        log.info("투표 기록 {}개 삭제 완료", invalidRecords.size());

        // 7. 각 투표의 totalVotes와 각 옵션의 voteCount 재계산
        int updatedVotes = 0;
        int updatedOptions = 0;

        for (Long voteId : affectedVoteIds) {
            Vote vote = voteRepository.findByIdWithOptions(voteId).orElse(null);
            if (vote == null) continue;

            // 해당 투표의 모든 투표 기록 가져오기
            List<VoteRecord> validRecords = voteRecordRepository.findByVoteId(voteId);

            // totalVotes 재설정
            vote.setTotalVotes(validRecords.size());
            updatedVotes++;

            // 각 옵션의 voteCount 재계산
            Map<Long, Long> optionVoteCounts = validRecords.stream()
                    .collect(Collectors.groupingBy(VoteRecord::getSelectedOptionId, Collectors.counting()));

            for (VoteOption option : vote.getOptions()) {
                int newCount = optionVoteCounts.getOrDefault(option.getId(), 0L).intValue();
                option.setVoteCount(newCount);
                voteOptionRepository.save(option);
                updatedOptions++;
            }

            voteRepository.save(vote);
        }

        log.info("투표 {}개, 옵션 {}개 재계산 완료", updatedVotes, updatedOptions);

        // 8. 유효하지 않은 사용자 삭제
        userRepository.deleteAll(invalidUsers);
        log.info("사용자 {}명 삭제 완료", invalidUsers.size());

        log.info("=== 데이터 정리 완료 ===");

        // 9. 결과 반환
        Map<String, Object> result = new HashMap<>();
        result.put("deletedUsers", invalidUsers.size());
        result.put("deletedVoteRecords", invalidRecords.size());
        result.put("updatedVotes", updatedVotes);
        result.put("updatedOptions", updatedOptions);
        result.put("invalidUserEmails", invalidUsers.stream()
                .map(u -> u.getEmail() + " (생년: " + u.getBirthYear() + ")")
                .collect(Collectors.toList()));

        return ApiResponse.success(result);
    }

    /**
     * 전체 투표의 totalVotes와 각 옵션의 voteCount 재계산
     * 시스템 계정만 호출 가능
     */
    @PostMapping("/recalculate-votes")
    @Transactional
    public ApiResponse<Map<String, Object>> recalculateVotes() {
        // 1. 시스템 계정 확인
        String currentUserId = securityUtils.getCurrentUserId();
        User currentUser = userRepository.findByEmail(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (!currentUser.getIsSystemAccount()) {
            throw new IllegalStateException("시스템 계정만 실행할 수 있습니다.");
        }

        log.info("=== 투표 재계산 시작 ===");

        // 2. 모든 투표 가져오기
        List<Vote> allVotes = voteRepository.findAll();
        int updatedVotes = 0;
        int updatedOptions = 0;

        for (Vote vote : allVotes) {
            // 해당 투표의 모든 투표 기록 가져오기
            List<VoteRecord> records = voteRecordRepository.findByVoteId(vote.getId());

            // totalVotes 재설정
            int oldTotal = vote.getTotalVotes();
            vote.setTotalVotes(records.size());

            if (oldTotal != records.size()) {
                log.info("투표 ID {}: totalVotes {} -> {}", vote.getId(), oldTotal, records.size());
            }

            // 각 옵션의 voteCount 재계산
            Map<Long, Long> optionVoteCounts = records.stream()
                    .collect(Collectors.groupingBy(VoteRecord::getSelectedOptionId, Collectors.counting()));

            Vote voteWithOptions = voteRepository.findByIdWithOptions(vote.getId()).orElse(vote);
            for (VoteOption option : voteWithOptions.getOptions()) {
                int oldCount = option.getVoteCount();
                int newCount = optionVoteCounts.getOrDefault(option.getId(), 0L).intValue();
                option.setVoteCount(newCount);

                if (oldCount != newCount) {
                    log.info("옵션 ID {}: voteCount {} -> {}", option.getId(), oldCount, newCount);
                }

                voteOptionRepository.save(option);
                updatedOptions++;
            }

            voteRepository.save(vote);
            updatedVotes++;
        }

        log.info("=== 투표 재계산 완료 ===");

        Map<String, Object> result = new HashMap<>();
        result.put("updatedVotes", updatedVotes);
        result.put("updatedOptions", updatedOptions);

        return ApiResponse.success(result);
    }

    /**
     * 데이터베이스 통계 조회
     */
    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> getStats() {
        String currentUserId = securityUtils.getCurrentUserId();
        User currentUser = userRepository.findByEmail(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (!currentUser.getIsSystemAccount()) {
            throw new IllegalStateException("시스템 계정만 실행할 수 있습니다.");
        }

        List<User> allUsers = userRepository.findAll();
        long validUsers = allUsers.stream()
                .filter(u -> !u.getIsSystemAccount())
                .filter(u -> u.getBirthYear() != null && u.getBirthYear() >= 2007 && u.getBirthYear() <= 2012)
                .count();

        long invalidUsers = allUsers.stream()
                .filter(u -> !u.getIsSystemAccount())
                .filter(u -> u.getBirthYear() == null || u.getBirthYear() < 2007 || u.getBirthYear() > 2012)
                .count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", allUsers.size());
        stats.put("validUsers", validUsers);
        stats.put("invalidUsers", invalidUsers);
        stats.put("totalVotes", voteRepository.count());
        stats.put("totalVoteRecords", voteRecordRepository.count());

        return ApiResponse.success(stats);
    }

    /**
     * HOT 투표 조회 (totalVotes > 1000)
     */
    @GetMapping("/hot-votes")
    public ApiResponse<List<Map<String, Object>>> getHotVotes() {
        String currentUserId = securityUtils.getCurrentUserId();
        User currentUser = userRepository.findByEmail(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (!currentUser.getIsSystemAccount()) {
            throw new IllegalStateException("시스템 계정만 실행할 수 있습니다.");
        }

        List<Vote> hotVotes = voteRepository.findAll().stream()
                .filter(v -> v.getTotalVotes() > 1000)
                .collect(Collectors.toList());

        List<Map<String, Object>> result = hotVotes.stream().map(vote -> {
            Map<String, Object> voteMap = new HashMap<>();
            voteMap.put("id", vote.getId());
            voteMap.put("title", vote.getTitle());
            voteMap.put("category", vote.getCategory());
            voteMap.put("totalVotes", vote.getTotalVotes());

            // 옵션 정보
            Vote voteWithOptions = voteRepository.findByIdWithOptions(vote.getId()).orElse(vote);
            List<Map<String, Object>> options = voteWithOptions.getOptions().stream().map(opt -> {
                Map<String, Object> optMap = new HashMap<>();
                optMap.put("id", opt.getId());
                optMap.put("text", opt.getOptionText());
                optMap.put("voteCount", opt.getVoteCount());
                return optMap;
            }).collect(Collectors.toList());
            voteMap.put("options", options);

            return voteMap;
        }).collect(Collectors.toList());

        return ApiResponse.success(result);
    }

    /**
     * 투표 카테고리 수정
     */
    @PostMapping("/update-vote-category")
    @Transactional
    public ApiResponse<String> updateVoteCategory(@RequestBody Map<String, Object> request) {
        String currentUserId = securityUtils.getCurrentUserId();
        User currentUser = userRepository.findByEmail(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (!currentUser.getIsSystemAccount()) {
            throw new IllegalStateException("시스템 계정만 실행할 수 있습니다.");
        }

        Long voteId = Long.valueOf(request.get("voteId").toString());
        String newCategory = request.get("category").toString();

        Vote vote = voteRepository.findById(voteId)
                .orElseThrow(() -> new IllegalArgumentException("투표를 찾을 수 없습니다."));

        vote.setCategory(newCategory);
        voteRepository.save(vote);

        log.info("투표 ID {} 카테고리 수정: {}", voteId, newCategory);
        return ApiResponse.success("카테고리가 수정되었습니다.");
    }

    /**
     * 투표 옵션 투표수 수정
     */
    @PostMapping("/update-option-votes")
    @Transactional
    public ApiResponse<String> updateOptionVotes(@RequestBody Map<String, Object> request) {
        String currentUserId = securityUtils.getCurrentUserId();
        User currentUser = userRepository.findByEmail(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (!currentUser.getIsSystemAccount()) {
            throw new IllegalStateException("시스템 계정만 실행할 수 있습니다.");
        }

        Long voteId = Long.valueOf(request.get("voteId").toString());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> optionVotes = (List<Map<String, Object>>) request.get("options");

        Vote vote = voteRepository.findByIdWithOptions(voteId)
                .orElseThrow(() -> new IllegalArgumentException("투표를 찾을 수 없습니다."));

        int totalVotes = 0;
        for (Map<String, Object> optionData : optionVotes) {
            Long optionId = Long.valueOf(optionData.get("optionId").toString());
            Integer voteCount = Integer.valueOf(optionData.get("voteCount").toString());

            VoteOption option = vote.getOptions().stream()
                    .filter(opt -> opt.getId().equals(optionId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("옵션을 찾을 수 없습니다."));

            option.setVoteCount(voteCount);
            voteOptionRepository.save(option);
            totalVotes += voteCount;
        }

        vote.setTotalVotes(totalVotes);
        voteRepository.save(vote);

        log.info("투표 ID {} 투표수 수정 완료: 총 {}표", voteId, totalVotes);
        return ApiResponse.success("투표수가 수정되었습니다.");
    }
}
