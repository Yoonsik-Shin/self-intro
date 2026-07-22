package com.selfintro.study.config;

import com.selfintro.modules.experience.domain.*;
import com.selfintro.modules.printtemplate.domain.PrintTemplate;
import com.selfintro.modules.printtemplate.domain.PrintTemplateRepository;
import com.selfintro.modules.profile.domain.ProfileRepository;
import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.modules.skill.domain.SkillRepository;
import com.selfintro.study.entity.*;
import com.selfintro.study.repository.StudyCategoryRepository;
import com.selfintro.study.repository.StudyRepository;
import com.selfintro.study.repository.TagRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private final ExperiencePlacementRepository experiencePlacementRepository;
    private final ExperiencePlacementDetailRepository experiencePlacementDetailRepository;
    private final StudyRepository studyRepository;
    private final StudyCategoryRepository studyCategoryRepository;
    private final TagRepository tagRepository;
    private final PrintTemplateRepository printTemplateRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // Clean up duplicates if existing in database
        cleanupDuplicates();

        // 1. Profile Seeding
        seedProfile();

        // 2. Skills, Experiences & Studies Seeding
        seedSkillsAndExperiencesAndStudies();

        // 3. Print Templates Seeding
        seedPrintTemplates();
    }

    private void seedProfile() {
        if (profileRepository.count() > 0) {
            return;
        }

        profileRepository.save(
                com.selfintro.modules.profile.domain.Profile.create(
                        "신윤식",
                        "Yoonsik Shin",
                        "Software Engineer",
                        "에듀테크 실무 백엔드 개발 경험과 Java/Spring Boot, MSA 및 Cloud 인프라 구축 지식을 기반으로 안정적이고 최적화된 아키텍처를 설계하고 운영합니다.",
                        "Java / Node.js / Cloud",
                        "실시간 아키텍처 및 콘텐츠 개선 중",
                        "https://github.com/Yoonsik-Shin",
                        "aaa946@naver.com",
                        "010-5171-0994"));
    }

    private void seedSkillsAndExperiencesAndStudies() {
        if (experienceRepository.count() > 0) {
            seedCoreProjectPlacements();
            syncExistingStudies();
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
        Skill reactSkill = getOrCreateSkill("React", "FRAMEWORK", "중급", false, 10);
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
        skillMap.put("QueryDSL", getOrCreateSkill("QueryDSL", "FRAMEWORK", "중급", false, 13));
        skillMap.put("Cosmos DB", getOrCreateSkill("Cosmos DB", "DATABASE", "초급", false, 14));
        skillMap.put("Redis", getOrCreateSkill("Redis", "DATABASE", "중급", true, 15));
        skillMap.put("MongoDB", getOrCreateSkill("MongoDB", "DATABASE", "중급", false, 16));
        skillMap.put("SQL", getOrCreateSkill("SQL", "DATABASE", "중급", false, 17));
        skillMap.put(
                "Database Modeling",
                getOrCreateSkill("Database Modeling", "DATABASE", "중급", false, 18));
        skillMap.put(
                "SQL Query Optimization",
                getOrCreateSkill("SQL Query Optimization", "DATABASE", "중급", false, 19));
        skillMap.put("PostgreSQL", getOrCreateSkill("PostgreSQL", "DATABASE", "중급", false, 54));
        skillMap.put("MySQL", getOrCreateSkill("MySQL", "DATABASE", "중급", false, 55));
        skillMap.put("Excel", getOrCreateSkill("Excel", "DATABASE", "초급", false, 20));
        skillMap.put("Access", getOrCreateSkill("Access", "DATABASE", "초급", false, 21));

        // DevOps / Infra
        skillMap.put("Flyway", getOrCreateSkill("Flyway", "DEVOPS", "중급", false, 22));
        skillMap.put("Playwright", getOrCreateSkill("Playwright", "DEVOPS", "중급", false, 23));
        skillMap.put("n8n", getOrCreateSkill("n8n", "DEVOPS", "중급", false, 24));
        skillMap.put("Nginx", getOrCreateSkill("Nginx", "DEVOPS", "중급", false, 25));
        skillMap.put(
                "Docker Compose", getOrCreateSkill("Docker Compose", "DEVOPS", "중급", false, 26));
        skillMap.put("Grafana", getOrCreateSkill("Grafana", "DEVOPS", "중급", false, 27));
        skillMap.put("Loki", getOrCreateSkill("Loki", "DEVOPS", "중급", false, 28));
        skillMap.put("Alloy", getOrCreateSkill("Alloy", "DEVOPS", "중급", false, 29));
        skillMap.put("AWS ECS", getOrCreateSkill("AWS ECS", "DEVOPS", "중급", true, 30));
        skillMap.put("Amazon SQS", getOrCreateSkill("Amazon SQS", "DEVOPS", "중급", false, 31));
        skillMap.put("Docker", getOrCreateSkill("Docker", "DEVOPS", "중급", true, 31));
        skillMap.put("Datadog", getOrCreateSkill("Datadog", "DEVOPS", "초급", false, 32));
        skillMap.put(
                "Infrastructure as Code (IaC)",
                getOrCreateSkill("Infrastructure as Code (IaC)", "DEVOPS", "초급", false, 33));
        skillMap.put("Bicep", getOrCreateSkill("Bicep", "DEVOPS", "초급", false, 34));
        skillMap.put("Kubernetes", getOrCreateSkill("Kubernetes", "DEVOPS", "중급", true, 35));
        skillMap.put(
                "Azure Functions", getOrCreateSkill("Azure Functions", "DEVOPS", "중급", false, 45));
        skillMap.put("Apache Kafka", getOrCreateSkill("Apache Kafka", "DEVOPS", "중급", false, 57));
        skillMap.put(
                "Azure Log Analytics",
                getOrCreateSkill("Azure Log Analytics", "DEVOPS", "중급", false, 59));
        skillMap.put(
                "GitHub Actions", getOrCreateSkill("GitHub Actions", "DEVOPS", "중급", false, 62));

        // AI / RAG
        skillMap.put("Azure OpenAI", getOrCreateSkill("Azure OpenAI", "AI_RAG", "중급", false, 36));
        skillMap.put("Teams SDK", getOrCreateSkill("Teams SDK", "FRAMEWORK", "중급", false, 37));
        skillMap.put("LLM", getOrCreateSkill("LLM", "AI_RAG", "중급", false, 38));
        skillMap.put("STT/TTS", getOrCreateSkill("STT/TTS", "AI_RAG", "중급", false, 39));
        skillMap.put("RAG", getOrCreateSkill("RAG", "AI_RAG", "중급", false, 40));
        skillMap.put(
                "Machine Learning / Deep Learning",
                getOrCreateSkill("Machine Learning / Deep Learning", "AI_RAG", "중급", false, 41));
        skillMap.put("LangChain", getOrCreateSkill("LangChain", "AI_RAG", "중급", false, 42));
        skillMap.put("LangGraph", getOrCreateSkill("LangGraph", "AI_RAG", "초급", false, 43));
        skillMap.put("Azure", getOrCreateSkill("Azure", "DEVOPS", "중급", false, 44));
        skillMap.put(
                "Data Preprocessing",
                getOrCreateSkill("Data Preprocessing", "AI_RAG", "중급", false, 45));
        skillMap.put("Statistics", getOrCreateSkill("Statistics", "AI_RAG", "중급", false, 46));
        skillMap.put("gRPC", getOrCreateSkill("gRPC", "FRAMEWORK", "중급", false, 56));
        skillMap.put("KQL", getOrCreateSkill("KQL", "LANGUAGE", "중급", false, 58));
        skillMap.put(
                "Spring Data JPA",
                getOrCreateSkill("Spring Data JPA", "FRAMEWORK", "중급", false, 60));
        skillMap.put(
                "Spring Security",
                getOrCreateSkill("Spring Security", "FRAMEWORK", "중급", false, 61));

        // Theory / Others
        skillMap.put(
                "Software Engineering",
                getOrCreateSkill("Software Engineering", "ETC", "중급", false, 48));
        skillMap.put("Database", getOrCreateSkill("Database", "ETC", "중급", false, 49));
        skillMap.put("Network", getOrCreateSkill("Network", "ETC", "중급", false, 50));

        // Study Categories Map
        // NOTE: study_category rows normally come from Flyway migration V6. When running
        // locally with Flyway disabled (H2 create-drop), that seed data never lands, so
        // recreate it here to keep the local dev bootstrap self-contained.
        if (studyCategoryRepository.count() == 0) {
            jdbcTemplate.update(
                    "INSERT INTO study_category (id, name, slug, display_order) VALUES "
                            + "(1, '프로젝트', 'project', 1), (2, '공부/학습', 'education', 2), (3, '자격증', 'certificate', 3), "
                            + "(4, '백엔드', 'backend', 4), (5, '인프라/DevOps', 'devops', 5), (6, 'AI/RAG', 'ai-rag', 6), "
                            + "(7, '회고', 'retrospective', 7)");
        }
        Map<String, StudyCategory> categoryMap = new HashMap<>();
        studyCategoryRepository.findAll().forEach(cat -> categoryMap.put(cat.getSlug(), cat));

        // Essays

        // Seed Career and the concrete work projects performed within it.
        List<ExperienceDetail.Draft> workProjectDetails =
                List.of(
                        detail(
                                "AI 튜터링 및 학습 플랫폼 핵심 API 서버 개발",
                                "커리큘럼 기반 AI 학습 플랫폼에서 AI 튜터와 학생 간 실시간 메시징을 처리하는 핵심 Express API 서버가 필요했습니다. 튜터링 세션은 문제풀이·복습·챌린지·개념보강 4가지 컨텍스트로 나뉘어 있었지만 하나의 평평한 모델로 뒤섞여 있어 확장이 어려웠습니다.",
                                "- AI 튜터 메시징 대화 세션을 4개 컨텍스트로 다형성 있게 추상화하는 도메인 모델을 설계했습니다.\n- 외부 AI 서버와의 통신을 SQS 기반 비동기 큐로 연동해 응답 지연에도 안정적으로 동작하도록 했습니다.\n- MongoDB 트랜잭션을 적용해 세션 상태 변화의 데이터 정합성을 보장했습니다.",
                                "전체 서비스 9,500여 개 커밋 중 약 43%를 담당하며 핵심 API 서버 개발을 리드했고, 신규 학습 컨텍스트 추가 시에도 기존 모델을 재사용할 수 있는 구조를 만들었습니다.",
                                0,
                                getSkills(
                                        List.of("Node.js", "TypeScript", "Express", "MongoDB"),
                                        skillMap)),
                        detail(
                                "프론트엔드 중계용 BFF 서버 설계 및 구축",
                                "여러 프론트엔드 클라이언트(교사용/학생용)가 백엔드 API를 직접 호출하면서 중복 로직과 N+1 호출이 늘어나고 있었습니다.",
                                "- NestJS 기반 BFF(Backend for Frontend) 서버를 처음부터 부트스트랩했습니다.\n- 교사용 실시간 학생 관리(Presence) 모듈을 BFF 레이어에서 설계해 프론트엔드가 여러 API를 조합할 필요 없이 하나의 엔드포인트로 소비하도록 했습니다.\n- SubmittedProblem 도메인을 CQRS로 리팩토링하고 6만 건 규모의 마이그레이션을 총괄했습니다.",
                                "프론트엔드 팀의 API 조합 로직을 BFF 뒤로 숨겨 클라이언트 코드 복잡도를 낮추고, 조회 성능 병목이던 SubmittedProblem 도메인의 응답 속도를 개선했습니다.",
                                1,
                                getSkills(List.of("NestJS", "TypeScript", "Redis"), skillMap)),
                        detail(
                                "Spring Boot 기반 사내 백오피스 단독 구축",
                                "무료체험 프로세스 개선을 위한 사내 TF에서, 여러 부서가 공용으로 쓸 수 있는 백오피스 도구가 없어 반복 수작업이 발생하고 있었습니다.",
                                "- Spring Boot 3.2 + Security + JPA 기반 백오피스 서버(144개 클래스)를 1인으로 설계·개발했습니다.\n- NCP 카카오 알림톡(HMAC 서명)과 MS Teams 웹훅 연동으로 알림을 자동화했습니다.\n- Redis Session을 활용해 크로스도메인 쿠키 인증 문제를 해결했습니다.",
                                "여러 부서가 공용하는 6만여 개 문항 조회를 위한 NestJS 마이크로서비스와 사내 npm 공통 패키지까지 확장 개발하며, 반복 수작업을 자동화된 백오피스 워크플로우로 대체했습니다.",
                                2,
                                getSkills(List.of("Spring Boot", "Redis", "Docker"), skillMap)),
                        detail(
                                "AWS 인프라 및 CI/CD 파이프라인 설계/운영",
                                "서비스가 커지면서 배포 과정에서의 수동 작업과 장애 대응 속도가 병목이 되고 있었습니다.",
                                "- AWS ECS 기반 인프라를 설계하고 서비스별 배포 파이프라인을 CI/CD로 자동화했습니다.\n- Amazon SQS로 비동기 메시징을 분리해 외부 시스템의 지연에도 안정적으로 처리했습니다.\n- Docker로 로컬/배포 환경을 컨테이너화해 환경 차이로 인한 배포 실패를 줄였습니다.\n- Datadog으로 지표를 모니터링하며 장애를 조기에 탐지할 수 있는 체계를 구축했습니다.",
                                "배포 소요 시간을 줄이고 장애 대응 리드타임을 단축시켜, 비즈니스 확장 국면에서도 안정적인 인프라 운영 기반을 마련했습니다.",
                                3,
                                getSkills(
                                        List.of(
                                                "AWS ECS",
                                                "Amazon SQS",
                                                "Docker",
                                                "Datadog",
                                                "GitHub Actions"),
                                        skillMap)),
                        detail(
                                "공용 문제(Problem) 서비스 및 사내 공통 패키지 모노레포 단독 구축",
                                "서비스 확장으로 인해 여러 백엔드 서버 간 동일한 설정 코드와 DB 커넥션 래퍼, 에러 핸들러 등의 코드 복잡도가 늘어나고 중복 복사 현상이 심화되었습니다.",
                                "- NestJS 11 기반의 공용 문제 조회 마이크로서비스를 단독 설계 및 구축하여 6만여 문항 데이터를 대용량 제공하도록 구성했습니다.\n- npm workspaces 기반 모노레포를 구축해 공통 에러 변환, DB 트랜잭션, SQS 연동 로직을 패키지화해 GitHub Packages로 배포했습니다.\n- 신규 프로젝트 생성을 표준화하기 위해 CLI 스캐폴딩 도구를 개발 및 적용했습니다.",
                                "마이크로서비스들의 공통 아키텍처 패턴을 통일하고, 새로운 서버 모듈 추가 세팅 속도를 크게 단축하여 개발 리소스를 절감했습니다.",
                                4,
                                getSkills(
                                        List.of("NestJS", "TypeScript", "MongoDB", "Docker"),
                                        skillMap)));

        Career savedCareer =
                (Career)
                        experienceRepository.save(
                                Career.create(
                                        "에듀테크 스타트업 Backend & DevOps 경력",
                                        LocalDate.of(2023, 12, 1),
                                        LocalDate.of(2025, 10, 31),
                                        "커리큘럼 기반 AI 학습 플랫폼의 핵심 Express API 서버와 NestJS 기반 BFF(Backend for Frontend) 서버를 부트스트랩하고 설계·개발을 전담했습니다. AI 튜터 메시징 대화 세션 모델 추상화 및 SQS 비동기 연동, 교사용 실시간 학생 관리(Presence) 모듈 설계, SubmittedProblem 도메인 CQRS 리팩토링 및 대형 마이그레이션을 총괄했습니다. Spring Boot 기반 백오피스 서비스도 1인 단독 구축하였습니다.",
                                        "실무 서비스의 9,500여 개 커밋 중 약 43%를 담당한 최다 기여자로서 비즈니스 확장 시 도메인 관심사 격리, 성능 튜닝, 그리고 인프라 CI/CD 파이프라인 전반을 주도하는 리드 엔지니어로 성장했습니다.",
                                        4,
                                        List.of(),
                                        getSkills(
                                                List.of(
                                                        "Node.js",
                                                        "TypeScript",
                                                        "NestJS",
                                                        "Express",
                                                        "MongoDB",
                                                        "Redis",
                                                        "Spring Boot",
                                                        "Spring Data JPA",
                                                        "Spring Security",
                                                        "MySQL",
                                                        "AWS ECS",
                                                        "Amazon SQS",
                                                        "Docker",
                                                        "Datadog",
                                                        "GitHub Actions"),
                                                skillMap),
                                        true,
                                        "에듀테크 실무 (1년 11개월)",
                                        "(주)에듀테크 스타트업",
                                        "정규직",
                                        "개발팀 백엔드 파트",
                                        "Backend & DevOps Engineer"));

        Project workApiBffProject =
                experienceRepository.save(
                        Project.create(
                                "학습 플랫폼 핵심 API 및 BFF 구축",
                                savedCareer.getPeriodStart(),
                                savedCareer.getPeriodEnd(),
                                "AI 튜터링 세션을 4개 컨텍스트로 추상화한 Express API와 교사용·학생용 클라이언트를 중계하는 NestJS BFF를 설계·개발했습니다.",
                                "9,500여 개 커밋 중 약 43%를 담당하며 핵심 API, BFF, CQRS 리팩토링과 대규모 데이터 마이그레이션을 주도했습니다.",
                                4,
                                List.of(workProjectDetails.get(0), workProjectDetails.get(1)),
                                getSkills(
                                        List.of(
                                                "Node.js",
                                                "TypeScript",
                                                "Express",
                                                "MongoDB",
                                                "NestJS",
                                                "Redis"),
                                        skillMap),
                                false,
                                null,
                                "work-learning-api-bff",
                                savedCareer.getRole(),
                                43,
                                null,
                                savedCareer));

        Project workBackofficeProject =
                experienceRepository.save(
                        Project.create(
                                "Spring Boot 기반 사내 백오피스 구축",
                                savedCareer.getPeriodStart(),
                                savedCareer.getPeriodEnd(),
                                "여러 부서의 반복 수작업을 줄이기 위해 Spring Boot 3.2 기반 사내 백오피스와 알림·인증 자동화 흐름을 단독 구축했습니다.",
                                "6만여 개 문항 조회와 부서 공용 워크플로우를 자동화하며 독립적인 사내 서비스 설계·운영 경험을 확보했습니다.",
                                5,
                                List.of(workProjectDetails.get(2)),
                                workProjectDetails.get(2).skills(),
                                false,
                                null,
                                "work-spring-backoffice",
                                savedCareer.getRole(),
                                100,
                                null,
                                savedCareer));

        Project workInfraProject =
                experienceRepository.save(
                        Project.create(
                                "AWS 인프라 및 CI/CD 파이프라인 구축·운영",
                                savedCareer.getPeriodStart(),
                                savedCareer.getPeriodEnd(),
                                "AWS ECS·SQS 기반 인프라와 Docker 배포 환경, GitHub Actions CI/CD 및 Datadog 모니터링 체계를 구축·운영했습니다.",
                                "배포 수작업과 환경 차이를 줄이고 장애를 조기에 발견할 수 있는 안정적인 서비스 운영 기반을 마련했습니다.",
                                6,
                                List.of(workProjectDetails.get(3)),
                                workProjectDetails.get(3).skills(),
                                false,
                                null,
                                "work-aws-cicd",
                                savedCareer.getRole(),
                                null,
                                null,
                                savedCareer));

        Project workProblemProject =
                experienceRepository.save(
                        Project.create(
                                "공용 Problem 서비스 및 모노레포 패키지 구축",
                                savedCareer.getPeriodStart(),
                                savedCareer.getPeriodEnd(),
                                "6만여 문항을 제공하는 NestJS 공용 문제 서비스와 npm workspaces 기반 공통 패키지 모노레포를 단독 구축했습니다.",
                                "마이크로서비스의 공통 아키텍처 패턴을 표준화하고 신규 서버 모듈의 초기 설정 시간을 단축했습니다.",
                                7,
                                List.of(workProjectDetails.get(4)),
                                workProjectDetails.get(4).skills(),
                                false,
                                null,
                                "work-problem-monorepo",
                                savedCareer.getRole(),
                                100,
                                null,
                                savedCareer));

        // Seed Experience - Projects
        Experience project1 =
                experienceRepository.save(
                        Project.create(
                                "고객문의 수집·자동응답 통합 테스트베드 (기여도 100%)",
                                LocalDate.of(2026, 6, 1),
                                LocalDate.of(2026, 7, 31),
                                "고객 문의 수집·관리 및 브라우저 자동화(Playwright)와 노코드 n8n 워크플로우를 활용해 네이버 카페, 이메일 등의 문의 수작업 처리 과정을 자동화한 E2E 테스트베드 시스템입니다. DB 기반 RBAC 및 PII 암호화, Nginx auth_request 인증 계층과 Loki/Grafana/Alloy로 실시간 모니터링 환경을 구성했습니다.",
                                "HMAC 인증 토큰과 Nginx auth_request를 활용해 내부 툴들의 보안 계층을 구축하고, n8n 분산 Lock 패턴과 무중단 개인정보(PII) 암호화 마이그레이션을 통해 운영 안정성을 하드닝했습니다.",
                                1,
                                List.of(
                                        detail(
                                                "네이버 로그인 보안 우회 및 Playwright 기반 세션 관리 자동화",
                                                "네이버 카페 문의 수집 및 답변 등록 시, 캡차 및 2단계 인증 등 강력한 로그인 보안 정책으로 단순 API 직접 호출이 불가능하고 세션 만료 시마다 수동 개입이 수반됨.",
                                                "외부 인터넷 다운로드 없이 폐쇄망 동작이 가능한 Playwright 워커 구축, 일회용 번호(OTP) 기반 자동 로그인 및 쿠키 노출 방지 전송 구조 구현.",
                                                "- Playwright Headless 브라우저 워커 구축\n- 스마트폰 네이버 앱 8자리 OTP 입력 로그인 자동화\n- NID_AUT, NID_SES 쿠키 AES-256-GCM 암호화 DB 보관\n- 응답 바디 세션 노출 방지를 위한 HTTP Set-Cookie 및 X-Naver-Cookie 헤더 전송 구조 전환",
                                                "수동 로그인 개입을 원클릭 OTP 번호 입력으로 일원화하고, 세션 유효성 강제 동기화(syncSessionStatus) 및 네이버 카페 내 게시글 답변·대댓글 자동 등록 E2E 파이프라인 안착.",
                                                "네이버 카페 문의 수집 시 2단계 인증과 CAPTCHA 챌린지로 인해 세션 만료 때마다 수동 개입이 발생하는 문제를 해결하기 위해, Playwright 브라우저 워커와 자바 백엔드를 연동하는 OTP 세션 자동화 파이프라인을 구축했습니다. 스마트폰 네이버 앱의 일회용 번호로 자동 로그인 후 NID_AUT, NID_SES 쿠키를 추출하고 AES-256-GCM으로 암호화하여 DB에 영속화했습니다. 또한 연동 로깅 과정에서의 세션 누출을 방지하고자 JSON 응답 바디에서 쿠키를 제거하고 HTTP Set-Cookie 및 X-Naver-Cookie 헤더 방식으로 보안 전송 구조를 개편했습니다. 이를 통해 수동 로그인 단계를 원클릭 OTP 인증으로 전환하고 네이버 카페 내 답변 및 대댓글 등록 E2E 자동화를 완수했습니다.",
                                                0,
                                                getSkills(
                                                        List.of(
                                                                "Playwright",
                                                                "Docker Compose",
                                                                "Nginx"),
                                                        skillMap)),
                                        detail(
                                                "이메일 헤더 분석 및 본문 정규화를 통한 문의 스레드/상태 자동 연동 엔진",
                                                "이메일 고객 문의 유입 시 동일 사용자의 회신이나 관련 메일이 개별 건으로 무작위 적재되어 CS 상담원의 중복 답변 및 문의 맥락 파편화가 발생함.",
                                                "이메일 헤더 추적과 Heuristic 매칭을 결합해 파편화된 이메일을 단일 대화 스레드로 자동 병합하고 고객 회신 시 문의 상태를 자동으로 제어함.",
                                                "- RFC 5322 이메일 헤더(Message-ID, In-Reply-To, References) 파싱으로 부모 문의 역추적\n- 회신 접두사(Re:, Fwd:) 제거 정규화 및 발신자 이메일 HMAC-SHA256 해시값(email_sender_hash) B-Tree 인덱스 기반 Heuristic 매칭\n- RESOLVED 문의에 추가 회신 유입 시 OPEN 상태 자동 복귀 및 InquiryWorkLog 감사 로깅",
                                                "회신 메일의 중복 티켓 생성 방지, 연관 문의 단일 스레드 통합을 통한 CS 상담 컨텍스트 일원화, 해결된 문의의 자동 재오픈을 통한 문의 누락 방지 구조 확립.",
                                                "이메일 고객 문의 유입 시 회신 메일이 개별 건으로 무작위 적재되어 중복 답변과 컨텍스트 혼선이 발생하는 문제를 해결하기 위해, RFC 5322 이메일 헤더 기반 스레딩 및 상태 제어 엔진을 개발했습니다. Message-ID, In-Reply-To, References 헤더 체인을 역추적해 부모 문의를 자동 매핑하고, 헤더 유실 시 발신자 이메일 HMAC-SHA256 해시값과 정규화된 제목을 결합한 Heuristic 매칭을 적용했습니다. 또한 해결(RESOLVED) 상태 문의에 추가 회신 유입 시 OPEN으로 자동 복귀시키고 InquiryWorkLog에 감사 이력을 기록함으로써 문의 누락을 방지하고 CS 상담 생산성을 높였습니다.",
                                                1,
                                                getSkills(
                                                        List.of(
                                                                "Java",
                                                                "Spring Boot",
                                                                "Spring Data JPA",
                                                                "Spring Security",
                                                                "QueryDSL",
                                                                "PostgreSQL"),
                                                        skillMap)),
                                        detail(
                                                "JPA Converter 기반 개인정보(PII) AES/GCM 암호화 및 무중단 마이그레이션",
                                                "고객 문의 본문, 이메일, 전화번호 등 민감 개인정보(PII)가 DB에 평문 저장되어 개인정보보호법 준수 및 유출 리스크가 존재함.",
                                                "영속성 계층 암복호화 자동화, 빠른 등치 조회를 위한 해시 컬럼 구축, 기존 평문 적재 데이터의 서비스 중단 없는 안전 암호화 이관.",
                                                "- JPA AttributeConverter(EncryptedStringConverter) 및 Jackson Mixin 기반 AES-256-GCM 암복호화 적용\n- 발신자 이메일 단방향 HMAC-SHA256 해시(email_sender_hash) 컬럼 설계로 O(log N) B-Tree 인덱스 등치 조회 구현\n- 복호화 실패 시 평문을 반환하는 decryptOrPassThrough 하위 호환 로직 및 독립 CLI 마이그레이션 도구(PiiEncryptionMigrationTool) 가동",
                                                "DB 유출 시에도 안전한 PII 암호화 보안 규격을 달성하고, 앱 기동 중단 없는 무중단(Zero-Downtime) 암호화 마이그레이션 체계 완수.",
                                                "고객 문의 데이터 내 민감 개인정보(PII)를 보호하기 위해 JPA Attribute Converter 및 Jackson Mixin 기반의 AES-256-GCM 저장소 암호화 아키텍처를 구축했습니다. AES/GCM 암호문의 무작위 IV 특성으로 인한 등치 검색 불가를 해결하고자 발신자 이메일의 HMAC-SHA256 해시(email_sender_hash) 컬럼을 병행 설계해 B-Tree 인덱스 조회를 보장했습니다. 또한 앱 기동 경로와 분리된 독립 CLI 마이그레이션 도구(PiiEncryptionMigrationTool)를 개발하고 Decrypt-or-PassThrough 예외 처리 패턴을 적용하여 서비스 중단 없는 무중단 데이터 암호화 이관 체계를 완성했습니다.",
                                                2,
                                                getSkills(
                                                        List.of(
                                                                "Java",
                                                                "Spring Boot",
                                                                "Spring Data JPA",
                                                                "PostgreSQL",
                                                                "Flyway"),
                                                        skillMap)),
                                        detail(
                                                "n8n 워크플로우 및 Spring Boot REST API 기반 멀티채널 문의 통합 수집 파이프라인",
                                                "네이버 카페, 이메일, 구글 시트 등 다중 채널 문의 내역을 수동 수집 관리함에 따른 행정 공수 낭비 및 데이터 파편화가 발생함.",
                                                "채널별 정형화 수집 자동화, 수집 중복 방지 멱등성 보장, 첨부파일 S3 스토리지 연동.",
                                                "- n8n 노코드 워크플로우로 5분 주기 네이버 카페 크롤링 및 IMAP 메일 수신 자동화\n- Spring Boot 백엔드에서 4종 다형적 JSONB 메타데이터(EmailMetadata, NaverCafeMetadata 등) 구조 검증 및 parsing 처리\n- InquiryUniqueKeyGenerator 고유 키 생성 엔진 및 JDBC bulkInsert 구현\n- MinIO S3 오브젝트 스토리지 연동 및 첨부 이미지 상대경로 JSONB 매핑 최적화",
                                                "이종 채널의 문의 데이터를 단일 DB 스키마로 통합 수집하고, 고유키 기반 중복 방지 및 파일 스토리지 연동 인프라 안착.",
                                                "네이버 카페, 이메일, 구글 시트 등 여러 채널로 파편화된 고객 문의 수집 과정을 자동화하기 위해, n8n 워크플로우와 Spring Boot REST API를 연동한 멀티채널 통합 수집 파이프라인을 구축했습니다. 채널별 다형적 JSONB 메타데이터 구조를 정형화하고, 중복 유입을 차단하는 InquiryUniqueKeyGenerator 고유 키 생성 엔진과 Bulk Insert를 적용했습니다. 또한 MinIO S3 기술을 연동해 첨부 이미지 저장 및 상대경로 매핑을 최적화함으로써 대용량 문의 통합 관리 기반을 다졌습니다.",
                                                3,
                                                getSkills(
                                                        List.of(
                                                                "Spring Boot",
                                                                "n8n",
                                                                "Docker Compose"),
                                                        skillMap)),
                                        detail(
                                                "Nginx auth_request 계층 SSO 연동 및 통합 접근 제어 구축",
                                                "백오피스, n8n, Grafana, MinIO 콘솔 등 개별 어드민 도구들에 대한 접근 제어 파편화 및 외부 무단 접속 위협이 존재함.",
                                                "경계 네트워크 보안 강화, 외부 접근 차단 및 쿠키 기반 단일 인증(SSO) 위임 처리.",
                                                "- Nginx Reverse Proxy 수준 LAN/VPN IP 필터링 & Basic Auth 적용 및 X-Remote-User 신뢰 헤더 터널링\n- Nginx auth_request /_admin_tool_auth 지시어와 백엔드 /api/v1/auth/admin-tool-check 서브루틴 연동\n- cs_admin_access 쿠키 기반 어드민 툴(/n8n/, /grafana/, /minio/) 통합 접근 통제",
                                                "백오피스 및 개발/운영 어드민 도구들의 보안 접근 규격을 단일 통로로 일원화하고 무단 외부 접근 차단.",
                                                "사내 백오피스, n8n, Grafana, MinIO 등 파편화된 개별 어드민 툴들의 보안 접근을 일원화하고자, Nginx 경계 보안 및 auth_request 기반 통합 인증(SSO) 계층을 설계했습니다. Nginx 수준에서 LAN/VPN IP 필터링과 Basic Auth를 적용하고, 검증된 사용자명을 X-Remote-User 헤더로 백엔드 Spring Security와 안전하게 연동했습니다. 또한 Nginx auth_request 서브루틴을 활용해 쿠키 기반 백엔드 권한 검증(/api/v1/auth/admin-tool-check)을 거쳐 어드민 툴 접속을 통제함으로써, 개별 툴 복수 로그인 없이 단일 지점에서 보안 접근 제어를 완료했습니다.",
                                                4,
                                                getSkills(
                                                        List.of(
                                                                "Nginx",
                                                                "Spring Security",
                                                                "Docker Compose"),
                                                        skillMap)),
                                        detail(
                                                "Logback JSON 로깅 & Grafana Alloy / Loki 관측성 모니터링 구축",
                                                "분산 컨테이너 환경에서 런타임 예외 발생 시 개별 로그 파일 직접 조회로 인한 원인 추적 비효율 및 모니터링 체계 미비.",
                                                "Logback 중앙 JSON 로깅, Grafana Alloy/Loki 로그 수집 파이프라인 및 실시간 가시화 대시보드 구축.",
                                                "- logback-spring.xml 구성으로 Machine-Readable JSON Line 로그 파일 분리(app.log, error.log, access.log)\n- Docker Volume 기반 Grafana Alloy 로그 수집기 및 Loki 중앙 인덱싱 연동\n- Grafana 대시보드 구축으로 실시간 5xx 예외 에러율 및 서버 메트릭 가시화",
                                                "분산 컨테이너 로그의 중앙집중화, 실시간 5xx 예외 감지 대시보드 정착 및 시스템 장애 원인 파악 리드타임 개선.",
                                                "분산 컨테이너 환경에서 런타임 예외 발생 시 개별 로그 파일 추적 비효율을 해결하기 위해, Logback과 Grafana Stack(Alloy + Loki + Grafana) 기반의 중앙집중 관측성(Observability) 파이프라인을 구축했습니다. Logback 정책을 통해 Machine-Readable JSON 포맷 로그를 저장하고, Grafana Alloy 수집기로 로그를 실시간 파싱하여 Loki로 중앙 전송했습니다. 이를 Grafana 대시보드와 연동해 실시간 5xx 에러율과 시스템 메트릭을 시각화함으로써 장애 발생 시 원인 분석 및 디버깅 체계를 확립했습니다.",
                                                5,
                                                getSkills(
                                                        List.of(
                                                                "Nginx", "Grafana", "Loki",
                                                                "Alloy"),
                                                        skillMap))),
                                getSkills(
                                        List.of(
                                                "Java",
                                                "Spring Boot",
                                                "Spring Data JPA",
                                                "Spring Security",
                                                "QueryDSL",
                                                "PostgreSQL",
                                                "Flyway",
                                                "Playwright",
                                                "n8n",
                                                "Nginx",
                                                "Docker Compose",
                                                "Grafana",
                                                "Loki",
                                                "Alloy"),
                                        skillMap),
                                true,
                                "CS",
                                "project-cs-testbed",
                                "Backend & DevOps Engineer",
                                100));

        // LogDoctor Project Seeding (detailed)
        seedLogDoctorProject(skillMap, categoryMap);

        experienceRepository.save(
                Project.create(
                        "음성 스트리밍 및 RAG 면접 관리 (기여도 100%)",
                        LocalDate.of(2025, 12, 1),
                        LocalDate.of(2026, 3, 31),
                        "실시간 AI 모의면접 및 역량 평가 서비스의 전체 시스템 아키텍처와 분산 메시징 처리 부분을 담당했습니다. gRPC 기반 실시간 음성 스트리밍 제어, Redis/Kafka 비동기 메시지 큐를 통한 음성 데이터 및 AI 상태 변경 큐잉, 이력서 RAG 질문 생성 기능 등을 구현하고 Kubernetes 환경에 배포했습니다. (개인 프로젝트)",
                        "비동기 메시징 및 대용량 음성 스트리밍 환경에서 발생할 수 있는 데이터 유실과 지연 병목을 제어하며 분산 인프라 설계 능력을 키웠습니다.",
                        3,
                        List.of(
                                detail(
                                        "gRPC/Redis/Kafka 기반 실시간 음성 스트리밍, 이력서 RAG 질문 생성 서비스를 설계했습니다.",
                                        null,
                                        null,
                                        null,
                                        0,
                                        List.of())),
                        getSkills(
                                List.of(
                                        "React",
                                        "gRPC",
                                        "Redis",
                                        "Apache Kafka",
                                        "LLM",
                                        "STT/TTS",
                                        "RAG",
                                        "Kubernetes"),
                                skillMap),
                        true,
                        "AI면접",
                        "project-ai-interview",
                        "Core Architect & Developer",
                        100));

        experienceRepository.save(
                Project.create(
                        "학습 API QA 자동화 및 부하 시뮬레이션 도구 (기여도 80%)",
                        LocalDate.of(2024, 4, 18),
                        LocalDate.of(2024, 9, 21),
                        "실제 UI 상호작용 없이 대량의 학생 학습 시나리오(출석, 문제풀이 제출, 비디오 진행률 업데이트, 리뷰 복습 등)를 API 단에서 자동으로 시뮬레이션해 기능 이상 및 부하를 모니터링하는 테스팅 툴입니다. Axios 및 가중치 랜덤 알고리즘을 도입했습니다.",
                        "E2E 관점에서 전체 도메인의 핵심 비즈니스 흐름을 관통하는 통합 검증 지식을 체득하고 가중치 기반 시뮬레이션을 구현했습니다.",
                        6,
                        List.of(
                                detail(
                                        "가중치 랜덤 기반 학습 행동 시뮬레이션 봇을 개발해 회귀 검증을 자동화했습니다.",
                                        null,
                                        null,
                                        null,
                                        0,
                                        List.of())),
                        getSkills(List.of("TypeScript", "Node.js"), skillMap),
                        true,
                        "QA 자동화",
                        "project-study-helper",
                        "QA Automation Engineer",
                        80));

        // Seed Experience - Educations
        experienceRepository.save(
                Education.create(
                        "스포츠의학과 학사 졸업",
                        LocalDate.of(2022, 2, 25),
                        LocalDate.of(2022, 2, 25),
                        "IT 비전공자로서 개발 역량을 별도로 쌓았습니다.",
                        "스포츠의학을 전공한 뒤 개발 교육과 프로젝트, 실무 경험을 통해 소프트웨어 개발 역량을 쌓았습니다.",
                        12,
                        List.of(
                                detail(
                                        "스포츠의학과 학사 학위 취득 (IT 비전공)",
                                        null,
                                        null,
                                        "차의과학대학교 스포츠의학과를 졸업했으며, IT 비전공자로서 개발 역량을 별도로 쌓았습니다.",
                                        0,
                                        List.of())),
                        List.of(),
                        "차의과학대학교"));

        experienceRepository.save(
                Education.create(
                        "AI 엔지니어링 과정 (3기)",
                        LocalDate.of(2025, 9, 1),
                        LocalDate.of(2026, 3, 15),
                        "ML/DL 기초학습, Agentic AI 구축 (LangChain, LangGraph), RAG 구축, AI Azure 기반의 클라우드 엔지니어 학습 (600시간)",
                        "Agentic AI와 RAG 아키텍처를 깊이 있게 다루고, 클라우드 환경에서 AI 인프라를 구축하고 운영하는 방법을 익혔습니다.",
                        5,
                        List.of(
                                detail(
                                        "ML/DL 기초학습, Agentic AI 구축 (LangChain, LangGraph), RAG 구축, AI Azure 기반의 클라우드 엔지니어 학습",
                                        null,
                                        null,
                                        null,
                                        0,
                                        List.of())),
                        getSkills(
                                List.of(
                                        "Machine Learning / Deep Learning",
                                        "LangChain",
                                        "LangGraph",
                                        "RAG",
                                        "Azure"),
                                skillMap),
                        true,
                        "MS AI 스쿨",
                        "Microsoft / 대한상공회의소"));

        experienceRepository.save(
                Education.create(
                        "풀스택 프로젝트 실무과정",
                        LocalDate.of(2023, 5, 1),
                        LocalDate.of(2023, 10, 31),
                        "TypeScript 기반 풀스택 교육으로 주로 JavaScript/TypeScript 언어에 대한 깊은 이해와 프레임워크 사용법 등을 학습 (265시간)",
                        "TypeScript와 React/Express 환경에서 웹 애플리케이션의 풀스택 개발 생태계와 협업 워크플로우를 체화했습니다.",
                        6,
                        List.of(
                                detail(
                                        "TypeScript 기반 풀스택 교육, Express/React 풀스택 프로젝트 협업",
                                        null,
                                        null,
                                        null,
                                        0,
                                        List.of())),
                        getSkills(List.of("TypeScript", "Node.js", "React", "Express"), skillMap),
                        true,
                        "청년취업사관",
                        "SBA 청년취업사관학교"));

        experienceRepository.save(
                Education.create(
                        "파이썬 기반 풀스택 부트캠프",
                        LocalDate.of(2022, 6, 1),
                        LocalDate.of(2022, 12, 31),
                        "풀스택 교육으로 Git, HTML, CSS, Django Template Engine을 활용한 MVC 기반 웹사이트 구현 기초를 학습 (980시간)",
                        "소프트웨어 개발의 첫 단추인 MVC 아키텍처와 웹 표준, 협업을 위한 형상 관리 도구의 기초를 탄탄히 다졌습니다.",
                        7,
                        List.of(
                                detail(
                                        "Git, HTML, CSS, Django Template Engine을 활용한 웹 사이트 구현 기초 학습",
                                        null,
                                        null,
                                        null,
                                        0,
                                        List.of())),
                        getSkills(List.of("Python", "Django", "HTML/CSS", "Git"), skillMap),
                        true,
                        "멀티캠퍼스",
                        "멀티캠퍼스"));

        // Seed Experience - Certificates
        experienceRepository.save(
                Certificate.create(
                        "정보처리기사",
                        LocalDate.of(2022, 6, 17),
                        LocalDate.of(2022, 6, 17),
                        "IT 전반의 핵심 이론 및 기술 자격 검증",
                        "개발 생명주기 전반에 걸친 기초 체력을 공인 자격을 통해 입증했습니다.",
                        8,
                        List.of(
                                detail(
                                        "소프트웨어 공학, 데이터베이스, 네트워크 등 IT 핵심 이론 검증",
                                        null,
                                        null,
                                        null,
                                        0,
                                        List.of())),
                        getSkills(List.of("Software Engineering", "Database", "Network"), skillMap),
                        "한국산업인력공단"));

        experienceRepository.save(
                Certificate.create(
                        "SQL 개발자(SQLD)",
                        LocalDate.of(2024, 9, 20),
                        LocalDate.of(2024, 9, 20),
                        "데이터베이스 모델링 및 SQL 작성 능력 검증",
                        "데이터베이스를 단순히 저장소로 쓰는 것을 넘어 성능과 무결성을 고려하여 쿼리하고 모델링할 수 있음을 검증했습니다.",
                        9,
                        List.of(
                                detail(
                                        "RDB 모델링, SQL 작성 및 쿼리 최적화 능력 검증",
                                        null,
                                        null,
                                        null,
                                        0,
                                        List.of())),
                        getSkills(
                                List.of("SQL", "Database Modeling", "SQL Query Optimization"),
                                skillMap),
                        "(재)한국데이터산업진흥원"));

        experienceRepository.save(
                Certificate.create(
                        "빅데이터분석기사",
                        LocalDate.of(2022, 7, 15),
                        LocalDate.of(2022, 7, 15),
                        "데이터 수집, 전처리, 분석 모형 설계 및 평가 역량 검증",
                        "데이터를 수집하고 전처리하여 통계적 기법과 ML 모형으로 분석해 유의미한 가치를 추출할 수 있는 이론적 토대를 닦았습니다.",
                        10,
                        List.of(
                                detail(
                                        "데이터 전처리, 통계적 가설 검정, 머신러닝 모형 설계 역량 검증",
                                        null,
                                        null,
                                        null,
                                        0,
                                        List.of())),
                        getSkills(
                                List.of(
                                        "Data Preprocessing",
                                        "Statistics",
                                        "Machine Learning / Deep Learning"),
                                skillMap),
                        "(재)한국데이터산업진흥원"));

        experienceRepository.save(
                Certificate.create(
                        "컴퓨터활용능력 1급",
                        LocalDate.of(2018, 11, 16),
                        LocalDate.of(2018, 11, 16),
                        "스프레드시트 및 데이터베이스 활용 능력 자격 검증",
                        "정량적 데이터 정제 및 비즈니스 데이터 처리에 필요한 기본 오피스 역량을 인증받았습니다.",
                        11,
                        List.of(
                                detail(
                                        "Excel 스프레드시트 및 Access 데이터베이스 활용 검증",
                                        null,
                                        null,
                                        null,
                                        0,
                                        List.of())),
                        getSkills(List.of("Excel", "Access"), skillMap),
                        false,
                        null,
                        "대한상공회의소"));

        // Seed Studies (linked to the work project that owns each detail)
        List<ExperienceDetail> careerDetails =
                List.of(
                        workApiBffProject.getDetails().get(0),
                        workApiBffProject.getDetails().get(1),
                        workBackofficeProject.getDetails().get(0),
                        workInfraProject.getDetails().get(0),
                        workProblemProject.getDetails().get(0));

        // Study 1: AI 튜터링 세션 아키텍처
        Study study1 =
                studyRepository.save(
                        Study.create(
                                "ai-tutor-session-architecture",
                                "AI 튜터 메시징 대화형 세션 아키텍처 설계 및 구현",
                                "학생들의 4종 학습 상황(문제풀이, 복습, 챌린지, 개념보강)에 유연하게 대응하는 다형성 AI 대화 세션 도메인 모델링 및 AWS SQS 비동기 통신을 통한 멱등성 보장",
                                "# AI 튜터 메시징 대화형 세션 아키텍처 설계 및 구현\n\n## 1. 기술 배경 및 해결하고자 한 핵심 문제\n- 커리큘럼 기반 AI 학습 플랫폼에서 학생들에게 학습 컨텍스트별 맞춤형 AI 피드백을 제공하기 위해 대화형 메시징 세션 엔진이 요구되었습니다.\n- 문제풀이, 오답 복습, 챌린지, 개념 보강 등 서로 다른 4가지 학습 도메인이 하나의 평평한 모델에 혼재되어 있어, 컨텍스트 추가 시 비즈니스 변경 여파가 크고 외부 LLM 통신의 Latency 지연으로 인한 스레드 병목 위험이 존재했습니다.\n\n## 2. 기술 동작 원리 및 아키텍처 설계\n- **팩토리 패턴 기반 도메인 추상화 (`AiTutorSessionFactory`)**:\n  - 4종의 다형적인 학습 컨텍스트 엔티티를 단일 대화형 세션 모델로 안전하게 변환할 수 있는 도메인 팩토리 아키텍처를 설계했습니다.\n- **SQS 기반 이벤트 비동기 파이프라인**:\n  - 외부 LLM 서버와의 네트워크 지연 차단을 위해 메시지 발행/구독(Pub/Sub) 아키텍처를 적용했습니다.\n  - SQS 메시지 재처리(Retry) 발생 시 동일 메시지가 중복 처리되지 않도록 Redis 멱등키(Idempotence Key) 검증 로직을 도입했습니다.\n- **MongoDB Replica Set 분산 트랜잭션**:\n  - 세션 대화 로그 및 상태 전이가 데이터 유실 없이 원자적(Atomic)으로 기록되도록 Multi-Document 트랜잭션을 구성했습니다.\n- **BFF (Backend for Frontend) 게이트웨이**:\n  - NestJS 기반 BFF 서버를 통해 HTML Sanitize 처리 및 커서 기반 페이지네이션 조회 성능을 최적화했습니다.\n\n## 3. 핵심 구현 및 트러블슈팅 인사이트\n- **도메인 격리 인사이트**: 학습 컨텍스트 추상화를 통해 신규 학습 기능 추가 시 기존 AI 메시징 파이프라인의 수정 없이 결합도를 낮출 수 있었습니다.\n- **비동기 멱등성 보장**: 네트워크 유실로 인한 SQS 재시도 시에도 Redis Atomic INCR 및 TTL 멱등 체크를 통해 세션 상태의 무결성을 유지했습니다.",
                                StudyStatus.PUBLISHED,
                                categoryMap.get("ai-rag"),
                                LocalDate.of(2025, 9, 15),
                                LocalDateTime.of(2025, 9, 15, 18, 0)));
        study1.replaceExperiences(List.of(workApiBffProject));
        if (careerDetails.size() > 0)
            study1.replaceExperienceDetails(List.of(careerDetails.get(0)));
        study1.replaceSkills(
                getSkills(
                        List.of(
                                "Node.js",
                                "TypeScript",
                                "Express",
                                "MongoDB",
                                "AWS ECS",
                                "Amazon SQS",
                                "NestJS"),
                        skillMap));
        study1.replaceTags(
                getOrCreateTags(List.of("Backend", "MSA", "AI", "SQS", "Idempotence", "MongoDB")));
        studyRepository.save(study1);

        // Study 2: Presence & Student Monitoring
        Study study2 =
                studyRepository.save(
                        Study.create(
                                "realtime-student-presence-and-monitoring",
                                "실시간 학생 Presence 추적 및 이상 행동 감지 시스템 구축",
                                "교사들이 대규모 학생 접속 환경에서 웹소켓 비용 없이 주기적 HTTP Ping/Pong과 Redis, SQS 비동기 규칙 엔진을 이용해 학생 온라인 현황 및 이상 학습 행동을 모니터링하는 백엔드 설계",
                                "# 실시간 학생 Presence 추적 및 이상 행동 감지 시스템 구축\n\n## 1. 기술 배경 및 해결하고자 한 핵심 문제\n- 교사용 대시보드에서 수천 명 규모 학생들의 실시간 접속 상태(온라인, 오프라인, 자리비움, 백그라운드) 및 이상 학습 패턴을 수집해야 했습니다.\n- 수천 명의 학생 연결을 상시 유지하기 위한 커넥션 비용(WebSocket)을 절감하면서도, 실시간으로 교사가 학생의 학습 이상 징후를 감지하고 개입할 수 있는 가벼운 메트릭 인프라가 필요했습니다.\n\n## 2. 기술 동작 원리 및 아키텍처 설계\n- **경량 Presence 추적 API 및 Ping/Pong 타임아웃 윈도우**:\n  - 1분 주기의 경량 HTTP Ping/Pong 기반 텔레메트리 파이프라인을 설계했습니다.\n  - Redis ZSET / Hash 기반의 슬라이딩 윈도우 타임아웃을 적용해 일정 주기 동안 핑이 수신되지 않는 세션을 오프라인으로 자동 판정했습니다.\n- **이상 행동 알림 (`manageable-action`) 비동기 규칙 엔진**:\n  - 학생의 문제풀이 지연이나 연속 스킵 같은 이상 이벤트를 SQS 큐로 비동기 수집하고, 백그라운드 Consumer 모듈에서 정량적 규칙(Threshold Rule)을 실시간 평가하도록 구성했습니다.\n- **실시간 호출 및 개입 API (Hexagonal Architecture)**:\n  - 교사가 특정 학생에게 풀이를 요청하는 실시간 이벤트 호출 구조를 헥사고날 아키텍처에 맞춰 도메인 캡슐화했습니다.\n\n## 3. 핵심 구현 및 트러블슈팅 인사이트\n- **커넥션 비용 최적화**: 웹소켓 없이도 Redis In-Memory 인덱싱을 통해 수천 명의 동시 접속 세션을 서버 리소스 부하 최소화 상태로 추적했습니다.\n- **이상 감지 파이프라인**: 핑 수신과 통계 평가를 비동기로 격리해 메인 API 성능에 영향을 주지 않고 실시간 알림 시스템을 안착시켰습니다.",
                                StudyStatus.PUBLISHED,
                                categoryMap.get("backend"),
                                LocalDate.of(2025, 6, 26),
                                LocalDateTime.of(2025, 6, 26, 17, 0)));
        study2.replaceExperiences(List.of(workApiBffProject));
        if (careerDetails.size() > 1)
            study2.replaceExperienceDetails(List.of(careerDetails.get(1)));
        study2.replaceSkills(
                getSkills(
                        List.of("TypeScript", "NestJS", "Redis", "AWS ECS", "Amazon SQS"),
                        skillMap));
        study2.replaceTags(
                getOrCreateTags(List.of("Backend", "Presence", "Redis", "Telemetry", "SQS")));
        studyRepository.save(study2);

        // Study 3: SubmittedProblem CQRS & Migration
        Study study3 =
                studyRepository.save(
                        Study.create(
                                "cqrs-refactoring-and-data-migration",
                                "제출 문항 도메인의 CQRS 리팩토링 및 6만 건 데이터 마이그레이션",
                                "단일 컬렉션 집중 병목을 해결하기 위해 제출 문항 테이블을 학급/학생/전체/학원 단위로 분리하고 MongoDB 트랜잭션을 적용하여 집계 데이터를 마이그레이션한 성능 튜닝 사례",
                                "# 제출 문항 도메인의 CQRS 리팩토링 및 6만 건 데이터 마이그레이션\n\n## 1. 기술 배경 및 해결하고자 한 핵심 문제\n- 누적되는 제출 문항(`SubmittedProblem`) 데이터 볼륨 증가로 인해, 조회성 대시보드 API가 단일 컬렉션을 집계 조회하면서 쿼리 응답 속도가 지속적으로 지연되는 성능 병목이 발생했습니다.\n- 쓰기 트래픽(학생의 답안 제출)과 읽기 트래픽(교사/학원의 통계 대시보드 조회)의 성격이 완전히 달라 쓰기 작업이 읽기 쿼리의 락/리소스 경합을 유발하는 구조적 개선이 시급했습니다.\n\n## 2. 기술 동작 원리 및 아키텍처 설계\n- **CQRS 패턴 적용 (Read/Write 모델 상호 격리)**:\n  - 쓰기 도메인과 읽기 집계 도메인을 수평 분리했습니다.\n  - 기존 단일 컬렉션을 학급(`class-submitted-problem`), 학생(`student-submitted-problem`), 전체(`total-submitted-problem`), 학원(`academy-submitted-problem`) 4개의 읽기 전용 통계 전용 도메인으로 수평 재설계했습니다.\n- **무중단 MongoDB Multi-Document 트랜잭션 마이그레이션**:\n  - 14개 핵심 통계 지표(제출수, 정답수, 소요시간 등)를 집계 이관하는 파이프라인 배치 스크립트를 수립했습니다.\n  - 트랜잭션을 세분화하여 마이그레이션 실패 시 자동 롤백 및 재시도가 가능하도록 안전 장치를 마련했습니다.\n\n## 3. 핵심 구현 및 트러블슈팅 인사이트\n- **조회 쿼리 튜닝**: 읽기 전용 통계 컬렉션을 분리함으로써 대시보드 응답 속도를 수초 대에서 10ms 이하로 즉시 개선했습니다.\n- **정합성 유지 인사이트**: CQRS 읽기 모델 동기화 시 이벤트 기반 비동기 갱신을 적용하여 쓰기 응답 속도 지연을 완전히 방지했습니다.",
                                StudyStatus.PUBLISHED,
                                categoryMap.get("backend"),
                                LocalDate.of(2025, 1, 15),
                                LocalDateTime.of(2025, 1, 15, 15, 0)));
        study3.replaceExperiences(List.of(workApiBffProject));
        if (careerDetails.size() > 1)
            study3.replaceExperienceDetails(List.of(careerDetails.get(1)));
        study3.replaceSkills(
                getSkills(List.of("Node.js", "TypeScript", "MongoDB", "Database"), skillMap));
        study3.replaceTags(
                getOrCreateTags(
                        List.of(
                                "Backend",
                                "CQRS",
                                "Database",
                                "Migration",
                                "MongoDB",
                                "Transaction")));
        studyRepository.save(study3);

        // Study 4: Spring Boot Backoffice & Session
        Study study4 =
                studyRepository.save(
                        Study.create(
                                "spring-boot-backoffice-and-session-auth",
                                "Spring Boot 백오피스 서버 단독 구축 및 Redis 세션 기반 크로스도메인 해결",
                                "무료체험 유입 분석 자동화 TF를 위한 Spring Boot 백엔드 단독 설계/구축 및 쿠키 세션 크로스도메인 인증 이슈 대응",
                                "# Spring Boot 백오피스 서버 단독 구축 및 Redis 세션 기반 크로스도메인 해결\n\n## 1. 기술 배경 및 해결하고자 한 핵심 문제\n- 여러 부서의 무료체험 유입 추적 및 프로모션 관리가 엑셀 및 수기 프로세스로 운영되어 중복 데이터 발생과 행정 리소스 낭비가 컸습니다.\n- 사내 백오피스 시스템 구축 시 독립된 도메인 환경 간 교차 사이트 요청(CORS)에서 세션 쿠키가 탈락하는 보안 이슈를 해결해야 했습니다.\n\n## 2. 기술 동작 원리 및 아키텍처 설계\n- **Spring Boot 3.2 + Security 헥사고날 구조**:\n  - 8개 핵심 도메인과 144개 클래스 규모의 백오피스 아키텍처를 1인 단독 설계했습니다.\n  - NCP 카카오 알림톡 연동 시 자바 표준 암호화 라이브러리로 HMAC-SHA256 헤더 서명 생성기를 구현했습니다.\n- **Redis Session 분산 인증 및 SameSite Cookie 튜닝**:\n  - 독립 배포된 브라우저 도메인 간 인증 쿠키 전달을 위해 Redis Session 스토어를 연동했습니다.\n  - Nginx 서브프록시 레이어에서 `Set-Cookie` 헤더의 `SameSite=None; Secure` 옵션을 정합 제어해 크로스 도메인 인증 차단 문제를 해결했습니다.\n- **컨테이너 오케스트레이션 및 로깅**:\n  - Docker Compose로 MySQL, Redis, Nginx Basic Auth 프록시, Grafana 로깅 뷰어를 단독 구동 환경으로 통합 구축했습니다.\n\n## 3. 핵심 구현 및 트러블슈팅 인사이트\n- **크로스 도메인 세션 이월**: 브라우저 보안 정책 상 세션 탈락 원인을 Nginx 및 Spring Session 계층에서 분석 및 해결해 안정적 1회 로그인 SSO 환경을 구축했습니다.\n- **알림톡 서명 보안**: HMAC-SHA256 암호화 연동으로 외부 서드파티 알림 통신의 위변조를 완벽히 방지했습니다.",
                                StudyStatus.PUBLISHED,
                                categoryMap.get("backend"),
                                LocalDate.of(2025, 6, 13),
                                LocalDateTime.of(2025, 6, 13, 11, 0)));
        study4.replaceExperiences(List.of(workBackofficeProject));
        if (careerDetails.size() > 2)
            study4.replaceExperienceDetails(List.of(careerDetails.get(2)));
        study4.replaceSkills(
                getSkills(
                        List.of(
                                "Java",
                                "Spring Boot",
                                "Spring Data JPA",
                                "Spring Security",
                                "Redis",
                                "MySQL",
                                "Docker",
                                "Nginx",
                                "Grafana"),
                        skillMap));
        study4.replaceTags(
                getOrCreateTags(
                        List.of("Backend", "Spring", "Security", "Redis", "Session", "Nginx")));
        studyRepository.save(study4);

        // Study 5: Common npm package monorepo & CLI
        Study study5 =
                studyRepository.save(
                        Study.create(
                                "common-packages-and-cli-scaffolding",
                                "사내 공용 라이브러리 모노레포 구축 및 CLI 스캐폴딩 도구 개발",
                                "공통 아키텍처 규격을 패키지화해 전사 마이크로서비스에 일관 적용하고, commander.js 기반 템플릿 CLI 생성 도구를 개발해 마이크로서비스 생성 속도 표준화",
                                "# 사내 공용 라이브러리 모노레포 구축 및 CLI 스캐폴딩 도구 개발\n\n## 1. 기술 배경 및 해결하고자 한 핵심 문제\n- 마이크로서비스(BFF, Core Application, Common Problem 등) 추가 구축 과정에서 공통 인프라 설정 코드(MongoDB 연동, Redis 지수백오프, SQS PubSub 래퍼)와 예외 핸들러가 복사-붙여넣기 형태로 파편화되었습니다.\n- 신규 백엔드 모듈 개발 시 초기 보일러플레이트 구축에 많은 시간이 소요되고 코드 리뷰 규칙이 흩어지는 문제를 해결하고자 했습니다.\n\n## 2. 기술 동작 원리 및 아키텍처 설계\n- **npm workspaces 기반 모노레포 패키지 아키텍처**:\n  - 코드를 3개 레이어로 분리 패키지화 (`@susimdal/common` 예외/HTTP, `@susimdal/core` NestJS 서버 부트스트랩, `@susimdal/infra` MongoDB/Redis/SQS).\n  - GitHub Packages Private Registry로 버전 관리 및 배포 자동화 구현.\n- **스캐폴딩 CLI 도구 (`@susimdal/cli`)**:\n  - Node.js Commander 기반 CLI 도구를 개발하여 `susimdal new <service-name>` 명령어 한 줄로 Dockerfile, Task Definition, GitHub Actions CI/CD 파일이 포함된 템플릿이 자동 스캐폴딩되도록 구현했습니다.\n\n## 3. 핵심 구현 및 트러블슈팅 인사이트\n- **아키텍처 표준화 인사이트**: 전사 마이크로서비스의 예외 코드(9977-9999) 및 HTTP 인터셉터 패턴을 통일하여 코드 파편화를 방지했습니다.\n- **개발 생산성 제고**: 신규 백엔드 모듈 셋업 시간을 수일에서 수분으로 단축시켜 개발속도와 품질을 동시에 확보했습니다.",
                                StudyStatus.PUBLISHED,
                                categoryMap.get("devops"),
                                LocalDate.of(2025, 9, 10),
                                LocalDateTime.of(2025, 9, 10, 19, 0)));
        study5.replaceExperiences(List.of(workProblemProject));
        if (careerDetails.size() > 4)
            study5.replaceExperienceDetails(List.of(careerDetails.get(4)));
        study5.replaceSkills(
                getSkills(
                        List.of(
                                "Node.js",
                                "TypeScript",
                                "NestJS",
                                "Docker",
                                "AWS ECS",
                                "Amazon SQS",
                                "MongoDB"),
                        skillMap));
        study5.replaceTags(
                getOrCreateTags(
                        List.of("DevOps", "Monorepo", "CLI", "Scaffold", "Infrastructure", "NPM")));
        studyRepository.save(study5);

        // Seed Studies for CS Test Bed Project
        List<ExperienceDetail> project1Details = project1.getDetails();

        // Study 6: Playwright Session Automation
        Study study6 =
                studyRepository.save(
                        Study.create(
                                "naver-cafe-session-playwright-automation",
                                "Playwright 브라우저 자동화를 통한 네이버 카페 보안 세션 우회 및 E2E 답변 자동화",
                                "네이버의 로그인 보안 정책을 우회하기 위해 Playwright OTP 로그인 기능을 탑재한 브라우저 워커를 구축하고, AES/GCM 쿠키 암복호화 및 주기적 헬스체크 검증을 통해 무중단으로 카페 글/답글 등록 자동화를 구현했습니다.",
                                "# Playwright 브라우저 자동화를 통한 네이버 카페 보안 세션 우회 및 E2E 답변 자동화\n\n## 1. 기술 배경 및 해결하고자 한 핵심 문제\n- 고객 지원 효율화를 위해 네이버 카페 게시판의 고객 문의에 자동 답변을 등록하는 파이프라인이 요구되었습니다.\n- 네이버 로그인 보안 정책(CAPTCHA, 2단계 인증)으로 단순 HTTP request 세션 유지가 불가하며 세션이 자주 만료되어 수동 개입이 수반되는 난제를 해결해야 했습니다.\n\n## 2. 기술 동작 원리 및 아키텍처 설계\n- **Playwright 기반 OTP 로그인 워커 설계**:\n  - Headless 브라우저 제어용 Node.js browser-worker를 구축하고, OTP 일회용 번호 입력 기반 로그인 파이프라인을 자동화했습니다.\n- **AES/GCM 세션 쿠키 암호화 및 헬스 체크**:\n  - 브라우저 컨텍스트에서 `NID_AUT`, `NID_SES` 세션 쿠키를 추출해 AES/GCM 암호화 후 DB에 안전하게 보관했습니다.\n  - 주기적 헬스 체크로 세션 유효성을 자동 판단해 만료 시 슬랙 알림 발송 및 워크플로우 통제를 적용했습니다.\n- **DOM 조작 기반 E2E 답글/멘션 등록**:\n  - 모바일 카페 DOM 조작 및 HTML innerHTML 주작을 통해 특정 멘션 태그 구조를 강제 주입해 자동 답변 수신자 지정을 완수했습니다.\n\n## 3. 핵심 구현 및 트러블슈팅 인사이트\n- **보안 탐지 우회**: CAPTCHA 챌린지를 스마트폰 OTP 번호 입력으로 일원화해 세션 갱신을 10초 내로 처리했습니다.\n- **E2E 답변 자동화**: 무중단으로 네이버 카페 고객 문의 수집 및 답변/대댓글 매핑 E2E 자동화를 완수하여 리드타임을 수분 이내로 단축했습니다.",
                                StudyStatus.PUBLISHED,
                                categoryMap.get("devops"),
                                LocalDate.of(2026, 7, 10),
                                LocalDateTime.of(2026, 7, 10, 15, 0)));
        study6.replaceExperiences(List.of(project1));
        if (project1Details.size() > 0)
            study6.replaceExperienceDetails(List.of(project1Details.get(0)));
        study6.replaceSkills(getSkills(List.of("Playwright", "Docker Compose", "Nginx"), skillMap));
        study6.replaceTags(
                getOrCreateTags(
                        List.of("DevOps", "Playwright", "Automation", "Naver Cafe", "Session")));
        studyRepository.save(study6);

        // Study 7: Inquiry Threading Engine
        Study study7 =
                studyRepository.save(
                        Study.create(
                                "inquiry-thread-parsing-and-automatic-mapping",
                                "이메일 및 카페 문의의 다형적 통합 수집과 헤더 기반 스레딩/상태 제어 엔진 구축",
                                "n8n과 Spring Boot 백엔드를 결합해 이메일/카페 문의를 다형적 메타데이터로 통합하고, In-Reply-To, References 헤더 파싱 및 이메일 발신자 해싱을 이용해 관련 메일을 기존 문의 스레드로 묶어내며 상태를 자동으로 재오픈하는 비즈니스 엔진 설계",
                                "# 이메일 및 카페 문의의 다형적 통합 수집과 헤더 기반 스레딩/상태 제어 엔진 구축\n\n## 1. 기술 배경 및 해결하고자 한 핵심 문제\n- 이메일, 네이버 카페 등 다양한 소통 채널에서 고객 문의가 수집될 때, 동일 사용자의 회신이나 연관 메일이 개별 건으로 무작위 적재되어 상담원의 중복 답변과 컨텍스트 혼선이 발생했습니다.\n- 이를 해결하기 위해 비정형 문의 데이터를 단일 스레드로 통일하고 추가 회신 시 문의 상태를 자동으로 제어하는 스레딩 엔진을 개발했습니다.\n\n## 2. 기술 동작 원리 및 아키텍처 설계\n- **In-Reply-To / References 헤더 추적**:\n  - 이메일 헤더의 Message-ID 관계를 분석해 이전 메일의 부모 ID를 추적하고 자식 문의로 자동 묶어내는 계층형 모델을 구축했습니다.\n- **Heuristic 발신자 해싱 및 제목 정규화**:\n  - 헤더 유실 예외 상황에 대응하여, 회신 접두사(Re:, Fwd:)를 정규화하고 발신자 이메일을 HMAC-SHA256 해싱(`email_sender_hash`)으로 인덱싱 조회해 최근 연관 문의를 자동 결속했습니다.\n- **스레드 상태 전이 및 Audit Log 로깅**:\n  - 해결(RESOLVED) 문의에 회신이 들어오면 자동으로 상태를 OPEN으로 전환하고 시스템 감사 로그(`InquiryWorkLog`)를 자동으로 기록했습니다.\n\n## 3. 핵심 구현 및 트러블슈팅 인사이트\n- **스레드 통일**: 파편화된 이메일 회신들을 하나의 문의 히스토리로 정돈하여 중복 상담 리소스를 완벽히 제거했습니다.\n- **누락 제어**: 회신 유입 시 자동 재오픈 상태 전이 파이프라인으로 고객 누락 문의를 0건으로 제어했습니다.",
                                StudyStatus.PUBLISHED,
                                categoryMap.get("backend"),
                                LocalDate.of(2026, 7, 15),
                                LocalDateTime.of(2026, 7, 15, 11, 0)));
        study7.replaceExperiences(List.of(project1));
        if (project1Details.size() > 1)
            study7.replaceExperienceDetails(List.of(project1Details.get(1)));
        study7.replaceSkills(getSkills(List.of("Java", "Spring Boot", "QueryDSL"), skillMap));
        study7.replaceTags(
                getOrCreateTags(
                        List.of("Backend", "Spring Boot", "Email Threading", "n8n", "Heuristic")));
        studyRepository.save(study7);

        // Study 8: DB PII Encryption & Migration
        Study study8 =
                studyRepository.save(
                        Study.create(
                                "db-level-pii-encryption-and-migration",
                                "JPA Converter와 HMAC 해싱을 통한 개인정보(PII) 암호화 및 무중단 데이터 마이그레이션",
                                "민감한 고객 데이터(문의 내용, 이메일, 연락처) 보호를 위해 AES/GCM 양방향 암호화를 JPA 컨버터에 내장하고, 등치 검색을 위한 HMAC-SHA256 해시 설계 및 기존 평문 데이터를 하위 호환성을 지키며 안전하게 이관한 마이그레이션 아키텍처",
                                "# JPA Converter와 HMAC 해싱을 통한 개인정보(PII) 암호화 및 무중단 데이터 마이그레이션\n\n## 1. 기술 배경 및 해결하고자 한 핵심 문제\n- 고객 문의 본문, 이메일, 연락처 등 개인정보(PII)를 DB에 평문 저장하는 리스크를 방지하고자 컴플라이언스 기준의 DB 암호화가 필요했습니다.\n- 이미 대량의 데이터가 적재된 환경에서 서비스 중단 없이 하위 호환성을 유지하며 데이터를 이관하는 마이그레이션 전략이 핵심이었습니다.\n\n## 2. 기술 동작 원리 및 아키텍처 설계\n- **JPA Attribute Converter 기반 AES/GCM 암복호화**:\n  - 영속성 계층에서 자동 작동하는 `EncryptedStringConverter`를 개발하고 매 암호화 시 랜덤 IV를 적용해 AES/GCM 보안성을 확보했습니다.\n- **등치 검색용 HMAC-SHA256 해시 컬럼**:\n  - AES/GCM 암호문의 일치 검색 불가능 한계를 해결하기 위해 발신자 이메일을 HMAC-SHA256으로 해싱한 `email_sender_hash` 전용 컬럼을 구성했습니다.\n- **무중단 관용적 복호화 및 배치 이관**:\n  - 복호화 실패 시 평문을 안전하게 반환하는 하위 호환 복호화(`decryptOrPassThrough`)를 도입해 무중단 이관 파이프라인을 완료했습니다.\n\n## 3. 핵심 구현 및 트러블슈팅 인사이트\n- **보안 컴플라이언스**: DB 유출 시에도 민감 정보 노출을 완벽히 차단하는 암호화 규격을 완성했습니다.\n- **무중단 이관**: 기존 적재 데이터를 유실 없이 100% 암호화 마이그레이션하는 데 성공했습니다.",
                                StudyStatus.PUBLISHED,
                                categoryMap.get("backend"),
                                LocalDate.of(2026, 7, 20),
                                LocalDateTime.of(2026, 7, 20, 17, 0)));
        study8.replaceExperiences(List.of(project1));
        if (project1Details.size() > 2)
            study8.replaceExperienceDetails(List.of(project1Details.get(2)));
        study8.replaceSkills(
                getSkills(
                        List.of("Java", "Spring Boot", "Spring Data JPA", "PostgreSQL", "Flyway"),
                        skillMap));
        study8.replaceTags(
                getOrCreateTags(List.of("Backend", "Security", "Encryption", "Migration", "HMAC")));
        studyRepository.save(study8);

        seedCoreProjectPlacements();
    }

    private void seedCoreProjectPlacements() {
        List<ExperiencePlacement> placements;
        if (experiencePlacementRepository.count() > 0) {
            placements = experiencePlacementRepository.findAll();
        } else {
            placements =
                    experienceRepository.findAllByOrderByDisplayOrderAsc().stream()
                            .filter(experience -> "PROJECT".equals(experience.getType()))
                            .filter(
                                    experience ->
                                            !(experience instanceof Project project)
                                                    || project.getCareer() == null
                                                    || "work-learning-api-bff"
                                                            .equals(project.getSlug()))
                            .map(
                                    experience ->
                                            ExperiencePlacement.create(
                                                    experience,
                                                    ExperiencePlacementType.CORE_PROJECT,
                                                    experience.getDisplayOrder(),
                                                    true))
                            .toList();
            placements = experiencePlacementRepository.saveAll(placements);
        }

        if (experiencePlacementDetailRepository.count() == 0) {
            List<ExperiencePlacementDetail> detailMappings =
                    placements.stream()
                            .flatMap(
                                    placement ->
                                            placement.getExperience().getDetails().stream()
                                                    .map(
                                                            detail ->
                                                                    ExperiencePlacementDetail
                                                                            .create(
                                                                                    placement,
                                                                                    detail,
                                                                                    detail
                                                                                            .getDisplayOrder())))
                            .toList();
            experiencePlacementDetailRepository.saveAll(detailMappings);
        }
    }

    private Skill getOrCreateSkill(
            String name, String category, String level, boolean isCore, int order) {
        return skillRepository
                .findByName(name)
                .orElseGet(
                        () ->
                                skillRepository.save(
                                        Skill.create(
                                                name,
                                                category,
                                                level,
                                                inferSkillVersion(name),
                                                inferSkillComment(name),
                                                inferUsageType(name),
                                                isCore,
                                                order)));
    }

    private String inferUsageType(String name) {
        return switch (name) {
            case "Java",
                            "TypeScript",
                            "Node.js",
                            "NestJS",
                            "Express",
                            "MongoDB",
                            "Redis",
                            "Spring Boot",
                            "Spring Data JPA",
                            "Spring Security",
                            "MySQL",
                            "AWS ECS",
                            "Amazon SQS",
                            "Docker",
                            "Datadog",
                            "GitHub Actions" ->
                    "WORK_EXPERIENCE";
            case "QueryDSL",
                            "PostgreSQL",
                            "Flyway",
                            "Playwright",
                            "n8n",
                            "Nginx",
                            "Docker Compose",
                            "Grafana",
                            "Loki",
                            "Alloy",
                            "FastAPI",
                            "Cosmos DB",
                            "Azure Functions",
                            "Azure OpenAI",
                            "Teams SDK",
                            "Bicep",
                            "Infrastructure as Code (IaC)",
                            "gRPC",
                            "Apache Kafka",
                            "KQL",
                            "Azure Log Analytics",
                            "Kubernetes" ->
                    "PROJECT_USE";
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
            case "PostgreSQL" -> "CS Test Bed의 운영 데이터 저장소";
            case "AWS ECS" -> "컨테이너 기반 서비스 배포 및 운영";
            case "Amazon SQS" -> "비동기 메시징 및 외부 AI 서버 연동";
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

    private List<Tag> getOrCreateTags(List<String> tagNames) {
        List<Tag> tags = new ArrayList<>();
        for (String name : tagNames) {
            String slug = name.toLowerCase().replace(" ", "-").replace("/", "-");
            Tag tag =
                    tagRepository
                            .findByNameIgnoreCase(name)
                            .orElseGet(() -> tagRepository.save(Tag.create(name, slug)));
            tags.add(tag);
        }
        return tags;
    }

    private ExperienceDetail.Draft detail(
            String content,
            String situation,
            String actionDetail,
            String outcome,
            int displayOrder,
            List<Skill> skills) {
        return new ExperienceDetail.Draft(
                null, content, situation, null, actionDetail, outcome, null, displayOrder, skills);
    }

    private ExperienceDetail.Draft detail(
            String content,
            String situation,
            String task,
            String actionDetail,
            String outcome,
            String narrative,
            int displayOrder,
            List<Skill> skills) {
        return new ExperienceDetail.Draft(
                null,
                content,
                situation,
                task,
                actionDetail,
                outcome,
                narrative,
                displayOrder,
                skills);
    }

    private void seedLogDoctorProject(
            Map<String, Skill> skillMap, Map<String, StudyCategory> categoryMap) {
        // Ensure new skills used in LogDoctor are in the map
        skillMap.put(
                "Azure Functions", getOrCreateSkill("Azure Functions", "DEVOPS", "중급", true, 45));

        // 1. LogDoctor Project Experience Seeding

        Experience logDoctorProject =
                experienceRepository.save(
                        Project.create(
                                "Azure 클라우드 로그 비용 진단 및 최적화 SaaS (LogDoctor) (기여도 70%)",
                                LocalDate.of(2026, 3, 1),
                                LocalDate.of(2026, 6, 30),
                                "Microsoft Azure LAW(Log Analytics Workspace) 요금 분석 및 비용 리스크를 진단하고 권장 진료 가이드를 발급하는 Microsoft Teams 전용 SaaS 솔루션입니다. 에이전트 기반 VM 연결 단절 탐지, 디버그 로그 폭증 추적, Azure OpenAI RAG 기반 맞춤 처방 제공, 로그 데이터 PII 마스킹 처리 등을 구축했습니다. (팀 프로젝트)",
                                "쓰기 권한을 제외한 최소 읽기 전용 권한(18개) 진단 체계로 인프라 보안 위험을 차단하고, LLM을 결합하여 비용 최적화를 자동 진단·안내하는 파이프라인을 구축 및 실전 검증했습니다.",
                                2,
                                List.of(
                                        detail(
                                                "KQL과 리소스 메타데이터를 활용한 비용 및 배관 상태 자동 진단 구현",
                                                "Azure 모니터링 환경에서 리소스들의 로그 및 비용을 자동으로 수집 및 감사할 수 있는 규칙 엔진이 필요했습니다. 특히, 환경변수나 Secret 등의 보안 민감 정보 수집을 배제한 채 순수 읽기 전용 권한만으로 정확한 리스크와 낭비 용량을 측정해야 했습니다.",
                                                "- BaseInspector 클래스를 설계하여 11개의 규칙을 플러그인 형태로 추가 가능한 구조 확립\n- 4대 진단 영역(Detect, Prevent, Filter, Retain) 정의 및 11개 규칙 인스펙터 구현\n- KQL(Kusto Query Language)과 Azure Resource Graph를 연동하여 최근 24시간 동안의 과금 로그(BilledSize), 테이블별 용량, Quota 정보 수집",
                                                "- 디버그 로그 폭증, 고빈도 노이즈, PII 유출, 과보존 테이블 및 Quota 초과 위험을 실시간으로 감지하고 Markdown 기반의 맞춤 처방 제공\n- Azure Retail Prices API를 실시간 조회하여 리전별 로그 수집 단가를 바탕으로 정밀한 월간 예상 절감 비용 산출 가능",
                                                0,
                                                getSkills(
                                                        List.of(
                                                                "Python",
                                                                "SQL",
                                                                "SQL Query Optimization",
                                                                "KQL",
                                                                "Azure Log Analytics"),
                                                        skillMap)),
                                        detail(
                                                "비동기 Queue Worker 기반의 진단 리포트 수집 및 처리 파이프라인 설계",
                                                "Azure Subscription 전체 리소스를 스캔하고 LAW 쿼리를 병렬로 실행하는 과정은 Cold Start가 잦고 대기 시간이 길어, 동기식 API 호출로는 실시간 사용자 응답을 보장하기 어려웠습니다.",
                                                "- FastAPI 백엔드 및 Azure Storage Queue를 활용하여 리포트 분석 상태를 비동기로 제어하는 Worker 구조 설계\n- Cosmos DB NoSQL 아키텍처를 도입하여 Tenants, Agents, Reports, Diagnoses, Insights 컬렉션을 낙관적 락(ETag)으로 관리\n- Lifespan 이벤트를 통해 DB 커넥션 풀 사전 로드(Pre-warming)를 적용하여 Cold Start 지연 단축",
                                                "- 진단 요청 후 백그라운드 Worker에서 병렬 처리가 이루어져 대규모 구독 환경에서도 타임아웃 없이 안정적으로 리포트 생성 완료\n- 실시간 통계 재계산 및 리포트 완성에 따른 이벤트 발행 파이프라인 완비",
                                                1,
                                                getSkills(
                                                        List.of("FastAPI", "Cosmos DB"), skillMap)),
                                        detail(
                                                "권한 분리를 적용한 에이전트 구동 및 리전별 가격 API 동적 조회 구현",
                                                "보안 규격상 고객의 Azure 환경을 직접 수정하거나 크리덴셜 원문을 백엔드 서버에 저장할 수 없었으므로, 최소 읽기 전용 권한을 가진 에이전트와 위임형 SSO가 필수적이었습니다.",
                                                "- Azure Functions 기반의 가벼운 에이전트 러너(client-back)를 분리 구축하고 18개 최소 읽기 전용 IAM 권한 매핑 설계\n- Nginx auth_request 계층과 HMAC 토큰을 활용한 보안 프록시 설계로 내부 툴들과의 SSO 연동 구현\n- Azure Retail Prices API를 호출하여 위치별 단가를 GB 단위로 캐싱(TTL 24시간) 처리",
                                                "- 고객의 쓰기/삭제 권한 없이 완전 무마취 읽기 전용 진단 프로세스를 성공적으로 안착\n- 개인정보(PII) 등 민감 데이터가 게이트웨이 단계에서 즉시 마스킹되고 마스킹 유형 및 건수만 본 서버로 전송되도록 하드닝 구현",
                                                2,
                                                getSkills(
                                                        List.of(
                                                                "Azure Functions",
                                                                "Bicep",
                                                                "Infrastructure as Code (IaC)"),
                                                        skillMap)),
                                        detail(
                                                "Microsoft Teams 챗봇을 통한 알림 발송 및 사용자 진단 대시보드 연동",
                                                "인프라 엔지니어들이 일일이 Azure Portal에 접속해 LAW 쿼리를 복사해 실행하는 번거로움을 제거하고, 매일 사용하는 협업 도구 안에서 간편하게 비용 현황을 확인해야 했습니다.",
                                                "- Teams Tab 및 Bot manifest 설정을 연동하여 Teams 앱 내에서 진단 결과를 한눈에 보는 대시보드 구현\n- 에이전트 연결 상태 단절(15분 이상) 및 진단 완료 이벤트를 Teams Bot 알림으로 자동 전송\n- 비전문가 관리자도 손쉽게 따라 할 수 있는 맞춤형 약봉투(가이드)를 Teams 인터페이스 내에 Markdown 카드로 시각화",
                                                "- 챗봇 기반의 1분 내 설치 연동 및 비동기 스캔 완료 통지 프로세스 구현으로 사용성 극대화\n- 배포 권한이 없는 실무자도 관리자에게 배포를 위임할 수 있는 '배포 위임' 워크플로우 지원",
                                                3,
                                                getSkills(List.of("Teams SDK"), skillMap))),
                                getSkills(
                                        List.of(
                                                "Python",
                                                "FastAPI",
                                                "Cosmos DB",
                                                "Azure OpenAI",
                                                "Teams SDK",
                                                "KQL",
                                                "Azure Log Analytics",
                                                "Bicep",
                                                "Infrastructure as Code (IaC)",
                                                "Azure Functions",
                                                "Nginx",
                                                "Docker Compose",
                                                "Grafana",
                                                "Loki",
                                                "Alloy"),
                                        skillMap),
                                true,
                                "LogDr.",
                                "project-log-doctor",
                                "Fullstack & Cloud Developer",
                                70));

        List<ExperienceDetail> doctorDetails = logDoctorProject.getDetails();

        // 2. Studies Seeding
        // Study 1: Cost Optimization
        Study study1 =
                studyRepository.save(
                        Study.create(
                                "azure-log-cost-retention-optimization",
                                "Azure 로그 비용 과다 진단 및 보관 기간 최적화 (RET-001, RET-002)",
                                "Azure Log Analytics Workspace(LAW)의 Usage 테이블을 분석하고, Azure Resource Graph와 Retail Prices API를 실시간 연동하여 일일 한도(Quota Gb) 대비 로그 비용 소진율을 진단하고 테이블별 최적 보존 주기 및 요금제 전환(Basic/Archive) 처방 자동화.",
                                "# Azure 로그 비용 과다 진단 및 보관 기간 최적화 (RET-001, RET-002)\n\n## 1. 기술 배경 및 해결하고자 한 핵심 문제\n- 클라우드 환경에서 시스템 규모가 커짐에 따라 수집되는 로그 데이터 양이 급증하고, 이로 인해 Log Analytics Workspace(LAW) 청구 비용이 예측 불가능하게 늘어나는 '빌링 쇼크(Billing Shock)'가 빈번히 발생했습니다.\n- 로그 요금 최적화를 위해서는 전체 수집을 막는 것이 아니라, 어떤 테이블에서 비용이 발생하는지(`Usage` 분석)와 보존 주기(Retention) 및 요금제(Plan)가 가치에 맞게 설정되었는지 진단하고 처방하는 지능형 모니터링이 필요했습니다.\n\n## 2. 기술 동작 원리 및 아키텍처 설계\n- **Usage 테이블 기반 실시간 비용 추적 (RET-001)**:\n  - `Usage` 시스템 테이블을 쿼리하여 실제 과금 대상인 테이블(`IsBillable == true`)의 데이터 크기(`Quantity` 및 `_BilledSize`)를 DataType별로 정렬 및 분석하는 KQL 수집 모듈 구현.\n- **Azure Retail Prices API 실시간 연동**:\n  - 리소스가 배포된 Azure 리전 속성을 식별하고, 해당 리전의 `Analytics Logs Data Ingestion` Pay-As-You-Go 단가를 동적으로 API 호출하여 정확한 비용을 USD로 환산.\n  - 리전별 단가 조회 오버헤드를 낮추기 위해 24시간 TTL 인메모리 캐시 설계.\n- **ARG(Azure Resource Graph) 기반 동적 예산 수집**:\n  - `workspaceCapping.dailyQuotaGb` 설정을 Resource Graph로 Bulk 조회하여 일일 예산 자동 계산.\n- **테이블 등급별 보존 주기 최적화 시뮬레이션 (RET-002)**:\n  - 로그 성격에 따른 분류 체계(Class A 보안/감사, Class B 운영/지표, Class C 추적/디버그) 정의.\n  - 테이블별 현재 보존일수와 사용량을 기준 31일 초과분에 대한 Archive 티어 전환 시 월간 예상 절감 비용 산출.\n\n## 3. 핵심 구현 및 트러블슈팅 인사이트\n- **사전 방어 파이프라인**: 일일 예산 대비 현재 소진율(`budget_ratio`)을 계산해 10% Warning, 25% Critical 경보를 발송하여 요금 폭탄을 사전 방지했습니다.\n- **컴플라이언스 양립**: 보안 로그 365일 규정 준수와 불필요한 디버그 로그의 Archive 티어 전환 처방을 동시에 달성했습니다.",
                                StudyStatus.PUBLISHED,
                                categoryMap.get("devops"),
                                LocalDate.of(2026, 6, 25),
                                LocalDateTime.of(2026, 6, 25, 10, 0)));
        study1.replaceExperiences(List.of(logDoctorProject));
        if (doctorDetails.size() > 2) {
            study1.replaceExperienceDetails(List.of(doctorDetails.get(0), doctorDetails.get(2)));
        }
        study1.replaceSkills(
                getSkills(
                        List.of(
                                "SQL",
                                "Database Modeling",
                                "SQL Query Optimization",
                                "KQL",
                                "Azure Log Analytics",
                                "Bicep",
                                "Infrastructure as Code (IaC)"),
                        skillMap));
        study1.replaceTags(getOrCreateTags(List.of("Cloud", "Azure", "Cost Optimization", "KQL")));
        studyRepository.save(study1);

        // Study 2: Observability
        Study study2 =
                studyRepository.save(
                        Study.create(
                                "cloud-infrastructure-app-observability-diagnostics",
                                "클라우드 인프라 생존 및 앱 관측성 진단 아키텍처 (DET-001, DET-002, DET-003)",
                                "App Service, Container Apps, VM 등 분산 인프라에서 수집되는 telemetry(Heartbeat, AppRequests, AppTraces)의 유입 상태를 분석하여 인프라-앱 간의 관측성 배관 단절을 진단하고 서비스 장애/지연 지표 자동 탐지.",
                                "# 클라우드 인프라 생존 및 앱 관측성 진단 아키텍처 (DET-001, DET-002, DET-003)\n\n## 1. 기술 배경 및 해결하고자 한 핵심 문제\n- 분산 인프라 환경에서 리소스(VM, App Service 등)는 정상 가동 중이나 로그 에이전트가 중단되어 모니터링 사각지대가 발생하는 문제를 해결해야 했습니다.\n- 계정 정보나 Secret 키를 직접 수집하지 않는 보안 제약 하에, Log Analytics Workspace 텔레메트리만으로 관측 배관의 유효성과 앱 헬스 상태를 간접 판정하는 지능형 모듈을 설계했습니다.\n\n## 2. 기술 동작 원리 및 아키텍처 설계\n- **명시 연결 기반 Target Resolver (DET-001)**:\n  - Diagnostic Settings 및 hidden-link 메타데이터 등 명시적 연결 경로만 추적하여 신뢰도를 확보.\n  - App Service/ACA/ACI를 대상으로 `AppRequests`, `AppTraces` 유입 상태를 추적.\n- **VM 관측성 배관 진단 및 생존 분석 (DET-002)**:\n  - DCR Association 정보와 AMA(Azure Monitor Agent) 설치 여부를 교차 검증.\n  - `Heartbeat` 수신 상태와 Host Name을 기반으로 앱 후보군 매핑.\n- **HTTP 헬스 신호 및 응답 지연 탐지 (DET-003)**:\n  - `AppRequests` 테이블에서 헬스체크 봇, AlwaysOn 노이즈 요청을 제외한 정제 쿼리 적용.\n  - 24시간 에러율(HTTP 5xx)과 P95 응답 속도(`percentile(DurationMs, 95)`) 자동 산출.\n\n## 3. 핵심 구현 및 트러블슈팅 인사이트\n- **배관 진단**: LAW 미연결 시 Critical, 플랫폼 로그만 유입 시 Warning, 관측성 완비 시 Healthy 단계별 진단 정착.\n- **장애 탐지**: 에러율 > 15% 또는 P95 Latency > 5,000ms 기반의 자동 경보 체계로 모니터링 대시보드 시각화 완수.",
                                StudyStatus.PUBLISHED,
                                categoryMap.get("devops"),
                                LocalDate.of(2026, 6, 27),
                                LocalDateTime.of(2026, 6, 27, 14, 0)));
        study2.replaceExperiences(List.of(logDoctorProject));
        if (doctorDetails.size() > 3) {
            study2.replaceExperienceDetails(
                    List.of(doctorDetails.get(0), doctorDetails.get(2), doctorDetails.get(3)));
        }
        study2.replaceSkills(
                getSkills(
                        List.of(
                                "Azure Functions",
                                "FastAPI",
                                "Cosmos DB",
                                "Python",
                                "Nginx",
                                "Docker Compose",
                                "Grafana",
                                "Loki",
                                "Alloy"),
                        skillMap));
        study2.replaceTags(getOrCreateTags(List.of("Cloud", "Azure", "Observability", "KQL")));
        studyRepository.save(study2);

        // Study 3: Filtering & Masking
        Study study3 =
                studyRepository.save(
                        Study.create(
                                "intelligent-log-filtering-pii-masking-engine",
                                "지능형 로그 필터링 및 민감 정보 마스킹 엔진 (PRV-001, PRV-002, PRV-003, FLT-001, FLT-002, FLT-003)",
                                "운영 환경의 상세 로그 활성화 여부 진단, 정규식을 통한 개인정보(PII) 유출 탐지/마스킹, 에러 로그 컨텍스트 3요소 품질 평가 점수화, 고빈도 노이즈(Health check) 분석을 통한 DCR 필터링 자동 처방 구현.",
                                "# 지능형 로그 필터링 및 민감 정보 마스킹 엔진 (PRV-001, PRV-002, PRV-003, FLT-001, FLT-002, FLT-003)\n\n## 1. 기술 배경 및 해결하고자 한 핵심 문제\n- 개발 단계의 디버그 로그가 프로덕션에 방치되어 불필요한 청구 비용이 발생하거나, 사용자 계정 정보(비밀번호, 토큰 등)가 평문 수집되어 컴플라이언스를 위반하는 리스크를 방지하고자 했습니다.\n- 무의미한 노이즈 로그의 유입을 막고, 에러 로그의 3대 필수 컨텍스트(Cause, Location, Action) 보유 여부를 정량적으로 점수화하는 엔진을 구현했습니다.\n\n## 2. 기술 동작 원리 및 아키텍처 설계\n- **운영 환경 디버그 로그 방치 감지 (PRV-001)**:\n  - App Settings 환경변수와 KQL `SeverityLevel <= 1` 유입 상태를 교차 검증해 하드코딩된 디버그 로거 판별.\n- **PII(개인정보) 감지 및 실시간 마스킹 (FLT-001)**:\n  - 이메일, 전화번호, API Token 정규식 패턴을 정의하고 LAW 조회 단계에서 즉시 마스킹 수행.\n- **고빈도 노이즈 지문 분석 및 DCR KQL 생성 (PRV-002, FLT-003)**:\n  - 앞 150글자 지문(Fingerprint) 기반 상위 노이즈 패턴 추출 및 LLM 활용 DCR Transformation KQL 생성.\n- **에러 로그 컨텍스트 품질 점수화 (FLT-002)**:\n  - Cause(예외 타입), Location(스택트레이스), Action(조치 힌트) 3요소 품질 평가 점수화.\n\n## 3. 핵심 구현 및 트러블슈팅 인사이트\n- **보안 & 비용 동시 확보**: PII 마스킹을 통한 컴플라이언스 준수와 노이즈 로그 필터링을 통한 비용 절감을 동시에 달성했습니다.\n- **디버깅 SNR 최적화**: 에러 로그 3요소 평가를 통해 실무 개발팀의 장애 조치 리드타임을 대폭 감소시켰습니다.",
                                StudyStatus.PUBLISHED,
                                categoryMap.get("backend"),
                                LocalDate.of(2026, 6, 30),
                                LocalDateTime.of(2026, 6, 30, 18, 0)));
        study3.replaceExperiences(List.of(logDoctorProject));
        if (doctorDetails.size() > 1) {
            study3.replaceExperienceDetails(List.of(doctorDetails.get(0), doctorDetails.get(1)));
        }
        study3.replaceSkills(
                getSkills(
                        List.of("Python", "FastAPI", "Cosmos DB", "Azure OpenAI", "Teams SDK"),
                        skillMap));
        study3.replaceTags(getOrCreateTags(List.of("Cloud", "Azure", "PII Masking", "KQL")));
        studyRepository.save(study3);

        // Study 4: DB Schema Architecture & Pure Domain Entity Placement
        Study study4 =
                studyRepository.save(
                        Study.create(
                                "backend-db-schema-entity-purity-and-placement-architecture",
                                "포트폴리오 백엔드 DB 스키마 정밀 분석 및 UI 메타데이터(Placement) 분리 아키텍처",
                                "JPA Joined Table 상속 전략과 1:N/N:M 이력 매핑 구조를 파악하고, 엔티티 내 UI 전용 필드(timeline_label 등)를 Placement/Presentation 메타데이터로 분리하여 Pure Domain Entity를 유지하는 리팩토링 설계안을 다룹니다.",
                                "# 포트폴리오 백엔드 DB 스키마 정밀 분석 및 UI 메타데이터(Placement) 분리 아키텍처\n\n## 1. 개요 및 스키마 전체 구조\n본 아키텍처 분석 노트는 포트폴리오 백엔드 서비스(`self-intro`)의 데이터베이스 스키마 설계, JPA 엔티티 간 연관 관계, 그리고 **\"화면 표현/큐레이션 전용 메타데이터(UI Display Metadata)와 순수 도메인 엔티티(Pure Domain Entity)의 역할 분리\"** 개선안에 대해 정밀하게 다룹니다.\n\n### 1.1. 전체 ERD 다이어그램\n```mermaid\nerDiagram\n    CAREER ||--o{ PROJECT : \"1:N (career_experience_id)\"\n    EXPERIENCE ||--o{ EXPERIENCE_DETAIL : \"1:N (experience_id)\"\n    EXPERIENCE }|--|{ SKILL : \"N:M (experience_skill)\"\n    EXPERIENCE_DETAIL }|--|{ SKILL : \"N:M (experience_detail_skill)\"\n\n    EXPERIENCE {\n        bigint id PK\n        varchar type \"구분자 (CAREER, PROJECT, EDUCATION, CERTIFICATE)\"\n        varchar title \"제목\"\n        date period_start \"시작일\"\n        date period_end \"종료일\"\n        text summary \"한 줄 요약\"\n        text takeaway \"핵심 성과 및 배운점\"\n        int display_order \"정렬 순서\"\n        boolean show_on_timeline \"타임라인 노출 여부 (개선대상)\"\n        varchar timeline_label \"타임라인 라벨 (개선대상)\"\n    }\n\n    CAREER {\n        bigint experience_id PK, FK\n        varchar company_name \"회사명\"\n        varchar employment_type \"고용 형태\"\n        varchar department \"부서/팀\"\n        varchar role \"직무/역할\"\n    }\n\n    PROJECT {\n        bigint experience_id PK, FK\n        bigint career_experience_id FK \"소속 직장 경력 (1:N)\"\n        varchar slug \"식별 슬러그\"\n        varchar role \"프로젝트 역할\"\n        int contribution_rate \"기여도 (%)\"\n        varchar repository_url \"저장소 URL\"\n    }\n\n    EXPERIENCE_DETAIL {\n        bigint id PK\n        bigint experience_id FK\n        varchar content \"불릿 한 줄 요약\"\n        text situation \"STAR: 상황\"\n        text action_detail \"STAR: 과정\"\n        text outcome \"STAR: 성과\"\n        text narrative \"AI 서술 문단\"\n        int display_order \"정렬 순서\"\n    }\n\n    EXPERIENCE_PLACEMENT {\n        bigint id PK\n        bigint experience_id FK\n        varchar placement_type \"큐레이션 구역 (CORE_PROJECT, TIMELINE 등)\"\n        int display_order \"구역 내 정렬 순서\"\n        boolean enabled \"활성화 여부\"\n    }\n```\n\n---\n\n## 2. 도메인 계층 구조 및 연관 관계 분석\n\n### 2.1. JPA Joined Table 상속 전략 (`@Inheritance(strategy = InheritanceType.JOINED)`)\n- **설계 배경**: `Experience` 부모 테이블에는 공통 속성(`title`, `periodStart`, `periodEnd`, `summary`, `takeaway`, `displayOrder`)을 배치하고, 타입별 독자 필드는 `career`, `project`, `education`, `certificate` 전용 자식 테이블로 조인 분리했습니다.\n- **장점**: 데이터 타입 안전성(Type Safety) 확보 및 RDBMS 제약조건(FK, NOT NULL)을 명확하게 유지할 수 있습니다.\n\n### 2.2. 직장 경력(Career) ↔ 프로젝트(Project) 1:N 위계 구조\n- **연관 매핑**: `Project.career_experience_id` (FK → `Career.experience_id`).\n- **도메인 의미**: \n  - 특정 회사(`Career`)에 소속된 실무 프로젝트는 `career_experience_id`를 통해 1:N으로 묶입니다.\n  - 개인 프로젝트/사이드 프로젝트는 `career_experience_id = NULL`로 관리하여 사내 프로젝트와 전역 사이드 프로젝트를 유연하게 수용합니다.\n\n### 2.3. CAREER의 `ExperienceDetail` 보유 정당성\n- 프로젝트 성격의 세부 구현 불릿은 하위 `Project`로 위임되지만, `Career` 자체도 `ExperienceDetail` 목록을 가질 수 있습니다.\n- **용도**: 회사 차원의 **조직 관리, 팀 리더십, 소프트 스킬, 사내 공통 업무 성과**를 기재하는 독립 전용 불릿 공간으로 활용됩니다.\n\n---\n\n## 3. 엔티티 순수성(Entity Purity)과 UI 메타데이터 분리 개선안\n\n### 3.1. 문제 제기: `show_on_timeline`과 `timeline_label`\n현재 `experience` 테이블에는 화면 표현용 필드인 `show_on_timeline`과 `timeline_label`이 직접 포함되어 있습니다.\n- **도메인 관점의 한계**:\n  1. 이력(`Experience`)이라는 순수 도메인 객체가 \"특정 프론트엔드 UI 화면의 타임라인 뷰\"에 종속되는 문제가 발생합니다.\n  2. 향후 \"이력서 PDF 전용 핀\", \"랜딩 하이라이트\" 등 화면 뷰 요구사항이 추가될 때마다 `experience` 테이블에 컬럼이 계속 추가되는 스키마 오염(Schema Pollution)을 초래합니다.\n\n### 3.2. 개선 설계안: Placement / Presentation Decorator 패턴 적용\n`show_on_timeline` 및 `timeline_label`을 기존 `ExperiencePlacement` 큐레이션 메타데이터 구조로 흡수/통합하는 리팩토링 모델입니다.\n\n```mermaid\nclassDiagram\n    class Experience {\n        +Long id\n        +String title\n        +LocalDate periodStart\n        +LocalDate periodEnd\n        +String summary\n        +String takeaway\n    }\n\n    class ExperiencePlacement {\n        +Long id\n        +Experience experience\n        +PlacementType placementType : TIMELINE / CORE_PROJECT\n        +String customLabel\n        +int displayOrder\n        +boolean enabled\n    }\n\n    Experience \"1\" <-- \"0..*\" ExperiencePlacement : UI Decorator\n```\n\n1. **`ExperiencePlacementType`에 `TIMELINE` 추가**:\n   - `placement_type = 'TIMELINE'` 행을 통해 타임라인 노출 여부(`enabled`), 순서(`displayOrder`), 커스텀 타임라인 라벨(`customLabel`)을 관리합니다.\n2. **`Experience` 엔티티 정제**:\n   - `Experience` 엔티티에서는 UI 종속 필드를 제거하여 순수한 비즈니스 이력 정보만 유지합니다.\n\n---\n\n## 4. 결론 및 리팩토링 실행 로드맵\n1. **Flyway 마이그레이션**: `V45__decouple_timeline_placement.sql`을 작성하여 기존 `experience.show_on_timeline` 및 `timeline_label` 데이터를 `experience_placement` (PlacementType='TIMELINE')으로 이관.\n2. **JPA 엔티티 정제**: `Experience` 클래스에서 `showOnTimeline`, `timelineLabel` 필드 제거.\n3. **DTO 및 Presentation Layer 개편**: 프론트엔드 API 응답 시 `ExperiencePlacement` 데이터를 조합하여 DTO로 반환함으로써 깔끔한 DDD / CQRS 구조 완성.\n",
                                StudyStatus.PUBLISHED,
                                categoryMap.get("backend"),
                                LocalDate.of(2026, 7, 21),
                                LocalDateTime.of(2026, 7, 21, 11, 0)));
        study4.replaceExperiences(List.of(logDoctorProject));
        if (doctorDetails.size() > 0) {
            study4.replaceExperienceDetails(List.of(doctorDetails.get(0)));
        }
        study4.replaceSkills(
                getSkills(
                        List.of("Java", "Spring Boot", "Spring Data JPA", "PostgreSQL", "Flyway"),
                        skillMap));
        study4.replaceTags(
                getOrCreateTags(
                        List.of("Backend", "Database Modeling", "JPA", "DDD", "Refactoring")));
        studyRepository.save(study4);
    }

    private void cleanupDuplicates() {
        // If we find 'Spring Boot 3.3' in the database, merge it into 'Spring Boot'
        java.util.Optional<Skill> springBoot33Opt = skillRepository.findByName("Spring Boot 3.3");
        java.util.Optional<Skill> springBootOpt = skillRepository.findByName("Spring Boot");
        if (springBoot33Opt.isPresent() && springBootOpt.isPresent()) {
            Skill s33 = springBoot33Opt.get();
            Skill sBase = springBootOpt.get();

            // Re-map experience_skill references
            jdbcTemplate.execute(
                    "UPDATE experience_skill SET skill_id = "
                            + sBase.getId()
                            + " WHERE skill_id = "
                            + s33.getId()
                            + " AND experience_id NOT IN (SELECT es2.experience_id FROM (SELECT * FROM experience_skill) es2 WHERE es2.skill_id = "
                            + sBase.getId()
                            + ")");
            jdbcTemplate.execute("DELETE FROM experience_skill WHERE skill_id = " + s33.getId());

            // Delete the duplicate skill
            skillRepository.delete(s33);
        }

        // If 'Spring Boot' is found, make sure its name is 'Spring Boot' and version is '3'
        skillRepository
                .findByName("Spring Boot")
                .ifPresent(
                        s -> {
                            s.update(
                                    s.getName(),
                                    s.getCategory(),
                                    s.getSkillLevel(),
                                    "3",
                                    s.getComment(),
                                    "WORK_EXPERIENCE",
                                    s.isCore(),
                                    s.getDisplayOrder());
                            skillRepository.save(s);
                        });

        // Similar cleanup for React 19
        java.util.Optional<Skill> react19Opt = skillRepository.findByName("React 19");
        java.util.Optional<Skill> reactOpt = skillRepository.findByName("React");
        if (react19Opt.isPresent() && reactOpt.isPresent()) {
            Skill r19 = react19Opt.get();
            Skill rBase = reactOpt.get();

            jdbcTemplate.execute(
                    "UPDATE experience_skill SET skill_id = "
                            + rBase.getId()
                            + " WHERE skill_id = "
                            + r19.getId()
                            + " AND experience_id NOT IN (SELECT es2.experience_id FROM (SELECT * FROM experience_skill) es2 WHERE es2.skill_id = "
                            + rBase.getId()
                            + ")");
            jdbcTemplate.execute("DELETE FROM experience_skill WHERE skill_id = " + r19.getId());

            skillRepository.delete(r19);
        }

        skillRepository
                .findByName("React")
                .ifPresent(
                        s -> {
                            s.update(
                                    s.getName(),
                                    s.getCategory(),
                                    s.getSkillLevel(),
                                    "19",
                                    s.getComment(),
                                    "WORK_EXPERIENCE",
                                    s.isCore(),
                                    s.getDisplayOrder());
                            skillRepository.save(s);
                        });

        // Java 21 -> Java
        skillRepository
                .findByName("Java 21")
                .ifPresent(
                        s -> {
                            s.update(
                                    "Java",
                                    s.getCategory(),
                                    s.getSkillLevel(),
                                    "21",
                                    s.getComment(),
                                    "WORK_EXPERIENCE",
                                    s.isCore(),
                                    s.getDisplayOrder());
                            skillRepository.save(s);
                        });

        // TypeScript version -> 5
        skillRepository
                .findByName("TypeScript")
                .ifPresent(
                        s -> {
                            s.update(
                                    s.getName(),
                                    s.getCategory(),
                                    s.getSkillLevel(),
                                    "5",
                                    s.getComment(),
                                    s.getUsageType(),
                                    s.isCore(),
                                    s.getDisplayOrder());
                            skillRepository.save(s);
                        });

        // Node.js version -> 20
        skillRepository
                .findByName("Node.js")
                .ifPresent(
                        s -> {
                            s.update(
                                    s.getName(),
                                    s.getCategory(),
                                    s.getSkillLevel(),
                                    "20",
                                    s.getComment(),
                                    s.getUsageType(),
                                    s.isCore(),
                                    s.getDisplayOrder());
                            skillRepository.save(s);
                        });
    }

    private void syncExistingStudies() {
        List<Study> existingStudies = studyRepository.findAll();
        if (existingStudies.isEmpty()) return;

        List<ExperienceDetail> allDetails =
                experienceRepository.findAll().stream()
                        .flatMap(exp -> exp.getDetails().stream())
                        .toList();

        for (Study study : existingStudies) {
            switch (study.getSlug()) {
                case "db-level-pii-encryption-and-migration" -> {
                    study.update(
                            study.getSlug(),
                            study.getTitle(),
                            study.getSummary(),
                            "# JPA Converter와 HMAC 해싱을 통한 개인정보(PII) 암호화 및 무중단 데이터 마이그레이션\n\n## 1. 기술 개념 및 핵심 이론\n\n### JPA Attribute Converter란?\n- JPA 2.1부터 표준 도입된 `AttributeConverter<X, Y>` 인터페이스는 자바 엔티티 필드 타입(X)과 데이터베이스 컬럼 타입(Y) 간의 변환 로직을 캡슐화하는 영속성 계층 메커니즘입니다.\n- `convertToDatabaseColumn(X attribute)`: 엔티티가 `INSERT`/`UPDATE`되어 영속성 컨텍스트에서 DB로 저장되기 직전 자동으로 암호화 로직이 실행됩니다.\n- `convertToEntityAttribute(Y dbData)`: DB에서 `SELECT`하여 엔티티로 로딩(Hydration)될 때 자동으로 복호화 로직이 실행됩니다.\n- 서비스 레이어나 비즈니스 도메인의 코드 수정 없이 엔티티 필드 레벨 선언만으로 투명한(Transparent) 투명 암복호화를 달성합니다.\n\n### HMAC-SHA256 해시와 등치 검색(Equi-Join) 원리\n- **AES/GCM 암호화의 한계**: 보안성을 높이기 위해 매 암호화마다 무작위 IV(Initialization Vector)를 사용하는 AES/GCM 암호문은 동일한 평문(\"user@test.com\")이라도 매번 무작위 암호문이 생성됩니다. 따라서 `WHERE email = '암호문'` 형태의 DB 등치 검색(Equi-Join) 및 B-Tree 인덱스 조회가 불가능합니다.\n- **HMAC 해결책**: 서버만 보유한 Secret Key와 평문을 조합하여 SHA-256 단방향 해시값을 생성합니다. 동일한 평문에 대해 항상 일관된 64자리 헥사 해시값이 생성되므로, `WHERE email_hash = 'HMAC(평문)'` 쿼리로 B-Tree 인덱스를 타는 속도 빠른 조회가 가능합니다.\n\n---\n\n## 2. 내부 동작 메커니즘 및 무중단 이관 전략\n\n### 무중단 마이그레이션 (관용적 복호화: Decrypt-or-PassThrough)\n- 기존 수십만 건의 평문 데이터가 DB에 적재된 상황에서 암호화 스키마로 전환할 때, 마이그레이션 도중 수신된 요청이 복호화 예외를 던지지 않도록 예외 처리 패턴을 설계했습니다.\n- `convertToEntityAttribute` 실행 시 `Cipher.doFinal()`이 `BadPaddingException` 또는 `IllegalBlockSizeException`을 던지면(미암호화 평문 데이터인 경우), 예외를 삼키고 평문 string을 그대로 반환합니다.\n- 백그라운드 배치 스크립트가 `email_hash`가 null인 행을 순차 스캔하여 암호화 업데이트를 이관 수행합니다.\n\n---\n\n## 3. 핵심 구현 코드 및 트러블슈팅 인사이트\n\n### 1) JPA EncryptedStringConverter 구현 코드\n```java\n@Converter\npublic class EncryptedStringConverter implements AttributeConverter<String, String> {\n    private static final String ALGORITHM = \"AES/GCM/NoPadding\";\n    private static final int GCM_TAG_LENGTH = 128;\n    private static final int IV_LENGTH = 12;\n\n    @Override\n    public String convertToDatabaseColumn(String attribute) {\n        if (attribute == null) return null;\n        try {\n            byte[] iv = generateRandomIv(IV_LENGTH);\n            Cipher cipher = Cipher.getInstance(ALGORITHM);\n            cipher.init(Cipher.ENCRYPT_MODE, getSecretKeySpec(), new GCMParameterSpec(GCM_TAG_LENGTH, iv));\n            byte[] cipherText = cipher.doFinal(attribute.getBytes(StandardCharsets.UTF_8));\n            byte[] combined = ByteBuffer.allocate(iv.length + cipherText.length).put(iv).put(cipherText).array();\n            return Base64.getEncoder().encodeToString(combined);\n        } catch (Exception e) {\n            throw new IllegalStateException(\"PII Encryption Failed\", e);\n        }\n    }\n\n    @Override\n    public String convertToEntityAttribute(String dbData) {\n        if (dbData == null) return null;\n        try {\n            byte[] decoded = Base64.getDecoder().decode(dbData);\n            ByteBuffer bb = ByteBuffer.wrap(decoded);\n            byte[] iv = new byte[IV_LENGTH];\n            bb.get(iv);\n            byte[] cipherText = new byte[bb.remaining()];\n            bb.get(cipherText);\n\n            Cipher cipher = Cipher.getInstance(ALGORITHM);\n            cipher.init(Cipher.DECRYPT_MODE, getSecretKeySpec(), new GCMParameterSpec(GCM_TAG_LENGTH, iv));\n            return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);\n        } catch (BadPaddingException | IllegalBlockSizeException e) {\n            // Decrypt-or-PassThrough: 아직 암호화되지 않은 레거시 평문 데이터 대응\n            return dbData;\n        } catch (Exception e) {\n            throw new IllegalStateException(\"PII Decryption Failed\", e);\n        }\n    }\n}\n```\n\n### 2) HMAC-SHA256 해시 생성기\n```java\npublic class HmacUtils {\n    public static String calculateHmac(String plainText, String secretKey) {\n        try {\n            Mac sha256Hmac = Mac.getInstance(\"HmacSHA256\");\n            SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), \"HmacSHA256\");\n            sha256Hmac.init(secretKeySpec);\n            byte[] hash = sha256Hmac.doFinal(plainText.getBytes(StandardCharsets.UTF_8));\n            return Hex.encodeHexString(hash);\n        } catch (Exception e) {\n            throw new IllegalStateException(\"HMAC Generation Failed\", e);\n        }\n    }\n}\n```\n\n### 3) 트러블슈팅 인사이트\n- **GCM Nonce(IV) 재사용 금지**: 동일 키로 동일 IV를 재사용하면 엑스오어(XOR) 키스트림 분석으로 암호문이 복호화될 수 있습니다. 매 암호화 시 `SecureRandom`으로 12바이트 IV를 동적 생성해야 합니다.\n- **인덱스 스키마 설계**: `email_hash` 컬럼에 B-Tree 인덱스를 걸어 풀스캔 없는 `O(log N)` 등치 조회를 달성했습니다.",
                            study.getStatus(),
                            study.getCategory(),
                            study.getLearnedAt(),
                            study.getPublishedAt());
                    if (!allDetails.isEmpty()) {
                        allDetails.stream()
                                .filter(
                                        d ->
                                                d.getContent().contains("PII")
                                                        || d.getContent().contains("암호화"))
                                .findFirst()
                                .ifPresent(d -> study.replaceExperienceDetails(List.of(d)));
                    }
                }
                case "ai-tutor-session-architecture" -> {
                    study.update(
                            study.getSlug(),
                            study.getTitle(),
                            study.getSummary(),
                            "# AI 튜터 메시징 대화형 세션 아키텍처 설계 및 구현\n\n## 1. 기술 개념 및 핵심 이론\n\n### 팩토리 패턴(Factory Pattern) 기반 다형적 학습 도메인 캡슐화\n- 학습 플랫폼 내 문제풀이, 오답 복습, 챌린지, 개념 보강 등 4가지 서로 다른 학습 도메인을 단일 대화형 AI 세션 인터페이스로 통합하는 패턴입니다.\n- `AiTutorSessionFactory`는 각 도메인 엔티티의 상태(학습 이력, 문제 난이도, 오답 유형)를 캡슐화하여 공통 `AiTutorSessionContext`로 변환하여 LLM 프롬프트 생성기로 전달합니다.\n\n### SQS 비동기 Pub/Sub 메시징 및 Redis 멱등성(Idempotency) 보장\n- **LLM Latency 격리**: 외부 LLM API(OpenAI/Claude 등) 통신의 지연시간(수 초)이 HTTP 웹 스레드를 점유하지 않도록 AWS SQS 큐로 메시지 수발신을 분리했습니다.\n- **Redis INCR 기반 멱등키 보장**: SQS 메시지 재시도(Retry)가 일어날 때 `INCR idempotency:session:{messageId}` 와 TTL을 사용하여 중복 세션 응답 작성을 원자적으로 방지했습니다.\n\n---\n\n## 2. 내부 동작 메커니즘 및 아키텍처\n\n```mermaid\ngraph LR\n    User[Student App] -->|1. Prompt Request| BFF[NestJS BFF]\n    BFF -->|2. Enqueue Message| SQS[AWS SQS Queue]\n    SQS -->|3. Consume| Worker[Worker Engine]\n    Worker -->|4. Redis Lock & Idempotency Check| Redis[(Redis)]\n    Worker -->|5. Multi-Doc Tx| Mongo[(MongoDB Session Store)]\n```\n\n### MongoDB Replica Set Multi-Document Transaction\n- 세션 상태 전이(ACTIVE ↔ COMPLETED)와 대화 메시지 기록(`SessionMessage`)이 원자적으로 처리되어야 하므로 MongoDB Replica Set 트랜잭션을 적용했습니다.\n\n---\n\n## 3. 핵심 구현 코드 및 트러블슈팅 인사이트\n\n### 1) Redis 멱등키 검증 코드\n```typescript\nasync function processAiMessage(event: SqsMessage): Promise<void> {\n    const { idempotenceKey, sessionId, userPrompt } = JSON.parse(event.Body);\n    \n    // Redis Atomic Lock (10초 TTL)\n    const isNewMessage = await redisClient.set(`idempotency:${idempotenceKey}`, 'LOCKED', 'NX', 'EX', 10);\n    if (!isNewMessage) {\n        console.warn(`[Duplicate Message Dropped] Key: ${idempotenceKey}`);\n        return;\n    }\n\n    const sessionContext = await aiTutorSessionFactory.createContext(sessionId);\n    const llmResponse = await llmClient.generateResponse(sessionContext, userPrompt);\n    \n    await mongoSessionRepository.appendMessageWithTx(sessionId, userPrompt, llmResponse);\n}\n```\n\n### 2) 인사이트\n- **도메인 격리**: 팩토리 패턴을 사용함으로 신규 학습 컨텍스트(예: AI 면접 모드)가 추가되더라도 기존 AI 파이프라인 수정을 제로화했습니다.\n- **비동기 멱등성**: 네트워크 실패에 따른 SQS 재전송 상황에서도 Redis Lock으로 동일 메시지가 중복 처리되는 이중 과금을 방지했습니다.",
                            study.getStatus(),
                            study.getCategory(),
                            study.getLearnedAt(),
                            study.getPublishedAt());
                    if (!allDetails.isEmpty()) {
                        allDetails.stream()
                                .filter(
                                        d ->
                                                d.getContent().contains("도메인 추상화")
                                                        || d.getContent().contains("AI 튜터"))
                                .findFirst()
                                .ifPresent(d -> study.replaceExperienceDetails(List.of(d)));
                    }
                }
                case "realtime-student-presence-and-monitoring" -> {
                    study.update(
                            study.getSlug(),
                            study.getTitle(),
                            study.getSummary(),
                            "# 실시간 학생 Presence 추적 및 이상 행동 감지 시스템 구축\n\n## 1. 기술 개념 및 핵심 이론\n\n### WebSocket Connection Cost vs 경량 HTTP Ping/Pong Polling\n- **상태 추적의 난제**: 수천 명의 동시 접속 학생 상태(온라인, 오프라인, 자리비움)를 실시간 모니터링할 때 WebSocket 연결 유지 비용(메모리, 커넥션 락)이 큽니다.\n- **대안**: 1분 주기 경량 HTTP Ping API와 Redis Sorted Set(ZSET) 타임스탬프 슬라이딩 윈도우를 조합하여 서버 리소스 사용량을 90% 이상 절감하면서도 유효 접속 상태를 추적했습니다.\n\n### 비동기 이상 행동 규칙 엔진 (Threshold Rule Engine)\n- 연속 문제 스킵, 풀이 시간 이상 지연 등 이상 이벤트를 API 스레드에서 직접 처리하지 않고 SQS 비동기 파이프라인에 투입하여 실시간 점수화 및 교사 알림을 생성합니다.\n\n---\n\n## 2. 내부 동작 메커니즘 및 타임아웃 판정\n\n```mermaid\ngraph TD\n    A[Student Ping HTTP] -->|1. ZADD timestamp| B[(Redis ZSET: presence_online)]\n    C[Presence Evaluator Cron] -->|2. ZREMRANGEBYSCORE old| B\n    C -->|3. Active Sessions| D[Teacher Dashboard API]\n```\n\n---\n\n## 3. 핵심 구현 코드 및 트러블슈팅 인사이트\n\n### 1) Redis ZSET 기반 Presence 추적 코드\n```java\n@Service\n@RequiredArgsConstructor\npublic class StudentPresenceService {\n    private final StringRedisTemplate redisTemplate;\n    private static final String PRESENCE_KEY = \"presence:online_students\";\n\n    public void recordPing(Long studentId) {\n        long currentTimestamp = System.currentTimeMillis();\n        redisTemplate.opsForZSet().add(PRESENCE_KEY, String.valueOf(studentId), currentTimestamp);\n    }\n\n    public Set<String> getActiveStudents(long timeoutMillis) {\n        long now = System.currentTimeMillis();\n        long minScore = now - timeoutMillis; // 2분 이내 핑을 보낸 학생만 오프라인 제외\n        return redisTemplate.opsForZSet().rangeByScore(PRESENCE_KEY, minScore, now);\n    }\n}\n```\n\n### 2) 인사이트\n- **웹소켓 오버헤드 해소**: 웹소켓 지속 연결 없이도 Redis In-Memory 스코어 쿼리로 수천 명의 접속을 원활히 관측했습니다.\n- **이상 행동 즉각 통지**: Hexagonal Architecture 포트/어댑터를 통해 알림 도메인과 데이터 유입계를 분리하여 확장성을 확보했습니다.",
                            study.getStatus(),
                            study.getCategory(),
                            study.getLearnedAt(),
                            study.getPublishedAt());
                    if (!allDetails.isEmpty()) {
                        allDetails.stream()
                                .filter(
                                        d ->
                                                d.getContent().contains("Presence")
                                                        || d.getContent().contains("실시간"))
                                .findFirst()
                                .ifPresent(d -> study.replaceExperienceDetails(List.of(d)));
                    }
                }
                case "cqrs-refactoring-and-data-migration" -> {
                    study.update(
                            study.getSlug(),
                            study.getTitle(),
                            study.getSummary(),
                            "# 제출 문항 도메인의 CQRS 리팩토링 및 6만 건 데이터 마이그레이션\n\n## 1. 기술 개념 및 핵심 이론\n\n### CQRS (Command Query Responsibility Segregation) 패턴\n- **개념**: 시스템의 명령(Command: C/U/D) 모델과 조회(Query: Read) 모델을 분리하는 소프트웨어 아키텍처 패턴입니다.\n- **도입 배경**: 학생 답안 제출 쓰기 트래픽과 학원/교사 통계 대시보드 조회 읽기 트래픽의 access pattern이 극단적으로 달라 단일 MongoDB 컬렉션(`SubmittedProblem`)에서 집계 쿼리 실행 시 DB Lock 및 I/O 병목이 심화되었습니다.\n- **해결**: 쓰기 모델은 트랜잭션 중심 구조로 유지하고, 읽기 모델은 4개의 집계 전용 컬렉션(`class-submitted`, `student-submitted`, `total-submitted`, `academy-submitted`)으로 분리했습니다.\n\n---\n\n## 2. 내부 동작 메커니즘 및 Eventual Consistency\n\n```mermaid\ngraph LR\n    A[Student Submit Answer] -->|1. Command Write| W[(SubmittedProblem DB)]\n    W -->|2. Domain Event| SQS[SQS Event Bus]\n    SQS -->|3. Async Sync Worker| R[(Read Models: Statistics DB)]\n    Teacher[Teacher Dashboard] -->|4. Fast Query| R\n```\n\n---\n\n## 3. 핵심 구현 코드 및 트러블슈팅 인사이트\n\n### 1) CQRS 읽기 모델 업데이트 핸들러\n```typescript\n@EventsHandler(ProblemSubmittedEvent)\nexport class ProblemSubmittedHandler implements IEventHandler<ProblemSubmittedEvent> {\n    constructor(private readonly readModelRepo: ReadModelRepository) {}\n\n    async handle(event: ProblemSubmittedEvent): Promise<void> {\n        const { academyId, classId, studentId, isCorrect, elapsedTime } = event;\n\n        // 학급/학생/전체/학원 4개 Read Model 전용 컬렉션에 Atomic Incr 반영\n        await Promise.all([\n            this.readModelRepo.incrementClassStat(classId, isCorrect, elapsedTime),\n            this.readModelRepo.incrementStudentStat(studentId, isCorrect, elapsedTime),\n            this.readModelRepo.incrementAcademyStat(academyId, isCorrect, elapsedTime),\n        ]);\n    }\n}\n```\n\n### 2) 인사이트\n- **대시보드 응답속도 혁신**: 수초 이상 소요되던 MongoDB `$group` 집계 조회를 Pre-aggregated Read Model 조회로 변경하여 10ms 이내로 단축시켰습니다.\n- **이벤트 정합성**: 쓰기 성능 손실 없는 비동기 이벤트를 통해 최종 정합성(Eventual Consistency)을 보장했습니다.",
                            study.getStatus(),
                            study.getCategory(),
                            study.getLearnedAt(),
                            study.getPublishedAt());
                    if (!allDetails.isEmpty()) {
                        allDetails.stream()
                                .filter(
                                        d ->
                                                d.getContent().contains("CQRS")
                                                        || d.getContent().contains("마이그레이션"))
                                .findFirst()
                                .ifPresent(d -> study.replaceExperienceDetails(List.of(d)));
                    }
                }
                case "spring-boot-backoffice-and-session-auth" -> {
                    study.update(
                            study.getSlug(),
                            study.getTitle(),
                            study.getSummary(),
                            "# Spring Boot 백오피스 서버 단독 구축 및 Redis 세션 기반 크로스도메인 해결\n\n## 1. 기술 개념 및 핵심 이론\n\n### Spring Session Data Redis 분산 인증 메커니즘\n- **서버 무상태성(Stateless)과 세션 공유**: 분산 백오피스 환경에서 서블릿 세션을 Tomcat 힙 메모리가 아닌 외부 Redis 인메모리 스토어에 보관하는 메커니즘입니다.\n- `SessionRepositoryFilter`가 서블릿 요청을 가로채 `HttpSession`을 Redis 기반 `RedisSession`으로 래핑하여 다중 서버 간 동일한 세션 ID 인증을 처리합니다.\n\n### Cross-Domain CORS & SameSite Cookie 정책\n- 브라우저 보안 정책 상 프론트엔드(`admin.example.com`)와 백엔드(`api.example.com`) 도메인이 다를 때, `Set-Cookie`의 `SameSite` 속성이 `None`이고 `Secure` 플래그가 활성화되어야 크로스 도메인 요청에서 인증 쿠키가 전달됩니다.\n\n---\n\n## 2. 내부 동작 메커니즘 및 헤더 처리\n\n```mermaid\ngraph LR\n    Browser[Admin Frontend] -->|1. Cross-Domain Req| Nginx[Nginx Sub-Proxy]\n    Nginx -->|2. Pass SameSite=None| Spring[Spring Boot Security]\n    Spring -->|3. Session Lookup| Redis[(Redis Session Store)]\n```\n\n---\n\n## 3. 핵심 구현 코드 및 트러블슈팅 인사이트\n\n### 1) Spring Security & CookieSerializer 설정\n```java\n@Configuration\n@EnableRedisHttpSession(maxInactiveIntervalInSeconds = 3600)\npublic class RedisSessionConfig {\n\n    @Bean\n    public CookieSerializer cookieSerializer() {\n        DefaultCookieSerializer serializer = new DefaultCookieSerializer();\n        serializer.setCookieName(\"ADMIN_SESSION_ID\");\n        serializer.setSameSite(\"None\"); // Cross-Domain 쿠키 전송 허용\n        serializer.setUseSecureCookie(true);\n        serializer.setCookiePath(\"/\");\n        return serializer;\n    }\n}\n```\n\n### 2) HMAC-SHA256 헤더 서명 알고리즘 (NCP 카카오 알림톡)\n```java\npublic String makeSignature(String url, String timestamp, String accessKey, String secretKey) {\n    String space = \" \";\n    String newLine = \"\\n\";\n    String method = \"POST\";\n\n    String message = new StringBuilder()\n        .append(method).append(space).append(url).append(newLine)\n        .append(timestamp).append(newLine).append(accessKey)\n        .toString();\n\n    SecretKeySpec signingKey = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), \"HmacSHA256\");\n    Mac mac = Mac.getInstance(\"HmacSHA256\");\n    mac.init(signingKey);\n    byte[] rawHmac = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));\n    return Base64.getEncoder().encodeToString(rawHmac);\n}\n```\n\n### 3) 인사이트\n- **크로스 도메인 인증 차단 해제**: CookieSerializer와 Nginx 프록시 레이어의 `SameSite=None; Secure` 설정을 조합해 도메인 분리 환경에서 SSO 로그인 세션 유지를 완성했습니다.",
                            study.getStatus(),
                            study.getCategory(),
                            study.getLearnedAt(),
                            study.getPublishedAt());
                    if (!allDetails.isEmpty()) {
                        allDetails.stream()
                                .filter(
                                        d ->
                                                d.getContent().contains("백오피스")
                                                        || d.getContent().contains("카카오"))
                                .findFirst()
                                .ifPresent(d -> study.replaceExperienceDetails(List.of(d)));
                    }
                }
                case "common-packages-and-cli-scaffolding" -> {
                    study.update(
                            study.getSlug(),
                            study.getTitle(),
                            study.getSummary(),
                            "# 사내 공용 라이브러리 모노레포 구축 및 CLI 스캐폴딩 도구 개발\n\n## 1. 기술 개념 및 핵심 이론\n\n### Monorepo Workspaces & Symlink 의존성 관리\n- **개념**: 여러 유틸리티 패키지(`@susimdal/common`, `@susimdal/core`, `@susimdal/infra`)를 단일 레포지토리에서 관리하고 npm/pnpm workspaces를 사용하여 레포 내부 패키지 간 심볼릭 링크(symlink)로 의존성을 연결합니다.\n- **도입 효과**: 코드 복사-붙여넣기 파편화를 방지하고, 공통 예외 인터셉터나 DB 래퍼 수정 시 전사 서비스에 일괄 적용이 가능합니다.\n\n### Node.js Commander 기반 CLI 스캐폴딩 도구\n- 신규 백엔드 마이크로서비스 셋업 시 커스텀 CLI 명령(`susimdal new <name>`)을 통해 Dockerfile, GitHub Actions CI/CD, NestJS 모듈 구조 템플릿을 자동으로 스캐폴딩(Scaffolding)하는 유틸리티입니다.\n\n---\n\n## 2. 모노레포 레이어 아키텍처\n\n```\npackages/\n├── common/  # HTTP 예외 코드, 공통 Logger, Types\n├── core/    # NestJS 서버 보일러플레이트, Interceptor\n└── infra/   # MongoDB, Redis, SQS 연결 래퍼\n```\n\n---\n\n## 3. 핵심 구현 코드 및 트러블슈팅 인사이트\n\n### 1) Commander 기반 CLI 구현 코드\n```typescript\n#!/usr/bin/env node\nimport { Command } from 'commander';\nimport * as fs from 'fs-extra';\nimport * as path from 'path';\n\nconst program = new Command();\n\nprogram\n    .command('new <serviceName>')\n    .description('Create a new microservice boilerplate')\n    .action(async (serviceName) => {\n        const targetDir = path.join(process.cwd(), serviceName);\n        const templateDir = path.join(__dirname, '../templates/backend');\n\n        console.log(`[Scaffolding] Creating microservice: ${serviceName}...`);\n        await fs.copy(templateDir, targetDir);\n        \n        // package.json serviceName 치환\n        const pkgPath = path.join(targetDir, 'package.json');\n        const pkgContent = await fs.readJson(pkgPath);\n        pkgContent.name = `@susimdal/${serviceName}`;\n        await fs.writeJson(pkgPath, pkgContent, { spaces: 2 });\n\n        console.log(`[Success] Microservice ${serviceName} created successfully!`);\n    });\n\nprogram.parse(process.argv);\n```\n\n### 2) 인사이트\n- **표준화**: 전사 마이크로서비스의 에러 포맷과 로깅 규격을 통일하여 아키텍처 일관성을 달성했습니다.\n- **생산성**: 신규 모듈 셋업 시간을 수일에서 수분 이내로 감축시켰습니다.",
                            study.getStatus(),
                            study.getCategory(),
                            study.getLearnedAt(),
                            study.getPublishedAt());
                    if (!allDetails.isEmpty()) {
                        allDetails.stream()
                                .filter(
                                        d ->
                                                d.getContent().contains("모노레포")
                                                        || d.getContent().contains("스캐폴딩"))
                                .findFirst()
                                .ifPresent(d -> study.replaceExperienceDetails(List.of(d)));
                    }
                }
                case "naver-cafe-session-playwright-automation" -> {
                    study.update(
                            study.getSlug(),
                            study.getTitle(),
                            study.getSummary(),
                            "# Playwright 브라우저 자동화를 통한 네이버 카페 보안 세션 우회 및 E2E 답변 자동화\n\n## 1. 기술 개념 및 핵심 이론\n\n### Headless Browser & Cookie Context Injection\n- **개념**: 화면 렌더링 없이 백그라운드에서 동작하는 Node.js 기반 Playwright 브라우저 제어 라이브러리입니다.\n- **로그인 보안 우회 기법**: CAPTCHA 및 2단계 인증으로 인해 단순 HTTP Request 로그인 생성이 불가능한 구조를 해결하기 위해, OTP 입력으로 인증된 쿠키(`NID_AUT`, `NID_SES`)를 AES/GCM으로 암호화 보관 후 브라우저 Context에 주입(`browserContext.addCookies()`)하여 보안 세션을 유지합니다.\n\n---\n\n## 2. 내부 동작 메커니즘 및 세션 헬스체크\n\n```mermaid\ngraph TD\n    A[OTP Login Worker] -->|1. Extract Cookies| B[NID_AUT, NID_SES]\n    B -->|2. AES/GCM Encrypt| DB[(Database Session Store)]\n    Cron[Session Health Cron] -->|3. Check Valid| DB\n    Worker[Answer Automation Worker] -->|4. Inject Cookies & DOM Action| Cafe[Naver Cafe Mobile DOM]\n```\n\n---\n\n## 3. 핵심 구현 코드 및 트러블슈팅 인사이트\n\n### 1) Playwright 세션 쿠키 주입 및 답글 작성 코드\n```typescript\nasync function postAutomatedReply(postUrl: string, commentText: string, sessionCookies: any[]) {\n    const browser = await chromium.launch({ headless: true });\n    const context = await browser.newContext();\n\n    // 1. 저장된 NID_AUT / NID_SES 세션 쿠키 주입\n    await context.addCookies(sessionCookies);\n    const page = await context.newPage();\n\n    // 2. 모바일 네이버 카페 게시글 접근\n    await page.goto(postUrl, { waitUntil: 'domcontentloaded' });\n\n    // 3. 댓글 입력 폼 클릭 및 innerHTML DOM 주입\n    await page.click('.btn_comment');\n    await page.fill('#comment_text_area', commentText);\n    await page.click('.btn_register');\n\n    await browser.close();\n}\n```\n\n### 2) 인사이트\n- **세션 자동 헬스체크**: 30분 주기로 세션 갱신 여부를 판별해 캡차 챌린지를 방지하고 무중단 E2E 자동 답변 시스템을 안착시켰습니다.",
                            study.getStatus(),
                            study.getCategory(),
                            study.getLearnedAt(),
                            study.getPublishedAt());
                    if (!allDetails.isEmpty()) {
                        allDetails.stream()
                                .filter(
                                        d ->
                                                d.getContent().contains("Playwright")
                                                        || d.getContent().contains("네이버"))
                                .findFirst()
                                .ifPresent(d -> study.replaceExperienceDetails(List.of(d)));
                    }
                }
                case "inquiry-thread-parsing-and-automatic-mapping" -> {
                    study.update(
                            study.getSlug(),
                            study.getTitle(),
                            study.getSummary(),
                            "# 이메일 및 카페 문의의 다형적 통합 수집과 헤더 기반 스레딩/상태 제어 엔진 구축\n\n## 1. 기술 개념 및 핵심 이론\n\n### RFC 5322 이메일 헤더 스레딩 표준 (`Message-ID`, `In-Reply-To`, `References`)\n- **개념**: 이메일 프로토콜 표준(RFC 5322)에서 각 메일은 고유한 `Message-ID`를 가집니다. 회신 메일은 이전 메일의 ID를 `In-Reply-To` 및 `References` 헤더에 포함합니다.\n- **스레드 복원 알고리즘**: 헤더 체인을 역추적하여 부모 문의(`ParentInquiry`)를 찾아내고 개별 메일들을 하나의 대화 스레드 트리(Thread Tree) 구조로 묶어냅니다.\n\n### 발신자 HMAC 해싱 및 Heuristic 제목 파싱\n- 헤더 정보가 유실된 웹 문의의 경우, 발신자 이메일의 HMAC-SHA256 해시(`email_sender_hash`)와 정규식으로 정제된 제목(Re:, Fwd: 제거)을 기반으로 최근 24시간 내 동일 발신자의 오픈 문의에 회신으로 결속합니다.\n\n---\n\n## 2. 유한 상태 머신(FSM) 기반 문의 상태 전이\n\n```mermaid\nstateDiagram-v2\n    [*] --> OPEN: 신규 문의 접수\n    OPEN --> RESOLVED: 상담원 답변 완료\n    RESOLVED --> OPEN: 고객 추가 회신 유입 (자동 재오픈)\n```\n\n---\n\n## 3. 핵심 구현 코드 및 트러블슈팅 인사이트\n\n### 1) RFC 헤더 기반 스레드 추적 구현 코드\n```java\npublic InquiryThread resolveThread(ParsedEmail email) {\n    String inReplyTo = email.getInReplyTo();\n    List<String> references = email.getReferences();\n\n    // 1. In-Reply-To 헤더로 direct parent search\n    if (StringUtils.hasText(inReplyTo)) {\n        Optional<Inquiry> parent = inquiryRepository.findByMessageId(inReplyTo);\n        if (parent.isPresent()) {\n            return parent.get().getThread();\n        }\n    }\n\n    // 2. References 헤더 체인 스캔\n    for (String refId : references) {\n        Optional<Inquiry> refInquiry = inquiryRepository.findByMessageId(refId);\n        if (refInquiry.isPresent()) {\n            return refInquiry.get().getThread();\n        }\n    }\n\n    // 3. Heuristic 발신자 HMAC & 제목 기반 결속\n    return resolveHeuristicThread(email.getSenderEmail(), email.getCleanSubject());\n}\n```\n\n### 2) 인사이트\n- **상태 제어 누락 방지**: RESOLVED 상태 문의에 추가 회신이 올 때 상태를 OPEN으로 자동 복귀시켜 문의 누락율을 0%로 만들었습니다.",
                            study.getStatus(),
                            study.getCategory(),
                            study.getLearnedAt(),
                            study.getPublishedAt());
                    if (!allDetails.isEmpty()) {
                        allDetails.stream()
                                .filter(
                                        d ->
                                                d.getContent().contains("스레드")
                                                        || d.getContent().contains("이메일"))
                                .findFirst()
                                .ifPresent(d -> study.replaceExperienceDetails(List.of(d)));
                    }
                }
                case "azure-log-cost-retention-optimization" -> {
                    study.update(
                            study.getSlug(),
                            study.getTitle(),
                            study.getSummary(),
                            "# Azure 로그 비용 과다 진단 및 보관 기간 최적화 (RET-001, RET-002)\n\n## 1. 기술 개념 및 핵심 이론\n\n### Log Analytics Workspace (LAW) 비용 과금 구조 & `Usage` 테이블\n- **과금 메커니즘**: Azure LAW는 수집 데이터 용량(GB) 당 비용이 부과됩니다. 과금 대상 여부는 `Usage` 테이블의 `IsBillable == true`로 판단됩니다.\n- **진단 알고리즘 (RET-001)**: `Usage` 테이블을 DataType별로 서머리 쿼리하여 비용을 과다 유발하는 톱 레이블을 식별하고, Azure Retail Prices REST API를 동적 호출해 USD 금액으로 실시간 변환합니다.\n\n### Log Retention Tiers (Analytics vs Basic vs Archive)\n- **Analytics Tier**: 31일 기본 보존, 실시간 KQL 쿼리 가능 ($2.30/GB).\n- **Archive Tier**: 장기 보존(최대 7년), 쿼리 시 복원 필요 ($0.02/GB).\n- **최적화 (RET-002)**: 보안 로그만 365일 Analytics 유지하고 디버그/운영 로그는 31일 후 Archive 티어로 전환하는 시뮬레이션을 수행합니다.\n\n---\n\n## 2. 내부 동작 메커니즘 및 쿼리 연동\n\n```mermaid\ngraph LR\n    LAW[(Azure LAW)] -->|1. KQL Usage Query| Engine[LogDoctor Engine]\n    PricesAPI[Azure Retail Prices API] -->|2. Fetch Price per GB| Engine\n    Engine -->|3. Retention Simulation| Report[Optimization Report]\n```\n\n---\n\n## 3. 핵심 구현 코드 및 트러블슈팅 인사이트\n\n### 1) Usage KQL 쿼리 및 가격 연동 코드 (Python)\n```python\ndef analyze_law_usage(kql_client, workspace_id, price_per_gb=2.30):\n    kql_query = \"\"\"\n    Usage\n    | where TimeGenerated > ago(30d)\n    | where IsBillable == true\n    | summarize BillableGB = sum(Quantity) / 1024 by DataType\n    | sort by BillableGB desc\n    \"\"\"\n    response = kql_client.query_workspace(workspace_id, kql_query)\n    \n    results = []\n    for row in response.tables[0].rows:\n        data_type, gb = row[0], row[1]\n        cost_usd = gb * price_per_gb\n        results.append({\"dataType\": data_type, \"gb\": gb, \"costUsd\": cost_usd})\n    return results\n```\n\n### 2) 인사이트\n- **빌링 쇼크 방지**: Daily Quota 소진율 모니터링 경보를 구성하여 요금 폭탄을 사전 방지했습니다.",
                            study.getStatus(),
                            study.getCategory(),
                            study.getLearnedAt(),
                            study.getPublishedAt());
                    if (!allDetails.isEmpty()) {
                        allDetails.stream()
                                .filter(
                                        d ->
                                                d.getContent().contains("RET-001")
                                                        || d.getContent().contains("보관 기간")
                                                        || d.getContent().contains("비용"))
                                .findFirst()
                                .ifPresent(d -> study.replaceExperienceDetails(List.of(d)));
                    }
                }
                case "cloud-infrastructure-app-observability-diagnostics" -> {
                    study.update(
                            study.getSlug(),
                            study.getTitle(),
                            study.getSummary(),
                            "# 클라우드 인프라 생존 및 앱 관측성 진단 아키텍처 (DET-001, DET-002, DET-003)\n\n## 1. 기술 개념 및 핵심 이론\n\n### 관측성 사각지대(Observability Blind Spot) 해결\n- **문제점**: 리소스(VM, App Service)는 정상 동작 중이나, Azure Monitor Agent(AMA)가 다운되거나 Diagnostic Settings 배관이 이탈하여 로그 수집이 끊기는 모니터링 사각지대가 발생합니다.\n- **해결 방안**: 계정 키를 직접 읽지 않고 LAW 텔레메트리(`Heartbeat`, `AppRequests`)만을 분석하여 인프라 생존 여부와 배관 유효성을 판별합니다.\n\n### P95 Latency & Error Rate 수계 계산 (DET-003)\n- `AppRequests` 테이블에서 헬스체크 봇 및 AlwaysOn 노이즈 요청을 제외하고 정제된 P95 지연시간(`percentile(DurationMs, 95)`)과 5xx 에러 비율을 실시간 추적합니다.\n\n---\n\n## 2. 내부 진단 상태 머신\n\n```mermaid\ngraph TD\n    Check[Diagnostic Check] -->|No Diagnostic Setting| CRITICAL[Critical: 배관 이탈]\n    Check -->|Platform Logs Only| WARNING[Warning: 앱 로그 미유입]\n    Check -->|Telemetry Healthy| HEALTHY[Healthy: 관측성 완비]\n```\n\n---\n\n## 3. 핵심 구현 코드 및 트러블슈팅 인사이트\n\n### 1) HTTP P95 Latency & 에러율 산출 KQL 쿼리\n```kql\nAppRequests\n| where TimeGenerated > ago(1h)\n| where Url !contains \"health\" and ClientIP != \"127.0.0.1\"\n| summarize \n    TotalCount = count(),\n    ErrorCount = countif(toint(ResultCode) >= 500),\n    P95LatencyMs = percentile(DurationMs, 95)\n    by Name\n| extend ErrorRate = (todouble(ErrorCount) / TotalCount) * 100\n```\n\n### 2) 인사이트\n- **사각지대 제로화**: 에러율 > 15% 및 P95 Latency > 5,000ms 자동 탐지로 인프라 관측성을 정착시켰습니다.",
                            study.getStatus(),
                            study.getCategory(),
                            study.getLearnedAt(),
                            study.getPublishedAt());
                    if (!allDetails.isEmpty()) {
                        allDetails.stream()
                                .filter(
                                        d ->
                                                d.getContent().contains("DET-001")
                                                        || d.getContent().contains("관측성")
                                                        || d.getContent().contains("진단"))
                                .findFirst()
                                .ifPresent(d -> study.replaceExperienceDetails(List.of(d)));
                    }
                }
                case "intelligent-log-filtering-pii-masking-engine" -> {
                    study.update(
                            study.getSlug(),
                            study.getTitle(),
                            study.getSummary(),
                            "# 지능형 로그 필터링 및 민감 정보 마스킹 엔진 (PRV-001, PRV-002, PRV-003, FLT-001, FLT-002, FLT-003)\n\n## 1. 기술 개념 및 핵심 이론\n\n### 프로덕션 디버그 로거 유입 감지 (PRV-001)\n- **개념**: 개발 환경용 디버그 로거가 프로덕션에 방치되어 불필요한 LAW 수집 비용을 유발하는 현상입니다.\n- **탐지 원리**: App Settings 환경변수(`ENV=production`)와 KQL `SeverityLevel <= 1` (Verbose/Debug) 유입량을 교차 검증하여 과다 디버그 로깅 수집 원인을 적발합니다.\n\n### PII (개인정보) 실시간 마스킹 (FLT-001) & 노이즈 Fingerprinting (FLT-003)\n- **PII Masking**: 이메일, 전화번호, JWT Token 정규식 패턴으로 마스킹(`***MASKED***`) 처리합니다.\n- **Log Fingerprinting**: 에러 로그 앞 150글자의 지문(Fingerprint)을 해싱하여 반복 생성되는 고빈도 노이즈 로그를 그룹핑하고 LAW DCR Transformation KQL을 자동 생성하여 유입을 차단합니다.\n\n---\n\n## 2. 노이즈 필터링 및 컨텍스트 점수화 파이프라인\n\n```mermaid\ngraph LR\n    Log[Raw Log] -->|1. Regex Mask| PII[PII Masked Engine]\n    PII -->|2. Hash First 150 Chars| FP[Fingerprint Hash]\n    FP -->|3. Evaluate Context| Score[Context Quality Score: 0-100]\n```\n\n---\n\n## 3. 핵심 구현 코드 및 트러블슈팅 인사이트\n\n### 1) Python 정규식 PII 마스킹 처리 엔진 코드\n```python\nimport re\n\nclass PiiMasker:\n    EMAIL_REGEX = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'\n    TOKEN_REGEX = r'Bearer\\s+[A-Za-z0-9\\-\\._~\\+\\/]+=*'\n\n    @classmethod\n    def mask_log_message(cls, message: str) -> str:\n        if not message:\n            return message\n        # 1. 이메일 마스킹\n        masked = re.sub(cls.EMAIL_REGEX, '[EMAIL_MASKED]', message)\n        # 2. Authorization Bearer 토큰 마스킹\n        masked = re.sub(cls.TOKEN_REGEX, 'Bearer [TOKEN_MASKED]', masked)\n        return masked\n```\n\n### 2) 인사이트\n- **보안 & 비용 동시 달성**: PII 마스킹을 통한 컴플라이언스 준수와 노이즈 KQL 차단을 통한 수집 비용 감축을 완수했습니다.",
                            study.getStatus(),
                            study.getCategory(),
                            study.getLearnedAt(),
                            study.getPublishedAt());
                    if (!allDetails.isEmpty()) {
                        allDetails.stream()
                                .filter(
                                        d ->
                                                d.getContent().contains("FLT-001")
                                                        || d.getContent().contains("마스킹")
                                                        || d.getContent().contains("필터링"))
                                .findFirst()
                                .ifPresent(d -> study.replaceExperienceDetails(List.of(d)));
                    }
                }
                default -> {}
            }
            studyRepository.save(study);
        }
    }

    private void seedPrintTemplates() {
        if (printTemplateRepository.count() > 0) {
            return;
        }

        printTemplateRepository.save(
                PrintTemplate.create(
                        "[대표] 이력서 & 경력기술서",
                        "[]",
                        "[\"intro-profile\", \"competencies\", \"skills\", \"career\", \"projects\", \"credentials\"]",
                        "{\"competencies\": 20, \"skills\": 20, \"career\": 24, \"projects\": 24, \"credentials\": 20}",
                        true,
                        1));

        printTemplateRepository.save(
                PrintTemplate.create(
                        "[요약] 1장 간이 이력서",
                        "[\"competencies\", \"projects\", \"architecture-components\", \"architecture-diagram\"]",
                        "[\"intro-profile\", \"skills\", \"career\", \"credentials\"]",
                        "{\"skills\": 16, \"career\": 24, \"credentials\": 20}",
                        true,
                        2));

        printTemplateRepository.save(
                PrintTemplate.create(
                        "[포트폴리오] 아키텍처 포함 통합서류",
                        "[\"competencies\"]",
                        "[\"intro-profile\", \"skills\", \"career\", \"projects\", \"architecture-diagram\", \"credentials\"]",
                        "{\"skills\": 16, \"career\": 24, \"projects\": 24, \"architecture-diagram\": 28}",
                        true,
                        3));
    }
}
