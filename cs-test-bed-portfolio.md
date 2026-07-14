# CS Test Bed — 고객문의 수집·자동응답 통합 테스트베드

약 4주 단독 개발 · 113회 커밋 · 5개 컨테이너 서비스 오케스트레이션

## 해결하고자 한 문제

- CS 상담원이 네이버 카페, 이메일 등 여러 채널을 수작업으로 순회하며 문의를 확인·답변하는 비효율 제거
- 브라우저 자동화(Playwright)로 네이버에 로그인해 답변을 게시하려면 세션이 계속 필요한데, 세션이 중간에 만료되는 문제 → 세션 우회/자동 갱신 구조 검증
- 반복적인 채널 수집·정제 작업을 노코드 워크플로우(n8n)로 오케스트레이션하면서도, 중복 실행·에러 전파 같은 운영 안정성 문제를 함께 해결

## 구축한 내용

- **백엔드 API** (Spring Boot 3.3 / Java 21, ~130개 클래스): 문의 도메인 모델링, QueryDSL 기반 동적 검색/정렬 API, Flyway로 13단계 스키마 마이그레이션 관리, DB 기반 RBAC(역할별 API 접근 제어, AOP `@RequireRoles`), 고객 PII(전화번호·문의내용·이메일 발신자) 저장 시 암호화
- **프론트엔드** (React 19 + TypeScript + Vite): 문의 대시보드, 배치 상태 일괄 처리, 저장 필터/북마크, 이미지 미리보기·압축 업로드, 실시간 새로고침 UI
- **브라우저 자동화 워커** (Playwright + Express): 네이버 로그인 세션 우회 및 카페 댓글/답변 자동 게시
- **워크플로우 오케스트레이션** (n8n): 카페 게시판·이메일 등 다중 채널 수집 파이프라인, 트리거별 Lock 패턴으로 중복 실행 방지, 전역 에러 핸들링 워크플로우
- **인프라/관측성**: Docker Compose로 API·프론트엔드·워커·n8n·DB·MinIO·Grafana 스택 전체 구성, Nginx 단일 진입점 + Basic Auth + `auth_request` 기반 서브패스별 인증 계층, Loki+Grafana+Alloy 로그 모니터링, Docusaurus 개발자 위키(OpenAPI 스펙 자동 동기화)

## 핵심 기술적 성과

- HMAC 기반 접근 토큰 발급과 Nginx `auth_request`를 조합해 n8n/Grafana/위키/MinIO 등 내부 도구를 코드 수정 없이 서브패스 단위로 보호하는 인증 계층 설계
- 네이버 카페 페이징·아이템 인덱스 매핑 오류, 다중 게시판 워크플로우 병합 등 실제 운영 중 드러난 자동화 파이프라인 결함을 지속적으로 하드닝
- 고객 개인정보를 운영 앱과 분리된 별도 마이그레이션 도구로 설계해 무중단 암호화 전환 수행
- n8n 워크플로우에 트리거별 독립 Lock 패턴을 도입해 동시 트리거로 인한 중복 처리를 방지하고 전역 에러 파싱/알림 체계 구축

## 기술 스택

`Java 21` `Spring Boot 3.3` `Spring Security` `QueryDSL` `Flyway` `PostgreSQL 16` `React 19` `TypeScript` `Vite` `Playwright` `n8n` `Nginx` `MinIO(S3)` `Docker Compose` `Grafana/Loki/Alloy` `Docusaurus`
