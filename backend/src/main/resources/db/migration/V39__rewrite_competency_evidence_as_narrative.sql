-- 대표 근거를 나열형 문장(사건1, 추가사례: A·B)으로 쪼개서 보여주던 것을, 여러 프로젝트를 하나의
-- 흐름으로 엮어 설득하는 한 문단으로 다시 쓴다. 프런트에서도 "대표 실무 근거/추가 검증 사례/관련 학습"을
-- 하나의 접힌 "근거" 섹션으로 합쳤으므로, 펼쳤을 때 보이는 본문 자체가 완결된 문단이어야 한다.
-- 보조 근거(is_primary=FALSE)는 이제 칩 형태의 링크로만 노출되므로 evidence_summary는 비운다.

UPDATE competency_evidence ce
JOIN competency c ON c.id = ce.competency_id
SET ce.evidence_summary =
    'AI 튜터링 메시징 세션을 문제풀이·복습·챌린지·개념보강 4개 컨텍스트로 나누되 하나의 도메인 모델로 추상화하고, SubmittedProblem 조회 트래픽 문제를 CQRS로 분리해 재사용 가능한 구조로 리팩토링했습니다. 같은 패턴은 이메일·네이버 카페처럼 서로 다른 채널의 고객 문의를 하나의 통합 모델로 흡수한 CS 시스템에서도, 여러 마이크로서비스에 반복되던 설정을 공용 패키지와 CLI 스캐폴딩으로 표준화한 작업에서도 일관되게 반복됩니다.'
WHERE c.display_order = 1 AND ce.is_primary = TRUE;

UPDATE competency_evidence ce
JOIN competency c ON c.id = ce.competency_id
SET ce.evidence_summary =
    '이미 대량의 실서비스 데이터가 쌓인 상태에서 AES/GCM 암호화를 도입하며, 복호화 실패 시 평문을 그대로 통과시키는 하위 호환 로직(decryptOrPassThrough)으로 무중단 점진 마이그레이션을 완수했습니다. 같은 원칙으로 SubmittedProblem 6만여 건 데이터를 학급·학생·전체·학원 단위 읽기 전용 컬렉션으로 재구성하는 CQRS 전환 마이그레이션도 서비스 중단이나 데이터 유실 없이 총괄했습니다.'
WHERE c.display_order = 2 AND ce.is_primary = TRUE;

UPDATE competency_evidence ce
JOIN competency c ON c.id = ce.competency_id
SET ce.evidence_summary =
    'gRPC 기반 실시간 음성 스트리밍과 Kafka/Redis 메시지 큐를 결합해, 대용량 트래픽에서도 데이터 유실과 지연 병목 없이 마이크로서비스 간 비동기 상태를 통제했습니다. 학습 플랫폼에서도 외부 LLM 서버와의 통신 지연이 실시간 스레드를 막지 않도록 SQS 비동기 큐로 분리하고, 세션 상태 변경에 MongoDB 트랜잭션을 적용해 정합성을 지켰습니다.'
WHERE c.display_order = 3 AND ce.is_primary = TRUE;

UPDATE competency_evidence ce
JOIN competency c ON c.id = ce.competency_id
SET ce.evidence_summary =
    'BaseInspector 클래스로 11개 진단 규칙을 플러그인 형태로 추가 가능한 구조를 설계하고, KQL과 Azure Resource Graph로 과금 로그와 예산 한도를 실시간 교차 분석해 비용 급증의 원인을 근거 데이터로 추적했습니다. 사내 CS 시스템에서는 Grafana Alloy·Loki로 로그 파이프라인을 구성하고 Nginx auth_request 기반 SSO 프록시로 접근을 통제했으며, Datadog 모니터링 체계로 배포 이후 장애를 조기에 발견해 운영 리스크를 줄였습니다.'
WHERE c.display_order = 4 AND ce.is_primary = TRUE;

UPDATE competency_evidence ce
JOIN competency c ON c.id = ce.competency_id
SET ce.evidence_summary =
    '진단 엔진이 산출한 정량 지표를 LLM에 결합해, 비전문가 관리자도 바로 실행할 수 있는 비용 절감·보안 처방 카드를 Teams Markdown으로 자동 생성했습니다. AI 모의면접 서비스에서도 PDF 이력서를 청킹·임베딩하고 Rerank 모델을 결합해, 면접 질문 생성의 근거 정확도를 높이는 RAG 파이프라인을 구성했습니다.'
WHERE c.display_order = 5 AND ce.is_primary = TRUE;

UPDATE competency_evidence ce
JOIN competency c ON c.id = ce.competency_id
SET ce.evidence_summary =
    '요구사항 정의부터 Spring Boot 3.2 기반 헥사고날 아키텍처 설계, 카카오 알림톡·Teams 알림 연동, Redis 세션 크로스도메인 이슈 디버깅까지 144개 클래스 규모의 서비스를 1인으로 완결했습니다. AWS ECS·SQS 인프라와 Docker 배포 환경, GitHub Actions CI/CD를 처음부터 구축해 배포 자동화 기반을 마련했고, npm workspaces 모노레포와 CLI 스캐폴딩 도구까지 단독 개발해 신규 서버 구성 시간을 수 일에서 수 분으로 단축했습니다.'
WHERE c.display_order = 6 AND ce.is_primary = TRUE;

UPDATE competency_evidence SET evidence_summary = NULL WHERE is_primary = FALSE;
