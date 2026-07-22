-- V49: Update Experience 2 details with STAR framework (situation, task, action_detail, outcome, narrative)
-- Target Experience ID: 2 (고객문의 수집·자동응답 통합 테스트베드)

-- 1. Update Detail 6 (Playwright OTP Session)
UPDATE experience_detail 
SET content = '네이버 로그인 보안 우회 및 Playwright 기반 세션 관리 자동화',
    situation = '네이버 카페 문의 수집 및 답변 등록 시, 캡차 및 2단계 인증 등 강력한 로그인 보안 정책으로 단순 API 직접 호출이 불가능하고 세션 만료 시마다 수동 개입이 수반됨.',
    task = '외부 인터넷 다운로드 없이 폐쇄망 동작이 가능한 Playwright 워커 구축, 일회용 번호(OTP) 기반 자동 로그인 및 쿠키 노출 방지 전송 구조 구현.',
    action_detail = '- Playwright Headless 브라우저 워커 구축\n- 스마트폰 네이버 앱 8자리 OTP 입력 로그인 자동화\n- NID_AUT, NID_SES 쿠키 AES-256-GCM 암호화 DB 보관\n- 응답 바디 세션 노출 방지를 위한 HTTP Set-Cookie 및 X-Naver-Cookie 헤더 전송 구조 전환',
    outcome = '수동 로그인 개입을 원클릭 OTP 번호 입력으로 일원화하고, 세션 유효성 강제 동기화(syncSessionStatus) 및 네이버 카페 내 게시글 답변·대댓글 자동 등록 E2E 파이프라인 안착.',
    narrative = '네이버 카페 문의 수집 시 2단계 인증과 CAPTCHA 챌린지로 인해 세션 만료 때마다 수동 개입이 발생하는 문제를 해결하기 위해, Playwright 브라우저 워커와 자바 백엔드를 연동하는 OTP 세션 자동화 파이프라인을 구축했습니다. 스마트폰 네이버 앱의 일회용 번호로 자동 로그인 후 NID_AUT, NID_SES 쿠키를 추출하고 AES-256-GCM으로 암호화하여 DB에 영속화했습니다. 또한 연동 로깅 과정에서의 세션 누출을 방지하고자 JSON 응답 바디에서 쿠키를 제거하고 HTTP Set-Cookie 및 X-Naver-Cookie 헤더 방식으로 보안 전송 구조를 개편했습니다. 이를 통해 수동 로그인 단계를 원클릭 OTP 인증으로 전환하고 네이버 카페 내 답변 및 대댓글 등록 E2E 자동화를 완수했습니다.',
    display_order = 0
WHERE id = 6;

-- 2. Update Detail 7 (Email Header & Thread FSM)
UPDATE experience_detail 
SET content = '이메일 헤더 분석 및 본문 정규화를 통한 문의 스레드/상태 자동 연동 엔진',
    situation = '이메일 고객 문의 유입 시 동일 사용자의 회신이나 관련 메일이 개별 건으로 무작위 적재되어 CS 상담원의 중복 답변 및 문의 맥락 파편화가 발생함.',
    task = '이메일 헤더 추적과 Heuristic 매칭을 결합해 파편화된 이메일을 단일 대화 스레드로 자동 병합하고 고객 회신 시 문의 상태를 자동으로 제어함.',
    action_detail = '- RFC 5322 이메일 헤더(Message-ID, In-Reply-To, References) 파싱으로 부모 문의 역추적\n- 회신 접두사(Re:, Fwd:) 제거 정규화 및 발신자 이메일 HMAC-SHA256 해시값(email_sender_hash) B-Tree 인덱스 기반 Heuristic 매칭\n- RESOLVED 문의에 추가 회신 유입 시 OPEN 상태 자동 복귀 및 InquiryWorkLog 감사 로깅',
    outcome = '회신 메일의 중복 티켓 생성 방지, 연관 문의 단일 스레드 통합을 통한 CS 상담 컨텍스트 일원화, 해결된 문의의 자동 재오픈을 통한 문의 누락 방지 구조 확립.',
    narrative = '이메일 고객 문의 유입 시 회신 메일이 개별 건으로 무작위 적재되어 중복 답변과 컨텍스트 혼선이 발생하는 문제를 해결하기 위해, RFC 5322 이메일 헤더 기반 스레딩 및 상태 제어 엔진을 개발했습니다. Message-ID, In-Reply-To, References 헤더 체인을 역추적해 부모 문의를 자동 매핑하고, 헤더 유실 시 발신자 이메일 HMAC-SHA256 해시값과 정규화된 제목을 결합한 Heuristic 매칭을 적용했습니다. 또한 해결(RESOLVED) 상태 문의에 추가 회신 유입 시 OPEN으로 자동 복귀시키고 InquiryWorkLog에 감사 이력을 기록함으로써 문의 누락을 방지하고 CS 상담 생산성을 높였습니다.',
    display_order = 1
WHERE id = 7;

-- 3. Update Detail 8 (JPA Converter PII Encryption)
UPDATE experience_detail 
SET content = 'JPA Converter 기반 개인정보(PII) AES/GCM 암호화 및 무중단 마이그레이션',
    situation = '고객 문의 본문, 이메일, 전화번호 등 민감 개인정보(PII)가 DB에 평문 저장되어 개인정보보호법 준수 및 유출 리스크가 존재함.',
    task = '영속성 계층 암복호화 자동화, 빠른 등치 조회를 위한 해시 컬럼 구축, 기존 평문 적재 데이터의 서비스 중단 없는 안전 암호화 이관.',
    action_detail = '- JPA AttributeConverter(EncryptedStringConverter) 및 Jackson Mixin 기반 AES-256-GCM 암복호화 적용\n- 발신자 이메일 단방향 HMAC-SHA256 해시(email_sender_hash) 컬럼 설계로 O(log N) B-Tree 인덱스 등치 조회 구현\n- 복호화 실패 시 평문을 반환하는 decryptOrPassThrough 하위 호환 로직 및 독립 CLI 마이그레이션 도구(PiiEncryptionMigrationTool) 가동',
    outcome = 'DB 유출 시에도 안전한 PII 암호화 보안 규격을 달성하고, 앱 기동 중단 없는 무중단(Zero-Downtime) 암호화 마이그레이션 체계 완수.',
    narrative = '고객 문의 데이터 내 민감 개인정보(PII)를 보호하기 위해 JPA Attribute Converter 및 Jackson Mixin 기반의 AES-256-GCM 저장소 암호화 아키텍처를 구축했습니다. AES/GCM 암호문의 무작위 IV 특성으로 인한 등치 검색 불가를 해결하고자 발신자 이메일의 HMAC-SHA256 해시(email_sender_hash) 컬럼을 병행 설계해 B-Tree 인덱스 조회를 보장했습니다. 또한 앱 기동 경로와 분리된 독립 CLI 마이그레이션 도구(PiiEncryptionMigrationTool)를 개발하고 Decrypt-or-PassThrough 예외 처리 패턴을 적용하여 서비스 중단 없는 무중단 데이터 암호화 이관 체계를 완성했습니다.',
    display_order = 2
WHERE id = 8;

-- 4. Update Detail 9 (n8n Multi-channel Ingestion Engine)
UPDATE experience_detail 
SET content = 'n8n 워크플로우 및 Spring Boot REST API 기반 멀티채널 문의 통합 수집 파이프라인',
    situation = '네이버 카페, 이메일, 구글 시트 등 다중 채널 문의 내역을 수동 수집 관리함에 따른 행정 공수 낭비 및 데이터 파편화가 발생함.',
    task = '채널별 정형화 수집 자동화, 수집 중복 방지 멱등성 보장, 첨부파일 S3 스토리지 연동.',
    action_detail = '- n8n 노코드 워크플로우로 5분 주기 네이버 카페 크롤링 및 IMAP 메일 수신 자동화\n- Spring Boot 백엔드에서 4종 다형적 JSONB 메타데이터(EmailMetadata, NaverCafeMetadata 등) 구조 검증 및 parsing 처리\n- InquiryUniqueKeyGenerator 고유 키 생성 엔진 및 JDBC bulkInsert 구현\n- MinIO S3 오브젝트 스토리지 연동 및 첨부 이미지 상대경로 JSONB 매핑 최적화',
    outcome = '이종 채널의 문의 데이터를 단일 DB 스키마로 통합 수집하고, 고유키 기반 중복 방지 및 파일 스토리지 연동 인프라 안착.',
    narrative = '네이버 카페, 이메일, 구글 시트 등 여러 채널로 파편화된 고객 문의 수집 과정을 자동화하기 위해, n8n 워크플로우와 Spring Boot REST API를 연동한 멀티채널 통합 수집 파이프라인을 구축했습니다. 채널별 다형적 JSONB 메타데이터 구조를 정형화하고, 중복 유입을 차단하는 InquiryUniqueKeyGenerator 고유 키 생성 엔진과 Bulk Insert를 적용했습니다. 또한 MinIO S3 기술을 연동해 첨부 이미지 저장 및 상대경로 매핑을 최적화함으로써 대용량 문의 통합 관리 기반을 다졌습니다.',
    display_order = 3
WHERE id = 9;

-- 5. Update Detail 10 (Nginx auth_request SSO)
UPDATE experience_detail 
SET content = 'Nginx auth_request 계층 SSO 연동 및 통합 접근 제어 구축',
    situation = '백오피스, n8n, Grafana, MinIO 콘솔 등 개별 어드민 도구들에 대한 접근 제어 파편화 및 외부 무단 접속 위협이 존재함.',
    task = '경계 네트워크 보안 강화, 외부 접근 차단 및 쿠키 기반 단일 인증(SSO) 위임 처리.',
    action_detail = '- Nginx Reverse Proxy 수준 LAN/VPN IP 필터링 & Basic Auth 적용 및 X-Remote-User 신뢰 헤더 터널링\n- Nginx auth_request /_admin_tool_auth 지시어와 백엔드 /api/v1/auth/admin-tool-check 서브루틴 연동\n- cs_admin_access 쿠키 기반 어드민 툴(/n8n/, /grafana/, /minio/) 통합 접근 통제',
    outcome = '백오피스 및 개발/운영 어드민 도구들의 보안 접근 규격을 단일 통로로 일원화하고 무단 외부 접근 차단.',
    narrative = '사내 백오피스, n8n, Grafana, MinIO 등 파편화된 개별 어드민 툴들의 보안 접근을 일원화하고자, Nginx 경계 보안 및 auth_request 기반 통합 인증(SSO) 계층을 설계했습니다. Nginx 수준에서 LAN/VPN IP 필터링과 Basic Auth를 적용하고, 검증된 사용자명을 X-Remote-User 헤더로 백엔드 Spring Security와 안전하게 연동했습니다. 또한 Nginx auth_request 서브루틴을 활용해 쿠키 기반 백엔드 권한 검증(/api/v1/auth/admin-tool-check)을 거쳐 어드민 툴 접속을 통제함으로써, 개별 툴 복수 로그인 없이 단일 지점에서 보안 접근 제어를 완료했습니다.',
    display_order = 4
WHERE id = 10;

-- 6. Insert Detail 25 (Logback JSON & Grafana Observability)
INSERT INTO experience_detail (id, experience_id, content, situation, task, action_detail, outcome, narrative, display_order)
SELECT 25, 2, 'Logback JSON 로깅 & Grafana Alloy / Loki 관측성 모니터링 구축',
       '분산 컨테이너 환경에서 런타임 예외 발생 시 개별 로그 파일 직접 조회로 인한 원인 추적 비효율 및 모니터링 체계 미비.',
       'Logback 중앙 JSON 로깅, Grafana Alloy/Loki 로그 수집 파이프라인 및 실시간 가시화 대시보드 구축.',
       '- logback-spring.xml 구성으로 Machine-Readable JSON Line 로그 파일 분리(app.log, error.log, access.log)\n- Docker Volume 기반 Grafana Alloy 로그 수집기 및 Loki 중앙 인덱싱 연동\n- Grafana 대시보드 구축으로 실시간 5xx 예외 에러율 및 서버 메트릭 가시화',
       '분산 컨테이너 로그의 중앙집중화, 실시간 5xx 예외 감지 대시보드 정착 및 시스템 장애 원인 파악 리드타임 개선.',
       '분산 컨테이너 환경에서 런타임 예외 발생 시 개별 로그 파일 추적 비효율을 해결하기 위해, Logback과 Grafana Stack(Alloy + Loki + Grafana) 기반의 중앙집중 관측성(Observability) 파이프라인을 구축했습니다. Logback 정책을 통해 Machine-Readable JSON 포맷 로그를 저장하고, Grafana Alloy 수집기로 로그를 실시간 파싱하여 Loki로 중앙 전송했습니다. 이를 Grafana 대시보드와 연동해 실시간 5xx 에러율과 시스템 메트릭을 시각화함으로써 장애 발생 시 원인 분석 및 디버깅 체계를 확립했습니다.',
       5
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM experience_detail WHERE id = 25);

-- 7. Link Experience 2 details with related Studies
-- Study 1: Playwright OTP Session
INSERT INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, 6 FROM study s WHERE s.slug = 'playwright-naver-session-bypass-e2e-automation'
AND NOT EXISTS (SELECT 1 FROM study_experience_detail sed WHERE sed.study_id = s.id AND sed.experience_detail_id = 6);

-- Study 2: RFC 5322 Email Threading FSM
INSERT INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, 7 FROM study s WHERE s.slug = 'email-header-rfc5322-thread-fsm-engine'
AND NOT EXISTS (SELECT 1 FROM study_experience_detail sed WHERE sed.study_id = s.id AND sed.experience_detail_id = 7);

-- Study 3: JPA AES-256-GCM PII Encryption
INSERT INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, 8 FROM study s WHERE s.slug = 'db-level-pii-encryption-and-migration'
AND NOT EXISTS (SELECT 1 FROM study_experience_detail sed WHERE sed.study_id = s.id AND sed.experience_detail_id = 8);

-- Study 4: Nginx auth_request SSO
INSERT INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, 10 FROM study s WHERE s.slug = 'nginx-auth-request-sso-unified-access-control'
AND NOT EXISTS (SELECT 1 FROM study_experience_detail sed WHERE sed.study_id = s.id AND sed.experience_detail_id = 10);

-- Study 5: Grafana Loki Alloy Logback Observability
INSERT INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, 25 FROM study s WHERE s.slug = 'grafana-loki-alloy-logback-centralized-observability'
AND NOT EXISTS (SELECT 1 FROM study_experience_detail sed WHERE sed.study_id = s.id AND sed.experience_detail_id = 25);

-- Study 6: n8n Multi-Channel Ingestion
INSERT INTO study_experience_detail (study_id, experience_detail_id)
SELECT s.id, 9 FROM study s WHERE s.slug = 'n8n-multichannel-ingestion-idempotent-engine'
AND NOT EXISTS (SELECT 1 FROM study_experience_detail sed WHERE sed.study_id = s.id AND sed.experience_detail_id = 9);
