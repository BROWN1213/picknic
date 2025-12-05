package com.picknic.backend.repository;

import com.picknic.backend.domain.Vote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface VoteRepository extends JpaRepository<Vote, Long> {

    // 활성화된 투표만 최신순 조회 (with fetch join to avoid N+1)
    @Query("SELECT DISTINCT v FROM Vote v LEFT JOIN FETCH v.options WHERE v.isActive = true ORDER BY v.createdAt DESC")
    List<Vote> findByIsActiveTrueOrderByCreatedAtDesc();

    // 특정 사용자가 만든 투표 조회 (with fetch join to avoid N+1)
    @Query("SELECT DISTINCT v FROM Vote v LEFT JOIN FETCH v.options WHERE v.creatorId = :creatorId ORDER BY v.createdAt DESC")
    List<Vote> findByCreatorIdOrderByCreatedAtDesc(@Param("creatorId") String creatorId);

    // 활성화되고 마감 안 된 투표 조회 (with fetch join to avoid N+1)
    @Query("SELECT DISTINCT v FROM Vote v LEFT JOIN FETCH v.options WHERE v.isActive = true " +
            "AND (v.expiresAt IS NULL OR v.expiresAt > :now) ORDER BY v.createdAt DESC")
    List<Vote> findActiveVotes(@Param("now") LocalDateTime now);

    // 비활성화된 투표 조회 (with fetch join to avoid N+1)
    @Query("SELECT DISTINCT v FROM Vote v LEFT JOIN FETCH v.options WHERE v.isActive = false ORDER BY v.createdAt DESC")
    List<Vote> findByIsActiveFalseOrderByCreatedAtDesc();

    // 모든 투표 조회 (with fetch join to avoid N+1)
    @Query("SELECT DISTINCT v FROM Vote v LEFT JOIN FETCH v.options ORDER BY v.createdAt DESC")
    List<Vote> findAllByOrderByCreatedAtDesc();

    // Find vote by title (with fetch join to avoid N+1)
    @Query("SELECT v FROM Vote v LEFT JOIN FETCH v.options WHERE v.title = :title")
    Optional<Vote> findByTitle(@Param("title") String title);

    // Find vote by ID (with fetch join to avoid N+1)
    @Query("SELECT v FROM Vote v LEFT JOIN FETCH v.options WHERE v.id = :id")
    Optional<Vote> findByIdWithOptions(@Param("id") Long id);

    // Find votes by creator emails
    @Query("SELECT v FROM Vote v WHERE v.creatorId IN :creatorEmails")
    List<Vote> findByCreatorIdIn(@Param("creatorEmails") List<String> creatorEmails);
}