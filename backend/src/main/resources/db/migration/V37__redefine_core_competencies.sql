-- 기존 핵심역량은 "기술 도메인 카테고리 + 대표 근거 1건" 구조라 경력/프로젝트 섹션과 내용이 겹치고
-- 무엇을 잘하는지보다 어떤 기술을 다뤄봤는지에 가까웠다. 여러 프로젝트에서 반복적으로 증명된
-- 문제해결 패턴 중심으로 재정의하고, 근거도 서로 다른 프로젝트 2~3건으로 다시 매핑한다.

DELETE FROM competency_study;
DELETE FROM competency_evidence;
DELETE FROM competency_skill;

UPDATE competency SET
    title = '복잡한 도메인을 재사용 가능한 모델로 추상화하는 설계력',
    summary = '서로 다른 케이스를 하나의 도메인 모델로 통합하거나 뒤섞인 관심사를 읽기/쓰기로 분리해, 새로운 요구가 추가돼도 기존 구조를 재사용할 수 있게 설계합니다.',
    updated_at = NOW()
WHERE id = 1;

UPDATE competency SET
    title = '무중단으로 리스크 있는 변경을 완수하는 실행력',
    summary = '암호화 전환이나 대규모 데이터 이관처럼 실패 시 파급이 큰 변경을 하위 호환 경로를 두고 단계적으로 적용해, 서비스 중단과 데이터 유실 없이 끝냅니다.',
    updated_at = NOW()
WHERE id = 2;

UPDATE competency SET
    title = '비동기·분산 환경에서 데이터 정합성을 지키는 신뢰성 설계',
    summary = '메시지 유실·중복·지연이 발생할 수 있는 환경에서 멱등성과 트랜잭션 경계를 설계해, 장애 상황에도 데이터가 어긋나지 않도록 만듭니다.',
    updated_at = NOW()
WHERE id = 3;

UPDATE competency SET
    title = '근본 원인부터 추적하는 운영·비용 진단력',
    summary = '장애나 비용 급증의 증상만 보지 않고 로그와 지표를 근거로 원인을 추적해, 재발을 막는 진단 체계와 경보 기준을 직접 설계합니다.',
    updated_at = NOW()
WHERE id = 4;

UPDATE competency SET
    title = 'LLM을 실제 판단 흐름에 통합하는 능력',
    summary = 'LLM을 단순 대화 응답이 아니라 진단·평가·검색 같은 서비스의 판단 로직에 결합해, 사람이 하던 의사결정을 실질적으로 자동화합니다.',
    updated_at = NOW()
WHERE id = 5;

INSERT INTO competency (title, summary, display_order, is_visible, created_at, updated_at)
SELECT '요구 파악부터 배포·운영까지 혼자 완결하는 오너십', '기획자나 별도 인프라 팀 없이 요구사항 정의, 아키텍처 설계, 인프라 구축, 배포 자동화까지 전 과정을 단독으로 책임지고 완결합니다.', 6, TRUE, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM competency WHERE display_order = 6);

INSERT INTO competency_skill (competency_id, skill_id, display_order)
SELECT c.id, s.id, ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY s.name) - 1
FROM competency c
JOIN skill s ON
    (c.display_order = 1 AND s.name IN ('Java', 'Spring Boot', 'Node.js', 'TypeScript', 'NestJS', 'Express', 'QueryDSL', 'Spring Data JPA')) OR
    (c.display_order = 2 AND s.name IN ('Flyway', 'MySQL', 'MongoDB', 'Database Modeling', 'QueryDSL')) OR
    (c.display_order = 3 AND s.name IN ('gRPC', 'Apache Kafka', 'Redis', 'Amazon SQS', 'MongoDB')) OR
    (c.display_order = 4 AND s.name IN ('KQL', 'Azure Log Analytics', 'Grafana', 'Loki', 'Alloy', 'Datadog', 'Nginx')) OR
    (c.display_order = 5 AND s.name IN ('LLM', 'RAG', 'Azure OpenAI', 'LangChain', 'LangGraph', 'STT/TTS')) OR
    (c.display_order = 6 AND s.name IN ('Docker', 'Docker Compose', 'AWS ECS', 'GitHub Actions', 'Kubernetes', 'Bicep', 'Infrastructure as Code (IaC)', 'Spring Security'));

INSERT INTO competency_evidence (competency_id, experience_id, evidence_summary, is_primary, display_order) VALUES
-- 1. 복잡한 도메인을 재사용 가능한 모델로 추상화하는 설계력
((SELECT id FROM competency WHERE display_order = 1 ORDER BY id ASC LIMIT 1), 17,
 'AI 튜터링 메시징 세션을 문제풀이·복습·챌린지·개념보강 4개 컨텍스트로 나누되 하나의 도메인 모델로 추상화했고, SubmittedProblem 조회 트래픽 문제를 CQRS로 분리해 재사용 가능한 구조로 리팩토링했습니다.',
 TRUE, 0),
((SELECT id FROM competency WHERE display_order = 1 ORDER BY id ASC LIMIT 1), 2,
 '이메일·네이버 카페 등 채널마다 다른 데이터 형태를 EmailMetadata/NaverCafeMetadata로 다형적으로 모델링해, 신규 채널이 추가돼도 통합 처리 로직을 재사용할 수 있게 설계했습니다.',
 FALSE, 1),
((SELECT id FROM competency WHERE display_order = 1 ORDER BY id ASC LIMIT 1), 20,
 '여러 마이크로서비스에 반복되던 인프라 설정과 예외 처리를 공용 패키지로 추출하고, CLI 스캐폴딩 도구로 표준 아키텍처를 자동 생성하도록 만들었습니다.',
 FALSE, 2),

-- 2. 무중단으로 리스크 있는 변경을 완수하는 실행력
((SELECT id FROM competency WHERE display_order = 2 ORDER BY id ASC LIMIT 1), 2,
 '이미 대량의 실서비스 데이터가 쌓인 상태에서 AES/GCM 암호화를 도입하며, 복호화 실패 시 평문을 그대로 통과시키는 하위 호환 로직(decryptOrPassThrough)으로 무중단 점진 마이그레이션을 완수했습니다.',
 TRUE, 0),
((SELECT id FROM competency WHERE display_order = 2 ORDER BY id ASC LIMIT 1), 17,
 'SubmittedProblem 6만여 건 데이터를 학급·학생·전체·학원 단위 읽기 전용 컬렉션으로 재구성하며, 서비스 중단이나 데이터 유실 없이 CQRS 전환 마이그레이션을 총괄했습니다.',
 FALSE, 1),

-- 3. 비동기·분산 환경에서 데이터 정합성을 지키는 신뢰성 설계
((SELECT id FROM competency WHERE display_order = 3 ORDER BY id ASC LIMIT 1), 4,
 'gRPC 기반 실시간 음성 스트리밍과 Kafka/Redis 메시지 큐를 결합해, 대용량 트래픽에서도 데이터 유실과 지연 병목 없이 마이크로서비스 간 비동기 상태를 통제했습니다.',
 TRUE, 0),
((SELECT id FROM competency WHERE display_order = 3 ORDER BY id ASC LIMIT 1), 17,
 '외부 LLM 서버와의 통신 지연이 실시간 스레드를 막지 않도록 SQS 비동기 큐로 분리하고, 세션 상태 변경에 MongoDB 트랜잭션을 적용해 정합성을 보장했습니다.',
 FALSE, 1),

-- 4. 근본 원인부터 추적하는 운영·비용 진단력
((SELECT id FROM competency WHERE display_order = 4 ORDER BY id ASC LIMIT 1), 3,
 'BaseInspector 클래스로 11개 진단 규칙을 플러그인 형태로 추가 가능한 구조를 설계하고, KQL과 Azure Resource Graph로 과금 로그와 예산 한도를 실시간으로 교차 분석했습니다.',
 TRUE, 0),
((SELECT id FROM competency WHERE display_order = 4 ORDER BY id ASC LIMIT 1), 2,
 'Grafana Alloy로 컨테이너·호스트 로그를 수집해 Loki로 전송하는 파이프라인을 구성하고, Nginx auth_request 기반 SSO 프록시로 내부 툴 접근을 통제했습니다.',
 FALSE, 1),
((SELECT id FROM competency WHERE display_order = 4 ORDER BY id ASC LIMIT 1), 19,
 'Datadog 모니터링 체계를 구축해 배포 이후 장애를 조기에 발견하고, 수작업 배포와 환경 차이로 인한 운영 리스크를 CI/CD 파이프라인으로 제거했습니다.',
 FALSE, 2),

-- 5. LLM을 실제 판단 흐름에 통합하는 능력
((SELECT id FROM competency WHERE display_order = 5 ORDER BY id ASC LIMIT 1), 3,
 '진단 엔진이 산출한 정량 지표를 LLM에 결합해, 비전문가 관리자도 바로 실행할 수 있는 비용 절감·보안 처방 카드를 Teams Markdown으로 자동 생성했습니다.',
 TRUE, 0),
((SELECT id FROM competency WHERE display_order = 5 ORDER BY id ASC LIMIT 1), 4,
 'PDF 이력서를 청킹·임베딩하고 Rerank 모델을 결합해, 면접 질문 생성의 근거 정확도를 높이는 RAG 파이프라인을 구성했습니다.',
 FALSE, 1),

-- 6. 요구 파악부터 배포·운영까지 혼자 완결하는 오너십
((SELECT id FROM competency WHERE display_order = 6 ORDER BY id ASC LIMIT 1), 18,
 '요구사항 정의부터 Spring Boot 3.2 기반 헥사고날 아키텍처 설계, 카카오 알림톡·Teams 알림 연동, Redis 세션 크로스도메인 이슈 디버깅까지 144개 클래스 규모의 서비스를 1인으로 완결했습니다.',
 TRUE, 0),
((SELECT id FROM competency WHERE display_order = 6 ORDER BY id ASC LIMIT 1), 19,
 'AWS ECS·SQS 인프라와 Docker 배포 환경, GitHub Actions CI/CD를 처음부터 구축해 배포 자동화 기반을 마련했습니다.',
 FALSE, 1),
((SELECT id FROM competency WHERE display_order = 6 ORDER BY id ASC LIMIT 1), 20,
 'npm workspaces 모노레포와 CLI 스캐폴딩 도구를 단독 개발해 신규 서버 구성 시간을 수 일에서 수 분으로 단축했습니다.',
 FALSE, 2);

INSERT INTO competency_study (competency_id, study_id, display_order)
SELECT competency_id, study_id, ROW_NUMBER() OVER (PARTITION BY competency_id ORDER BY study_id) - 1
FROM (
    SELECT DISTINCT cs.competency_id, ss.study_id
    FROM competency_skill cs
    JOIN study_skill ss ON ss.skill_id = cs.skill_id
    JOIN study st ON st.id = ss.study_id
) deduped;
