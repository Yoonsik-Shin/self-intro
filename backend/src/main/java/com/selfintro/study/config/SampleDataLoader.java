package com.selfintro.study.config;

import com.selfintro.modules.profile.domain.ProfileRepository;
import com.selfintro.modules.printtemplate.domain.PrintTemplate;
import com.selfintro.modules.printtemplate.domain.PrintTemplateRepository;
import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.modules.skill.domain.SkillRepository;
import com.selfintro.modules.experience.domain.*;
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

        profileRepository.save(com.selfintro.modules.profile.domain.Profile.create(
                "신윤식",
                "Yoonsik Shin",
                "Software Engineer",
                "에듀테크 실무 백엔드 개발 경험과 Java/Spring Boot, MSA 및 Cloud 인프라 구축 지식을 기반으로 안정적이고 최적화된 아키텍처를 설계하고 운영합니다.",
                "Java / Node.js / Cloud",
                "실시간 아키텍처 및 콘텐츠 개선 중",
                "https://github.com/Yoonsik-Shin",
                "aaa946@naver.com",
                "010-5171-0994"
        ));
    }

    private void seedSkillsAndExperiencesAndStudies() {
        if (experienceRepository.count() > 0) {
            seedCoreProjectPlacements();
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
        skillMap.put("Database Modeling", getOrCreateSkill("Database Modeling", "DATABASE", "중급", false, 18));
        skillMap.put("SQL Query Optimization", getOrCreateSkill("SQL Query Optimization", "DATABASE", "중급", false, 19));
        skillMap.put("PostgreSQL", getOrCreateSkill("PostgreSQL", "DATABASE", "중급", false, 54));
        skillMap.put("MySQL", getOrCreateSkill("MySQL", "DATABASE", "중급", false, 55));
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
        skillMap.put("AWS ECS", getOrCreateSkill("AWS ECS", "DEVOPS", "중급", true, 30));
        skillMap.put("Amazon SQS", getOrCreateSkill("Amazon SQS", "DEVOPS", "중급", false, 31));
        skillMap.put("Docker", getOrCreateSkill("Docker", "DEVOPS", "중급", true, 31));
        skillMap.put("Datadog", getOrCreateSkill("Datadog", "DEVOPS", "초급", false, 32));
        skillMap.put("Infrastructure as Code (IaC)", getOrCreateSkill("Infrastructure as Code (IaC)", "DEVOPS", "초급", false, 33));
        skillMap.put("Bicep", getOrCreateSkill("Bicep", "DEVOPS", "초급", false, 34));
        skillMap.put("Kubernetes", getOrCreateSkill("Kubernetes", "DEVOPS", "중급", true, 35));
        skillMap.put("Azure Functions", getOrCreateSkill("Azure Functions", "DEVOPS", "중급", false, 45));
        skillMap.put("Apache Kafka", getOrCreateSkill("Apache Kafka", "DEVOPS", "중급", false, 57));
        skillMap.put("Azure Log Analytics", getOrCreateSkill("Azure Log Analytics", "DEVOPS", "중급", false, 59));
        skillMap.put("GitHub Actions", getOrCreateSkill("GitHub Actions", "DEVOPS", "중급", false, 62));

        // AI / RAG
        skillMap.put("Azure OpenAI", getOrCreateSkill("Azure OpenAI", "AI_RAG", "중급", false, 36));
        skillMap.put("Teams SDK", getOrCreateSkill("Teams SDK", "FRAMEWORK", "중급", false, 37));
        skillMap.put("LLM", getOrCreateSkill("LLM", "AI_RAG", "중급", false, 38));
        skillMap.put("STT/TTS", getOrCreateSkill("STT/TTS", "AI_RAG", "중급", false, 39));
        skillMap.put("RAG", getOrCreateSkill("RAG", "AI_RAG", "중급", false, 40));
        skillMap.put("Machine Learning / Deep Learning", getOrCreateSkill("Machine Learning / Deep Learning", "AI_RAG", "중급", false, 41));
        skillMap.put("LangChain", getOrCreateSkill("LangChain", "AI_RAG", "중급", false, 42));
        skillMap.put("LangGraph", getOrCreateSkill("LangGraph", "AI_RAG", "초급", false, 43));
        skillMap.put("Azure", getOrCreateSkill("Azure", "DEVOPS", "중급", false, 44));
        skillMap.put("Data Preprocessing", getOrCreateSkill("Data Preprocessing", "AI_RAG", "중급", false, 45));
        skillMap.put("Statistics", getOrCreateSkill("Statistics", "AI_RAG", "중급", false, 46));
        skillMap.put("gRPC", getOrCreateSkill("gRPC", "FRAMEWORK", "중급", false, 56));
        skillMap.put("KQL", getOrCreateSkill("KQL", "LANGUAGE", "중급", false, 58));
        skillMap.put("Spring Data JPA", getOrCreateSkill("Spring Data JPA", "FRAMEWORK", "중급", false, 60));
        skillMap.put("Spring Security", getOrCreateSkill("Spring Security", "FRAMEWORK", "중급", false, 61));

        // Theory / Others
        skillMap.put("Software Engineering", getOrCreateSkill("Software Engineering", "ETC", "중급", false, 48));
        skillMap.put("Database", getOrCreateSkill("Database", "ETC", "중급", false, 49));
        skillMap.put("Network", getOrCreateSkill("Network", "ETC", "중급", false, 50));

        // Study Categories Map
        // NOTE: study_category rows normally come from Flyway migration V6. When running
        // locally with Flyway disabled (H2 create-drop), that seed data never lands, so
        // recreate it here to keep the local dev bootstrap self-contained.
        if (studyCategoryRepository.count() == 0) {
            jdbcTemplate.update("INSERT INTO study_category (id, name, slug, display_order) VALUES "
                    + "(1, '프로젝트', 'project', 1), (2, '공부/학습', 'education', 2), (3, '자격증', 'certificate', 3), "
                    + "(4, '백엔드', 'backend', 4), (5, '인프라/DevOps', 'devops', 5), (6, 'AI/RAG', 'ai-rag', 6), "
                    + "(7, '회고', 'retrospective', 7)");
        }
        Map<String, StudyCategory> categoryMap = new HashMap<>();
        studyCategoryRepository.findAll().forEach(cat -> categoryMap.put(cat.getSlug(), cat));

        // Essays

        // Seed Career and the concrete work projects performed within it.
        List<ExperienceDetail.Draft> workProjectDetails = List.of(
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
                                "여러 프론트엔드 클라이언트(교사용/학생용)가 백엔드 API를 직접 호출하면서 중복 로직과 N+1 호출이 늘어나고 있었습니다.",
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
                                "- AWS ECS 기반 인프라를 설계하고 서비스별 배포 파이프라인을 CI/CD로 자동화했습니다.\n- Amazon SQS로 비동기 메시징을 분리해 외부 시스템의 지연에도 안정적으로 처리했습니다.\n- Docker로 로컬/배포 환경을 컨테이너화해 환경 차이로 인한 배포 실패를 줄였습니다.\n- Datadog으로 지표를 모니터링하며 장애를 조기에 탐지할 수 있는 체계를 구축했습니다.",
                                "배포 소요 시간을 줄이고 장애 대응 리드타임을 단축시켜, 비즈니스 확장 국면에서도 안정적인 인프라 운영 기반을 마련했습니다.",
                                3,
                                getSkills(List.of("AWS ECS", "Amazon SQS", "Docker", "Datadog", "GitHub Actions"), skillMap)
                        ),
                        detail(
                                "공용 문제(Problem) 서비스 및 사내 공통 패키지 모노레포 단독 구축",
                                "서비스 확장으로 인해 여러 백엔드 서버 간 동일한 설정 코드와 DB 커넥션 래퍼, 에러 핸들러 등의 코드 복잡도가 늘어나고 중복 복사 현상이 심화되었습니다.",
                                "- NestJS 11 기반의 공용 문제 조회 마이크로서비스를 단독 설계 및 구축하여 6만여 문항 데이터를 대용량 제공하도록 구성했습니다.\n- npm workspaces 기반 모노레포를 구축해 공통 에러 변환, DB 트랜잭션, SQS 연동 로직을 패키지화해 GitHub Packages로 배포했습니다.\n- 신규 프로젝트 생성을 표준화하기 위해 CLI 스캐폴딩 도구를 개발 및 적용했습니다.",
                                "마이크로서비스들의 공통 아키텍처 패턴을 통일하고, 새로운 서버 모듈 추가 세팅 속도를 크게 단축하여 개발 리소스를 절감했습니다.",
                                4,
                                getSkills(List.of("NestJS", "TypeScript", "MongoDB", "Docker"), skillMap)
                        )
                );

        Career savedCareer = (Career) experienceRepository.save(Career.create(
                "에듀테크 스타트업 Backend & DevOps 경력",
                LocalDate.of(2023, 12, 1),
                LocalDate.of(2025, 10, 31),
                "커리큘럼 기반 AI 학습 플랫폼의 핵심 Express API 서버와 NestJS 기반 BFF(Backend for Frontend) 서버를 부트스트랩하고 설계·개발을 전담했습니다. AI 튜터 메시징 대화 세션 모델 추상화 및 SQS 비동기 연동, 교사용 실시간 학생 관리(Presence) 모듈 설계, SubmittedProblem 도메인 CQRS 리팩토링 및 대형 마이그레이션을 총괄했습니다. Spring Boot 기반 백오피스 서비스도 1인 단독 구축하였습니다.",
                "실무 서비스의 9,500여 개 커밋 중 약 43%를 담당한 최다 기여자로서 비즈니스 확장 시 도메인 관심사 격리, 성능 튜닝, 그리고 인프라 CI/CD 파이프라인 전반을 주도하는 리드 엔지니어로 성장했습니다.",
                4,
                List.of(),
                getSkills(List.of("Node.js", "TypeScript", "NestJS", "Express", "MongoDB", "Redis", "Spring Boot", "Spring Data JPA", "Spring Security", "MySQL", "AWS ECS", "Amazon SQS", "Docker", "Datadog", "GitHub Actions"), skillMap),
                true, "에듀테크 실무 (1년 11개월)",
                "(주)에듀테크 스타트업",
                "정규직",
                "개발팀 백엔드 파트",
                "Backend & DevOps Engineer"
        ));

        Project workApiBffProject = experienceRepository.save(Project.create(
                "학습 플랫폼 핵심 API 및 BFF 구축",
                savedCareer.getPeriodStart(), savedCareer.getPeriodEnd(),
                "AI 튜터링 세션을 4개 컨텍스트로 추상화한 Express API와 교사용·학생용 클라이언트를 중계하는 NestJS BFF를 설계·개발했습니다.",
                "9,500여 개 커밋 중 약 43%를 담당하며 핵심 API, BFF, CQRS 리팩토링과 대규모 데이터 마이그레이션을 주도했습니다.",
                4,
                List.of(workProjectDetails.get(0), workProjectDetails.get(1)),
                getSkills(List.of("Node.js", "TypeScript", "Express", "MongoDB", "NestJS", "Redis"), skillMap),
                false, null,
                "work-learning-api-bff", savedCareer.getRole(), 43, null, savedCareer
        ));

        Project workBackofficeProject = experienceRepository.save(Project.create(
                "Spring Boot 기반 사내 백오피스 구축",
                savedCareer.getPeriodStart(), savedCareer.getPeriodEnd(),
                "여러 부서의 반복 수작업을 줄이기 위해 Spring Boot 3.2 기반 사내 백오피스와 알림·인증 자동화 흐름을 단독 구축했습니다.",
                "6만여 개 문항 조회와 부서 공용 워크플로우를 자동화하며 독립적인 사내 서비스 설계·운영 경험을 확보했습니다.",
                5,
                List.of(workProjectDetails.get(2)),
                workProjectDetails.get(2).skills(),
                false, null,
                "work-spring-backoffice", savedCareer.getRole(), 100, null, savedCareer
        ));

        Project workInfraProject = experienceRepository.save(Project.create(
                "AWS 인프라 및 CI/CD 파이프라인 구축·운영",
                savedCareer.getPeriodStart(), savedCareer.getPeriodEnd(),
                "AWS ECS·SQS 기반 인프라와 Docker 배포 환경, GitHub Actions CI/CD 및 Datadog 모니터링 체계를 구축·운영했습니다.",
                "배포 수작업과 환경 차이를 줄이고 장애를 조기에 발견할 수 있는 안정적인 서비스 운영 기반을 마련했습니다.",
                6,
                List.of(workProjectDetails.get(3)),
                workProjectDetails.get(3).skills(),
                false, null,
                "work-aws-cicd", savedCareer.getRole(), null, null, savedCareer
        ));

        Project workProblemProject = experienceRepository.save(Project.create(
                "공용 Problem 서비스 및 모노레포 패키지 구축",
                savedCareer.getPeriodStart(), savedCareer.getPeriodEnd(),
                "6만여 문항을 제공하는 NestJS 공용 문제 서비스와 npm workspaces 기반 공통 패키지 모노레포를 단독 구축했습니다.",
                "마이크로서비스의 공통 아키텍처 패턴을 표준화하고 신규 서버 모듈의 초기 설정 시간을 단축했습니다.",
                7,
                List.of(workProjectDetails.get(4)),
                workProjectDetails.get(4).skills(),
                false, null,
                "work-problem-monorepo", savedCareer.getRole(), 100, null, savedCareer
        ));

        // Seed Experience - Projects
        Experience project1 = experienceRepository.save(Project.create(
                "고객문의 수집·자동응답 통합 테스트베드 (기여도 100%)",
                LocalDate.of(2026, 6, 1),
                LocalDate.of(2026, 7, 31),
                "고객 문의 수집·관리 및 브라우저 자동화(Playwright)와 노코드 n8n 워크플로우를 활용해 네이버 카페, 이메일 등의 문의 수작업 처리 과정을 자동화한 E2E 테스트베드 시스템입니다. DB 기반 RBAC 및 PII 암호화, Nginx auth_request 인증 계층과 Loki/Grafana/Alloy로 실시간 모니터링 환경을 구성했습니다.",
                "HMAC 인증 토큰과 Nginx auth_request를 활용해 내부 툴들의 보안 계층을 구축하고, n8n 분산 Lock 패턴과 무중단 개인정보(PII) 암호화 마이그레이션을 통해 운영 안정성을 하드닝했습니다.",
                1,
                List.of(
                        detail(
                                "네이버 로그인 보안 우회 및 Playwright 기반 세션 관리 자동화",
                                "네이버 카페 문의 수집 및 답변 등록 시, 네이버의 강력한 로그인 보안 정책(캡차, 이단계 인증)으로 인해 단순 API 호출로는 자동화가 불가능했으며, 세션 만료 시마다 수동 개입이 요구되는 비효율이 있었습니다.",
                                "- Playwright 브라우저 자동화 엔진을 활용해 네이버 앱 일회용 로그인 번호(OTP) 인증 로그인 흐름 구축\n- 로그인 성공 후 NID_AUT, NID_SES 쿠키를 추출해 AES/GCM 암호화 및 DB 세션 관리 라이프사이클 구축\n- 브라우저 워커와 통신하여 세션 만료 상태를 실시간 진단 및 동기화하는 백엔드 API 설계",
                                "세션 만료 시 수동 로그인 단계를 원클릭 OTP 인증으로 최소화하고, 보안 정책 탐지를 우회하여 카페 내 답변 및 대댓글 등록 E2E 자동화를 달성했습니다.",
                                0,
                                getSkills(List.of("Playwright", "Docker Compose", "Nginx"), skillMap)
                        ),
                        detail(
                                "이메일 헤더 분석 및 본문 정규화를 통한 문의 스레드/상태 자동 연동 엔진 구축",
                                "이메일 고객 문의 유입 시 동일 사용자의 회신이나 관련 메일이 개별 문의 건으로 난립하여 상담원의 업무 중복과 문의 맥락 파편화가 발생했습니다.",
                                "- In-Reply-To 및 References 이메일 헤더를 파싱해 고유 Message-ID 관계 추적 및 부모 문의 매핑 모델 설계\n- 헤더가 유실된 메일에 대비해 회신 접두사 제거 제목 정규화 및 발신자 이메일 해싱(email_sender_hash) 값 기반 Heuristic 후보군 매칭 구현\n- 해결(RESOLVED) 문의에 메일 회신 시 자동으로 오픈(OPEN) 상태 복원 및 변경 이력(Work Log) 시스템 로깅",
                                "중복 티켓 생성을 방지하고 연관 문의를 단일 스레드로 통일하여 CS 상담원의 생산성을 대폭 개선했습니다.",
                                1,
                                getSkills(List.of("Java", "Spring Boot", "Spring Data JPA", "Spring Security", "QueryDSL", "PostgreSQL"), skillMap)
                        ),
                        detail(
                                "JPA Converter 기반 개인정보(PII) AES/GCM 암호화 및 무중단 마이그레이션",
                                "고객 문의 본문, 이메일, 전화번호 등 민감 개인정보(PII)가 DB에 평문 저장되어 데이터 유출 리스크 및 개인정보보호법 준수 문제가 존재했습니다.",
                                "- JPA @Convert 및 PiiEncryptionUtils를 통해 영속성 계층 저장/조회 시 AES/GCM 암복호화 자동화\n- 정확한 등치 검색 조회를 위한 단방향 HMAC-SHA256 해시 설계 및 컬럼 매핑\n- 복호화 실패 시 평문을 반환하는 하위 호환 복호화 로직(decryptOrPassThrough)을 도입해 무중단 암호화 마이그레이션 배치 가동",
                                "DB 유출 시에도 안전한 PII 암호화 보안 규격을 달성하였으며, 기존 적재 데이터를 데이터 유실 없이 무중단으로 100% 암호화 이관했습니다.",
                                2,
                                getSkills(List.of("Java", "Spring Boot", "Spring Data JPA", "PostgreSQL", "Flyway"), skillMap)
                        ),
                        detail(
                                "n8n 워크플로우 및 Spring Boot REST API 기반 멀티채널 문의 통합 수집 파이프라인",
                                "네이버 카페, 이메일, 구글 시트 등 파편화된 다중 고객 소통 채널의 문의 내역을 단일 저장소로 수집 및 통합 관리해야 했습니다.",
                                "- n8n 워크플로우를 구성해 주기적 네이버 카페 크롤링 및 IMAP 메일박스 수신 수집 자동화\n- Spring Boot에서 채널별 다형적 메타데이터(EmailMetadata, NaverCafeMetadata) 구조 검증 및 parsing 처리\n- MinIO S3 오브젝트 스토리지 연동 및 첨부 이미지 파일 저장 및 상대경로 JSONB 매핑 최적화\n- 중복 수집을 방지하기 위한 InquiryUniqueKeyGenerator 고유 키 생성 엔진 및 bulkInsert 구현",
                                "서로 다른 형식의 이종 채널 문의 데이터를 단일 스키마로 정형화 및 통합하여 대용량 CS 수집 인프라를 안정적으로 안착시켰습니다.",
                                3,
                                getSkills(List.of("Spring Boot", "n8n", "Docker Compose"), skillMap)
                        ),
                        detail(
                                "Nginx auth_request 계층 SSO 연동 및 Grafana Stack 중앙 집중 로깅 구축",
                                "사내 백오피스, MinIO 콘솔, Grafana 대시보드 등 개별 툴들에 대한 통합 접근 제어 및 통합 모니터링 체계가 미비했습니다.",
                                "- Nginx auth_request 지시어를 활용해 백엔드 API(cs-api)와 연동하는 사내 SSO 인증 프록시 계층 설계\n- Grafana Alloy 컨테이너로 컨테이너 내부 및 호스트 로그 파일을 수집하고 Grafana Loki로 전송하도록 파이프라인 구성\n- Grafana 대시보드를 구축해 실시간 예외 에러 및 서버 메트릭 가시화 구현",
                                "백오피스 도구들의 RBAC 보안 접근 규격을 단일 지점으로 일원화하고, 장애 발생 시 디버깅 리드타임을 대폭 감소시켰습니다.",
                                4,
                                getSkills(List.of("Nginx", "Grafana", "Loki", "Alloy"), skillMap)
                        )
                ),
                getSkills(List.of("Java", "Spring Boot", "Spring Data JPA", "Spring Security", "QueryDSL", "PostgreSQL", "Flyway", "Playwright", "n8n", "Nginx", "Docker Compose", "Grafana", "Loki", "Alloy"), skillMap),
                true, "CS",
                "project-cs-testbed",
                "Backend & DevOps Engineer",
                100
        ));

        // LogDoctor Project Seeding (detailed)
        seedLogDoctorProject(skillMap, categoryMap);

        experienceRepository.save(Project.create(
                "음성 스트리밍 및 RAG 면접 관리 (기여도 100%)",
                LocalDate.of(2025, 12, 1),
                LocalDate.of(2026, 3, 31),
                "실시간 AI 모의면접 및 역량 평가 서비스의 전체 시스템 아키텍처와 분산 메시징 처리 부분을 담당했습니다. gRPC 기반 실시간 음성 스트리밍 제어, Redis/Kafka 비동기 메시지 큐를 통한 음성 데이터 및 AI 상태 변경 큐잉, 이력서 RAG 질문 생성 기능 등을 구현하고 Kubernetes 환경에 배포했습니다. (개인 프로젝트)",
                "비동기 메시징 및 대용량 음성 스트리밍 환경에서 발생할 수 있는 데이터 유실과 지연 병목을 제어하며 분산 인프라 설계 능력을 키웠습니다.",
                3,
                List.of(detail("gRPC/Redis/Kafka 기반 실시간 음성 스트리밍, 이력서 RAG 질문 생성 서비스를 설계했습니다.", null, null, null, 0, List.of())),
                getSkills(List.of("React", "gRPC", "Redis", "Apache Kafka", "LLM", "STT/TTS", "RAG", "Kubernetes"), skillMap),
                true, "AI면접",
                "project-ai-interview",
                "Core Architect & Developer",
                100
        ));

        experienceRepository.save(Project.create(
                "학습 API QA 자동화 및 부하 시뮬레이션 도구 (기여도 80%)",
                LocalDate.of(2024, 4, 18),
                LocalDate.of(2024, 9, 21),
                "실제 UI 상호작용 없이 대량의 학생 학습 시나리오(출석, 문제풀이 제출, 비디오 진행률 업데이트, 리뷰 복습 등)를 API 단에서 자동으로 시뮬레이션해 기능 이상 및 부하를 모니터링하는 테스팅 툴입니다. Axios 및 가중치 랜덤 알고리즘을 도입했습니다.",
                "E2E 관점에서 전체 도메인의 핵심 비즈니스 흐름을 관통하는 통합 검증 지식을 체득하고 가중치 기반 시뮬레이션을 구현했습니다.",
                6,
                List.of(detail("가중치 랜덤 기반 학습 행동 시뮬레이션 봇을 개발해 회귀 검증을 자동화했습니다.", null, null, null, 0, List.of())),
                getSkills(List.of("TypeScript", "Node.js"), skillMap),
                true, "QA 자동화",
                "project-study-helper",
                "QA Automation Engineer",
                80
        ));

        // Seed Experience - Educations
        experienceRepository.save(Education.create(
                "스포츠의학과 학사 졸업",
                LocalDate.of(2022, 2, 25),
                LocalDate.of(2022, 2, 25),
                "IT 비전공자로서 개발 역량을 별도로 쌓았습니다.",
                "스포츠의학을 전공한 뒤 개발 교육과 프로젝트, 실무 경험을 통해 소프트웨어 개발 역량을 쌓았습니다.",
                12,
                List.of(detail("스포츠의학과 학사 학위 취득 (IT 비전공)", null, null, "차의과학대학교 스포츠의학과를 졸업했으며, IT 비전공자로서 개발 역량을 별도로 쌓았습니다.", 0, List.of())),
                List.of(),
                "차의과학대학교"
        ));

        experienceRepository.save(Education.create(
                "AI 엔지니어링 과정 (3기)",
                LocalDate.of(2025, 9, 1),
                LocalDate.of(2026, 3, 15),
                "ML/DL 기초학습, Agentic AI 구축 (LangChain, LangGraph), RAG 구축, AI Azure 기반의 클라우드 엔지니어 학습 (600시간)",
                "Agentic AI와 RAG 아키텍처를 깊이 있게 다루고, 클라우드 환경에서 AI 인프라를 구축하고 운영하는 방법을 익혔습니다.",
                5,
                List.of(detail("ML/DL 기초학습, Agentic AI 구축 (LangChain, LangGraph), RAG 구축, AI Azure 기반의 클라우드 엔지니어 학습", null, null, null, 0, List.of())),
                getSkills(List.of("Machine Learning / Deep Learning", "LangChain", "LangGraph", "RAG", "Azure"), skillMap),
                true, "MS AI 스쿨",
                "Microsoft / 대한상공회의소"
        ));

        experienceRepository.save(Education.create(
                "풀스택 프로젝트 실무과정",
                LocalDate.of(2023, 5, 1),
                LocalDate.of(2023, 10, 31),
                "TypeScript 기반 풀스택 교육으로 주로 JavaScript/TypeScript 언어에 대한 깊은 이해와 프레임워크 사용법 등을 학습 (265시간)",
                "TypeScript와 React/Express 환경에서 웹 애플리케이션의 풀스택 개발 생태계와 협업 워크플로우를 체화했습니다.",
                6,
                List.of(detail("TypeScript 기반 풀스택 교육, Express/React 풀스택 프로젝트 협업", null, null, null, 0, List.of())),
                getSkills(List.of("TypeScript", "Node.js", "React", "Express"), skillMap),
                true, "청년취업사관",
                "SBA 청년취업사관학교"
        ));

        experienceRepository.save(Education.create(
                "파이썬 기반 풀스택 부트캠프",
                LocalDate.of(2022, 6, 1),
                LocalDate.of(2022, 12, 31),
                "풀스택 교육으로 Git, HTML, CSS, Django Template Engine을 활용한 MVC 기반 웹사이트 구현 기초를 학습 (980시간)",
                "소프트웨어 개발의 첫 단추인 MVC 아키텍처와 웹 표준, 협업을 위한 형상 관리 도구의 기초를 탄탄히 다졌습니다.",
                7,
                List.of(detail("Git, HTML, CSS, Django Template Engine을 활용한 웹 사이트 구현 기초 학습", null, null, null, 0, List.of())),
                getSkills(List.of("Python", "Django", "HTML/CSS", "Git"), skillMap),
                true, "멀티캠퍼스",
                "멀티캠퍼스"
        ));

        // Seed Experience - Certificates
        experienceRepository.save(Certificate.create(
                "정보처리기사",
                LocalDate.of(2022, 6, 17),
                LocalDate.of(2022, 6, 17),
                "IT 전반의 핵심 이론 및 기술 자격 검증",
                "개발 생명주기 전반에 걸친 기초 체력을 공인 자격을 통해 입증했습니다.",
                8,
                List.of(detail("소프트웨어 공학, 데이터베이스, 네트워크 등 IT 핵심 이론 검증", null, null, null, 0, List.of())),
                getSkills(List.of("Software Engineering", "Database", "Network"), skillMap),
                "한국산업인력공단"
        ));

        experienceRepository.save(Certificate.create(
                "SQL 개발자(SQLD)",
                LocalDate.of(2024, 9, 20),
                LocalDate.of(2024, 9, 20),
                "데이터베이스 모델링 및 SQL 작성 능력 검증",
                "데이터베이스를 단순히 저장소로 쓰는 것을 넘어 성능과 무결성을 고려하여 쿼리하고 모델링할 수 있음을 검증했습니다.",
                9,
                List.of(detail("RDB 모델링, SQL 작성 및 쿼리 최적화 능력 검증", null, null, null, 0, List.of())),
                getSkills(List.of("SQL", "Database Modeling", "SQL Query Optimization"), skillMap),
                "(재)한국데이터산업진흥원"
        ));

        experienceRepository.save(Certificate.create(
                "빅데이터분석기사",
                LocalDate.of(2022, 7, 15),
                LocalDate.of(2022, 7, 15),
                "데이터 수집, 전처리, 분석 모형 설계 및 평가 역량 검증",
                "데이터를 수집하고 전처리하여 통계적 기법과 ML 모형으로 분석해 유의미한 가치를 추출할 수 있는 이론적 토대를 닦았습니다.",
                10,
                List.of(detail("데이터 전처리, 통계적 가설 검정, 머신러닝 모형 설계 역량 검증", null, null, null, 0, List.of())),
                getSkills(List.of("Data Preprocessing", "Statistics", "Machine Learning / Deep Learning"), skillMap),
                "(재)한국데이터산업진흥원"
        ));

        experienceRepository.save(Certificate.create(
                "컴퓨터활용능력 1급",
                LocalDate.of(2018, 11, 16),
                LocalDate.of(2018, 11, 16),
                "스프레드시트 및 데이터베이스 활용 능력 자격 검증",
                "정량적 데이터 정제 및 비즈니스 데이터 처리에 필요한 기본 오피스 역량을 인증받았습니다.",
                11,
                List.of(detail("Excel 스프레드시트 및 Access 데이터베이스 활용 검증", null, null, null, 0, List.of())),
                getSkills(List.of("Excel", "Access"), skillMap),
                false, null,
                "대한상공회의소"
        ));

        // Seed Studies (linked to the work project that owns each detail)
        List<ExperienceDetail> careerDetails = List.of(
                workApiBffProject.getDetails().get(0),
                workApiBffProject.getDetails().get(1),
                workBackofficeProject.getDetails().get(0),
                workInfraProject.getDetails().get(0),
                workProblemProject.getDetails().get(0)
        );

        // Study 1: AI 튜터링 세션 아키텍처
        Study study1 = studyRepository.save(Study.create(
                "ai-tutor-session-architecture",
                "AI 튜터 메시징 대화형 세션 아키텍처 설계 및 구현",
                "학생들의 4종 학습 상황(문제풀이, 복습, 챌린지, 개념보강)에 유연하게 대응하는 다형성 AI 대화 세션 도메인 모델링 및 AWS SQS 비동기 통신을 통한 멱등성 보장",
                "# AI 튜터 메시징 대화형 세션 아키텍처 설계 및 구현\n\n## 1. 개요 및 배경\n- 학생들에게 학습 상황별 맞춤형 AI 피드백을 제공하기 위해 AI 튜터 메시징 세션 기능을 기획하였습니다.\n- 문제풀이, 오답 복습, 챌린지, 개념 보강 등 서로 다른 학습 흐름에서 유연하게 작동하는 공통 세션 관리 및 비동기 처리 파이프라인 구축이 요구되었습니다.\n\n## 2. 핵심 구현 사항 (Action Detail)\n- **팩토리 패턴 기반 도메인 추상화 (`AiTutorSessionFactory`)**:\n  - 4종의 다형적인 학습 컨텍스트 엔티티를 단일 대화형 세션 모델로 다형적 변환할 수 있는 팩토리 클래스를 설계 및 구현했습니다.\n- **이벤트 기반 비동기 SQS 큐 연동**:\n  - 외부 LLM 서버와의 네트워크 지연으로 인한 실시간 스레드 병목을 차단하기 위해 SQS 컨슈머를 이용한 백그라운드 메시지 발행/구독(Pub/Sub) 아키텍처를 적용했습니다.\n  - 메시지 누수 및 유실을 방지하고 네트워크 에러로 인한 재요청 발생 시 멱등성을 검증하는 멱등키 로직을 보강했습니다.\n- **MongoDB 트랜잭션 보장**:\n  - 세션 로그와 상태 변경이 안정적으로 쓰여지도록 Replica Set 분산 트랜잭션을 적용해 일관성을 지켰습니다.\n- **BFF (Backend for Frontend) 게이트웨이 구현**:\n  - NestJS 기반 BFF 서버를 통해 HTML Sanitize 처리 및 커서 기반 페이지네이션 조회 성능 최적화를 적용했습니다.\n\n## 3. 결과 및 성과 (Outcome)\n- 신규 학습 컨텍스트가 생겨도 공통 AI 메시징 로직을 변경하지 않고 구조를 재사용할 수 있는 유연한 설계를 확립했습니다.\n- 비동기 처리로 API 응답 시간을 최적화하고 백엔드 서버 부하를 균등하게 분산시켰습니다.",
                StudyStatus.PUBLISHED,
                categoryMap.get("ai-rag"),
                LocalDate.of(2025, 9, 15),
                LocalDateTime.of(2025, 9, 15, 18, 0)
        ));
        study1.replaceExperiences(List.of(workApiBffProject));
        if (careerDetails.size() > 0) study1.replaceExperienceDetails(List.of(careerDetails.get(0)));
        study1.replaceSkills(getSkills(List.of("Node.js", "TypeScript", "Express", "MongoDB", "AWS ECS", "Amazon SQS", "NestJS"), skillMap));
        study1.replaceTags(getOrCreateTags(List.of("Backend", "MSA", "AI", "SQS", "Idempotence", "MongoDB")));
        studyRepository.save(study1);

        // Study 2: Presence & Student Monitoring
        Study study2 = studyRepository.save(Study.create(
                "realtime-student-presence-and-monitoring",
                "실시간 학생 Presence 추적 및 이상 행동 감지 시스템 구축",
                "교사들이 대규모 학생 접속 환경에서 웹소켓 비용 없이 주기적 HTTP Ping/Pong과 Redis, SQS 비동기 규칙 엔진을 이용해 학생 온라인 현황 및 이상 학습 행동을 모니터링하는 백엔드 설계",
                "# 실시간 학생 Presence 추적 및 이상 행동 감지 시스템 구축\n\n## 1. 개요 및 배경\n- 교사용 대시보드에서 수천 명 규모 학생들의 실시간 접속 상태(온라인, 오프라인, 자리비움, 백그라운드) 및 이상 학습 패턴을 즉각 탐지할 수 있는 백엔드 인프라가 필요했습니다.\n\n## 2. 핵심 구현 사항 (Action Detail)\n- **경량 Presence 추적 API 및 Ping/Pong 설계**:\n  - 웹소켓 상시 연결 비용을 피하기 위해 1분 주기의 경량 HTTP Ping/Pong 기반 상태 전송 구조를 구성했습니다.\n  - AWS Lambda를 통한 연결 판단 및 Redis를 활용한 세션 타임아웃 윈도우 스케줄링을 구현했습니다.\n- **이상 행동 알림 (`manageable-action`) 규칙 엔진**:\n  - 학생의 문제풀이 지연이나 연속 스킵 같은 이상 이벤트를 비동기로 수집해 SQS 큐로 적재하고, Consumer 모듈을 돌려 정량적 학습 규칙을 평가한 뒤 교사 통계 DB에 실시간 기록하는 시스템을 설계했습니다.\n- **실시간 호출 및 개입 API 구축**:\n  - 교사가 특정 학생에게 풀이를 요청하는 실시간 호출 도메인을 헥사고날 구조에 맞춰 설계했습니다.\n\n## 3. 결과 및 성과 (Outcome)\n- 대규모 동시 접속 상태를 리소스를 거의 쓰지 않고 경량 트래픽으로 추적하는 Presence 인프라를 성공적으로 정착시켰습니다.\n- 학원 교사들의 개입 성공률을 높여 학생의 이탈 방지에 실질적으로 기여했습니다.",
                StudyStatus.PUBLISHED,
                categoryMap.get("backend"),
                LocalDate.of(2025, 6, 26),
                LocalDateTime.of(2025, 6, 26, 17, 0)
        ));
        study2.replaceExperiences(List.of(workApiBffProject));
        if (careerDetails.size() > 1) study2.replaceExperienceDetails(List.of(careerDetails.get(1)));
        study2.replaceSkills(getSkills(List.of("TypeScript", "NestJS", "Redis", "AWS ECS", "Amazon SQS"), skillMap));
        study2.replaceTags(getOrCreateTags(List.of("Backend", "Presence", "Redis", "Telemetry", "SQS")));
        studyRepository.save(study2);

        // Study 3: SubmittedProblem CQRS & Migration
        Study study3 = studyRepository.save(Study.create(
                "cqrs-refactoring-and-data-migration",
                "제출 문항 도메인의 CQRS 리팩토링 및 6만 건 데이터 마이그레이션",
                "단일 컬렉션 집중 병목을 해결하기 위해 제출 문항 테이블을 학급/학생/전체/학원 단위로 분리하고 MongoDB 트랜잭션을 적용하여 집계 데이터를 마이그레이션한 성능 튜닝 사례",
                "# 제출 문항 도메인의 CQRS 리팩토링 및 6만 건 데이터 마이그레이션\n\n## 1. 개요 및 배경\n- 누적되는 제출 문항(`SubmittedProblem`) 데이터 볼륨 증가로 조회성 대시보드 API 쿼리의 응답 속도가 급격히 지연되는 병목이 발생했습니다.\n\n## 2. 핵심 구현 사항 (Action Detail)\n- **CQRS 패턴 적용 (Read/Write 격리)**:\n  - 쓰기 트래픽과 읽기 집계 트래픽을 분산시키기 위해 기존 단일 컬렉션을 학급(`class-submitted-problem`), 학생(`student-submitted-problem`), 전체(`total-submitted-problem`), 학원(`academy-submitted-problem`) 4개의 읽기 전용 통계 전용 도메인으로 수평 재설계했습니다.\n- **무중단 MongoDB 트랜잭션 마이그레이션 스크립트 작성**:\n  - 14개 핵심 통계 지표(제출수, 정답수, 소요시간 등)를 정확하게 집계·이관하기 위해 Multi-document 트랜잭션을 적용한 배치 파이프라인 스크립트를 작성하여 안전하게 병합 실행했습니다.\n\n## 3. 결과 및 성과 (Outcome)\n- 읽기/쓰기 관심사를 분리하여 조회 성능 병목을 해소하고 대시보드 화면 진입 속도를 극대화했습니다.\n- 무중단으로 대형 프로덕션 마이그레이션을 데이터 유실 0%로 안정적으로 완수했습니다.",
                StudyStatus.PUBLISHED,
                categoryMap.get("backend"),
                LocalDate.of(2025, 1, 15),
                LocalDateTime.of(2025, 1, 15, 15, 0)
        ));
        study3.replaceExperiences(List.of(workApiBffProject));
        if (careerDetails.size() > 1) study3.replaceExperienceDetails(List.of(careerDetails.get(1)));
        study3.replaceSkills(getSkills(List.of("Node.js", "TypeScript", "MongoDB", "Database"), skillMap));
        study3.replaceTags(getOrCreateTags(List.of("Backend", "CQRS", "Database", "Migration", "MongoDB", "Transaction")));
        studyRepository.save(study3);

        // Study 4: Spring Boot Backoffice & Session
        Study study4 = studyRepository.save(Study.create(
                "spring-boot-backoffice-and-session-auth",
                "Spring Boot 백오피스 서버 단독 구축 및 Redis 세션 기반 크로스도메인 해결",
                "무료체험 유입 분석 자동화 TF를 위한 Spring Boot 백엔드 단독 설계/구축 및 쿠키 세션 크로스도메인 인증 이슈 대응",
                "# Spring Boot 백오피스 서버 단독 구축 및 Redis 세션 기반 크로스도메인 해결\n\n## 1. 개요 및 배경\n- 마케팅 광고 및 오프라인 QR 유입 추적, 태블릿 렌탈과 프로모션 관리에 사용되던 엑셀 수기 행정 비효율성을 줄이기 위해 사내 무료체험 관리용 백오피스 구축을 총괄 단독 개발했습니다.\n\n## 2. 핵심 구현 사항 (Action Detail)\n- **헥사고날/DDD 아키텍처 기반 1인 단독 개발**:\n  - Spring Boot 3.2, Spring Security, JPA를 기반으로 8개 핵심 도메인과 144개 클래스 규모를 직접 설계했습니다.\n  - NCP 카카오 알림톡 API 연동 시 위변조 방지용 HMAC-SHA256 헤더 서명을 자바 표준 암호화 라이브러리로 직접 구성하고 MS Teams 알림 카드를 결합했습니다.\n- **Redis 분산 세션 기반 크로스도메인 보안 이슈 디버깅**:\n  - 독립 배포된 도메인 간 교차 사이트 요청 시 브라우저 보안 규격(SameSite/Secure)에 가로막혀 세션 쿠키가 전달되지 않는 문제를 해결하기 위해 Redis Session 클러스터 연동 및 Nginx 헤더 튜닝을 통해 인증 차단을 해결했습니다.\n- **모니터링 및 인프라 구축**:\n  - Docker Compose로 MySQL 백업 주기 배치, Redis, Nginx Basic Auth 프록시, Grafana 로깅 뷰어를 서버 내에 단독 오케스트레이션했습니다.\n\n## 3. 결과 및 성과 (Outcome)\n- 사내 모든 부서에서 반복되던 무료체험 신청 관리 행정 작업이 100% 자동화되어 에러율 0%를 유지하게 되었습니다.\n- 보안성 높은 암호화 서명 연동 및 세션 이슈를 직접 디버깅해 안정적 운영 토대를 완성했습니다.",
                StudyStatus.PUBLISHED,
                categoryMap.get("backend"),
                LocalDate.of(2025, 6, 13),
                LocalDateTime.of(2025, 6, 13, 11, 0)
        ));
        study4.replaceExperiences(List.of(workBackofficeProject));
        if (careerDetails.size() > 2) study4.replaceExperienceDetails(List.of(careerDetails.get(2)));
        study4.replaceSkills(getSkills(List.of("Java", "Spring Boot", "Spring Data JPA", "Spring Security", "Redis", "MySQL", "Docker", "Nginx", "Grafana"), skillMap));
        study4.replaceTags(getOrCreateTags(List.of("Backend", "Spring", "Security", "Redis", "Session", "Nginx")));
        studyRepository.save(study4);

        // Study 5: Common npm package monorepo & CLI
        Study study5 = studyRepository.save(Study.create(
                "common-packages-and-cli-scaffolding",
                "사내 공용 라이브러리 모노레포 구축 및 CLI 스캐폴딩 도구 개발",
                "공통 아키텍처 규격을 패키지화해 전사 마이크로서비스에 일관 적용하고, commander.js 기반 템플릿 CLI 생성 도구를 개발해 마이크로서비스 생성 속도 표준화",
                "# 사내 공용 라이브러리 모노레포 구축 및 CLI 스캐폴딩 도구 개발\n\n## 1. 개요 및 배경\n- 다수의 마이크로서비스(BFF, Application, Common Problem 등) 구축 과정에서 공통 인프라 설정 코드(MongoDB, Redis 지수백오프, SQS PubSub 래퍼), 예외 정의(9977-9999 에러코드), Swagger 데코레이터 등의 중복이 빈번히 발생해 이를 방지하기 위한 표준화 작업을 기획했습니다.\n\n## 2. 핵심 구현 사항 (Action Detail)\n- **npm workspaces 모노레포 아키텍처 설계**:\n  - `@susimdal/common`(예외 클래스 및 HTTP 변환기), `@susimdal/core`(NestJS 서버 부트스트랩 엔진), `@susimdal/infra`(MongoDB, Redis TLS 튜닝, SQS PubSub)로 코드를 패키징하여 GitHub Packages 비공개 레지스트리로 배포했습니다.\n- **스캐폴딩 CLI 도구 개발 (`@susimdal/cli`)**:\n  - commander 기반 CLI 명령어(`susimdal new`, `susimdal generate`)를 개발하여, 신규 개발자가 단 한 줄의 명령어로 Dockerfile, ECS Task Definition, GitHub Actions CI/CD 파일이 포함된 4계층 클린 아키텍처 모듈 전체 템플릿을 자동 스캐폴딩하도록 구현했습니다.\n\n## 3. 결과 및 성과 (Outcome)\n- 신규 마이크로서비스 프로젝트 구성 시간을 수 일에서 수 분으로 단축시켰으며, 사내 프로젝트 전체에 완전한 아키텍처적 일관성을 확보하여 코드 리뷰 피로도를 낮췄습니다.\n- 공통 인프라 버그 픽스 시 패키지 배포 버전업만으로 모든 서버에 일괄 패치 적용 가능한 환경을 마련했습니다.",
                StudyStatus.PUBLISHED,
                categoryMap.get("devops"),
                LocalDate.of(2025, 9, 10),
                LocalDateTime.of(2025, 9, 10, 19, 0)
        ));
        study5.replaceExperiences(List.of(workProblemProject));
        if (careerDetails.size() > 4) study5.replaceExperienceDetails(List.of(careerDetails.get(4)));
        study5.replaceSkills(getSkills(List.of("Node.js", "TypeScript", "NestJS", "Docker", "AWS ECS", "Amazon SQS", "MongoDB"), skillMap));
        study5.replaceTags(getOrCreateTags(List.of("DevOps", "Monorepo", "CLI", "Scaffold", "Infrastructure", "NPM")));
        studyRepository.save(study5);

        // Seed Studies for CS Test Bed Project
        List<ExperienceDetail> project1Details = project1.getDetails();

        // Study 6: Playwright Session Automation
        Study study6 = studyRepository.save(Study.create(
                "naver-cafe-session-playwright-automation",
                "Playwright 브라우저 자동화를 통한 네이버 카페 보안 세션 우회 및 E2E 답변 자동화",
                "네이버의 로그인 보안 정책을 우회하기 위해 Playwright OTP 로그인 기능을 탑재한 브라우저 워커를 구축하고, AES/GCM 쿠키 암복호화 및 주기적 헬스체크 검증을 통해 무중단으로 카페 글/답글 등록 자동화를 구현했습니다.",
                "# Playwright 브라우저 자동화를 통한 네이버 카페 보안 세션 우회 및 E2E 답변 자동화\n\n## 1. 개요 및 배경\n- 고객 지원 프로세스 효율화를 위해 네이버 카페 게시판에 등록되는 고객 문의에 대해 시스템이 자동으로 답변을 등록하는 기능이 요구되었습니다.\n- 네이버의 강력한 로그인 보안 정책(CAPTCHA, 2단계 인증 등)으로 인해 단순 HTTP request를 통한 로그인 세션 유지가 불가능했으며, 로그인 세션이 빈번하게 만료되어 수동 개입이 수반되는 병목이 존재했습니다.\n\n## 2. 핵심 구현 사항 (Action Detail)\n- **Playwright 기반 일회용 로그인(OTP) 워커 구축**:\n  - headless 브라우저 제어용 Node.js 기반 browser-worker 서버를 분리 구축하고, Playwright를 활용해 nid.naver.com의 일회용 번호 로그인 탭 활성화 및 OTP 코드를 자동 기입하여 인증 절차를 자동화했습니다.\n- **세션 쿠키 필터링 및 DB 보안 저장**:\n  - 로그인 성공 후 브라우저 컨텍스트에서 NID_AUT 및 NID_SES 세션 쿠키만 필터링하여 Spring Boot API 서버로 전달하고, AES-GCM 암호화를 적용해 naver_cafe_sessions 테이블에 안전하게 적재했습니다.\n- **자동화된 세션 상태 동기화 및 만료 진단**:\n  - 백엔드에 주기적(Scheduler) 또는 문의 수집 전 세션 유효성을 진단(nid.naver.com 내 정보 페이지로 테스트 페이지 이동)하여 만료 여부를 판별하고, 만료 시 슬랙/팀즈 알림을 발송하거나 n8n 크롤링 일시 정지 등의 상호 통제를 수행했습니다.\n- **답글/대댓글 및 멘션 등록 기능 구현**:\n  - Playwright를 통해 모바일 네이버 카페 답글 페이지로 이동 후, 브라우저 DOM 내 placeholder 클릭 및 input 텍스트 기입을 수행했습니다. 답글 수신자를 멘션하기 위해 HTML innerHTML 조작을 통해 특정 멘션 태그 구조를 강제 주입하여 제출하는 E2E 자동 답변 기능을 구성했습니다.\n\n## 3. 결과 및 성과 (Outcome)\n- 로그인 시 보안 문자(CAPTCHA) 입력 과정을 스마트폰 네이버 앱의 OTP 번호 입력으로 일원화해 세션 갱신을 10초 내로 간소화했습니다.\n- 무중단으로 네이버 카페 고객 문의 수집 및 답변/대댓글 매핑 E2E 자동화를 완수하여 고객 대응 리드타임을 수 분 이내로 단축시켰습니다.",
                StudyStatus.PUBLISHED,
                categoryMap.get("devops"),
                LocalDate.of(2026, 7, 10),
                LocalDateTime.of(2026, 7, 10, 15, 0)
        ));
        study6.replaceExperiences(List.of(project1));
        if (project1Details.size() > 0) study6.replaceExperienceDetails(List.of(project1Details.get(0)));
        study6.replaceSkills(getSkills(List.of("Playwright", "Docker Compose", "Nginx"), skillMap));
        study6.replaceTags(getOrCreateTags(List.of("DevOps", "Playwright", "Automation", "Naver Cafe", "Session")));
        studyRepository.save(study6);

        // Study 7: Inquiry Threading Engine
        Study study7 = studyRepository.save(Study.create(
                "inquiry-thread-parsing-and-automatic-mapping",
                "이메일 및 카페 문의의 다형적 통합 수집과 헤더 기반 스레딩/상태 제어 엔진 구축",
                "n8n과 Spring Boot 백엔드를 결합해 이메일/카페 문의를 다형적 메타데이터로 통합하고, In-Reply-To, References 헤더 파싱 및 이메일 발신자 해싱을 이용해 관련 메일을 기존 문의 스레드로 묶어내며 상태를 자동으로 재오픈하는 비즈니스 엔진 설계",
                "# 이메일 및 카페 문의의 다형적 통합 수집과 헤더 기반 스레딩/상태 제어 엔진 구축\n\n## 1. 개요 및 배경\n- 이메일, 네이버 카페 등 다양한 비정형 채널에서 고객 문의가 접수됨에 따라, 동일한 사용자가 보낸 회신 메일이나 연관 질문들이 개별 건으로 무작위 등록되어 상담원이 동일인에게 중복 답변을 하거나 답변 컨텍스트가 꼬이는 비효율을 겪었습니다.\n- 이를 해결하기 위해 이메일 스레드를 하나로 묶어 관리하고, 답변에 대한 추가 회신 유입 시 자동으로 티켓의 수명주기를 제어하는 스마트 스레딩 엔진을 기획했습니다.\n\n## 2. 핵심 구현 사항 (Action Detail)\n- **n8n 연동 다형적 데이터 수집 파이프라인**:\n  - n8n 스케줄러로 IMAP 이메일 수신 및 카페 API를 주기적으로 폴링하고, 백엔드의 통합 API(IntegrateInquiryDataUseCase)로 전달하여 채널별 JSONB 메타데이터(EmailMetadata, NaverCafeMetadata)에 맞춰 다형적으로 파싱 및 bulkInsert를 수행하도록 구조화했습니다.\n- **이메일 헤더 분석 기반 스레드 매핑**:\n  - 이메일의 In-Reply-To 및 References 헤더를 파싱해 이전 메일의 Message-ID를 추적하고, 일치하는 데이터가 있을 경우 기존 부모 문의의 parentId를 자식 문의에 할당하는 계층형 스레딩 모델을 구현했습니다.\n- **발신자 해싱 및 제목 정규화 Heuristic 매치**:\n  - 메일 서버 특성상 헤더가 유실되는 예외 상황에 대비하여, 회신 접두사(Re:, Fwd:, 회신: 등)를 제거해 제목을 단순 비교하고, 발신자 이메일을 HMAC-SHA256 해시값(email_sender_hash)으로 인덱싱 조회해 최근 7일 내의 동일 발신자/유사 제목 문의를 부모 티켓으로 자동 결속하는 Heuristic 로직을 구축했습니다.\n- **스레드 상태 전이 및 감사 로그(Audit Log) 자동화**:\n  - 해결(RESOLVED)된 문의 티켓에 새로운 고객 회신이 매핑되면, 시스템이 자동으로 티켓 상태를 오픈(OPEN)으로 전환하고, [시스템] 회신 메일 유입으로 인한 문의 재오픈 메시지를 작업 로그(InquiryWorkLog) 테이블에 자동 기록해 상담 과정의 투명성을 확보했습니다.\n\n## 3. 결과 및 성과 (Outcome)\n- 파편화된 이메일 회신 건들을 하나의 문의 아래 히스토리 형태로 모아 볼 수 있어 상담원이 이전 대화 맥락을 즉각 파악하고 중복 답변하는 리소스를 제거했습니다.\n- 메일 회신 시 자동으로 문의가 재오픈되어 고객의 누락 질문을 0건으로 제어하는 데 기여했습니다.",
                StudyStatus.PUBLISHED,
                categoryMap.get("backend"),
                LocalDate.of(2026, 7, 15),
                LocalDateTime.of(2026, 7, 15, 11, 0)
        ));
        study7.replaceExperiences(List.of(project1));
        if (project1Details.size() > 1) study7.replaceExperienceDetails(List.of(project1Details.get(1)));
        study7.replaceSkills(getSkills(List.of("Java", "Spring Boot", "QueryDSL"), skillMap));
        study7.replaceTags(getOrCreateTags(List.of("Backend", "Spring Boot", "Email Threading", "n8n", "Heuristic")));
        studyRepository.save(study7);

        // Study 8: DB PII Encryption & Migration
        Study study8 = studyRepository.save(Study.create(
                "db-level-pii-encryption-and-migration",
                "JPA Converter와 HMAC 해싱을 통한 개인정보(PII) 암호화 및 무중단 데이터 마이그레이션",
                "민감한 고객 데이터(문의 내용, 이메일, 연락처) 보호를 위해 AES/GCM 양방향 암호화를 JPA 컨버터에 내장하고, 등치 검색을 위한 HMAC-SHA256 해시 설계 및 기존 평문 데이터를 하위 호환성을 지키며 안전하게 이관한 마이그레이션 아키텍처",
                "# JPA Converter와 HMAC 해싱을 통한 개인정보(PII) 암호화 및 무중단 데이터 마이그레이션\n\n## 1. 개요 및 배경\n- 고객의 문의 본문과 연락처 정보 등 민감 개인정보(PII)를 데이터베이스에 평문 저장하는 것은 보안 및 법적 컴플라이언스(개인정보보호법) 측면에서 매우 취약했습니다.\n- 이를 위해 DB 데이터 암호화를 적용하되, 이미 다량의 실서비스 데이터가 적재되어 있는 상황에서 무중단으로 하위 호환성을 유지하며 암호화를 점진 적용하고 마이그레이션하는 전술이 필요했습니다.\n\n## 2. 핵심 구현 사항 (Action Detail)\n- **JPA Attribute Converter를 통한 AES/GCM 암복호화 자동화**:\n  - 영속성 계층에서 데이터를 쓰고 읽을 때 자동으로 동작하는 EncryptedStringConverter를 개발하고, AES/GCM(Galois/Counter Mode) 방식으로 대칭키 암호화를 통합했습니다. 매 암호화마다 랜덤 IV를 생성하여 동일한 값이라도 다른 암호문이 되도록 보안성을 높였습니다.\n- **일치 검색(Equi-Join)을 위한 HMAC-SHA256 해시 컬럼 설계**:\n  - AES/GCM 암호문은 매번 암호화 결과가 달라 동치 비교(WHERE = ) 조회가 불가능한 한계가 있습니다. 이를 해결하기 위해 이메일 발신자 정보를 해싱하여 조회할 수 있는 email_sender_hash 컬럼을 추가하고, SHA-256 기반 HMAC 해싱 처리를 백엔드에서 전담하게 했습니다.\n- **점진적 무중단 마이그레이션 설계**:\n  - 아직 암호화되지 않은 레거시 데이터와의 호환을 위해 복호화 실패 시 예외를 던지지 않고 평문 그대로를 통과시키는 관용적 복호화(decryptOrPassThrough) 로직을 임시 도입했습니다.\n  - 이관 대기 데이터에 대해 이미 암호화된 컬럼은 건너뛰고(tryDecrypt 사용), 평문 데이터만 필터링해 암호문으로 갱신하는 Flyway 마이그레이션 및 Spring 배치 스크립트 기반 이관 파이프라인을 운영했습니다.\n\n## 3. 결과 및 성과 (Outcome)\n- 데이터베이스 침해 사고 발생 시에도 문의 내용 및 이메일 등의 원본 노출을 차단해 보안 컴플라이언스를 완벽하게 통과했습니다.\n- 실서버 무중단 상태에서 기존 적재 데이터를 유실이나 깨짐 없이 100% 안전하게 암호화 상태로 마이그레이션했습니다.",
                StudyStatus.PUBLISHED,
                categoryMap.get("backend"),
                LocalDate.of(2026, 7, 20),
                LocalDateTime.of(2026, 7, 20, 17, 0)
        ));
        study8.replaceExperiences(List.of(project1));
        if (project1Details.size() > 2) study8.replaceExperienceDetails(List.of(project1Details.get(2)));
        study8.replaceSkills(getSkills(List.of("Java", "Spring Boot", "Spring Data JPA", "PostgreSQL", "Flyway"), skillMap));
        study8.replaceTags(getOrCreateTags(List.of("Backend", "Security", "Encryption", "Migration", "HMAC")));
        studyRepository.save(study8);

        seedCoreProjectPlacements();
    }

    private void seedCoreProjectPlacements() {
        List<ExperiencePlacement> placements;
        if (experiencePlacementRepository.count() > 0) {
            placements = experiencePlacementRepository.findAll();
        } else {
            placements = experienceRepository.findAllByOrderByDisplayOrderAsc().stream()
                    .filter(experience -> "PROJECT".equals(experience.getType()))
                    .filter(experience -> !(experience instanceof Project project)
                            || project.getCareer() == null
                            || "work-learning-api-bff".equals(project.getSlug()))
                    .map(experience -> ExperiencePlacement.create(
                            experience,
                            ExperiencePlacementType.CORE_PROJECT,
                            experience.getDisplayOrder(),
                            true))
                    .toList();
            placements = experiencePlacementRepository.saveAll(placements);
        }

        if (experiencePlacementDetailRepository.count() == 0) {
            List<ExperiencePlacementDetail> detailMappings = placements.stream()
                    .flatMap(placement -> placement.getExperience().getDetails().stream()
                            .map(detail -> ExperiencePlacementDetail.create(
                                    placement,
                                    detail,
                                    detail.getDisplayOrder())))
                    .toList();
            experiencePlacementDetailRepository.saveAll(detailMappings);
        }
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
            case "Java", "TypeScript", "Node.js", "NestJS", "Express", "MongoDB", "Redis", "Spring Boot", "Spring Data JPA", "Spring Security", "MySQL", "AWS ECS", "Amazon SQS", "Docker", "Datadog", "GitHub Actions" -> "WORK_EXPERIENCE";
            case "QueryDSL", "PostgreSQL", "Flyway", "Playwright", "n8n", "Nginx", "Docker Compose", "Grafana", "Loki", "Alloy", "FastAPI", "Cosmos DB", "Azure Functions", "Azure OpenAI", "Teams SDK", "Bicep", "Infrastructure as Code (IaC)", "gRPC", "Apache Kafka", "KQL", "Azure Log Analytics", "Kubernetes" -> "PROJECT_USE";
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
            Tag tag = tagRepository.findByNameIgnoreCase(name)
                    .orElseGet(() -> tagRepository.save(Tag.create(name, slug)));
            tags.add(tag);
        }
        return tags;
    }

    private ExperienceDetail.Draft detail(String content, String situation, String actionDetail, String outcome, int displayOrder, List<Skill> skills) {
        return new ExperienceDetail.Draft(null, content, situation, actionDetail, outcome, null, displayOrder, skills);
    }

    private void seedLogDoctorProject(Map<String, Skill> skillMap, Map<String, StudyCategory> categoryMap) {
        // Ensure new skills used in LogDoctor are in the map
        skillMap.put("Azure Functions", getOrCreateSkill("Azure Functions", "DEVOPS", "중급", true, 45));

        // 1. LogDoctor Project Experience Seeding

        Experience logDoctorProject = experienceRepository.save(Project.create(
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
                                getSkills(List.of("Python", "SQL", "SQL Query Optimization", "KQL", "Azure Log Analytics"), skillMap)
                        ),
                        detail(
                                "비동기 Queue Worker 기반의 진단 리포트 수집 및 처리 파이프라인 설계",
                                "Azure Subscription 전체 리소스를 스캔하고 LAW 쿼리를 병렬로 실행하는 과정은 Cold Start가 잦고 대기 시간이 길어, 동기식 API 호출로는 실시간 사용자 응답을 보장하기 어려웠습니다.",
                                "- FastAPI 백엔드 및 Azure Storage Queue를 활용하여 리포트 분석 상태를 비동기로 제어하는 Worker 구조 설계\n- Cosmos DB NoSQL 아키텍처를 도입하여 Tenants, Agents, Reports, Diagnoses, Insights 컬렉션을 낙관적 락(ETag)으로 관리\n- Lifespan 이벤트를 통해 DB 커넥션 풀 사전 로드(Pre-warming)를 적용하여 Cold Start 지연 단축",
                                "- 진단 요청 후 백그라운드 Worker에서 병렬 처리가 이루어져 대규모 구독 환경에서도 타임아웃 없이 안정적으로 리포트 생성 완료\n- 실시간 통계 재계산 및 리포트 완성에 따른 이벤트 발행 파이프라인 완비",
                                1,
                                getSkills(List.of("FastAPI", "Cosmos DB"), skillMap)
                        ),
                        detail(
                                "권한 분리를 적용한 에이전트 구동 및 리전별 가격 API 동적 조회 구현",
                                "보안 규격상 고객의 Azure 환경을 직접 수정하거나 크리덴셜 원문을 백엔드 서버에 저장할 수 없었으므로, 최소 읽기 전용 권한을 가진 에이전트와 위임형 SSO가 필수적이었습니다.",
                                "- Azure Functions 기반의 가벼운 에이전트 러너(client-back)를 분리 구축하고 18개 최소 읽기 전용 IAM 권한 매핑 설계\n- Nginx auth_request 계층과 HMAC 토큰을 활용한 보안 프록시 설계로 내부 툴들과의 SSO 연동 구현\n- Azure Retail Prices API를 호출하여 위치별 단가를 GB 단위로 캐싱(TTL 24시간) 처리",
                                "- 고객의 쓰기/삭제 권한 없이 완전 무마취 읽기 전용 진단 프로세스를 성공적으로 안착\n- 개인정보(PII) 등 민감 데이터가 게이트웨이 단계에서 즉시 마스킹되고 마스킹 유형 및 건수만 본 서버로 전송되도록 하드닝 구현",
                                2,
                                getSkills(List.of("Azure Functions", "Bicep", "Infrastructure as Code (IaC)"), skillMap)
                        ),
                        detail(
                                "Microsoft Teams 챗봇을 통한 알림 발송 및 사용자 진단 대시보드 연동",
                                "인프라 엔지니어들이 일일이 Azure Portal에 접속해 LAW 쿼리를 복사해 실행하는 번거로움을 제거하고, 매일 사용하는 협업 도구 안에서 간편하게 비용 현황을 확인해야 했습니다.",
                                "- Teams Tab 및 Bot manifest 설정을 연동하여 Teams 앱 내에서 진단 결과를 한눈에 보는 대시보드 구현\n- 에이전트 연결 상태 단절(15분 이상) 및 진단 완료 이벤트를 Teams Bot 알림으로 자동 전송\n- 비전문가 관리자도 손쉽게 따라 할 수 있는 맞춤형 약봉투(가이드)를 Teams 인터페이스 내에 Markdown 카드로 시각화",
                                "- 챗봇 기반의 1분 내 설치 연동 및 비동기 스캔 완료 통지 프로세스 구현으로 사용성 극대화\n- 배포 권한이 없는 실무자도 관리자에게 배포를 위임할 수 있는 '배포 위임' 워크플로우 지원",
                                3,
                                getSkills(List.of("Teams SDK"), skillMap)
                        )
                ),
                getSkills(List.of("Python", "FastAPI", "Cosmos DB", "Azure OpenAI", "Teams SDK", "KQL", "Azure Log Analytics", "Bicep", "Infrastructure as Code (IaC)", "Azure Functions", "Nginx", "Docker Compose", "Grafana", "Loki", "Alloy"), skillMap),
                true, "LogDr.",
                "project-log-doctor",
                "Fullstack & Cloud Developer",
                70
        ));

        List<ExperienceDetail> doctorDetails = logDoctorProject.getDetails();

        // 2. Studies Seeding
        // Study 1: Cost Optimization
        Study study1 = studyRepository.save(Study.create(
                "azure-log-cost-retention-optimization",
                "Azure 로그 비용 과다 진단 및 보관 기간 최적화 (RET-001, RET-002)",
                "Azure Log Analytics Workspace(LAW)의 Usage 테이블을 분석하고, Azure Resource Graph와 Retail Prices API를 실시간 연동하여 일일 한도(Quota Gb) 대비 로그 비용 소진율을 진단하고 테이블별 최적 보존 주기 및 요금제 전환(Basic/Archive) 처방 자동화.",
                "# Azure 로그 비용 과다 진단 및 보관 기간 최적화 (RET-001, RET-002)\n\n## 1. 개요 및 배경\n- 클라우드 환경에서 시스템 규모가 커짐에 따라 수집되는 로그 데이터 양이 급증하고, 이로 인해 Log Analytics Workspace(LAW) 청구 비용이 예측 불가능하게 늘어나는 '빌링 쇼크(Billing Shock)'가 빈번히 발생했습니다.\n- 로그 요금의 최적화를 위해서는 단순히 전체 로그 수집을 제한하는 것이 아니라, 어떤 테이블에서 비용이 발생하고 있는지(Usage 분석), 그리고 각 테이블별 보존 주기(Retention Days)와 요금제(Plan)가 가치에 맞게 설정되어 있는지 동적으로 진단하고 처방하는 지능형 모니터링이 필요했습니다.\n\n## 2. 핵심 구현 사항\n- **Usage 테이블 기반 실시간 비용 추적 (RET-001)**:\n  - `Usage` 시스템 테이블을 쿼리하여 실제 과금 대상인 테이블(`IsBillable == true`)의 데이터 크기(`Quantity` 및 `_BilledSize`)를 DataType별로 정렬 및 분석하는 KQL 수집 모듈 구현.\n- **Azure Retail Prices API 실시간 연동**:\n  - 리소스가 배포된 Azure 리전(location) 속성을 식별하고, 해당 리전의 `Analytics Logs Data Ingestion` Pay-As-You-Go 단가를 동적으로 API 호출하여 정확한 비용을 USD로 환산.\n  - 리전별 단가 조회 시 오버헤드를 낮추기 위해 Warm 인스턴스 내에서 24시간 TTL을 가지는 인메모리 캐시 설계.\n- **ARG(Azure Resource Graph) 기반 동적 예산 수집**:\n  - `workspaceCapping.dailyQuotaGb` 설정을 Resource Graph로 Bulk 조회하여, 각 워크스페이스에 설정된 일일 한도를 기준으로 일일 예산 자동 계산 (미설정 시 기본값 $10.0 적용).\n- **테이블 등급별 보존 주기 최적화 및 시뮬레이션 (RET-002)**:\n  - 로그 성격에 따른 테이블 분류 체계(Data Classification) 정의:\n    - **Class A (보안/감사)**: SigninLogs, AuditLogs, AzureActivity 등 (1년 보존 규정 준수 검증)\n    - **Class B (운영/지표)**: AppRequests, AppDependencies, Heartbeat (권장 보존 14일 이내)\n    - **Class C (추적/디버그)**: AppTraces (권장 보존 7일 이내)\n  - 테이블별 현재 보존일수(`retention_days`)와 일평균 사용량(`daily_avg_gb`)을 조회하여, 31일 초과분에 대한 Archive 티어 전환 시의 월간 예상 절감 비용을 다음 수식으로 시뮬레이션:\n    - `현재 비용 = 일평균GB * 30일 * (현재보존일 - 31) * LAW_Interactive_단가`\n    - `권장 비용 = 일평균GB * 30일 * (현재보존일 - 31) * LAW_Archive_단가`\n    - `절감액 = 현재 비용 - 권장 비용`\n\n## 3. 결과 및 성과\n- 일일 예산 대비 현재 소진율(`budget_ratio`)을 계산하여 **10% 이상인 경우 Warning**, **25% 이상인 경우 Critical** 경보를 발송하여 요금 폭탄을 예방하는 사전 방어체계 마련.\n- 컴플라이언스(보안 로그 365일 준수) 준수 여부와 운영 로그의 불필요한 과보존(Interactive 보존 설정) 상태를 한눈에 진단하고 Basic Logs 요금제 또는 Blob Archive 전환 처방을 Markdown 카드로 제공.",
                StudyStatus.PUBLISHED,
                categoryMap.get("devops"),
                LocalDate.of(2026, 6, 25),
                LocalDateTime.of(2026, 6, 25, 10, 0)
        ));
        study1.replaceExperiences(List.of(logDoctorProject));
        if (doctorDetails.size() > 2) {
            study1.replaceExperienceDetails(List.of(doctorDetails.get(0), doctorDetails.get(2)));
        }
        study1.replaceSkills(getSkills(List.of("SQL", "Database Modeling", "SQL Query Optimization", "KQL", "Azure Log Analytics", "Bicep", "Infrastructure as Code (IaC)"), skillMap));
        study1.replaceTags(getOrCreateTags(List.of("Cloud", "Azure", "Cost Optimization", "KQL")));
        studyRepository.save(study1);

        // Study 2: Observability
        Study study2 = studyRepository.save(Study.create(
                "cloud-infrastructure-app-observability-diagnostics",
                "클라우드 인프라 생존 및 앱 관측성 진단 아키텍처 (DET-001, DET-002, DET-003)",
                "App Service, Container Apps, VM 등 분산 인프라에서 수집되는 telemetry(Heartbeat, AppRequests, AppTraces)의 유입 상태를 분석하여 인프라-앱 간의 관측성 배관 단절을 진단하고 서비스 장애/지연 지표 자동 탐지.",
                "# 클라우드 인프라 생존 및 앱 관측성 진단 아키텍처 (DET-001, DET-002, DET-003)\n\n## 1. 개요 및 배경\n- MSA 및 멀티 클라우드 환경에서 리소스(VM, App Service, ACA 등)는 정상 작동 중이나 로그 에이전트가 중단되어 사각지대가 발생하거나, 비싼 상용 모니터링 툴(Datadog 등)이 없어 장애 발생 시 신속한 탐지가 어려운 문제를 해결해야 했습니다.\n- 환경변수의 계정 정보나 Secret 키를 직접 조회하는 보안적 한계를 극복하기 위해, 연결된 Log Analytics Workspace의 데이터를 기반으로 실제 관측 배관의 유효성과 앱 성능 상태를 간접 판정하는 엔진을 구축했습니다.\n\n## 2. 핵심 구현 사항\n- **명시 연결 기반 Target Resolver (DET-001)**:\n  - RG(리소스 그룹)나 이름이 같다는 임의의 결합이 아닌, Diagnostic Settings, hidden-link 메타데이터 등 리소스 설정에 정의된 명시적 연결 경로만 추적하여 신뢰도(\"strong\")를 확보.\n  - App Service, Functions, Azure Container Apps(ACA), Azure Container Instances(ACI)를 대상으로 `AppRequests`, `AppTraces`, `AppExceptions` 유입 상태를 조회하고, 누설 시 Console Logs 테이블을 fallback으로 탐색.\n- **VM 관측성 배관 진단 및 생존 분석 (DET-002)**:\n  - VM의 시스템 관측성 배관이 정상인지 판단하기 위해 DCR Association 정보와 AMA(Azure Monitor Agent) 설치 여부를 교차 검증.\n  - KQL을 활용해 `Heartbeat` 수신 상태를 조회하고, 가동 중인 VM의 Host Name을 활용해 연관된 `AppRequests`/`AppTraces`의 유입 여부를 추적해 앱 후보군 매핑.\n- **HTTP 헬스 신호 및 응답 지연 탐지 (DET-003)**:\n  - `AppRequests` 테이블에서 헬스체크 봇, robots.txt, AlwaysOn 정적 Ping 등 노이즈 요청을 제외한 실질 비즈니스 트래픽 필터링 쿼리 적용.\n  - 최근 24시간 에러율(HTTP 5xx)과 P95 응답 속도(`percentile(DurationMs, 95)`)를 산출하여 장애 상태 자동 감지.\n\n## 3. 결과 및 성과\n- **배관 진단**: 명시 연결 LAW가 없거나 KQL 조회 자체가 불가능할 때 **Critical**, 플랫폼 로그만 들어올 때 **Warning**, 앱 관측성(AppRequests)이 완비되었을 때 **Healthy** 판정을 내리는 유연한 파이프라인 정착.\n- **장애 감지**: 에러율 > 15% 또는 P95 Latency > 5,000ms일 때 **Critical**, 에러율 > 5% 또는 P95 Latency > 2,000ms일 때 **Warning** 경보를 발송하여 클라우드 리소스 헬스 대시보드 시각화 구현.",
                StudyStatus.PUBLISHED,
                categoryMap.get("devops"),
                LocalDate.of(2026, 6, 27),
                LocalDateTime.of(2026, 6, 27, 14, 0)
        ));
        study2.replaceExperiences(List.of(logDoctorProject));
        if (doctorDetails.size() > 3) {
            study2.replaceExperienceDetails(List.of(doctorDetails.get(0), doctorDetails.get(2), doctorDetails.get(3)));
        }
        study2.replaceSkills(getSkills(List.of("Azure Functions", "FastAPI", "Cosmos DB", "Python", "Nginx", "Docker Compose", "Grafana", "Loki", "Alloy"), skillMap));
        study2.replaceTags(getOrCreateTags(List.of("Cloud", "Azure", "Observability", "KQL")));
        studyRepository.save(study2);

        // Study 3: Filtering & Masking
        Study study3 = studyRepository.save(Study.create(
                "intelligent-log-filtering-pii-masking-engine",
                "지능형 로그 필터링 및 민감 정보 마스킹 엔진 (PRV-001, PRV-002, PRV-003, FLT-001, FLT-002, FLT-003)",
                "운영 환경의 상세 로그 활성화 여부 진단, 정규식을 통한 개인정보(PII) 유출 탐지/마스킹, 에러 로그 컨텍스트 3요소 품질 평가 점수화, 고빈도 노이즈(Health check) 분석을 통한 DCR 필터링 자동 처방 구현.",
                "# 지능형 로그 필터링 및 민감 정보 마스킹 엔진 (PRV-001, PRV-002, PRV-003, FLT-001, FLT-002, FLT-003)\n\n## 1. 개요 및 배경\n- 개발 단계에서 남긴 상세 디버그 로그가 운영(Production) 환경에 그대로 배포되어 불필요한 비용을 발생시키거나, 사용자 계정 정보(비밀번호, 토큰, 이메일 등)가 평문으로 수집되어 보안 컴플라이언스를 위반하는 리스크를 방지하고자 했습니다.\n- 또한, 의미 없는 반복성 로그가 전체 용량의 대부분을 차지하거나 에러 로그에 정작 추적에 필요한 정보(로그 위치, 예외 타입, 조치 힌트)가 누락되어 디버깅 속도를 저하시키는 문제를 기계적으로 해결하기 위해 진단 필터링 엔진을 구현했습니다.\n\n## 2. 핵심 구현 사항\n- **운영 환경 디버그 로그 방치 감지 (PRV-001)**:\n  - App Settings 환경변수(`LOG_LEVEL`, `DEBUG` 등)와 KQL의 `SeverityLevel <= 1` 데이터 유입 여부를 교차 검증하여 코드 내 하드코딩된 디버그 로그 레벨을 판별.\n- **PII(개인정보) 감지 및 실시간 마스킹 (FLT-001)**:\n  - 이메일, 전화번호, 주민등록번호, 비밀번호, access_token, api_key 등의 정규식 패턴 세트 정의.\n  - 개인정보가 백엔드로 유출되는 것을 원천 차단하기 위해 LAW 조회 단계에서 마스킹 처리를 수행하고, 본 서버에는 마스킹 패턴 건수 및 종류만 전달.\n- **고빈도 노이즈 분석 및 DCR KQL 생성 (PRV-002, PRV-003, FLT-003)**:\n  - UUID 및 숫자 패턴을 정규화한 뒤 앞 150글자를 지문(fingerprint) 삼아 상위 10개 노이즈 패턴 분석.\n  - 50KB를 초과하는 대용량 페이로드(Oversized Trace)와 1MB를 초과하는 위험 페이로드 감지(Message vs Properties 중 주범 필드 크기 비율 자동 특정).\n  - LLM을 활용해 노이즈 패턴을 차단할 수 있는 DCR Transformation KQL(`hash(OperationId) % 100 < 10` 등) 처방 코드 자동 생성.\n- **에러 로그 컨텍스트 품질 점수화 (FLT-002)**:\n  - 에러 대응 3대 요소(Cause: 예외 타입/메시지, Location: 로거명/스택트레이스, Action: retry/check 등의 힌트) 존재 여부를 판별하여 점수를 부여하고, 누락 항목에 대한 경고 알림 제공.\n\n## 3. 결과 및 성과\n- 개인정보 유출 리스크를 원천적으로 방지하고, 운영 환경에 켜져 있는 디버그 로거와 무거운 페이로드 로그를 즉시 적발하여 비용 누수를 사전 차단.\n- 지문 분석과 에러 컨텍스트 3요소 품질 분석을 통해 단순 로그 양을 줄이면서도 모니터링 품질(SNR)을 극대화하여 실무 개발팀의 디버깅 시간 단축에 기여.",
                StudyStatus.PUBLISHED,
                categoryMap.get("backend"),
                LocalDate.of(2026, 6, 30),
                LocalDateTime.of(2026, 6, 30, 18, 0)
        ));
        study3.replaceExperiences(List.of(logDoctorProject));
        if (doctorDetails.size() > 1) {
            study3.replaceExperienceDetails(List.of(doctorDetails.get(0), doctorDetails.get(1)));
        }
        study3.replaceSkills(getSkills(List.of("Python", "FastAPI", "Cosmos DB", "Azure OpenAI", "Teams SDK"), skillMap));
        study3.replaceTags(getOrCreateTags(List.of("Cloud", "Azure", "PII Masking", "KQL")));
        studyRepository.save(study3);

        // Study 4: DB Schema Architecture & Pure Domain Entity Placement
        Study study4 = studyRepository.save(Study.create(
                "backend-db-schema-entity-purity-and-placement-architecture",
                "포트폴리오 백엔드 DB 스키마 정밀 분석 및 UI 메타데이터(Placement) 분리 아키텍처",
                "JPA Joined Table 상속 전략과 1:N/N:M 이력 매핑 구조를 파악하고, 엔티티 내 UI 전용 필드(timeline_label 등)를 Placement/Presentation 메타데이터로 분리하여 Pure Domain Entity를 유지하는 리팩토링 설계안을 다룹니다.",
                "# 포트폴리오 백엔드 DB 스키마 정밀 분석 및 UI 메타데이터(Placement) 분리 아키텍처\n\n## 1. 개요 및 스키마 전체 구조\n본 아키텍처 분석 노트는 포트폴리오 백엔드 서비스(`self-intro`)의 데이터베이스 스키마 설계, JPA 엔티티 간 연관 관계, 그리고 **\"화면 표현/큐레이션 전용 메타데이터(UI Display Metadata)와 순수 도메인 엔티티(Pure Domain Entity)의 역할 분리\"** 개선안에 대해 정밀하게 다룹니다.\n\n### 1.1. 전체 ERD 다이어그램\n```mermaid\nerDiagram\n    CAREER ||--o{ PROJECT : \"1:N (career_experience_id)\"\n    EXPERIENCE ||--o{ EXPERIENCE_DETAIL : \"1:N (experience_id)\"\n    EXPERIENCE }|--|{ SKILL : \"N:M (experience_skill)\"\n    EXPERIENCE_DETAIL }|--|{ SKILL : \"N:M (experience_detail_skill)\"\n\n    EXPERIENCE {\n        bigint id PK\n        varchar type \"구분자 (CAREER, PROJECT, EDUCATION, CERTIFICATE)\"\n        varchar title \"제목\"\n        date period_start \"시작일\"\n        date period_end \"종료일\"\n        text summary \"한 줄 요약\"\n        text takeaway \"핵심 성과 및 배운점\"\n        int display_order \"정렬 순서\"\n        boolean show_on_timeline \"타임라인 노출 여부 (개선대상)\"\n        varchar timeline_label \"타임라인 라벨 (개선대상)\"\n    }\n\n    CAREER {\n        bigint experience_id PK, FK\n        varchar company_name \"회사명\"\n        varchar employment_type \"고용 형태\"\n        varchar department \"부서/팀\"\n        varchar role \"직무/역할\"\n    }\n\n    PROJECT {\n        bigint experience_id PK, FK\n        bigint career_experience_id FK \"소속 직장 경력 (1:N)\"\n        varchar slug \"식별 슬러그\"\n        varchar role \"프로젝트 역할\"\n        int contribution_rate \"기여도 (%)\"\n        varchar repository_url \"저장소 URL\"\n    }\n\n    EXPERIENCE_DETAIL {\n        bigint id PK\n        bigint experience_id FK\n        varchar content \"불릿 한 줄 요약\"\n        text situation \"STAR: 상황\"\n        text action_detail \"STAR: 과정\"\n        text outcome \"STAR: 성과\"\n        text narrative \"AI 서술 문단\"\n        int display_order \"정렬 순서\"\n    }\n\n    EXPERIENCE_PLACEMENT {\n        bigint id PK\n        bigint experience_id FK\n        varchar placement_type \"큐레이션 구역 (CORE_PROJECT, TIMELINE 등)\"\n        int display_order \"구역 내 정렬 순서\"\n        boolean enabled \"활성화 여부\"\n    }\n```\n\n---\n\n## 2. 도메인 계층 구조 및 연관 관계 분석\n\n### 2.1. JPA Joined Table 상속 전략 (`@Inheritance(strategy = InheritanceType.JOINED)`)\n- **설계 배경**: `Experience` 부모 테이블에는 공통 속성(`title`, `periodStart`, `periodEnd`, `summary`, `takeaway`, `displayOrder`)을 배치하고, 타입별 독자 필드는 `career`, `project`, `education`, `certificate` 전용 자식 테이블로 조인 분리했습니다.\n- **장점**: 데이터 타입 안전성(Type Safety) 확보 및 RDBMS 제약조건(FK, NOT NULL)을 명확하게 유지할 수 있습니다.\n\n### 2.2. 직장 경력(Career) ↔ 프로젝트(Project) 1:N 위계 구조\n- **연관 매핑**: `Project.career_experience_id` (FK → `Career.experience_id`).\n- **도메인 의미**: \n  - 특정 회사(`Career`)에 소속된 실무 프로젝트는 `career_experience_id`를 통해 1:N으로 묶입니다.\n  - 개인 프로젝트/사이드 프로젝트는 `career_experience_id = NULL`로 관리하여 사내 프로젝트와 전역 사이드 프로젝트를 유연하게 수용합니다.\n\n### 2.3. CAREER의 `ExperienceDetail` 보유 정당성\n- 프로젝트 성격의 세부 구현 불릿은 하위 `Project`로 위임되지만, `Career` 자체도 `ExperienceDetail` 목록을 가질 수 있습니다.\n- **용도**: 회사 차원의 **조직 관리, 팀 리더십, 소프트 스킬, 사내 공통 업무 성과**를 기재하는 독립 전용 불릿 공간으로 활용됩니다.\n\n---\n\n## 3. 엔티티 순수성(Entity Purity)과 UI 메타데이터 분리 개선안\n\n### 3.1. 문제 제기: `show_on_timeline`과 `timeline_label`\n현재 `experience` 테이블에는 화면 표현용 필드인 `show_on_timeline`과 `timeline_label`이 직접 포함되어 있습니다.\n- **도메인 관점의 한계**:\n  1. 이력(`Experience`)이라는 순수 도메인 객체가 \"특정 프론트엔드 UI 화면의 타임라인 뷰\"에 종속되는 문제가 발생합니다.\n  2. 향후 \"이력서 PDF 전용 핀\", \"랜딩 하이라이트\" 등 화면 뷰 요구사항이 추가될 때마다 `experience` 테이블에 컬럼이 계속 추가되는 스키마 오염(Schema Pollution)을 초래합니다.\n\n### 3.2. 개선 설계안: Placement / Presentation Decorator 패턴 적용\n`show_on_timeline` 및 `timeline_label`을 기존 `ExperiencePlacement` 큐레이션 메타데이터 구조로 흡수/통합하는 리팩토링 모델입니다.\n\n```mermaid\nclassDiagram\n    class Experience {\n        +Long id\n        +String title\n        +LocalDate periodStart\n        +LocalDate periodEnd\n        +String summary\n        +String takeaway\n    }\n\n    class ExperiencePlacement {\n        +Long id\n        +Experience experience\n        +PlacementType placementType : TIMELINE / CORE_PROJECT\n        +String customLabel\n        +int displayOrder\n        +boolean enabled\n    }\n\n    Experience \"1\" <-- \"0..*\" ExperiencePlacement : UI Decorator\n```\n\n1. **`ExperiencePlacementType`에 `TIMELINE` 추가**:\n   - `placement_type = 'TIMELINE'` 행을 통해 타임라인 노출 여부(`enabled`), 순서(`displayOrder`), 커스텀 타임라인 라벨(`customLabel`)을 관리합니다.\n2. **`Experience` 엔티티 정제**:\n   - `Experience` 엔티티에서는 UI 종속 필드를 제거하여 순수한 비즈니스 이력 정보만 유지합니다.\n\n---\n\n## 4. 결론 및 리팩토링 실행 로드맵\n1. **Flyway 마이그레이션**: `V45__decouple_timeline_placement.sql`을 작성하여 기존 `experience.show_on_timeline` 및 `timeline_label` 데이터를 `experience_placement` (PlacementType='TIMELINE')으로 이관.\n2. **JPA 엔티티 정제**: `Experience` 클래스에서 `showOnTimeline`, `timelineLabel` 필드 제거.\n3. **DTO 및 Presentation Layer 개편**: 프론트엔드 API 응답 시 `ExperiencePlacement` 데이터를 조합하여 DTO로 반환함으로써 깔끔한 DDD / CQRS 구조 완성.\n",
                StudyStatus.PUBLISHED,
                categoryMap.get("backend"),
                LocalDate.of(2026, 7, 21),
                LocalDateTime.of(2026, 7, 21, 11, 0)
        ));
        study4.replaceSkills(getSkills(List.of("Java", "Spring Boot", "Spring Data JPA", "PostgreSQL", "Flyway"), skillMap));
        study4.replaceTags(getOrCreateTags(List.of("Backend", "Database Modeling", "JPA", "DDD", "Refactoring")));
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

    private void seedPrintTemplates() {
        if (printTemplateRepository.count() > 0) {
            return;
        }

        printTemplateRepository.save(PrintTemplate.create(
            "[대표] 이력서 & 경력기술서",
            "[]",
            "[\"intro-profile\", \"competencies\", \"skills\", \"career\", \"projects\", \"credentials\"]",
            "{\"competencies\": 20, \"skills\": 20, \"career\": 24, \"projects\": 24, \"credentials\": 20}",
            true,
            1
        ));

        printTemplateRepository.save(PrintTemplate.create(
            "[요약] 1장 간이 이력서",
            "[\"competencies\", \"projects\", \"architecture-components\", \"architecture-diagram\"]",
            "[\"intro-profile\", \"skills\", \"career\", \"credentials\"]",
            "{\"skills\": 16, \"career\": 24, \"credentials\": 20}",
            true,
            2
        ));

        printTemplateRepository.save(PrintTemplate.create(
            "[포트폴리오] 아키텍처 포함 통합서류",
            "[\"competencies\"]",
            "[\"intro-profile\", \"skills\", \"career\", \"projects\", \"architecture-diagram\", \"credentials\"]",
            "{\"skills\": 16, \"career\": 24, \"projects\": 24, \"architecture-diagram\": 28}",
            true,
            3
        ));
    }
}
