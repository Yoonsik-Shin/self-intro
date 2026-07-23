-- V62: Rewrite the LogDoctor project from committed implementation evidence.
--
-- Evidence boundary:
-- - Three repositories were inspected at committed HEAD; stale Markdown was excluded.
-- - The client agent contains 11 registered diagnostic rules and 24 committed pytest files.
-- - Durable Functions implements queue/timer triggers, fan-out/fan-in and activity retries.
-- - The provider implements queue workers, tenant-partitioned Cosmos repositories, ETag
--   concurrency, bounded asynchronous writes, Teams notifications and Entra/Graph guards.
-- - Bicep grants the diagnostic agent 12 read management actions and one read data action.
-- - The Teams client implements setup, delegation, agent management, diagnosis dashboards
--   and notification settings.
--
-- Unverifiable effects and stale claims (18 permissions, one-minute setup, guaranteed timeout
-- elimination, precise savings and unrelated proxy technology) are intentionally excluded.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @log_doctor_id = (
    SELECT experience_id FROM project WHERE slug = 'project-log-doctor' LIMIT 1
);
SET @original_diagnosis_detail_id = (
    SELECT id FROM experience_detail WHERE experience_id = @log_doctor_id AND display_order = 0 LIMIT 1
);
SET @original_orchestration_detail_id = (
    SELECT id FROM experience_detail WHERE experience_id = @log_doctor_id AND display_order = 1 LIMIT 1
);
SET @original_permission_detail_id = (
    SELECT id FROM experience_detail WHERE experience_id = @log_doctor_id AND display_order = 2 LIMIT 1
);
SET @original_teams_detail_id = (
    SELECT id FROM experience_detail WHERE experience_id = @log_doctor_id AND display_order = 3 LIMIT 1
);

UPDATE experience
SET title = 'Azure 로그 비용·관측성 진단 플랫폼 (LogDoctor)',
    summary = 'Azure 리소스의 로그 비용과 관측성 상태를 진단하는 팀 프로젝트입니다. Azure Functions 진단 에이전트, FastAPI 기반 멀티테넌트 API, React 기반 Teams 앱을 연결하고 KQL·Resource Graph·Log Analytics를 활용한 11개 진단 규칙을 구현했습니다.',
    takeaway = '진단 실행과 결과 수집을 비동기 경계로 분리하고, 읽기 전용 최소 권한·테넌트 데이터 경계·재시도 가능한 처리 흐름을 함께 설계해 클라우드 진단 서비스를 제품 흐름으로 완성했습니다.'
WHERE id = @log_doctor_id;

UPDATE project
SET role = 'Full-stack & Cloud Engineer'
WHERE experience_id = @log_doctor_id;

UPDATE experience_detail
SET content = '11개 규칙을 확장 가능한 진단 엔진으로 구현',
    situation = 'Azure 리소스마다 로그 연결 상태, 애플리케이션 상태, 불필요한 수집과 보존 비용을 확인하는 방법이 달라 진단 로직이 쉽게 중복될 수 있었습니다.',
    task = '서로 다른 진단 기준을 같은 실행 계약으로 묶고, 리소스 탐색부터 근거 수집과 처방 생성까지 일관되게 확장할 수 있는 엔진을 구축했습니다.',
    action_detail = '- 공통 추상화와 등록 구조로 진단 규칙의 실행 계약 통일\n- 로그 비용·관측성·수집 예방·필터링의 네 영역에 11개 규칙 구현\n- Azure Resource Graph와 관리 API로 리소스 및 로그 연결 관계 탐색\n- Log Analytics에 KQL을 실행해 사용량·상태·요청 지표 수집\n- 규칙별 근거와 권장 조치를 동일한 결과 형식으로 변환',
    outcome = '11개 진단 규칙을 독립적으로 추가·실행할 수 있는 엔진을 완성하고, 24개 테스트 파일로 주요 규칙과 공통 흐름을 검증했습니다.',
    narrative = 'Azure 리소스마다 로그 연결 상태, 애플리케이션 상태, 불필요한 수집과 보존 비용을 확인하는 방법이 달라 진단 로직이 중복될 수 있었습니다. 공통 추상화와 등록 구조로 실행 계약을 통일하고 로그 비용·관측성·수집 예방·필터링의 네 영역에 11개 규칙을 구현했습니다. Resource Graph와 관리 API로 대상과 연결 관계를 찾고 Log Analytics의 KQL 결과를 규칙별 근거와 권장 조치로 변환했습니다. 그 결과 규칙을 독립적으로 추가·실행할 수 있는 진단 엔진을 완성하고, 24개 테스트 파일로 주요 규칙과 공통 흐름을 검증했습니다.',
    display_order = 0
WHERE id = @original_diagnosis_detail_id;

UPDATE experience_detail
SET content = 'Durable Functions 기반 병렬 진단 오케스트레이션 구축',
    situation = '여러 구독과 리소스를 탐색한 뒤 각 진단 규칙의 외부 API·KQL 작업을 실행해야 해 단일 요청에서 순차 처리하기에는 작업 시간이 길고 일시적 실패에도 취약했습니다.',
    task = '장시간 진단을 트리거·오케스트레이터·액티비티로 분리하고 병렬 실행, 재시도와 상태 복구가 가능한 흐름을 구축했습니다.',
    action_detail = '- Queue와 Timer 트리거로 수동·예약 진단 진입점 구성\n- 리소스 탐색, 연결 조회, 규칙 실행, 결과 전송을 액티비티로 분리\n- 병렬 실행 후 결과를 모으는 fan-out/fan-in 구조 적용\n- 외부 호출 액티비티에 재시도 정책 적용\n- 완료된 진단 결과를 제공자 큐로 전달',
    outcome = '작업 상태를 Durable Functions가 보존하고 독립 액티비티를 병렬·재시도하도록 구성해, 장시간 진단을 HTTP 요청 수명과 분리했습니다.',
    narrative = '여러 구독과 리소스를 탐색한 뒤 각 진단 규칙의 외부 API와 KQL 작업을 실행해야 해 단일 요청의 순차 처리로는 장시간 작업과 일시적 실패를 다루기 어려웠습니다. Queue와 Timer 트리거를 두고 리소스 탐색, 연결 조회, 규칙 실행, 결과 전송을 액티비티로 분리했습니다. 오케스트레이터에서는 fan-out/fan-in으로 독립 작업을 병렬 실행하고 외부 호출에는 재시도 정책을 적용했습니다. 그 결과 작업 상태를 보존하면서 진단을 HTTP 요청 수명과 분리하고, 완료 결과를 다음 처리 큐로 전달하는 흐름을 구축했습니다.',
    display_order = 1
WHERE id = @original_orchestration_detail_id;

UPDATE experience_detail
SET content = '읽기 전용 최소 권한의 고객 환경 진단 에이전트 설계',
    situation = '고객 Azure 환경을 진단하려면 여러 리소스와 로그를 조회해야 하지만, 진단 기능에 변경·삭제 권한을 부여하면 보안 범위가 불필요하게 커질 수 있었습니다.',
    task = '진단에 필요한 조회 범위를 코드와 배포 정의에서 식별하고, 고객 환경을 변경하지 않는 별도 에이전트와 권한 모델로 배포했습니다.',
    action_detail = '- 관리 리소스 조회 12개와 로그 데이터 조회 1개로 사용자 지정 역할 구성\n- 관리 작업과 데이터 작업 권한을 구분해 명시\n- Azure Functions 진단 에이전트와 관리형 ID 기반 인증 구성\n- Bicep으로 에이전트·저장소·AI 리소스와 역할 할당 자동화\n- 제공자 API의 사용자·테넌트·에이전트 접근 검증 적용',
    outcome = '진단 에이전트의 Azure 접근을 필요한 읽기 작업으로 제한하고, 애플리케이션과 인프라의 권한 경계를 배포 코드로 재현할 수 있게 했습니다.',
    narrative = '고객 Azure 환경을 진단하려면 여러 리소스와 로그를 조회해야 하지만 진단 기능에 변경·삭제 권한까지 부여하면 보안 범위가 커질 수 있었습니다. 실제 조회 경로를 기준으로 관리 리소스 조회 12개와 로그 데이터 조회 1개를 사용자 지정 역할로 구성하고, 관리 작업과 데이터 작업을 구분했습니다. Azure Functions 에이전트는 관리형 ID로 인증하고 Bicep으로 리소스와 역할 할당을 재현했으며 제공자 API에는 사용자·테넌트·에이전트 접근 검증을 적용했습니다. 그 결과 고객 환경을 변경하지 않는 읽기 전용 진단 경계를 명시적으로 구축했습니다.',
    display_order = 3
WHERE id = @original_permission_detail_id;

UPDATE experience_detail
SET content = 'Teams 안에서 이어지는 온보딩·진단·알림 경험 구축',
    situation = '사용자가 Azure Portal과 별도 관리 화면을 오가며 에이전트를 설치하고 진단 진행 상태와 결과를 확인하면 서비스 이용 흐름이 단절될 수 있었습니다.',
    task = 'Teams 앱 안에서 초기 설정, 권한 위임, 에이전트 관리, 진단 실행과 결과 확인, 알림 설정까지 이어지는 사용자 흐름을 구현했습니다.',
    action_detail = '- Teams 개인·팀 탭과 알림 전용 봇 매니페스트 구성\n- SSO 기반 사용자 확인과 테넌트 설정·배포 위임 화면 구현\n- 에이전트·구독·예약 진단 및 알림 설정 화면 구현\n- 진단 진행률·위험 요약·이력·상세 결과 대시보드 구현\n- 진단 완료와 운영 이벤트를 Teams 알림 및 딥링크로 연결',
    outcome = '설치와 관리부터 진단 결과 확인까지의 주요 기능을 Teams 안에 연결하고, 비동기 작업 완료를 알림에서 상세 화면으로 이어지게 했습니다.',
    narrative = '사용자가 Azure Portal과 별도 관리 화면을 오가며 에이전트를 설치하고 진단 결과를 확인하면 서비스 이용 흐름이 단절될 수 있었습니다. Teams 개인·팀 탭과 알림 전용 봇을 구성하고 SSO 기반 사용자 확인, 테넌트 설정과 배포 위임, 에이전트·구독·예약 진단 및 알림 설정 화면을 구현했습니다. 진단 진행률, 위험 요약, 이력과 상세 결과를 대시보드로 제공하고 완료 알림의 딥링크를 상세 화면에 연결했습니다. 그 결과 설치와 관리부터 비동기 진단 결과 확인까지의 주요 흐름을 Teams 안에서 이어지게 했습니다.',
    display_order = 4
WHERE id = @original_teams_detail_id;

INSERT INTO experience_detail (
    experience_id, content, situation, task, action_detail, outcome, narrative, display_order
)
SELECT
    @log_doctor_id,
    '비동기 수집과 멀티테넌트 리포트 저장 구조 구현',
    '고객 환경의 진단 결과가 큐를 통해 비동기로 도착하고 여러 테넌트의 리포트·세부 진단·통계를 함께 갱신해야 해 실패 재처리와 동시 수정 충돌을 고려해야 했습니다.',
    '큐 메시지를 안전하게 수집하고 테넌트별 데이터 경계와 동시성 제어를 유지하는 제공자 백엔드를 구축했습니다.',
    '- FastAPI 시작 시 Azure 인증과 데이터 저장소 연결 사전 준비\n- 진단 결과와 완료 요청을 분리한 Azure Queue 비동기 워커 구현\n- 성공한 메시지만 삭제하고 실패 메시지는 재처리하도록 처리 경계 설정\n- Cosmos DB에 테넌트 파티션, 커서 페이지네이션과 ETag 낙관적 동시성 적용\n- 동시 저장 작업을 제한해 데이터 저장소 부하 제어',
    '메시지 성공 여부와 삭제 시점을 일치시키고, 테넌트 경계·동시 수정 검증·페이지네이션을 갖춘 리포트 수집 및 조회 흐름을 구축했습니다.',
    '고객 환경의 진단 결과가 큐를 통해 비동기로 도착하고 여러 테넌트의 리포트와 세부 진단을 함께 갱신해야 해 실패 재처리와 동시 수정 충돌을 고려해야 했습니다. FastAPI 시작 시 Azure 인증과 데이터 저장소 연결을 준비하고, 진단 결과와 완료 요청을 분리한 Queue 워커를 구현했습니다. 성공한 메시지만 삭제해 실패 시 재처리되도록 했으며 Cosmos DB에는 테넌트 파티션, 커서 페이지네이션과 ETag 낙관적 동시성을 적용했습니다. 또한 동시 저장 작업 수를 제한해 부하를 제어했습니다. 그 결과 메시지 처리 경계와 테넌트별 리포트 수명주기를 일관되게 관리할 수 있게 했습니다.',
    2
FROM DUAL
WHERE @log_doctor_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM experience_detail
      WHERE experience_id = @log_doctor_id
        AND content = '비동기 수집과 멀티테넌트 리포트 저장 구조 구현'
  );

SET @diagnosis_detail_id = (
    SELECT id FROM experience_detail WHERE experience_id = @log_doctor_id AND display_order = 0 LIMIT 1
);
SET @orchestration_detail_id = (
    SELECT id FROM experience_detail WHERE experience_id = @log_doctor_id AND display_order = 1 LIMIT 1
);
SET @provider_detail_id = (
    SELECT id FROM experience_detail WHERE experience_id = @log_doctor_id AND display_order = 2 LIMIT 1
);
SET @permission_detail_id = (
    SELECT id FROM experience_detail WHERE experience_id = @log_doctor_id AND display_order = 3 LIMIT 1
);

INSERT IGNORE INTO experience_detail_skill (experience_detail_id, skill_id, list_order)
SELECT @provider_detail_id, s.id, ROW_NUMBER() OVER (ORDER BY s.display_order) - 1
FROM skill s
WHERE @provider_detail_id IS NOT NULL
  AND s.name IN ('Python', 'FastAPI', 'Cosmos DB');

UPDATE study
SET title = '근거 중심의 확장 가능한 클라우드 진단 규칙 설계',
    summary = '리소스 탐색, 쿼리 근거, 판정과 권장 조치를 분리해 진단 규칙을 독립적으로 확장하고 검증하는 설계 원칙',
    content_markdown = '# 근거 중심의 확장 가능한 클라우드 진단 규칙 설계\n\n## 학습 목표\n서로 다른 클라우드 리소스와 로그를 진단할 때 규칙마다 탐색·조회·판정 코드를 반복하지 않고, 근거를 추적할 수 있는 확장 구조를 설계하는 기준을 정리합니다.\n\n## 규칙의 공통 계약\n진단 규칙은 대상 식별, 근거 수집, 판정, 권장 조치의 네 단계를 같은 결과 계약으로 반환하는 편이 좋습니다. 실행기는 구체적인 규칙을 몰라도 등록된 규칙을 순회할 수 있고, 규칙은 필요한 데이터 소스와 판정 기준에만 집중할 수 있습니다.\n\n## 사실과 해석의 분리\n리소스 메타데이터와 쿼리 결과는 원본 근거로 보존하고, 위험 수준과 권장 조치는 별도의 해석으로 생성합니다. 이 경계를 지키면 판정 기준이 바뀌어도 수집기를 재사용할 수 있고 결과가 나온 이유를 설명하기 쉽습니다.\n\n## 데이터 소스 선택\n- Resource Graph는 여러 구독의 리소스와 설정을 한 번에 탐색할 때 적합합니다.\n- 관리 API는 특정 리소스의 상세 설정과 연결 관계를 확인할 때 사용합니다.\n- Log Analytics와 KQL은 실제 텔레메트리의 양, 빈도와 상태를 집계할 때 사용합니다.\n\n## 검증 전략\n공통 실행 계약, 데이터 없음, 일부 권한 부족, 쿼리 실패와 경계값을 각각 테스트해야 합니다. 외부 응답은 고정된 테스트 대역으로 격리하고 판정 함수는 동일한 입력에 같은 결과를 내도록 유지하는 것이 좋습니다.\n\n## 트레이드오프\n공통 계약은 규칙 추가를 단순하게 하지만 모든 규칙을 하나의 거대한 추상화에 맞추면 예외 필드와 분기가 늘어납니다. 공통 실행 수명주기만 고정하고 규칙별 근거 스키마는 필요한 만큼 독립적으로 두는 균형이 중요합니다.',
    learned_at = '2026-05-19',
    published_at = '2026-05-19 10:00:00'
WHERE slug = 'azure-log-cost-retention-optimization';

UPDATE study
SET title = '장시간 클라우드 작업의 오케스트레이션과 재처리 경계',
    summary = 'Durable Functions와 메시지 큐에서 병렬 실행, 재시도, 성공 확인 후 삭제와 멱등성을 설계하는 기준',
    content_markdown = '# 장시간 클라우드 작업의 오케스트레이션과 재처리 경계\n\n## 학습 목표\n여러 외부 API와 쿼리를 호출하는 장시간 작업을 HTTP 요청에서 분리하고, 일시적 실패와 중복 전달을 견디는 처리 흐름을 설계하는 방법을 정리합니다.\n\n## 오케스트레이터와 액티비티\n오케스트레이터는 실행 순서와 상태 전이만 결정하고 네트워크 호출과 데이터 저장은 액티비티에 둡니다. 오케스트레이터가 재생될 수 있는 런타임에서는 현재 시각, 난수와 직접 I/O 같은 비결정적 동작을 피해야 합니다.\n\n## 병렬화 기준\n서로 의존하지 않는 리소스 조회와 규칙 실행은 fan-out으로 시작하고 모든 결과가 필요한 시점에 fan-in합니다. 무조건적인 병렬화는 외부 서비스 제한을 초과할 수 있으므로 작업 묶음과 동시 실행 수를 함께 설계해야 합니다.\n\n## 재시도와 메시지 삭제\n일시적인 외부 오류에는 제한된 재시도와 지수형 대기를 적용할 수 있습니다. 큐 소비자는 후속 저장까지 성공한 뒤 메시지를 삭제해야 하며, 실패한 메시지는 가시성 제한이 끝난 후 다시 처리되도록 남겨 둡니다.\n\n## 중복 처리 대비\n큐는 같은 메시지를 다시 전달할 수 있으므로 업무 식별자를 멱등 키로 사용하고 이미 반영된 상태인지 확인해야 합니다. 상태 변경이 충돌할 수 있다면 버전 또는 ETag 조건부 갱신으로 오래된 쓰기를 거부합니다.\n\n## 점검 목록\n- 재시도 가능한 오류와 즉시 실패시킬 오류를 구분했는가\n- 부분 성공 결과를 다시 실행해도 중복 반영되지 않는가\n- 외부 API와 저장소의 동시 처리 한도를 지키는가\n- 실패 메시지를 관찰하고 격리할 방법이 있는가',
    learned_at = '2026-05-19',
    published_at = '2026-05-19 11:00:00'
WHERE slug = 'cloud-infrastructure-app-observability-diagnostics';

UPDATE study
SET title = '멀티테넌트 클라우드 서비스의 권한과 데이터 경계',
    summary = '관리 작업·데이터 작업 권한, 관리형 ID, 테넌트 파티션과 낙관적 동시성을 함께 설계하는 보안·저장 원칙',
    content_markdown = '# 멀티테넌트 클라우드 서비스의 권한과 데이터 경계\n\n## 학습 목표\n고객 클라우드 환경을 조회하는 멀티테넌트 서비스에서 접근 권한과 저장 데이터가 다른 테넌트로 넘어가지 않도록 경계를 설계하는 기준을 정리합니다.\n\n## 최소 권한 역할\n필요한 API 호출을 먼저 목록화하고 관리 리소스 작업과 데이터 작업을 구분합니다. 리소스 설정을 읽는 권한과 로그 테이블의 실제 데이터를 읽는 권한은 별도 범주이므로 둘을 명시적으로 검토해야 합니다. 진단처럼 조회가 목적인 기능에는 변경·삭제 작업을 포함하지 않습니다.\n\n## 관리형 ID\n워크로드의 ID를 플랫폼이 관리하게 하면 애플리케이션 설정에 장기 자격 증명을 저장할 필요가 줄어듭니다. 역할은 가능한 좁은 범위에 할당하고 배포 코드에 권한 정의와 할당을 함께 기록해 환경별 차이를 줄입니다.\n\n## 애플리케이션 경계\n인증된 사용자 정보만으로 접근을 허용하지 않고 요청한 테넌트, 설치된 에이전트와 대상 리소스의 소유 관계를 매 요청에서 검증합니다. 관리자 전용 작업과 일반 조회 작업도 분리합니다.\n\n## 저장 경계\n멀티테넌트 데이터는 테넌트 식별자를 파티션 키와 조회 조건에 포함해야 합니다. ETag 기반 조건부 갱신은 읽은 이후 다른 요청이 데이터를 바꾼 경우 오래된 쓰기를 거부해 동시 수정의 덮어쓰기를 막습니다.\n\n## 운영 점검 목록\n- 모든 조회에 테넌트 조건이 강제되는가\n- 권한 정의에 쓰기 또는 삭제 작업이 섞이지 않았는가\n- 자격 증명과 민감 로그가 저장·전송 경계를 넘지 않는가\n- 조건부 갱신 충돌을 사용자에게 재시도 가능한 형태로 전달하는가',
    learned_at = '2026-05-19',
    published_at = '2026-05-19 12:00:00'
WHERE slug = 'intelligent-log-filtering-pii-masking-engine';

DELETE sed
FROM study_experience_detail sed
JOIN study s ON s.id = sed.study_id
WHERE s.slug IN (
    'azure-log-cost-retention-optimization',
    'cloud-infrastructure-app-observability-diagnostics',
    'intelligent-log-filtering-pii-masking-engine'
);

INSERT IGNORE INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, @diagnosis_detail_id
FROM study s
WHERE s.slug = 'azure-log-cost-retention-optimization'
  AND @diagnosis_detail_id IS NOT NULL;

INSERT IGNORE INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, d.detail_id
FROM study s
JOIN (
    SELECT @orchestration_detail_id AS detail_id
    UNION ALL
    SELECT @provider_detail_id
) d ON d.detail_id IS NOT NULL
WHERE s.slug = 'cloud-infrastructure-app-observability-diagnostics';

INSERT IGNORE INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, d.detail_id
FROM study s
JOIN (
    SELECT @provider_detail_id AS detail_id
    UNION ALL
    SELECT @permission_detail_id
) d ON d.detail_id IS NOT NULL
WHERE s.slug = 'intelligent-log-filtering-pii-masking-engine';

UPDATE competency_evidence ce
JOIN competency c ON c.id = ce.competency_id
SET ce.evidence_summary = 'Azure 리소스와 로그 데이터를 근거로 11개 진단 규칙을 구현하고, Durable Functions의 병렬 실행·재시도와 읽기 전용 권한 경계로 진단 파이프라인을 구성했습니다.'
WHERE ce.experience_id = @log_doctor_id
  AND c.display_order = 4;

UPDATE competency_evidence ce
JOIN competency c ON c.id = ce.competency_id
SET ce.evidence_summary = '진단 규칙이 수집한 근거를 구조화된 권장 조치로 변환하고 Teams 대시보드와 알림 흐름에 연결해 비전문가도 결과를 확인할 수 있도록 구현했습니다.'
WHERE ce.experience_id = @log_doctor_id
  AND c.display_order = 5;
