package com.picknic.backend.controller;

import com.picknic.backend.dto.common.ApiResponse;
import com.picknic.backend.dto.vote.CastVoteRequest;
import com.picknic.backend.dto.vote.CreateVoteRequest;
import com.picknic.backend.dto.vote.VoteResponse;
import com.picknic.backend.dto.vote.VoteResultResponse;
import com.picknic.backend.service.VoteService;
import com.picknic.backend.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/votes")
@RequiredArgsConstructor
public class VoteController {

    private final VoteService voteService;
    private final SecurityUtils securityUtils;

    // 투표 생성 (+10P, 일일 5회 제한)
    @PostMapping
    public ApiResponse<VoteResponse> createVote(@Valid @RequestBody CreateVoteRequest request) {
        String userId = securityUtils.getCurrentUserId();
        VoteResponse response = voteService.createVote(request, userId);
        return ApiResponse.success(response);
    }

    // 활성 투표 목록 조회
//    @GetMapping
//    public ApiResponse<List<VoteResponse>> getActiveVotes() {
//        String userId = securityUtils.getCurrentUserId();
//        List<VoteResponse> votes = voteService.getActiveVotes(userId);
//        return ApiResponse.success(votes);
//    }

    @GetMapping
    public ApiResponse<List<VoteResponse>> getVotes(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String creatorId) {
        String userId = securityUtils.getCurrentUserId();
        List<VoteResponse> votes = voteService.getVotes(userId, status, creatorId);
        return ApiResponse.success(votes);
    }

    // 투표 상세 조회
    @GetMapping("/{id}")
    public ApiResponse<VoteResponse> getVote(@PathVariable Long id) {
        String userId = securityUtils.getCurrentUserId();
        VoteResponse response = voteService.getVote(id, userId);
        return ApiResponse.success(response);
    }

    // 투표하기 (+1P, 일일 20회 제한)
    @PostMapping("/{id}/vote")
    public ApiResponse<VoteResponse> castVote(
            @PathVariable Long id,
            @Valid @RequestBody CastVoteRequest request) {
        String userId = securityUtils.getCurrentUserId();
        VoteResponse response = voteService.castVote(id, request, userId);
        return ApiResponse.success(response);
    }

    @PutMapping("/{id}")
    public ApiResponse<VoteResponse> updateVote(
            @PathVariable Long id,
            @Valid @RequestBody CreateVoteRequest request) {
        String userId = securityUtils.getCurrentUserId();
        VoteResponse response = voteService.updateVote(id, request, userId);
        return ApiResponse.success(response);
    }

    // 투표 삭제
    @DeleteMapping("/{id}")
    public ApiResponse<String> deleteVote(@PathVariable Long id) {
        String userId = securityUtils.getCurrentUserId();
        voteService.deleteVote(id, userId);
        return ApiResponse.success("투표가 삭제되었습니다.");
    }

    // 투표 조기 마감
    @PatchMapping("/{id}/close")
    public ApiResponse<VoteResponse> closeVote(@PathVariable Long id) {
        String userId = securityUtils.getCurrentUserId();
        VoteResponse response = voteService.closeVote(id, userId);
        return ApiResponse.success(response);
    }

    // 내가 만든 투표 목록
    @GetMapping("/my")
    public ApiResponse<List<VoteResponse>> getMyVotes() {
        String userId = securityUtils.getCurrentUserId();
        List<VoteResponse> votes = voteService.getMyVotes(userId);
        return ApiResponse.success(votes);
    }

    // 내가 참여한 투표 목록
    @GetMapping("/participated")
    public ApiResponse<List<VoteResponse>> getParticipatedVotes() {
        String userId = securityUtils.getCurrentUserId();
        List<VoteResponse> votes = voteService.getParticipatedVotes(userId);
        return ApiResponse.success(votes);
    }

    // 투표 결과 조회
    @GetMapping("/{id}/results")
    public ApiResponse<VoteResultResponse> getVoteResults(@PathVariable Long id) {
        VoteResultResponse response = voteService.getVoteResults(id);
        return ApiResponse.success(response);
    }
}