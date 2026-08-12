-- 2026-08-10 사용자 인터뷰와 Notion 보조 자료를 반영한다.
-- 공개 화면에는 동료 실명과 사내 패키지·서비스·데이터 식별자를 노출하지 않는다.

UPDATE experience
SET summary = '분리 효과가 명확한 공용 문항 조회 서비스를 구축하고, 공용 패키지와 서비스 생성 CLI로 신규 서비스의 인프라·4계층 모듈·배포 구성을 표준화했습니다.',
    takeaway = '전체 MSA 전환이 아닌 초기 서비스 분리와 재사용 기반을 완성했습니다. 직접 만든 개발 기반은 공용 문항 서비스와 동료가 개발한 읽기 모델 서비스에 실제 적용됐습니다.'
WHERE id = 20;

UPDATE experience
SET summary = '표준화되지 않은 스프레드시트와 수작업 메시지에 의존하던 무료체험·유료 전환 업무를 Spring Boot 백오피스로 전환해 실제 운영했습니다.',
    takeaway = 'Java/Spring/RDB를 처음 실무에 적용하면서 API·인증·알림·컨테이너 운영을 단독 담당했고, 운영 담당자 2~3명이 약 2~3개월 실제 사용했습니다.'
WHERE id = 18;

UPDATE experience_detail
SET situation = '운영팀은 무료체험 신청자를 표준화·정규화되지 않은 스프레드시트에 수작업으로 누적하고, 외부 메시징 사이트에 직접 접속해 신청자별 안내를 보내고 있었습니다. 시트가 계속 늘어나면서 운영 담당자들이 본업 외 업무로 매일 야근했습니다.',
    task = '최소 인원의 TF에서 신청부터 유료 전환까지의 업무 흐름을 표준화하고, 익숙하지 않은 Java/Spring 스택으로 실제 사용할 수 있는 백엔드를 완성해야 했습니다.',
    action_detail = '- Spring Boot·JPA·MySQL 기반 신청·상태·유입경로·프로모션·약관 업무 구현\n- Spring Security·Redis Session 관리자 인증과 cross-domain cookie 처리\n- 알림톡과 사내 협업 도구 운영 알림 연동\n- Docker Compose로 애플리케이션·웹 서버·MySQL·Redis·모니터링 구성 후 클라우드 VM 배포\n- 운영 수정 요청과 서버 핫픽스 대응',
    outcome = '운영 담당자 2~3명이 무료체험 신청부터 유료 전환까지 약 2~3개월 실제 사용했습니다. 흩어진 시트와 건별 수작업 메시지에 의존하던 흐름을 하나의 표준화된 업무 도구로 전환했습니다.',
    narrative = '회사 핵심 제품과 별개인 내부 TF였지만, 운영팀이 본업 외 업무로 매일 야근하던 실제 병목을 해결했습니다. Java/Spring/RDB를 처음 실무에 적용하면서 백엔드와 실행 환경을 단독으로 맡아 배포와 핫픽스까지 책임졌습니다.'
WHERE id = 3;

UPDATE experience_detail
SET action_detail = '- CTO와 Atlas Profiler로 병목 데이터와 처리 우선순위 선정\n- 조회 조건·정렬에 맞춘 복합 인덱스 설계\n- aggregation 초기 단계에서 필터·정렬·제한을 적용하고 조인 범위 축소\n- ObjectId 시간 순서를 활용한 범위 검색·정렬 개선\n- 쓰기가 많은 컬렉션은 _id 포함 인덱스 5개 이하로 관리하고, 초과 시 쿼리 또는 컬렉션 책임 재검토',
    narrative = 'CTO와 Atlas Profiler를 확인해 문제 데이터와 우선순위를 정한 뒤, 해결안을 먼저 설계하고 논의를 거쳐 실제 튜닝을 담당했습니다. 제출·학습·사용자·문항 데이터와 교사 질문·호출 조회에서 pipeline 단계 순서와 조인 범위를 줄이고 복합 인덱스를 적용했습니다. 읽기 위주 컬렉션의 최대 10개 기준은 팀 합의가 아니므로 제외했고, 기억에 의존한 28→5 같은 수치도 사용하지 않습니다.'
WHERE experience_id = 17
  AND content = 'Atlas Profiler 기반 MongoDB 쿼리·인덱스 최적화';

UPDATE experience_detail
SET action_detail = '- 기존 내부 이벤트 기반을 학습 종료 흐름에 확장\n- 학습 종료 UseCase의 제출 통계 계산 분리\n- 하나의 학습 종료 이벤트를 학생·학급·학원·전체 통계와 학습 트래킹으로 fan-out\n- 알림·Push·알림톡을 응답 필수 경로에서 분리\n- 비동기 Listener 예외·프로세스 장애 시 이벤트 소실·통계 동시 갱신 위험을 팀과 공동 분석\n- 이후 공용 이벤트 처리기와 외부 메시지 Consumer·멱등 처리 구조로 확장',
    narrative = '내부 이벤트 기반의 초기 토대는 CTO가 마련했으며, 저는 관련 설계 논의에 계속 참여하면서 이를 학습 종료 흐름에 적용·확장하는 설계와 핵심 구현을 담당했습니다. 통계·트래킹·알림을 fan-out해 평균 2.74초를 413ms로 줄였습니다. Listener 오류 격리 등 일부 후속 구현은 동료가 담당했으므로 공동 분석과 본인 구현 범위를 구분합니다.'
WHERE experience_id = 17
  AND content = '학습 종료 이벤트 fan-out 전환으로 평균 응답시간 85% 단축';

UPDATE experience_detail
SET content = '정적 기준 데이터의 인메모리 읽기 모델 설계·운영',
    situation = '학습 계획을 생성할 때 변경 빈도가 낮은 커리큘럼·문항 기준 데이터를 반복 조회하고 조인하는 비용이 누적됐습니다.',
    action_detail = '- 인스턴스 시작 시 커리큘럼·문항 기준 데이터를 1회 집계해 프로세스 메모리에 선적재\n- 캐시 범위를 개념·검증 문항까지 확장해 학습 계획 생성의 반복 조회를 메모리 탐색으로 전환\n- 비동기 초기화를 단일 Promise로 보호\n- 캐시 원본을 변형하던 필터링 사이드이펙트를 복사 후 가공하도록 핫픽스\n- 최초 배포의 메모리 부족에 대응해 캐시를 임시 제외하고 ECS 메모리를 1GB에서 2GB로 조정 후 재적용\n- 기준 데이터 변경 시 서버 재배포로 태스크별 로컬 캐시 교체',
    outcome = '2025년 1월 문항 캐시와 4월 개념 계열 캐시를 운영에 배포해 학습 계획 생성의 반복 DB 조회·조인을 제거했습니다. 메모리 용량과 데이터 신선도는 서버 용량 조정과 재배포 정책으로 관리했습니다.',
    narrative = '변경 빈도가 낮은 기준 데이터라는 특성을 활용해 분산 캐시 대신 ECS 태스크별 로컬 읽기 모델을 선택했습니다. 최초 운영 반영에서 OOM이 아닌 메모리 부족을 확인해 일시 제외하고 용량 조정 후 재적용했습니다. 정확한 응답시간 전후 수치는 보존되지 않아 사용하지 않습니다.'
WHERE experience_id = 17
  AND content = 'plannedStudy 인메모리 읽기 모델 설계·운영';

UPDATE experience_detail
SET content = '공용 문항 서비스와 반복 가능한 신규 서비스 개발 기반 구축',
    action_detail = '- 공용 문항 조회 서비스를 Clean Architecture/DDD 구조로 단독 구축\n- 사내 공용 패키지로 예외·서버·MongoDB·Redis·SQS·모니터링 기능 모듈화\n- 사내 CLI로 프로젝트와 4계층 모듈 생성 자동화\n- Docker Compose·MongoDB 초기화·개발/스테이징/운영 배포 템플릿 제공\n- 공용 문항 서비스와 동료가 개발한 읽기 모델 서비스에 실제 적용',
    narrative = '서비스 분리 방향과 아키텍처는 CTO·동료와 계속 함께 논의했고, 저는 공용 문항 서비스의 설계·구현과 공용 패키지·CLI를 직접 완성했습니다. 추정 시간 단축률 대신, 개발 기반이 실제 두 서비스에서 재사용됐다는 확인 가능한 결과로 설명합니다.'
WHERE id = 31;

INSERT INTO experience_detail
    (experience_id, content, display_order, situation, task, action_detail, outcome, narrative, visible)
SELECT
     17,
     '1초 Polling 병목 분석과 읽기·쓰기 경계 재설계',
     3,
     '교사용 대시보드가 연산량이 큰 API 3개를 1초마다 호출했습니다. 사용자와 학생 수가 늘면 이전 요청이 끝나기 전에 다음 요청이 중첩돼 응답시간이 계속 증가했고, 운영에서 60초 timeout이 반복됐습니다.',
     '단순 서버 증설보다 반복 연산과 거대한 학습 객체 조회의 원인을 줄이고, 통계의 도메인 책임과 읽기·쓰기 경계를 분리해야 했습니다.',
     '- 원인과 전환 순서를 CTO·동료와 공동 분석·논의\n- 단일 제출 통계를 학생·학급·학원·전체 관점의 네 모델로 분리\n- 실제 학습 판단용 모델과 조회 중심 모델의 책임 구분\n- Repository의 데이터베이스 주입 경계를 읽기와 쓰기로 명시적으로 분리\n- 기존 두 데이터 영역을 병합하는 마이그레이션 작성\n- 운영 데이터 기반 staging 검증 후 운영 전환',
     '대시보드 병목을 계기로 제출 통계 책임과 읽기·쓰기 경계를 분리하고, 후속 읽기 모델 서비스와 BFF 분리를 진행할 수 있는 기반을 마련했습니다.',
     '문제 진단과 아키텍처 방향은 팀과 함께 논의했고, 저는 제출 통계 4분할·DB 경계·마이그레이션의 설계와 핵심 구현을 담당했습니다. 전환 후 timeout 제거 여부를 입증할 보존 지표는 없어 성과로 단정하지 않습니다.',
     1
WHERE NOT EXISTS (
    SELECT 1 FROM experience_detail
    WHERE experience_id = 17 AND content = '1초 Polling 병목 분석과 읽기·쓰기 경계 재설계'
);

UPDATE competency_evidence
SET evidence_summary = '공용 문항 서비스와 공용 패키지·CLI를 실제 두 서비스에 적용'
WHERE competency_id = 12 AND experience_id = 20;
