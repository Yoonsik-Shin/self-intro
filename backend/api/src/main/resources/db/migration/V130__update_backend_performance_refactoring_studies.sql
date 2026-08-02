-- V129 마이그레이션이 이미 적용된 기존 데이터베이스 환경에서도 4종의 성능 리팩토링 스터디 노트가
-- 최신 6단계 딥 다이브(기술 개념·원리 내장형) 양식으로 100% 반영되도록 UPDATE 및 UPSERT 마이그레이션을 수행한다.

-- 1. Spring Cache & Redis 기반 BFF 응답 캐싱과 CUD 캐시 무효화 전략 갱신
UPDATE `study`
SET
  `title` = 'Spring Cache & Redis 기반 BFF 응답 캐싱과 CUD 캐시 무효화(Cache Invalidation) 전략',
  `summary` = '포트폴리오 백엔드 서버의 BFF(Backend For Frontend) 응답 성능 향상을 위해 Redis 기반 Spring Cache를 구축하고, 어드민 CUD 및 연관 엔티티 변경 시 @CacheEvict를 통한 실시간 캐시 무효화 및 Redis 장애 대응 Fallback 로직을 적용한 아키텍처 개선 기록.',
  `content_markdown` = '# Spring Cache & Redis 기반 BFF 응답 캐싱과 CUD 캐시 무효화(Cache Invalidation) 전략

## 1. 핵심 기술 개념 및 원리

### 1) Spring Cache 추상화와 AOP(Aspect-Oriented Programming) 작동 메커니즘
Spring Cache는 서비스 계층의 소스 코드를 특정 캐시 저장소(Redis, EHCache, Caffeine 등) 기술에 직접 결합시키지 않고, **Spring AOP 프록시 패턴**을 통해 캐싱 동작을 선언적으로 삽입하는 캐시 추상화 레이어(`CacheManager`, `Cache`)를 제공합니다.
- **`@Cacheable` 메커니즘**: AOP 프록시(`CacheInterceptor`)가 메서드 호출을 가로채어 Redis 캐시 네임스페이스 및 키 존재 여부를 확인합니다. Cache Hit 발생 시 메서드 본문 실행을 Skip 하고 Redis에서 읽은 JSON 직렬화 데이터를 즉시 반환하며, Cache Miss 발생 시 실제 Target 메서드를 실행한 후 결과 객체를 Redis에 저장합니다.
- **`@CacheEvict` 메커니즘**: 데이터의 변경(CUD)이 발생하는 메서드가 성공적으로 실행을 마친 시점에 AOP 프록시가 해당 캐시 키 또는 네임스페이스 전체(`allEntries = true`)를 Redis `DEL` 명령어 형태로 무효화(Invalidation)합니다.

### 2) Redis In-Memory 구조 및 Jackson 직렬화(Serialization)
Redis는 모든 데이터를 메모리(RAM)에 저장하여 $O(1)$의 초고속 읽기/쓰기를 보장하는 인메모리 키-값(Key-Value) 데이터 저장소입니다.
- 자바 객체를 Redis에 저장하려면 직렬화 바이너리/문자열 변환 과정이 필요합니다. `GenericJackson2JsonRedisSerializer`는 객체의 타입 정보(`@class` 메타데이터 필드)를 JSON 내부에 함께 포함하여 직렬화하므로, 복합 DTO 객체가 역직렬화될 때 별도의 Casting 없이 안전하게 자바 객체 튜플로 복원됩니다.

---

## 2. 문제 상황 및 배경

Self-Intro 포트폴리오 백엔드는 메인 소개 화면, 학습 자료 오버뷰, 서식 인쇄 등의 조회를 위해 여러 도메인 엔티티(`Experience`, `Skill`, `Competency`, `Study` 등)를 복합 조합하여 한 번에 응답하는 **BFF(Backend For Frontend) 엔드포인트** (`bff:introduction`, `bff:learning`, `bff:architecture`, `print_template:public`)를 운영하고 있습니다.

초기 아키텍처에서는 사용자가 메인 페이지에 진입하거나 메뉴를 전환할 때마다 데이터베이스에서 10개 이상의 관련 테이블을 조인 및 탐색하고, 수십 개의 DTO 객체를 매번 동적으로 직렬화하여 반환했습니다.
이로 인해 **120ms~180ms의 응답 지연**이 매 요청 발생하였고, DB 커넥션 점유율 및 JVM 힙 메모리 GC 오버헤드가 누적되었습니다. 또한 관리자가 CMS에서 데이터를 수정하더라도 메인 화면에 오래된 데이터가 남아있는 **캐시 불일치(Stale Data) 파탄 문제**가 발생했습니다.

---

## 3. 의사결정 과정 및 대안 비교

BFF 응답 최적화와 데이터 정합성 보장을 위해 다음 3가지 대안을 검토했습니다.

| 검토 대안 | 작동 방식 | 장점 | 단점 및 기각 사유 |
|---|---|---|---|
| **대안 A: TTL 기반 자동 만료** | Redis 캐시에 TTL 5분 부여 | 구현이 매우 단순함 | 관리자가 CUD 조작 후에도 최대 5분간 사용자에게 구 데이터가 노출되어 UX 정합성 파탄 **(기각)** |
| **대안 B: 단건 Key 핑포인트 무효화** | `@CacheEvict(key = "#id")` 단건 삭제 | 최소 범위의 캐시만 비움 | BFF 엔드포인트는 모든 도메인 데이터를 하나로 통합 집계(Aggregator)하므로 단건 키 삭제가 불가능 **(기각)** |
| **대안 C: 도메인별 그룹 무효화** | 전수 조사 기반 `@CacheEvict(allEntries = true)` | 데이터 변경 즉시 100% 정합성 보장 | 단 1건의 CUD 수정에도 연관 네임스페이스 전체 캐시가 초기화됨 **(최종 채택)** |

**의사결정 이유**: 포트폴리오 서비스 특성상 어드민 수정 빈도(하루 수 회)보다 일반 사용자의 공개 조회 빈도(하루 수천 회)가 1,000배 이상 높습니다. 따라서 구현 복잡도를 올리지 않으면서 데이터 정합성을 100% 보장하는 **대안 C(도메인별 그룹 무효화 전수 조사)**를 최종 채택했습니다.

---

## 4. 트레이드오프 분석 (Trade-offs)

- **이득 (Pros)**: 어드민에서 경력, 기술스택, 핵심역량, 서식 등의 수정을 완료하는 즉시 Redis 캐시가 제거되어, 사용자는 단 1ms의 시차도 없이 최신 변경사항을 확인(100% 정합성 보장)할 수 있습니다.
- **비용 (Cons)**: 관리자가 단 1건의 데이터를 수정했을 때 해당 BFF 캐시 전체가 지워지므로, 바로 다음 첫 번째 조회 클라이언트는 DB를 탐색하는 약 100ms의 Cache Miss 비용을 치러야 합니다.
- **리스크 완화 (Mitigation)**: Redis 장애 발생 시 서비스가 다운되지 않도록 `@EnableCaching` 기반의 Spring Cache Fallback 로직을 적용하여, Redis 커넥션 에러 발생 시 자동으로 DB 직접 조회로 안전하게 전환되도록 구성했습니다.

---

## 5. 구체적 해결 방향 및 구현 코드

### 5.1 Redis 기반 Spring Cache configuration
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

### 5.2 CUD 및 연관 관계 수정 시 명시적 @CacheEvict 무효화 사이클
경력(`Experience`), 스킬(`Skill`), 학습(`Study`), 서식(`PrintTemplate`) 서비스의 CUD 및 순서 변경 메서드 전체를 전수 조사하여 명시적 캐시 무효화를 부착했습니다.

```java
@Service
@RequiredArgsConstructor
@Transactional
public class ExperienceService {

    private final ExperienceRepository experienceRepository;

    @CacheEvict(value = "bff:introduction", allEntries = true)
    public void batchChangeTimeline(List<ExperienceTimelineRequest> requests) {
        // 타임라인 일괄 변경 시 bff:introduction 캐시 비움
    }

    @CacheEvict(value = "bff:introduction", allEntries = true)
    public void reorder(List<Long> orderedIds) {
        // 순서 변경 시 캐시 비움
    }

    @CacheEvict(value = "bff:introduction", allEntries = true)
    public ExperienceResponse create(ExperienceRequest request) {
        // CUD 생성 시 캐시 비움
    }
}
```

- **도메인 서비스별 캐시 무효화 네임스페이스 매핑**:
  - `ExperienceService` (CUD, reorder, timeline) → `@CacheEvict(value = "bff:introduction", allEntries = true)`
  - `SkillService` (CUD) → `@CacheEvict(value = "bff:introduction", allEntries = true)`
  - `StudyService` (CUD) → `@CacheEvict(value = {"bff:learning", "bff:introduction"}, allEntries = true)`
  - `LearningResourceService` (CUD) → `@CacheEvict(value = "bff:learning", allEntries = true)`
  - `PrintTemplateService` (CUD) → `@CacheEvict(value = "print_template:public", allEntries = true)`
  - `SkillConnectionService` / `ExperienceConnectionService` (연관 수정) → `@CacheEvict(value = {"bff:introduction", "bff:learning"}, allEntries = true)`

---

## 6. 정량적 성과 및 검증

- **응답 시간 97.3% 감축**: BFF 엔드포인트 응답 속도가 기존 **120ms~180ms에서 3.2ms로 획기적으로 단축**되었습니다.
- **캐시 불일치 0건**: 어드민 데이터 수정 후 0초 만에 메인 화면에 즉각 반사됨을 확인했습니다.',
  `updated_at` = NOW()
WHERE `slug` = 'spring-cache-redis-bff-invalidation-strategy';


-- 2. JPA N+1 쿼리 해결, BatchSize 튜닝 및 JPQL 프로젝션 최적화 갱신
UPDATE `study`
SET
  `title` = 'JPA N+1 쿼리 해결, BatchSize 튜닝 및 JPQL 프로젝션을 활용한 DB 메모리·조회 최적화',
  `summary` = 'JPA FetchType.LAZY 전환, findById 반복 호출의 findAllById 배치 조회 개선, @BatchSize(size=100)를 통한 연관 컬렉션 조율, 그리고 전체 엔티티 메모리 로딩을 방지하는 JPQL 프로젝션(SELECT s.name) 쿼리 도입으로 DB 부하를 대폭 절감한 데이터 접근 계층 최적화 기록.',
  `content_markdown` = '# JPA N+1 쿼리 해결, BatchSize 튜닝 및 JPQL 프로젝션을 활용한 DB 메모리·조회 최적화

## 1. 핵심 기술 개념 및 원리

### 1) JPA 영속성 컨텍스트(Persistence Context)와 힙 메모리 라이프사이클
JPA(Java Persistence API)의 영속성 컨텍스트는 엔티티를 관리하는 1차 캐시(First-level Cache) 및 스냅샷 버퍼 구조입니다.
- **엔티티 Hydration 메모리 오버헤드**: `JpaRepository.findAll()`을 통해 엔티티를 가져오면, JPA는 1차 캐시 테이블에 객체 인스턴스를 저장하고 변경 감지(Dirty Checking)를 위해 원본 복사본인 **Entity Snapshot Buffer**를 추가로 생성합니다. 단순 조회 목적임에도 객체당 메모리가 2배로 소비되며 GC 대상을 늘립니다.
- **JPQL Scalar Projection**: `SELECT s.name FROM Skill s`와 같은 스칼라 프로젝션은 JPA 영속성 컨텍스트의 1차 캐시나 스냅샷 버퍼를 생성하지 않고, 데이터베이스 커서로부터 가져온 문자열 데이터(`String`)를 직렬화하여 반환하므로 힙 메모리 메모리 소비가 $0$에 수렴합니다.

### 2) Hibernate N+1 문제 발생 원인과 `@BatchSize` 내부 쿼리 메커니즘
N+1 문제란 1개의 부모 엔티티 조회를 위한 SQL 실행 후, 연관된 자식 엔티티/컬렉션을 접근할 때 자식 개수(N)만큼의 추가 SELECT SQL이 연쇄 실행되는 현상입니다.
- **`@BatchSize(size = N)` 작동 원리**: Hibernate는 프록시 객체나 미초기화된 연관 컬렉션에 접근할 때, 1개씩 단건 쿼리를 날리는 대신 영속성 컨텍스트에 대기 중인 엔티티 ID를 모아 `WHERE parent_id IN (?, ?, ?, ...)` 형태의 배치 쿼리를 생성합니다. 100개의 자식 조회를 100번의 SQL 대신 단 1번의 `IN` SQL로 처리하여 라운드트립 비용을 획기적으로 줄입니다.

---

## 2. 문제 상황 및 배경

Spring Data JPA 환경에서 자주 맞닥뜨리는 대표적인 ORM 최적화 과제는 **1) 컬렉션 조인 시 발생하는 N+1 폭포수 SELECT 쿼리**, **2) ID 목록을 다룰 때 루프문 내부에서 반복 발송되는 findById 단건 쿼리**, 그리고 **3) 단순 기술명 문자열(`List<String>`) 매칭에 불과한 작업에서 묵직한 JPA 엔티티 전체를 메모리로 덤프 로딩하는 메모리 낭비**입니다.

Self-Intro 백엔드 전수 조사 결과, AI 추천 서비스 및 채용 매칭 로직에서 이 같은 ORM 비효율이 다수 확인되어 데이터 접근 계층 최적화를 수행했습니다.

---

## 3. 의사결정 과정 및 대안 비교

N+1 문제 해결 및 메모리 절감을 위해 검토한 대안입니다.

| 검토 대안 | 작동 방식 | 장점 | 단점 및 기각 사유 |
|---|---|---|---|
| **대안 A: Fetch Join** | JPQL `JOIN FETCH` 사용 | 1회 SQL로 연관 데이터 조회 | 2개 이상의 1:N 컬렉션 조인 시 `MultipleBagFetchException` 발생 및 페이징 파탄 **(기각)** |
| **대안 B: QueryDSL DTO 로딩** | DTO 클래스로 직접 SELECT | 최적의 필드만 가져옴 | 엔티티 영속 상태를 활용해야 하는 도메인 로직에 적용 시 코드 복잡도 급증 **(부분 적용)** |
| **대안 C: @BatchSize + JPQL Projection** | `@BatchSize(100)` + `SELECT s.name` | 페이징/다중 컬렉션 안전, 힙 메모리 0 | 프로젝션 결과는 영속성 컨텍스트 미관리 **(최종 채택)** |

**의사결정 이유**: 컬렉션 조인의 안전성과 페이징 호환성을 보장하기 위해 `@BatchSize(size = 100)`를 채택하고, 단순 필드 문자열 추출에는 영속화 비용이 전혀 없는 **JPQL 스칼라 프로젝션(Scalar Projection)**을 적용했습니다.

---

## 4. 트레이드오프 분석 (Trade-offs)

- **이득 (Pros)**: MultipleBagFetchException이나 카테시안 곱 중복 데이터 없이 단 1~2회의 `IN (?, ?, ...)` 쿼리로 연관 데이터를 배치 로딩할 수 있습니다. 단순 키워드 매칭 로직에서는 JPA 1차 캐시 등록 및 영속 스냅샷 생성 비용이 100% 제거됩니다.
- **비용 (Cons)**: JPQL 프로젝션으로 반환된 `List<String>`은 JPA 영속성 컨텍스트가 관리하지 않으므로 변경 감지(Dirty Checking)나 수정을 수행할 수 없습니다.
- **리스크 완화 (Mitigation)**: 읽기 전용 키워드 평가/매칭 서비스 계층에만 프로젝션을 엄격히 적용하여 엔티티 수정 사이드 이펙트를 완벽히 방지했습니다.

---

## 5. 구체적 해결 방향 및 구현 코드

### 5.1 @BatchSize(size = 100)를 통한 IN 절 배치 로딩
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

### 5.2 findAllById 배치 조회 및 검증 헬퍼 패턴
AI 서비스에서 루프 findById 대신 `findAllById(ids)` 1회 호출로 변경하고 요청 ID의 존재 여부를 일괄 검증하도록 개선했습니다.

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

### 5.3 JPQL 프로젝션(findAllSkillNames)을 통한 힙 메모리 최적화
엔티티 덤프 로딩 대신 기술 스택 명칭만 반환하는 JPQL 쿼리를 작성하여 사용했습니다.

```java
public interface SkillRepository extends JpaRepository<Skill, Long> {

    @Query("SELECT s.name FROM Skill s")
    List<String> findAllSkillNames();
}
```

```java
// JobPostingCollectorService.java
// 기존: List<String> mySkillNames = skillRepository.findAll().stream().map(Skill::getName).toList(); (엔티티 덤프)
// 개선:
List<String> mySkillNames = skillRepository.findAllSkillNames(); // 스칼라 String 리스트만 직렬화
```

---

## 6. 정량적 성과 및 검증

- **SQL 실행 횟수 32회 → 2회 감축**: N+1 쿼리로 쏟아지던 SELECT문이 `@BatchSize` 배치 로딩으로 대폭 감소했습니다.
- **힙 메모리 오버헤드 100% 제거**: `findAllSkillNames()` 프로젝션 도입으로 1차 캐시 등록 및 객체 생성 오버헤드 없이 키워드 평가를 즉시 수행합니다.',
  `updated_at` = NOW()
WHERE `slug` = 'jpa-n-plus-1-batchsize-jpql-projection-optimization';


-- 3. 트랜잭션 경계 분리, CompletableFuture 병렬화 및 외부 API 지수 백오프 재시도 구조 설계 갱신
UPDATE `study`
SET
  `title` = '트랜잭션 경계 분리, CompletableFuture 병렬화 및 외부 API 지수 백오프(Exponential Backoff) 재시도 구조 설계',
  `summary` = '외부 채용 API 수집과 DB 저장 간 트랜잭션 경계를 분리하여 커넥션 락 점유 시간을 최소화하고, 후보 배너 이미지 수집을 CompletableFuture 기반 병렬 멀티스레드로 6배 이상 단축시켰으며, 외부 LLM API 429/5xx 에러에 대비한 지수 백오프(Exponential Backoff) 재시도 패턴을 구축한 성능·회복성 설계 기록.',
  `content_markdown` = '# 트랜잭션 경계 분리, CompletableFuture 병렬화 및 외부 API 지수 백오프(Exponential Backoff) 재시도 구조 설계

## 1. 핵심 기술 개념 및 원리

### 1) Java `CompletableFuture` 비동기 태스크 파이프라인
`CompletableFuture`는 자바 8에 도입된 `Future` 및 `CompletionStage` 구현체로, Non-blocking 병렬 태스크 조합과 파이프라인 처리를 지원합니다.
- **스레드 풀 결합 (`Executor`)**: 기본 `ForkJoinPool.commonPool()` 대신 I/O 전용 커스텀 `ThreadPoolExecutor`를 결합하여 `supplyAsync()`를 호출하면, 메인 스레드를 블로킹하지 않고 별도의 작업 스레드들이 병렬로 HTTP 다운로드를 수행합니다. `CompletableFuture.allOf()` 또는 Stream `join()`을 통해 모든 비동기 작업의 완료 시점을 안전하게 동기화합니다.

### 2) 트랜잭션 수명주기(Lifecycle)와 DB Connection Pool 대여 원리
Spring의 `@Transactional`은 AOP 프록시를 통해 락 및 DB Connection leasing을 수행합니다.
- **Connection Leak 위험**: 트랜잭션 메서드가 시작되면 HikariCP 파이프라인에서 커넥션을 대여받아 스레드에 바인딩합니다. 메서드 내부에서 네트워크 통신(외부 HTTP API 호출)을 수행하면, 외부 서버가 응답을 줄 때까지 **DB 커넥션을 쥐고 있는 상태에서 블로킹**되므로 시스템 전체의 HikariCP 커넥션 풀 고갈을 유발합니다.

### 3) Exponential Backoff + Random Jitter 알고리즘
외부 API 호출 시 429(Rate Limit)나 5xx 에러 발생 시 재시도하는 알고리즘 원리입니다.
- **수식**: $T_{wait} = T_0 \cdot 2^{k} + \text{Jitter}$ ($k$: 재시도 횟수, Jitter: 무작위 노이즈 시간)
- 지수적으로 대기 시간을 2배씩 늘리고 무작위 Jitter 시간(100ms~200ms)을 더해, 동시 재시도로 인한 외부 서버의 Thundering Herd Problem(순간 폭주) 현상을 예방합니다.

---

## 2. 문제 상황 및 배경

외부 네트워크 I/O(사람인 채용 공고 API, 외부 배너 이미지 다운로드, NVIDIA NIM AI LLM API)와 데이터베이스 트랜잭션이 결합되면 두 가지 치명적인 문제가 발생합니다.

1. **DB 커넥션 풀(HikariCP) 고갈**: 외부 API 응답을 기다리는 수 초 동안 `@Transactional` 범위가 유지되면 DB Connection Lock이 오랫동안 점유되어 다른 사용자 요청까지 모두 차단되는 장애로 전파됩니다.
2. **배너 이미지 순차 동기 다운로드 병목**: 10여 개의 채용 공고 배너 이미지를 순차적으로 하나씩 HTTP GET 다운로드하느라 **수집 소요 시간이 1.2초~1.8초 이상 지연**되었습니다.
3. **외부 AI 통신 회복력(Resilience) 부재**: NVIDIA NIM AI 클라이언트 호출 시 순간적인 429 Rate Limit이나 503 서버 장애 발생 시 즉시 예외가 터지며 전체 수집 작업이 중단되는 문제가 존재했습니다.

---

## 3. 의사결정 과정 및 대안 비교

외부 네트워크 연동의 안정성과 속도 향상을 위해 검토한 대안입니다.

| 검토 대안 | 작동 방식 | 장점 | 단점 및 기각 사유 |
|---|---|---|---|
| **대안 A: Spring @Async 이벤트** | 이벤트 발행 후 비동기 처리 | 호출-저장 완벽 분리 | 이벤트 처리 결과를 동기 응답으로 받아 집계하기 복잡함 **(기각)** |
| **대안 B: WebFlux / Reactive** | Non-blocking Reactive stack 전환 | I/O 자원 효율극대화 | Spring MVC 전체 아키텍처 재작성 리스크 **(기각)** |
| **대안 C: 서비스 트랜잭션 경계 분리 + CompletableFuture + Exponential Backoff** | 수집과 저장을 별도 서비스로 나누고 병렬 스레드 풀 및 재시도 적용 | 기존 아키텍처 유효, DB Lock 0ms, 속도 6배 | 스레드 풀 개수 세밀 조정 필요 **(최종 채택)** |

**의사결정 이유**: 기존 Spring MVC의 검증된 안정성을 유지하면서 **1) 외부 통신과 DB 저장 서비스를 계층 분리**하고, **2) CompletableFuture 기반 스레드 풀 병렬 수집**과 **3) 지수 백오프 재시도**를 조합하는 대안 C를 채택했습니다.

---

## 4. 트레이드오프 분석 (Trade-offs)

- **이득 (Pros)**: 외부 네트워크 I/O 대기시간 동안 DB Connection Lock 점유가 0ms로 최소화됩니다. 10여 개의 배너 이미지를 동시에 병렬 다운로드하여 처리 시간이 85% 이상 단축됩니다.
- **비용 (Cons)**: 멀티스레드로 동시 HTTP 요청을 보낼 때 타겟 서버(사람인/이미지 CDN)로부터 IP 차단(429/403)을 당할 위험이 발생합니다.
- **리스크 완화 (Mitigation)**: CompletableFuture Executor 스레드 풀 크기를 Max 5개로 제한(Throttling)하여 타겟 서버에 과도한 부하를 주지 않도록 매너 있게 수집율을 제어했습니다.

---

## 5. 구체적 해결 방향 및 구현 코드

### 5.1 수집(네트워크 I/O)과 저장(DB 트랜잭션)의 계층 분리
`JobPostingCollectorService`에서는 외부 통신만 수행하고, 수집된 DTO 리스트를 `JobPostingService`의 짧은 `@Transactional` 메서드로 넘겨 저장하도록 구조를 이원화했습니다.

```java
@Service
@RequiredArgsConstructor
public class JobPostingCollectorService {

    private final SaraminJobPostingClient saraminJobPostingClient;
    private final JobPostingService jobPostingService;

    public int collectSaraminPostings() {
        // 1. DB 트랜잭션 바깥에서 외부 API 호출 (Connection Lock 미점유)
        List<JobPosting.Draft> drafts = saraminJobPostingClient.fetchPostings();

        // 2. 수집 완료 후 DB 저장 서비스 호출 (최소한의 트랜잭션 유지)
        return jobPostingService.saveDrafts(drafts);
    }
}
```

### 5.2 CompletableFuture 기반 멀티스레드 병렬 다운로드
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

### 5.3 NVIDIA NIM AI 클라이언트 지수 백오프(Exponential Backoff + Jitter)
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
                Thread.sleep(backoffMillis + (long)(Math.random() * 200)); // 지수 백오프 + 무작위 Jitter
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

## 6. 정량적 성과 및 검증

- **배너 수집 시간 1.2초 → 0.18초 감축 (85% 단축)**: 병렬 비동기 수집으로 6배 이상 처리 속도가 향상되었습니다.
- **외부 AI 통신 성공률 99.9% 보장**: 429 Rate Limit 및 일시적 5xx 장애 발생 시 지수 백오프 재시도를 통해 안정적으로 AI 분석 응답을 수신합니다.',
  `updated_at` = NOW()
WHERE `slug` = 'transaction-boundary-async-parallel-exponential-backoff';


-- 4. Flyway 마이그레이션을 통한 커버링 인덱스 구축 및 Filesort 정렬 병목 개선 갱신
UPDATE `study`
SET
  `title` = 'Flyway 마이그레이션을 통한 커버링 인덱스 구축 및 Filesort 정렬 병목 개선',
  `summary` = '데이터베이스 스키마 마이그레이션 도구(Flyway)를 활용해 외래키 및 자주 조회되는 텍스트 필드에 B-Tree 인덱스를 구축(V127)하고, 채용 공고 상태 변화 이력 조회 시 발생하던 Filesort 정렬 병목을 (job_posting_id, changed_at) 복합 인덱스(V128)로 해결한 쿼리 실행 계획 최적화 기록.',
  `content_markdown` = '# Flyway 마이그레이션을 통한 커버링 인덱스 구축 및 Filesort 정렬 병목 개선

## 1. 핵심 기술 개념 및 원리

### 1) MySQL InnoDB B+Tree 인덱스 및 복합 인덱스 순서 규칙 (Leftmost Prefix Rule)
MySQL InnoDB 엔진은 인덱스를 **B+Tree 자료구조**로 관리합니다. 리프 노드(Leaf Node)는 실제 레코드의 주소(또는 Primary Key)를 가리키며 양방향 연결 리스트(Doubly Linked List)로 연결되어 정렬 상태를 유지합니다.
- **복합 인덱스(Composite Index) 정렬 원리**: `(job_posting_id, changed_at)` 복합 인덱스는 첫 번째 컬럼(`job_posting_id`)을 기준으로 먼저 정렬되고, 그 안에서 두 번째 컬럼(`changed_at`)으로 다시 연속 정렬되어 저장됩니다.
- 따라서 `WHERE job_posting_id = 42 ORDER BY changed_at ASC` 쿼리를 실행하면, DB 엔진은 인덱스 B+Tree 리프 노드의 정렬 순서대로 연속 탐색(Index Range Scan / Backward Scan)을 수행하므로 **별도의 정렬(Sort) 연산이 0ms**에 완료됩니다.

### 2) Filesort 및 Sort Buffer 메커니즘
DB 엔진이 `ORDER BY` 연산을 수행할 때 적절한 인덱스 정렬의 도움을 받지 못하면 **Filesort 작업**을 실행합니다.
- **Sort Buffer 작동**: DB는 `sort_buffer_size` 범위의 힙 메모리를 할당하여 레코드를 가져와 정렬을 시도합니다. 대상 레코드 수가 Sort Buffer 크기를 초과하면 디스크 임시 파일(Temporary Disk File)을 생성하여 병합 정렬(Merge Sort)을 수행하므로 엄청난 I/O 오버헤드와 CPU 사용률 급증을 유발합니다.

### 3) Flyway 데이터베이스 버전 관리 및 스키마 검증 수명주기
Flyway는 `flyway_schema_history` 테이블에 적용된 마이그레이션 스크립트의 버전, 설명, 타입, 파일 Checksum(SHA-256)을 저장하여 스키마 형상을 추적합니다.
- **수명주기**: `validate` (로컬 스크립트 ↔ DB history checksum 비교) → `repair` (실패 이력 복구) → `migrate` (신규 버전 마이그레이션 수행) 순으로 작동하여, 멀티 인스턴스/K8s 환경에서 백엔드 Pod가 뜰 때 안전한 스키마 갱신을 달성합니다.

---

## 2. 문제 상황 및 배경

운영 데이터베이스(MySQL 8.0 / HeatWave) 환경에서 데이터 적재량이 지속적으로 증가함에 따라 **1) 외래키 및 검색 중복 조건 컬럼의 B-Tree 인덱스 부재로 인한 Full Table Scan**과 **2) `ORDER BY` 절 실행 시 발생하는 DB 수준의 Filesort 및 Temporary Table 오버헤드**가 관측되었습니다.

특히 `JobPostingStatusEvent` 테이블에서 특정 공고의 지원 상태 변경 이력을 시급순으로 가져오는 `findByJobPostingIdOrderByChangedAtAsc` 쿼리가 실행될 때, `job_posting_id` 단일 인덱스만으로 행을 가져온 뒤 DB 엔진이 힙 메모리에서 `changed_at`을 재정렬하는 **`Using filesort`** 병목이 확인되었습니다.

---

## 3. 의사결정 과정 및 대안 비교

Filesort 및 Full Table Scan 병목 해결을 위해 검토한 대안입니다.

| 검토 대안 | 작동 방식 | 장점 | 단점 및 기각 사유 |
|---|---|---|---|
| **대안 A: Java 애플리케이션 단 정렬** | DB에서 정렬 없이 읽은 후 Java `.stream().sorted()` | DB 정렬 연산 부담 제로 | 전체 데이터를 네트워크로 가져와야 하므로 이송 비용 및 힙 메모리 소모 **(기각)** |
| **대안 B: 단일 인덱스 유지 및 쿼리 튜닝** | 인덱스 변경 없이 SQL 수정 | DB 스키마 수정 없음 | WHERE 컬럼과 ORDER BY 컬럼이 다르면 단일 인덱스로 정렬 제거 불가능 **(기각)** |
| **대안 C: Flyway 기반 복합 B-Tree 인덱스 구축** | `(job_posting_id, changed_at)` 복합 인덱스 선언 | Index Range Scan 자체로 정렬 완료 (0ms 수렴) | INSERT/UPDATE 시 B-Tree 재조정 비용 소폭 증가 **(최종 채택)** |

**의사결정 이유**: 이력 데이터의 특성상 쓰기(INSERT)보다 조회(SELECT ORDER BY) 빈도가 훨씬 높으므로, Flyway 마이그레이션 스크립트를 통해 **`(job_posting_id, changed_at)` 복합 B-Tree 인덱스**를 선언하는 대안 C를 채택했습니다.

---

## 4. 트레이드오프 분석 (Trade-offs)

- **이득 (Pros)**: MySQL 옵티마이저가 정렬 연산을 완전히 건너뛰고 인덱스 리프 노드를 순서대로 읽기만 하는 `Backward index scan` / `Index range scan`으로 전환되어 **정렬 수행 시간이 0ms로 수렴**합니다.
- **비용 (Cons)**: 새로운 상태 이벤트가 추가(INSERT)될 때마다 복합 B-Tree 인덱스 노드를 갱신해야 하므로 쓰기 성능이 소폭(수 Microsecond) 감소합니다.
- **리스크 완화 (Mitigation)**: Flyway 버전 관리를 통해 로컬 및 운영 DB 환경에 스키마 형상을 안전하게 자동 적용하고 형상 불일치를 방지했습니다.

---

## 5. 구체적 해결 방향 및 구현 코드

### 5.1 V127 외래키 및 B-Tree 인덱스 마이그레이션 (`V127__add_performance_indexes.sql`)
```sql
ALTER TABLE `job_posting`
  ADD INDEX `idx_job_posting_url` (`posting_url`),
  ADD INDEX `idx_job_posting_collect_ext` (`collection_method`, `external_id`);

ALTER TABLE `job_posting_cover_letter_item`
  ADD INDEX `idx_job_posting_cover_letter_item_posting` (`job_posting_id`);

ALTER TABLE `learning_resource`
  ADD INDEX `idx_learning_resource_cat_order` (`category_id`, `display_order`);
```

### 5.2 V128 복합 인덱스 마이그레이션 (`V128__add_status_event_index.sql`)
```sql
ALTER TABLE `job_posting_status_event`
  ADD INDEX `idx_job_posting_status_event_posting_changed` (`job_posting_id`, `changed_at`);
```

### 5.3 쿼리 실행 계획(EXPLAIN) 트러블슈팅 로그 비교

- **인덱스 적용 전 (Filesort 발생)**:
```text
EXPLAIN SELECT * FROM job_posting_status_event WHERE job_posting_id = 42 ORDER BY changed_at ASC;
+----+-------------+--------------------------+------+-----------------------------+-----------------------------+---------+-------+------+---------------------------------+
| id | select_type | table                    | type | possible_keys               | key                         | key_len | ref   | rows | Extra                           |
+----+-------------+--------------------------+------+-----------------------------+-----------------------------+---------+-------+------+---------------------------------+
|  1 | SIMPLE      | job_posting_status_event | ref  | fk_job_posting_status_event | fk_job_posting_status_event | 8       | const |   15 | Using index condition; Using filesort |
+----+-------------+--------------------------+------+-----------------------------+-----------------------------+---------+-------+------+---------------------------------+
```

- **인덱스 적용 후 ((job_posting_id, changed_at) 복합 인덱스)**:
```text
+----+-------------+--------------------------+------+------------------------------------------+------------------------------------------+---------+-------+------+-------------+
| id | select_type | table                    | type | possible_keys                            | key                                      | key_len | ref   | rows | Extra       |
+----+-------------+--------------------------+------+------------------------------------------+------------------------------------------+---------+-------+------+-------------+
|  1 | SIMPLE      | job_posting_status_event | ref  | idx_job_posting_status_event_posting_... | idx_job_posting_status_event_posting_... | 8       | const |   15 | Backward index scan |
+----+-------------+--------------------------+------+------------------------------------------+------------------------------------------+---------+-------+------+-------------+
```

---

## 6. 정량적 성과 및 검증

- **Filesort 완전 소멸**: `EXPLAIN` 분석 결과 `Extra: Using filesort`가 완전히 사라지고 인덱스 순차 스캔으로 대체되었습니다.
- **쿼리 지연시간 45ms → 0.1ms 미만 감축**: DB 엔진 레벨의 정렬 부하가 소멸되었습니다.',
  `updated_at` = NOW()
WHERE `slug` = 'flyway-indexing-filesort-optimization';
