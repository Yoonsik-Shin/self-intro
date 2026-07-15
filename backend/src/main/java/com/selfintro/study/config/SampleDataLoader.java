package com.selfintro.study.config;

import com.selfintro.modules.profile.domain.ProfileRepository;
import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.modules.skill.domain.SkillRepository;
import com.selfintro.modules.experience.domain.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("local")
@RequiredArgsConstructor
public class SampleDataLoader implements ApplicationRunner {

    private final ProfileRepository profileRepository;

    private final SkillRepository skillRepository;
    private final ExperienceRepository experienceRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // Clean up duplicates if existing in database
        cleanupDuplicates();

        // 1. Profile Seeding
        seedProfile();

        // 2. Skills & Experiences Seeding
        seedSkillsAndExperiences();
    }

    private void seedProfile() {
        if (profileRepository.count() > 0) {
            return;
        }

        profileRepository.save(com.selfintro.modules.profile.domain.Profile.create(
                "신윤식",
                "Yoonsik Shin",
                "Software Engineer",
                "에듀테크 실무 백엔드 개발 경험과 Java/Spring Boot, MSA 및 Cloud 인프라 구축 지식을 기반으로 안정적이고 최적화된 아키텍처를 설계하고 운영합니다.",
                "1년 11개월 (에듀테크 스타트업)",
                "Java / Node.js / Cloud",
                "실시간 아키텍처 및 콘텐츠 개선 중",
                "https://github.com/Yoonsik-Shin",
                "aaa946@naver.com",
                "010-5171-0994"
        ));
    }

    private void seedSkillsAndExperiences() {
        if (experienceRepository.count() > 0) {
            return;
        }

        // Master Skills Definition
        Map<String, Skill> skillMap = new HashMap<>();

        // Core / Essential stacks (Languages)
        Skill javaSkill = getOrCreateSkill("Java", "LANGUAGE", "중급", true, 1);
        Skill tsSkill = getOrCreateSkill("TypeScript", "LANGUAGE", "중급", true, 2);
        Skill pythonSkill = getOrCreateSkill("Python", "LANGUAGE", "초급", false, 3);
        Skill nodeSkill = getOrCreateSkill("Node.js", "LANGUAGE", "중급", true, 4);

        skillMap.put("Java", javaSkill);
        skillMap.put("Java 21", javaSkill);
        skillMap.put("TypeScript", tsSkill);
        skillMap.put("Python", pythonSkill);
        skillMap.put("Node.js", nodeSkill);

        // Frameworks
        Skill springBootSkill = getOrCreateSkill("Spring Boot", "FRAMEWORK", "중급", true, 5);
        Skill fastapiSkill = getOrCreateSkill("FastAPI", "FRAMEWORK", "초급", false, 7);
        Skill nestjsSkill = getOrCreateSkill("NestJS", "FRAMEWORK", "중급", true, 8);
        Skill expressSkill = getOrCreateSkill("Express", "FRAMEWORK", "중급", false, 9);
        Skill reactSkill = getOrCreateSkill("React", "FRAMEWORK", "중급", true, 10);
        Skill djangoSkill = getOrCreateSkill("Django", "FRAMEWORK", "초급", false, 12);

        skillMap.put("Spring Boot", springBootSkill);
        skillMap.put("Spring Boot 3.3", springBootSkill);
        skillMap.put("FastAPI", fastapiSkill);
        skillMap.put("NestJS", nestjsSkill);
        skillMap.put("Express", expressSkill);
        skillMap.put("React", reactSkill);
        skillMap.put("React 19", reactSkill);
        skillMap.put("Django", djangoSkill);

        // Databases / Querying
        skillMap.put("QueryDSL", getOrCreateSkill("QueryDSL", "DATABASE", "중급", false, 13));
        skillMap.put("Cosmos DB", getOrCreateSkill("Cosmos DB", "DATABASE", "초급", false, 14));
        skillMap.put("Redis", getOrCreateSkill("Redis", "DATABASE", "중급", true, 15));
        skillMap.put("MongoDB", getOrCreateSkill("MongoDB", "DATABASE", "중급", false, 16));
        skillMap.put("SQL", getOrCreateSkill("SQL", "DATABASE", "중급", false, 17));
        skillMap.put("DB Modeling", getOrCreateSkill("DB Modeling", "DATABASE", "중급", false, 18));
        skillMap.put("Optimization", getOrCreateSkill("Optimization", "DATABASE", "중급", false, 19));
        skillMap.put("Excel", getOrCreateSkill("Excel", "DATABASE", "초급", false, 20));
        skillMap.put("Access", getOrCreateSkill("Access", "DATABASE", "초급", false, 21));

        // DevOps / Infra
        skillMap.put("Flyway", getOrCreateSkill("Flyway", "DEVOPS", "중급", false, 22));
        skillMap.put("Playwright", getOrCreateSkill("Playwright", "DEVOPS", "중급", false, 23));
        skillMap.put("n8n", getOrCreateSkill("n8n", "DEVOPS", "중급", false, 24));
        skillMap.put("Nginx", getOrCreateSkill("Nginx", "DEVOPS", "중급", false, 25));
        skillMap.put("Docker Compose", getOrCreateSkill("Docker Compose", "DEVOPS", "중급", false, 26));
        skillMap.put("Grafana", getOrCreateSkill("Grafana", "DEVOPS", "중급", false, 27));
        skillMap.put("Loki", getOrCreateSkill("Loki", "DEVOPS", "중급", false, 28));
        skillMap.put("Alloy", getOrCreateSkill("Alloy", "DEVOPS", "중급", false, 29));
        skillMap.put("AWS ECS/SQS", getOrCreateSkill("AWS ECS/SQS", "DEVOPS", "중급", true, 30));
        skillMap.put("Docker", getOrCreateSkill("Docker", "DEVOPS", "중급", true, 31));
        skillMap.put("Datadog", getOrCreateSkill("Datadog", "DEVOPS", "초급", false, 32));
        skillMap.put("IaC", getOrCreateSkill("IaC", "DEVOPS", "초급", false, 33));
        skillMap.put("Bicep", getOrCreateSkill("Bicep", "DEVOPS", "초급", false, 34));
        skillMap.put("Kubernetes", getOrCreateSkill("Kubernetes", "DEVOPS", "중급", true, 35));

        // AI / RAG
        skillMap.put("Azure OpenAI", getOrCreateSkill("Azure OpenAI", "AI_RAG", "중급", false, 36));
        skillMap.put("Teams SDK", getOrCreateSkill("Teams SDK", "AI_RAG", "중급", false, 37));
        skillMap.put("LLM", getOrCreateSkill("LLM", "AI_RAG", "중급", false, 38));
        skillMap.put("STT/TTS", getOrCreateSkill("STT/TTS", "AI_RAG", "중급", false, 39));
        skillMap.put("RAG", getOrCreateSkill("RAG", "AI_RAG", "중급", false, 40));
        skillMap.put("ML/DL", getOrCreateSkill("ML/DL", "AI_RAG", "초급", false, 41));
        skillMap.put("LangChain", getOrCreateSkill("LangChain", "AI_RAG", "중급", false, 42));
        skillMap.put("LangGraph", getOrCreateSkill("LangGraph", "중급", "초급", false, 43));
        skillMap.put("Azure", getOrCreateSkill("Azure", "AI_RAG", "중급", false, 44));
        skillMap.put("Data Preprocessing", getOrCreateSkill("Data Preprocessing", "AI_RAG", "중급", false, 45));
        skillMap.put("Statistics", getOrCreateSkill("Statistics", "AI_RAG", "중급", false, 46));
        skillMap.put("Machine Learning", getOrCreateSkill("Machine Learning", "AI_RAG", "중급", false, 47));

        // Theory / Others
        skillMap.put("Software Engineering", getOrCreateSkill("Software Engineering", "ETC", "중급", false, 48));
        skillMap.put("Database", getOrCreateSkill("Database", "ETC", "중급", false, 49));
        skillMap.put("Network", getOrCreateSkill("Network", "ETC", "중급", false, 50));

        // Essays content references
        String essayCareer = "에듀테크 스타트업 실무 경력 (1년 11개월): 핵심 애플리케이션 및 BFF 서버 개발을 전담하며 전체 9,500여 개 커밋 중 약 43%를 담당한 최다 기여자로 활약했습니다. 특히 AI 튜터 메시징 대화 세션의 4개 컨텍스트 다형성(문제풀이/복습/챌린지/개념보강) 모델을 추상화하여 외부 AI 서버와의 SQS 비동기 연동을 주도했으며, MongoDB 트랜잭션을 적용해 상태 변화의 데이터 정합성을 보장했습니다. 또한 교사용 실시간 학생 Presence 추적과 이상행동(manageable-action) 감지, 제출문제(SubmittedProblem) 도메인의 CQRS 리팩토링 및 6만 건의 데이터 마이그레이션 스크립트를 작성하여 시스템 효율화를 이뤄냈습니다.\n\n백오피스 TF 및 공용 서비스 단독 구축: 무료체험 프로세스 개선을 위한 자발적 TF에서 Spring Boot 3.2 + Security + JPA 기반 백오피스 서버(144개 클래스) 전체를 단독 개발했습니다. NCP 카카오 알림톡(HMAC 서명 구현) 및 MS Teams 웹훅 연동을 통해 알림을 자동화했으며, Redis Session을 활용해 크로스도메인 쿠키 인증 이슈를 해결했습니다. 추가로 여러 부서가 공용하는 6만여 개의 문항 조회를 위한 NestJS 마이크로서비스를 단독 설계하고, 공통 DB/캐시 모듈을 사내 npm 패키지로 격리하며 신규 NestJS 프로젝트 생성용 CLI 도구까지 주도 개발했습니다.";
        String essayProjects = "CS Test Bed 및 신규 프로젝트 개발: CS 문의 수집·답변 자동화 E2E 시스템(CS Test Bed)을 단독 구축했습니다. n8n 워크플로우로 카페 게시판과 이메일 문의를 수집하고, Playwright를 활용해 네이버 세션 만료 및 자동 답변 우회 로직을 구현했습니다. Nginx auth_request 및 HMAC 토큰을 활용한 보안 프록시 계층을 설계하여 MinIO/Grafana 등 내부 도구에 SSO를 연동했습니다. AI 실시간 모의면접 플랫폼에서는 gRPC/Redis/Kafka 기반의 음성 스트리밍 파이프라인을 설계해 비동기 상태 통제와 RAG Rerank 최적화 성능을 확보했습니다.";
        String essayInfo = "정보처리기사 취득 과정에서 체화한 소프트웨어 개발 생명주기(SDLC), 모듈 설계 원칙(응집도와 결합도), 객체지향 설계(SOLID)를 실무에 직접 투영했습니다. 도메인의 경계를 명확히 분리하고 인프라 변경에 유연하게 대응하기 위해 헥사고날(포트-어댑터) 아키텍처와 DDD 4계층(adapter-application-domain-infrastructure) 구조를 에듀테크 서비스 전체에 일관 적용하여 코드 가독성과 확장성을 대폭 높였습니다.";
        String essaySql = "데이터 모델 정규화 및 반정규화, 인덱스(Index) 설계 원리와 조인(Join) 메커니즘을 심도 있게 학습했습니다. Spring Boot 기반 백오피스 개발 시 8개 도메인 간의 유기적 관계(1:N, N:M)를 매핑하고, 복잡한 동적 필터 조회를 위해 QueryDSL을 연동하여 성능 향상을 이뤄냈습니다. N+1 문제를 방지하기 위해 Fetch Join과 인덱스 튜닝을 도입하여 조회 속도를 개선했습니다.";
        String essayBigdata = "대량 데이터 수집, 이상치 정제, 통계적 분석(가설 검정, 회귀 모형) 및 평가 메커니즘을 마이그레이션과 AI RAG 파이프라인에 접목했습니다. SubmittedProblem 통계 병합 마이그레이션 시 14개 집계 지표(제출수/정답수/소요시간 등)를 MongoDB 트랜잭션 내에서 정량 데이터로 가공·적재하는 파이프라인을 구축하였으며, AI 모의면접 플랫폼에서 PDF 이력서 RAG 질문 생성의 답변 정확도를 분석하는 통계 평가 체계에 응용했습니다.";

        // 1. Projects
        experienceRepository.save(Project.create(
                "고객문의 수집·자동응답 통합 테스트베드 (기여도 100%)",
                LocalDate.of(2026, 6, 1),
                LocalDate.of(2026, 7, 31),
                "고객 문의 수집·관리 및 브라우저 자동화(Playwright)와 노코드 n8n 워크플로우를 활용해 네이버 카페, 이메일 등의 문의 수작업 처리 과정을 자동화한 E2E 테스트베드 시스템입니다. DB 기반 RBAC 및 PII 암호화, Nginx auth_request 인증 계층과 Loki/Grafana/Alloy로 실시간 모니터링 환경을 구성했습니다.",
                "HMAC 인증 토큰과 Nginx auth_request를 활용해 내부 툴들의 보안 계층을 구축하고, n8n 분산 Lock 패턴과 무중단 개인정보(PII) 암호화 마이그레이션을 통해 운영 안정성을 하드닝했습니다.",
                essayProjects,
                1,
                List.of(detail("n8n 자동 수집, Playwright 네이버 로그인, PII 암호화, Grafana 모니터링 환경을 구축했습니다.", null, null, null, 0, List.of())),
                getSkills(List.of("Java 21", "Spring Boot 3.3", "QueryDSL", "Flyway", "React 19", "Playwright", "n8n", "Nginx", "Docker Compose", "Grafana", "Loki", "Alloy"), skillMap),
                "project1",
                "Backend & DevOps Engineer",
                100
        ));

        experienceRepository.save(Project.create(
                "Azure 클라우드 로그 비용 진단 및 최적화 SaaS (기여도 70%)",
                LocalDate.of(2026, 3, 1),
                LocalDate.of(2026, 6, 30),
                "Microsoft Azure LAW(Log Analytics Workspace) 요금 분석 및 비용 리스크를 진단하고 권장 진료 가이드를 발급하는 Microsoft Teams 전용 SaaS 솔루션입니다. 에이전트 기반 VM 연결 단절 탐지, 디버그 로그 폭증 추적, Azure OpenAI RAG 기반 맞춤 처방 제공, 로그 데이터 PII 마스킹 처리 등을 구축했습니다. (팀 프로젝트)",
                "쓰기 권한을 제외한 최소 읽기 전용 권한(18개) 진단 체계로 인프라 보안 위험을 차단하고, LLM을 결합하여 비용 최적화를 자동 진단·안내하는 파이프라인을 체득했습니다.",
                null,
                2,
                List.of(detail("Azure Functions 비용 누수 자동 진단, FastAPI/Cosmos DB 백엔드, OpenAI 처방을 연동했습니다.", null, null, null, 0, List.of())),
                getSkills(List.of("Azure Functions", "FastAPI", "Cosmos DB", "Azure OpenAI", "Teams SDK", "Bicep", "IaC"), skillMap),
                "project2",
                "Fullstack & Cloud Developer",
                70
        ));

        experienceRepository.save(Project.create(
                "음성 스트리밍 및 RAG 면접 관리 (기여도 100%)",
                LocalDate.of(2025, 12, 1),
                LocalDate.of(2026, 3, 31),
                "실시간 AI 모의면접 및 역량 평가 서비스의 전체 시스템 아키텍처와 분산 메시징 처리 부분을 담당했습니다. gRPC 기반 실시간 음성 스트리밍 제어, Redis/Kafka 비동기 메시지 큐를 통한 음성 데이터 및 AI 상태 변경 큐잉, 이력서 RAG 질문 생성 기능 등을 구현하고 Kubernetes 환경에 배포했습니다. (개인 프로젝트)",
                "비동기 메시징 및 대용량 음성 스트리밍 환경에서 발생할 수 있는 데이터 유실과 지연 병목을 제어하며 분산 인프라 설계 능력을 키웠습니다.",
                essayProjects,
                3,
                List.of(detail("gRPC/Redis/Kafka 기반 실시간 음성 스트리밍, 이력서 RAG 질문 생성 서비스를 설계했습니다.", null, null, null, 0, List.of())),
                getSkills(List.of("React", "gRPC", "Redis", "Kafka", "LLM", "STT/TTS", "RAG", "Kubernetes"), skillMap),
                "project3",
                "Core Architect & Developer",
                100
        ));

        // 2. Career
        experienceRepository.save(Career.create(
                "학습 플랫폼 핵심 API 및 BFF 구축 (기여도 43%)",
                LocalDate.of(2023, 12, 1),
                LocalDate.of(2025, 10, 31),
                "커리큘럼 기반 AI 학습 플랫폼의 핵심 Express API 서버와 NestJS 기반 BFF(Backend for Frontend) 서버를 부트스트랩하고 설계·개발을 전담했습니다. AI 튜터 메시징 대화 세션 모델 추상화 및 SQS 비동기 연동, 교사용 실시간 학생 관리(Presence) 모듈 설계, SubmittedProblem 도메인 CQRS 리팩토링 및 대형 마이그레이션을 총괄했습니다. Spring Boot 기반 백오피스 서비스도 1인 단독 구축하였습니다.",
                "실무 서비스의 9,500여 개 커밋 중 약 43%를 담당한 최다 기여자로서 비즈니스 확장 시 도메인 관심사 격리, 성능 튜닝, 그리고 인프라 CI/CD 파이프라인 전반을 주도하는 리드 엔지니어로 성장했습니다.",
                essayCareer,
                4,
                List.of(
                        detail(
                                "AI 튜터링 및 학습 플랫폼 핵심 API 서버 개발",
                                "커리큘럼 기반 AI 학습 플랫폼에서 AI 튜터와 학생 간 실시간 메시징을 처리하는 핵심 Express API 서버가 필요했습니다. 튜터링 세션은 문제풀이·복습·챌린지·개념보강 4가지 컨텍스트로 나뉘어 있었지만 하나의 평평한 모델로 뒤섞여 있어 확장이 어려웠습니다.",
                                "- AI 튜터 메시징 대화 세션을 4개 컨텍스트로 다형성 있게 추상화하는 도메인 모델을 설계했습니다.\n- 외부 AI 서버와의 통신을 SQS 기반 비동기 큐로 연동해 응답 지연에도 안정적으로 동작하도록 했습니다.\n- MongoDB 트랜잭션을 적용해 세션 상태 변화의 데이터 정합성을 보장했습니다.",
                                "전체 서비스 9,500여 개 커밋 중 약 43%를 담당하며 핵심 API 서버 개발을 리드했고, 신규 학습 컨텍스트 추가 시에도 기존 모델을 재사용할 수 있는 구조를 만들었습니다.",
                                0,
                                getSkills(List.of("Node.js", "TypeScript", "Express", "MongoDB"), skillMap)
                        ),
                        detail(
                                "프론트엔드 중계용 BFF 서버 설계 및 구축",
                                "여러 프론트엔드 클라이언트(교사용/학생용)가 각기 다른 형태로 백엔드 API를 직접 호출하면서 중복 로직과 N+1 호출이 늘어나고 있었습니다.",
                                "- NestJS 기반 BFF(Backend for Frontend) 서버를 처음부터 부트스트랩했습니다.\n- 교사용 실시간 학생 관리(Presence) 모듈을 BFF 레이어에서 설계해 프론트엔드가 여러 API를 조합할 필요 없이 하나의 엔드포인트로 소비하도록 했습니다.\n- SubmittedProblem 도메인을 CQRS로 리팩토링하고 6만 건 규모의 마이그레이션을 총괄했습니다.",
                                "프론트엔드 팀의 API 조합 로직을 BFF 뒤로 숨겨 클라이언트 코드 복잡도를 낮추고, 조회 성능 병목이던 SubmittedProblem 도메인의 응답 속도를 개선했습니다.",
                                1,
                                getSkills(List.of("NestJS", "TypeScript", "Redis"), skillMap)
                        ),
                        detail(
                                "Spring Boot 기반 사내 백오피스 단독 구축",
                                "무료체험 프로세스 개선을 위한 사내 TF에서, 여러 부서가 공용으로 쓸 수 있는 백오피스 도구가 없어 반복 수작업이 발생하고 있었습니다.",
                                "- Spring Boot 3.2 + Security + JPA 기반 백오피스 서버(144개 클래스)를 1인으로 설계·개발했습니다.\n- NCP 카카오 알림톡(HMAC 서명)과 MS Teams 웹훅 연동으로 알림을 자동화했습니다.\n- Redis Session을 활용해 크로스도메인 쿠키 인증 문제를 해결했습니다.",
                                "여러 부서가 공용하는 6만여 개 문항 조회를 위한 NestJS 마이크로서비스와 사내 npm 공통 패키지까지 확장 개발하며, 반복 수작업을 자동화된 백오피스 워크플로우로 대체했습니다.",
                                2,
                                getSkills(List.of("Spring Boot", "Redis", "Docker"), skillMap)
                        ),
                        detail(
                                "AWS 인프라 및 CI/CD 파이프라인 설계/운영",
                                "서비스가 커지면서 배포 과정에서의 수동 작업과 장애 대응 속도가 병목이 되고 있었습니다.",
                                "- AWS ECS/SQS 기반 인프라를 설계하고 서비스별 배포 파이프라인을 CI/CD로 자동화했습니다.\n- Docker로 로컬/배포 환경을 컨테이너화해 환경 차이로 인한 배포 실패를 줄였습니다.\n- Datadog으로 지표를 모니터링하며 장애를 조기에 탐지할 수 있는 체계를 구축했습니다.",
                                "배포 소요 시간을 줄이고 장애 대응 리드타임을 단축시켜, 비즈니스 확장 국면에서도 안정적인 인프라 운영 기반을 마련했습니다.",
                                3,
                                getSkills(List.of("AWS ECS/SQS", "Docker", "Datadog"), skillMap)
                        )
                ),
                getSkills(List.of("Node.js", "TypeScript", "NestJS", "Express", "MongoDB", "Redis", "Spring Boot", "AWS ECS/SQS", "Docker", "Datadog"), skillMap),
                "(주)에듀테크 스타트업",
                "정규직",
                "개발팀 백엔드 파트",
                "Backend & DevOps Engineer"
        ));

        // 3. Educations
        experienceRepository.save(Education.create(
                "대학교 학사 졸업",
                LocalDate.of(2022, 2, 25),
                LocalDate.of(2022, 2, 25),
                "컴퓨터공학 학사 학위 취득",
                "학부 과정에서 컴퓨터공학 전공 지식을 학습하고 학사 학위를 취득했습니다.",
                null,
                12,
                List.of(detail("컴퓨터공학 학사 학위 취득", null, null, null, 0, List.of())),
                List.of(),
                "대학교"
        ));

        experienceRepository.save(Education.create(
                "[Microsoft] AI 엔지니어링 과정 (3기)",
                LocalDate.of(2025, 9, 1),
                LocalDate.of(2026, 3, 15),
                "ML/DL 기초학습, Agentic AI 구축 (LangChain, LangGraph), RAG 구축, AI Azure 기반의 클라우드 엔지니어 학습 (600시간)",
                "Agentic AI와 RAG 아키텍처를 깊이 있게 다루고, 클라우드 환경에서 AI 인프라를 구축하고 운영하는 방법을 익혔습니다.",
                null,
                5,
                List.of(detail("ML/DL 기초학습, Agentic AI 구축 (LangChain, LangGraph), RAG 구축, AI Azure 기반의 클라우드 엔지니어 학습", null, null, null, 0, List.of())),
                getSkills(List.of("ML/DL", "LangChain", "LangGraph", "RAG", "Azure"), skillMap),
                "Microsoft / 대한상공회의소"
        ));

        experienceRepository.save(Education.create(
                "풀스택 프로젝트 실무과정 [청년취업사관학교]",
                LocalDate.of(2023, 5, 1),
                LocalDate.of(2023, 10, 31),
                "TypeScript 기반 풀스택 교육으로 주로 JavaScript/TypeScript 언어에 대한 깊은 이해와 프레임워크 사용법 등을 학습 (265시간)",
                "TypeScript와 React/Express 환경에서 웹 애플리케이션의 풀스택 개발 생태계와 협업 워크플로우를 체화했습니다.",
                null,
                6,
                List.of(detail("TypeScript 기반 풀스택 교육, Express/React 풀스택 프로젝트 협업", null, null, null, 0, List.of())),
                getSkills(List.of("TypeScript", "Node.js", "React", "Express"), skillMap),
                "SBA 청년취업사관학교"
        ));

        experienceRepository.save(Education.create(
                "파이썬 기반 풀스택 부트캠프 [멀티캠퍼스]",
                LocalDate.of(2022, 6, 1),
                LocalDate.of(2022, 12, 31),
                "풀스택 교육으로 Git, HTML, CSS, Django Template Engine을 활용한 MVC 기반 웹사이트 구현 기초를 학습 (980시간)",
                "소프트웨어 개발의 첫 단추인 MVC 아키텍처와 웹 표준, 협업을 위한 형상 관리 도구의 기초를 탄탄히 다졌습니다.",
                null,
                7,
                List.of(detail("Git, HTML, CSS, Django Template Engine을 활용한 웹 사이트 구현 기초 학습", null, null, null, 0, List.of())),
                getSkills(List.of("Python", "Django", "HTML/CSS", "Git"), skillMap),
                "멀티캠퍼스"
        ));

        // 4. Certificates
        experienceRepository.save(Certificate.create(
                "정보처리기사",
                LocalDate.of(2022, 6, 17),
                LocalDate.of(2022, 6, 17),
                "IT 전반의 핵심 이론 및 기술 자격 검증 (한국산업인력공단)",
                "개발 생명주기 전반에 걸친 기초 체력을 공인 자격을 통해 입증했습니다.",
                essayInfo,
                8,
                List.of(detail("소프트웨어 공학, 데이터베이스, 네트워크 등 IT 핵심 이론 검증", null, null, null, 0, List.of())),
                getSkills(List.of("Software Engineering", "Database", "Network"), skillMap),
                "한국산업인력공단"
        ));

        experienceRepository.save(Certificate.create(
                "SQL 개발자(SQLD)",
                LocalDate.of(2024, 9, 20),
                LocalDate.of(2024, 9, 20),
                "데이터베이스 모델링 및 SQL 작성 능력 검증 ((재)한국데이터산업진흥원)",
                "데이터베이스를 단순히 저장소로 쓰는 것을 넘어 성능과 무결성을 고려하여 쿼리하고 모델링할 수 있음을 검증했습니다.",
                essaySql,
                9,
                List.of(detail("RDB 모델링, SQL 작성 및 쿼리 최적화 능력 검증", null, null, null, 0, List.of())),
                getSkills(List.of("SQL", "DB Modeling", "Optimization"), skillMap),
                "(재)한국데이터산업진흥원"
        ));

        experienceRepository.save(Certificate.create(
                "빅데이터분석기사",
                LocalDate.of(2022, 7, 15),
                LocalDate.of(2022, 7, 15),
                "데이터 수집, 전처리, 분석 모형 설계 및 평가 역량 검증 ((재)한국데이터산업진흥원)",
                "데이터를 수집하고 전처리하여 통계적 기법과 ML 모형으로 분석해 유의미한 가치를 추출할 수 있는 이론적 토대를 닦았습니다.",
                essayBigdata,
                10,
                List.of(detail("데이터 전처리, 통계적 가설 검정, 머신러닝 모형 설계 역량 검증", null, null, null, 0, List.of())),
                getSkills(List.of("Data Preprocessing", "Statistics", "Machine Learning"), skillMap),
                "(재)한국데이터산업진흥원"
        ));

        experienceRepository.save(Certificate.create(
                "컴퓨터활용능력 1급",
                LocalDate.of(2018, 11, 16),
                LocalDate.of(2018, 11, 16),
                "스프레드시트 및 데이터베이스 활용 능력 자격 검증 (대한상공회의소)",
                "정량적 데이터 정제 및 비즈니스 데이터 처리에 필요한 기본 오피스 역량을 인증받았습니다.",
                null,
                11,
                List.of(detail("Excel 스프레드시트 및 Access 데이터베이스 활용 검증", null, null, null, 0, List.of())),
                getSkills(List.of("Excel", "Access"), skillMap),
                "대한상공회의소"
        ));
    }

    private Skill getOrCreateSkill(String name, String category, String level, boolean isCore, int order) {
        return skillRepository.findByName(name)
                .orElseGet(() -> skillRepository.save(Skill.create(
                        name,
                        category,
                        level,
                        inferSkillVersion(name),
                        inferSkillComment(name),
                        inferUsageType(name),
                        isCore,
                        order
                )));
    }

    private String inferUsageType(String name) {
        return switch (name) {
            case "Java", "TypeScript", "Node.js", "NestJS", "Express", "MongoDB", "Redis", "Spring Boot", "React", "AWS ECS/SQS", "Docker", "Datadog" -> "WORK_EXPERIENCE";
            case "QueryDSL", "Flyway", "Playwright", "n8n", "Nginx", "Docker Compose", "Grafana", "Loki", "Alloy", "FastAPI", "Cosmos DB", "Azure Functions", "Azure OpenAI", "Teams SDK", "Bicep", "IaC", "gRPC", "Kafka", "Kubernetes" -> "PROJECT_USE";
            default -> "LEARNING";
        };
    }

    private String inferSkillVersion(String name) {
        return switch (name) {
            case "Java" -> "21";
            case "Spring Boot" -> "3";
            case "React" -> "19";
            case "TypeScript" -> "5";
            case "Node.js" -> "20";
            default -> null;
        };
    }

    private String inferSkillComment(String name) {
        return switch (name) {
            case "Java" -> "실무 및 프로젝트 백엔드 주력 언어";
            case "Spring Boot" -> "포트폴리오와 CS Test Bed API 서버에서 활용";
            case "TypeScript" -> "NestJS, Express, React 기반 서비스 구현에 활용";
            case "Redis" -> "세션, 캐시, 실시간 상태 제어 경험";
            case "Docker" -> "로컬 개발과 배포 환경 컨테이너화에 활용";
            case "RAG" -> "AI 면접 질문 생성과 로그 진단 흐름에서 학습 및 적용";
            default -> null;
        };
    }

    private List<Skill> getSkills(List<String> names, Map<String, Skill> skillMap) {
        List<Skill> list = new ArrayList<>();
        for (String name : names) {
            Skill skill = skillMap.get(name);
            if (skill != null) {
                list.add(skill);
            }
        }
        return list;
    }

    private ExperienceDetail.Draft detail(String content, String situation, String actionDetail, String outcome, int displayOrder, List<Skill> skills) {
        return new ExperienceDetail.Draft(null, content, situation, actionDetail, outcome, displayOrder, skills);
    }

    private void cleanupDuplicates() {
        // If we find 'Spring Boot 3.3' in the database, merge it into 'Spring Boot'
        java.util.Optional<Skill> springBoot33Opt = skillRepository.findByName("Spring Boot 3.3");
        java.util.Optional<Skill> springBootOpt = skillRepository.findByName("Spring Boot");
        if (springBoot33Opt.isPresent() && springBootOpt.isPresent()) {
            Skill s33 = springBoot33Opt.get();
            Skill sBase = springBootOpt.get();
            
            // Re-map experience_skill references
            jdbcTemplate.execute("UPDATE experience_skill SET skill_id = " + sBase.getId() + " WHERE skill_id = " + s33.getId() + 
                " AND experience_id NOT IN (SELECT es2.experience_id FROM (SELECT * FROM experience_skill) es2 WHERE es2.skill_id = " + sBase.getId() + ")");
            jdbcTemplate.execute("DELETE FROM experience_skill WHERE skill_id = " + s33.getId());
            
            // Delete the duplicate skill
            skillRepository.delete(s33);
        }
        
        // If 'Spring Boot' is found, make sure its name is 'Spring Boot' and version is '3'
        skillRepository.findByName("Spring Boot").ifPresent(s -> {
            s.update(s.getName(), s.getCategory(), s.getSkillLevel(), "3", s.getComment(), "WORK_EXPERIENCE", s.isCore(), s.getDisplayOrder());
            skillRepository.save(s);
        });

        // Similar cleanup for React 19
        java.util.Optional<Skill> react19Opt = skillRepository.findByName("React 19");
        java.util.Optional<Skill> reactOpt = skillRepository.findByName("React");
        if (react19Opt.isPresent() && reactOpt.isPresent()) {
            Skill r19 = react19Opt.get();
            Skill rBase = reactOpt.get();
            
            jdbcTemplate.execute("UPDATE experience_skill SET skill_id = " + rBase.getId() + " WHERE skill_id = " + r19.getId() + 
                " AND experience_id NOT IN (SELECT es2.experience_id FROM (SELECT * FROM experience_skill) es2 WHERE es2.skill_id = " + rBase.getId() + ")");
            jdbcTemplate.execute("DELETE FROM experience_skill WHERE skill_id = " + r19.getId());
            
            skillRepository.delete(r19);
        }
        
        skillRepository.findByName("React").ifPresent(s -> {
            s.update(s.getName(), s.getCategory(), s.getSkillLevel(), "19", s.getComment(), "WORK_EXPERIENCE", s.isCore(), s.getDisplayOrder());
            skillRepository.save(s);
        });

        // Java 21 -> Java
        skillRepository.findByName("Java 21").ifPresent(s -> {
            s.update("Java", s.getCategory(), s.getSkillLevel(), "21", s.getComment(), "WORK_EXPERIENCE", s.isCore(), s.getDisplayOrder());
            skillRepository.save(s);
        });

        // TypeScript version -> 5
        skillRepository.findByName("TypeScript").ifPresent(s -> {
            s.update(s.getName(), s.getCategory(), s.getSkillLevel(), "5", s.getComment(), s.getUsageType(), s.isCore(), s.getDisplayOrder());
            skillRepository.save(s);
        });

        // Node.js version -> 20
        skillRepository.findByName("Node.js").ifPresent(s -> {
            s.update(s.getName(), s.getCategory(), s.getSkillLevel(), "20", s.getComment(), s.getUsageType(), s.isCore(), s.getDisplayOrder());
            skillRepository.save(s);
        });
    }
}
