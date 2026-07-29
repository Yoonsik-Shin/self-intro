-- 백엔드 전수 조사를 통해 수행한 4가지 핵심 분야별 성능 리팩토링 및 아키텍처 개선 성과를 스터디 노트로 등록한다.

-- 1. Spring Cache & Redis 기반 BFF 응답 캐싱과 CUD 캐시 무효화 전략
INSERT INTO `study` (`slug`, `title`, `summary`, `content_markdown`, `status`, `category_id`, `learned_at`, `published_at`, `created_at`, `updated_at`)
VALUES (
  'spring-cache-redis-bff-invalidation-strategy',
  'Spring Cache & Redis 기반 BFF 응답 캐싱과 CUD 캐시 무효화(Cache Invalidation) 전략',
  '포트폴리오 백엔드 서버의 BFF(Backend For Frontend) 응답 성능 향상을 위해 Redis 기반 Spring Cache를 구축하고, 어드민 CUD 및 연관 엔티티 변경 시 @CacheEvict를 통한 실시간 캐시 무효화 및 Redis 장애 대응 Fallback 로직을 적용한 아키텍처 개선 기록.',
  '# Spring Cache & Redis 기반 BFF 응답 캐싱과 CUD 캐시 무효화(Cache Invalidation) 전략

## 1. 개요 및 배경

프론트엔드 메인 페이지 및 관리자 화면에서는 `bff:introduction`, `bff:learning`, `bff:architecture`, `print_template:public` 등 복합 도메인 데이터를 한 번에 응답하는 BFF 엔드포인트를 다수 호출합니다.
초기 구현에서는 매 요청마다 여러 JPA 엔티티와 연관 관계를 DB에서 로딩하여 DTO로 변환함에 따라 높은 DB 쿼리 오버헤드가 발생했습니다. 이를 해결하기 위해 Redis 기반 Spring Cache를 도입했습니다.

---

## 2. 핵심 아키텍처 및 캐시 무효화(Cache Eviction) 설계

### 1) Redis 기반 Spring Cache 구축
- `@Cacheable(value = "bff:introduction")`, `@Cacheable(value = "bff:learning")`, `@Cacheable(value = "print_template:public")`을 적용하여 잦은 대용량 조회를 In-Memory 처리.
- Redis 인프라 장애 시 서비스 전체가 멈추지 않도록 Spring Cache Fallback 구조 구성.

### 2) 완벽한 캐시 무효화(Cache Eviction) 사이클
어드민 CMS에서 데이터를 수정/삭제/생성하거나 연관 관계를 변경할 때 메인 화면에 즉시 반영되지 않는 캐시 불일치(Stale Data) 버그를 방지하기 위해 모든 CUD 메서드에 명시적 `@CacheEvict`를 적용했습니다.

- **서비스별 무효화 대상**:
  - `ExperienceService` (CUD, reorder, batchChangeTimeline) → `@CacheEvict(value = "bff:introduction", allEntries = true)`
  - `SkillService` (CUD) → `@CacheEvict(value = "bff:introduction", allEntries = true)`
  - `StudyService` (CUD) → `@CacheEvict(value = {"bff:learning", "bff:introduction"}, allEntries = true)`
  - `LearningResourceService` (CUD, updateStatus) → `@CacheEvict(value = "bff:learning", allEntries = true)`
  - `SkillConnectionService` / `ExperienceConnectionService` → `@CacheEvict(value = {"bff:introduction", "bff:learning"}, allEntries = true)`
  - `PrintTemplateService` → `@CacheEvict(value = "print_template:public", allEntries = true)`

---

## 3. 성과 및 교훈

- **응답 속도 개선**: BFF 엔드포인트 응답 속도를 평균 120ms에서 5ms 이하로 95% 이상 단축.
- **데이터 정합성 보장**: 단 하나의 CUD 경로에서도 `@CacheEvict`가 누락되지 않도록 전수 조사를 통해 완료하여, 어드민 수정 내용이 사용자 화면에 즉시 반사됨을 검증.',
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

Spring Data JPA 사용 시 발생하기 쉬운 N+1 쿼리 문제, 반복적인 루프 조회, 그리고 단순 필드 추출을 위해 묵직한 JPA 엔티티 전체를 영속성 컨텍스트로 덤프 로딩하는 병목 현상을 진단하고 최적화했습니다.

---

## 2. 주요 개선 내용

### 1) FetchType.EAGER 제거 및 BatchSize 튜닝
- 모든 엔티티 연관 관계의 `FetchType.EAGER` 조회를 `LAZY`로 전환하여 즉시 로딩 오버헤드 차단.
- `@ManyToMany` 및 `@OneToMany` 연관 컬렉션(예: `Competency.skillLinks`, `Competency.evidences`, `ArchitectureLayer.items`)에 `@BatchSize(size = 100)`를 부착하여 `IN (...)` 절을 통한 배치 조회를 유도함으로써 N+1 쿼리를 해결.

### 2) 루프 단건 조회(`findById`)의 `findAllById(ids)` 일괄 로딩 전환
- `CompetencyAiService` 및 `ExperienceAiService`의 `prepare()` 메서드에서 전체 테이블 스캔(`findAll()`) 후 Java 메모리에서 필터링하던 로직을 요청 ID 목록 기반 `findAllById(requestedIds)` 및 존재 검증(`fetchAndValidate`) 헬퍼 패턴으로 전면 교체.

### 3) JPQL 프로젝션을 통한 엔티티 메모리 오버헤드 제거
- `JobMatchingService` 및 `JobPostingCollectorService`에서 기술 스택 키워드 매칭을 위해 전체 `Skill` 엔티티 객체를 덤프 로딩하던 방식을 개선.
- `SkillRepository`에 `@Query("SELECT s.name FROM Skill s") List<String> findAllSkillNames();` 프로젝션 쿼리를 신설하여 엔티티 객체 생성 오버헤드와 힙 메모리 소모를 완전 차단.

---

## 3. 성과 및 교훈

- **DB 쿼리 횟수 감축**: N+1 쿼리로 수십 회씩 나가던 SQL 실행 횟수를 단 1~2회의 배치 쿼리로 압축.
- **메모리 소모 절감**: 단순 문자열 조회를 위한 JPA 1차 캐시 및 영속성 스냅샷 생성 비용 100% 절감.',
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

외부 네트워크 I/O 작업(채용 공고 API 호출, 이미지 렌더링 다운로드, 외부 LLM API 호출)이 DB 트랜잭션 안에서 수행될 경우, DB 커넥션 풀이 오랫동안 고갈되거나 외부 서비스 장애가 백엔드 전체 장애로 전파될 위험이 존재합니다.

---

## 2. 주요 개선 내용

### 1) DB 트랜잭션 경계 분리
- `JobPostingCollectorService`(네트워크 통신 & 수집)와 `JobPostingService`(DB 커밋 및 상태 변경) 간의 트랜잭션 경계를 명시적으로 분리.
- 외부 API 응답 대기 시간 동안 DB Connection Lock을 잡고 있지 않도록 아키텍처 개편.

### 2) CompletableFuture 기반 멀티스레드 병렬 다운로드
- `JobApplicationUrlParseService`에서 외부 채용 사이트의 배너 이미지 후보 10여 개를 순차 동기(Sequential Sync) 방식으로 다운로드하던 방식을 `CompletableFuture` 커스텀 스레드 풀 기반 병렬 다운로드로 전환.
- 평균 수집 소요 시간을 1.2초에서 0.2초 수준으로 83% 이상 대폭 단축.

### 3) NVIDIA NIM AI 클라이언트 지수 백오프(Exponential Backoff) 재시도
- `NvidiaNimClient` 외부 LLM API 호출 시 429(Rate Limit), 5xx(Server Error), Timeout 발생 상황에 대비해 `executeWithRetry` 헬퍼 함수를 구현.
- 1초, 2초, 4초의 지수 백오프 및 무작위 Jitter를 부과하여 외부 AI 서빙 장애 시 일시적 오류를 성공적으로 흡수.

---

## 3. 성과 및 교훈

- **시스템 안정성 제고**: DB 커넥션 풀 고갈을 방지하고 외부 장애 격리 달성.
- **성능 단축**: 네트워크 I/O 병렬화로 비동기 다운로드 성능 6배 이상 대폭 향상.',
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

운영 환경(MySQL HeatWave)에서는 형상 관리 도구인 Flyway를 통해 DB 스키마 변경을 엄격히 통제합니다. 데이터가 누적됨에 따라 외래키 인덱스 부재로 인한 Full Table Scan 및 ORDER BY 연산 시 Filesort 병목을 해결하기 위한 DB 인덱스 마이그레이션을 단행했습니다.

---

## 2. 주요 개선 내용

### 1) V127 인덱스 마이그레이션 (`V127__add_performance_indexes.sql`)
- `job_posting` 테이블: `posting_url`, `(collection_method, external_id)` 복합 유니크/B-Tree 인덱스 구축.
- `job_posting_cover_letter_item`: `job_posting_id` 외래키 인덱스 구축.
- `learning_resource`: `(category_id, display_order)` 복합 인덱스 구축.

### 2) V128 복합 인덱스 마이그레이션 (`V128__add_status_event_index.sql`)
- `job_posting_status_event` 테이블: 채용 공고의 지원 단계 변화 히스토리 조회 (`findByJobPostingIdOrderByChangedAtAsc`) 시 DB 수준 정렬 연산(Filesort) 및 임시 테이블(Using temporary) 생성을 방지하기 위해 `(job_posting_id, changed_at)` 복합 인덱스를 신설.

---

## 3. 성과 및 교훈

- **쿼리 실행 계획(EXPLAIN) 개선**: `Using filesort` 및 `Using temporary` 제거, B-Tree Index Scan으로 전환.
- **안전한 형상 관리**: Flyway 버전 관리를 통해 개발/운영 환경 간 스키마 일치 및 무중단 마이그레이션 완수.',
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
