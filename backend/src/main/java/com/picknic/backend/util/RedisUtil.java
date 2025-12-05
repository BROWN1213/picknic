package com.picknic.backend.util;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Collections;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisUtil {

    private final RedisTemplate<String, String> redisTemplate;

    // 랭킹 점수 추가 (ZINCRBY)
    public void incrementScore(String key, String member, double score) {
        try {
            redisTemplate.opsForZSet().incrementScore(key, member, score);
        } catch (Exception e) {
            log.error("Redis incrementScore 실패 - key: {}, member: {}, score: {}", key, member, score, e);
            // 랭킹 업데이트 실패는 핵심 기능이 아니므로 예외를 전파하지 않음
        }
    }

    // 상위 랭커 조회 (ZREVRANGE)
    public Set<String> getTopRankers(String key, long start, long end) {
        try {
            Set<String> result = redisTemplate.opsForZSet().reverseRange(key, start, end);
            return result != null ? result : Collections.emptySet();
        } catch (Exception e) {
            log.error("Redis getTopRankers 실패 - key: {}", key, e);
            return Collections.emptySet();
        }
    }

    // 내 랭킹 조회 (ZREVRANK)
    public Long getMyRank(String key, String member) {
        try {
            return redisTemplate.opsForZSet().reverseRank(key, member);
        } catch (Exception e) {
            log.error("Redis getMyRank 실패 - key: {}, member: {}", key, member, e);
            return null;
        }
    }

    // 일일 제한 체크 (INCR + EXPIRE)
    // 리턴값: 현재 카운트
    public Long incrementCounterWithLimit(String key, long limitSeconds) {
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            // 처음 생성된 키라면 만료 시간 설정 (24시간 등)
            redisTemplate.expire(key, Duration.ofSeconds(limitSeconds));
        }
        return count;
    }

    // 카운터 조회 (GET)
    // 리턴값: 현재 카운트 (존재하지 않으면 null)
    public Long getCounter(String key) {
        try {
            String value = redisTemplate.opsForValue().get(key);
            return value != null ? Long.parseLong(value) : null;
        } catch (Exception e) {
            log.error("Redis getCounter 실패 - key: {}", key, e);
            return null;
        }
    }
}