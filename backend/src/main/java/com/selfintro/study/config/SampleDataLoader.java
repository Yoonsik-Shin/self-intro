package com.selfintro.study.config;

import com.selfintro.study.entity.StudyCategory;
import com.selfintro.study.entity.StudyEntry;
import com.selfintro.study.repository.StudyEntryRepository;
import java.time.LocalDate;
import java.util.List;
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

    private final StudyEntryRepository studyEntryRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (studyEntryRepository.count() > 0) {
            return;
        }

        // 1. Projects
        // 1. Projects
        studyEntryRepository.save(StudyEntry.create(
                "CS Test Bed (고객문의 수집·자동응답 통합 테스트베드)",
                "고객 문의 수집·관리 및 브라우저 자동화(Playwright)와 노코드 n8n 워크플로우를 활용해 네이버 카페, 이메일 등의 문의 수작업 처리 과정을 자동화한 E2E 테스트베드 시스템입니다. Spring Boot 3.3 백엔드, React 19 프론트엔드, Playwright Express 워커, n8n 오케스트레이터, DB 기반 RBAC 및 PII 암호화를 구축하고, Nginx auth_request 인증 계층과 Loki/Grafana/Alloy로 실시간 모니터링 환경을 구성했습니다.",
                StudyCategory.PROJECT,
                List.of("Java 21", "Spring Boot 3.3", "QueryDSL", "Flyway", "React 19", "Playwright", "n8n", "Nginx", "Docker Compose", "Grafana", "Loki", "Alloy"),
                "HMAC 인증 토큰과 Nginx auth_request를 활용해 내부 툴들의 보안 계층을 구축하고, n8n 분산 Lock 패턴과 무중단 개인정보(PII) 암호화 마이그레이션을 통해 운영 안정성을 하드닝했습니다.",
                LocalDate.of(2026, 7, 1)
        ));

        studyEntryRepository.save(StudyEntry.create(
                "LogDoctor (Azure 클라우드 로그 비용 진단 및 최적화 SaaS)",
                "Microsoft Azure LAW(Log Analytics Workspace) 요금 분석 및 비용 리스크를 진단하고 권장 진료 가이드를 발급하는 Microsoft Teams 전용 SaaS 솔루션입니다. 에이전트 기반 VM 연결 단절 탐지, 디버그 로그 폭증 추적, Azure OpenAI RAG 기반 맞춤 처방 제공, 로그 데이터 PII 마스킹 처리 등을 구축했습니다.",
                StudyCategory.PROJECT,
                List.of("Azure Functions", "FastAPI", "Cosmos DB", "Azure OpenAI", "Teams SDK", "Bicep", "IaC"),
                "쓰기 권한을 제외한 최소 읽기 전용 권한(18개) 진단 체계로 인프라 보안 위험을 차단하고, LLM을 결합하여 비용 최적화를 자동 진단·안내하는 파이프라인을 체득했습니다.",
                LocalDate.of(2026, 6, 1)
        ));

        studyEntryRepository.save(StudyEntry.create(
                "AI 기반 실시간 모의면접 플랫폼",
                "실시간 AI 모의면접 및 역량 평가 서비스의 전체 시스템 아키텍처와 분산 메시징 처리 부분을 담당했습니다. gRPC 기반 실시간 음성 스트리밍 제어, Redis/Kafka 비동기 메시지 큐를 통한 음성 데이터 및 AI 상태 변경 큐잉, 이력서 RAG 질문 생성 기능 등을 구현하고 Kubernetes 환경에 배포했습니다.",
                StudyCategory.PROJECT,
                List.of("React", "gRPC", "Redis", "Kafka", "LLM", "STT/TTS", "RAG", "Kubernetes"),
                "비동기 메시징 및 대용량 음성 스트리밍 환경에서 발생할 수 있는 데이터 유실과 지연 병목을 제어하며 분산 인프라 설계 능력을 키웠습니다.",
                LocalDate.of(2026, 3, 1)
        ));

        studyEntryRepository.save(StudyEntry.create(
                "에듀테크 학습 플랫폼 핵심 서버 및 BFF 구축 [실무 경력]",
                "커리큘럼 기반 AI 학습 플랫폼의 핵심 Express API 서버와 NestJS 기반 BFF(Backend for Frontend) 서버를 부트스트랩하고 설계·개발을 전담했습니다. AI 튜터 메시징 대화 세션 모델 추상화 및 SQS 비동기 연동, 교사용 실시간 학생 관리(Presence) 모듈 설계, SubmittedProblem 도메인 CQRS 리팩토링 및 대형 마이그레이션을 총괄했습니다. Spring Boot 기반 백오피스 서비스도 1인 단독 구축하여 알림톡 연동과 Redis 세션 로그인을 구현했습니다.",
                StudyCategory.PROJECT,
                List.of("Node.js", "TypeScript", "NestJS", "Express", "MongoDB", "Redis", "Spring Boot", "AWS ECS/SQS", "Docker", "Datadog"),
                "실무 서비스의 9,500여 개 커밋 중 약 43%를 담당한 최다 기여자로서 비즈니스 확장 시 도메인 관심사 격리, 성능 튜닝, 그리고 인프라 CI/CD 파이프라인 전반을 주도하는 리드 엔지니어로 성장했습니다.",
                LocalDate.of(2025, 9, 15)
        ));

        // 2. Educations
        studyEntryRepository.save(StudyEntry.create(
                "[Microsoft] AI 엔지니어링 과정 (3기)",
                "ML/DL 기초학습, Agentic AI 구축 (LangChain, LangGraph), RAG 구축, AI Azure 기반의 클라우드 엔지니어 학습 (600시간)",
                StudyCategory.EDUCATION,
                List.of("ML/DL", "LangChain", "LangGraph", "RAG", "Azure"),
                "Agentic AI와 RAG 아키텍처를 깊이 있게 다루고, 클라우드 환경에서 AI 인프라를 구축하고 운영하는 방법을 익혔습니다.",
                LocalDate.of(2026, 3, 15)
        ));

        studyEntryRepository.save(StudyEntry.create(
                "풀스택 프로젝트 실무과정 [청년취업사관학교]",
                "TypeScript 기반 풀스택 교육으로 주로 JavaScript/TypeScript 언어에 대한 깊은 이해와 프레임워크 사용법 등을 학습 (265시간)",
                StudyCategory.EDUCATION,
                List.of("TypeScript", "Node.js", "React", "Express"),
                "TypeScript와 React/Express 환경에서 웹 애플리케이션의 풀스택 개발 생태계와 협업 워크플로우를 체화했습니다.",
                LocalDate.of(2023, 10, 31)
        ));

        studyEntryRepository.save(StudyEntry.create(
                "파이썬 기반 풀스택 부트캠프 [멀티캠퍼스]",
                "풀스택 교육으로 Git, HTML, CSS, Django Template Engine을 활용한 MVC 기반 웹사이트 구현 기초를 학습 (980시간)",
                StudyCategory.EDUCATION,
                List.of("Python", "Django", "HTML/CSS", "Git"),
                "소프트웨어 개발의 첫 단추인 MVC 아키텍처와 웹 표준, 협업을 위한 형상 관리 도구의 기초를 탄탄히 다졌습니다.",
                LocalDate.of(2022, 12, 31)
        ));

        // 3. Certificates
        studyEntryRepository.save(StudyEntry.create(
                "정보처리기사",
                "IT 전반의 핵심 이론 및 기술 자격 검증 (한국산업인력공단)",
                StudyCategory.CERTIFICATE,
                List.of("Software Engineering", "Database", "Network"),
                "개발 생명주기 전반에 걸친 기초 체력을 공인 자격을 통해 입증했습니다.",
                LocalDate.of(2022, 6, 17)
        ));

        studyEntryRepository.save(StudyEntry.create(
                "SQL 개발자(SQLD)",
                "데이터베이스 모델링 및 SQL 작성 능력 검증 ((재)한국데이터산업진흥원)",
                StudyCategory.CERTIFICATE,
                List.of("SQL", "DB Modeling", "Optimization"),
                "데이터베이스를 단순히 저장소로 쓰는 것을 넘어 성능과 무결성을 고려하여 쿼리하고 모델링할 수 있음을 검증했습니다.",
                LocalDate.of(2024, 9, 20)
        ));

        studyEntryRepository.save(StudyEntry.create(
                "빅데이터분석기사",
                "데이터 수집, 전처리, 분석 모형 설계 및 평가 역량 검증 ((재)한국데이터산업진흥원)",
                StudyCategory.CERTIFICATE,
                List.of("Data Preprocessing", "Statistics", "Machine Learning"),
                "데이터를 수집하고 전처리하여 통계적 기법과 ML 모형으로 분석해 유의미한 가치를 추출할 수 있는 이론적 토대를 닦았습니다.",
                LocalDate.of(2022, 7, 15)
        ));

        studyEntryRepository.save(StudyEntry.create(
                "컴퓨터활용능력 1급",
                "스프레드시트 및 데이터베이스 활용 능력 자격 검증 (대한상공회의소)",
                StudyCategory.CERTIFICATE,
                List.of("Excel", "Access"),
                "정량적 데이터 정제 및 비즈니스 데이터 처리에 필요한 기본 오피스 역량을 인증받았습니다.",
                LocalDate.of(2018, 11, 16)
        ));
    }
}
