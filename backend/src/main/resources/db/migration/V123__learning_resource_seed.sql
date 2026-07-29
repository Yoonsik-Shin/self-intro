-- 인프런 보유 강의 카탈로그(docs/inflearn-course-catalog.md) 214개 시딩
-- 태그 먼저 확보(기존 태그와 이름 충돌 시 utf8mb4_unicode_ci 대소문자 무시 콜레이션으로 자동 스킵)
INSERT IGNORE INTO `tag` (`name`, `slug`) VALUES
('3D Web', '3d-web'),
('AI Agent 종합', 'ai-agent-종합'),
('AI 평가', 'ai-평가'),
('API/GraphQL', 'api-graphql'),
('API/gRPC', 'api-grpc'),
('AWS 기초', 'aws-기초'),
('AWS 네트워킹', 'aws-네트워킹'),
('AWS 보안', 'aws-보안'),
('AWS 보안/IAM', 'aws-보안-iam'),
('AWS 심화', 'aws-심화'),
('AWS 아키텍처', 'aws-아키텍처'),
('AWS/EKS', 'aws-eks'),
('AWS/EKS 심화', 'aws-eks-심화'),
('Actuator', 'actuator'),
('Airflow', 'airflow'),
('CI/CD', 'ci-cd'),
('CNN', 'cnn'),
('CNN 기초', 'cnn-기초'),
('CSS', 'css'),
('CS일반', 'cs일반'),
('CS종합', 'cs종합'),
('Cypress', 'cypress'),
('DB', 'db'),
('DB/트랜잭션/인덱스', 'db-트랜잭션-인덱스'),
('Django', 'django'),
('Docker', 'docker'),
('EKS/GitLab CI-CD', 'eks-gitlab-ci-cd'),
('EKS/Spring 배포', 'eks-spring-배포'),
('Figma', 'figma'),
('Flink', 'flink'),
('Git', 'git'),
('Git 내부구조', 'git-내부구조'),
('GitHub 자격증', 'github-자격증'),
('Go', 'go'),
('Grafana', 'grafana'),
('HTTP', 'http'),
('HTTP/네트워크', 'http-네트워크'),
('JS', 'js'),
('JS/면접', 'js-면접'),
('JS엔진', 'js엔진'),
('JavaScript', 'javascript'),
('JavaScript 입문', 'javascript-입문'),
('K8s', 'k8s'),
('K8s 보안', 'k8s-보안'),
('K8s 실무', 'k8s-실무'),
('K8s 입문', 'k8s-입문'),
('K8s 자격증', 'k8s-자격증'),
('K8s/모니터링', 'k8s-모니터링'),
('Kafka', 'kafka'),
('Kafka 심화', 'kafka-심화'),
('Kafka+Spark', 'kafka-spark'),
('LLM 인프라', 'llm-인프라'),
('LangChain 입문', 'langchain-입문'),
('Linux', 'linux'),
('Linux 입문', 'linux-입문'),
('Linux/모니터링', 'linux-모니터링'),
('ML(JS)', 'ml-js'),
('MSA 입문', 'msa-입문'),
('MSA 종합', 'msa-종합'),
('NATS', 'nats'),
('Next.js', 'next-js'),
('Next.js/NestJS', 'next-js-nestjs'),
('Nginx', 'nginx'),
('Nginx 심화', 'nginx-심화'),
('NoSQL(Cassandra)', 'nosql-cassandra'),
('NoSQL(MongoDB)', 'nosql-mongodb'),
('Node.js', 'node-js'),
('Node.js/CS', 'node-js-cs'),
('OS', 'os'),
('Python/API', 'python-api'),
('Python/동시성', 'python-동시성'),
('RAG', 'rag'),
('RAG/LangGraph', 'rag-langgraph'),
('RDB 성능', 'rdb-성능'),
('RDB 입문', 'rdb-입문'),
('RDB(PostgreSQL)', 'rdb-postgresql'),
('RDB/MySQL 튜닝', 'rdb-mysql-튜닝'),
('RDB/모델링', 'rdb-모델링'),
('RPC', 'rpc'),
('RabbitMQ', 'rabbitmq'),
('React', 'react'),
('React Native', 'react-native'),
('Redis', 'redis'),
('Redis 입문', 'redis-입문'),
('RxJS', 'rxjs'),
('Spring Cloud', 'spring-cloud'),
('Spring+LLM', 'spring-llm'),
('Storybook', 'storybook'),
('TDD', 'tdd'),
('Terraform', 'terraform'),
('TypeScript', 'typescript'),
('TypeScript 입문', 'typescript-입문'),
('UX 기획', 'ux-기획'),
('WebRTC', 'webrtc'),
('WebRTC/미디어', 'webrtc-미디어'),
('n8n/워크플로우', 'n8n-워크플로우'),
('객체지향(Python)', '객체지향-python'),
('객체지향설계', '객체지향설계'),
('게임개발/C++', '게임개발-c'),
('게임서버', '게임서버'),
('결제시스템', '결제시스템'),
('그래픽/게임', '그래픽-게임'),
('네트워크', '네트워크'),
('네트워크(프론트)', '네트워크-프론트'),
('논문구현', '논문구현'),
('데스크톱앱', '데스크톱앱'),
('데이터모델링', '데이터모델링'),
('데이터아키텍처', '데이터아키텍처'),
('동시성', '동시성'),
('디자인패턴', '디자인패턴'),
('디자인패턴(프론트)', '디자인패턴-프론트'),
('딥러닝', '딥러닝'),
('딥러닝 기초', '딥러닝-기초'),
('로깅', '로깅'),
('로깅/모니터링', '로깅-모니터링'),
('리액티브/AI', '리액티브-ai'),
('리팩토링', '리팩토링'),
('멀티에이전트', '멀티에이전트'),
('면접', '면접'),
('면접+CS기초', '면접-cs기초'),
('배치처리', '배치처리'),
('배포전략', '배포전략'),
('보안', '보안'),
('보안/암호', '보안-암호'),
('부하테스트', '부하테스트'),
('분산시스템', '분산시스템'),
('분산추적', '분산추적'),
('분산트랜잭션', '분산트랜잭션'),
('분산트랜잭션/SAGA', '분산트랜잭션-saga'),
('빌드시스템', '빌드시스템'),
('성능개선', '성능개선'),
('성능테스트', '성능테스트'),
('수학', '수학'),
('수학/AI', '수학-ai'),
('스프링입문', '스프링입문'),
('시스템설계', '시스템설계'),
('시스템설계/장애대응', '시스템설계-장애대응'),
('실무기본기', '실무기본기'),
('실무프로젝트', '실무프로젝트'),
('실시간통신', '실시간통신'),
('아키텍처', '아키텍처'),
('애니메이션', '애니메이션'),
('이력서', '이력서'),
('이력서/포트폴리오', '이력서-포트폴리오'),
('이력서작성', '이력서작성'),
('이벤트드리븐', '이벤트드리븐'),
('인증/인가/보안', '인증-인가-보안'),
('인코딩', '인코딩'),
('자료구조', '자료구조'),
('자료구조/OS/DB/네트워크', '자료구조-os-db-네트워크'),
('자료구조/알고리즘', '자료구조-알고리즘'),
('자바/JVM/GC/동시성', '자바-jvm-gc-동시성'),
('자바/OOP', '자바-oop'),
('추천시스템', '추천시스템'),
('캐시전략', '캐시전략'),
('컴구조', '컴구조'),
('컴구조/OS', '컴구조-os'),
('클린코드', '클린코드'),
('테스트(프론트)', '테스트-프론트'),
('테스트/TDD', '테스트-tdd'),
('통합실전', '통합실전'),
('포트폴리오', '포트폴리오'),
('포트폴리오+백엔드실무', '포트폴리오-백엔드실무'),
('풀스택부트캠프', '풀스택부트캠프'),
('프론트풀스택', '프론트풀스택'),
('함수형/JS', '함수형-js');

-- learning_resource 본체 214건
INSERT INTO `learning_resource`
  (`slug`, `title`, `resource_type`, `provider`, `url`, `instructor_or_author`, `duration_minutes`, `status`, `priority_tier`, `display_order`, `category_id`, `summary`, `detail_markdown`, `created_at`, `updated_at`)
VALUES
  ('10000장의-이력서를-본-기술이사의', '10000장의 이력서를 본 기술이사의 이력서 가이드', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/10000장의-이력서를-본-기술이사의', NULL, 454, 'OWNED', 'P0', 0, 2, '서류검토자 관점, 실제 이력서 첨삭 다수', NULL, NOW(6), NOW(6)),
  ('n000번-면접을-본-기술이사-면접-가이드', 'N,000번의 면접을 본 기술이사의 면접 가이드', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/n000번-면접을-본-기술이사-면접-가이드', NULL, 641, 'OWNED', 'P0', 0, 2, '면접관 관점, 실제 이력서로 모의면접', NULL, NOW(6), NOW(6)),
  ('백엔드-포트폴리오-실무이력강화-올인원-part1', '백엔드 포트폴리오와 실무 이력 강화 전략 올인원 PART1', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/백엔드-포트폴리오-실무이력강화-올인원-part1', NULL, 158, 'OWNED', 'P1', 1, 2, '결제 연동, 예외처리, 집계 성능최적화 실전 사례', NULL, NOW(6), NOW(6)),
  ('면접-신입-java-백앤드-개발자', '면접 전에 알고 가면 좋을 것들 - 신입 Java 백엔드 개발자편', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/면접-신입-java-백앤드-개발자', NULL, 305, 'OWNED', 'P1', 1, 2, 'URL 입력~응답 전체 흐름, WAS/JVM/DB/보안, 이력서 부록', NULL, NOW(6), NOW(6)),
  ('비전공자-개발자-이력서', '비전공자도 합격하는 개발자 이력서/포트폴리오 작성법', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/비전공자-개발자-이력서', NULL, 156, 'OWNED', 'P2', 2, 2, '기업이 원하는 개발자상, 이력서 첨삭 사례', NULL, NOW(6), NOW(6)),
  ('job-bomber-private-s', '[취업폭격기] 사기업 IT취업 치트키 : 서류·포트폴리오·커리어까지', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/job-bomber-private-s', NULL, 334, 'OWNED', 'P3', 3, 2, '강의소개→SECTION1 타겟팅&전략→SECTION2 서류&포트폴리오→SECTION3 히든카드&실전(인맥·면접)', NULL, NOW(6), NOW(6)),
  ('the-ultimate-guide-t', '개발자 기술면접 완벽 가이드 : 면접관 100회의 합격 프레임', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/the-ultimate-guide-t', NULL, 306, 'OWNED', 'P2', 2, 2, '기술면접의 본질과 합격 프레임→답변 퀄리티 기본기→전달력→실전 대응(면접 완전 해부)', NULL, NOW(6), NOW(6)),
  ('포트폴리오-어나더레벨', '포트폴리오 어나더레벨', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/포트폴리오-어나더레벨', NULL, 49, 'OWNED', 'P2', 2, 2, '면접관 시각의 포트폴리오→합격 공식→기술 근거→깃헙 활용→실전 작성+양식→Q&A(10개 강의)', NULL, NOW(6), NOW(6)),
  ('cs-interview-prepara', '채널톡 면접관이 알려주는 CS 면접 대비 - Java 편', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/cs-interview-prepara', NULL, 176, 'OWNED', 'P0', 0, 3, 'JVM·GC·동시성·OOP·람다/스트림, 브론즈~골드 답변 비교', NULL, NOW(6), NOW(6)),
  ('cs-interview-prepara-1', '채널톡 면접관이 알려주는 CS 면접 대비 - 데이터베이스 편', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/cs-interview-prepara-1', NULL, 174, 'OWNED', 'P0', 0, 3, '트랜잭션·락·인덱스·NoSQL vs RDBMS·커넥션풀', NULL, NOW(6), NOW(6)),
  ('개발자-전공면접-cs-완전정복', '기출로 대비하는 개발자 전공면접 [CS 완전정복]', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/개발자-전공면접-cs-완전정복', NULL, 369, 'OWNED', 'P0', 0, 3, '4대 CS 과목 총망라 + 기출 기반 모의면접', NULL, NOW(6), NOW(6)),
  ('http-웹-네트워크', '모든 개발자를 위한 HTTP 웹 기본 지식', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/http-웹-네트워크', NULL, 340, 'OWNED', 'P0', 0, 3, 'URI, HTTP 메서드/상태코드/헤더, 캐시 (김영한)', NULL, NOW(6), NOW(6)),
  ('네트워크-핵심이론-기초', '외워서 끝내는 네트워크 핵심이론 - 기초', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/네트워크-핵심이론-기초', NULL, 431, 'OWNED', 'P0', 0, 3, 'OSI 7계층, L2/L3/L4, 웹 핵심기술 압축 정리', NULL, NOW(6), NOW(6)),
  ('혼자-공부하는-컴퓨터구조-운영체제', '개발자를 위한 컴퓨터공학 1: 혼자 공부하는 컴퓨터구조 + 운영체제', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/혼자-공부하는-컴퓨터구조-운영체제', NULL, 823, 'OWNED', 'P0', 0, 3, 'CPU/메모리/캐시, 프로세스/스레드/스케줄링/동기화/가상메모리', NULL, NOW(6), NOW(6)),
  ('컴퓨터구조-비전공자-기술면접', '[CS 기술면접 1] 말이 트이는 컴퓨터 구조', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/컴퓨터구조-비전공자-기술면접', NULL, 169, 'OWNED', 'P1', 1, 3, '진법/부동소수점, CPU/메모리 구조 압축', NULL, NOW(6), NOW(6)),
  ('비전공자가-놓치기-쉬운-자료구조', '[CS 기술면접 5] 말이 트이는 자료구조', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/비전공자가-놓치기-쉬운-자료구조', NULL, 194, 'OWNED', 'P1', 1, 3, '배열/스택/큐/해시/그래프/트리/힙', NULL, NOW(6), NOW(6)),
  ('aws로-배우는-네트워크-이론부터-실', 'AWS로 배우는 네트워크: 이론부터 실무까지', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/aws로-배우는-네트워크-이론부터-실', NULL, 916, 'OWNED', 'P1', 1, 3, 'L2~L4, 네트워크 장치, NAT/부하분산, AWS 실무 연계', NULL, NOW(6), NOW(6)),
  ('개발자-컴퓨터공학-혼자공부하는-네트워크', '개발자를 위한 컴퓨터공학 2: 혼자 공부하는 네트워크', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/개발자-컴퓨터공학-혼자공부하는-네트워크', NULL, 779, 'OWNED', 'P1', 1, 3, '물리~응용 계층 원리, 실습 복습', NULL, NOW(6), NOW(6)),
  ('네트워크-핵심이론-응용', '외워서 끝내는 네트워크 핵심이론 - 응용', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/네트워크-핵심이론-응용', NULL, 239, 'OWNED', 'P1', 1, 3, '네트워크 장치 구조, NAT, 부하분산, VPN/보안', NULL, NOW(6), NOW(6)),
  ('자료구조-알고리즘-기본', '그림으로 쉽게 배우는 자료구조와 알고리즘 (기본편)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/자료구조-알고리즘-기본', NULL, 259, 'OWNED', 'P1', 1, 3, '배열/리스트/스택/큐/해시, 정렬/재귀/DP', NULL, NOW(6), NOW(6)),
  ('그림으로-쉽게-자료구조-알고리즘-심화', '그림으로 쉽게 배우는 자료구조와 알고리즘 (심화편)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/그림으로-쉽게-자료구조-알고리즘-심화', NULL, 561, 'OWNED', 'P1', 1, 3, '트리/BST/AVL/Red-Black/힙/그래프', NULL, NOW(6), NOW(6)),
  ('외워서-끝내는-암호기술', '외워서 끝내는 SSL과 최소한의 암호기술', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/외워서-끝내는-암호기술', NULL, 111, 'OWNED', 'P1', 1, 3, '대칭키/비대칭키/디지털서명/PKI', NULL, NOW(6), NOW(6)),
  ('웹-개발자-알아야-할-보안-기초', '웹 개발자라면 꼭 알아야 할 보안 기초', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/웹-개발자-알아야-할-보안-기초', NULL, 359, 'OWNED', 'P1', 1, 3, '웹 공격(SQLi/XSS/CSRF), 암호학, 시큐어코딩', NULL, NOW(6), NOW(6)),
  ('데이터베이스-비전공자-면접', '[CS 기술면접 4] 말이 트이는 데이터베이스', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/데이터베이스-비전공자-면접', NULL, 199, 'OWNED', 'P2', 2, 3, 'DB기초/SQL/정규화/트랜잭션/인덱스', NULL, NOW(6), NOW(6)),
  ('자바와-객체-지향-궁극의-면접-대비', '[CS 기술면접 6] 말이 트이는 자바와 객체지향', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/자바와-객체-지향-궁극의-면접-대비', NULL, 186, 'OWNED', 'P2', 2, 3, '객체지향 설계원칙, JVM/메모리, 동시성', NULL, NOW(6), NOW(6)),
  ('그림으로-쉽게-배우는-네트워크', '그림으로 쉽게 배우는 네트워크', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/그림으로-쉽게-배우는-네트워크', NULL, 312, 'OWNED', 'P2', 2, 3, 'OSI/TCP-IP, 라우팅(RIP/OSPF/BGP), NAT', NULL, NOW(6), NOW(6)),
  ('웹개발-핵심-http-완벽-마스터하기', '웹 개발의 핵심, HTTP 완벽 마스터하기!', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/웹개발-핵심-http-완벽-마스터하기', NULL, 555, 'OWNED', 'P2', 2, 3, 'HTTP 기본~보안~성능 6편', NULL, NOW(6), NOW(6)),
  ('얄코의-가장-쉬운-자료구조와-알고리즘', '가장 쉬운 자료구조와 알고리즘 - by 얄코', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/얄코의-가장-쉬운-자료구조와-알고리즘', NULL, 267, 'OWNED', 'P2', 2, 3, '배열/스택/큐/트리/정렬/해시/그래프', NULL, NOW(6), NOW(6)),
  ('만들면서-배우는-컴퓨터-구조', '만들면서 배우는 컴퓨터 구조', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/만들면서-배우는-컴퓨터-구조', NULL, 420, 'OWNED', 'P2', 2, 3, '불대수→ALU→메모리→제어장치까지 직접 CPU 제작', NULL, NOW(6), NOW(6)),
  ('비전공자-운영체제', '그림으로 쉽게 배우는 운영체제', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/비전공자-운영체제', NULL, 185, 'OWNED', 'P2', 2, 3, '프로세스/스케줄링/동기화/데드락/메모리/파일시스템', NULL, NOW(6), NOW(6)),
  ('모르면-야근하는-문자-인코딩-완전-정', '모르면 야근하는 문자 인코딩 완전 정복', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/모르면-야근하는-문자-인코딩-완전-정', NULL, 159, 'OWNED', 'P2', 2, 3, 'ASCII/유니코드/UTF-8/16/32, 한글 인코딩', NULL, NOW(6), NOW(6)),
  ('cs-기술면접-7-말이-트이는-자바스', '[CS 기술면접 7] 말이 트이는 자바스크립트', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/cs-기술면접-7-말이-트이는-자바스', NULL, 214, 'OWNED', 'P3', 3, 3, '스코프/클로저/비동기/프로토타입', NULL, NOW(6), NOW(6)),
  ('빠르게-알아보는-javascript-v8엔진', '빠르게 알아보는 Javascript V8엔진', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/빠르게-알아보는-javascript-v8엔진', NULL, 94, 'OWNED', 'P3', 3, 3, 'V8 컴파일 파이프라인, 히든클래스/인라인캐싱', NULL, NOW(6), NOW(6)),
  ('넓고얕게-컴공-전공자', '넓고 얕게 외워서 컴공 전공자 되기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/넓고얕게-컴공-전공자', NULL, 299, 'OWNED', 'P3', 3, 3, '진법/디지털회로/OS/자료구조 압축 요약', NULL, NOW(6), NOW(6)),
  ('개발자-개념-장착-프로그래밍-개발에', '개발자 개념 장착 - 프로그래밍 개발에 필요한 필수 개념과 핵심 이론정리', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/개발자-개념-장착-프로그래밍-개발에', NULL, NULL, 'OWNED', 'P3', 3, 3, '프로그래밍 일반→웹개발→데이터베이스→웹보안', NULL, NOW(6), NOW(6)),
  ('스프링부트로-대규모-시스템설계-게시판', '스프링부트로 직접 만들면서 배우는 대규모 시스템 설계 - 게시판', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/스프링부트로-대규모-시스템설계-게시판', NULL, 801, 'OWNED', 'P0', 0, 4, '분산RDB, Snowflake PK, 페이지네이션, 댓글/좋아요/조회수 설계', NULL, NOW(6), NOW(6)),
  ('스프링부트로-직접-만들면서-배우는-대', '스프링부트로 직접 만들면서 배우는 대규모 시스템 설계 - 캐시 전략', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/스프링부트로-직접-만들면서-배우는-대', NULL, 460, 'OWNED', 'P0', 0, 4, 'Cache Penetration/Stampede/Hot Key 실전 대응', NULL, NOW(6), NOW(6)),
  ('자바-스프링-주니어-개발자-오답노트', 'Java/Spring 주니어 개발자를 위한 오답노트', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/자바-스프링-주니어-개발자-오답노트', NULL, 248, 'OWNED', 'P0', 0, 4, '컨벤션, DI/DIP, Transaction script 안티패턴, 테스트', NULL, NOW(6), NOW(6)),
  ('가장-쉬운-동시성-문제-race-co', '가장 쉬운 동시성 문제 - Race Condition', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/가장-쉬운-동시성-문제-race-co', NULL, 234, 'OWNED', 'P0', 0, 4, 'synchronized/Lock/Atomic, DB 락, 분산환경 동시성', NULL, NOW(6), NOW(6)),
  ('제미니의-개발실무-커머스-백엔드-기본', '제미니의 개발실무 - 커머스 백엔드 기본편', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/제미니의-개발실무-커머스-백엔드-기본', NULL, 407, 'OWNED', 'P0', 0, 4, '상품/리뷰/쿠폰/장바구니/주문/결제/정산 도메인 구현', NULL, NOW(6), NOW(6)),
  ('견고한-결제-시스템-구축', '견고한 결제 시스템 구축', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/견고한-결제-시스템-구축', NULL, 428, 'OWNED', 'P0', 0, 4, 'Toss Payments 연동, 재시도/타임아웃, Wallet/Ledger', NULL, NOW(6), NOW(6)),
  ('장애를-허용하는-견고한-시스템-만들기', '장애를 허용하는 견고한 시스템 만들기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/장애를-허용하는-견고한-시스템-만들기', NULL, 525, 'OWNED', 'P0', 0, 4, '이중화, Circuit Breaker/Fallback/Rate Limit/Bulkhead', NULL, NOW(6), NOW(6)),
  ('스프링-시큐리티-완전정복', '스프링 시큐리티 완전 정복 [6.x 개정판]', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/스프링-시큐리티-완전정복', NULL, 2215, 'OWNED', 'P0', 0, 4, '인증/인가 아키텍처, 세션관리, 실전 프로젝트 3종', NULL, NOW(6), NOW(6)),
  ('파이썬-시작하는-grpc', '파이썬으로 쉽게 배우는 gRPC!', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/파이썬-시작하는-grpc', NULL, 212, 'OWNED', 'P1', 1, 4, 'Protocol Buffers, 4가지 통신패턴, 인터셉터/에러핸들링', NULL, NOW(6), NOW(6)),
  ('카카오-개발자와-함께하는-워크플로우', '카카오 면접관이 알려주는 워크플로우 기반의 대용량 트래픽 처리 기법', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/카카오-개발자와-함께하는-워크플로우', NULL, 291, 'OWNED', 'P1', 1, 4, 'Kafka+Debezium CDC, Temporal 워크플로우', NULL, NOW(6), NOW(6)),
  ('backend-멀티쓰레드-이해-통찰력-키우기', 'Backend 멀티쓰레드 이해하고 통찰력 키우기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/backend-멀티쓰레드-이해-통찰력-키우기', NULL, 208, 'OWNED', 'P1', 1, 4, 'Producer-Consumer/Read-Write Lock/Future/DeadLock 패턴', NULL, NOW(6), NOW(6)),
  ('분산데이터-모델링-설계전략', '분산 데이터 모델링', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/분산데이터-모델링-설계전략', NULL, 60, 'OWNED', 'P1', 1, 4, '게시판형 서비스 모델링, 경계 나누기', NULL, NOW(6), NOW(6)),
  ('카카오-개발자면접관가-알려주는-반드시', '카카오 면접관이 알려주는 반드시 알아야하는 Distributed Environment', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/카카오-개발자면접관가-알려주는-반드시', NULL, 387, 'OWNED', 'P1', 1, 4, '모놀리식→MSA 마이그레이션, 클린/헥사고날 아키텍처', NULL, NOW(6), NOW(6)),
  ('프로덕션-레벨-실시간-채팅-서버-구축', '실시간 채팅 서버 구축: 분산 처리부터 성능 최적화까지', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/프로덕션-레벨-실시간-채팅-서버-구축', NULL, 295, 'OWNED', 'P1', 1, 4, 'Redis Pub/Sub 분산 메시징, WebSocket, DDD 모듈분리', NULL, NOW(6), NOW(6)),
  ('죽음의-spring-batch', '죽음의 Spring Batch: 새벽 3시의 처절한 공포는 이제 끝이다', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/죽음의-spring-batch', NULL, NULL, 'OWNED', 'P1', 1, 4, '배치 기초→파일처리→DB→Step→실전 마스터', NULL, NOW(6), NOW(6)),
  ('graphql-for-document', '카카오 면접관이 알려주는 문서기반의 프레임워크 통신 패턴을 위한 GraphQL', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/graphql-for-document', NULL, 238, 'OWNED', 'P2', 2, 4, 'GraphQL 타입시스템, Apollo, Prisma CRUD', NULL, NOW(6), NOW(6)),
  ('미국-빅테크-시스템-디자인설계', 'AI 시대에도 살아남는 엔지니어의 조건... (빅테크 시스템디자인/알고리즘/OSS)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/미국-빅테크-시스템-디자인설계', NULL, 1743, 'OWNED', 'P2', 2, 4, '빅테크 시스템디자인, OOD, OSS 기여, 기술인터뷰', NULL, NOW(6), NOW(6)),
  ('spring-webflux-llm실전구현', 'Spring WebFlux + LLM 실전 구현', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/spring-webflux-llm실전구현', NULL, 370, 'OWNED', 'P2', 2, 4, 'WebFlux 구현, LLM 연동 심화', NULL, NOW(6), NOW(6)),
  ('대용량-채팅-서버-처리-웹소켓-통신', '대용량 채팅 TPS 처리를 위한 웹소켓 통신 만들며 학습하기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/대용량-채팅-서버-처리-웹소켓-통신', NULL, 109, 'OWNED', 'P2', 2, 4, '채팅서버 미들웨어/채널/이벤트, React+Node 가이드', NULL, NOW(6), NOW(6)),
  ('대용량-채팅-서버-처리-웹소켓-통신-2', '대용랑 채팅 TPS에 대한 stateful 서비스 구축하기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/대용량-채팅-서버-처리-웹소켓-통신-2', NULL, 226, 'OWNED', 'P2', 2, 4, '3-Tier, Kafka 연동, Controller Tower', NULL, NOW(6), NOW(6)),
  ('prisma-postgresql', 'Node.js의 모든 것', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/prisma-postgresql', NULL, 753, 'OWNED', 'P2', 2, 4, '이벤트루프, 멀티스레딩, Express, Prisma', NULL, NOW(6), NOW(6)),
  ('차세대-노드-백엔드-서버-개발', '차세대 Node.js 백엔드 서버 개발(Fastify & Prisma & TypeScript)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/차세대-노드-백엔드-서버-개발', NULL, 319, 'OWNED', 'P2', 2, 4, 'Fastify+Prisma REST API, 인증/게시글', NULL, NOW(6), NOW(6)),
  ('얄코-node-js', '가장 쉬운 Node.js - by 얄코', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/얄코-node-js', NULL, 285, 'OWNED', 'P2', 2, 4, '파일시스템/TCP-UDP/HTTP/스트림/이벤트루프', NULL, NOW(6), NOW(6)),
  ('the-era-of-ai-shortc', '"AI 딸깍의 시대" Node.js와 CS Part1 - V8과 코어 해체기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/the-era-of-ai-shortc', NULL, 425, 'OWNED', 'P2', 2, 4, '런타임/모듈시스템/NPM/EventEmitter/Buffer', NULL, NOW(6), NOW(6)),
  ('the-era-of-ai-clicki', '"AI 딸깍의 시대" Node.js와 CS Part 2 - 스트림 아키텍처와 하드웨어 통제기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/the-era-of-ai-clicki', NULL, 308, 'OWNED', 'P2', 2, 4, '스트림의 탄생→파이프라인 4가지 지휘봉→Writable Stream→Readable Stream→파이프라인 자동화→Custom Stream', NULL, NOW(6), NOW(6)),
  ('the-era-of-ai-clicks', '"AI 딸깍의 시대" Node.js와 CS Part 3: TCP/UDP 소켓과 네트워크 코어', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/the-era-of-ai-clicks', NULL, 369, 'OWNED', 'P2', 2, 4, '네트워크 인프라 계층→TCP 서버 엔진→소켓 통신/데이터 파싱→UDP 극한 통신→Backpressure 제어', NULL, NOW(6), NOW(6)),
  ('nodejs-and-cs-part-4', '"AI 딸깍의 시대" Node.js와 CS Part 4 - HTTP 심연과 커스텀 프레임워크', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/nodejs-and-cs-part-4', NULL, 432, 'OWNED', 'P2', 2, 4, 'HTTP 세계→메시지 해부학→듀플렉스 스트림→프레임워크 추적→순수 웹서버 구축→독자 프레임워크(라우터/미들웨어)→인증 아키텍처', NULL, NOW(6), NOW(6)),
  ('expressjs-엔진-클론으로-배우', '제대로 배우는 Express.js: Part2 엔진 내부 동작 원리와 클론 프로젝트', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/expressjs-엔진-클론으로-배우', NULL, 330, 'OWNED', 'P2', 2, 4, 'Express 클론 엔진(MyExpress) 직접 구현', NULL, NOW(6), NOW(6)),
  ('fastapi-완벽-가이드', 'FastAPI 완벽 가이드', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/fastapi-완벽-가이드', NULL, 1508, 'OWNED', 'P2', 2, 4, 'Request/Response, Pydantic, SQLAlchemy, 비동기', NULL, NOW(6), NOW(6)),
  ('파이썬-동시성-프로그래밍', '파이썬 동시성 프로그래밍 (feat. FastAPI, async, await)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/파이썬-동시성-프로그래밍', NULL, 340, 'OWNED', 'P2', 2, 4, '코루틴, 멀티스레딩/프로세싱, 크롤링+FastAPI 실전', NULL, NOW(6), NOW(6)),
  ('부트캠프-백엔드-고농축-코스', '[코드캠프] 부트캠프에서 만든 고농축 백엔드 코스', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/부트캠프-백엔드-고농축-코스', NULL, 6418, 'OWNED', 'P3', 3, 4, 'Node/Nest.js/DB/MSA/배포/K8s 총망라', NULL, NOW(6), NOW(6)),
  ('그린코딩-스프링-풀스택-웹개발', '이거 하나로 종결 - 32시간 고품질 스프링 풀스택 웹 개발', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/그린코딩-스프링-풀스택-웹개발', NULL, 1920, 'OWNED', 'P3', 3, 4, 'Java/Spring/JSP/MySQL 입문 종합', NULL, NOW(6), NOW(6)),
  ('주문시스템으로-알아보는-분산트랜잭션', '주문시스템으로 알아보는 분산트랜잭션', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/주문시스템으로-알아보는-분산트랜잭션', NULL, 337, 'OWNED', 'P1', 1, 4, 'Monolithic 구현→MSA 전환→2PC→TCC→SAGA(Orchestration)→SAGA(Choreography)', NULL, NOW(6), NOW(6)),
  ('complete-in-3-hours', '3시간 완성! Go언어로 시작하는 실전 API서버 개발', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/complete-in-3-hours', NULL, 197, 'OWNED', 'P3', 3, 4, 'Go 핵심문법 압축→HTTP 이해→Go 웹패키지→실전 API서버 구현', NULL, NOW(6), NOW(6)),
  ('제미니의-개발실무-백엔드레거시-ai활용', '제미니의 개발실무 - 커머스 백엔드 레거시와 AI 활용편', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/제미니의-개발실무-백엔드레거시-ai활용', NULL, 547, 'OWNED', 'P1', 1, 4, '입사 첫날→상품목록/상세→리뷰→찜하기→쿠폰→장바구니→주문→결제→취소→정산', NULL, NOW(6), NOW(6)),
  ('vanilla-javascript로', 'Vanilla JavaScript로 직접 구현하는 Notion', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/vanilla-javascript로', NULL, 289, 'OWNED', 'P3', 3, 4, 'Mini Notion Part1~10: 프로젝트 시작→문서관리→편집기→고도화→휴지통→검색모달→설정→단축키→사이드바→총정리', NULL, NOW(6), NOW(6)),
  ('real-mysql-part-1', 'Real MySQL 시즌 1 - Part 1', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/real-mysql-part-1', NULL, 209, 'OWNED', 'P0', 0, 5, '페이징/함수기반 인덱스/Lateral/락 튜닝 실전', NULL, NOW(6), NOW(6)),
  ('real-mysql-part-2', 'Real MySQL 시즌 1 - Part 2', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/real-mysql-part-2', NULL, 239, 'OWNED', 'P0', 0, 5, '콜레이션/UUID/데드락/파티셔닝/커넥션 관리', NULL, NOW(6), NOW(6)),
  ('수억개의-데이터를-다루는-카카오-면접', '10,000++억의 데이터를 다루는 카카오 면접관의 MySQL', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/수억개의-데이터를-다루는-카카오-면접', NULL, 696, 'OWNED', 'P0', 0, 5, 'JOIN, SQL 안티패턴, 데이터 모델링 기법', NULL, NOW(6), NOW(6)),
  ('비전공자-mysql-성능최정확-sql튜닝', '비전공자도 이해할 수 있는 MySQL 성능 최적화 입문/실전 (SQL 튜닝편)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/비전공자-mysql-성능최정확-sql튜닝', NULL, 162, 'OWNED', 'P0', 0, 5, '인덱스, EXPLAIN 실행계획, SQL 튜닝 실습', NULL, NOW(6), NOW(6)),
  ('실전-데이터베이스-완전정복-설계편', '실전! 데이터베이스 완전정복 [설계편]', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/실전-데이터베이스-완전정복-설계편', NULL, 424, 'OWNED', 'P0', 0, 5, '데이터베이스 설계 이해→설계 기본→다양한 관계 표현→실전 설계 전략→테이블 설계 실습(신동현 강사, 58강)', NULL, NOW(6), NOW(6)),
  ('postgresql-from-a-si', '2,000++억건 데이터를 다루는 실리콘 밸리 AI 개발자의 PostgreSQL', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/postgresql-from-a-si', NULL, 566, 'OWNED', 'P1', 1, 5, '조인 설계, 인덱스/성능 최적화, 트랜잭션/동시성', NULL, NOW(6), NOW(6)),
  ('배달앱은-어떻게-내-주변의-맛집을-찾을까', '배달앱은 어떻게 내 주변의 맛집을 찾을까?', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/배달앱은-어떻게-내-주변의-맛집을-찾을까', NULL, 389, 'OWNED', 'P1', 1, 5, 'geospatial query, 인덱스 최적화, 부하테스트', NULL, NOW(6), NOW(6)),
  ('실무자도-모르는-mongo-활용법', 'MongoDB를 활용하여, 200억건 이상의 데이터 파이프라인 작성법', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/실무자도-모르는-mongo-활용법', NULL, 219, 'OWNED', 'P1', 1, 5, 'Atlas, 대용량 쿼리/트러블슈팅, AtlasSearch', NULL, NOW(6), NOW(6)),
  ('실리콘밸리-엔지니어와-함께하는-sql', '실리콘밸리 엔지니어와 함께하는 SQL', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/실리콘밸리-엔지니어와-함께하는-sql', NULL, 185, 'OWNED', 'P1', 1, 5, 'SELECT/JOIN/서브쿼리/윈도우함수', NULL, NOW(6), NOW(6)),
  ('cassandra-supporting', 'Discord와 Netflix를 떠받치는 10,000 TPS 보장하는 Cassandra', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/cassandra-supporting', NULL, 473, 'OWNED', 'P2', 2, 5, 'CQL, 분산 클러스터, 일관성 레벨/CAP', NULL, NOW(6), NOW(6)),
  ('mysql-성능-최적화', 'MySQL 성능 최적화', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/mysql-성능-최적화', NULL, 85, 'OWNED', 'P2', 2, 5, '인덱스/락/버퍼풀 최적화 팁', NULL, NOW(6), NOW(6)),
  ('데이터-mysql-마이그레이션', '200억건의 데이터를 MySQL로 마이그레이션 할 때 고려했던 개념과 튜닝 방법', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/데이터-mysql-마이그레이션', NULL, 126, 'OWNED', 'P2', 2, 5, '인덱스/락/AUTO_INCREMENT 튜닝 사례', NULL, NOW(6), NOW(6)),
  ('슬기로운-데이터엔지니어-생활', '모르면 승진 안되는 데이터 아키텍처의 정석', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/슬기로운-데이터엔지니어-생활', NULL, 486, 'OWNED', 'P2', 2, 5, '데이터 시스템 설계 기초→변환과 복제→트랜잭션/일관성→분산 시스템→배치/스트리밍→디자인 데이터 시스템(DDIA 기반 추정)', NULL, NOW(6), NOW(6)),
  ('비전공자-쿠버네티스-입문-실전', '비전공자도 이해할 수 있는 쿠버네티스 입문/실전', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/비전공자-쿠버네티스-입문-실전', NULL, 286, 'OWNED', 'P0', 0, 6, 'Pod/Deployment/Service/ConfigMap, EKS 배포 실습', NULL, NOW(6), NOW(6)),
  ('비전공자-ci-cd-입문-실전', '비전공자도 이해할 수 있는 CI/CD 입문·실전', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/비전공자-ci-cd-입문-실전', NULL, 448, 'OWNED', 'P0', 0, 6, 'GitHub Actions, Spring Boot+Docker CI/CD', NULL, NOW(6), NOW(6)),
  ('실전-github-actions-ci-cd-시작하기', '실전! GitHub Actions으로 CI/CD 시작하기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/실전-github-actions-ci-cd-시작하기', NULL, 515, 'OWNED', 'P0', 0, 6, '이벤트, 워크플로우, 시나리오 기반 CI/CD 구축', NULL, NOW(6), NOW(6)),
  ('비전공자도-이해-nginx-입문-실전', '비전공자도 이해할 수 있는 Nginx 입문/실전', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/비전공자도-이해-nginx-입문-실전', NULL, 165, 'OWNED', 'P0', 0, 6, '설치, 리버스 프록시, HTTPS, 로드밸런싱', NULL, NOW(6), NOW(6)),
  ('쿠버네티스-어나더-클래스-지상편-sprint1', '쿠버네티스 어나더 클래스-Sprint 1, 2', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/쿠버네티스-어나더-클래스-지상편-sprint1', NULL, 669, 'OWNED', 'P1', 1, 6, 'Pod/Probe/HPA, Jenkins Pipeline, Helm/ArgoCD', NULL, NOW(6), NOW(6)),
  ('쿠버네티스-어나더-클래스-지상편-sprint3', '쿠버네티스 어나더 클래스-Sprint3', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/쿠버네티스-어나더-클래스-지상편-sprint3', NULL, 433, 'OWNED', 'P1', 1, 6, 'Pod/Service/Ingress/Nginx/Volume 심화', NULL, NOW(6), NOW(6)),
  ('쿠버네티스-어나더-클래스-해수편-sprint4', '쿠버네티스 어나더 클래스-Sprint4', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/쿠버네티스-어나더-클래스-해수편-sprint4', NULL, 503, 'OWNED', 'P1', 1, 6, 'K8s 업그레이드, Prometheus/Grafana/Loki', NULL, NOW(6), NOW(6)),
  ('amazon-eks-기본-강의', 'CloudNet@ - Amazon EKS 기본 강의', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/amazon-eks-기본-강의', NULL, 762, 'OWNED', 'P1', 1, 6, 'VPC CNI, LB Controller, 오토스케일링(HPA/Karpenter)', NULL, NOW(6), NOW(6)),
  ('cloudneta-aws-네트워킹-입문', 'CloudNet@ - AWS 네트워킹 입문', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/cloudneta-aws-네트워킹-입문', NULL, 516, 'OWNED', 'P1', 1, 6, 'VPC, 서브넷, 보안그룹/NACL, ALB/NLB, Route53', NULL, NOW(6), NOW(6)),
  ('aws-중상급자', 'AWS(Amazon Web Service) 중/상급자를 위한 강의', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/aws-중상급자', NULL, 528, 'OWNED', 'P1', 1, 6, 'Advanced IAM/S3/DynamoDB, Serverless, CI/CD, ECS', NULL, NOW(6), NOW(6)),
  ('실무에서-사용중인-aws클라우드-iam-part1', '실무에서 사용중인 AWS 클라우드 IAM 이해와 보안', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/실무에서-사용중인-aws클라우드-iam-part1', NULL, 465, 'OWNED', 'P1', 1, 6, 'IMDS, IRSA, EKS Pod Identity, IAM 취약점', NULL, NOW(6), NOW(6)),
  ('introduction-to-cicd', 'Jenkins를 활용한 CI/CD 입문 (with. AWS)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/introduction-to-cicd', NULL, 336, 'OWNED', 'P1', 1, 6, 'Jenkins Pipeline, S3/ECS 연동 CD', NULL, NOW(6), NOW(6)),
  ('쉽게-설명하는-aws-기초', '쉽게 설명하는 AWS 기초 강의', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/쉽게-설명하는-aws-기초', NULL, 2607, 'OWNED', 'P1', 1, 6, 'EC2/VPC/S3/RDS, 실전 아키텍처, CI/CD', NULL, NOW(6), NOW(6)),
  ('카카오팀장-리눅스-실무', '@시코 - 리눅스(Linux) 실무 입문', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/카카오팀장-리눅스-실무', NULL, 283, 'OWNED', 'P1', 1, 6, 'Vi/Vim, Shell Script, Cron, Docker 리눅스 팁', NULL, NOW(6), NOW(6)),
  ('리눅스-성능-분석-시작하기', '리눅스 성능 분석 시작하기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/리눅스-성능-분석-시작하기', NULL, 189, 'OWNED', 'P1', 1, 6, 'uptime/dmesg/free/top/netstat/tcpdump 트러블슈팅', NULL, NOW(6), NOW(6)),
  ('리눅스-필수-유틸리티-4종', '리눅스 필수 유틸리티 4종 마스터 - awk, sed, grep, find', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/리눅스-필수-유틸리티-4종', NULL, 846, 'OWNED', 'P1', 1, 6, 'grep/find/sed/awk 심화', NULL, NOW(6), NOW(6)),
  ('amazon-eks-확장판', 'CloudNet@ - Amazon EKS 확장판 강의', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/amazon-eks-확장판', NULL, 846, 'OWNED', 'P2', 2, 6, 'Terraform, Fargate, S3 CSI, FinOps, CI/CD', NULL, NOW(6), NOW(6)),
  ('cloudnet-aws-securit', 'CloudNet@ - AWS 보안 가이드 Part 1', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/cloudnet-aws-securit', NULL, 612, 'OWNED', 'P2', 2, 6, 'IAM, VPC/S3 보안 구성', NULL, NOW(6), NOW(6)),
  ('스타트업-with-aws-1', 'AWS 전 직원이 알려주는 AWS 아키텍처', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/스타트업-with-aws-1', NULL, 738, 'OWNED', 'P2', 2, 6, 'EC2/로드밸런서/RDS/VPC/IAM 등 종합', NULL, NOW(6), NOW(6)),
  ('애플리케이션-배포-자동화-ci-cd', '애플리케이션 배포 자동화와 CI/CD', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/애플리케이션-배포-자동화-ci-cd', NULL, 176, 'OWNED', 'P2', 2, 6, 'Jenkins 배포자동화, 무중단 배포', NULL, NOW(6), NOW(6)),
  ('certified-kubernetes', 'Certified Kubernetes Administrator (CKA) – Practical Exam Guide', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/certified-kubernetes', NULL, 196, 'OWNED', 'P2', 2, 6, 'Workloads/Storage/Networking/Troubleshooting', NULL, NOW(6), NOW(6)),
  ('비전공자도-이해할-수-있는-리눅스-입', '비전공자도 이해할 수 있는 리눅스 입문/실전', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/비전공자도-이해할-수-있는-리눅스-입', NULL, 349, 'OWNED', 'P1', 1, 6, '오리엔테이션→기본개념/환경구축→기본명령어→파일작성조회→권한→패키지매니저→표준출력→백엔드운영명령어→쉘스크립트', NULL, NOW(6), NOW(6)),
  ('learning-rust-proper', '고급 쿠버네티스 - 보안 및 대규모 배포', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/learning-rust-proper', NULL, 853, 'OWNED', 'P2', 2, 6, 'K8s 리소스관리→스토리지/영속성→구성/시크릿→MongoDB 배포 프로젝트→보안 기초→Kustomize→GKE 배포 프로젝트', NULL, NOW(6), NOW(6)),
  ('kubernetes-for-toss', '금융 인프라를 운영하는 Toss 개발자의 Kubernetes', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/kubernetes-for-toss', NULL, 464, 'OWNED', 'P2', 2, 6, 'K8s 개요/Docker 호환성→핵심 지식→서비스관리 패턴→고급 패턴/배포자동화→Istio 확장 패턴', NULL, NOW(6), NOW(6)),
  ('docker-for-toss-deve', '금융 인프라를 운영하는 Toss 개발자의 Docker', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/docker-for-toss-deve', NULL, 362, 'OWNED', 'P2', 2, 6, 'Docker 소개/환경설정→이미지·컨테이너 기본→최적화 패턴→네트워크/Compose→실무 프로젝트 관리', NULL, NOW(6), NOW(6)),
  ('eks-데브옵스전반', 'eks를 활용한 spring 운영서버 배포(feat. devops의 모든것)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/eks-데브옵스전반', NULL, 992, 'OWNED', 'P2', 2, 6, 'Spring 빌드/Docker 기초→K8s 개요→AWS 핵심요소→K8s 환경세팅→K8s 주요요소 실습→EKS Spring 배포→오토스케일/ArgoCD/모니터링→EKS MSA 배포', NULL, NOW(6), NOW(6)),
  ('aws-eks-gitlab-ci-cd-j', '99% J형 엔지니어와 함께하는 AWS EKS와 GitLab CI/CD 기초 완벽 정복', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/aws-eks-gitlab-ci-cd-j', NULL, 260, 'OWNED', 'P2', 2, 6, '실습환경구성→VPC구성→EKS클러스터 구성/설정→GitLab CI/CD 설정/파이프라인→NestJS 배포→보안강화 main배포→로그/모니터링 알림', NULL, NOW(6), NOW(6)),
  ('안정적인-서비스-배포-팁', '안정적인 서비스 배포를 위한 배포 전략과 팁', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/안정적인-서비스-배포-팁', NULL, 107, 'OWNED', 'P1', 1, 6, '롤링/블루그린/카나리 배포, 슬랙 배포 알람봇', NULL, NOW(6), NOW(6)),
  ('테라폼-개요-기본문법', '테라폼 입문자를 위한 실무용 기본 문법 입문 과정!', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/테라폼-개요-기본문법', NULL, 398, 'OWNED', 'P2', 2, 6, 'AWS와 Terraform→HCL(HashiCorp Configuration Language)→HCL 연습문제', NULL, NOW(6), NOW(6)),
  ('중급-테라폼-aws-기본', 'AWS Infrastructure as Code를 위한 실전 Terraform 활용!', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/중급-테라폼-aws-기본', NULL, 1263, 'OWNED', 'P2', 2, 6, 'AWS 환경구성→프로바이더/EC2→서버리스→로드밸런서/AutoScaling→RDS/DynamoDB→워드프레스 배포 프로젝트→시각화도구→IAM→시크릿관리→Config/CloudTrail', NULL, NOW(6), NOW(6)),
  ('nginx-used-to-proces', '네이버 면접관이 알려주는 1,000,000++ TPS를 위한 NGINX', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/nginx-used-to-proces', NULL, 289, 'OWNED', 'P1', 1, 6, '레거시 vs NGINX 비교→기본 사용법→Edge Case 패턴→Reverse Proxy 관점', NULL, NOW(6), NOW(6)),
  ('2026-a-practical-gui', '2026년! 백엔드 개발자를 위한 Redis 실전 가이드', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/2026-a-practical-gui', NULL, 709, 'OWNED', 'P0', 0, 7, '자료형, 실무 패턴(FastAPI 연계), 운영/장애대응', NULL, NOW(6), NOW(6)),
  ('practical-kafka-gett-1', '핵심만 빠르게 끝내는 실전 카프카(kafka)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/practical-kafka-gett-1', NULL, 183, 'OWNED', 'P0', 0, 7, '아키텍처, SpringBoot 실습(프로듀서/컨슈머/오프셋)', NULL, NOW(6), NOW(6)),
  ('아파치-카프카-애플리케이션-프로그래밍', '[아파치 카프카 애플리케이션 프로그래밍]', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/아파치-카프카-애플리케이션-프로그래밍', NULL, 793, 'OWNED', 'P0', 0, 7, '프로듀서/컨슈머/커넥트/스트림즈, CCDAK 대비', NULL, NOW(6), NOW(6)),
  ('설-특집-초당-500000건-트래픽을', '초당 500,000+건 트래픽을 처리하는 카카오 면접관의 Redis', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/설-특집-초당-500000건-트래픽을', NULL, 441, 'OWNED', 'P1', 1, 7, '자료구조, Memory Persistence, 운영 노하우', NULL, NOW(6), NOW(6)),
  ('rabbitmq-비동기-아키텍처-한방에', 'RabbitMQ를 이용한 비동기 아키텍처 한방에 해결하기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/rabbitmq-비동기-아키텍처-한방에', NULL, 304, 'OWNED', 'P1', 1, 7, 'WorkQueue/Pub-Sub/Exchange, DLQ, TCC 패턴', NULL, NOW(6), NOW(6)),
  ('고성능-실시간-분산시스템', '고성능 실시간 분산 시스템 RabbitMQ + Kafka + Redis 실전 프로젝트', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/고성능-실시간-분산시스템', NULL, 147, 'OWNED', 'P1', 1, 7, 'RabbitMQ/Kafka/Redis 통합 파이프라인 실습', NULL, NOW(6), NOW(6)),
  ('실전-redis-활용', '실전! Redis 활용', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/실전-redis-활용', NULL, 101, 'OWNED', 'P2', 2, 7, '기본 자료형, rate limiter/세션관리 응용', NULL, NOW(6), NOW(6)),
  ('redis-야무지게-사용하는-방법-이론편', '[개념 & 이론] 대기업 근무하며 경험한 Redis를 야무지게 사용하기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/redis-야무지게-사용하는-방법-이론편', NULL, 113, 'OWNED', 'P2', 2, 7, '자료구조, 캐싱전략, Redis 아키텍처', NULL, NOW(6), NOW(6)),
  ('redis-야무지게-사용하는법-실습편', '[실습] 대기업 근무하며 경험한 Redis를 야무지게 사용하기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/redis-야무지게-사용하는법-실습편', NULL, 165, 'OWNED', 'P2', 2, 7, 'Redis 실습(Spring Boot), 분산락/Lua Script', NULL, NOW(6), NOW(6)),
  ('네이버-개발자가-알려주는-nats로', '네이버 면접관이 사용하는 초저지연 및 메시징 분산 시스템 NATS', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/네이버-개발자가-알려주는-nats로', NULL, 335, 'OWNED', 'P2', 2, 7, 'Core NATS/JetStream, Pub-Sub, KV-Bucket', NULL, NOW(6), NOW(6)),
  ('네이버-개발자가-알려주는-statef', '네이버 면접관이 사용하는 실시간 초저지연 Platform Apache Flink', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/네이버-개발자가-알려주는-statef', NULL, 405, 'OWNED', 'P2', 2, 7, 'Flink 소개/아키텍처→스트림처리 핵심개념→DataStream API/Window→상태관리→실습 예제', NULL, NOW(6), NOW(6)),
  ('비전공자도-이해할-수-있는-msa-입', '비전공자도 이해할 수 있는 MSA 입문/실전 (feat. Spring Boot)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/비전공자도-이해할-수-있는-msa-입', NULL, 345, 'OWNED', 'P0', 0, 8, '마이크로서비스 구축, API Gateway, JWT 인증', NULL, NOW(6), NOW(6)),
  ('카카오-면접관개발자이-알려주는-msa', '카카오 면접관이 알려주는 MSA 관점에서의 분산 트랜잭션 패턴', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/카카오-면접관개발자이-알려주는-msa', NULL, 302, 'OWNED', 'P0', 0, 8, 'SAGA(Choreography/Orchestration) 실습', NULL, NOW(6), NOW(6)),
  ('spring-cloud-기초-msa', '빠르게 배우는 Spring Cloud 기초(MSA)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/spring-cloud-기초-msa', NULL, 528, 'OWNED', 'P1', 1, 8, '동기/비동기 통신, Config Server, Circuit Breaker', NULL, NOW(6), NOW(6)),
  ('마이크로서비스-디자인패턴-msa', '마이크로서비스 디자인 패턴 완벽 가이드', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/마이크로서비스-디자인패턴-msa', NULL, 1598, 'OWNED', 'P1', 1, 8, 'Decomposition/CQRS/Saga/Resilience 패턴 총망라', NULL, NOW(6), NOW(6)),
  ('카카오-토스-개발자가-알려주는-수백개', '카카오, 토스 개발자가 알려주는 수백개의 MSA 환경에서의 성능 보장을 위한 RPC 처리 기법', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/카카오-토스-개발자가-알려주는-수백개', NULL, 267, 'OWNED', 'P2', 2, 8, '언어별 차이→분산시스템 발전과 한계→Protocol Buffers→gRPC 통신기법→최적화 기법→gRPC 실습', NULL, NOW(6), NOW(6)),
  ('spring-ai-in-practic', '실무에 바로 적용하는 Spring AI: Spring 서비스에 챗봇·RAG·MCP 도입하기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/spring-ai-in-practic', NULL, 438, 'OWNED', 'P0', 0, 9, 'Spring AI 기본기, RAG 챗봇, MCP 연동', NULL, NOW(6), NOW(6)),
  ('ai에이전트-구현-rag시스템-랭그래프', 'AI 에이전트로 구현하는 RAG 시스템(w. LangGraph)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/ai에이전트-구현-rag시스템-랭그래프', NULL, 405, 'OWNED', 'P1', 1, 9, 'LangChain Tool Calling, LangGraph ReAct, 법률 RAG 프로젝트', NULL, NOW(6), NOW(6)),
  ('랭체인으로-만드는-rag-활용-평가', 'RAG 마스터: 기초부터 고급기법까지 (feat. LangChain)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/랭체인으로-만드는-rag-활용-평가', NULL, 522, 'OWNED', 'P1', 1, 9, '임베딩, 벡터저장소(Chroma/FAISS), 검색 성능 평가', NULL, NOW(6), NOW(6)),
  ('입문자를위한-랭체인-기초', '입문자를 위한 LangChain 기초 — v1.0+ 업데이트', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/입문자를위한-랭체인-기초', NULL, 63, 'OWNED', 'P1', 1, 9, 'LCEL, Tool Calling, Agents, RAG 파이프라인', NULL, NOW(6), NOW(6)),
  ('everything-about-ai', '챗봇을 만들며 배우는 ai agent 개발의 모든것', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/everything-about-ai', NULL, 506, 'OWNED', 'P1', 1, 9, 'FastAPI+OpenAI, RAG+LangChain, sLLM 파인튜닝', NULL, NOW(6), NOW(6)),
  ('회사에서-바로쓰는-업무자동화-ai에이전트', '회사에서 바로 쓰는 업무자동화 AI 에이전트 (w. n8n, LangGraph)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/회사에서-바로쓰는-업무자동화-ai에이전트', NULL, 356, 'OWNED', 'P1', 1, 9, '이메일/QnA봇/코드리뷰 자동화 워크플로우', NULL, NOW(6), NOW(6)),
  ('딥러닝-이론-파이토치-실무-정복', '딥러닝 이론 + PyTorch 실무 완전 정복', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/딥러닝-이론-파이토치-실무-정복', NULL, 828, 'OWNED', 'P2', 2, 9, '손실함수/역전파/최적화/CNN/RNN/Transformer', NULL, NOW(6), NOW(6)),
  ('understanding-llm-ar', 'AI 입문을 위한 LLM 아키텍처 이해와 GPU 활용전략', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/understanding-llm-ar', NULL, 867, 'OWNED', 'P2', 2, 9, '트랜스포머/vLLM 서빙/Multi-GPU', NULL, NOW(6), NOW(6)),
  ('안정적인-ai에이전트-평가', '안정적인 AI 에이전트 서비스 운영을 위한 평가(Evaluation) 방법', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/안정적인-ai에이전트-평가', NULL, 196, 'OWNED', 'P2', 2, 9, 'Golden Dataset, LangSmith 기반 평가 설계', NULL, NOW(6), NOW(6)),
  ('한-번에-끝내는-ai-에이전트-개발', '한 번에 끝내는 AI 에이전트 개발 올인원 (w. LangGraph, Google ADK, CrewAI)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/한-번에-끝내는-ai-에이전트-개발', NULL, 639, 'OWNED', 'P2', 2, 9, '7개 실전 에이전트 프로젝트', NULL, NOW(6), NOW(6)),
  ('multi-agents-with-sw', 'Multi Agents with Swarm, LangGraph, Deep Agent', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/multi-agents-with-sw', NULL, 434, 'OWNED', 'P2', 2, 9, 'Swarm/LangGraph/Deep Agents 오케스트레이션', NULL, NOW(6), NOW(6)),
  ('한시간-끝내는-랭체인-기본', '한시간으로 끝내는 LangChain 기본기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/한시간-끝내는-랭체인-기본', NULL, 61, 'OWNED', 'P2', 2, 9, 'LLM 답변생성, LCEL 체인', NULL, NOW(6), NOW(6)),
  ('ai-논문구현-pytorch', '[AI 실무] AI Research Engineer를 위한 논문 구현 시작하기 with PyTorch', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/ai-논문구현-pytorch', NULL, 184, 'OWNED', 'P3', 3, 9, 'Neural Style Transfer 논문 구현', NULL, NOW(6), NOW(6)),
  ('딥러닝-cnn-완벽가이드-파이토치', '딥러닝 CNN 완벽 가이드 - Pytorch 버전', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/딥러닝-cnn-완벽가이드-파이토치', NULL, 2493, 'OWNED', 'P3', 3, 9, 'CNN 아키텍처(ResNet/EfficientNet 등), 실전 분류 프로젝트', NULL, NOW(6), NOW(6)),
  ('javascript-tensorflow-배우는-머신러닝', 'JavaScript와 Tensorflow.js로 배우는 머신러닝', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/javascript-tensorflow-배우는-머신러닝', NULL, 791, 'OWNED', 'P3', 3, 9, '신경망 개요, 회귀/분류, 전이학습', NULL, NOW(6), NOW(6)),
  ('ai엔지니어-cnn-이해하기', '[AI 기초] AI Research Engineer를 위한 CNN 이해하기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/ai엔지니어-cnn-이해하기', NULL, 49, 'OWNED', 'P3', 3, 9, 'Convolution 필터 원리, NumPy/PyTorch 구현', NULL, NOW(6), NOW(6)),
  ('입문초급-다양한-예제를-통한-추천-시', '[입문/초급] 다양한 예제를 통한 추천 시스템 구현', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/입문초급-다양한-예제를-통한-추천-시', NULL, 539, 'OWNED', 'P3', 3, 9, '오리엔테이션→추천시스템 개요→평가지표→인기도기반→컨텐츠기반→개인화→Hybrid 추천', NULL, NOW(6), NOW(6)),
  ('개발자를-위한-딥러닝', '개발자를 위한 딥러닝', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/개발자를-위한-딥러닝', NULL, 542, 'OWNED', 'P3', 3, 9, '딥러닝 개요→딥러닝을 위한 확률통계→모델 분석', NULL, NOW(6), NOW(6)),
  ('linear-algebra-for-a-1', 'AI를 위한 선형대수학', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/linear-algebra-for-a-1', NULL, 718, 'OWNED', 'P3', 3, 9, '스칼라/벡터/행렬→기하학적 해석→선형변환→연립방정식→벡터공간→고유값/고유벡터→SVD→텐서→캡스톤(이미지압축/추천시스템)', NULL, NOW(6), NOW(6)),
  ('한입-크기-nextjs', '한 입 크기로 잘라먹는 Next.js', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/한입-크기-nextjs', NULL, 933, 'OWNED', 'P1', 1, 10, 'Page Router/App Router, 데이터 페칭/캐싱, 배포', NULL, NOW(6), NOW(6)),
  ('한입-크기-타입스크립트', '한 입 크기로 잘라먹는 타입스크립트(TypeScript)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/한입-크기-타입스크립트', NULL, 631, 'OWNED', 'P2', 2, 10, '기본문법~제네릭~유틸리티타입, React 연동', NULL, NOW(6), NOW(6)),
  ('temp_336691', '@시코 - JavaScript 최고수되기 (개념과 실무)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/temp_336691', NULL, 1844, 'OWNED', 'P2', 2, 10, '실행컨텍스트/클로저/비동기/DOM, 실전 문제풀이', NULL, NOW(6), NOW(6)),
  ('타입스크립트-제대로-배우기-초중급', '@시코 - TypeScript 제대로 배우기(초중급)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/타입스크립트-제대로-배우기-초중급', NULL, 620, 'OWNED', 'P2', 2, 10, '타입시스템부터 Generic/Utility 타입까지', NULL, NOW(6), NOW(6)),
  ('진짜-자바스크립트-기초부터-고급까지', '진짜! 자바스크립트(Javascript) - 기초부터 고급까지', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/진짜-자바스크립트-기초부터-고급까지', NULL, 2274, 'OWNED', 'P2', 2, 10, 'V8엔진/클로저/프로토타입/비동기/모듈, strict mode', NULL, NOW(6), NOW(6)),
  ('functional-es6', '함수형 프로그래밍과 JavaScript ES6+', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/functional-es6', NULL, 487, 'OWNED', 'P2', 2, 10, '이터러블, map/filter/reduce, 지연평가', NULL, NOW(6), NOW(6)),
  ('함수형_ES6_응용편', '함수형 프로그래밍과 JavaScript ES6+ 응용편', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/함수형_ES6_응용편', NULL, 362, 'OWNED', 'P2', 2, 10, '리스트 프로세싱, 안전한 합성, 시간을 이터러블로', NULL, NOW(6), NOW(6)),
  ('one-bite-react-pract', '한입 리액트 실전 라이브러리 키트 - Zustand, Tanstack Query, TailwindCSS', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/one-bite-react-pract', NULL, 531, 'OWNED', 'P2', 2, 10, 'Zustand 전역상태, TanStack Query 서버상태', NULL, NOW(6), NOW(6)),
  ('인프런-클론코딩-part1', '인프런 클론코딩 Part 1: Next.js와 NestJS로 시작하는 실전 프로젝트', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/인프런-클론코딩-part1', NULL, 882, 'OWNED', 'P2', 2, 10, 'JWT 인증, 강의등록 기능, Prisma', NULL, NOW(6), NOW(6)),
  ('next-react-query-sns서비스', 'Next + React Query로 SNS 서비스 만들기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/next-react-query-sns서비스', NULL, 868, 'OWNED', 'P2', 2, 10, '라우트그룹, MSW 목킹, WebSocket 채팅', NULL, NOW(6), NOW(6)),
  ('tailwind-css-개발자-ui스타일링', 'Tailwind CSS로 만드는 멋진 웹 UI 스타일링', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/tailwind-css-개발자-ui스타일링', NULL, 1169, 'OWNED', 'P3', 3, 10, 'Tailwind 이론+실전 예제, 반응형 레이아웃', NULL, NOW(6), NOW(6)),
  ('강력-css-코드캠프', '[코드캠프] 강력한 CSS', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/강력-css-코드캠프', NULL, 711, 'OWNED', 'P3', 3, 10, 'Flex/Grid, Position/Transition/Animation', NULL, NOW(6), NOW(6)),
  ('코드팩토리-자바스크립트-풀코스', '[코드팩토리] [입문] 9시간만에 끝내는 코드팩토리의 Javascript 무료 풀코스', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/코드팩토리-자바스크립트-풀코스', NULL, 519, 'OWNED', 'P3', 3, 10, '변수/함수/배열/객체/클래스/비동기 기초', NULL, NOW(6), NOW(6)),
  ('코드팩토리-타입스크립트-풀코스', '[코드팩토리] [초급] 8시간만에 끝내는 코드팩토리의 Typescript 완전정복 풀코스', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/코드팩토리-타입스크립트-풀코스', NULL, 490, 'OWNED', 'P3', 3, 10, '기본기, 제네릭, 유틸리티 타입, 데코레이터', NULL, NOW(6), NOW(6)),
  ('코드캠프-완벽한-프론트엔드-코스', '[코드캠프] 부트캠프에서 만든 ''완벽한'' 프론트엔드 코스', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/코드캠프-완벽한-프론트엔드-코스', NULL, 9726, 'OWNED', 'P3', 3, 10, 'HTML/CSS/JS→React/Next→React Native', NULL, NOW(6), NOW(6)),
  ('파이썬-장고-웹서비스-with리액트', '파이썬/장고 웹서비스 개발 완벽 가이드 with 리액트 (장고 4.2 기준)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/파이썬-장고-웹서비스-with리액트', NULL, 2156, 'OWNED', 'P3', 3, 10, 'Django ORM, DRF, React 연동, Linux 배포', NULL, NOW(6), NOW(6)),
  ('맛집-지도앱-만들기-reactnative-nestjs', '맛집 지도앱 만들기 (React Native & NestJS)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/맛집-지도앱-만들기-reactnative-nestjs', NULL, 900, 'OWNED', 'P3', 3, 10, '지도 연동, 위치기반 피드, 앱스토어 배포', NULL, NOW(6), NOW(6)),
  ('r3f-인터렉티브-3d-웹개발', 'React Three fiber(R3F)로 배우는 인터렉티브 3D 웹 개발', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/r3f-인터렉티브-3d-웹개발', NULL, 601, 'OWNED', 'P3', 3, 10, 'Three.js 기반 3D 오브젝트/이커머스 프로젝트', NULL, NOW(6), NOW(6)),
  ('얄코-자바스크립트-reactivex', '얄코의 반응형 프로그래밍 - 자바스크립트로 쉽게 배우는 ReactiveX', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/얄코-자바스크립트-reactivex', NULL, 160, 'OWNED', 'P3', 3, 10, '스트림, 오퍼레이터, 반응형 프로그래밍', NULL, NOW(6), NOW(6)),
  ('웹-애니메이션-web-animation-api', '웹 애니메이션의 새로운 표준, Web Animations API', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/웹-애니메이션-web-animation-api', NULL, 298, 'OWNED', 'P3', 3, 10, 'CSS Transition/Animation, Web Animation API', NULL, NOW(6), NOW(6)),
  ('웹-애니매이션-gsap-1', '웹 애니메이션을 위한 GSAP 가이드 Part.01', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/웹-애니매이션-gsap-1', NULL, 235, 'OWNED', 'P3', 3, 10, 'GSAP Tween/Timeline/버튼 이펙트', NULL, NOW(6), NOW(6)),
  ('pixijs-with-cursor', 'PixiJS로 만드는 2D 그래픽과 게임 with Cursor(AI)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/pixijs-with-cursor', NULL, 144, 'OWNED', 'P3', 3, 10, '스프라이트/애니메이션, Cursor AI 활용 게임 제작', NULL, NOW(6), NOW(6)),
  ('자바스크립트-gui-개발-1-elec', '[Electron #1] Electron + React로 만드는 타이머 앱 (With Zustand)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/자바스크립트-gui-개발-1-elec', NULL, 489, 'OWNED', 'P3', 3, 10, 'Electron+React 개발환경, 앱 패키징/배포', NULL, NOW(6), NOW(6)),
  ('아무도-알려주지않는-webrtc-p2p', '아무도 알려주지 않는 WebRTC를 사용한 P2P통신', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/아무도-알려주지않는-webrtc-p2p', NULL, 201, 'OWNED', 'P3', 3, 10, 'RTCPeerConnection, React+WebSocket WebRTC 구현', NULL, NOW(6), NOW(6)),
  ('ux-서비스기획-인프런-오리지널', 'UX/UI 시작하기 : UX 서비스 기획 (Inflearn Original)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/ux-서비스기획-인프런-오리지널', NULL, 450, 'OWNED', 'P3', 3, 10, '서비스 기획 전략, 고객여정지도, KPI 관리', NULL, NOW(6), NOW(6)),
  ('피그마-입문-인프런-오리지널', 'UX/UI 시작하기 : Figma 입문 (Inflearn Original)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/피그마-입문-인프런-오리지널', NULL, 453, 'OWNED', 'P3', 3, 10, 'Figma 인터페이스, 컴포넌트, 프로토타이핑', NULL, NOW(6), NOW(6)),
  ('실전연습-고급-타입스크립트', '실전 연습으로 익히는 고급 타입스크립트 기술', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/실전연습-고급-타입스크립트', NULL, 177, 'OWNED', 'P2', 2, 10, 'Type/Value space→함수타입 변형→Union·제네릭→Conditional Types→함수 오버로딩→Brand 타입→Type predicate→외부 라이브러리 타입', NULL, NOW(6), NOW(6)),
  ('한-입-크기로-잘라먹는-실전-프로젝트', '한 입 크기로 잘라먹는 React.js 실전 프로젝트 - SNS 편', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/한-입-크기로-잘라먹는-실전-프로젝트', NULL, 1329, 'OWNED', 'P2', 2, 10, 'Zustand/TanStack Query 준비→인증→포스트→좋아요→프로필→댓글→테마→배포(한입로그 SNS 프로젝트)', NULL, NOW(6), NOW(6)),
  ('웹-미디어활용-mediastream-api', '웹에서 다루는 미디어 - 화상 대화를 만들면서 배우는 MediaStream API', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/웹-미디어활용-mediastream-api', NULL, 709, 'OWNED', 'P3', 3, 10, 'MediaStream 기본→미디어 장치→Constraints→AudioContext→WebRTC→실전 프로젝트(화상채팅 FE/BE)', NULL, NOW(6), NOW(6)),
  ('웹에서-다루는-네트워크-통신-기초부터', '웹에서 다루는 네트워크 통신 - 기초부터 HTTP, SSE, WebSocket 그리고 WebRTC P2P 통신까지', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/웹에서-다루는-네트워크-통신-기초부터', NULL, 474, 'OWNED', 'P2', 2, 10, '웹/네트워크 기초→HTTP 이해→Server Sent Events→WebSocket 서버/클라이언트→WebRTC/Signaling Server', NULL, NOW(6), NOW(6)),
  ('js빌드시스템-모듈시스템', '프론트엔드 빌드 시스템 완벽 가이드 - Part.1: 모듈 시스템', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/js빌드시스템-모듈시스템', NULL, 312, 'OWNED', 'P2', 2, 10, '개요→JS 모듈시스템→CJS→AMD→UMD→ESM→빌드환경별 모듈설정', NULL, NOW(6), NOW(6)),
  ('자바-스프링-테스트-개발자-오답노트', 'Java/Spring 테스트를 추가하고 싶은 개발자들의 오답노트', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/자바-스프링-테스트-개발자-오답노트', NULL, 380, 'OWNED', 'P0', 0, 11, '테스트 이론, h2/mockmvc 테스트, 구조적 리팩토링', NULL, NOW(6), NOW(6)),
  ('springboot-tdd-입문실전', 'Spring Boot TDD - 입문부터 실전까지 정확하게', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/springboot-tdd-입문실전', NULL, 849, 'OWNED', 'P0', 0, 11, 'Kent Beck TDD 절차, 요구사항 변경 대응 시나리오', NULL, NOW(6), NOW(6)),
  ('대규모트래픽-부하테스트-입문-실전', '대규모 트래픽 처리를 위한 부하테스트 입문/실전', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/대규모트래픽-부하테스트-입문-실전', NULL, 207, 'OWNED', 'P0', 0, 11, '부하테스트 기초, 병목 진단→해결 사고과정', NULL, NOW(6), NOW(6)),
  ('백엔드-애플리케이션-성능개선-기초편', '백엔드 애플리케이션 성능 개선하기 - 기초편', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/백엔드-애플리케이션-성능개선-기초편', NULL, 159, 'OWNED', 'P0', 0, 11, '성능측정, 생성/조회 API 최적화(캐싱/인덱싱)', NULL, NOW(6), NOW(6)),
  ('성능-개선-초석-다지기', '백엔드 개발자 성능 개선 초석 다지기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/성능-개선-초석-다지기', NULL, 218, 'OWNED', 'P1', 1, 11, '캐싱/인덱스/비동기, ngrinder/Scout 활용', NULL, NOW(6), NOW(6)),
  ('테스트-with-jest-제로초', '테스트 with Jest: 제로초에게 제대로 배우기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/테스트-with-jest-제로초', NULL, 357, 'OWNED', 'P2', 2, 11, 'Jest 기초, React/Express 테스트 적용', NULL, NOW(6), NOW(6)),
  ('실무적용-프런트엔드-테스트-1부', '실무에 바로 적용하는 프런트엔드 테스트 - 1부. 테스트 기초', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/실무적용-프런트엔드-테스트-1부', NULL, 282, 'OWNED', 'P2', 2, 11, 'Vitest/Testing Library, 단위·통합 테스트', NULL, NOW(6), NOW(6)),
  ('실무적용-프런트엔드-테스트-2부', '실무에 바로 적용하는 프런트엔드 테스트 - 2부. 테스트 심화', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/실무적용-프런트엔드-테스트-2부', NULL, 239, 'OWNED', 'P2', 2, 11, '스냅샷, Storybook 시각적 회귀, Cypress E2E', NULL, NOW(6), NOW(6)),
  ('실무적용-스토리북-ui테스트', '실무에 바로 적용하는 스토리북과 UI 테스트', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/실무적용-스토리북-ui테스트', NULL, 163, 'OWNED', 'P3', 3, 11, '컴포넌트 개발, UI 테스트, 디자인시스템 배포', NULL, NOW(6), NOW(6)),
  ('리셀봇-원리로-알아보는-cypress', '리셀봇 원리로 알아보는 Cypress', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/리셀봇-원리로-알아보는-cypress', NULL, 67, 'OWNED', 'P3', 3, 11, '오리엔테이션→Cypress 기초(설치/클릭/입력/드롭다운/구매 자동화)→재사용 가능한 테스트 코드(셀렉터/검증/리팩토링)', NULL, NOW(6), NOW(6)),
  ('백엔드-애플리케이션-성능-테스트', '백엔드 애플리케이션 성능 테스트하기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/백엔드-애플리케이션-성능-테스트', NULL, 173, 'OWNED', 'P1', 1, 11, '배경지식→Artillery 소개/활용→간단한 성능개선 경험→부록', NULL, NOW(6), NOW(6)),
  ('log-management-and-m', '로그관리와 모니터링 - ELK, 프로메테우스, 그라파나', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/log-management-and-m', NULL, 166, 'OWNED', 'P0', 0, 12, 'Logback, ELK 로그수집, Prometheus/Grafana 알림', NULL, NOW(6), NOW(6)),
  ('개발자에게-필요한-로그관리', '개발자에게 필요한 로그 관리', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/개발자에게-필요한-로그관리', NULL, 207, 'OWNED', 'P1', 1, 12, '로그 레벨/Logback 설정/수집/시각화', NULL, NOW(6), NOW(6)),
  ('learn-spring-boot-ac', '누구보다 빠르게 배우는 SpringBoot Acturator', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/learn-spring-boot-ac', NULL, 317, 'OWNED', 'P1', 1, 12, 'Endpoint 설정, Health/Metrics, Spring Boot Admin', NULL, NOW(6), NOW(6)),
  ('grafana-대시보드', 'Grafana 설치하고 대시보드 만들기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/grafana-대시보드', NULL, 167, 'OWNED', 'P1', 1, 12, '대시보드/패널, PostgreSQL/ES/Prometheus 연동', NULL, NOW(6), NOW(6)),
  ('카카오-개발자가-알려주는-수백개의-m', '카카오 면접관이 알려주는 수백개의 MSA 서비스 아키텍처에서의 분산 추적 시스템', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/카카오-개발자가-알려주는-수백개의-m', NULL, 271, 'OWNED', 'P1', 1, 12, 'Grafana Tempo, OpenTelemetry Collector', NULL, NOW(6), NOW(6)),
  ('readable-code-읽기좋은코드-작성사고법', 'Readable Code: 읽기 좋은 코드를 작성하는 사고법', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/readable-code-읽기좋은코드-작성사고법', NULL, 841, 'OWNED', 'P0', 0, 13, '이름짓기/추상화, Early return, OOP 리팩토링', NULL, NOW(6), NOW(6)),
  ('오브젝트-설계원칙-part2', '오브젝트 - 설계 원칙편', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/오브젝트-설계원칙-part2', NULL, 376, 'OWNED', 'P0', 0, 13, '메서드 조합, 값/참조 객체, 인터페이스 정제', NULL, NOW(6), NOW(6)),
  ('디자인-패턴', '코딩으로 학습하는 GoF의 디자인 패턴', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/디자인-패턴', NULL, 697, 'OWNED', 'P0', 0, 13, '생성/구조/행위 패턴 23종, Java/Spring 실전 코드', NULL, NOW(6), NOW(6)),
  ('리팩토링', '코딩으로 학습하는 리팩토링', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/리팩토링', NULL, 579, 'OWNED', 'P0', 0, 13, '24가지 코드스멜별 리팩토링 기법, 43개 실습', NULL, NOW(6), NOW(6)),
  ('토비-클린스프링-도메인모델패턴-헥사고날-part1', '토비의 클린 스프링 - 도메인 모델 패턴과 헥사고날 아키텍처 Part 1', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/토비-클린스프링-도메인모델패턴-헥사고날-part1', NULL, 871, 'OWNED', 'P0', 0, 13, '도메인 모델링, 헥사고날 아키텍처, 애그리게이트', NULL, NOW(6), NOW(6)),
  ('ts-js-디자인패턴-canvas-제로초', 'TS/JS 디자인 패턴 with Canvas: 제로초에게 제대로 배우기', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/ts-js-디자인패턴-canvas-제로초', NULL, 376, 'OWNED', 'P3', 3, 13, '생성/행위 패턴을 Canvas 그림판으로 구현', NULL, NOW(6), NOW(6)),
  ('2026년-객체지향-제대로-배우기wi', '2026년! 객체지향 제대로 배우기(with Python)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/2026년-객체지향-제대로-배우기wi', NULL, 254, 'OWNED', 'P3', 3, 13, 'SOLID, 캡슐화/상속/다형성, RPG 게임 실습', NULL, NOW(6), NOW(6)),
  ('kafka-spark-realtime-datalake', 'Kafka & Spark 활용한 Realtime Datalake', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/kafka-spark-realtime-datalake', NULL, 1703, 'OWNED', 'P2', 2, 14, '데이터레이크 아키텍처, Kafka Producer/Consumer, Spark Streaming', NULL, NOW(6), NOW(6)),
  ('airflow-마스터-클래스', 'Airflow 마스터 클래스', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/airflow-마스터-클래스', NULL, 1496, 'OWNED', 'P2', 2, 14, '오퍼레이터, Task 통신, 센서, 실전 프로젝트(2.10/3.0 포함)', NULL, NOW(6), NOW(6)),
  ('geek-근본깃-git-github', 'Git & GitHub, 원리부터 차근차근 - 근본깃', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/geek-근본깃-git-github', NULL, 489, 'OWNED', 'P0', 0, 15, 'HEAD/브랜치/머지/리베이스 원리, 그림 기반 설명', NULL, NOW(6), NOW(6)),
  ('git-핵심정복-깃미남', '깃미남의 Git 핵심 정복', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/git-핵심정복-깃미남', NULL, 109, 'OWNED', 'P1', 1, 15, 'Git 내부구조, 리베이스, Reflog 복원', NULL, NOW(6), NOW(6)),
  ('직접-만들면서-배우는-git-internals', '직접 만들면서 배우는 Git Internals', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/직접-만들면서-배우는-git-internals', NULL, 406, 'OWNED', 'P2', 2, 15, 'Go로 blob/tree/commit 오브젝트 직접 구현', NULL, NOW(6), NOW(6)),
  ('git-github-atoz', '깃(git, github) 180강! A-Z 기초부터 중급까지 이론과 실습', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/git-github-atoz', NULL, 1102, 'OWNED', 'P2', 2, 15, '브랜치/병합/리베이스/되돌리기 전 범위', NULL, NOW(6), NOW(6)),
  ('github-파운데이션-시험대비-2025new', '2025 GitHub 파운데이션 시험 완벽 대비 마스터 클래스', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/github-파운데이션-시험대비-2025new', NULL, 183, 'OWNED', 'P3', 3, 15, '시험 개요, 기출문제 워크스루', NULL, NOW(6), NOW(6)),
  ('게임-프로그래머-입문-올인원-rookiss', '[게임 프로그래머 입문 올인원] C++ & 자료구조/알고리즘 & STL & 게임 수학 & Windows API & 게임 서버', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/게임-프로그래머-입문-올인원-rookiss', NULL, 4596, 'OWNED', 'P3', 3, 16, 'C++ 객체지향~게임서버 엔진 제작까지 18주 커리큘럼', NULL, NOW(6), NOW(6)),
  ('언리얼-3d-mmorpg-4', '[C++과 언리얼로 만드는 MMORPG 게임 개발 시리즈] Part4: 게임 서버', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/언리얼-3d-mmorpg-4', NULL, 2501, 'OWNED', 'P3', 3, 16, '멀티쓰레드, 네트워크 라이브러리, JobQueue, DB 연동', NULL, NOW(6), NOW(6)),
  ('기초-대수학-중고등', '수학으로부터 인류를 자유롭게 하라(기초대수학편)', 'ONLINE_COURSE', '인프런', 'https://www.inflearn.com/course/기초-대수학-중고등', NULL, 1897, 'OWNED', 'P3', 3, 16, '집합/함수/삼각함수/이차곡선 등 대수학 전 범위', NULL, NOW(6), NOW(6));

-- 강의 ↔ 태그 연결 (기존/신규 태그 모두 이름 매칭으로 안전하게 연결)
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '이력서작성' WHERE lr.slug = '10000장의-이력서를-본-기술이사의';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '면접' WHERE lr.slug = 'n000번-면접을-본-기술이사-면접-가이드';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '포트폴리오+백엔드실무' WHERE lr.slug = '백엔드-포트폴리오-실무이력강화-올인원-part1';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '면접+CS기초' WHERE lr.slug = '면접-신입-java-백앤드-개발자';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '이력서' WHERE lr.slug = '비전공자-개발자-이력서';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '이력서/포트폴리오' WHERE lr.slug = 'job-bomber-private-s';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '면접' WHERE lr.slug = 'the-ultimate-guide-t';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '포트폴리오' WHERE lr.slug = '포트폴리오-어나더레벨';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '자바/JVM/GC/동시성' WHERE lr.slug = 'cs-interview-prepara';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'DB/트랜잭션/인덱스' WHERE lr.slug = 'cs-interview-prepara-1';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '자료구조/OS/DB/네트워크' WHERE lr.slug = '개발자-전공면접-cs-완전정복';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'HTTP/네트워크' WHERE lr.slug = 'http-웹-네트워크';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '네트워크' WHERE lr.slug = '네트워크-핵심이론-기초';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '컴구조/OS' WHERE lr.slug = '혼자-공부하는-컴퓨터구조-운영체제';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '컴구조' WHERE lr.slug = '컴퓨터구조-비전공자-기술면접';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '자료구조' WHERE lr.slug = '비전공자가-놓치기-쉬운-자료구조';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '네트워크' WHERE lr.slug = 'aws로-배우는-네트워크-이론부터-실';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '네트워크' WHERE lr.slug = '개발자-컴퓨터공학-혼자공부하는-네트워크';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '네트워크' WHERE lr.slug = '네트워크-핵심이론-응용';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '자료구조/알고리즘' WHERE lr.slug = '자료구조-알고리즘-기본';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '자료구조/알고리즘' WHERE lr.slug = '그림으로-쉽게-자료구조-알고리즘-심화';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '보안/암호' WHERE lr.slug = '외워서-끝내는-암호기술';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '보안' WHERE lr.slug = '웹-개발자-알아야-할-보안-기초';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'DB' WHERE lr.slug = '데이터베이스-비전공자-면접';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '자바/OOP' WHERE lr.slug = '자바와-객체-지향-궁극의-면접-대비';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '네트워크' WHERE lr.slug = '그림으로-쉽게-배우는-네트워크';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'HTTP' WHERE lr.slug = '웹개발-핵심-http-완벽-마스터하기';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '자료구조' WHERE lr.slug = '얄코의-가장-쉬운-자료구조와-알고리즘';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '컴구조' WHERE lr.slug = '만들면서-배우는-컴퓨터-구조';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'OS' WHERE lr.slug = '비전공자-운영체제';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '인코딩' WHERE lr.slug = '모르면-야근하는-문자-인코딩-완전-정';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'JS/면접' WHERE lr.slug = 'cs-기술면접-7-말이-트이는-자바스';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'JS엔진' WHERE lr.slug = '빠르게-알아보는-javascript-v8엔진';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'CS종합' WHERE lr.slug = '넓고얕게-컴공-전공자';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'CS일반' WHERE lr.slug = '개발자-개념-장착-프로그래밍-개발에';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '시스템설계' WHERE lr.slug = '스프링부트로-대규모-시스템설계-게시판';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '캐시전략' WHERE lr.slug = '스프링부트로-직접-만들면서-배우는-대';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '실무기본기' WHERE lr.slug = '자바-스프링-주니어-개발자-오답노트';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '동시성' WHERE lr.slug = '가장-쉬운-동시성-문제-race-co';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '실무프로젝트' WHERE lr.slug = '제미니의-개발실무-커머스-백엔드-기본';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '결제시스템' WHERE lr.slug = '견고한-결제-시스템-구축';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '시스템설계/장애대응' WHERE lr.slug = '장애를-허용하는-견고한-시스템-만들기';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '인증/인가/보안' WHERE lr.slug = '스프링-시큐리티-완전정복';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'API/gRPC' WHERE lr.slug = '파이썬-시작하는-grpc';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '이벤트드리븐' WHERE lr.slug = '카카오-개발자와-함께하는-워크플로우';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '동시성' WHERE lr.slug = 'backend-멀티쓰레드-이해-통찰력-키우기';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '데이터모델링' WHERE lr.slug = '분산데이터-모델링-설계전략';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '분산시스템' WHERE lr.slug = '카카오-개발자면접관가-알려주는-반드시';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '실시간통신' WHERE lr.slug = '프로덕션-레벨-실시간-채팅-서버-구축';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '배치처리' WHERE lr.slug = '죽음의-spring-batch';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'API/GraphQL' WHERE lr.slug = 'graphql-for-document';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '시스템설계' WHERE lr.slug = '미국-빅테크-시스템-디자인설계';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '리액티브/AI' WHERE lr.slug = 'spring-webflux-llm실전구현';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '실시간통신' WHERE lr.slug = '대용량-채팅-서버-처리-웹소켓-통신';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '실시간통신' WHERE lr.slug = '대용량-채팅-서버-처리-웹소켓-통신-2';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Node.js' WHERE lr.slug = 'prisma-postgresql';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Node.js' WHERE lr.slug = '차세대-노드-백엔드-서버-개발';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Node.js' WHERE lr.slug = '얄코-node-js';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Node.js/CS' WHERE lr.slug = 'the-era-of-ai-shortc';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Node.js/CS' WHERE lr.slug = 'the-era-of-ai-clicki';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Node.js/CS' WHERE lr.slug = 'the-era-of-ai-clicks';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Node.js/CS' WHERE lr.slug = 'nodejs-and-cs-part-4';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Node.js' WHERE lr.slug = 'expressjs-엔진-클론으로-배우';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Python/API' WHERE lr.slug = 'fastapi-완벽-가이드';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Python/동시성' WHERE lr.slug = '파이썬-동시성-프로그래밍';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '풀스택부트캠프' WHERE lr.slug = '부트캠프-백엔드-고농축-코스';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '스프링입문' WHERE lr.slug = '그린코딩-스프링-풀스택-웹개발';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '분산트랜잭션' WHERE lr.slug = '주문시스템으로-알아보는-분산트랜잭션';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Go' WHERE lr.slug = 'complete-in-3-hours';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '실무프로젝트' WHERE lr.slug = '제미니의-개발실무-백엔드레거시-ai활용';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'JS' WHERE lr.slug = 'vanilla-javascript로';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'RDB/MySQL 튜닝' WHERE lr.slug = 'real-mysql-part-1';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'RDB/MySQL 튜닝' WHERE lr.slug = 'real-mysql-part-2';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'RDB/모델링' WHERE lr.slug = '수억개의-데이터를-다루는-카카오-면접';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'RDB 성능' WHERE lr.slug = '비전공자-mysql-성능최정확-sql튜닝';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '데이터모델링' WHERE lr.slug = '실전-데이터베이스-완전정복-설계편';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'RDB(PostgreSQL)' WHERE lr.slug = 'postgresql-from-a-si';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'NoSQL(MongoDB)' WHERE lr.slug = '배달앱은-어떻게-내-주변의-맛집을-찾을까';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'NoSQL(MongoDB)' WHERE lr.slug = '실무자도-모르는-mongo-활용법';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'RDB 입문' WHERE lr.slug = '실리콘밸리-엔지니어와-함께하는-sql';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'NoSQL(Cassandra)' WHERE lr.slug = 'cassandra-supporting';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'RDB 성능' WHERE lr.slug = 'mysql-성능-최적화';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'RDB 성능' WHERE lr.slug = '데이터-mysql-마이그레이션';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '데이터아키텍처' WHERE lr.slug = '슬기로운-데이터엔지니어-생활';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'K8s 입문' WHERE lr.slug = '비전공자-쿠버네티스-입문-실전';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'CI/CD' WHERE lr.slug = '비전공자-ci-cd-입문-실전';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'CI/CD' WHERE lr.slug = '실전-github-actions-ci-cd-시작하기';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Nginx' WHERE lr.slug = '비전공자도-이해-nginx-입문-실전';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'K8s 실무' WHERE lr.slug = '쿠버네티스-어나더-클래스-지상편-sprint1';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'K8s 실무' WHERE lr.slug = '쿠버네티스-어나더-클래스-지상편-sprint3';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'K8s/모니터링' WHERE lr.slug = '쿠버네티스-어나더-클래스-해수편-sprint4';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'AWS/EKS' WHERE lr.slug = 'amazon-eks-기본-강의';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'AWS 네트워킹' WHERE lr.slug = 'cloudneta-aws-네트워킹-입문';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'AWS 심화' WHERE lr.slug = 'aws-중상급자';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'AWS 보안/IAM' WHERE lr.slug = '실무에서-사용중인-aws클라우드-iam-part1';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'CI/CD' WHERE lr.slug = 'introduction-to-cicd';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'AWS 기초' WHERE lr.slug = '쉽게-설명하는-aws-기초';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Linux' WHERE lr.slug = '카카오팀장-리눅스-실무';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Linux/모니터링' WHERE lr.slug = '리눅스-성능-분석-시작하기';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Linux' WHERE lr.slug = '리눅스-필수-유틸리티-4종';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'AWS/EKS 심화' WHERE lr.slug = 'amazon-eks-확장판';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'AWS 보안' WHERE lr.slug = 'cloudnet-aws-securit';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'AWS 아키텍처' WHERE lr.slug = '스타트업-with-aws-1';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'CI/CD' WHERE lr.slug = '애플리케이션-배포-자동화-ci-cd';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'K8s 자격증' WHERE lr.slug = 'certified-kubernetes';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Linux 입문' WHERE lr.slug = '비전공자도-이해할-수-있는-리눅스-입';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'K8s 보안' WHERE lr.slug = 'learning-rust-proper';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'K8s' WHERE lr.slug = 'kubernetes-for-toss';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Docker' WHERE lr.slug = 'docker-for-toss-deve';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'EKS/Spring 배포' WHERE lr.slug = 'eks-데브옵스전반';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'EKS/GitLab CI-CD' WHERE lr.slug = 'aws-eks-gitlab-ci-cd-j';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '배포전략' WHERE lr.slug = '안정적인-서비스-배포-팁';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Terraform' WHERE lr.slug = '테라폼-개요-기본문법';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Terraform' WHERE lr.slug = '중급-테라폼-aws-기본';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Nginx 심화' WHERE lr.slug = 'nginx-used-to-proces';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Redis' WHERE lr.slug = '2026-a-practical-gui';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Kafka' WHERE lr.slug = 'practical-kafka-gett-1';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Kafka 심화' WHERE lr.slug = '아파치-카프카-애플리케이션-프로그래밍';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Redis' WHERE lr.slug = '설-특집-초당-500000건-트래픽을';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'RabbitMQ' WHERE lr.slug = 'rabbitmq-비동기-아키텍처-한방에';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '통합실전' WHERE lr.slug = '고성능-실시간-분산시스템';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Redis 입문' WHERE lr.slug = '실전-redis-활용';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Redis' WHERE lr.slug = 'redis-야무지게-사용하는-방법-이론편';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Redis' WHERE lr.slug = 'redis-야무지게-사용하는법-실습편';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'NATS' WHERE lr.slug = '네이버-개발자가-알려주는-nats로';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Flink' WHERE lr.slug = '네이버-개발자가-알려주는-statef';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'MSA 입문' WHERE lr.slug = '비전공자도-이해할-수-있는-msa-입';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '분산트랜잭션/SAGA' WHERE lr.slug = '카카오-면접관개발자이-알려주는-msa';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Spring Cloud' WHERE lr.slug = 'spring-cloud-기초-msa';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'MSA 종합' WHERE lr.slug = '마이크로서비스-디자인패턴-msa';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'RPC' WHERE lr.slug = '카카오-토스-개발자가-알려주는-수백개';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Spring+LLM' WHERE lr.slug = 'spring-ai-in-practic';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'RAG/LangGraph' WHERE lr.slug = 'ai에이전트-구현-rag시스템-랭그래프';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'RAG' WHERE lr.slug = '랭체인으로-만드는-rag-활용-평가';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'LangChain 입문' WHERE lr.slug = '입문자를위한-랭체인-기초';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'AI Agent 종합' WHERE lr.slug = 'everything-about-ai';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'n8n/워크플로우' WHERE lr.slug = '회사에서-바로쓰는-업무자동화-ai에이전트';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '딥러닝 기초' WHERE lr.slug = '딥러닝-이론-파이토치-실무-정복';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'LLM 인프라' WHERE lr.slug = 'understanding-llm-ar';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'AI 평가' WHERE lr.slug = '안정적인-ai에이전트-평가';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'AI Agent 종합' WHERE lr.slug = '한-번에-끝내는-ai-에이전트-개발';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '멀티에이전트' WHERE lr.slug = 'multi-agents-with-sw';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'LangChain 입문' WHERE lr.slug = '한시간-끝내는-랭체인-기본';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '논문구현' WHERE lr.slug = 'ai-논문구현-pytorch';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'CNN' WHERE lr.slug = '딥러닝-cnn-완벽가이드-파이토치';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'ML(JS)' WHERE lr.slug = 'javascript-tensorflow-배우는-머신러닝';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'CNN 기초' WHERE lr.slug = 'ai엔지니어-cnn-이해하기';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '추천시스템' WHERE lr.slug = '입문초급-다양한-예제를-통한-추천-시';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '딥러닝' WHERE lr.slug = '개발자를-위한-딥러닝';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '수학/AI' WHERE lr.slug = 'linear-algebra-for-a-1';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Next.js' WHERE lr.slug = '한입-크기-nextjs';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'TypeScript' WHERE lr.slug = '한입-크기-타입스크립트';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'JavaScript' WHERE lr.slug = 'temp_336691';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'TypeScript' WHERE lr.slug = '타입스크립트-제대로-배우기-초중급';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'JavaScript' WHERE lr.slug = '진짜-자바스크립트-기초부터-고급까지';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '함수형/JS' WHERE lr.slug = 'functional-es6';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '함수형/JS' WHERE lr.slug = '함수형_ES6_응용편';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'React' WHERE lr.slug = 'one-bite-react-pract';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Next.js/NestJS' WHERE lr.slug = '인프런-클론코딩-part1';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Next.js' WHERE lr.slug = 'next-react-query-sns서비스';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'CSS' WHERE lr.slug = 'tailwind-css-개발자-ui스타일링';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'CSS' WHERE lr.slug = '강력-css-코드캠프';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'JavaScript 입문' WHERE lr.slug = '코드팩토리-자바스크립트-풀코스';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'TypeScript 입문' WHERE lr.slug = '코드팩토리-타입스크립트-풀코스';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '프론트풀스택' WHERE lr.slug = '코드캠프-완벽한-프론트엔드-코스';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Django' WHERE lr.slug = '파이썬-장고-웹서비스-with리액트';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'React Native' WHERE lr.slug = '맛집-지도앱-만들기-reactnative-nestjs';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '3D Web' WHERE lr.slug = 'r3f-인터렉티브-3d-웹개발';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'RxJS' WHERE lr.slug = '얄코-자바스크립트-reactivex';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '애니메이션' WHERE lr.slug = '웹-애니메이션-web-animation-api';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '애니메이션' WHERE lr.slug = '웹-애니매이션-gsap-1';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '그래픽/게임' WHERE lr.slug = 'pixijs-with-cursor';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '데스크톱앱' WHERE lr.slug = '자바스크립트-gui-개발-1-elec';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'WebRTC' WHERE lr.slug = '아무도-알려주지않는-webrtc-p2p';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'UX 기획' WHERE lr.slug = 'ux-서비스기획-인프런-오리지널';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Figma' WHERE lr.slug = '피그마-입문-인프런-오리지널';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'TypeScript' WHERE lr.slug = '실전연습-고급-타입스크립트';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'React' WHERE lr.slug = '한-입-크기로-잘라먹는-실전-프로젝트';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'WebRTC/미디어' WHERE lr.slug = '웹-미디어활용-mediastream-api';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '네트워크(프론트)' WHERE lr.slug = '웹에서-다루는-네트워크-통신-기초부터';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '빌드시스템' WHERE lr.slug = 'js빌드시스템-모듈시스템';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '테스트/TDD' WHERE lr.slug = '자바-스프링-테스트-개발자-오답노트';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'TDD' WHERE lr.slug = 'springboot-tdd-입문실전';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '부하테스트' WHERE lr.slug = '대규모트래픽-부하테스트-입문-실전';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '성능개선' WHERE lr.slug = '백엔드-애플리케이션-성능개선-기초편';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '성능개선' WHERE lr.slug = '성능-개선-초석-다지기';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '테스트(프론트)' WHERE lr.slug = '테스트-with-jest-제로초';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '테스트(프론트)' WHERE lr.slug = '실무적용-프런트엔드-테스트-1부';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '테스트(프론트)' WHERE lr.slug = '실무적용-프런트엔드-테스트-2부';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Storybook' WHERE lr.slug = '실무적용-스토리북-ui테스트';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Cypress' WHERE lr.slug = '리셀봇-원리로-알아보는-cypress';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '성능테스트' WHERE lr.slug = '백엔드-애플리케이션-성능-테스트';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '로깅/모니터링' WHERE lr.slug = 'log-management-and-m';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '로깅' WHERE lr.slug = '개발자에게-필요한-로그관리';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Actuator' WHERE lr.slug = 'learn-spring-boot-ac';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Grafana' WHERE lr.slug = 'grafana-대시보드';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '분산추적' WHERE lr.slug = '카카오-개발자가-알려주는-수백개의-m';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '클린코드' WHERE lr.slug = 'readable-code-읽기좋은코드-작성사고법';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '객체지향설계' WHERE lr.slug = '오브젝트-설계원칙-part2';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '디자인패턴' WHERE lr.slug = '디자인-패턴';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '리팩토링' WHERE lr.slug = '리팩토링';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '아키텍처' WHERE lr.slug = '토비-클린스프링-도메인모델패턴-헥사고날-part1';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '디자인패턴(프론트)' WHERE lr.slug = 'ts-js-디자인패턴-canvas-제로초';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '객체지향(Python)' WHERE lr.slug = '2026년-객체지향-제대로-배우기wi';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Kafka+Spark' WHERE lr.slug = 'kafka-spark-realtime-datalake';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Airflow' WHERE lr.slug = 'airflow-마스터-클래스';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Git' WHERE lr.slug = 'geek-근본깃-git-github';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Git' WHERE lr.slug = 'git-핵심정복-깃미남';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Git 내부구조' WHERE lr.slug = '직접-만들면서-배우는-git-internals';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'Git' WHERE lr.slug = 'git-github-atoz';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = 'GitHub 자격증' WHERE lr.slug = 'github-파운데이션-시험대비-2025new';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '게임개발/C++' WHERE lr.slug = '게임-프로그래머-입문-올인원-rookiss';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '게임서버' WHERE lr.slug = '언리얼-3d-mmorpg-4';
INSERT INTO `learning_resource_tag` (`learning_resource_id`, `tag_id`) SELECT lr.id, t.id FROM `learning_resource` lr JOIN `tag` t ON t.name = '수학' WHERE lr.slug = '기초-대수학-중고등';
