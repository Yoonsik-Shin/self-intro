-- 상단에 항상 보이는 summary가 추상적인 한 줄이라 설득력이 부족했다. 접어둔 "근거" 없이도 그 자체로
-- 읽히도록, 실제 경험(무엇을 했는지)과 그 경험에서 다져진 역량(무엇을 배웠는지)을 한 문단(~200자)으로 엮는다.

UPDATE competency SET
    summary = 'AI 튜터링 플랫폼에서 문제풀이·복습·챌린지·개념보강 4개 컨텍스트를 하나의 도메인 모델로 추상화하고, SubmittedProblem 조회 병목을 CQRS로 분리해 리팩토링했습니다. 이메일·네이버카페 등 채널마다 다른 CS 문의 구조를 다형적 메타데이터로 통합하고, 반복되는 마이크로서비스 설정을 공용 패키지와 CLI 스캐폴딩으로 표준화하며 도메인을 유연하게 재사용하는 설계 감각을 다졌습니다.',
    updated_at = NOW()
WHERE display_order = 1;

UPDATE competency SET
    summary = '이미 데이터가 쌓인 실서비스에 AES/GCM 암호화를 도입하며, 복호화 실패 시 평문을 그대로 통과시키는 하위 호환 로직으로 무중단 점진 마이그레이션을 완수했습니다. SubmittedProblem 6만여 건을 학급·학생·전체·학원 단위 컬렉션으로 재구성하는 CQRS 전환까지 서비스 중단이나 데이터 유실 없이 총괄하며, 리스크를 통제하는 실행 원칙을 체득했습니다.',
    updated_at = NOW()
WHERE display_order = 2;

UPDATE competency SET
    summary = 'gRPC 기반 실시간 음성 스트리밍과 Kafka/Redis 메시지 큐를 결합해 대용량 트래픽에서도 데이터 유실과 지연 병목 없이 비동기 상태를 통제했습니다. 학습 플랫폼에서도 외부 LLM 서버와의 통신 지연이 실시간 스레드를 막지 않도록 SQS 큐로 분리하고 MongoDB 트랜잭션으로 정합성을 지키며, 분산 시스템에서 멱등성과 일관성을 설계하는 감각을 키웠습니다.',
    updated_at = NOW()
WHERE display_order = 3;

UPDATE competency SET
    summary = 'BaseInspector로 11개 진단 규칙을 플러그인 형태로 추가 가능한 구조를 설계하고, KQL과 Azure Resource Graph로 과금 로그와 예산 한도를 실시간 교차 분석해 비용 급증의 원인을 데이터로 추적했습니다. 사내 CS 시스템에서는 Grafana Alloy·Loki 로그 파이프라인과 Datadog 모니터링 체계를 직접 구축하며, 증상이 아니라 근본 원인부터 진단하는 운영 감각을 다졌습니다.',
    updated_at = NOW()
WHERE display_order = 4;

UPDATE competency SET
    summary = '진단 엔진이 산출한 정량 지표를 LLM에 결합해, 비전문가 관리자도 바로 실행할 수 있는 비용 절감·보안 처방 카드를 Teams Markdown으로 자동 생성했습니다. AI 모의면접 서비스에서는 PDF 이력서를 청킹·임베딩하고 Rerank 모델을 결합해 질문 생성의 근거 정확도를 높이며, LLM을 대화가 아닌 판단 로직에 결합하는 RAG 설계 역량을 쌓았습니다.',
    updated_at = NOW()
WHERE display_order = 5;

UPDATE competency SET
    summary = '요구사항 정의부터 Spring Boot 3.2 기반 헥사고날 아키텍처 설계, 카카오 알림톡·Teams 알림 연동, Redis 세션 크로스도메인 이슈 디버깅까지 144개 클래스 규모 서비스를 1인으로 완결했습니다. AWS ECS·SQS 인프라와 CI/CD, npm workspaces 모노레포·CLI 스캐폴딩까지 단독 구축하며, 기획부터 운영까지 전 과정을 책임지는 오너십을 길렀습니다.',
    updated_at = NOW()
WHERE display_order = 6;
