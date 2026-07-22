-- V55: Update Experience 2 details narrative to complete STAR prose (S -> T -> A -> R in continuous paragraph)

-- 1. Detail 6 (Playwright OTP Session)
UPDATE experience_detail 
SET narrative = '네이버 카페 문의 수집 및 답변 등록 시, 캡차 및 2단계 인증 등 로그인 보안 정책으로 단순 API 호출이 불가능하고 세션 만료 시마다 수동 개입이 수반되는 상황이었습니다. 이에 폐쇄망 동작이 가능한 Playwright 워커 구축과 일회용 번호(OTP) 기반 자동 로그인 및 쿠키 노출 방지 전송 구조 구현을 목표로 설정했습니다. Playwright Headless 브라우저 워커를 구축하여 스마트폰 네이버 앱의 8자리 OTP 입력 로그인 과정을 자동화하고, NID_AUT 및 NID_SES 세션 쿠키를 AES-256-GCM으로 암호화하여 DB에 저장했습니다. 또한 응답 바디의 세션 노출을 방지하고자 HTTP Set-Cookie 및 X-Naver-Cookie 헤더 방식으로 전송 구조를 전환했습니다. 그 결과 수동 로그인 개입을 OTP 번호 입력으로 일원화하고, 세션 유효성 강제 동기화 및 네이버 카페 게시글 답변·대댓글 자동 등록 E2E 파이프라인을 구축했습니다.'
WHERE id = 6;

-- 2. Detail 7 (Email Header & Thread FSM)
UPDATE experience_detail 
SET narrative = '이메일 고객 문의 유입 시 동일 사용자의 회신이나 관련 메일이 개별 건으로 무작위 적재되어 CS 상담원의 중복 답변 및 문의 맥락 파편화가 발생하는 상황이었습니다. 이에 이메일 헤더 추적과 Heuristic 매칭을 결합해 파편화된 이메일을 단일 대화 스레드로 자동 병합하고 고객 회신 시 문의 상태를 자동으로 제어하는 과제를 수행했습니다. RFC 5322 이메일 헤더(Message-ID, In-Reply-To, References) 파싱으로 부모 문의를 역추적해 스레딩 체인을 구축하고, 헤더 유실 시에는 회신 접두사(Re:, Fwd:) 제거 정규화와 발신자 이메일 HMAC-SHA256 해시 B-Tree 인덱스 조회를 결합한 Heuristic 매칭을 적용했습니다. 또한 RESOLVED 상태 문의에 추가 회신 유입 시 OPEN 상태로 자동 변경하고 감사 로그에 이력을 기록하도록 개발했습니다. 이를 통해 회신 메일의 중복 티켓 생성을 방지하고, 연관 문의를 단일 대화 스레드로 통합하여 CS 상담 컨텍스트 일원화 및 해결 문의 재오픈 자동화를 구현했습니다.'
WHERE id = 7;

-- 3. Detail 8 (JPA Converter PII Encryption)
UPDATE experience_detail 
SET narrative = '고객 문의 데이터 내 개인정보(PII)가 DB에 평문 저장되어 개인정보보호법 준수 및 유출 리스크가 존재하는 상황이었습니다. 이에 영속성 계층 암복호화 자동화, 빠른 등치 조회를 위한 해시 컬럼 구축, 기존 평문 데이터의 무중단 암호화 이관을 목표로 설정했습니다. JPA AttributeConverter 및 Jackson Mixin 기반 AES-256-GCM 영속성 계층 암복호화를 적용하고, 암호문의 무작위 IV 특성으로 인한 등치 검색 불가를 해결하고자 발신자 이메일 단방향 HMAC-SHA256 해시 컬럼을 추가해 B-Tree 인덱스 조회를 구현했습니다. 또한 복호화 실패 시 평문을 반환하는 Decrypt-or-PassThrough 예외 처리와 독립 CLI 마이그레이션 도구를 활용해 이관 작업을 가동했습니다. 그 결과 DB 유출 시에도 안전한 PII 암호화 보안 규격을 달성하고, 앱 기동 중단 없는 무중단(Zero-Downtime) 데이터 암호화 이관을 완료했습니다.'
WHERE id = 8;

-- 4. Detail 9 (n8n Multi-channel Ingestion Engine)
UPDATE experience_detail 
SET narrative = '네이버 카페, 이메일, 구글 시트 등 다중 채널 문의 내역을 수동 수집 관리함에 따라 행정 공수 낭비 및 데이터 파편화가 발생하는 상황이었습니다. 이에 채널별 정형화 수집 자동화, 수집 중복 방지 멱등성 보장, 첨부파일 S3 스토리지 연동을 과제로 추진했습니다. n8n 노코드 워크플로우로 5분 주기 크롤링 및 IMAP 수신을 자동화하고, 백엔드에서 4종 다형적 JSONB 메타데이터 구조 검증과 고유 키 기반 중복 방지 및 JDBC bulkInsert를 연동했습니다. 또한 MinIO S3 오브젝트 스토리지를 연동해 첨부 이미지 저장 및 상대경로 JSONB 매핑을 처리했습니다. 이를 통해 이종 채널의 문의 데이터를 단일 DB 스키마로 통합 수집하고, 고유 키 기반 중복 유입 방지 및 파일 스토리지 연동 수집 파이프라인을 구축했습니다.'
WHERE id = 9;

-- 5. Detail 10 (Nginx auth_request SSO)
UPDATE experience_detail 
SET narrative = '사내 백오피스, n8n, Grafana, MinIO 콘솔 등 개별 어드민 도구들에 대한 접근 제어 파편화 및 외부 무단 접속 위협이 존재하는 상황이었습니다. 이에 경계 네트워크 보안 강화, 외부 무단 접근 차단 및 쿠키 기반 단일 인증(SSO) 위임 처리를 목표로 설정했습니다. Nginx Reverse Proxy 수준에서 LAN/VPN IP 필터링과 Basic Auth를 적용하고 검증된 사용자명을 X-Remote-User 헤더로 연동했습니다. 또한 Nginx auth_request 지시어를 통해 백엔드 인증 검증 엔드포인트를 호출하도록 구성하고 전용 쿠키 기반 권한 검증을 처리했습니다. 그 결과 개별 어드민 도구의 보안 접근 규격을 단일 통로로 일원화하고 무단 외부 접근을 차단했습니다.'
WHERE id = 10;

-- 6. Detail 25 (Logback JSON & Grafana Observability)
UPDATE experience_detail 
SET narrative = '분산 컨테이너 환경에서 런타임 예외 발생 시 개별 로그 파일 직접 조회로 인한 원인 추적 비효율 및 모니터링 체계가 미비한 상황이었습니다. 이에 Logback 중앙 JSON 로깅, Grafana Alloy/Loki 로그 수집 파이프라인 및 실시간 가시화 대시보드 구축을 과제로 수행했습니다. logback-spring.xml 설정으로 Machine-Readable JSON Line 로그 파일(app.log, error.log, access.log)을 분리 저장하고, Docker Volume 기반 Grafana Alloy 수집기로 로그를 실시간 파싱해 Loki로 중앙 인덱싱 전송했습니다. 이를 Grafana 대시보드와 연동하여 5xx 예외 발생률 및 시스템 메트릭을 구성했습니다. 이를 통해 분산 컨테이너 로그를 중앙집중화하고 실시간 5xx 예외 감지 및 시스템 장애 원인 파악 디버깅 환경을 구축했습니다.'
WHERE id = 25;
