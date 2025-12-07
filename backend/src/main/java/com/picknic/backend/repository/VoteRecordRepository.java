package com.picknic.backend.repository;

import com.picknic.backend.domain.VoteRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VoteRecordRepository extends JpaRepository<VoteRecord, Long> {

    // 특정 투표에 특정 사용자가 투표했는지 확인
    boolean existsByVoteIdAndUserId(Long voteId, String userId);

    // 특정 투표에서 사용자가 선택한 기록 조회
    Optional<VoteRecord> findByVoteIdAndUserId(Long voteId, String userId);

    // 특정 투표의 총 투표 수
    long countByVoteId(Long voteId);

    // 사용자가 참여한 투표 기록 조회 (최신순)
    List<VoteRecord> findByUserIdOrderByVotedAtDesc(String userId);

    // 특정 투표의 모든 참여 기록 조회
    List<VoteRecord> findByVoteId(Long voteId);

    // 특정 사용자의 여러 투표에 대한 참여 기록 조회 (N+1 쿼리 방지용 배치 조회)
    List<VoteRecord> findByUserIdAndVoteIdIn(String userId, List<Long> voteIds);
}