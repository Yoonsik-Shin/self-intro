-- V52: Update Experience 2 details narrative to continuous natural prose (줄글)

-- 1. Detail 6 (Playwright OTP Session)
UPDATE experience_detail 
SET narrative = '네이버 카페 문의 수집 및 답변 등록 시 캡차와 2단계 인증 등 강력한 로그인 보안 정책으로 세션 만료 시마다 수동 개입이 수반되는 문제를 해결하기 위해, Playwright 브라우저 워커와 자바 백엔드를 연동한 OTP 세션 자동화 파이프라인을 구축했습니다. 스마트폰 네이버 앱의 일회용 번호(OTP)로 로그인 과정을 자동화하여 획득한 NID_AUT, NID_SES 세션 쿠키를 AES-256-GCM으로 암호화해 DB에 영속화하고, 응답 바디의 쿠키 노출을 방지하기 위해 HTTP Set-Cookie 및 X-Naver-Cookie 헤더 방식으로 전송 보안 구조를 개편했습니다. 이를 통해 수동 로그인 개입을 원클릭 OTP 인증으로 일원화하고 세션 유효성 강제 동기화(syncSessionStatus) 및 네이버 카페 게시글 답변·대댓글 자동 등록 E2E 파이프라인을 완수했습니다.'
WHERE id = 6;

-- 2. Detail 7 (Email Header & Thread FSM)
UPDATE experience_detail 
SET narrative = '이메일 고객 문의 유입 시 동일 사용자의 회신이나 관련 메일이 개별 건으로 무작위 적재되어 CS 상담원의 중복 답변과 컨텍스트 파편화가 발생하는 문제를 해결하기 위해, RFC 5322 이메일 헤더 기반 스레딩 및 상태 제어 엔진을 개발했습니다. Message-ID, In-Reply-To, References 헤더 체인을 역추적해 부모 문의를 자동 매핑하고, 헤더 유실 시 발신자 이메일 HMAC-SHA256 해시값(email_sender_hash)과 정규화된 제목을 결합한 Heuristic 매칭을 적용했습니다. 또한 해결(RESOLVED) 상태 문의에 추가 회신 유입 시 OPEN 상태로 자동 복귀시키고 InquiryWorkLog에 감사 이력을 기록하여 회신 메일의 중복 티켓 생성을 방지하고 연관 문의를 단일 대화 스레드로 통합함으로써 CS 상담 컨텍스트 일원화와 문의 누락 방지 구조를 확립했습니다.'
WHERE id = 7;

-- 3. Detail 8 (JPA Converter PII Encryption)
UPDATE experience_detail 
SET narrative = '고객 문의 본문, 이메일, 전화번호 등 민감 개인정보(PII)가 DB에 평문 저장되어 발생할 수 있는 유출 리스크를 방지하고자, JPA AttributeConverter(EncryptedStringConverter) 및 Jackson Mixin 기반의 AES-256-GCM 영속성 계층 암복호화 아키텍처를 구축했습니다. AES/GCM 암호문의 무작위 IV 특성으로 인한 등치 검색 불가를 해결하기 위해 발신자 이메일 단방향 HMAC-SHA256 해시(email_sender_hash) 컬럼을 병행 설계해 B-Tree 인덱스 조회를 보장했습니다. 또한 복호화 실패 시 평문을 반환하는 Decrypt-or-PassThrough 예외 처리와 독립 CLI 마이그레이션 도구(PiiEncryptionMigrationTool)를 활용하여 DB 유출 시에도 안전한 PII 암호화 보안 규격을 달성하고 서비스 중단 없는 무중단(Zero-Downtime) 데이터 암호화 이관을 완수했습니다.'
WHERE id = 8;

-- 4. Detail 9 (n8n Multi-channel Ingestion Engine)
UPDATE experience_detail 
SET narrative = '네이버 카페, 이메일, 구글 시트 등 여러 채널로 파편화된 고객 문의 수집 과정을 자동화하고자, n8n 워크플로우와 Spring Boot REST API를 연동한 멀티채널 통합 수집 파이프라인을 구축했습니다. n8n으로 5분 주기 크롤링 및 IMAP 수신을 자동화하고, 백엔드에서 4종 다형적 JSONB 메타데이터 구조 검증과 InquiryUniqueKeyGenerator 고유 키 생성 엔진 및 JDBC Bulk Insert를 구현하여 수집 멱등성을 보장했습니다. 또한 MinIO S3 오브젝트 스토리지를 연동해 첨부 이미지 저장 및 상대경로 매핑을 최적화함으로써 이종 채널의 문의 데이터를 단일 DB 스키마로 통합 수집하고 중복 유입을 100% 차단하는 대용량 문의 통합 관리 인프라를 안착시켰습니다.'
WHERE id = 9;

-- 5. Detail 10 (Nginx auth_request SSO)
UPDATE experience_detail 
SET narrative = '사내 백오피스, n8n, Grafana, MinIO 콘솔 등 파편화된 개별 어드민 도구들의 보안 접근 제어를 일원화하기 위해, Nginx 경계 보안 및 auth_request 기반 통합 인증(SSO) 계층을 설계했습니다. Nginx Reverse Proxy 수준에서 LAN/VPN IP 필터링과 Basic Auth를 적용하고, 검증된 사용자명을 X-Remote-User 헤더로 백엔드 Spring Security와 연동했습니다. 또한 Nginx auth_request 서브루틴을 활용해 cs_admin_access 쿠키 기반 백엔드 권한 검증(/api/v1/auth/admin-tool-check)을 거쳐 어드민 툴 접속을 통제함으로써 개별 툴 복수 로그인 없이 단일 지점에서 보안 접근 제어를 완수하고 무단 외부 접근을 차단했습니다.'
WHERE id = 10;

-- 6. Detail 25 (Logback JSON & Grafana Observability)
UPDATE experience_detail 
SET narrative = '분산 컨테이너 환경에서 런타임 예외 발생 시 개별 로그 파일 직접 조회로 인한 원인 추적 비효율을 해결하고자, Logback과 Grafana Stack(Alloy + Loki + Grafana) 기반의 중앙집중 관측성(Observability) 파이프라인을 구축했습니다. logback-spring.xml 설정으로 Machine-Readable JSON Line 로그 파일을 분리 저장하고, Docker Volume 기반 Grafana Alloy 수집기로 로그를 실시간 파싱하여 Loki로 중앙 인덱싱 전송했습니다. 이를 Grafana 대시보드와 연동해 실시간 5xx 예외 에러율과 시스템 메트릭을 시각화함으로써 분산 로그 중앙집중화 및 장애 대응/디버깅 리드타임을 획기적으로 감축시켰습니다.'
WHERE id = 25;
