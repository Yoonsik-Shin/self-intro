-- Career/project content was recently rewritten from source-audited evidence (V58~V62, V65).
-- The competency section (last touched in V37/V41) still paraphrases the same STAR sentences
-- already published in career/project, which reads as a rehash rather than a distinct signal.
--
-- This migration re-derives all 6 existing competencies (plus 4 new ones) directly from a fresh
-- read of the four source repositories behind this portfolio, deliberately using facts that are
-- NOT already narrated in experience_detail: cs-test-bed-ttam (project id=2), log-doctor
-- (project id=3), this repository itself (project id=21), and susimdal_legacy (career id=1 /
-- projects 17-20). Every fact below was independently verified against the actual source (code,
-- commit, or test) at the time of writing, not taken at face value from a single pass:
--   - cs-hub: InquiryUniqueKeyGenerator.generateUniqueKey (UUID.nameUUIDFromBytes) + bulkInsert's
--     "ON CONFLICT (unique_key) DO NOTHING"; KakaoTimeoutAspect (virtual-thread executor,
--     @KakaoTimeout(4500) on WebhookController, fallback text) and WebhookExceptionHandler
--     (always HTTP 200 for the Kakao skill contract); cursorBeyond's code comment on the
--     UUIDv7-as-cursor pitfall; commits 4f2ba91 (PII scope judgment: Naver cafe author info and
--     internal staff/IP data intentionally excluded, LIKE search dropped for an HMAC exact-match
--     column) and 27abacd (CommandLineRunner migration extracted into a standalone
--     `./gradlew piiEncryptionMigration` CLI tool after runtime-coupling feedback; NPE on NULL
--     channel_metadata and an uninitialized-crypto-holder bug found and fixed against a real
--     240-row local run); commits c7729c6/dff6393 (n8n per-trigger Lock node, 30-min error
--     debounce); feature/{auth,file,inquiry}/{api,domain,repository,usecase} vertical slices +
--     DataIntegrationRequestedEvent; 6,856 lines/130 files, no .github directory (no CI), Flyway
--     V1-V14 with V13 absent; IntegrateInquiryDataUseCaseTest's 3 targeted tests (admin
--     self-reply loop guard, RESOLVED-ticket auto-reopen).
--   - log-doctor: verified via `git shortlog` on each of the 3 independent repos' main branch -
--     provider-front (248/248) and provider-back (210/210) are 100% solo, client-back is shared
--     (156 self / 91 teammates of 247), and within client-back, app/workflows/diagnosis
--     (orchestration) is self-led (57/79) while app/engines (rule bodies) is team-heavy (37 self
--     vs 43 teammates), and .github/workflows/deploy.yml is 100% self (9/9) with OIDC login (no
--     stored secrets); aggregate_llm_prescription_activity.py (tiktoken token counting,
--     MAX_BATCH_TOKENS=4000, lru_cache prompt caching); core/auth.py reset_credential() called
--     from publisher_client.py on a 403; handshake.py's backoff.expo/max_tries=10 comment on
--     Entra ID RBAC propagation delay plus the DEACTIVATING/DELETED/UPDATING remote kill-switch;
--     tests/infra/e2e/ (deploy_all.sh/run_e2e.sh/teardown_all.sh, real Bicep-deployed Azure RG
--     scenarios) alongside the 24 unit tests; docs/application-insights-decision.md's 5GB-free
--     to ~2.5M-execution math and RetentionInDays 90->30.
--   - self-intro (this repo): lib/api/types.ts's Study/StudyRequest and PrintTemplateRaw/
--     PrintTemplate type pairs; lib/api/server.ts's 'server-only' import guard; 13 backend test
--     classes under src/test vs 0 frontend test files; build.gradle's Spotless
--     googleJavaFormat('1.22.0').aosp(); the 18-commit "fix(print)" series (module-scope
--     AutoResizingTextarea for IME focus loss, skill-badge dimension matching for the page-1
--     layout shift, inherited text color) culminating in b7c03ef; the V58-V65 migration header
--     comments themselves, which document an "evidence boundary" and explicitly exclude
--     unverifiable or inflated claims - used here as first-person evidence of that habit.
--   - susimdal_legacy: PromotionRepository.java's @EntityGraph(attributePaths = "options") to
--     avoid N+1 on promotion-option lookups; verified via `git shortlog --grep` that
--     slc-application carries 2,402 "Feedback:"-prefixed review commits (1,149 by this author).
-- A claim reported by initial research but not found on re-verification (an app-level MongoDB
-- unique-index claim for challenge-retry dedup) was dropped rather than published.

DELETE FROM competency_evidence;
DELETE FROM competency_skill;
DELETE FROM competency_study;

-- id=6 -> display_order 1: 오너십 (kept, refreshed with the Kakao channel + self-intro evidence)
UPDATE competency SET
    title = '요구 파악부터 배포·운영까지 혼자 완결하는 오너십',
    summary = '카카오 챗봇 스킬 서버까지 포함한 4개 채널의 CS 통합 페이지를 기획자·인프라팀 없이 혼자 설계·배포했고, 무료체험 백오피스도 요구사항 정의부터 알림 연동, 운영 이슈 대응까지 책임졌습니다. 개인 포트폴리오 서버 역시 기획·개발·인프라·GitOps 배포까지 전 과정을 혼자 운영하고 있습니다.',
    display_order = 1,
    updated_at = NOW()
WHERE id = 6;

-- id=1 -> display_order 2: 도메인 추상화 (renamed, new evidence: vertical slice + API 계약 타입 분리)
UPDATE competency SET
    title = '서로 다른 요구를 하나의 구조로 통합하는 추상화 감각',
    summary = 'CS 통합 페이지는 전형적인 3계층 대신 auth·file·inquiry 기능 단위로 api·domain·repository·usecase를 나누는 수직 슬라이스 구조를 택하고, 웹훅 수신과 후속 처리를 Spring 이벤트로 분리했습니다. 포트폴리오 서버에서도 응답용 타입과 폼 전송용 타입을 API 계약 단계에서부터 갈라 두어, 화면 요구가 바뀌어도 서로 영향을 주지 않게 설계합니다.',
    display_order = 2,
    updated_at = NOW()
WHERE id = 1;

-- id=2 -> display_order 3: 무중단 실행력 (제목 유지, 근거는 암호화 스코프 판단·마이그레이션 도구 분리로 교체)
UPDATE competency SET
    title = '무중단으로 리스크 있는 변경을 완수하는 실행력',
    summary = '실서비스 데이터가 쌓인 상태에서 PII 암호화를 도입하며 "이미 공개된 데이터인지, 진짜 고객 개인정보인지"를 기준으로 암호화 범위를 판단해 과잉 암호화를 피했습니다. 앱 기동 시 함께 실행되던 마이그레이션 로직을 별도 CLI 도구로 분리하는 과정에서 실제 240건 이관을 직접 돌려보며 NULL 데이터로 인한 오류를 찾아 그 자리에서 고쳤습니다.',
    display_order = 3,
    updated_at = NOW()
WHERE id = 2;

-- id=3 -> display_order 4: 방어적 통합 설계 (제목 변경, gRPC/Kafka 서술 대신 프로토콜 준수+자가복구 사례로 재구성)
UPDATE competency SET
    title = '프로토콜을 지키며 장애를 흡수하는 방어적 통합 설계',
    summary = '카카오 챗봇 규격이 요구하는 HTTP 200 응답을 지키면서도 가상 스레드로 4.5초 내부 타임아웃을 걸어, 지연되면 정중한 안내 메시지로 대체합니다. 클라우드 진단 에이전트는 인증이 403으로 실패하면 자격 증명을 폐기 후 재발급하고, 권한 전파 지연은 지수 백오프로 흡수하며 원격 킬스위치로 즉시 중단할 수 있게 설계했습니다. 포트폴리오 서버에서도 공용 AI 클라이언트를 도메인별 독립 플래그로 격리해 장애 영향 범위를 좁혔습니다.',
    display_order = 4,
    updated_at = NOW()
WHERE id = 3;

-- id=4 -> display_order 6: 근본 원인 진단력 (기존 유지, self-intro의 fix(print) 시리즈로 범위 확장)
UPDATE competency SET
    title = '증상이 아니라 근본 원인까지 쫓아 재발을 막는 진단력',
    summary = '포트폴리오 서버의 인쇄 기능에서 편집 모드와 미리보기 화면의 치수가 미세하게 어긋나는 문제를 폰트 상속, 컴포넌트 스코프 같은 근본 원인까지 하나씩 좁혀가며 18차례의 연속 커밋으로 완전히 해결했습니다. Azure 리소스 진단과 사내 CS 시스템에서도 증상 로그가 아니라 원인 데이터를 근거로 진단 규칙과 관측 파이프라인을 직접 설계해 재발을 막습니다.',
    display_order = 6,
    updated_at = NOW()
WHERE id = 4;

-- id=5 -> display_order 7: LLM 판단 통합 (기존 유지, LLM 비용/응답 방식 설계로 근거 보강)
UPDATE competency SET
    title = 'LLM을 판단 흐름에 결합하며 비용과 신뢰성까지 설계하는 능력',
    summary = '진단 결과를 LLM에 결합해 실행 가능한 처방 카드를 자동 생성하는 동시에, tiktoken으로 토큰을 실측해 규칙별로 배치 요청하고 프롬프트를 캐싱해 API 비용과 응답 속도를 함께 통제했습니다. 이력서 RAG 파이프라인은 Rerank로 근거 정확도를 높였고, 포트폴리오 서버는 동기 응답과 SSE 스트리밍을 함께 지원해 생성 시간에 따라 사용자 경험을 조절합니다.',
    display_order = 7,
    updated_at = NOW()
WHERE id = 5;

-- New competencies: themes with no prior analog, grounded in facts not yet published anywhere else.
INSERT INTO competency (title, summary, display_order, is_visible, created_at, updated_at)
VALUES (
    '문제가 터지기 전에 조회 결함을 예측해 막는 설계 습관',
    '생성 시각 기반인 UUIDv7 ID만으로 커서 페이지네이션을 짜면 백필된 데이터의 순서가 뒤틀릴 수 있다는 점을 코드 작성 시점에 미리 인지하고 (시각, ID) 복합 커서로 설계했습니다. 프로모션-옵션처럼 연관 데이터를 함께 읽어야 하는 조회는 EntityGraph로 N+1을 사전에 차단했습니다.',
    5, TRUE, NOW(), NOW()
);
SET @competency_predictive = LAST_INSERT_ID();

INSERT INTO competency (title, summary, display_order, is_visible, created_at, updated_at)
VALUES (
    '협업 프로젝트에서 내 역할의 경계를 명확히 나누고 증명하는 방식',
    '3인이 함께한 클라우드 진단 플랫폼에서 진단 규칙 엔진은 팀원과 함께 만들었지만, 오케스트레이션과 배포 파이프라인은 커밋 기준으로 제가 주도해 기여도를 코드 경계로 설명할 수 있습니다. 학습 플랫폼에서도 "Feedback:" 접두사를 단 리뷰 코멘트를 1,100건 넘게 남기고 반영하며 PR 기반으로 검증하는 협업 방식을 지켰습니다.',
    8, TRUE, NOW(), NOW()
);
SET @competency_collab = LAST_INSERT_ID();

INSERT INTO competency (title, summary, display_order, is_visible, created_at, updated_at)
VALUES (
    '완벽한 커버리지보다 회귀 위험을 정확히 겨냥하는 테스트 전략',
    'CS 통합 페이지는 테스트가 3개 클래스뿐이지만 "운영자 답장이 문의로 재수집되는 무한루프", "해결된 티켓의 자동 재오픈" 같은 실제 회귀 위험 지점만 정확히 겨냥해 작성했습니다. 포트폴리오 서버는 웹훅 멱등성과 AI 폴백 계약을 13개 테스트로 검증하되 프런트엔드는 타입 체크로 대체하는 등, 프로젝트 성격에 따라 테스트 투자 지점을 다르게 판단합니다.',
    9, TRUE, NOW(), NOW()
);
SET @competency_testing = LAST_INSERT_ID();

INSERT INTO competency (title, summary, display_order, is_visible, created_at, updated_at)
VALUES (
    '과장 없이 근거를 스스로 감사하는 태도',
    '이 포트폴리오의 경력·프로젝트 콘텐츠는 실제 커밋과 코드를 다시 감사해, 확인되지 않거나 부풀려진 주장을 의도적으로 제외하고 재작성한 결과입니다. 마이그레이션 커밋에 무엇을 근거로 남기고 무엇을 뺐는지 "증거 경계"를 직접 기록해, 근거 없는 성과보다 확인 가능한 사실만 남기는 것을 원칙으로 삼습니다.',
    10, TRUE, NOW(), NOW()
);
SET @competency_integrity = LAST_INSERT_ID();

-- Skill tags
INSERT INTO competency_skill (competency_id, skill_id, display_order)
SELECT c.id, s.id, ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY s.name) - 1
FROM competency c
JOIN skill s ON
    (c.id = 6 AND s.name IN ('Spring Boot', 'Spring Security', 'Docker', 'Kubernetes', 'GitHub Actions', 'Infrastructure as Code (IaC)')) OR
    (c.id = 1 AND s.name IN ('Java', 'Spring Boot', 'TypeScript', 'Next.js', 'QueryDSL')) OR
    (c.id = 2 AND s.name IN ('Java', 'Spring Boot', 'MySQL', 'Flyway', 'Database Modeling')) OR
    (c.id = 3 AND s.name IN ('Python', 'Azure Functions', 'gRPC', 'Apache Kafka', 'Redis', 'LLM')) OR
    (c.id = 4 AND s.name IN ('TypeScript', 'React', 'Next.js', 'KQL', 'Grafana', 'Loki')) OR
    (c.id = 5 AND s.name IN ('LLM', 'RAG', 'Azure OpenAI', 'LangChain', 'Python')) OR
    (c.id = @competency_predictive AND s.name IN ('MySQL', 'Spring Data JPA', 'QueryDSL', 'Database Modeling')) OR
    (c.id = @competency_collab AND s.name IN ('Git', 'Python')) OR
    (c.id = @competency_testing AND s.name IN ('Java', 'Spring Boot', 'TypeScript')) OR
    (c.id = @competency_integrity AND s.name IN ('Flyway', 'Git'));

-- Evidence links (navigation only - the public UI shows just the linked experience title, not
-- evidence_summary text, so these never duplicate the STAR prose in career/project).
INSERT INTO competency_evidence (competency_id, experience_id, is_primary, display_order) VALUES
(6, 2, TRUE, 0), (6, 18, FALSE, 1), (6, 21, FALSE, 2),
(1, 2, TRUE, 0), (1, 21, FALSE, 1), (1, 20, FALSE, 2),
(2, 2, TRUE, 0), (2, 21, FALSE, 1),
(3, 2, TRUE, 0), (3, 3, FALSE, 1), (3, 21, FALSE, 2),
(4, 21, TRUE, 0), (4, 3, FALSE, 1), (4, 2, FALSE, 2),
(5, 3, TRUE, 0), (5, 4, FALSE, 1), (5, 21, FALSE, 2),
(@competency_predictive, 2, TRUE, 0), (@competency_predictive, 18, FALSE, 1),
(@competency_collab, 3, TRUE, 0), (@competency_collab, 1, FALSE, 1),
(@competency_testing, 2, TRUE, 0), (@competency_testing, 21, FALSE, 1),
(@competency_integrity, 21, TRUE, 0);

-- Related studies: re-derive by skill overlap, same rule as the original V37 design.
INSERT INTO competency_study (competency_id, study_id, display_order)
SELECT competency_id, study_id, ROW_NUMBER() OVER (PARTITION BY competency_id ORDER BY study_id) - 1
FROM (
    SELECT DISTINCT cs.competency_id, ss.study_id
    FROM competency_skill cs
    JOIN study_skill ss ON ss.skill_id = cs.skill_id
    JOIN study st ON st.id = ss.study_id
) deduped;
