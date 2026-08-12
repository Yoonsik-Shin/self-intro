-- 프로젝트 경험 정리를 먼저 끝낸 뒤 역량을 귀납적으로 재도출하기 위해
-- V186의 역량·프로필 재구성을 보류하고 직전 검증 상태로 되돌린다.

UPDATE competency
SET title = '요구 파악부터 배포·운영까지 책임지는 오너십',
    summary = 'CS 통합 페이지는 네이버 카페·이메일·구글폼 등 여러 채널로 흩어져 있던 고객 문의를 한 곳에서 관리할 수 있게 만든 시스템으로, 요구 파악부터 접근 권한 설계, 배포까지 전 과정을 책임지고 진행했습니다. 무료체험 백오피스는 신청·알림 요구사항을 실제 동작하는 서비스로 옮기고 운영 인프라까지 맡은 범위를 끝까지 완결했습니다. 이 포트폴리오 사이트도 기획부터 배포 자동화, 후원 결제 연동까지 전 과정에 책임을 지고 운영하고 있습니다.',
    display_order = 1,
    updated_at = NOW()
WHERE id = 6;

UPDATE competency
SET title = '운영 병목을 측정하고 구조 변경까지 연결하는 실행력',
    summary = 'MongoDB Atlas Profiler에서 병목 쿼리를 찾은 뒤 aggregation·인덱스·인메모리 읽기 모델을 함께 조정했습니다. 학습 종료 API는 이벤트 fan-out으로 평균 2.74초를 413ms로 줄였고, 1초 Polling 요청 중첩으로 반복되던 60초 timeout은 통계 모델과 읽기·쓰기 경계를 재설계해 해소했습니다.',
    display_order = 2,
    updated_at = NOW()
WHERE id = 12;

UPDATE competency
SET title = '협업 프로젝트에서 내 역할의 경계를 명확히 나누고 증명하는 방식',
    summary = '학습 플랫폼에서는 제가 처음부터 설계해 만든 기능(학생 이상행동 감지, 실시간 접속 상태 표시, AI 튜터 대화 기능)과 팀원이 전담한 기능을 코드 이력으로 명확히 구분해서 설명할 수 있습니다. 사내에서 자발적으로 모인 태스크포스에서는 기획자·디자이너·프론트엔드 개발자·운영 담당자와 함께 무료체험 신청 시스템을 만들며 백엔드 담당자로서 역할을 다했습니다. 신규 서비스를 팀원 한 명과 함께 만들 때는 담당 영역을 나누고, 리뷰 코멘트를 1,100건 넘게 남기고 반영하며 코드 리뷰 기반으로 협업했습니다. 3인이 함께한 사이드 프로젝트에서도 같은 방식으로 제가 작성한 코드와 팀원이 작성한 코드를 구분해 설명할 수 있습니다.',
    display_order = 4,
    updated_at = NOW()
WHERE id = 9;

DELETE FROM competency
WHERE title = '특정 언어보다 설계 원칙을 중심에 두는 성장 방향';

UPDATE print_template
SET content_overrides = JSON_SET(
        content_overrides,
        '$.profile.bio',
        '운영 병목을 측정하고 데이터 접근·처리 경계를 재설계해 온 백엔드 엔지니어입니다. 이벤트 fan-out으로 학습 종료 API 평균 응답시간을 2.74초에서 413ms로 단축하고, MongoDB 쿼리·인덱스와 읽기 모델을 최적화했으며, 반복되던 60초 timeout을 구조 변경으로 해소했습니다.'
    ),
    updated_at = NOW()
WHERE target_role = 'BACKEND_GENERAL';

UPDATE print_template
SET content_overrides = JSON_SET(
        content_overrides,
        '$.profile.bio',
        '운영 병목을 관측해 데이터·처리 경계를 다시 설계하고, 반복 가능한 서비스 개발 기반으로 확장합니다. 이벤트 fan-out, 읽기·쓰기 분리, MongoDB 최적화와 인메모리 읽기 모델, 공용 패키지·CLI·배포 템플릿을 실제 운영 서비스에 적용했습니다.'
    ),
    updated_at = NOW()
WHERE target_role = 'PLATFORM_ARCHITECTURE';

UPDATE print_template
SET content_overrides = JSON_SET(
        content_overrides,
        '$.profile.bio',
        'TypeScript/NestJS 운영 경험에서 쌓은 성능·장애 대응 역량을 Java/Spring 생태계로 확장하고 있습니다. Spring Boot 백오피스를 단독 구축해 운영팀 실사용까지 책임졌고, 개인 서비스에서는 JPA·Flyway·MySQL과 계층형 도메인 설계를 지속적으로 고도화했습니다.'
    ),
    updated_at = NOW()
WHERE target_role = 'JAVA_SPRING_BACKEND';

UPDATE print_template
SET content_overrides = JSON_SET(
        content_overrides,
        '$.profile.bio',
        'AI 모델 호출 자체보다 제품이 긴 처리시간과 실패를 견디는 구조에 집중합니다. AI 튜터의 세션·대화·비동기 메시지 상태를 설계하고 timeout·재처리·중복 소비를 제어했으며, 실제 사용자에게 출시해 운영했습니다.'
    ),
    updated_at = NOW()
WHERE target_role = 'AI_SERVICE_BACKEND';

UPDATE print_template
SET content_overrides = JSON_SET(
        content_overrides,
        '$.profile.bio',
        '복잡한 학습 규칙을 도메인 모델과 확장 가능한 처리 흐름으로 바꾸는 백엔드 엔지니어입니다. 시험·과제형 도메인을 설계·출시하고, 여섯 학습 문맥의 제출 파이프라인과 운영 중 교육과정 전환을 구현했습니다.'
    ),
    updated_at = NOW()
WHERE target_role = 'NODE_DOMAIN_BACKEND';
