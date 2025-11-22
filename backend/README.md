# Picknic Backend API

KHU CloudProject 팀 프로젝트 - 게이미피케이션 기반 포인트 및 랭킹 관리 백엔드 시스템

## 📋 목차

- [프로젝트 소개](#-프로젝트-소개)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [시작하기](#-시작하기)
- [API 문서](#-api-문서)
- [데이터베이스 스키마](#-데이터베이스-스키마)
- [핵심 기능](#-핵심-기능)
- [개발 가이드](#-개발-가이드)

## 🎯 프로젝트 소개

Picknic은 사용자 참여를 유도하는 게이미피케이션 시스템을 제공하는 백엔드 API입니다.

**주요 기능:**
- 🎮 **포인트 시스템**: 투표, 출석, 게시물 작성 등 활동에 따른 포인트 적립
- 🏆 **실시간 랭킹**: Redis 기반 개인/학교별 리더보드
- 🎁 **리워드 교환**: 적립된 포인트로 실제 상품 교환
- 🔒 **동시성 제어**: 낙관적 락을 통한 재고 및 포인트 충돌 방지
- ⏱️ **일일 제한**: Redis 기반 사용자별 일일 활동 제한 (투표 20회, 생성 5회)

## 🛠 기술 스택

### Backend Framework
- **Java 17** - LTS 버전
- **Spring Boot 4.0.0** - 최신 스프링 부트
- **Spring Data JPA** - ORM 및 데이터베이스 추상화
- **Spring Data Redis** - 캐싱 및 랭킹 시스템

### Database & Cache
- **PostgreSQL 15** - 메인 데이터베이스
- **Redis 7** - 랭킹 리더보드 및 Rate Limiting

### Documentation & Testing
- **SpringDoc OpenAPI 3** - Swagger UI를 통한 API 문서 자동 생성
- **JUnit 5** - 단위 테스트
- **Mockito** - Mock 객체를 통한 테스트 격리

### Build Tool
- **Gradle 8** - 빌드 및 의존성 관리

## 📁 프로젝트 구조

```
src/main/java/com/picknic/backend/
├── config/                    # 설정 클래스
│   ├── OpenApiConfig.java     # Swagger 문서 설정
│   ├── RedisConfig.java       # Redis 연결 설정
│   └── WebConfig.java         # CORS 및 Web MVC 설정
│
├── controller/                # REST API 컨트롤러
│   ├── UserController.java    # 사용자 프로필 API
│   ├── PointController.java   # 포인트 관리 API
│   ├── RankingController.java # 랭킹 조회 API
│   └── RewardController.java  # 리워드 목록 API
│
├── service/                   # 비즈니스 로직
│   ├── UserService.java       # 사용자 프로필 서비스
│   ├── PointService.java      # 포인트 적립/사용 서비스
│   ├── RankingService.java    # 랭킹 조회 서비스
│   └── RewardService.java     # 리워드 목록 서비스
│
├── domain/                    # JPA 엔티티
│   ├── UserPoint.java         # 사용자 포인트 (낙관적 락 적용)
│   ├── PointHistory.java      # 포인트 변동 이력
│   ├── PointType.java         # 포인트 타입 (VOTE, CREATE, ATTENDANCE 등)
│   ├── Reward.java            # 리워드 상품 (낙관적 락 적용)
│   └── Level.java             # 사용자 레벨 (브론즈, 실버, 골드 등)
│
├── repository/                # Spring Data JPA 리포지토리
│   ├── UserPointRepository.java
│   ├── PointHistoryRepository.java
│   └── RewardRepository.java
│
├── dto/                       # 데이터 전송 객체
│   ├── common/                # 공통 DTO
│   │   └── ApiResponse.java   # 통일된 API 응답 형식
│   ├── user/                  # 사용자 관련 DTO
│   ├── point/                 # 포인트 관련 DTO
│   ├── ranking/               # 랭킹 관련 DTO
│   └── reward/                # 리워드 관련 DTO
│
├── event/                     # 이벤트 기반 아키텍처
│   ├── VoteCompletedEvent.java      # 투표 완료 이벤트
│   └── PointEventListener.java      # 포인트 이벤트 리스너
│
└── util/                      # 유틸리티 클래스
    ├── RedisUtil.java         # Redis 작업 헬퍼
    └── SecurityUtils.java     # 현재 사용자 조회 (Mock)
```

## 🚀 시작하기

### 1. 사전 요구사항

- Java 17 이상
- Docker & Docker Compose (PostgreSQL, Redis 실행용)
- Gradle 8.x (또는 내장 Gradle Wrapper 사용)

### 2. 데이터베이스 실행

Docker Compose로 PostgreSQL과 Redis를 실행합니다:

```bash
docker-compose up -d
```

실행 확인:
```bash
# PostgreSQL 확인
docker ps | grep picknic-db

# Redis 확인
docker ps | grep picknic-redis
```

### 3. 애플리케이션 실행

#### Gradle로 실행
```bash
./gradlew bootRun
```

#### 빌드 후 실행
```bash
./gradlew build
java -jar build/libs/backend-0.0.1-SNAPSHOT.jar
```

### 4. 실행 확인

애플리케이션이 정상적으로 실행되면 다음 URL에 접속할 수 있습니다:

- **API 서버**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **OpenAPI JSON**: http://localhost:8080/api-docs

## 📚 API 문서

### Swagger UI 접속

애플리케이션 실행 후 브라우저에서 접속:

```
http://localhost:8080/swagger-ui.html
```

Swagger UI에서는:
- 모든 API 엔드포인트 확인
- 요청/응답 예제 확인
- **직접 API 테스트 가능** (Try it out 버튼)

### API 엔드포인트 요약

#### 1️⃣ User API (`/users`)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/users/me` | 내 프로필 조회 (포인트, 랭킹, 레벨) | 필요 (Mock) |

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "userId": "test_user_123",
    "username": "User_test_user_123",
    "points": 1750,
    "rank": 6,
    "level": "실버",
    "levelIcon": "🥈",
    "verifiedSchool": null
  }
}
```

#### 2️⃣ Ranking API (`/rankings`)

| Method | Endpoint | 설명 | 파라미터 |
|--------|----------|------|----------|
| GET | `/rankings/personal` | 개인 랭킹 Top N + 내 랭킹 | limit, offset |
| GET | `/rankings/schools` | 학교별 랭킹 Top N + 내 학교 | limit, offset |

**응답 예시 (개인 랭킹):**
```json
{
  "success": true,
  "data": {
    "topRankers": [
      {
        "userId": "user123",
        "username": "User_user123",
        "points": 2500,
        "rank": 1
      }
    ],
    "myRank": {
      "rank": 6,
      "points": 1750,
      "username": "User_test_user_123"
    }
  }
}
```

#### 3️⃣ Point API

| Method | Endpoint | 설명 | 파라미터 |
|--------|----------|------|----------|
| GET | `/points/history` | 포인트 변동 이력 조회 | limit, offset |
| POST | `/daily-check-in` | 일일 출석 체크 (+5P) | - |
| POST | `/rewards/{rewardId}/redeem` | 포인트로 리워드 교환 | rewardId |

**포인트 타입:**
- `vote`: 투표 참여 (+1점, 일일 20회 제한)
- `create`: 투표 생성 (+10점, 일일 5회 제한)
- `attendance`: 출석 체크 (+5점, 일일 1회)
- `event`: 이벤트 참여
- `use_reward`: 리워드 사용 (음수)

#### 4️⃣ Reward API (`/v1`)

| Method | Endpoint | 설명 | 파라미터 |
|--------|----------|------|----------|
| GET | `/v1/rewards` | 교환 가능한 리워드 목록 | - |

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "rewards": [
      {
        "id": 1,
        "name": "스타벅스 아메리카노 Tall",
        "description": "스타벅스 아메리카노 Tall 사이즈 쿠폰",
        "cost": 500,
        "stock": 100,
        "imageUrl": "https://example.com/starbucks.jpg"
      }
    ]
  }
}
```

## 🗄️ 데이터베이스 스키마

### UserPoint (사용자 포인트)

```sql
CREATE TABLE user_points (
    user_id VARCHAR(255) PRIMARY KEY,      -- 사용자 ID (Auth 모듈에서 제공)
    current_points BIGINT NOT NULL,        -- 사용 가능한 포인트
    total_accumulated_points BIGINT,       -- 누적 포인트 (랭킹용)
    version BIGINT                         -- 낙관적 락 버전
);
```

### PointHistory (포인트 변동 이력)

```sql
CREATE TABLE point_history (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,         -- 사용자 ID
    type VARCHAR(50) NOT NULL,             -- 포인트 타입 (VOTE, CREATE 등)
    amount INT NOT NULL,                   -- 증감 포인트
    description VARCHAR(255),              -- 설명
    reference_id VARCHAR(255),             -- 참조 ID (voteId 등)
    created_at TIMESTAMP NOT NULL          -- 발생 시각 (자동 생성)
);
```

### Reward (리워드 상품)

```sql
CREATE TABLE rewards (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,            -- 리워드 이름
    description TEXT,                      -- 설명
    cost BIGINT NOT NULL,                  -- 필요 포인트
    stock INT NOT NULL,                    -- 재고
    image_url VARCHAR(500),                -- 이미지 URL
    version BIGINT                         -- 낙관적 락 버전
);
```

## ⚙️ 핵심 기능

### 1. 이벤트 기반 포인트 적립

투표 모듈과 포인트 모듈이 이벤트를 통해 느슨하게 결합됩니다:

```java
// 1. 투표 완료 시 이벤트 발행 (Vote 모듈)
applicationEventPublisher.publishEvent(
    new VoteCompletedEvent(userId, voteId, PointType.VOTE, 1, schoolName)
);

// 2. 포인트 모듈이 이벤트 수신 및 처리
@EventListener
public void handleVoteCompleted(VoteCompletedEvent event) {
    pointService.earnPoints(...);
}
```

**장점:**
- 모듈 간 결합도 감소
- 포인트 적립 실패가 투표 기능에 영향 없음
- 비동기 확장 가능

### 2. Redis 기반 실시간 랭킹

**개인 랭킹:**
```
Redis Sorted Set: "leaderboard:weekly"
- 멤버: userId
- 스코어: totalAccumulatedPoints
```

**학교별 랭킹:**
```
Redis Sorted Set: "leaderboard:school"
- 멤버: schoolName
- 스코어: 학교 전체 포인트 합산
```

**Redis 명령어 매핑:**
- `ZINCRBY`: 포인트 적립 시 스코어 증가
- `ZREVRANGE`: Top N 조회
- `ZREVRANK`: 내 랭킹 조회

### 3. 일일 제한 (Rate Limiting)

Redis를 활용한 사용자별 일일 활동 제한:

```
Redis Key: "limit:{type}:{date}:{userId}"
- 예시: "limit:VOTE:2025-11-22:user123"
- TTL: 24시간
- 값: 오늘의 활동 횟수
```

**제한:**
- 투표 (`VOTE`): 20회/일
- 게시물 생성 (`CREATE`): 5회/일
- 출석 체크 (`ATTENDANCE`): 1회/일

### 4. 낙관적 락 (Optimistic Locking)

리워드 교환 시 동시성 문제 방지:

```java
@Entity
public class Reward {
    @Version
    private Long version;  // JPA가 자동으로 버전 관리

    public void decreaseStock() {
        if (this.stock <= 0) {
            throw new IllegalStateException("재고가 부족합니다.");
        }
        this.stock--;
        // 저장 시 version 체크 → 충돌 시 ObjectOptimisticLockingFailureException
    }
}
```

**동작 방식:**
1. 엔티티 조회 시 version 값도 함께 조회
2. 엔티티 수정 및 저장
3. DB 저장 시 `WHERE id = ? AND version = ?` 조건으로 업데이트
4. 다른 트랜잭션이 먼저 수정했다면 version 불일치 → 예외 발생

## 🔧 개발 가이드

### 테스트 실행

전체 테스트 실행:
```bash
./gradlew test
```

특정 테스트 클래스 실행:
```bash
./gradlew test --tests "com.picknic.backend.service.PointServiceTest"
```

특정 테스트 메서드 실행:
```bash
./gradlew test --tests "com.picknic.backend.service.PointServiceTest.testEarnPoints_성공"
```

### 환경 변수 설정

`src/main/resources/application.properties` 파일에서 설정 변경 가능:

```properties
# PostgreSQL
spring.datasource.url=jdbc:postgresql://localhost:5432/picknic
spring.datasource.username=user
spring.datasource.password=password

# Redis
spring.data.redis.host=localhost
spring.data.redis.port=6379

# JPA DDL 모드 (개발: update, 프로덕션: validate)
spring.jpa.hibernate.ddl-auto=update

# 로그 레벨
logging.level.com.picknic.backend=INFO
```

### Mock 데이터 초기화

애플리케이션 시작 시 `DataInitializer_MockData.java`가 자동으로:
- 테스트용 Reward 데이터 생성
- 개발 환경용 샘플 데이터 제공

### CORS 설정

현재 모든 Origin에서 접근 가능하도록 설정되어 있습니다:

```java
// WebConfig.java
registry.addMapping("/**")
    .allowedOrigins("*")  // 모든 origin 허용
    .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
    .allowedHeaders("*");
```

프로덕션 환경에서는 특정 도메인만 허용하도록 변경 권장:
```java
.allowedOrigins("https://your-frontend-domain.com")
.allowCredentials(true)
```

### 빌드

JAR 파일 생성:
```bash
./gradlew clean build
```

빌드 결과물: `build/libs/backend-0.0.1-SNAPSHOT.jar`

테스트 제외 빌드:
```bash
./gradlew clean build -x test
```

## 📞 문의 및 기여

KHU CloudProject 팀 프로젝트

---

**최종 수정일**: 2025-11-22
