-- V37에서 competency_study를 skill 이름 겹침만으로 자동 파생했더니, 실제로 인용한 근거(evidence)와
-- 무관한 학습 글까지 "관련 학습"에 섞여 들어갔다 (예: "무중단 마이그레이션" 역량에 LogDoctor 비용진단 글이 노출).
-- study_experience_detail로 확인한 실제 세부 매핑을 근거로 각 역량의 evidence와 실제로 맞닿아 있는
-- 학습 글만 수동으로 다시 연결한다.

DELETE FROM competency_study;

INSERT INTO competency_study (competency_id, study_id, display_order)
VALUES
-- 1. 복잡한 도메인을 재사용 가능한 모델로 추상화하는 설계력
((SELECT id FROM competency WHERE display_order = 1), 1, 0),  -- AI 튜터 메시징 세션 아키텍처
((SELECT id FROM competency WHERE display_order = 1), 3, 1),  -- CQRS 리팩토링 및 데이터 마이그레이션
((SELECT id FROM competency WHERE display_order = 1), 7, 2),  -- 이메일/카페 문의 다형적 통합 수집
((SELECT id FROM competency WHERE display_order = 1), 5, 3),  -- 공용 라이브러리 모노레포 및 CLI 스캐폴딩

-- 2. 무중단으로 리스크 있는 변경을 완수하는 실행력
((SELECT id FROM competency WHERE display_order = 2), 8, 0),  -- PII 암호화 및 무중단 데이터 마이그레이션
((SELECT id FROM competency WHERE display_order = 2), 3, 1),  -- CQRS 리팩토링 및 데이터 마이그레이션

-- 3. 비동기·분산 환경에서 데이터 정합성을 지키는 신뢰성 설계
((SELECT id FROM competency WHERE display_order = 3), 1, 0),  -- AI 튜터 세션의 SQS 비동기 큐 연동
((SELECT id FROM competency WHERE display_order = 3), 2, 1),  -- 실시간 Presence 추적 및 이상 행동 감지

-- 4. 근본 원인부터 추적하는 운영·비용 진단력
((SELECT id FROM competency WHERE display_order = 4), 9, 0),  -- Azure 로그 비용 과다 진단 및 보관 기간 최적화
((SELECT id FROM competency WHERE display_order = 4), 11, 1), -- 지능형 로그 필터링 및 민감 정보 마스킹 엔진

-- 5. LLM을 실제 판단 흐름에 통합하는 능력
((SELECT id FROM competency WHERE display_order = 5), 10, 0), -- 클라우드 인프라 생존 및 앱 관측성 진단(Teams 봇 처방 카드)

-- 6. 요구 파악부터 배포·운영까지 혼자 완결하는 오너십
((SELECT id FROM competency WHERE display_order = 6), 4, 0),  -- Spring Boot 백오피스 서버 단독 구축
((SELECT id FROM competency WHERE display_order = 6), 5, 1);  -- 공용 라이브러리 모노레포 및 CLI 스캐폴딩
