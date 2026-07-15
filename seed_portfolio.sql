-- ==========================================
-- Unified Portfolio Seeding SQL
-- Target Tables: profile, skill, experience, career, project, education, certificate, 
--                experience_skill, experience_detail, experience_detail_skill, tag, 
--                experience_tag, study, study_tag, study_skill, study_experience, study_experience_detail
-- ==========================================

START TRANSACTION;

-- Enable overwrite by disabling foreign keys temporarily to truncate
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE profile;
TRUNCATE TABLE experience_skill;
TRUNCATE TABLE experience_detail_skill;
TRUNCATE TABLE experience_detail;
TRUNCATE TABLE career;
TRUNCATE TABLE project;
TRUNCATE TABLE education;
TRUNCATE TABLE certificate;
TRUNCATE TABLE experience_tag;
TRUNCATE TABLE study_tag;
TRUNCATE TABLE study_skill;
TRUNCATE TABLE study_experience;
TRUNCATE TABLE study_experience_detail;
TRUNCATE TABLE study_relation;
TRUNCATE TABLE study;
TRUNCATE TABLE experience;
TRUNCATE TABLE skill;
TRUNCATE TABLE tag;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Profile Seeding
INSERT INTO profile (id, name, name_en, job_title, bio, career_summary, core_stack_summary, status_badge_text, github_url, email, phone, updated_at)
VALUES (
  1,
  '신윤식',
  'Yoonsik Shin',
  'Software Engineer',
  '에듀테크 실무 백엔드 개발 경험과 Java/Spring Boot, MSA 및 Cloud 인프라 구축 지식을 기반으로 안정적이고 최적화된 아키텍처를 설계하고 운영합니다.',
  '1년 11개월 (에듀테크 스타트업)',
  'Java / Node.js / Cloud',
  '실시간 아키텍처 및 콘텐츠 개선 중',
  'https://github.com/Yoonsik-Shin',
  'aaa946@naver.com',
  '010-5171-0994',
  NOW()
);

-- 2. Skills Seeding
INSERT INTO skill (id, name, category, skill_level, is_core, display_order, skill_version, skill_comment, usage_type) VALUES
(1, 'Java', 'LANGUAGE', '중급', TRUE, 1, '21', '실무 및 프로젝트 백엔드 주력 언어', 'WORK_EXPERIENCE'),
(2, 'TypeScript', 'LANGUAGE', '중급', TRUE, 2, '5', 'NestJS, Express, React 기반 서비스 구현에 활용', 'WORK_EXPERIENCE'),
(3, 'Python', 'LANGUAGE', '초급', FALSE, 3, NULL, NULL, 'LEARNING'),
(4, 'Node.js', 'LANGUAGE', '중급', TRUE, 4, '20', NULL, 'WORK_EXPERIENCE'),
(5, 'Spring Boot', 'FRAMEWORK', '중급', TRUE, 5, '3', '포트폴리오와 CS Test Bed API 서버에서 활용', 'WORK_EXPERIENCE'),
(7, 'FastAPI', 'FRAMEWORK', '초급', FALSE, 7, NULL, NULL, 'PROJECT_USE'),
(8, 'NestJS', 'FRAMEWORK', '중급', TRUE, 8, NULL, NULL, 'WORK_EXPERIENCE'),
(9, 'Express', 'FRAMEWORK', '중급', FALSE, 9, NULL, NULL, 'WORK_EXPERIENCE'),
(10, 'React', 'FRAMEWORK', '중급', FALSE, 10, '19', NULL, 'PROJECT_USE'),
(12, 'Django', 'FRAMEWORK', '초급', FALSE, 12, NULL, NULL, 'LEARNING'),
(13, 'QueryDSL', 'FRAMEWORK', '중급', FALSE, 13, NULL, NULL, 'PROJECT_USE'),
(14, 'Cosmos DB', 'DATABASE', '초급', FALSE, 14, NULL, NULL, 'PROJECT_USE'),
(15, 'Redis', 'DATABASE', '중급', TRUE, 15, NULL, '세션, 캐시, 실시간 상태 제어 경험', 'WORK_EXPERIENCE'),
(16, 'MongoDB', 'DATABASE', '중급', FALSE, 16, NULL, NULL, 'WORK_EXPERIENCE'),
(17, 'SQL', 'DATABASE', '중급', FALSE, 17, NULL, NULL, 'PROJECT_USE'),
(18, 'Database Modeling', 'DATABASE', '중급', FALSE, 18, NULL, NULL, 'LEARNING'),
(19, 'SQL Query Optimization', 'DATABASE', '중급', FALSE, 19, NULL, NULL, 'LEARNING'),
(20, 'Excel', 'DATABASE', '초급', FALSE, 20, NULL, NULL, 'LEARNING'),
(21, 'Access', 'DATABASE', '초급', FALSE, 21, NULL, NULL, 'LEARNING'),
(22, 'Flyway', 'DEVOPS', '중급', FALSE, 22, NULL, NULL, 'PROJECT_USE'),
(23, 'Playwright', 'DEVOPS', '중급', FALSE, 23, NULL, NULL, 'PROJECT_USE'),
(24, 'n8n', 'DEVOPS', '중급', FALSE, 24, NULL, NULL, 'PROJECT_USE'),
(25, 'Nginx', 'DEVOPS', '중급', FALSE, 25, NULL, 'Nginx auth_request 및 프록시 설정', 'PROJECT_USE'),
(26, 'Docker Compose', 'DEVOPS', '중급', FALSE, 26, NULL, NULL, 'PROJECT_USE'),
(27, 'Grafana', 'DEVOPS', '중급', FALSE, 27, NULL, NULL, 'PROJECT_USE'),
(28, 'Loki', 'DEVOPS', '중급', FALSE, 28, NULL, NULL, 'PROJECT_USE'),
(29, 'Alloy', 'DEVOPS', '중급', FALSE, 29, NULL, NULL, 'PROJECT_USE'),
(30, 'AWS ECS', 'DEVOPS', '중급', TRUE, 30, NULL, '컨테이너 기반 서비스 배포 및 운영', 'WORK_EXPERIENCE'),
(31, 'Docker', 'DEVOPS', '중급', TRUE, 31, NULL, '로컬 개발과 배포 환경 컨테이너화에 활용', 'WORK_EXPERIENCE'),
(32, 'Datadog', 'DEVOPS', '초급', FALSE, 32, NULL, NULL, 'WORK_EXPERIENCE'),
(33, 'Infrastructure as Code (IaC)', 'DEVOPS', '초급', FALSE, 33, NULL, NULL, 'PROJECT_USE'),
(34, 'Bicep', 'DEVOPS', '초급', FALSE, 34, NULL, NULL, 'PROJECT_USE'),
(35, 'Kubernetes', 'DEVOPS', '중급', TRUE, 35, NULL, NULL, 'PROJECT_USE'),
(36, 'Azure OpenAI', 'AI_RAG', '중급', FALSE, 36, NULL, NULL, 'PROJECT_USE'),
(37, 'Teams SDK', 'FRAMEWORK', '중급', FALSE, 37, NULL, NULL, 'PROJECT_USE'),
(38, 'LLM', 'AI_RAG', '중급', FALSE, 38, NULL, NULL, 'LEARNING'),
(39, 'STT/TTS', 'AI_RAG', '중급', FALSE, 39, NULL, NULL, 'LEARNING'),
(40, 'RAG', 'AI_RAG', '중급', FALSE, 40, NULL, 'AI 면접 질문 생성과 로그 진단 흐름에서 학습 및 적용', 'LEARNING'),
(41, 'Machine Learning / Deep Learning', 'AI_RAG', '중급', FALSE, 41, NULL, '머신러닝·딥러닝 기초 학습 및 데이터 분석 적용', 'LEARNING'),
(42, 'LangChain', 'AI_RAG', '중급', FALSE, 42, NULL, NULL, 'LEARNING'),
(43, 'LangGraph', 'AI_RAG', '초급', FALSE, 43, NULL, NULL, 'LEARNING'),
(44, 'Azure', 'DEVOPS', '중급', FALSE, 44, NULL, NULL, 'LEARNING'),
(45, 'Azure Functions', 'DEVOPS', '중급', FALSE, 45, NULL, NULL, 'PROJECT_USE'),
(46, 'Data Preprocessing', 'AI_RAG', '중급', FALSE, 46, NULL, NULL, 'LEARNING'),
(47, 'Statistics', 'AI_RAG', '중급', FALSE, 47, NULL, NULL, 'LEARNING'),
(49, 'Software Engineering', 'ETC', '중급', FALSE, 49, NULL, NULL, 'LEARNING'),
(50, 'Database', 'ETC', '중급', FALSE, 50, NULL, NULL, 'LEARNING'),
(51, 'Network', 'ETC', '중급', FALSE, 51, NULL, NULL, 'LEARNING'),
(52, 'HTML/CSS', 'LANGUAGE', '초급', FALSE, 52, NULL, NULL, 'LEARNING'),
(53, 'Git', 'DEVOPS', '초급', FALSE, 53, NULL, NULL, 'LEARNING'),
(54, 'Amazon SQS', 'DEVOPS', '중급', FALSE, 31, NULL, '비동기 메시징 및 외부 AI 서버 연동', 'WORK_EXPERIENCE'),
(55, 'PostgreSQL', 'DATABASE', '중급', FALSE, 54, '16', 'CS Test Bed의 운영 데이터 저장소', 'PROJECT_USE'),
(56, 'MySQL', 'DATABASE', '중급', FALSE, 55, NULL, 'Spring Boot 기반 서비스의 관계형 데이터 저장소', 'WORK_EXPERIENCE'),
(57, 'gRPC', 'FRAMEWORK', '중급', FALSE, 56, NULL, 'AI 면접 음성 스트리밍 서비스 간 통신', 'PROJECT_USE'),
(58, 'Apache Kafka', 'DEVOPS', '중급', FALSE, 57, NULL, 'AI 면접 비동기 이벤트 및 상태 변경 처리', 'PROJECT_USE'),
(59, 'KQL', 'LANGUAGE', '중급', FALSE, 58, NULL, 'Azure 로그 비용과 사용량 진단 쿼리 작성', 'PROJECT_USE'),
(60, 'Azure Log Analytics', 'DEVOPS', '중급', FALSE, 59, NULL, 'LogDoctor의 로그 수집·비용 진단 대상 플랫폼', 'PROJECT_USE'),
(61, 'Spring Data JPA', 'FRAMEWORK', '중급', FALSE, 60, NULL, 'Spring Boot 백오피스 및 CS Test Bed 데이터 접근', 'WORK_EXPERIENCE'),
(62, 'Spring Security', 'FRAMEWORK', '중급', FALSE, 61, NULL, '백오피스 인증·인가 및 CS Test Bed 보안 구성', 'WORK_EXPERIENCE'),
(63, 'GitHub Actions', 'DEVOPS', '중급', FALSE, 62, NULL, '서비스 빌드·배포 CI/CD 자동화', 'WORK_EXPERIENCE');

-- 3. Experiences Seeding (Common experience table)
INSERT INTO experience (id, type, title, period_start, period_end, summary, takeaway, essay_content, display_order) VALUES
(1, 'CAREER', '학습 플랫폼 핵심 API 및 BFF 구축 (기여도 43%)', '2023-12-01', '2025-10-31', 
 '커리큘럼 기반 AI 학습 플랫폼의 핵심 Express API 서버와 NestJS 기반 BFF(Backend for Frontend) 서버를 부트스트랩하고 설계·개발을 전담했습니다. AI 튜터 메시징 대화 세션 모델 추상화 및 SQS 비동기 연동, 교사용 실시간 학생 관리(Presence) 모듈 설계, SubmittedProblem 도메인 CQRS 리팩토링 및 대형 마이그레이션을 총괄했습니다. Spring Boot 기반 백오피스 서비스도 1인 단독 구축하였습니다.',
 '실무 서비스의 9,500여 개 커밋 중 약 43%를 담당한 최다 기여자로서 비즈니스 확장 시 도메인 관심사 격리, 성능 튜닝, 그리고 인프라 CI/CD 파이프라인 전반을 주도하는 리드 엔지니어로 성장했습니다.',
 '에듀테크 스타트업 실무 경력 (1년 11개월): 핵심 애플리케이션 및 BFF 서버 개발을 전담하며 전체 9,500여 개 커밋 중 약 43%를 담당한 최다 기여자로 활약했습니다. 특히 AI 튜터 메시징 대화 세션의 4개 컨텍스트 다형성(문제풀이/복습/챌린지/개념보강) 모델을 추상화하여 외부 AI 서버와의 SQS 비동기 연동을 주도했으며, MongoDB 트랜잭션을 적용해 상태 변화의 데이터 정합성을 보장했습니다. 또한 교사용 실시간 학생 Presence 추적과 이상행동(manageable-action) 감지, 제출문제(SubmittedProblem) 도메인의 CQRS 리팩토링 및 6만 건의 데이터 마이그레이션 스크립트를 작성하여 시스템 효율화를 이뤄냈습니다.\n\n백오피스 TF 및 공용 서비스 단독 구축: 무료체험 프로세스 개선을 위한 자발적 TF에서 Spring Boot 3.2 + Security + JPA 기반 백오피스 서버(144개 클래스) 전체를 단독 개발했습니다. NCP 카카오 알림톡(HMAC 서명 구현) 및 MS Teams 웹훅 연동을 통해 알림을 자동화했으며, Redis Session을 활용해 크로스도메인 쿠키 인증 이슈를 해결했습니다. 추가로 여러 부서가 공용하는 6만여 개의 문항 조회를 위한 NestJS 마이크로서비스를 단독 설계하고, 공통 DB/캐시 모듈을 사내 npm 패키지로 격리하며 신규 NestJS 프로젝트 생성용 CLI 도구까지 주도 개발했습니다.',
 4),

(2, 'PROJECT', '고객문의 수집·자동응답 통합 테스트베드 (기여도 100%)', '2026-06-01', '2026-07-31',
 '고객 문의 수집·관리 및 브라우저 자동화(Playwright)와 노코드 n8n 워크플로우를 활용해 네이버 카페, 이메일 등의 문의 수작업 처리 과정을 자동화한 E2E 테스트베드 시스템입니다. DB 기반 RBAC 및 PII 암호화, Nginx auth_request 인증 계층과 Loki/Grafana/Alloy로 실시간 모니터링 환경을 구성했습니다.',
 'HMAC 인증 토큰과 Nginx auth_request를 활용해 내부 툴들의 보안 계층을 구축하고, n8n 분산 Lock 패턴과 무중단 개인정보(PII) 암호화 마이그레이션을 통해 운영 안정성을 하드닝했습니다.',
 'CS Test Bed 및 신규 프로젝트 개발: CS 문의 수집·답변 자동화 E2E 시스템(CS Test Bed)을 단독 구축했습니다. n8n 워크플로우로 카페 게시판과 이메일 문의를 수집하고, Playwright를 활용해 네이버 세션 만료 및 자동 답변 우회 로직을 구현했습니다. Nginx auth_request 및 HMAC 토큰을 활용한 보안 프록시 계층을 설계하여 MinIO/Grafana 등 내부 도구에 SSO를 연동했습니다. AI 실시간 모의면접 플랫폼에서는 gRPC/Redis/Kafka 기반의 음성 스트리밍 파이프라인을 설계해 비동기 상태 통제와 RAG Rerank 최적화 성능을 확보했습니다.',
 1),

(3, 'PROJECT', 'Azure 클라우드 로그 비용 진단 및 최적화 SaaS (LogDoctor) (기여도 70%)', '2026-03-01', '2026-06-30',
 'Microsoft Azure LAW(Log Analytics Workspace) 요금 분석 및 비용 리스크를 진단하고 권장 진료 가이드를 발급하는 Microsoft Teams 전용 SaaS 솔루션입니다. 에이전트 기반 VM 연결 단절 탐지, 디버그 로그 폭증 추적, Azure OpenAI RAG 기반 맞춤 처방 제공, 로그 데이터 PII 마스킹 처리 등을 구축했습니다. (팀 프로젝트)',
 '쓰기 권한을 제외한 최소 읽기 전용 권한(18개) 진단 체계로 인프라 보안 위험을 차단하고, LLM을 결합하여 비용 최적화를 자동 진단·안내하는 파이프라인을 구축 및 실전 검증했습니다.',
 'Azure Cloud 환경의 비용 최적화를 자동화하고 개발 생산성을 높이는 SaaS 솔루션 개발 전반을 담당하였습니다. 핵심 진단 엔진(4대 엔진, 11개 진단 수칙) 및 FastAPI 기반 비동기 Queue Worker 아키텍처를 단독 설계 및 구현하고, Cosmos DB와의 데이터 레이어를 연동하였습니다. 또한 Azure Functions 기반의 에이전트 구동 및 Teams Bot App 연동을 주도하였습니다.',
 2),

(4, 'PROJECT', '음성 스트리밍 및 RAG 면접 관리 (기여도 100%)', '2025-12-01', '2026-03-31',
 '실시간 AI 모의면접 및 역량 평가 서비스의 전체 시스템 아키텍처와 분산 메시징 처리 부분을 담당했습니다. gRPC 기반 실시간 음성 스트리밍 제어, Redis/Kafka 비동기 메시지 큐를 통한 음성 데이터 및 AI 상태 변경 큐잉, 이력서 RAG 질문 생성 기능 등을 구현하고 Kubernetes 환경에 배포했습니다. (개인 프로젝트)',
 '비동기 메시징 및 대용량 음성 스트리밍 환경에서 발생할 수 있는 데이터 유실과 지연 병목을 제어하며 분산 인프라 설계 능력을 키웠습니다.',
 'CS Test Bed 및 신규 프로젝트 개발: CS 문의 수집·답변 자동화 E2E 시스템(CS Test Bed)을 단독 구축했습니다. n8n 워크플로우로 카페 게시판과 이메일 문의를 수집하고, Playwright를 활용해 네이버 세션 만료 및 자동 답변 우회 로직을 구현했습니다. Nginx auth_request 및 HMAC 토큰을 활용한 보안 프록시 계층을 설계하여 MinIO/Grafana 등 내부 도구에 SSO를 연동했습니다. AI 실시간 모의면접 플랫폼에서는 gRPC/Redis/Kafka 기반의 음성 스트리밍 파이프라인을 설계해 비동기 상태 통제와 RAG Rerank 최적화 성능을 확보했습니다.',
 3),

(5, 'PROJECT', '학습 API QA 자동화 및 부하 시뮬레이션 도구 (기여도 80%)', '2024-04-18', '2024-09-21',
 '실제 UI 상호작용 없이 대량의 학생 학습 시나리오(출석, 문제풀이 제출, 비디오 진행률 업데이트, 리뷰 복습 등)를 API 단에서 자동으로 시뮬레이션해 기능 이상 및 부하를 모니터링하는 테스팅 툴입니다. Axios 및 가중치 랜덤 알고리즘을 도입했습니다.',
 'E2E 관점에서 전체 도메인의 핵심 비즈니스 흐름을 관통하는 통합 검증 지식을 체득하고 가중치 기반 시뮬레이션을 구현했습니다.',
 NULL,
 6),

(6, 'EDUCATION', '스포츠의학과 학사 졸업', '2022-02-25', '2022-02-25',
 'IT 비전공자로서 개발 역량을 별도로 쌓았습니다.',
 '스포츠의학을 전공한 뒤 개발 교육과 프로젝트, 실무 경험을 통해 소프트웨어 개발 역량을 쌓았습니다.',
 NULL,
 12),

(7, 'EDUCATION', 'AI 엔지니어링 과정 (3기)', '2025-09-01', '2026-03-15',
 'ML/DL 기초학습, Agentic AI 구축 (LangChain, LangGraph), RAG 구축, AI Azure 기반의 클라우드 엔지니어 학습 (600시간)',
 'Agentic AI와 RAG 아키텍처를 깊이 있게 다루고, 클라우드 환경에서 AI 인프라를 구축하고 운영하는 방법을 익혔습니다.',
 NULL,
 5),

(8, 'EDUCATION', '풀스택 프로젝트 실무과정', '2023-05-01', '2023-10-31',
 'TypeScript 기반 풀스택 교육으로 주로 JavaScript/TypeScript 언어에 대한 깊은 이해와 프레임워크 사용법 등을 학습 (265시간)',
 'TypeScript와 React/Express 환경에서 웹 애플리케이션의 풀스택 개발 생태계와 협업 워크플로우를 체화했습니다.',
 NULL,
 6),

(9, 'EDUCATION', '파이썬 기반 풀스택 부트캠프', '2022-06-01', '2022-12-31',
 '풀스택 교육으로 Git, HTML, CSS, Django Template Engine을 활용한 MVC 기반 웹사이트 구현 기초를 학습 (980시간)',
 '소프트웨어 개발의 첫 단추인 MVC 아키텍처와 웹 표준, 형상 관리 도구의 기초를 탄탄히 다졌습니다.',
 NULL,
 7),

(10, 'CERTIFICATE', '정보처리기사', '2022-06-17', '2022-06-17',
 'IT 전반의 핵심 이론 및 기술 자격 검증',
 '개발 생명주기 전반에 걸친 기초 체력을 공인 자격을 통해 입증했습니다.',
 '정보처리기사 취득 과정에서 체화한 소프트웨어 개발 생명주기(SDLC), 모듈 설계 원칙(응집도와 결합도), 객체지향 설계(SOLID)를 실무에 직접 투영했습니다. 도메인의 경계를 명확히 분리하고 인프라 변경에 유연하게 대응하기 위해 헥사고날(포트-어댑터) 아키텍처와 DDD 4계층(adapter-application-domain-infrastructure) 구조를 에듀테크 서비스 전체에 일관 적용하여 코드 가독성과 확장성을 대폭 높였습니다.',
 8),

(11, 'CERTIFICATE', 'SQL 개발자(SQLD)', '2024-09-20', '2024-09-20',
 '데이터베이스 모델링 및 SQL 작성 능력 검증',
 '데이터베이스를 단순히 저장소로 쓰는 것을 넘어 성능과 무결성을 고려하여 쿼리하고 모델링할 수 있음을 검증했습니다.',
 '데이터 모델 정규화 및 반정규화, 인덱스(Index) 설계 원리와 조인(Join) 메커니즘을 심도 있게 학습했습니다. Spring Boot 기반 백오피스 개발 시 8개 도메인 간의 유기적 관계(1:N, N:M)를 매핑하고, 복잡한 동적 필터 조회를 위해 QueryDSL을 연동하여 성능 향상을 이뤄냈습니다. N+1 문제를 방지하기 위해 Fetch Join과 인덱스 튜닝을 도입하여 조회 속도를 개선했습니다.',
 9),

(12, 'CERTIFICATE', '빅데이터분석기사', '2022-07-15', '2022-07-15',
 '데이터 수집, 전처리, 분석 모형 설계 및 평가 역량 검증',
 '데이터를 수집하고 전처리하여 통계적 기법과 ML 모형으로 분석해 유의미한 가치를 추출할 수 있는 이론적 토대를 닦았습니다.',
 '대량 데이터 수집, 이상치 정제, 통계적 분석(가설 검정, 회귀 모형) 및 평가 메커니즘을 마이그레이션과 AI RAG 파이프라인에 접목했습니다. SubmittedProblem 통계 병합 마이그레이션 시 14개 집계 지표(제출수/정답수/소요시간 등)를 MongoDB 트랜잭션 내에서 정량 데이터로 가공·적재하는 파이프라인을 구축하였으며, AI 모의면접 플랫폼에서 PDF 이력서 RAG 질문 생성의 답변 정확도를 분석하는 통계 평가 체계에 응용했습니다.',
 10),

(13, 'CERTIFICATE', '컴퓨터활용능력 1급', '2018-11-16', '2018-11-16',
 '스프레드시트 및 데이터베이스 활용 능력 자격 검증',
 '정량적 데이터 정제 및 비즈니스 데이터 처리에 필요한 기본 오피스 역량을 인증받았습니다.',
 NULL,
 11);

-- 4. Subclass Tables Seeding
INSERT INTO career (experience_id, company_name, employment_type, department, role)
VALUES (1, '(주)에듀테크 스타트업', '정규직', '개발팀 백엔드 파트', 'Backend & DevOps Engineer');

INSERT INTO project (experience_id, slug, role, contribution_rate) VALUES
(2, 'project-cs-testbed', 'Backend & DevOps Engineer', 100),
(3, 'project-log-doctor', 'Fullstack & Cloud Developer', 70),
(4, 'project-ai-interview', 'Core Architect & Developer', 100),
(5, 'project-study-helper', 'QA Automation Engineer', 80);

INSERT INTO education (experience_id, institution_name) VALUES
(6, '차의과학대학교'),
(7, 'Microsoft / 대한상공회의소'),
(8, 'SBA 청년취업사관학교'),
(9, '멀티캠퍼스');

INSERT INTO certificate (experience_id, issuer) VALUES
(10, '한국산업인력공단'),
(11, '(재)한국데이터산업진흥원'),
(12, '(재)한국데이터산업진흥원'),
(13, '대한상공회의소');

-- 5. Connect Experience Skills
INSERT INTO experience_skill (experience_id, skill_id, list_order) VALUES
-- Career (1)
(1, 4, 0),   -- Node.js
(1, 2, 1),   -- TypeScript
(1, 8, 2),   -- NestJS
(1, 9, 3),   -- Express
(1, 16, 4),  -- MongoDB
(1, 15, 5),  -- Redis
(1, 5, 6),   -- Spring Boot
(1, 30, 7),  -- AWS ECS
(1, 54, 8),  -- Amazon SQS
(1, 31, 9),  -- Docker
(1, 32, 10), -- Datadog
(1, 56, 11), -- MySQL
(1, 61, 12), -- Spring Data JPA
(1, 62, 13), -- Spring Security
(1, 63, 14), -- GitHub Actions
-- CS Test Bed (2)
(2, 1, 0),   -- Java
(2, 5, 1),   -- Spring Boot
(2, 13, 2),  -- QueryDSL
(2, 22, 3),  -- Flyway
(2, 23, 4),  -- Playwright
(2, 24, 5),  -- n8n
(2, 25, 6),  -- Nginx
(2, 26, 7),  -- Docker Compose
(2, 27, 8),  -- Grafana
(2, 28, 9),  -- Loki
(2, 29, 10), -- Alloy
(2, 55, 11), -- PostgreSQL
(2, 61, 12), -- Spring Data JPA
(2, 62, 13), -- Spring Security
-- LogDoctor (3)
(3, 3, 0),   -- Python
(3, 7, 1),   -- FastAPI
(3, 14, 2),  -- Cosmos DB
(3, 36, 3),  -- Azure OpenAI
(3, 37, 4),  -- Teams SDK
(3, 34, 5),  -- Bicep
(3, 33, 6),  -- IaC
(3, 45, 7),  -- Azure Functions
(3, 25, 8),  -- Nginx
(3, 26, 9),  -- Docker Compose
(3, 27, 10), -- Grafana
(3, 28, 11), -- Loki
(3, 29, 12), -- Alloy
(3, 59, 13), -- KQL
(3, 60, 14), -- Azure Log Analytics
-- AI Interview (4)
(4, 10, 0),  -- React
(4, 15, 1),  -- Redis
(4, 35, 2),  -- Kubernetes
(4, 38, 3),  -- LLM
(4, 39, 4),  -- STT/TTS
(4, 40, 5),  -- RAG
(4, 57, 6),  -- gRPC
(4, 58, 7),  -- Apache Kafka
-- QA Helper (5)
(5, 2, 0),   -- TypeScript
(5, 4, 1),   -- Node.js
-- Edu 7
(7, 41, 0),  -- ML/DL
(7, 42, 1),  -- LangChain
(7, 43, 2),  -- LangGraph
(7, 40, 3),  -- RAG
(7, 44, 4),  -- Azure
-- Edu 8
(8, 2, 0),   -- TypeScript
(8, 4, 1),   -- Node.js
(8, 10, 2),  -- React
(8, 9, 3),   -- Express
-- Edu 9
(9, 3, 0),   -- Python
(9, 12, 1),  -- Django
(9, 52, 2),  -- HTML/CSS
(9, 53, 3),  -- Git
-- Cert 10
(10, 49, 0), -- Software Engineering
(10, 50, 1), -- Database
(10, 51, 2), -- Network
-- Cert 11
(11, 17, 0), -- SQL
(11, 18, 1), -- DB Modeling
(11, 19, 2), -- Optimization
-- Cert 12
(12, 46, 0), -- Data Preprocessing
(12, 47, 1), -- Statistics
(12, 41, 2), -- Machine Learning / Deep Learning
-- Cert 13
(13, 20, 0), -- Excel
(13, 21, 1); -- Access -- Access

-- 6. Experience Details Seeding
INSERT INTO experience_detail (id, experience_id, content, display_order, situation, action_detail, outcome) VALUES
-- Career (1) Details
(1, 1, 'AI 튜터링 및 학습 플랫폼 핵심 API 서버 개발', 0, 
 '커리큘럼 기반 AI 학습 플랫폼에서 AI 튜터와 학생 간 실시간 메시징을 처리하는 핵심 Express API 서버가 필요했습니다. 튜터링 세션은 문제풀이·복습·챌린지·개념보강 4가지 컨텍스트로 나뉘어 있었지만 하나의 평평한 모델로 뒤섞여 있어 확장이 어려웠습니다.', 
 '- AI 튜터 메시징 대화 세션을 4개 컨텍스트로 다형성 있게 추상화하는 도메인 모델을 설계했습니다.\n- 외부 AI 서버와의 통신을 SQS 기반 비동기 큐로 연동해 응답 지연에도 안정적으로 동작하도록 했습니다.\n- MongoDB 트랜잭션을 적용해 세션 상태 변화의 데이터 정합성을 보장했습니다.', 
 '전체 서비스 9,500여 개 커밋 중 약 43%를 담당하며 핵심 API 서버 개발을 리드했고, 신규 학습 컨텍스트 추가 시에도 기존 모델을 재사용할 수 있는 구조를 만들었습니다.'),

(2, 1, '프론트엔드 중계용 BFF 서버 설계 및 구축', 1, 
 '여러 프론트엔드 클라이언트(교사용/학생용)가 백엔드 API를 직접 호출하면서 중복 로직과 N+1 호출이 늘어나고 있었습니다.', 
 '- NestJS 기반 BFF (Backend for Frontend) 서버를 처음부터 부트스트랩했습니다.\n- 교사용 실시간 학생 관리(Presence) 모듈을 BFF 레이어에서 설계해 프론트엔드가 여러 API를 조합할 필요 없이 하나의 엔드포인트로 소비하도록 했습니다.\n- SubmittedProblem 도메인을 CQRS로 리팩토링하고 6만 건 규모의 마이그레이션을 총괄했습니다.', 
 '프론트엔드 팀의 API 조합 로직을 BFF 뒤로 숨겨 클라이언트 코드 복잡도를 낮추고, 조회 성능 병목이던 SubmittedProblem 도메인의 응답 속도를 개선했습니다.'),

(3, 1, 'Spring Boot 기반 사내 백오피스 단독 구축', 2, 
 '무료체험 프로세스 개선을 위한 사내 TF에서, 여러 부서가 공용으로 쓸 수 있는 백오피스 도구가 없어 반복 수작업이 발생하고 있었습니다.', 
 '- Spring Boot 3.2 + Security + JPA 기반 백오피스 서버(144개 클래스)를 1인으로 설계·개발했습니다.\n- NCP 카카오 알림톡(HMAC 서명)과 MS Teams 웹훅 연동으로 알림을 자동화했습니다.\n- Redis Session을 활용해 크로스도메인 쿠키 인증 문제를 해결했습니다.', 
 '여러 부서가 공용하는 6만여 개 문항 조회를 위한 NestJS 마이크로서비스와 사내 npm 공통 패키지까지 확장 개발하며, 반복 수작업을 자동화된 백오피스 워크플로우로 대체했습니다.'),

(4, 1, 'AWS 인프라 및 CI/CD 파이프라인 설계/운영', 3, 
 '서비스가 커지면서 배포 과정에서의 수동 작업과 장애 대응 속도가 병목이 되고 있었습니다.', 
 '- AWS ECS 기반 인프라를 설계하고 서비스별 배포 파이프라인을 CI/CD로 자동화했습니다.\n- Amazon SQS로 비동기 메시징을 분리해 외부 시스템의 지연에도 안정적으로 처리했습니다.\n- Docker로 로컬/배포 환경을 컨테이너화해 환경 차이로 인한 배포 실패를 줄였습니다.\n- Datadog으로 지표를 모니터링하며 장애를 조기에 탐지할 수 있는 체계를 구축했습니다.',
 '배포 소요 시간을 줄이고 장애 대응 리드타임을 단축시켜, 비즈니스 확장 국면에서도 안정적인 인프라 운영 기반을 마련했습니다.'),

(5, 1, '공용 문제(Problem) 서비스 및 사내 공통 패키지 모노레포 단독 구축', 4, 
 '서비스 확장으로 인해 여러 백엔드 서버 간 동일한 설정 코드와 DB 커넥션 래퍼, 에러 핸들러 등의 코드 복잡도가 늘어나고 중복 복사 현상이 심화되었습니다.', 
 '- NestJS 11 기반의 공용 문제 조회 마이크로서비스를 단독 설계 및 구축하여 6만여 문항 데이터를 제공하도록 구성했습니다.\n- npm workspaces 기반 모노레포를 구축해 공통 에러 변환, DB 트랜잭션, SQS 연동 로직을 패키지화해 GitHub Packages로 배포했습니다.\n- 신규 프로젝트 생성을 표준화하기 위해 CLI 스캐폴딩 도구를 개발 및 적용했습니다.', 
 '마이크로서비스들의 공통 아키텍처 패턴을 통일하고, 새로운 서버 모듈 추가 세팅 속도를 크게 단축하여 개발 리소스를 절감했습니다.'),

-- CS Test Bed (2) Details
(6, 2, '네이버 로그인 보안 우회 및 Playwright 기반 세션 관리 자동화', 0, 
 '네이버 카페 문의 수집 및 답변 등록 시, 네이버의 강력한 로그인 보안 정책(캡차, 이단계 인증)으로 인해 단순 API 호출로는 자동화가 불가능했으며, 세션 만료 시마다 수동 개입이 요구되는 비효율이 있었습니다.', 
 '- Playwright 브라우저 자동화 엔진을 활용해 네이버 앱 일회용 로그인 번호(OTP) 인증 로그인 흐름 구축\n- 로그인 성공 후 NID_AUT, NID_SES 쿠키를 추출해 AES/GCM 암호화 및 DB 세션 관리 라이프사이클 구축\n- 브라우저 워커와 통신하여 세션 만료 상태를 실시간 진단 및 동기화하는 백엔드 API 설계', 
 '세션 만료 시 수동 로그인 단계를 원클릭 OTP 인증으로 최소화하고, 보안 정책 탐지를 우회하여 카페 내 답변 및 대댓글 등록 E2E 자동화를 달성했습니다.'),

(7, 2, '이메일 헤더 분석 및 본문 정규화를 통한 문의 스레드/상태 자동 연동 엔진 구축', 1, 
 '이메일 고객 문의 유입 시 동일 사용자의 회신이나 관련 메일이 개별 문의 건으로 난립하여 상담원의 업무 중복과 문의 맥락 파편화가 발생했습니다.', 
 '- In-Reply-To 및 References 이메일 헤더를 파싱해 고유 Message-ID 관계 추적 및 부모 문의 매핑 모델 설계\n- 헤더가 유실된 메일에 대비해 회신 접두사 제거 제목 정규화 및 발신자 이메일 해싱(email_sender_hash) 값 기반 Heuristic 후보군 매칭 구현\n- 해결(RESOLVED) 문의에 메일 회신 시 자동으로 오픈(OPEN) 상태 복원 및 변경 이력(Work Log) 시스템 로깅', 
 '중복 티켓 생성을 방지하고 연관 문의를 단일 스레드로 통일하여 CS 상담원의 생산성을 대폭 개선했습니다.'),

(8, 2, 'JPA Converter 기반 개인정보(PII) AES/GCM 암호화 및 무중단 마이그레이션', 2, 
 '고객 문의 본문, 이메일, 전화번호 등 민감 개인정보(PII)가 DB에 평문 저장되어 데이터 유출 리스크 및 개인정보보호법 준수 문제가 존재했습니다.', 
 '- JPA @Convert 및 PiiEncryptionUtils를 통해 영속성 계층 저장/조회 시 AES/GCM 암복호화 자동화\n- 정확한 등치 검색 조회를 위한 단방향 HMAC-SHA256 해시 설계 및 컬럼 매핑\n- 복호화 실패 시 평문을 반환하는 하위 호환 복호화 로직(decryptOrPassThrough)을 도입해 무중단 암호화 마이그레이션 배치 가동', 
 'DB 유출 시에도 안전한 PII 암호화 보안 규격을 달성하였으며, 기존 적재 데이터를 데이터 유실 없이 무중단으로 100% 암호화 이관했습니다.'),

(9, 2, 'n8n 워크플로우 및 Spring Boot REST API 기반 멀티채널 문의 통합 수집 파이프라인', 3, 
 '네이버 카페, 이메일, 구글 시트 등 파편화된 다중 고객 소통 채널의 문의 내역을 단일 저장소로 수집 및 통합 관리해야 했습니다.', 
 '- n8n 워크플로우를 구성해 주기적 네이버 카페 크롤링 및 IMAP 메일박스 수신 수집 자동화\n- Spring Boot에서 채널별 다형적 메타데이터(EmailMetadata, NaverCafeMetadata) 구조 검증 및 parsing 처리\n- MinIO S3 오브젝트 스토리지 연동 및 첨부 이미지 파일 저장 및 상대경로 JSONB 매핑 최적화\n- 중복 수집을 방지하기 위한 InquiryUniqueKeyGenerator 고유 키 생성 엔진 및 bulkInsert 구현', 
 '서로 다른 형식의 이종 채널 문의 데이터를 단일 스키마로 정형화 및 통합하여 대용량 CS 수집 인프라를 안정적으로 안착시켰습니다.'),

(10, 2, 'Nginx auth_request 계층 SSO 연동 및 Grafana Stack 중앙 집중 로깅 구축', 4, 
 '사내 백오피스, MinIO 콘솔, Grafana 대시보드 등 개별 툴들에 대한 통합 접근 제어 및 통합 모니터링 체계가 미비했습니다.', 
 '- Nginx auth_request 지시어를 활용해 백엔드 API(cs-api)와 연동하는 사내 SSO 인증 프록시 계층 설계\n- Grafana Alloy 컨테이너로 컨테이너 내부 및 호스트 로그 파일을 수집하고 Grafana Loki로 전송하도록 파이프라인 구성\n- Grafana 대시보드를 구축해 실시간 예외 에러 및 서버 메트릭 가시화 구현', 
 '백오피스 도구들의 RBAC 보안 접근 규격을 단일 지점으로 일원화하고, 장애 발생 시 디버깅 리드타임을 대폭 감소시켰습니다.'),

-- LogDoctor (3) Details
(11, 3, 'KQL과 리소스 메타데이터를 활용한 비용 및 배관 상태 자동 진단 구현', 0, 
 'Azure 모니터링 환경에서 리소스들의 로그 및 비용을 자동으로 수집 및 감사할 수 있는 규칙 엔진이 필요했습니다. 특히, 환경변수나 Secret 등의 보안 민감 정보 수집을 배제한 채 순수 읽기 전용 권한만으로 정확한 리스크와 낭비 용량을 측정해야 했습니다.', 
 '- BaseInspector 클래스를 설계하여 11개의 규칙을 플러그인 형태로 추가 가능한 구조 확립\n- 4대 진단 영역(Detect, Prevent, Filter, Retain) 정의 및 11개 규칙 인스펙터 구현\n- KQL(Kusto Query Language)과 Azure Resource Graph를 연동하여 최근 24시간 동안의 과금 로그(BilledSize), 테이블별 용량, Quota 정보 수집', 
 '- 디버그 로그 폭증, 고빈도 노이즈, PII 유출, 과보존 테이블 및 Quota 초과 위험을 실시간으로 감지하고 Markdown 기반의 맞춤 처방 제공\n- Azure Retail Prices API를 실시간 조회하여 리전별 로그 수집 단가를 바탕으로 정밀한 월간 예상 절감 비용 산출 가능'),

(12, 3, '비동기 Queue Worker 기반의 진단 리포트 수집 및 처리 파이프라인 설계', 1, 
 'Azure Subscription 전체 리소스를 스캔하고 LAW 쿼리를 병렬로 실행하는 과정은 Cold Start가 잦고 대기 시간이 길어, 동기식 API 호출로는 실시간 사용자 응답을 보장하기 어려웠습니다.', 
 '- FastAPI 백엔드 및 Azure Storage Queue를 활용하여 리포트 분석 상태를 비동기로 제어하는 Worker 구조 설계\n- Cosmos DB NoSQL 아키텍처를 도입하여 Tenants, Agents, Reports, Diagnoses, Insights 컬렉션을 낙관적 락(ETag)으로 관리\n- Lifespan 이벤트를 통해 DB 커넥션 풀 사전 로드(Pre-warming)를 적용하여 Cold Start 지연 단축', 
 '- 진단 요청 후 백그라운드 Worker에서 병렬 처리가 이루어져 대규모 구독 환경에서도 타임아웃 없이 안정적으로 리포트 생성 완료\n- 실시간 통계 재계산 및 리포트 완성에 따른 이벤트 발행 파이프라인 완비'),

(13, 3, '권한 분리를 적용한 에이전트 구동 및 리전별 가격 API 동적 조회 구현', 2, 
 '보안 규격상 고객의 Azure 환경을 직접 수정하거나 크리덴셜 원문을 백엔드 서버에 저장할 수 없었으므로, 최소 읽기 전용 권한을 가진 에이전트와 위임형 SSO가 필수적이었습니다.', 
 '- Azure Functions 기반의 가벼운 에이전트 러너(client-back)를 분리 구축하고 18개 최소 읽기 전용 IAM 권한 매핑 설계\n- Nginx auth_request 계층과 HMAC 토큰을 활용한 보안 프록시 설계로 내부 툴들과의 SSO 연동 구현\n- Azure Retail Prices API를 호출하여 위치별 단가를 GB 단위로 캐싱(TTL 24시간) 처리', 
 '- 고객의 쓰기/삭제 권한 없이 완전 무마취 읽기 전용 진단 프로세스를 성공적으로 안착\n- 개인정보(PII) 등 민감 데이터가 게이트웨이 단계에서 즉시 마스킹되고 마스킹 유형 및 건수만 본 서버로 전송되도록 하드닝 구현'),

(14, 3, 'Microsoft Teams 챗봇을 통한 알림 발송 및 사용자 진단 대시보드 연동', 3, 
 '인프라 엔지니어들이 일일이 Azure Portal에 접속해 LAW 쿼리를 복사해 실행하는 번거로움을 제거하고, 매일 사용하는 협업 도구 안에서 간편하게 비용 현황을 확인해야 했습니다.', 
 '- Teams Tab 및 Bot manifest 설정을 연동하여 Teams 앱 내에서 진단 결과를 한눈에 보는 대시보드 구현\n- 에이전트 연결 상태 단절(15분 이상) 및 진단 완료 이벤트를 Teams Bot 알림으로 자동 전송\n- 비전문가 관리자도 손쉽게 따라 할 수 있는 맞춤형 약봉투(가이드)를 Teams 인터페이스 내에 Markdown 카드로 시각화', 
 '- 챗봇 기반의 1분 내 설치 연동 및 비동기 스캔 완료 통지 프로세스 구현으로 사용성 극대화\n- 배포 권한이 없는 실무자도 관리자에게 배포를 위임할 수 있는 ''배포 위임'' 워크플로우 지원'),

-- AI Interview (4) Details
(15, 4, '음성 스트리밍 파이프라인 및 RAG 최적화 설계', 0, 
 '실시간 AI 모의면접 중 음성 유실과 지연 병목 현상 해결 및 RAG 엔진의 이력서 분석 정확도 개선이 요구되었습니다.', 
 '- gRPC 기반의 음성 데이터 스트리밍 채널을 확보하고, Kafka/Redis 메시지 큐를 결합해 마이크로서비스 간 비동기 상태를 통제했습니다.\n- PDF 이력서 정보를 파싱한 뒤 문서 청킹 및 임베딩 단계를 최적화하고, Rerank 모델을 결합해 RAG 질문 생성의 정밀성을 높였습니다.', 
 '음성 끊김 현상을 최소화하고 이력서 매칭 성능을 확보하여 실시간 평가 가용성을 보장했습니다.'),

-- QA Helper (5) Details
(16, 5, '학습 API 시나리오 자동 검증 및 시뮬레이션 봇 구현', 0, 
 '대량의 학습 상태 변화(출석, 제출, 진도율 등)를 UI 테스트 없이 빠르게 회귀 검증할 수 있는 수단이 결여되어 있었습니다.', 
 '- TypeScript/Node.js 환경에서 시나리오 기반 Axios 테스팅 모듈을 부트스트랩했습니다.\n- 가중치 랜덤 알고리즘을 활용해 실제 사용자의 사용 빈도 분포를 따르는 대량 학습 패턴 자동 시뮬레이션 봇을 개발했습니다.', 
 'API 단독 부하 테스트 및 수천 회 분량의 비즈니스 플로우 회귀 테스팅을 무인화했습니다.'),

-- Edu 6 Detail
(17, 6, '스포츠의학과 학사 학위 취득 (IT 비전공)', 0, NULL, NULL, '차의과학대학교 스포츠의학과를 졸업했으며, IT 비전공자로서 개발 역량을 별도로 쌓았습니다.'),
-- Edu 7 Detail
(18, 7, 'AI 및 클라우드 엔지니어링 600시간 이수', 0, NULL, NULL, 'ML/DL 기초학습, Agentic AI 구축(LangChain, LangGraph), RAG 구축, AI Azure 기반의 클라우드 엔지니어링 파이프라인을 학습했습니다.'),
-- Edu 8 Detail
(19, 8, 'TypeScript 기반 풀스택 교육 이수', 0, NULL, NULL, 'TypeScript와 React/Express 환경에서 웹 애플리케이션의 풀스택 개발 생태계와 협업 워크플로우를 학습했습니다.'),
-- Edu 9 Detail
(20, 9, '파이썬 기반 풀스택 부트캠프 이수', 0, NULL, NULL, '소프트웨어 개발의 첫 단추인 MVC 아키텍처와 웹 표준, 협업을 위한 형상 관리 도구의 기초를 학습했습니다.'),
-- Cert 10 Detail
(21, 10, 'IT 전반의 핵심 이론 및 기술 자격 검증', 0, NULL, NULL, '소프트웨어 공학, 데이터베이스, 네트워크 등 IT 핵심 이론을 검증받아 정보처리기사를 취득했습니다.'),
-- Cert 11 Detail
(22, 11, 'RDB 모델링 및 쿼리 최적화 역량 검증', 0, NULL, NULL, '데이터베이스 모델링 및 SQL 작성 능력을 검증받아 SQLD를 취득했습니다.'),
-- Cert 12 Detail
(23, 12, '데이터 전처리 및 분석 모형 설계 역량 검증', 0, NULL, NULL, '데이터 수집, 전처리, 분석 모형 설계 및 평가 역량을 검증받아 빅데이터분석기사를 취득했습니다.'),
-- Cert 13 Detail
(24, 13, '사무 행정 및 데이터베이스 기초 역량 검증', 0, NULL, NULL, '스프레드시트 및 데이터베이스 활용 능력을 검증받아 컴퓨터활용능력 1급을 취득했습니다.');

-- 7. Connect Experience Detail Skills
INSERT INTO experience_detail_skill (experience_detail_id, skill_id, list_order) VALUES
-- Career details (1-5)
(1, 4, 0),   -- Node.js
(1, 2, 1),   -- TypeScript
(1, 9, 2),   -- Express
(1, 16, 3),  -- MongoDB
(2, 8, 0),   -- NestJS
(2, 2, 1),   -- TypeScript
(2, 15, 2),  -- Redis
(3, 5, 0),   -- Spring Boot
(3, 15, 1),  -- Redis
(3, 31, 2),  -- Docker
(4, 30, 0),  -- AWS ECS
(4, 54, 1),  -- Amazon SQS
(4, 31, 2),  -- Docker
(4, 32, 3),  -- Datadog
(4, 63, 4),  -- GitHub Actions
(5, 8, 0),   -- NestJS
(5, 2, 1),   -- TypeScript
(5, 16, 2),  -- MongoDB
(5, 31, 3),  -- Docker
-- CS Test Bed details (6-10)
(6, 23, 0),  -- Playwright
(6, 26, 1),  -- Docker Compose
(6, 25, 2),  -- Nginx
(7, 1, 0),   -- Java
(7, 5, 1),   -- Spring Boot
(7, 13, 2),  -- QueryDSL
(7, 55, 3),  -- PostgreSQL
(7, 61, 4),  -- Spring Data JPA
(7, 62, 5),  -- Spring Security
(8, 1, 0),   -- Java
(8, 5, 1),   -- Spring Boot
(8, 22, 2),  -- Flyway
(9, 5, 0),   -- Spring Boot
(9, 24, 1),  -- n8n
(9, 26, 2),  -- Docker Compose
(10, 25, 0), -- Nginx
(10, 27, 1), -- Grafana
(10, 28, 2), -- Loki
(10, 29, 3), -- Alloy
-- LogDoctor details (11-14)
(11, 3, 0),  -- Python
(11, 17, 1), -- SQL
(11, 19, 2), -- SQL Query Optimization
(11, 59, 3), -- KQL
(11, 60, 4), -- Azure Log Analytics
(12, 7, 0),  -- FastAPI
(12, 14, 1), -- Cosmos DB
(13, 45, 0), -- Azure Functions
(13, 34, 1), -- Bicep
(13, 33, 2), -- IaC
(14, 37, 0); -- Teams SDK

-- 8. Tags Initialization
INSERT INTO tag (id, name, slug) VALUES
(1, 'Backend', 'backend'),
(2, 'MSA', 'msa'),
(3, 'AI', 'ai'),
(4, 'SQS', 'sqs'),
(5, 'Idempotence', 'idempotence'),
(6, 'MongoDB', 'mongodb'),
(7, 'Presence', 'presence'),
(8, 'Redis', 'redis'),
(9, 'Telemetry', 'telemetry'),
(10, 'CQRS', 'cqrs'),
(11, 'Database', 'database'),
(12, 'Migration', 'migration'),
(13, 'Transaction', 'transaction'),
(14, 'Spring', 'spring'),
(15, 'Security', 'security'),
(16, 'Session', 'session'),
(17, 'Nginx', 'nginx'),
(18, 'DevOps', 'devops'),
(19, 'Monorepo', 'monorepo'),
(20, 'CLI', 'cli'),
(21, 'Scaffold', 'scaffold'),
(22, 'Infrastructure', 'infrastructure'),
(23, 'NPM', 'npm'),
(24, 'Playwright', 'playwright'),
(25, 'Automation', 'automation'),
(26, 'Naver Cafe', 'naver-cafe'),
(27, 'Spring Boot', 'spring-boot'),
(28, 'Email Threading', 'email-threading'),
(29, 'n8n', 'n8n'),
(30, 'Heuristic', 'heuristic'),
(31, 'Encryption', 'encryption'),
(32, 'HMAC', 'hmac'),
(33, 'Cloud', 'cloud'),
(34, 'Azure', 'azure'),
(35, 'Cost Optimization', 'cost-optimization'),
(36, 'KQL', 'kql'),
(37, 'Observability', 'observability'),
(38, 'PII Masking', 'pii-masking');

-- Connect Experience Tags
INSERT INTO experience_tag (experience_id, tag_id) VALUES
-- Career (1)
(1, 1),  -- Backend
(1, 2),  -- MSA
(1, 6),  -- MongoDB
(1, 8),  -- Redis
(1, 18), -- DevOps
-- CS Test Bed (2)
(2, 33), -- Cloud
(2, 25), -- Automation
(2, 18), -- DevOps
(2, 14), -- Spring
(2, 15), -- Security
-- LogDoctor (3)
(3, 33), -- Cloud
(3, 34), -- Azure
(3, 35), -- Cost Optimization
(3, 37), -- Observability
(3, 18); -- DevOps

-- 9. Studies Seeding (1-11)
INSERT INTO study (id, slug, title, summary, content_markdown, status, category_id, learned_at, published_at, created_at, updated_at) VALUES
-- Study 1: AI 튜터링 세션 아키텍처
(1, 'ai-tutor-session-architecture', 'AI 튜터 메시징 대화형 세션 아키텍처 설계 및 구현', 
 '학생들의 4종 학습 상황(문제풀이, 복습, 챌린지, 개념보강)에 유연하게 대응하는 다형성 AI 대화 세션 도메인 모델링 및 AWS SQS 비동기 통신을 통한 멱등성 보장', 
 '# AI 튜터 메시징 대화형 세션 아키텍처 설계 및 구현\n\n## 1. 개요 및 배경\n- 학생들에게 학습 상황별 맞춤형 AI 피드백을 제공하기 위해 AI 튜터 메시징 세션 기능을 기획하였습니다.\n- 문제풀이, 오답 복습, 챌린지, 개념 보강 등 서로 다른 학습 흐름에서 유연하게 작동하는 공통 세션 관리 및 비동기 처리 파이프라인 구축이 요구되었습니다.\n\n## 2. 핵심 구현 사항 (Action Detail)\n- **팩토리 패턴 기반 도메인 추상화 (`AiTutorSessionFactory`)**:\n  - 4종의 다형적인 학습 컨텍스트 엔티티를 단일 대화형 세션 모델로 다형적 변환할 수 있는 팩토리 클래스를 설계 및 구현했습니다.\n- **이벤트 기반 비동기 SQS 큐 연동**:\n  - 외부 LLM 서버와의 네트워크 지연으로 인한 실시간 스레드 병목을 차단하기 위해 SQS 컨슈머를 이용한 백그라운드 메시지 발행/구독(Pub/Sub) 아키텍처를 적용했습니다.\n  - 메시지 누수 및 유실을 방지하고 네트워크 에러로 인한 재요청 발생 시 멱등성을 검증하는 멱등키 로직을 보강했습니다.\n- **MongoDB 트랜잭션 보장**:\n  - 세션 로그와 상태 변경이 안정적으로 쓰여지도록 Replica Set 분산 트랜잭션을 적용해 일관성을 지켰습니다.\n- **BFF (Backend for Frontend) 게이트웨이 구현**:\n  - NestJS 기반 BFF 서버를 통해 HTML Sanitize 처리 및 커서 기반 페이지네이션 조회 성능 최적화를 적용했습니다.\n\n## 3. 결과 및 성과 (Outcome)\n- 신규 학습 컨텍스트가 생겨도 공통 AI 메시징 로직을 변경하지 않고 구조를 재사용할 수 있는 유연한 설계를 확립했습니다.\n- 비동기 처리로 API 응답 시간을 최적화하고 백엔드 서버 부하를 균등하게 분산시켰습니다.',
 'PUBLISHED', 6, '2025-09-15', '2025-09-15 18:00:00', NOW(), NOW()),

-- Study 2: Presence & Student Monitoring
(2, 'realtime-student-presence-and-monitoring', '실시간 학생 Presence 추적 및 이상 행동 감지 시스템 구축',
 '교사들이 대규모 학생 접속 환경에서 웹소켓 비용 없이 주기적 HTTP Ping/Pong과 Redis, SQS 비동기 규칙 엔진을 이용해 학생 온라인 현황 및 이상 학습 행동을 모니터링하는 백엔드 설계',
 '# 실시간 학생 Presence 추적 및 이상 행동 감지 시스템 구축\n\n## 1. 개요 및 배경\n- 교사용 대시보드에서 수천 명 규모 학생들의 실시간 접속 상태(온라인, 오프라인, 자리비움, 백그라운드) 및 이상 학습 패턴을 즉각 탐지할 수 있는 백엔드 인프라가 필요했습니다.\n\n## 2. 핵심 구현 사항 (Action Detail)\n- **경량 Presence 추적 API 및 Ping/Pong 설계**:\n  - 웹소켓 상시 연결 비용을 피하기 위해 1분 주기의 경량 HTTP Ping/Pong 기반 상태 전송 구조를 구성했습니다.\n  - AWS Lambda를 통한 연결 판단 및 Redis를 활용한 세션 타임아웃 윈도우 스케줄링을 구현했습니다.\n- **이상 행동 알림 (`manageable-action`) 규칙 엔진**:\n  - 학생의 문제풀이 지연이나 연속 스킵 같은 이상 이벤트를 비동기로 수집해 SQS 큐로 적재하고, Consumer 모듈을 돌려 정량적 학습 규칙을 평가한 뒤 교사 통계 DB에 실시간 기록하는 시스템을 설계했습니다.\n- **실시간 호출 및 개입 API 구축**:\n  - 교사가 특정 학생에게 풀이를 요청하는 실시간 호출 도메인을 헥사고날 구조에 맞춰 설계했습니다.\n\n## 3. 결과 및 성과 (Outcome)\n- 대규모 동시 접속 상태를 리소스를 거의 쓰지 않고 경량 트래픽으로 추적하는 Presence 인프라를 성공적으로 정착시켰습니다.\n- 학원 교사들의 개입 성공률을 높여 학생의 이탈 방지에 실질적으로 기여했습니다.',
 'PUBLISHED', 4, '2025-06-26', '2025-06-26 17:00:00', NOW(), NOW()),

-- Study 3: CQRS & Migration
(3, 'cqrs-refactoring-and-data-migration', '제출 문항 도메인의 CQRS 리팩토링 및 6만 건 데이터 마이그레이션',
 '단일 컬렉션 집중 병목을 해결하기 위해 제출 문항 테이블을 학급/학생/전체/학원 단위로 분리하고 MongoDB 트랜잭션을 적용하여 집계 데이터를 마이그레이션한 성능 튜닝 사례',
 '# 제출 문항 도메인의 CQRS 리팩토링 및 6만 건 데이터 마이그레이션\n\n## 1. 개요 및 배경\n- 누적되는 제출 문항(`SubmittedProblem`) 데이터 볼륨 증가로 조회성 대시보드 API 쿼리의 응답 속도가 급격히 지연되는 병목이 발생했습니다.\n\n## 2. 핵심 구현 사항 (Action Detail)\n- **CQRS 패턴 적용 (Read/Write 격리)**:\n  - 쓰기 트래픽과 읽기 집계 트래픽을 분산시키기 위해 기존 단일 컬렉션을 학급(`class-submitted-problem`), 학생(`student-submitted-problem`), 전체(`total-submitted-problem`), 학원(`academy-submitted-problem`) 4개의 읽기 전용 통계 전용 도메인으로 수평 재설계했습니다.\n- **무중단 MongoDB 트랜잭션 마이그레이션 스크립트 작성**:\n  - 14개 핵심 통계 지표(제출수, 정답수, 소요시간 등)를 정확하게 집계·이관하기 위해 Multi-document 트랜잭션을 적용한 배치 파이프라인 스크립트를 작성하여 안전하게 병합 실행했습니다.\n\n## 3. 결과 및 성과 (Outcome)\n- 읽기/쓰기 관심사를 분리하여 조회 성능 병목을 해소하고 대시보드 화면 진입 속도를 극대화했습니다.\n- 무중단으로 대형 프로덕션 마이그레이션을 데이터 유실 0%로 안정적으로 완수했습니다.',
 'PUBLISHED', 4, '2025-01-15', '2025-01-15 15:00:00', NOW(), NOW()),

-- Study 4: Backoffice & Redis Session
(4, 'spring-boot-backoffice-and-session-auth', 'Spring Boot 백오피스 서버 단독 구축 및 Redis 세션 기반 크로스도메인 해결',
 '무료체험 유입 분석 자동화 TF를 위한 Spring Boot 백엔드 단독 설계/구축 및 쿠키 세션 크로스도메인 인증 이슈 대응',
 '# Spring Boot 백오피스 서버 단독 구축 및 Redis 세션 기반 크로스도메인 해결\n\n## 1. 개요 및 배경\n- 마케팅 광고 및 오프라인 QR 유입 추적, 태블릿 렌탈과 프로모션 관리에 사용되던 엑셀 수기 행정 비효율성을 줄이기 위해 사내 무료체험 관리용 백오피스 구축을 총괄 단독 개발했습니다.\n\n## 2. 핵심 구현 사항 (Action Detail)\n- **헥사고날/DDD 아키텍처 기반 1인 단독 개발**:\n  - Spring Boot 3.2, Spring Security, JPA를 기반으로 8개 핵심 도메인과 144개 클래스 규모를 직접 설계했습니다.\n  - NCP 카카오 알림톡 API 연동 시 위변조 방지용 HMAC-SHA256 헤더 서명을 자바 표준 암호화 라이브러리로 직접 구성하고 MS Teams 알림 카드를 결합했습니다.\n- **Redis 분산 세션 기반 크로스도메인 보안 이슈 디버깅**:\n  - 독립 배포된 도메인 간 교차 사이트 요청 시 브라우저 보안 규격(SameSite/Secure)에 가로막혀 세션 쿠키가 전달되지 않는 문제를 해결하기 위해 Redis Session 클러스터 연동 및 Nginx 헤더 튜닝을 통해 인증 차단을 해결했습니다.\n- **모니터링 및 인프라 구축**:\n  - Docker Compose로 MySQL 백업 주기 배치, Redis, Nginx Basic Auth 프록시, Grafana 로깅 뷰어를 서버 내에 단독 오케스트레이션했습니다.\n\n## 3. 결과 및 성과 (Outcome)\n- 사내 모든 부서에서 반복되던 무료체험 신청 관리 행정 작업이 100% 자동화되어 에러율 0%를 유지하게 되었습니다.\n- 보안성 높은 암호화 서명 연동 및 세션 이슈를 직접 디버깅해 안정적 운영 토대를 완성했습니다.',
 'PUBLISHED', 4, '2025-06-13', '2025-06-13 11:00:00', NOW(), NOW()),

-- Study 5: npm packages monorepo & CLI scaffolding
(5, 'common-packages-and-cli-scaffolding', '사내 공용 라이브러리 모노레포 구축 및 CLI 스캐폴딩 도구 개발',
 '공통 아키텍처 규격을 패키지화해 전사 마이크로서비스에 일관 적용하고, commander.js 기반 템플릿 CLI 생성 도구를 개발해 마이크로서비스 생성 속도 표준화',
 '# 사내 공용 라이브러리 모노레포 구축 및 CLI 스캐폴딩 도구 개발\n\n## 1. 개요 및 배경\n- 다수의 마이크로서비스(BFF, Application, Common Problem 등) 구축 과정에서 공통 인프라 설정 코드(MongoDB, Redis 지수백오프, SQS PubSub 래퍼), 예외 정의(9977-9999 에러코드), Swagger 데코레이터 등의 중복이 빈번히 발생해 이를 방지하기 위한 표준화 작업을 기획했습니다.\n\n## 2. 핵심 구현 사항 (Action Detail)\n- **npm workspaces 모노레포 아키텍처 설계**:\n  - `@susimdal/common`(예외 클래스 및 HTTP 변환기), `@susimdal/core`(NestJS 서버 부트스트랩 엔진), `@susimdal/infra`(MongoDB, Redis TLS 튜닝, SQS PubSub)로 코드를 패키징하여 GitHub Packages 비공개 레지스트리로 배포했습니다.\n- **스캐폴딩 CLI 도구 개발 (`@susimdal/cli`)**:\n  - commander 기반 CLI 명령어(`susimdal new`, `susimdal generate`)를 개발하여, 신규 개발자가 단 한 줄의 명령어로 Dockerfile, ECS Task Definition, GitHub Actions CI/CD 파일이 포함된 4계층 클린 아키텍처 모듈 전체 템플릿을 자동 스캐폴딩하도록 구현했습니다.\n\n## 3. 결과 및 성과 (Outcome)\n- 신규 마이크로서비스 프로젝트 구성 시간을 수 일에서 수 분으로 단축시켰으며, 사내 프로젝트 전체에 완전한 아키텍처적 일관성을 확보하여 코드 리뷰 피로도를 낮췄습니다.\n- 공통 인프라 버그 픽스 시 패키지 배포 버전업만으로 모든 서버에 일괄 패치 적용 가능한 환경을 마련했습니다.',
 'PUBLISHED', 5, '2025-09-10', '2025-09-10 19:00:00', NOW(), NOW()),

-- Study 6: Playwright session bypass
(6, 'naver-cafe-session-playwright-automation', 'Playwright 브라우저 자동화를 통한 네이버 카페 보안 세션 우회 및 E2E 답변 자동화',
 '네이버의 로그인 보안 정책을 우회하기 위해 Playwright OTP 로그인 기능을 탑재한 브라우저 워커를 구축하고, AES/GCM 쿠키 암복호화 및 주기적 헬스체크 검증을 통해 무중단으로 카페 글/답글 등록 자동화를 구현했습니다.',
 '# Playwright 브라우저 자동화를 통한 네이버 카페 보안 세션 우회 및 E2E 답변 자동화\n\n## 1. 개요 및 배경\n- 고객 지원 프로세스 효율화를 위해 네이버 카페 게시판에 등록되는 고객 문의에 대해 시스템이 자동으로 답변을 등록하는 기능이 요구되었습니다.\n- 네이버의 강력한 로그인 보안 정책(CAPTCHA, 2단계 인증 등)으로 인해 단순 HTTP request를 통한 로그인 세션 유지가 불가능했으며, 로그인 세션이 빈번하게 만료되어 수동 개입이 수반되는 병목이 존재했습니다.\n\n## 2. 핵심 구현 사항 (Action Detail)\n- **Playwright 기반 일회용 로그인(OTP) 워커 구축**:\n  - headless 브라우저 제어용 Node.js 기반 browser-worker 서버를 분리 구축하고, Playwright를 활용해 nid.naver.com의 일회용 번호 로그인 탭 활성화 및 OTP 코드를 자동 기입하여 인증 절차를 자동화했습니다.\n- **세션 쿠키 필터링 및 DB 보안 저장**:\n  - 로그인 성공 후 브라우저 컨텍스트에서 NID_AUT 및 NID_SES 세션 쿠키만 필터링하여 Spring Boot API 서버로 전달하고, AES-GCM 암호화를 적용해 naver_cafe_sessions 테이블에 안전하게 적재했습니다.\n- **자동화된 세션 상태 동기화 및 만료 진단**:\n  - 백엔드에 주기적(Scheduler) 또는 문의 수집 전 세션 유효성을 진단(nid.naver.com 내 정보 페이지로 테스트 페이지 이동)하여 만료 여부를 판별하고, 만료 시 슬랙/팀즈 알림을 발송하거나 n8n 크롤링 일시 정지 등의 상호 통제를 수행했습니다.\n- **답글/대댓글 및 멘션 등록 기능 구현**:\n  - Playwright를 통해 모바일 네이버 카페 답글 페이지로 이동 후, 브라우저 DOM 내 placeholder 클릭 및 input 텍스트 기입을 수행했습니다. 답글 수신자를 멘션하기 위해 HTML innerHTML 조작을 통해 특정 멘션 태그 구조를 강제 주입하여 제출하는 E2E 자동 답변 기능을 구성했습니다.\n\n## 3. 결과 및 성과 (Outcome)\n- 로그인 시 보안 문자(CAPTCHA) 입력 과정을 스마트폰 네이버 앱의 OTP 번호 입력으로 일원화해 세션 갱신을 10초 내로 간소화했습니다.\n- 무중단으로 네이버 카페 고객 문의 수집 및 답변/대댓글 매핑 E2E 자동화를 완수하여 고객 대응 리드타임을 수 분 이내로 단축시켰습니다.',
 'PUBLISHED', 5, '2026-07-10', '2026-07-10 15:00:00', NOW(), NOW()),

-- Study 7: Inquiry Threading Engine
(7, 'inquiry-thread-parsing-and-automatic-mapping', '이메일 및 카페 문의의 다형적 통합 수집과 헤더 기반 스레딩/상태 제어 엔진 구축',
 'n8n과 Spring Boot 백엔드를 결합해 이메일/카페 문의를 다형적 메타데이터로 통합하고, In-Reply-To, References 헤더 파싱 및 이메일 발신자 해싱을 이용해 관련 메일을 기존 문의 스레드로 묶어내며 상태를 자동으로 재오픈하는 비즈니스 엔진 설계',
 '# 이메일 및 카페 문의의 다형적 통합 수집과 헤더 기반 스레딩/상태 제어 엔진 구축\n\n## 1. 개요 및 배경\n- 이메일, 네이버 카페 등 다양한 비정형 채널에서 고객 문의가 접수됨에 따라, 동일한 사용자가 보낸 회신 메일이나 연관 질문들이 개별 건으로 무작위 등록되어 상담원이 동일인에게 중복 답변을 하거나 답변 컨텍스트가 꼬이는 비효율을 겪었습니다.\n- 이를 해결하기 위해 이메일 스레드를 하나로 묶어 관리하고, 답변에 대한 추가 회신 유입 시 자동으로 티켓의 수명주기를 제어하는 스마트 스레딩 엔진을 기획했습니다.\n\n## 2. 핵심 구현 사항 (Action Detail)\n- **n8n 연동 다형적 데이터 수집 파이프라인**:\n  - n8n 스케줄러로 IMAP 이메일 수신 및 카페 API를 주기적으로 폴링하고, 백엔드의 통합 API(IntegrateInquiryDataUseCase)로 전달하여 채널별 JSONB 메타데이터(EmailMetadata, NaverCafeMetadata)에 맞춰 다형적으로 파싱 및 bulkInsert를 수행하도록 구조화했습니다.\n- **이메일 헤더 분석 기반 스레드 매핑**:\n  - 이메일의 In-Reply-To 및 References 헤더를 파싱해 이전 메일의 Message-ID를 추적하고, 일치하는 데이터가 있을 경우 기존 부모 문의의 parentId를 자식 문의에 할당하는 계층형 스레딩 모델을 구현했습니다.\n- **발신자 해싱 및 제목 정규화 Heuristic 매치**:\n  - 메일 서버 특성상 헤더가 유실되는 예외 상황에 대비하여, 회신 접두사(Re:, Fwd:, 회신: 등)를 제거해 제목을 단순 비교하고, 발신자 이메일을 HMAC-SHA256 해시값(email_sender_hash)으로 인덱싱 조회해 최근 7일 내의 동일 발신자/유사 제목 문의를 부모 티켓으로 자동 결속하는 Heuristic 로직을 구축했습니다.\n- **스레드 상태 전이 및 감사 로그(Audit Log) 자동화**:\n  - 해결(RESOLVED)된 문의 티켓에 새로운 고객 회신이 매핑되면, 시스템이 자동으로 티켓 상태를 오픈(OPEN)으로 전환하고, [시스템] 회신 메일 유입으로 인한 문의 재오픈 메시지를 작업 로그(InquiryWorkLog) 테이블에 자동 기록해 상담 과정의 투명성을 확보했습니다.\n\n## 3. 결과 및 성과 (Outcome)\n- 파편화된 이메일 회신 건들을 하나의 문의 아래 히스토리 형태로 모아 볼 수 있어 상담원이 이전 대화 맥락을 즉각 파악하고 중복 답변하는 리소스를 제거했습니다.\n- 메일 회신 시 자동으로 문의가 재오픈되어 고객의 누락 질문을 0건으로 제어하는 데 기여했습니다.',
 'PUBLISHED', 4, '2026-07-15', '2026-07-15 11:00:00', NOW(), NOW()),

-- Study 8: JPA PII Encryption
(8, 'db-level-pii-encryption-and-migration', 'JPA Converter와 HMAC 해싱을 통한 개인정보(PII) 암호화 및 무중단 데이터 마이그레이션',
 '민감한 고객 데이터(문의 내용, 이메일, 연락처) 보호를 위해 AES/GCM 양방향 암호화를 JPA 컨버터에 내장하고, 등치 검색을 위한 HMAC-SHA256 해시 설계 및 기존 평문 데이터를 하위 호환성을 지키며 안전하게 이관한 마이그레이션 아키텍처',
 '# JPA Converter와 HMAC 해싱을 통한 개인정보(PII) 암호화 및 무중단 데이터 마이그레이션\n\n## 1. 개요 및 배경\n- 고객의 문의 본문과 연락처 정보 등 민감 개인정보(PII)를 데이터베이스에 평문 저장하는 것은 보안 및 법적 컴플라이언스(개인정보보호법) 측면에서 매우 취약했습니다.\n- 이를 위해 DB 데이터 암호화를 적용하되, 이미 다량의 실서비스 데이터가 적재되어 있는 상황에서 무중단으로 하위 호환성을 유지하며 암호화를 점진 적용하고 마이그레이션하는 전술이 필요했습니다.\n\n## 2. 핵심 구현 사항 (Action Detail)\n- **JPA Attribute Converter를 통한 AES/GCM 암복호화 자동화**:\n  - 영속성 계층에서 데이터를 쓰고 읽을 때 자동으로 동작하는 EncryptedStringConverter를 개발하고, AES/GCM(Galois/Counter Mode) 방식으로 대칭키 암호화를 통합했습니다. 매 암호화마다 랜덤 IV를 생성하여 동일한 값이라도 다른 암호문이 되도록 보안성을 높였습니다.\n- **일치 검색(Equi-Join)을 위한 HMAC-SHA256 해시 컬럼 설계**:\n  - AES/GCM 암호문은 매번 암호화 결과가 달라 동치 비교(WHERE = ) 조회가 불가능한 한계가 있습니다. 이를 해결하기 위해 이메일 발신자 정보를 해싱하여 조회할 수 있는 email_sender_hash 컬럼을 추가하고, SHA-256 기반 HMAC 해싱 처리를 백엔드에서 전담하게 했습니다.\n- **점진적 무중단 마이그레이션 설계**:\n  - 아직 암호화되지 않은 레거시 데이터와의 호환을 위해 복호화 실패 시 예외를 던지지 않고 평문 그대로를 통과시키는 관용적 복호화(decryptOrPassThrough) 로직을 임시 도입했습니다.\n  - 이관 대기 데이터에 대해 이미 암호화된 컬럼은 건너뛰고(tryDecrypt 사용), 평문 데이터만 필터링해 암호문으로 갱신하는 Flyway 마이그레이션 및 Spring 배치 스크립트 기반 이관 파이프라인을 운영했습니다.\n\n## 3. 결과 및 성과 (Outcome)\n- 데이터베이스 침해 사고 발생 시에도 문의 내용 및 이메일 등의 원본 노출을 차단해 보안 컴플라이언스를 완벽하게 통과했습니다.\n- 실서버 무중단 상태에서 기존 적재 데이터를 유실이나 깨짐 없이 100% 안전하게 암호화 상태로 마이그레이션했습니다.',
 'PUBLISHED', 4, '2026-07-20', '2026-07-20 17:00:00', NOW(), NOW()),

-- Study 9: Cost Optimization (LogDoctor)
(9, 'azure-log-cost-retention-optimization', 'Azure 로그 비용 과다 진단 및 보관 기간 최적화 (RET-001, RET-002)',
 'Azure Log Analytics Workspace(LAW)의 Usage 테이블을 분석하고, Azure Resource Graph와 Retail Prices API를 실시간 연동하여 일일 한도(Quota Gb) 대비 로그 비용 소진율을 진단하고 테이블별 최적 보존 주기 및 요금제 전환(Basic/Archive) 처방 자동화.',
 '# Azure 로그 비용 과다 진단 및 보관 기간 최적화 (RET-001, RET-002)\n\n## 1. 개요 및 배경\n- 클라우드 환경에서 시스템 규모가 커짐에 따라 수집되는 로그 데이터 양이 급증하고, 이로 인해 Log Analytics Workspace(LAW) 청구 비용이 예측 불가능하게 늘어나는 ''빌링 쇼크(Billing Shock)''가 빈번히 발생했습니다.\n- 로그 요금의 최적화를 위해서는 단순히 전체 로그 수집을 제한하는 것이 아니라, 어떤 테이블에서 비용이 발생하고 있는지(Usage 분석), 그리고 각 테이블별 보존 주기(Retention Days)와 요금제(Plan)가 가치에 맞게 설정되어 있는지 동적으로 진단하고 처방하는 지능형 모니터링이 필요했습니다.\n\n## 2. 핵심 구현 사항\n- **Usage 테이블 기반 실시간 비용 추적 (RET-001)**:\n  - `Usage` 시스템 테이블을 쿼리하여 실제 과금 대상인 테이블 (`IsBillable == true`)의 데이터 크기 (`Quantity` 및 `_BilledSize`)를 DataType별로 정렬 및 분석하는 KQL 수집 모듈 구현.\n- **Azure Retail Prices API 실시간 연동**:\n  - 리소스가 배포된 Azure 리전(location) 속성을 식별하고, 해당 리전의 `Analytics Logs Data Ingestion` Pay-As-You-Go 단가를 동적으로 API 호출하여 정확한 비용을 USD로 환산.\n  - 리전별 단가 조회 시 오버헤드를 낮추기 위해 Warm 인스턴스 내에서 24시간 TTL을 가지는 인메모리 캐시 설계.\n- **ARG(Azure Resource Graph) 기반 동적 예산 수집**:\n  - `workspaceCapping.dailyQuotaGb` 설정을 Resource Graph로 Bulk 조회하여, 각 워크스페이스에 설정된 일일 한도를 기준으로 일일 예산 자동 계산 (미설정 시 기본값 $10.0 적용).\n- **테이블 등급별 보존 주기 최적화 및 시뮬레이션 (RET-002)**:\n  - 로그 성격에 따른 테이블 분류 체계(Data Classification) 정의:\n    - **Class A (보안/감사)**: SigninLogs, AuditLogs, AzureActivity 등 (1년 보존 규정 준수 검증)\n    - **Class B (운영/지표)**: AppRequests, AppDependencies, Heartbeat (권장 보존 14일 이내)\n    - **Class C (추적/디버그)**: AppTraces (권장 보존 7일 이내)\n  - 테이블별 현재 보존일수(`retention_days`)와 일평균 사용량(`daily_avg_gb`)을 조회하여, 31일 초과분에 대한 Archive 티어 전환 시의 월간 예상 절감 비용을 다음 수식으로 시뮬레이션:\n    - `현재 비용 = 일평균GB * 30일 * (현재보존일 - 31) * LAW_Interactive_단가`\n    - `권장 비용 = 일평균GB * 30일 * (현재보존일 - 31) * LAW_Archive_단가`\n    - `절감액 = 현재 비용 - 권장 비용`\n\n## 3. 결과 및 성과\n- 일일 예산 대비 현재 소진율(`budget_ratio`)을 계산하여 **10% 이상인 경우 Warning**, **25% 이상인 경우 Critical** 경보를 발송하여 요금 폭탄을 예방하는 사전 방어체계 마련.\n- 컴플라이언스(보안 로그 365일 준수) 준수 여부와 운영 로그의 불필요한 과보존(Interactive 보존 설정) 상태를 한눈에 진단하고 Basic Logs 요금제 또는 Blob Archive 전환 처방을 Markdown 카드로 제공.',
 'PUBLISHED', 5, '2026-06-25', '2026-06-25 10:00:00', NOW(), NOW()),

-- Study 10: Observability (LogDoctor)
(10, 'cloud-infrastructure-app-observability-diagnostics', '클라우드 인프라 생존 및 앱 관측성 진단 아키텍처 (DET-001, DET-002, DET-003)',
 'App Service, Container Apps, VM 등 분산 인프라에서 수집되는 telemetry(Heartbeat, AppRequests, AppTraces)의 유입 상태를 분석하여 인프라-앱 간의 관측성 배관 단절을 진단하고 서비스 장애/지연 지표 자동 탐지.',
 '# 클라우드 인프라 생존 및 앱 관측성 진단 아키텍처 (DET-001, DET-002, DET-003)\n\n## 1. 개요 및 배경\n- MSA 및 멀티 클라우드 환경에서 리소스(VM, App Service, ACA 등)는 정상 작동 중이나 로그 에이전트가 중단되어 사각지대가 발생하거나, 비싼 상용 모니터링 툴(Datadog 등)이 없어 장애 발생 시 신속한 탐지가 어려운 문제를 해결해야 했습니다.\n- 환경변수의 계정 정보나 Secret 키를 직접 조회하는 보안적 한계를 극복하기 위해, 연결된 Log Analytics Workspace의 데이터를 기반으로 실제 관측 배관의 유효성과 앱 성능 상태를 간접 판정하는 엔진을 구축했습니다.\n\n## 2. 핵심 구현 사항\n- **명시 연결 기반 Target Resolver (DET-001)**:\n  - RG(리소스 그룹)나 이름이 같다는 임의의 결합이 아닌, Diagnostic Settings, hidden-link 메타데이터 등 리소스 설정에 정의된 명시적 연결 경로만 추적하여 신뢰도("strong")를 확보.\n  - App Service, Functions, Azure Container Apps(ACA), Azure Container Instances(ACI)를 대상으로 `AppRequests`, `AppTraces`, `AppExceptions` 유입 상태를 조회하고, 누설 시 Console Logs 테이블을 fallback으로 탐색.\n- **VM 관측성 배관 진단 및 생존 분석 (DET-002)**:\n  - VM의 시스템 관측성 배관이 정상인지 판단하기 위해 DCR Association 정보와 AMA(Azure Monitor Agent) 설치 여부를 교차 검증.\n  - KQL을 활용해 `Heartbeat` 수신 상태를 조회하고, 가동 중인 VM의 Host Name을 활용해 연관된 `AppRequests`/`AppTraces`의 유입 여부를 추적해 앱 후보군 매핑.\n- **HTTP 헬스 신호 및 응답 지연 탐지 (DET-003)**:\n  - `AppRequests` 테이블에서 헬스체크 봇, robots.txt, AlwaysOn 정적 Ping 등 노이즈 요청을 제외한 실질 비즈니스 트래픽 필터링 쿼리 적용.\n  - 최근 24시간 에러율(HTTP 5xx)과 P95 응답 속도(`percentile(DurationMs, 95)`)를 산출하여 장애 상태 자동 감지.\n\n## 3. 결과 및 성과\n- **배관 진단**: 명시 연결 LAW가 없거나 KQL 조회 자체가 불가능할 때 **Critical**, 플랫폼 로그만 들어올 때 **Warning**, 앱 관측성(AppRequests)이 완비되었을 때 **Healthy** 판정을 내리는 유연한 파이프라인 정착.\n- **장애 감지**: 에러율 > 15% 또는 P95 Latency > 5,000ms일 때 **Critical**, 에러율 > 5% 또는 P95 Latency > 2,000ms일 때 **Warning** 경보를 발송하여 클라우드 리소스 헬스 대시보드 시각화 구현.',
 'PUBLISHED', 5, '2026-06-27', '2026-06-27 14:00:00', NOW(), NOW()),

-- Study 11: PII Masking & Filtering (LogDoctor)
(11, 'intelligent-log-filtering-pii-masking-engine', '지능형 로그 필터링 및 민감 정보 마스킹 엔진 (PRV-001, PRV-002, PRV-003, FLT-001, FLT-002, FLT-003)',
 '운영 환경의 상세 로그 활성화 여부 진단, 정규식을 통한 개인정보(PII) 유출 탐지/마스킹, 에러 로그 컨텍스트 3요소 품질 평가 점수화, 고빈도 노이즈(Health check) 분석을 통한 DCR 필터링 자동 처방 구현.',
 '# 지능형 로그 필터링 및 민감 정보 마스킹 엔진 (PRV-001, PRV-002, PRV-003, FLT-001, FLT-002, FLT-003)\n\n## 1. 개요 및 배경\n- 개발 단계에서 남긴 상세 디버그 로그가 운영(Production) 환경에 그대로 배포되어 불필요한 비용을 발생시키거나, 사용자 계정 정보(비밀번호, 토큰, 이메일 등)가 평문으로 수집되어 보안 컴플라이언스를 위반하는 리스크를 방지하고자 했습니다.\n- 또한, 의미 없는 반복성 로그가 전체 용량의 대부분을 차지하거나 에러 로그에 정작 추적에 필요한 정보(로그 위치, 예외 타입, 조치 힌트)가 누락되어 디버깅 속도를 저하시키는 문제를 기계적으로 해결하기 위해 진단 필터링 엔진을 구현했습니다.\n\n## 2. 핵심 구현 사항\n- **운영 환경 디버그 로그 방치 감지 (PRV-001)**:\n  - App Settings 환경변수(`LOG_LEVEL`, `DEBUG` 등)와 KQL of `SeverityLevel <= 1` 데이터 유입 여부를 교차 검증하여 코드 내 하드코딩된 디버그 로그 레벨을 판별.\n- **PII(개인정보) 감지 및 실시간 마스킹 (FLT-001)**:\n  - 이메일, 전화번호, 주민등록번호, 비밀번호, access_token, api_key 등의 정규식 패턴 세트 정의.\n  - 개인정보가 백엔드로 유출되는 것을 원천 차단하기 위해 LAW 조회 단계에서 마스킹 처리를 수행하고, 본 서버에는 마스킹 패턴 건수 및 종류만 전달.\n- **고빈도 노이즈 분석 및 DCR KQL 생성 (PRV-002, PRV-003, FLT-003)**:\n  - UUID 및 숫자 패턴을 정규화한 뒤 앞 150글자를 지문(fingerprint) 삼아 상위 10개 노이즈 패턴 분석.\n  - 50KB를 초과하는 대용량 페이로드(Oversized Trace)와 1MB를 초과하는 위험 페이로드 감지(Message vs Properties 중 주범 필드 크기 비율 자동 특정).\n  - LLM을 활용해 노이즈 패턴을 차단할 수 있는 DCR Transformation KQL(`hash(OperationId) % 100 < 10` 등) 처방 코드 자동 생성.\n- **에러 로그 컨텍스트 품질 점수화 (FLT-002)**:\n  - 에러 대응 3대 요소(Cause: 예외 타입/메시지, Location: 로거명/스택트레이스, Action: retry/check 등의 힌트) 존재 여부를 판별하여 점수를 부여하고, 누락 항목에 대한 경고 알림 제공.\n\n## 3. 결과 및 성과\n- 개인정보 유출 리스크를 원천적으로 방지하고, 운영 환경에 켜져 있는 디버그 로거와 무거운 페이로드 로그를 즉시 적발하여 비용 누수를 사전 차단.\n- 지문 분석과 에러 컨텍스트 3요소 품질 분석을 통해 단순 로그 양을 줄이면서도 모니터링 품질(SNR)을 극대화하여 실무 개발팀의 디버깅 시간 단축에 기여.',
 'PUBLISHED', 4, '2026-06-30', '2026-06-30 18:00:00', NOW(), NOW());

-- 10. Study Tags Mapping
INSERT INTO study_tag (study_id, tag_id) VALUES
-- Study 1 (ai-tutor-session-architecture)
(1, 1),  -- Backend
(1, 2),  -- MSA
(1, 3),  -- AI
(1, 4),  -- SQS
(1, 5),  -- Idempotence
(1, 6),  -- MongoDB
-- Study 2 (presence)
(2, 1),  -- Backend
(2, 7),  -- Presence
(2, 8),  -- Redis
(2, 9),  -- Telemetry
(2, 4),  -- SQS
-- Study 3 (cqrs)
(3, 1),  -- Backend
(3, 10), -- CQRS
(3, 11), -- Database
(3, 12), -- Migration
(3, 6),  -- MongoDB
(3, 13), -- Transaction
-- Study 4 (backoffice)
(4, 1),  -- Backend
(4, 14), -- Spring
(4, 15), -- Security
(4, 8),  -- Redis
(4, 16), -- Session
(4, 17), -- Nginx
-- Study 5 (common packages)
(5, 18), -- DevOps
(5, 19), -- Monorepo
(5, 20), -- CLI
(5, 21), -- Scaffold
(5, 22), -- Infrastructure
(5, 23), -- NPM
-- Study 6 (playwright bypass)
(6, 18), -- DevOps
(6, 24), -- Playwright
(6, 25), -- Automation
(6, 26), -- Naver Cafe
(6, 16), -- Session
-- Study 7 (inquiry thread)
(7, 1),  -- Backend
(7, 27), -- Spring Boot
(7, 28), -- Email Threading
(7, 29), -- n8n
(7, 30), -- Heuristic
-- Study 8 (PII encryption)
(8, 1),  -- Backend
(8, 15), -- Security
(8, 31), -- Encryption
(8, 12), -- Migration
(8, 32), -- HMAC
-- Study 9 (cost optimization)
(9, 33), -- Cloud
(9, 34), -- Azure
(9, 35), -- Cost Optimization
(9, 36), -- KQL
-- Study 10 (observability diagnostics)
(10, 33), -- Cloud
(10, 34), -- Azure
(10, 37), -- Observability
(10, 36), -- KQL
-- Study 11 (PII masking)
(11, 33), -- Cloud
(11, 34), -- Azure
(11, 38), -- PII Masking
(11, 36); -- KQL

-- 11. Study Skills Mapping
INSERT INTO study_skill (study_id, skill_id) VALUES
(1, 4),  -- Node.js
(1, 2),  -- TypeScript
(1, 9),  -- Express
(1, 16), -- MongoDB
(1, 30), -- AWS ECS
(1, 54), -- Amazon SQS
(1, 8),  -- NestJS
(2, 2),  -- TypeScript
(2, 8),  -- NestJS
(2, 15), -- Redis
(2, 30), -- AWS ECS
(2, 54), -- Amazon SQS
(3, 4),  -- Node.js
(3, 2),  -- TypeScript
(3, 16), -- MongoDB
(3, 50), -- Database
(4, 1),  -- Java
(4, 5),  -- Spring Boot
(4, 15), -- Redis
(4, 17), -- SQL (using MySQL 17/15)
(4, 31), -- Docker
(4, 25), -- Nginx
(4, 27), -- Grafana
(4, 56), -- MySQL
(4, 61), -- Spring Data JPA
(4, 62), -- Spring Security
(5, 4),  -- Node.js
(5, 2),  -- TypeScript
(5, 8),  -- NestJS
(5, 31), -- Docker
(5, 30), -- AWS ECS
(5, 54), -- Amazon SQS
(5, 16), -- MongoDB
(6, 23), -- Playwright
(6, 26), -- Docker Compose
(6, 25), -- Nginx
(7, 1),  -- Java
(7, 5),  -- Spring Boot
(7, 13), -- QueryDSL
(7, 55), -- PostgreSQL
(7, 61), -- Spring Data JPA
(7, 62), -- Spring Security
(8, 1),  -- Java
(8, 5),  -- Spring Boot
(8, 22), -- Flyway
(9, 17), -- SQL
(9, 18), -- Database Modeling
(9, 19), -- SQL Query Optimization
(9, 59), -- KQL
(9, 60), -- Azure Log Analytics
(9, 34), -- Bicep
(9, 33), -- IaC
(10, 45), -- Azure Functions
(10, 7),  -- FastAPI
(10, 14), -- Cosmos DB
(10, 3),  -- Python
(10, 25), -- Nginx
(10, 26), -- Docker Compose
(10, 27), -- Grafana
(10, 28), -- Loki
(10, 29), -- Alloy
(11, 3),  -- Python
(11, 7),  -- FastAPI
(11, 14), -- Cosmos DB
(11, 36), -- Azure OpenAI
(11, 37); -- Teams SDK

-- 12. Study Experiences Mapping
INSERT INTO study_experience (study_id, experience_id) VALUES
(1, 1),
(2, 1),
(3, 1),
(4, 1),
(5, 1),
(6, 2),
(7, 2),
(8, 2),
(9, 3),
(10, 3),
(11, 3);

-- 13. Study Experience Details Mapping
INSERT INTO study_experience_detail (study_id, experience_detail_id) VALUES
(1, 1),
(2, 2),
(3, 2),
(4, 3),
(5, 5),
(6, 6),
(7, 7),
(8, 8),
(9, 11),
(9, 13),
(10, 11),
(10, 13),
(10, 14),
(11, 11),
(11, 12);

COMMIT;
