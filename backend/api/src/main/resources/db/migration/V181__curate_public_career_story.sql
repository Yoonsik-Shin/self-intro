-- 소스·커밋과 사용자 확인을 교차 검증한 공개용 문구다.
-- 실명·사내 서비스명·패키지명은 노출하지 않고, 확인되지 않은 추정 수치도 사용하지 않는다.

UPDATE profile
SET job_title = 'Backend Engineer · Performance & Architecture',
    bio = '운영 병목을 측정해 데이터 접근과 처리 경계를 재설계해 온 백엔드 엔지니어입니다. MongoDB 쿼리·인덱스와 인메모리 읽기 모델을 최적화하고, 학습 종료 처리를 이벤트 fan-out으로 전환해 평균 2.74초를 413ms로 단축했으며, 1초 Polling 요청 중첩으로 발생한 60초 timeout을 해소했습니다. TypeScript/NestJS 운영 경험을 기반으로 Java/Spring Boot 서비스와 공용 개발 플랫폼까지 확장하며, 성능과 장애 대응이 설계 원칙으로 남는 시스템을 만듭니다.',
    core_stack_summary = 'Java · Spring Boot · TypeScript · NestJS · MongoDB · AWS',
    updated_at = NOW()
WHERE id = 1;

UPDATE project
SET contribution_rate = NULL
WHERE experience_id IN (17, 18, 19, 20);

UPDATE experience_detail
SET narrative = '학생이 문제를 풀다 막혔을 때 교사 대기 없이 질문을 이어갈 수 있도록 Python 기반 AI 추론 서버와 메인 애플리케이션 사이의 제품 백엔드를 설계했습니다. 네 가지 학습 문맥을 공통 세션으로 추상화하고 요청·응답을 비동기로 분리했으며, 메시지 상태와 처리 기록으로 중복 소비와 실패 재처리를 제어했습니다. 실제 출시 후 일 수십 명 규모로 운영했습니다.'
WHERE id = 1;

UPDATE experience_detail
SET narrative = '기존 내부 이벤트 기반을 학습 종료 흐름에 확장하고, 통계·트래킹·알림을 하나의 도메인 이벤트에서 fan-out하도록 설계하고 핵심 모듈을 구현했습니다. 응답 필수 트랜잭션과 후속 작업을 분리해 학습 종료 API 평균 응답시간을 2.74초에서 413ms로 85% 단축했습니다.'
WHERE id = 42;

UPDATE experience_detail
SET narrative = '학생 접속 상태를 Presence와 Ping으로 모델링하고, EventBridge가 5분마다 직접 작성한 Lambda를 실행해 오래된 상태를 애플리케이션 API로 일괄 Offline 처리하도록 구성했습니다. Lambda가 데이터베이스를 직접 수정하지 않고 기존 도메인 규칙과 이벤트 경로를 재사용하도록 설계했습니다.'
WHERE id = 28;

UPDATE experience_detail
SET narrative = '기술 리더와 Atlas Profiler로 병목 데이터와 우선순위를 선정한 뒤 해결안 설계와 실제 튜닝을 담당했습니다. 필터·정렬·제한 단계를 앞당기고 조인 범위를 줄이며 조회 조건에 맞는 복합 인덱스를 적용해 초 단위 주요 쿼리를 수십~수백 ms 수준으로 개선했습니다. 쓰기가 많은 컬렉션은 _id 포함 인덱스 5개 이하로 관리하는 팀 기준도 정립했습니다.'
WHERE id = 41;

UPDATE experience_detail
SET narrative = '1초마다 연산량이 큰 API 세 개를 호출하면서 요청이 중첩되고 60초 timeout이 반복되는 원인을 팀과 분석했습니다. 제출 통계를 학생·학급·학원·전체 관점으로 분리하고 읽기·쓰기 데이터 경계와 이관을 설계·구현해 운영 timeout을 해소했습니다.'
WHERE id = 44;

UPDATE experience_detail
SET narrative = '변경 빈도가 낮은 커리큘럼·문항 기준 데이터를 태스크별 로컬 읽기 모델로 선적재해 반복 데이터베이스 조회와 조인을 제거했습니다. 최초 운영 반영에서 메모리 부족을 확인하자 캐시를 임시 제외하고 태스크 메모리를 1GB에서 2GB로 조정한 뒤 재적용했으며, 데이터 갱신은 재배포 정책으로 관리했습니다.',
    display_order = 5
WHERE id = 43;

UPDATE experience_detail
SET display_order = 6
WHERE id = 29;

UPDATE experience_detail
SET narrative = '서비스 분리 방향을 팀과 논의하고 공용 문항 서비스의 설계·구현, 공용 패키지와 서비스 생성 CLI를 직접 완성했습니다. 예외·서버 초기화·데이터베이스·캐시·메시징·모니터링과 컨테이너·배포 템플릿을 표준화해 실제 두 서비스에서 재사용했습니다.'
WHERE id = 31;

INSERT INTO experience_detail
    (experience_id, content, display_order, situation, task, action_detail, outcome, narrative,
     visible, public_visible, resume_available)
SELECT 17,
       '시험·과제형 Challenge 도메인 설계·출시',
       7,
       '교사가 과제를 부여하고 학생이 틀린 내용을 다시 풀 수 있는 시험·과제형 학습 흐름이 필요했습니다.',
       '기존 메인 학습과 다른 규칙을 독립 도메인으로 모델링하고 실제 운영 가능한 전 계층 기능으로 출시해야 했습니다.',
       '- 기획 요구를 바탕으로 1차 도메인 모델 설계\n- 기술 리더 피드백과 코드 리뷰로 규칙 구체화\n- 템플릿·학생별 부여·풀이 상태·포인트 모델링\n- 사전 과제와 오답 기반 사후 과제 흐름 구현\n- 랭킹·조회 API와 운영 전환 구현',
       '교사가 과제를 부여하고 학생이 오답을 다시 풀 수 있는 독립 학습 도메인을 실제 출시했습니다.',
       '기획 요구를 바탕으로 1차 도메인 모델을 설계하고 기술 리더의 피드백과 코드 리뷰로 구체화했습니다. 템플릿, 학생별 부여, 풀이 상태, 포인트, 사전·사후 랭킹까지 전 계층을 구현해 교사가 과제를 부여하고 학생이 오답을 다시 풀 수 있는 독립 흐름으로 출시했습니다.',
       1, 1, 1
WHERE NOT EXISTS (
    SELECT 1 FROM experience_detail
    WHERE experience_id = 17 AND content = '시험·과제형 Challenge 도메인 설계·출시'
);

INSERT INTO experience_detail
    (experience_id, content, display_order, situation, task, action_detail, outcome, narrative,
     visible, public_visible, resume_available)
SELECT 17,
       '여섯 학습 문맥의 문항 제출 파이프라인 통합',
       8,
       '정답·스킵·사후풀이와 단건·일괄 제출 경로가 나뉘어 학습 유형마다 통계·포인트·상태 갱신 로직이 중복됐습니다.',
       '기존 동작을 보존하면서 여러 학습 유형이 공통 제출 규칙을 재사용하도록 경계를 다시 설계해야 했습니다.',
       '- 단건·일괄 제출 입력 정규화\n- 학습 유형별 변환·제출 전략 분리\n- 통계·포인트·상태 갱신 공통 파이프라인 구성\n- 기존 API 동작을 보존하는 호환 계층 적용',
       '학습·복습·재도전·사후풀이·과제·개념보강의 제출 처리를 하나의 확장 가능한 파이프라인으로 통합했습니다.',
       '정답·스킵·사후풀이와 단건·일괄 제출로 나뉜 경로를 하나의 제출 파이프라인으로 통합했습니다. 여섯 학습 문맥을 유형별 정규화·변환·제출 전략으로 분리해 신규 학습 유형이 통계·포인트·상태 갱신 규칙을 재사용하도록 만들었습니다.',
       1, 1, 1
WHERE NOT EXISTS (
    SELECT 1 FROM experience_detail
    WHERE experience_id = 17 AND content = '여섯 학습 문맥의 문항 제출 파이프라인 통합'
);

INSERT INTO experience_detail
    (experience_id, content, display_order, situation, task, action_detail, outcome, narrative,
     visible, public_visible, resume_available)
SELECT 17,
       '운영 중 교육과정 개편과 학습 연속성 보존',
       9,
       '운영 학생이 학습 중인 상태에서 교육과정과 문항 구성이 바뀌어도 진행 상태 초기화와 문항 재노출을 막아야 했습니다.',
       '구·신 교육과정을 연결하고 기존 학생의 이어풀기 문맥을 보존하는 안전한 전환 경로가 필요했습니다.',
       '- 구·신 교육과정 및 문항 매핑\n- 이어풀기 문맥과 하위 호환 분기 구현\n- 운영 데이터 기반 staging 마이그레이션 검증\n- 자정 학습 종료 구간을 활용한 전환',
       '활성 계정의 기존 진행 상태와 풀이 이력을 보존한 채 새 교육과정으로 전환했습니다.',
       '기존 학생의 진행 상태를 초기화하거나 이미 푼 문항을 재노출하지 않도록 구·신 교육과정 매핑과 이어풀기 문맥, 하위 호환 분기를 구현했습니다. 자정에 진행 중 학습이 종료되는 운영 구간을 전환 창으로 활용해 활성 계정의 학습 연속성을 보존했습니다.',
       1, 1, 1
WHERE NOT EXISTS (
    SELECT 1 FROM experience_detail
    WHERE experience_id = 17 AND content = '운영 중 교육과정 개편과 학습 연속성 보존'
);

SELECT id INTO @challenge_detail_id FROM experience_detail
WHERE experience_id = 17 AND content = '시험·과제형 Challenge 도메인 설계·출시' LIMIT 1;
SELECT id INTO @submission_detail_id FROM experience_detail
WHERE experience_id = 17 AND content = '여섯 학습 문맥의 문항 제출 파이프라인 통합' LIMIT 1;
SELECT id INTO @curriculum_detail_id FROM experience_detail
WHERE experience_id = 17 AND content = '운영 중 교육과정 개편과 학습 연속성 보존' LIMIT 1;

INSERT INTO experience_detail_skill (experience_detail_id, skill_id, list_order)
VALUES
    (@challenge_detail_id, 2, 0), (@challenge_detail_id, 16, 1),
    (@submission_detail_id, 2, 0), (@submission_detail_id, 16, 1),
    (@curriculum_detail_id, 2, 0), (@curriculum_detail_id, 16, 1)
ON DUPLICATE KEY UPDATE skill_id = VALUES(skill_id);
