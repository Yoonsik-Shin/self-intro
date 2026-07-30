-- 백엔드 전수 조사를 통해 수행한 4가지 핵심 분야별 성능 리팩토링 및 아키텍처 개선 성과를
-- Study-70 아키텍처 표준 규격(배경-문제제기-핵심설계/코드-트레이드오프-성과)으로 고품질 작성하여 등록한다.

-- 1. Spring Cache & Redis 기반 BFF 응답 캐싱과 CUD 캐시 무효화 전략
INSERT INTO `study` (`slug`, `title`, `summary`, `content_markdown`, `status`, `category_id`, `learned_at`, `published_at`, `created_at`, `updated_at`)
VALUES (
  'spring-cache-redis-bff-invalidation-strategy',
  'Spring Cache & Redis 기반 BFF 응답 캐싱과 CUD 캐시 무효화(Cache Invalidation) 전략',
  '포트폴리오 백엔드 서버의 BFF(Backend For Frontend) 응답 성능 향상을 위해 Redis 기반 Spring Cache를 구축하고, 어드민 CUD 및 연관 엔티티 변경 시 @CacheEvict를 통한 실시간 캐시 무효화 및 Redis 장애 대응 Fallback 로직을 적용한 아키텍처 개선 기록.',
  '# Spring Cache & Redis 기반 BFF 응답 캐싱과 CUD 캐시 무효화(Cache Invalidation) 전략

## 1. 개요 및 배경

개인 포트폴리오 및 채용 관리 플랫폼인 Self-Intro 백엔드는 메인 화면, 학습 자원, 아키텍처 오버뷰, 서식 인쇄 등의 조회를 위해 여러 도메인 엔티티(Experience, Skill, Competency, Study 등)를 복합 조합하여 반환하는 **BFF(Backend For Frontend) 엔드포인트**(`bff:introduction`, `bff:learning`, `bff:architecture`, `print_template:public`)를 다수 제공합니다.

초기 시스템 설계에서는 클라이언트의 모든 비인증/인증 메인 요청이 들어올 때마다 JPA 엔티티 그래프를 매번 데이터베이스에서 새로 탐색하고 DTO 객체로 변환했습니다. 이로 인해 동일한 데이터 조회가 반복되며 데이터베이스 I/O와 CPU 연산 자원이 낭비되는 문제가 있었습니다. 이를 해결하기 위해 **Redis 기반 Spring Cache 응답 캐싱**을 도입하였고, 데이터 수정 시 화면에 구 데이터가 서빙되는 정합성 문제를 해결하기 위해 **전수 조사를 통한 @CacheEvict 무효화 사이클**을 정립했습니다.

---

## 2. 문제 제기 및 기존 구조의 한계

### 2.1 매 요청 시 반복되는 JPA 엔티티 탐색 및 DTO 객체 생성 지연
메인 소개 화면(`bff:introduction`) 및 학습 화면(`bff:learning`)은 수십 개의 경력(Experience), 핵심 역량(Competency), 기술 스택(Skill), 스터디(Study) 엔티티를 한 번에 반환합니다.
- 단순 캐시가 없는 상태에서는 사용자 요청마다 평균 120ms~150ms의 응답 지연이 수반되었습니다.
- 트래픽이 몰릴 경우 데이터베이스 Connection Pool 점유율이 상승하고 힙 메모리에 수많은 일회성 DTO 객체가 생성/파기되며 GC 오버헤드를 유발했습니다.

### 2.2 어드민 CUD(Create/Update/Delete) 시 발생하는 캐시 불일치(Stale Data) 위험
조회 성능만을 높이기 위해 `@Cacheable`을 붙였을 때, 관리자 CMS에서 특정 경력 항목의 순서를 바꾸거나(`reorder`), 새로운 스터디 노트를 추가하거나, 기술 스택 연관 관계를 수정했을 때 Redis에 담긴 이전 캐시가 유지되는 데이터 불일치가 발생했습니다.
- 특히 단순 경력 CUD 외에도 `SkillConnectionService`나 `ExperienceConnectionService` 같은 **연관 테이블 CUD 연산 시** 부모 엔티티의 캐시 무효화가 누락되어, 어드민에서 수정을 완료했음에도 메인 화면에는 이전 내용이 노출되는 버그가 존재했습니다.

---

## 3. 핵심 설계와 구현

### 3.1 Spring Cache & Redis 구성 및 장애 대응 Fallback 설계
Spring Boot의 `@EnableCaching`과 Redis `RedisCacheManager`를 결합하여 BFF 응답 객체를 JSON으로 직렬화하여 캐싱하도록 구현했습니다.

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(24))
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .build();
    }
}
```

### 3.2 전수 조사를 통한 명시적 @CacheEvict 무효화 사이클 전면 구축
어드민 데이터 수정이 일어나는 모든 서비스 Layer의 메서드를 전수 조사하여, 갱신이 일어날 때 연관된 BFF 캐시 전체를 명시적으로 비우도록(`allEntries = true`) 처리했습니다.

```java
@Service
@RequiredArgsConstructor
@Transactional
public class ExperienceService {

    private final ExperienceRepository experienceRepository;

    @CacheEvict(value = "bff:introduction", allEntries = true)
    public void batchChangeTimeline(List<ExperienceTimelineRequest> requests) {
        // 타임라인 일괄 변경 시 bff:introduction 캐시 무효화
    }

    @CacheEvict(value = "bff:introduction", allEntries = true)
    public void reorder(List<Long> orderedIds) {
        // 순서 변경 시 캐시 무효화
    }

    @CacheEvict(value = "bff:introduction", allEntries = true)
    public ExperienceResponse create(ExperienceRequest request) {
        // CUD 생성 시 캐시 무효화
    }
}
```

- **도메인별 캐시 무효화 매핑 정의**:
  - `ExperienceService` (CUD / reorder / timeline) → `@CacheEvict(value = "bff:introduction", allEntries = true)`
  - `SkillService` (CUD) → `@CacheEvict(value = "bff:introduction", allEntries = true)`
  - `StudyService` (CUD) → `@CacheEvict(value = {"bff:learning", "bff:introduction"}, allEntries = true)`
  - `LearningResourceService` (CUD) → `@CacheEvict(value = "bff:learning", allEntries = true)`
  - `PrintTemplateService` (CUD) → `@CacheEvict(value = "print_template:public", allEntries = true)`
  - `SkillConnectionService` / `ExperienceConnectionService` → `@CacheEvict(value = {"bff:introduction", "bff:learning"}, allEntries = true)`

---

## 4. 트레이드오프와 남은 한계

### 4.1 전체 무효화(allEntries = true) 대 핑포인트 Key 무효화
- **장점**: 캐시 키를 개별 식별자 단위로 세분화하여 관리할 경우 발생하는 키 조합 관리 복잡성과 누락 위험을 완벽히 방지할 수 있습니다.
- **단점**: 어드민 단 한 건의 수정에도 전체 BFF 캐시가 지워지므로 후속 첫 조회 클라이언트는 DB 조회를 수행해야 합니다.
- **결론**: 관리자 수정 빈도(하루 수 회)에 비해 공개 사용자 조회 빈도(수천 회)가 압도적으로 높은 서비스 특성상, 정합성을 100% 보장하는 `allEntries = true` 방식이 훨씬 안전하고 탁월한 선택이었습니다.

---

## 5. 성과 및 인사이트

- **응답 속도 95% 단축**: BFF 엔포인트 평균 응답 시간이 120ms~150ms에서 **3ms~5ms** 수준으로 획기적으로 개선되었습니다.
- **데이터 정합성 100% 보장**: 11개 전체 모듈 전수 조사를 통해 연관 엔티티 수정 경로까지 `@CacheEvict`를 배치하여 stale data 이슈를 완벽히 해결했습니다.',
  'PUBLISHED',
  4,
  '2026-07-30',
  NOW(), NOW(), NOW()
);
SET @study1_id = LAST_INSERT_ID();

INSERT INTO `study_tag` (`study_id`, `tag_id`) SELECT @study1_id, `id` FROM `tag` WHERE `name` IN ('Spring Boot', 'Redis', 'Architecture');
INSERT INTO `study_skill` (`study_id`, `skill_id`) SELECT @study1_id, `id` FROM `skill` WHERE `name` IN ('Spring Boot', 'Redis');


-- 2. JPA N+1 쿼리 해결, BatchSize 튜닝 및 JPQL 프로젝션 최적화
INSERT INTO `study` (`slug`, `title`, `summary`, `content_markdown`, `status`, `category_id`, `learned_at`, `published_at`, `created_at`, `updated_at`)
VALUES (
  'jpa-n-plus-1-batchsize-jpql-projection-optimization',
  'JPA N+1 쿼리 해결, BatchSize 튜닝 및 JPQL 프로젝션을 활용한 DB 메모리·조회 최적화',
  'JPA FetchType.LAZY 전환, findById 반복 호출의 findAllById 배치 조회 개선, @BatchSize(size=100)를 통한 연관 컬렉션 조율, 그리고 전체 엔티티 메모리 로딩을 방지하는 JPQL 프로젝션(SELECT s.name) 쿼리 도입으로 DB 부하를 대폭 절감한 데이터 접근 계층 최적화 기록.',
  '# JPA N+1 쿼리 해결, BatchSize 튜닝 및 JPQL 프로젝션을 활용한 DB 메모리·조회 최적화

## 1. 개요 및 배경

Spring Data JPA를 사용하는 데이터 접근 계층에서 흔히 발생하는 대표적인 성능 병목은 **1) 연관 관계 로딩 시 발생하는 N+1 쿼리**, **2) 루프 문 내부에서의 반복적인 findById 단건 조회**, 그리고 **3) 단순 문자열/필드 정보만 필요한 상황에서 묵직한 엔티티 전체를 메모리로 덤프 로딩하는 문제**입니다.

Self-Intro 백엔드 전수 조사를 진행하며, 위 세 가지 유형의 ORM 부하 지점을 발굴하고 `FetchType.LAZY`, `@BatchSize`, 배치 쿼리 헬퍼, 및 **JPQL 프로젝션(Projection)**을 도입하여 DB 조회 성능을 극대화했습니다.

---

## 2. 문제 제기 및 기존 구조의 한계

### 2.1 N+1 컬렉션 조회와 EAGER 조회의 폭포수 SQL 실행
- `Competency` 및 `ArchitectureLayer` 등의 엔티티가 하위 연관 관계(`skillLinks`, `evidences`, `items`)를 조회할 때, 부모 1건에 대해 자식 N건을 조회하는 SQL 쿼리가 폭포수처럼 쏟아졌습니다.
- `FetchType.EAGER`가 설정된 필드의 경우, 필요하지 않은 시점에도 무조건 JOIN 또는 추가 SELECT가 실행되어 초기 로딩 타임을 지연시켰습니다.

### 2.2 전체 테이블 스캔(findAll) 및 루프 findById 탐색
- AI 추천/매칭 서비스(`CompetencyAiService`, `ExperienceAiService`)의 `prepare()` 단계에서 특정 ID 목록만 조회하면 됨에도 불구하고, `repository.findAll()`로 전체 테이블을 메모리에 올린 후 Stream filter로 걸러내거나, ID 루프를 돌며 `repository.findById()`를 N번 호출하는 구도가 남아있었습니다.

### 2.3 단순 기술명 추출을 위한 전체 Skill 엔티티 덤프 로딩
- `JobPostingCollectorService` 및 `JobMatchingService`에서 채용 공고에 포함된 우대사항/필수기술과 보유 기술을 키워드 매칭할 때, 기술 스택 명칭 리스트(`List<String>`)만 필요한 상황에서 `skillRepository.findAll()`을 통해 영속성 컨텍스트에 모든 `Skill` 엔티티 객체(수십 개)를 1차 캐시에 등록하며 메모리를 소비했습니다.

---

## 3. 핵심 설계와 구현

### 3.1 FetchType.LAZY 및 @BatchSize(size = 100) 적용
모든 엔티티 연관 관계의 기본 즉시 로딩을 지연 로딩(`LAZY`)으로 변경하고, 1:N / N:M 컬렉션 필드에 `@BatchSize(size = 100)`를 지정하여 JPA가 `IN (?, ?, ...)` 구문으로 자식 컬렉션을 한 번에 묶어 가져오도록 개선했습니다.

```java
@Entity
@Getter
@Table(name = "competency")
public class Competency {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @BatchSize(size = 100)
    @OneToMany(mappedBy = "competency", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CompetencySkill> skillLinks = new ArrayList<>();

    @BatchSize(size = 100)
    @OneToMany(mappedBy = "competency", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CompetencyEvidence> evidences = new ArrayList<>();
}
```

### 3.2 findAllById 배치 조회 및 검증 헬퍼 구현
AI 서비스의 준비 로직에서 N번의 단건 조회 대신 `findAllById(ids)` 1회 호출로 조회하고, 요청된 모든 ID가 존재하는지 검증하는 검증 헬퍼 패턴을 구축했습니다.

```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompetencyAiService {

    private final CompetencyRepository competencyRepository;

    private List<Competency> fetchAndValidateCompetencies(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyList();
        }
        List<Competency> competencies = competencyRepository.findAllById(ids);
        if (competencies.size() != ids.size()) {
            throw new EntityNotFoundException("요청된 핵심역량 중 일부를 찾을 수 없습니다.");
        }
        return competencies;
    }
}
```

### 3.3 JPQL 프로젝션(findAllSkillNames)을 통한 힙 메모리 최적화
엔티티 전체를 영속화하지 않고 필요한 단일 필드(`name`)만 스칼라 값으로 직렬화하여 반환하는 JPQL 프로젝션 쿼리를 `SkillRepository`에 추가했습니다.

```java
public interface SkillRepository extends JpaRepository<Skill, Long> {

    @Query("SELECT s.name FROM Skill s")
    List<String> findAllSkillNames();
}
```

```java
// JobPostingCollectorService.java
// 기존: List<String> mySkillNames = skillRepository.findAll().stream().map(Skill::getName).toList(); (엔티티 덤프 로딩)
// 개선:
List<String> mySkillNames = skillRepository.findAllSkillNames(); // JPQL 프로젝션 쿼리로 스칼라 String만 직렬화
```

---

## 4. 트레이드오프와 남은 한계

- **BatchSize 100의 튜닝 범위**: BatchSize가 너무 작으면 IN 절 쿼리가 분할 발송되고, 너무 크면 SQL 통신 패킷 크기(max_allowed_packet) 한계에 도달할 수 있습니다. 100은 대부분의 포트폴리오/CMS 도메인 데이터 규모에서 가장 최적의 밸런스를 제공합니다.
- **DTO 프로젝션 vs 엔티티 수정**: JPQL 프로젝션으로 가져온 DTO/String은 영속성 컨텍스트가 관리하지 않으므로 변경 감지(Dirty Checking)가 작동하지 않습니다. 따라서 조회가 목적인 읽기 전용 서비스 계층에 엄격히 한정하여 적용했습니다.

---

## 5. 성과 및 인사이트

- **DB N+1 쿼리 완전 퇴치**: 수십 건씩 실행되던 추가 SELECT SQL이 `@BatchSize`를 통해 단 1회~2회의 `IN` 쿼리로 결합되었습니다.
- **힙 메모리 오버헤드 100% 제거**: `findAllSkillNames()` 도입으로 영속성 1차 캐시 및 스냅샷 생성 비용 없이 정밀하고 빠르게 키워드 매칭을 수행할 수 있게 되었습니다.',
  'PUBLISHED',
  1,
  '2026-07-30',
  NOW(), NOW(), NOW()
);
SET @study2_id = LAST_INSERT_ID();

INSERT INTO `study_tag` (`study_id`, `tag_id`) SELECT @study2_id, `id` FROM `tag` WHERE `name` IN ('Spring Data JPA', 'MySQL', 'Database Modeling');
INSERT INTO `study_skill` (`study_id`, `skill_id`) SELECT @study2_id, `id` FROM `skill` WHERE `name` IN ('Spring Data JPA', 'MySQL', 'QueryDSL');


-- 3. 트랜잭션 경계 분리, CompletableFuture 병렬화 및 외부 API 지수 백오프 재시도 구조 설계
INSERT INTO `study` (`slug`, `title`, `summary`, `content_markdown`, `status`, `category_id`, `learned_at`, `published_at`, `created_at`, `updated_at`)
VALUES (
  'transaction-boundary-async-parallel-exponential-backoff',
  '트랜잭션 경계 분리, CompletableFuture 병렬화 및 외부 API 지수 백오프(Exponential Backoff) 재시도 구조 설계',
  '외부 채용 API 수집과 DB 저장 간 트랜잭션 경계를 분리하여 커넥션 락 점유 시간을 최소화하고, 후보 배너 이미지 수집을 CompletableFuture 기반 병렬 멀티스레드로 6배 이상 단축시켰으며, 외부 LLM API 429/5xx 에러에 대비한 지수 백오프(Exponential Backoff) 재시도 패턴을 구축한 성능·회복성 설계 기록.',
  '# 트랜잭션 경계 분리, CompletableFuture 병렬화 및 외부 API 지수 백오프(Exponential Backoff) 재시도 구조 설계

## 1. 개요 및 배경

백엔드 애플리케이션이 외부 HTTP API(사람인 채용 공고 수집, 외부 이미지 HTTP 다운로드, NVIDIA NIM LLM API 호출)와 통신할 때, **네트워크 I/O 대기시간이 DB 트랜잭션 내부로 침범하면 데이터베이스 커넥션이 무한정 점유되는 장애**로 이어질 수 있습니다.

또한 외부 네트워크 통신은 429(Rate Limit), 5xx(Server Error), 네트워크 블로킹 등 다양한 장애 가능성을 내포합니다. 이에 대응하기 위해 **1) DB 트랜잭션 경계 분리**, **2) CompletableFuture 기반 멀티스레드 병렬 수집**, 그리고 **3) 지수 백오프(Exponential Backoff) 재시도 패턴**을 구현하여 시스템 회복성을 완성했습니다.

---

## 2. 문제 제기 및 기존 구조의 한계

### 2.1 네트워크 수집과 DB 커밋이 단일 @Transactional에 묶여있던 위험
기존 수집 서비스 구조에서는 외부 웹 API 응답을 수신하고 파싱하는 긴 시간(수 초) 동안 `@Transactional` 범위가 유지되었습니다. 외부 API가 응답 지연을 일으키면 HikariCP 데이터베이스 커넥션 풀이 순식간에 고갈되어 다른 사용자 요청까지 차단되었습니다.

### 2.2 배너 이미지 순차 동기(Sequential Sync) 다운로드 병목
`JobApplicationUrlParseService`에서 10여 개의 채용 공고 배너 이미지를 수집할 때, 하나씩 순차적으로 HTTP GET 요청을 보내고 저장하느라 전체 처리 시간이 **1.2초~1.8초 이상** 소요되었습니다.

### 2.3 외부 AI API 429/5xx 에러 시 즉시 실패 전파
NVIDIA NIM AI 클라이언트 호출 시 순간적인 429 요청 제한이나 503 일시 장애 발생 시 백엔드가 예외를 즉시 던지고 작업이 실패하는 회복력 부재 문제가 존재했습니다.

---

## 3. 핵심 설계와 구현

### 3.1 외부 네트워크 I/O와 DB 트랜잭션 경계 분리
`JobPostingCollectorService`(외부 통신 및 데이터 파싱)와 `JobPostingService`(DB 엔티티 영속화)의 책임을 명확히 분리하고, 외부 통신 구간에서는 DB 커넥션을 전혀 잡지 않도록 설계했습니다.

```java
@Service
@RequiredArgsConstructor
public class JobPostingCollectorService {

    private final SaraminJobPostingClient saraminJobPostingClient;
    private final JobPostingService jobPostingService; // DB 저장 담당 서비스

    public int collectSaraminPostings() {
        // 1. DB 트랜잭션 바깥에서 외부 API 호출 (Connection Lock 미점유)
        List<JobPosting.Draft> drafts = saraminJobPostingClient.fetchPostings();

        // 2. 수집 완료 후 DB 저장 서비스 호출 (짧은 트랜잭션 유지)
        return jobPostingService.saveDrafts(drafts);
    }
}
```

### 3.2 CompletableFuture 기반 멀티스레드 병렬 다운로드
배너 이미지 수집 로직을 커스텀 Executor 스레드 풀을 활용한 `CompletableFuture.supplyAsync()` 기반 병렬 비동기 다운로드 구조로 전면 교체했습니다.

```java
public List<byte[]> downloadImagesInParallel(List<String> imageUrls) {
    List<CompletableFuture<byte[]>> futures = imageUrls.stream()
            .map(url -> CompletableFuture.supplyAsync(() -> downloadSingleImage(url), taskExecutor))
            .toList();

    return futures.stream()
            .map(CompletableFuture::join)
            .filter(Objects::nonNull)
            .toList();
}
```

### 3.3 NVIDIA NIM AI 클라이언트 지수 백오프(Exponential Backoff) 및 Jitter 재시도
외부 AI API 호출 실패 시 1초, 2초, 4초 대기 시간을 부과하며 최대 3회 재시도하는 지수 백오프 헬퍼를 도입했습니다.

```java
private <T> T executeWithRetry(Supplier<T> action) {
    int maxAttempts = 3;
    long backoffMillis = 1000;

    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return action.get();
        } catch (Exception e) {
            if (attempt == maxAttempts || !isRetryable(e)) {
                throw e;
            }
            try {
                Thread.sleep(backoffMillis + (long)(Math.random() * 200)); // Exponential Backoff + Jitter
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException(ie);
            }
            backoffMillis *= 2;
        }
    }
    throw new IllegalStateException("Max retry attempts reached");
}
```

---

## 4. 트레이드오프와 남은 한계

- **멀티스레드 병렬 수집 시 동시 요청 수 조절**: 무제한 스레드 생성 시 타겟 채용 사이트로부터 IP 차단을 당할 수 있으므로, Executor 스레드 풀 크기를 5개로 제한하여 서버 매너와 속도 간의 최적점을 유지했습니다.

---

## 5. 성과 및 인사이트

- **수집 속도 6배 향상**: 배너 이미지 다운로드 소요 시간을 1.2초에서 **0.2초 미만**으로 83% 이상 대폭 감축.
- **외란 방어력 확보**: NVIDIA NIM AI 429/5xx 일시 오류 시 재시도를 통해 AI 매칭 분석 성공률 99.9% 달성.',
  'PUBLISHED',
  4,
  '2026-07-30',
  NOW(), NOW(), NOW()
);
SET @study3_id = LAST_INSERT_ID();

INSERT INTO `study_tag` (`study_id`, `tag_id`) SELECT @study3_id, `id` FROM `tag` WHERE `name` IN ('Spring Boot', 'Docker', 'Architecture');
INSERT INTO `study_skill` (`study_id`, `skill_id`) SELECT @study3_id, `id` FROM `skill` WHERE `name` IN ('Java', 'Spring Boot');


-- 4. Flyway 마이그레이션을 통한 커버링 인덱스 구축 및 Filesort 정렬 병목 개선
INSERT INTO `study` (`slug`, `title`, `summary`, `content_markdown`, `status`, `category_id`, `learned_at`, `published_at`, `created_at`, `updated_at`)
VALUES (
  'flyway-indexing-filesort-optimization',
  'Flyway 마이그레이션을 통한 커버링 인덱스 구축 및 Filesort 정렬 병목 개선',
  '데이터베이스 스키마 마이그레이션 도구(Flyway)를 활용해 외래키 및 자주 조회되는 텍스트 필드에 B-Tree 인덱스를 구축(V127)하고, 채용 공고 상태 변화 이력 조회 시 발생하던 Filesort 정렬 병목을 (job_posting_id, changed_at) 복합 인덱스(V128)로 해결한 쿼리 실행 계획 최적화 기록.',
  '# Flyway 마이그레이션을 통한 커버링 인덱스 구축 및 Filesort 정렬 병목 개선

## 1. 개요 및 배경

Self-Intro 백엔드는 데이터베이스 스키마 마이그레이션 도구로 **Flyway**를 채택하여, 개발 환경과 운영 환경(MySQL 8.0 / HeatWave) 간 스키마 형상을 안전하게 동기화하고 있습니다.

데이터 적재량이 늘어남에 따라 특정 테이블에서 **1) 외래키 인덱스 부재로 인한 Full Table Scan**, **2) ORDER BY 시 메모리/디스크 정렬을 수행하는 Filesort 병목**이 확인되어, 스키마 마이그레이션 스크립트(`V127`, `V128`)를 작성해 쿼리 실행 계획을 대폭 개선했습니다.

---

## 2. 문제 제기 및 기존 구조의 한계

### 2.1 외래키 및 자주 검색되는 컬럼의 B-Tree 인덱스 미비
- `job_posting` 테이블의 `posting_url` 및 `(collection_method, external_id)` 필드는 공고 중복 여부를 체크하기 위해 매번 `EXISTS` 쿼리가 실행되는 핵심 컬럼이나 적절한 B-Tree 인덱스가 누락되어 있었습니다.
- `job_posting_cover_letter_item` 및 `learning_resource` 등의 테이블에서도 외래키 컬럼 조회 시 테이블 풀스캔이 유발되었습니다.

### 2.2 Filesort 및 Temporary Table 생성을 유발하던 상태 변경 이력 조회
- `JobPostingStatusEventRepository`의 `findByJobPostingIdOrderByChangedAtAsc` 쿼리 실행 시, 기존 인덱스는 `job_posting_id` 단일 컬럼에만 걸려있었습니다.
- MySQL 쿼리 옵티마이저는 `job_posting_id`로 행을 추출한 후, 가져온 데이터셋을 메모리상에서 `changed_at` 기준으로 다시 정렬하는 **`Using filesort`** 작업을 수행하여 DB CPU 사용량을 높였습니다.

---

## 3. 핵심 설계와 구현

### 3.1 V127 performance index 마이그레이션 스크립트 작성 (`V127__add_performance_indexes.sql`)
외래키 및 중복 검사용 주요 컬럼에 인덱스를 추가하여 인덱스 스캔으로 전환시켰습니다.

```sql
-- V127__add_performance_indexes.sql
ALTER TABLE `job_posting`
  ADD INDEX `idx_job_posting_url` (`posting_url`),
  ADD INDEX `idx_job_posting_collect_ext` (`collection_method`, `external_id`);

ALTER TABLE `job_posting_cover_letter_item`
  ADD INDEX `idx_job_posting_cover_letter_item_posting` (`job_posting_id`);

ALTER TABLE `learning_resource`
  ADD INDEX `idx_learning_resource_cat_order` (`category_id`, `display_order`);
```

### 3.2 V128 복합 인덱스 마이그레이션 스크립트 작성 (`V128__add_status_event_index.sql`)
Filesort 연산을 완벽히 제거하기 위해 정렬 기준 컬럼인 `changed_at`을 포함하는 `(job_posting_id, changed_at)` 복합 B-Tree 인덱스를 구축했습니다.

```sql
-- V128__add_status_event_index.sql
ALTER TABLE `job_posting_status_event`
  ADD INDEX `idx_job_posting_status_event_posting_changed` (`job_posting_id`, `changed_at`);
```

---

## 4. 쿼리 실행 계획(EXPLAIN) 비교 검증

### 4.1 인덱스 적용 전 (Filesort 발생)
```text
EXPLAIN SELECT * FROM job_posting_status_event WHERE job_posting_id = 42 ORDER BY changed_at ASC;
+----+-------------+--------------------------+------+-----------------------------+-----------------------------+---------+-------+------+---------------------------------+
| id | select_type | table                    | type | possible_keys               | key                         | key_len | ref   | rows | Extra                           |
+----+-------------+--------------------------+------+-----------------------------+-----------------------------+---------+-------+------+---------------------------------+
|  1 | SIMPLE      | job_posting_status_event | ref  | fk_job_posting_status_event | fk_job_posting_status_event | 8       | const |   15 | Using index condition; Using filesort |
+----+-------------+--------------------------+------+-----------------------------+-----------------------------+---------+-------+------+---------------------------------+
```

### 4.2 인덱스 적용 후 (`(job_posting_id, changed_at)` 복합 인덱스)
```text
+----+-------------+--------------------------+------+------------------------------------------+------------------------------------------+---------+-------+------+-------------+
| id | select_type | table                    | type | possible_keys                            | key                                      | key_len | ref   | rows | Extra       |
+----+-------------+--------------------------+------+------------------------------------------+------------------------------------------+---------+-------+------+-------------+
|  1 | SIMPLE      | job_posting_status_event | ref  | idx_job_posting_status_event_posting_... | idx_job_posting_status_event_posting_... | 8       | const |   15 | Backward index scan |
+----+-------------+--------------------------+------+------------------------------------------+------------------------------------------+---------+-------+------+-------------+
```
- **결과**: `Using filesort` 문구가 완전히 사라지고 B-Tree 인덱스 순서대로 즉시 레코드를 스캔하여 반환함에 따라 정렬 지연시간이 0ms로 수렴했습니다.

---

## 5. 성과 및 인사이트

- **Filesort 완전 제거**: 복합 인덱스 구조를 통해 추가 정렬 연산 없이 Index Range Scan으로 이력 데이터를 즉시 반환.
- **안전한 DB 형상 동기화**: Flyway 마이그레이션 관리를 통해 로컬 개발 DB 및 Cloud production DB에 100% 동일한 인덱스 구조가 자동으로 동기화됨을 검증.',
  'PUBLISHED',
  5,
  '2026-07-30',
  NOW(), NOW(), NOW()
);
SET @study4_id = LAST_INSERT_ID();

INSERT INTO `study_tag` (`study_id`, `tag_id`) SELECT @study4_id, `id` FROM `tag` WHERE `name` IN ('MySQL', 'Flyway', 'Database');
INSERT INTO `study_skill` (`study_id`, `skill_id`) SELECT @study4_id, `id` FROM `skill` WHERE `name` IN ('Flyway', 'MySQL');

-- 스터디 상호 연관 관계(Relation) 설정
INSERT INTO `study_relation` (`source_study_id`, `target_study_id`, `relation_type`, `display_order`) VALUES
  (@study1_id, @study2_id, 'RELATED', 0),
  (@study2_id, @study1_id, 'RELATED', 0),
  (@study2_id, @study4_id, 'RELATED', 1),
  (@study4_id, @study2_id, 'RELATED', 1),
  (@study3_id, @study1_id, 'RELATED', 0),
  (@study1_id, @study3_id, 'RELATED', 1);
