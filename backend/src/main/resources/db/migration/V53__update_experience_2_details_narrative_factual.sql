-- V53: Update Experience 2 details narrative to strictly factual matter-of-fact tone (담백한 팩트 기반 줄글)

-- 1. Detail 6 (Playwright OTP Session)
UPDATE experience_detail 
SET narrative = '네이버 카페 문의 수집 및 답변 등록 시 캡차 및 2단계 인증으로 인한 세션 만료 수동 개입을 처리하기 위해, Playwright 브라우저 워커와 자바 백엔드를 연동한 OTP 세션 자동화 구조를 구축했습니다. 네이버 앱 일회용 번호(OTP) 입력 방식으로 로그인 후 NID_AUT, NID_SES 쿠키를 추출해 AES-256-GCM으로 암호화하여 DB에 저장하고, 응답 바디의 쿠키 노출을 방지하고자 HTTP Set-Cookie 및 X-Naver-Cookie 헤더 방식으로 전송 구조를 구현했습니다. 이를 통해 세션 만료 시 OTP 번호 입력으로 세션을 갱신하고(syncSessionStatus) 네이버 카페 게시글 답변 및 대댓글 자동 등록 파이프라인을 연동했습니다.'
WHERE id = 6;

-- 2. Detail 7 (Email Header & Thread FSM)
UPDATE experience_detail 
SET narrative = '이메일 문의 유입 시 회신 메일이 개별 티켓으로 분리 적재되는 문제를 해결하기 위해 RFC 5322 이메일 헤더 기반 스레딩 및 상태 제어 로직을 구현했습니다. Message-ID, In-Reply-To, References 헤더 체인을 추적해 기존 문의에 매핑하고, 헤더 유실 시에는 제목 정규화(Re:, Fwd: 제거)와 발신자 이메일 HMAC-SHA256 해시(email_sender_hash) B-Tree 인덱스 조회를 결합한 Heuristic 매칭을 적용했습니다. 또한 RESOLVED 상태 문의에 추가 회신 유입 시 OPEN 상태로 변경하고 InquiryWorkLog에 이력을 기록하도록 처리하여 회신 메일의 기존 스레드 통합 및 상태 자동 연동을 구현했습니다.'
WHERE id = 7;

-- 3. Detail 8 (JPA Converter PII Encryption)
UPDATE experience_detail 
SET narrative = '고객 문의 데이터 내 개인정보(PII)를 보호하기 위해 JPA AttributeConverter(EncryptedStringConverter) 및 Jackson Mixin 기반 AES-256-GCM 영속성 계층 암복호화를 적용했습니다. AES/GCM 암호문의 무작위 IV 특성으로 인한 등치 검색 불가를 해결하고자 발신자 이메일 단방향 HMAC-SHA256 해시(email_sender_hash) 컬럼을 추가하여 B-Tree 인덱스 조회를 구현했습니다. 또한 복호화 실패 시 평문을 반환하는 Decrypt-or-PassThrough 예외 처리 패턴과 독립 CLI 마이그레이션 도구(PiiEncryptionMigrationTool)를 연동하여 평문 데이터의 암호화 이관을 수행했습니다.'
WHERE id = 8;

-- 4. Detail 9 (n8n Multi-channel Ingestion Engine)
UPDATE experience_detail 
SET narrative = '네이버 카페, 이메일, 구글 시트 등 다중 채널 문의 수집을 자동화하기 위해 n8n 워크플로우와 Spring Boot REST API를 연동한 수집 파이프라인을 구축했습니다. n8n으로 5분 주기 크롤링 및 IMAP 수신을 자동화하고, 백엔드에서 4종 다형적 JSONB 메타데이터 구조 검증과 InquiryUniqueKeyGenerator 고유 키 기반 중복 방지 및 JDBC bulkInsert를 적용했습니다. 또한 MinIO S3 오브젝트 스토리지를 연동해 첨부 이미지 저장 및 상대경로 JSONB 매핑을 처리함으로써 다중 채널 문의 데이터의 단일 DB 수집 구조를 구현했습니다.'
WHERE id = 9;

-- 5. Detail 10 (Nginx auth_request SSO)
UPDATE experience_detail 
SET narrative = '백오피스, n8n, Grafana, MinIO 콘솔 등 개별 어드민 도구의 접근 통제를 일원화하기 위해 Nginx Reverse Proxy 및 auth_request 기반 인증 구조를 구성했습니다. Nginx 수준에서 LAN/VPN IP 필터링과 Basic Auth를 적용하고 검증된 사용자명을 X-Remote-User 헤더로 연동했습니다. 또한 Nginx auth_request 지시어로 백엔드 인증 검증 서브루틴(/api/v1/auth/admin-tool-check)을 호출하도록 연동하고 cs_admin_access 쿠키 기반 권한 검증을 처리하여 단일 인증 체계로 어드민 도구 접근을 통제했습니다.'
WHERE id = 10;

-- 6. Detail 25 (Logback JSON & Grafana Observability)
UPDATE experience_detail 
SET narrative = '분산 컨테이너 환경에서 예외 발생 시 로그 조회의 비효율을 개선하기 위해 Logback과 Grafana Stack(Alloy, Loki, Grafana) 기반 로그 수집 파이프라인을 구축했습니다. logback-spring.xml 설정으로 JSON Line 포맷 로그 파일(app.log, error.log, access.log)을 생성하고, Docker Volume 기반 Grafana Alloy 수집기로 로그를 파싱해 Loki로 전송했습니다. 이를 Grafana 대시보드와 연동하여 5xx 예외 발생률 및 시스템 메트릭을 모니터링할 수 있는 가시화 환경을 구성했습니다.'
WHERE id = 25;
