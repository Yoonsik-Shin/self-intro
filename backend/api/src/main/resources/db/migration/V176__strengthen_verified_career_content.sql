-- 커밋/소스와 2026-08-10 사용자 확인을 교차 검증한 경력 콘텐츠 보강.
-- 추정 수치(28→5, 24h→1h, 90%)는 사용하지 않고 확정·근사 여부를 문구에 반영한다.

UPDATE experience
SET period_start = '2023-12-20',
    period_end = '2025-10-17',
    summary = '학생·교사·학원이 사용하는 학습 플랫폼에서 MongoDB 성능 최적화, 이벤트 기반 학습 종료 처리, AI 튜터와 교사용 실시간 기능, 공용 서비스 개발 기반을 담당했습니다.',
    takeaway = '운영 병목을 프로파일링으로 찾고 쿼리·도메인 경계·비동기 처리 구조를 다시 설계해 해결했습니다. CTO 주도 DDD 전환에 참여한 뒤 신규 도메인과 서비스에 패턴을 정착·확장했습니다.'
WHERE id = 1;

UPDATE experience
SET summary = '핵심 학습 API에서 MongoDB 쿼리·인덱스를 최적화하고, 학습 종료 처리를 이벤트 fan-out으로 전환했으며, 운영형 AI 튜터와 교사용 실시간 상태 기능을 개발했습니다.',
    takeaway = 'Atlas Profiler 기반 튜닝과 평균 2.74초→413ms의 학습 종료 개선처럼 운영 데이터를 설계 변경으로 연결했습니다. AI 튜터는 세션·대화·비동기 성공/실패 처리까지 제품 백엔드를 담당했습니다.'
WHERE id = 17;

UPDATE experience
SET summary = '무료체험 신청부터 유료 전환까지의 운영 업무를 관리하는 Spring Boot 내부 TF 백오피스를 개발하고 EC2에 배포했습니다.',
    takeaway = 'Java/Spring/RDB를 처음 실무에 적용하면서 API·인증·알림·컨테이너 운영을 단독 담당했고, 운영 담당자 2~3명이 약 2~3개월 실제 사용했습니다.'
WHERE id = 18;

UPDATE experience
SET summary = 'NestJS 기반 BFF를 초기 구축하고 인증·인가, 서버 간 통신 오류와 timeout 처리, AI 튜터 및 교사용 화면 API, ECS 배포 기반을 개발했습니다.',
    takeaway = '프론트엔드가 서버별 인증·오류·응답 차이를 반복 처리하지 않도록 경계를 만들고, 외부 AI의 긴 처리시간과 네트워크 실패를 제품 API 관점에서 구분했습니다.'
WHERE id = 19;

UPDATE experience
SET summary = '분리 효과가 명확한 공용 문항 조회 서비스를 구축하고, 공통 패키지와 CLI로 신규 서비스의 인프라·4계층 모듈·배포 구성을 표준화했습니다.',
    takeaway = '전체 MSA 전환을 과장하지 않고 초기 서비스 분리와 재사용 기반에 집중했습니다. 공용 패키지와 생성 도구는 common-problem과 slc-view에 실제 적용됐습니다.'
WHERE id = 20;

UPDATE experience_detail
SET content = '긴 AI 처리시간과 실패를 사용자 요청에서 분리한 운영형 AI 튜터 백엔드',
    situation = '학생이 문제를 풀다 막히면 교사를 호출하고 기다려야 해 학습 흐름이 끊겼고, 한 교사가 여러 학생을 맡아 응답 품질 편차와 업무 부담이 발생했습니다.',
    task = '다른 팀의 Python/Gemini 서버와 연동하되 사용자를 긴 요청에 묶지 않고, 여러 학습 문맥의 대화 이력과 성공·실패 상태를 일관되게 관리해야 했습니다.',
    action_detail = '- Study·StudyReview·Challenge·ConceptEnhancement를 공통 세션 source 모델로 추상화\n- User·Assistant·System 역할과 Text·Image 대화 이력 설계\n- 요청과 AI 응답 수신을 분리하고 SQS Consumer로 결과 처리\n- 메시지 ID·Listener 단위 처리 기록과 finalizedAt 검사로 중복 소비 방지\n- 성공·실패 이벤트, timeout·gateway·network 오류와 하위 호환 처리 구현',
    outcome = '기능을 실제 출시해 일 수십 명 규모로 운영했고, AI 서버가 느리거나 실패해도 사용자가 요청에 계속 묶이지 않고 재질문 가능한 상태로 복구되도록 했습니다.',
    narrative = '학생의 질문 대기를 줄이고 교사의 부담을 완화하기 위해 AI 튜터를 제품에 연결했습니다. AI 추론 서버 자체가 아니라 메인 Application/BFF의 세션·메시지·비동기 연동을 담당했습니다. 서로 다른 네 가지 학습 문맥을 공통 세션으로 추상화하고 요청과 응답을 분리했으며, SQS의 중복 전달과 AI 실패를 메시지 상태로 흡수했습니다. 실제 출시는 일 수십 명 규모였으며 대규모 장애 감소처럼 확인되지 않은 효과는 주장하지 않습니다.'
WHERE id = 1;

UPDATE experience_detail
SET display_order = 2,
    content = 'EventBridge·Lambda 배치와 Presence 기반 교사용 실시간 학습 현황 구축',
    situation = '교사가 여러 학생의 접속 상태와 학습 진행을 확인하고 개입해야 했지만, 클라이언트 종료 이벤트만으로는 비정상 종료 사용자를 정확히 Offline 처리할 수 없었습니다.',
    task = '실시간 상태 기록과 끊긴 연결의 주기적 보정을 함께 제공하고, 기존 애플리케이션의 도메인 규칙과 이벤트 발행 경로를 재사용해야 했습니다.',
    action_detail = '- 클라이언트 1분 주기 Ping과 Online·Away·Background·Offline Presence 설계\n- EventBridge 5분 주기로 실행되는 Lambda 직접 작성\n- Lambda가 내부 synchronize-offline-presence API를 호출하는 배치 구조 구성\n- 최신 Presence와 Ping을 비교해 기준 시간을 넘긴 사용자를 일괄 Offline 처리\n- 최신 상태 조회에 MongoDB secondaryPreferred 적용',
    outcome = '교사용 화면이 학생의 접속·학습 상태를 일관된 API로 조회할 수 있게 했고, 비정상 종료로 남은 Online 상태를 5분 주기 배치로 보정했습니다.',
    narrative = '교사가 여러 학생의 학습 상태를 파악할 수 있도록 Presence와 Ping을 구축했습니다. EventBridge가 5분마다 제가 작성한 Lambda를 실행하고, Lambda는 DB를 직접 수정하는 대신 애플리케이션의 동기화 API를 호출합니다. 이 방식으로 기존 도메인 규칙과 이벤트 흐름을 재사용하면서 오래된 Ping 사용자를 일괄 Offline 처리했습니다. 실시간 Push Gateway와 API Gateway 영역은 다른 담당자의 구현이므로 제 기여에서 제외합니다.'
WHERE id = 28;

UPDATE experience_detail
SET display_order = 4
WHERE id = 29;

UPDATE experience_detail
SET content = '운영팀이 실사용한 무료체험·유료 전환 내부 백오피스 구축',
    situation = '운영팀이 무료체험 신청부터 유료 전환까지의 상태, 유입경로와 알림을 여러 수작업으로 관리하고 있었습니다.',
    task = '최소 인원의 TF에서 업무 흐름을 도메인과 API로 구체화하고, 익숙하지 않은 Java/Spring 스택으로 배포·운영 가능한 백엔드를 완성해야 했습니다.',
    action_detail = '- Spring Boot·JPA·MySQL 기반 신청·상태·유입경로·프로모션·약관 업무 구현\n- Spring Security·Redis Session 관리자 인증과 cross-domain cookie 처리\n- 카카오 알림톡·Microsoft Teams 운영 알림 연동\n- Docker Compose로 app·Nginx·MySQL·Redis·Grafana 구성 후 EC2 배포\n- 운영 수정 요청과 서버 핫픽스 대응',
    outcome = '운영 담당자 2~3명이 무료체험 신청부터 유료 전환까지 약 2~3개월 실제 사용한 내부 TF 제품을 구축했습니다.',
    narrative = '회사 정식 핵심 제품은 아니었지만 운영팀의 실제 문제를 해결하기 위한 내부 TF 도구였습니다. Java/Spring/RDB를 처음 실무에 적용해 백엔드와 인프라를 단독으로 맡았고 EC2에 배포했습니다. 운영 담당자 2~3명이 약 2~3개월 사용하며 신청부터 유료 전환까지의 업무를 처리했습니다.'
WHERE id = 3;

UPDATE experience_detail
SET outcome = '분리된 프론트엔드가 Redis 기반 관리자 세션을 사용하고 운영 담당자 2~3명이 약 2~3개월 백오피스를 안정적으로 사용할 수 있는 실행 환경을 구성했습니다.'
WHERE id = 30;

UPDATE experience_detail
SET content = '공용 문항 서비스와 반복 가능한 신규 서비스 개발 기반 구축',
    situation = '모놀리식 애플리케이션에서 공용 문항 조회처럼 분리 효과가 명확한 기능부터 독립시키려 했지만, 서비스마다 Docker·ECS·CI/CD와 공통 인프라를 반복 작성해야 했습니다.',
    task = '첫 서비스 분리를 완료하면서 다음 서비스도 같은 규칙과 도구로 시작할 수 있는 재사용 기반을 만들어야 했습니다.',
    action_detail = '- 공용 문항 조회 서비스를 Clean Architecture/DDD 구조로 단독 구축\n- common·core·infra 패키지로 예외·서버·MongoDB·Redis·SQS·Datadog 모듈화\n- susimdal new/generate CLI로 프로젝트와 4계층 모듈 생성 자동화\n- Docker Compose·MongoDB 초기화·dev/stg/prod ECS·GitHub Actions 템플릿 제공\n- common-problem과 slc-view에 실제 적용',
    outcome = '전체 MSA 전환 전 단계에서 공용 문항 서비스를 분리하고, 팀이 인프라·보일러플레이트 대신 비즈니스 로직부터 시작할 수 있는 반복 가능한 경로를 남겼습니다.',
    narrative = '아키텍처 방향은 CTO와 팀원이 함께 논의했고 저는 공용 문항 서비스, 공통 패키지와 CLI 구현을 맡았습니다. 24시간에서 1시간 같은 추정 수치는 사용하지 않습니다. 대신 생성 도구가 Docker·ECS·GitHub Actions와 계층별 모듈을 만들고 실제 두 서비스에서 사용됐다는 확인 가능한 결과로 설명합니다.'
WHERE id = 31;

INSERT INTO experience_detail
    (experience_id, content, display_order, situation, task, action_detail, outcome, narrative, visible)
SELECT
     17,
     'Atlas Profiler 기반 MongoDB 쿼리·인덱스 최적화',
     3,
     '애플리케이션 전반에서 Keys Examined가 크고 CPU·메모리 사용량과 API 지연을 유발하는 쿼리가 반복됐습니다.',
     '병목 후보의 우선순위를 정하고, 쓰기 비용을 과도하게 늘리지 않으면서 aggregation과 인덱스를 함께 개선해야 했습니다.',
     '- CTO와 Atlas Profiler로 병목 컬렉션·우선순위 선정\n- 조회 조건·정렬에 맞춘 복합 인덱스 설계\n- $match·$sort·$limit 조기 적용과 $lookup 범위 축소\n- ObjectId 시간 순서를 활용한 범위 검색·정렬 개선\n- 컬렉션당 인덱스 5개 이하 팀 정책 수립 및 초과 시 쿼리·컬렉션 책임 재검토',
     'Atlas Profiler에서 초 단위 주요 쿼리가 수십~수백 ms 수준으로 개선되는 것을 확인하고, 이후 인덱스 추가를 통제할 팀 기준을 남겼습니다.',
     'CTO와 Atlas Profiler를 확인해 문제 컬렉션과 우선순위를 정한 뒤 해결안 설계와 적용을 담당했습니다. submitted-actions, studies, users, problems와 교사 질문·호출 조회에서 pipeline 단계 순서와 lookup 범위를 줄이고 복합 인덱스를 적용했습니다. 정확한 전체 전후 수치는 보존되지 않아 기억에 의존한 28→5 같은 수치는 사용하지 않습니다.',
     1
WHERE NOT EXISTS (
    SELECT 1 FROM experience_detail
    WHERE experience_id = 17 AND content = 'Atlas Profiler 기반 MongoDB 쿼리·인덱스 최적화'
);
SELECT id INTO @mongo_tuning_detail_id
FROM experience_detail
WHERE experience_id = 17 AND content = 'Atlas Profiler 기반 MongoDB 쿼리·인덱스 최적화'
LIMIT 1;

INSERT INTO experience_detail
    (experience_id, content, display_order, situation, task, action_detail, outcome, narrative, visible)
SELECT
     17,
     '학습 종료 이벤트 fan-out 전환으로 평균 응답시간 85% 단축',
     1,
     '학습 종료 API가 통계 계산, 알림 저장, Push와 카카오 알림톡을 모두 기다려 평균 응답시간이 2.74초까지 증가했습니다.',
     '완료에 필수적인 트랜잭션과 후속 작업을 분리하면서 통계 도메인 간 결합도도 낮춰야 했습니다.',
     '- CTO가 도입한 EventEmitter 기반을 학습 종료 흐름에 확장\n- FinishAttendanceUseCase의 제출 통계 계산 분리\n- StudyFinished를 학생·학급·학원·전체 통계와 학습 트래킹으로 fan-out\n- 알림·Push·알림톡을 응답 필수 경로에서 분리\n- 이후 공용 EventHandler와 SQS Consumer·멱등 처리 구조로 확장',
     '학습 종료 API 평균 응답시간을 2.74초에서 413ms로 줄여 85% 단축했습니다.',
     '기존 EventEmitter의 최초 도입자는 CTO이며, 저는 이를 학습 종료 흐름에 적용·확장했습니다. 하나의 StudyFinished 이벤트가 여러 통계와 트래킹 리스너로 fan-out되도록 바꾸고 알림 작업을 응답 경로에서 분리했습니다. 2.74초→413ms는 내부 이벤트까지 운영 반영한 결과이며 SNS/SQS 성과와 합쳐 쓰지 않습니다.',
     1
WHERE NOT EXISTS (
    SELECT 1 FROM experience_detail
    WHERE experience_id = 17 AND content = '학습 종료 이벤트 fan-out 전환으로 평균 응답시간 85% 단축'
);
SELECT id INTO @study_event_detail_id
FROM experience_detail
WHERE experience_id = 17 AND content = '학습 종료 이벤트 fan-out 전환으로 평균 응답시간 85% 단축'
LIMIT 1;

INSERT INTO competency
    (id, title, summary, display_order, is_visible, created_at, updated_at)
VALUES
    (12,
     '운영 병목을 측정하고 구조 변경까지 연결하는 실행력',
     'MongoDB Atlas Profiler에서 병목 쿼리를 찾은 뒤 aggregation과 인덱스를 함께 바꾸고, 동기 부가 작업으로 느려진 학습 종료 API는 이벤트 fan-out으로 전환해 평균 2.74초를 413ms로 줄였습니다. 증상을 임시로 가리는 대신 데이터 접근과 처리 경계를 다시 설계합니다.',
     2, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    title = VALUES(title), summary = VALUES(summary), display_order = VALUES(display_order),
    is_visible = VALUES(is_visible), updated_at = NOW();

INSERT INTO competency_evidence
    (competency_id, experience_id, evidence_summary, is_primary, display_order)
VALUES
    (12, 17, 'Atlas Profiler 기반 MongoDB 튜닝과 학습 종료 API 2.74초→413ms 개선', 1, 0),
    (12, 20, '공용 문항 서비스와 공통 패키지·CLI를 실제 두 서비스에 적용', 0, 1),
    (12, 18, 'Spring Boot 내부 TF 제품을 배포하고 운영팀 실사용까지 지원', 0, 2)
ON DUPLICATE KEY UPDATE
    evidence_summary = VALUES(evidence_summary), is_primary = VALUES(is_primary),
    display_order = VALUES(display_order);

INSERT INTO competency_skill (competency_id, skill_id, display_order)
VALUES
    (12, 16, 0),
    (12, 54, 1),
    (12, 32, 2)
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);

INSERT INTO experience_detail_skill (experience_detail_id, skill_id, list_order)
VALUES
    (@mongo_tuning_detail_id, 16, 0),
    (@mongo_tuning_detail_id, 32, 1),
    (@study_event_detail_id, 2, 0),
    (@study_event_detail_id, 54, 1)
ON DUPLICATE KEY UPDATE skill_id = VALUES(skill_id);
