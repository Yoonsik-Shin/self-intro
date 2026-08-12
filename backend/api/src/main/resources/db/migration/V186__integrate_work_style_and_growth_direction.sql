-- 공개 웹에서는 기존 근거 연결형 역량 영역을 업무 방식까지 확장한다.
-- 이력서는 문서 목적에 맞게 프로필 한 문장과 직무별 관점으로 압축한다.

UPDATE competency
SET title = '요구 파악부터 배포·운영까지 완결하는 오너십',
    summary = '소규모 조직에서 요구사항 분석과 데이터 모델링부터 API 구현, 배포 환경 구성, 운영 장애 대응과 레거시 리팩터링까지 서비스의 전체 생명주기를 경험했습니다. 무료체험 백오피스는 운영 문제를 직접 발견해 TF를 구성하고 실사용까지 연결했으며, 신규 서비스에서는 공용 기반과 최초 배포 경로까지 구현해 맡은 범위를 운영 가능한 결과로 완결했습니다.',
    display_order = 1,
    updated_at = NOW()
WHERE id = 6;

UPDATE competency
SET title = '운영 근거를 구조 변경으로 연결하는 문제 해결 방식',
    summary = '익숙한 기술을 먼저 적용하기보다 운영 지표와 제약조건을 확인합니다. MongoDB 병목은 쿼리·인덱스와 인메모리 읽기 모델로, 동기 처리 지연은 이벤트 fan-out으로, 1초 Polling 요청 중첩은 읽기·쓰기 데이터 경계 재설계로 해결했습니다. 수치가 남아 있지 않은 성과는 과장하지 않고 코드와 운영 기록으로 확인되는 범위만 설명합니다.',
    display_order = 2,
    updated_at = NOW()
WHERE id = 12;

UPDATE competency
SET title = '리뷰를 통해 설계를 구체화하고 규칙으로 남기는 협업',
    summary = '기획 요구를 먼저 도메인 모델과 API 경계로 설계하고 기술 리더와의 리뷰를 통해 트레이드오프를 구체화했습니다. 동료와 공동 개발할 때는 역할과 커밋 경계를 구분하고 코드 리뷰로 구현 품질을 맞췄으며, 반복되는 예외 처리·서버 초기화·배포 규칙은 공용 패키지와 생성 도구로 정리해 다음 서비스에서도 재사용할 수 있게 했습니다.',
    display_order = 5,
    updated_at = NOW()
WHERE id = 9;

INSERT INTO competency (title, summary, display_order, is_visible, created_at, updated_at)
SELECT '특정 언어보다 설계 원칙을 중심에 두는 성장 방향',
       '특정 언어보다 데이터 경계, 장애 격리, 성능과 확장성 같은 보편적인 설계 원칙을 중심으로 기술을 선택합니다. TypeScript·NestJS 운영 경험을 Java·Spring 생태계로 확장하고 있으며, 더 큰 규모에서도 장애 범위와 성능 특성을 예측할 수 있는 시스템을 만드는 개발자로 성장하고 있습니다.',
       6, 1, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM competency
    WHERE title = '특정 언어보다 설계 원칙을 중심에 두는 성장 방향'
);

SELECT id INTO @growth_competency_id
FROM competency
WHERE title = '특정 언어보다 설계 원칙을 중심에 두는 성장 방향'
LIMIT 1;

INSERT INTO competency_skill (competency_id, skill_id, display_order)
VALUES
    (@growth_competency_id, 1, 0),
    (@growth_competency_id, 2, 1),
    (@growth_competency_id, 5, 2),
    (@growth_competency_id, 8, 3)
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);

UPDATE print_template
SET content_overrides = JSON_SET(
        content_overrides,
        '$.profile.bio',
        '운영 병목을 측정하고 데이터 접근·처리 경계를 재설계해 온 백엔드 엔지니어입니다. 이벤트 fan-out으로 학습 종료 API 평균 응답시간을 2.74초에서 413ms로 단축하고, MongoDB 쿼리·인덱스와 읽기 모델을 최적화했으며, 반복되던 60초 timeout을 구조 변경으로 해소했습니다. 소규모 조직에서 데이터 모델링부터 배포·운영·리팩터링까지 전 과정을 경험했으며, 특정 언어보다 성능·장애 격리·확장 가능한 경계를 중심으로 문제를 해결합니다.'
    ),
    updated_at = NOW()
WHERE target_role = 'BACKEND_GENERAL';

UPDATE print_template
SET content_overrides = JSON_SET(
        content_overrides,
        '$.profile.bio',
        '운영 병목을 관측해 데이터·처리 경계를 다시 설계하고, 반복 가능한 서비스 개발 기반으로 확장합니다. 이벤트 fan-out, 읽기·쓰기 분리와 MongoDB 최적화를 운영에 적용했으며, 반복되는 예외 처리·인프라·배포 규칙은 공용 패키지·CLI·템플릿으로 정리해 두 독립 서비스에서 재사용했습니다.'
    ),
    updated_at = NOW()
WHERE target_role = 'PLATFORM_ARCHITECTURE';

UPDATE print_template
SET content_overrides = JSON_SET(
        content_overrides,
        '$.profile.bio',
        'TypeScript·NestJS 운영 환경에서 쌓은 성능·장애 대응 경험을 Java·Spring 생태계로 확장하고 있습니다. Spring Boot·JPA·MySQL 기반 백오피스를 단독 구축해 운영팀 실사용까지 책임졌으며, 특정 언어보다 데이터 경계·트랜잭션·실패 격리 같은 설계 원칙을 중심으로 문제를 해결합니다.'
    ),
    updated_at = NOW()
WHERE target_role = 'JAVA_SPRING_BACKEND';

UPDATE print_template
SET content_overrides = JSON_SET(
        content_overrides,
        '$.profile.bio',
        'AI 모델 호출 자체보다 제품이 긴 처리시간과 실패를 견디는 구조에 집중합니다. AI 튜터의 세션·대화·비동기 메시지 상태를 설계하고 timeout·실패 복구·중복 소비를 제어했으며, 외부 추론 서버의 장애가 메인 학습 흐름으로 번지지 않는 경계를 만들어 실제 사용자에게 출시했습니다.'
    ),
    updated_at = NOW()
WHERE target_role = 'AI_SERVICE_BACKEND';

UPDATE print_template
SET content_overrides = JSON_SET(
        content_overrides,
        '$.profile.bio',
        '복잡한 학습 규칙을 도메인 모델과 확장 가능한 처리 흐름으로 바꾸는 백엔드 엔지니어입니다. 시험·과제형 도메인을 설계·출시하고 여섯 학습 문맥의 제출 파이프라인과 운영 중 교육과정 전환을 구현했으며, 설계안과 트레이드오프는 기술 리뷰를 거쳐 팀의 코드 규칙으로 구체화했습니다.'
    ),
    updated_at = NOW()
WHERE target_role = 'NODE_DOMAIN_BACKEND';
