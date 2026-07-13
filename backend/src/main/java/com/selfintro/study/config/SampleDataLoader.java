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
        studyEntryRepository.save(StudyEntry.create(
                "CS 처리 프로세스 개선 [청년일경험]",
                "네이버 카페 등의 고객 문의 수집·관리 CS 시스템을 생성형 AI를 활용해 풀스택 개발했습니다. n8n으로 데이터를 자동 수집해 DB에 적재하고, 웹 콘솔에서 문의 상태·이력을 관리합니다. Playwright 네이버 세션 자동 로그인, PII 암호화, RBAC 인증, Grafana 모니터링을 포함한 컨테이너 기반 운영 환경을 구축했습니다.",
                StudyCategory.PROJECT,
                List.of("n8n", "Playwright", "Node.js", "React", "PII Encryption", "RBAC", "Grafana", "Docker"),
                "고객 문의 수집부터 처리까지의 워크플로우를 자동화하여 운영 생산성을 높이고, 민감 데이터 암호화 및 권한 관리를 통해 실운영 수준의 안정성을 확보했습니다.",
                LocalDate.of(2026, 7, 1)
        ));

        studyEntryRepository.save(StudyEntry.create(
                "Azure 로그 비용 자동진단 SaaS [교육과정 팀프로젝트]",
                "Azure 로그 비용 폭증과 모니터링 사각지대를 해결하고자 Teams 챗봇형 로그 진단 SaaS를 기획부터 구축까지 주도 개발했습니다. 탐지·예방·필터·보존 4대 엔진이 Azure Functions 에이전트로 비용 누수를 자동 진단하고, FastAPI·Cosmos DB 백엔드, Azure OpenAI 처방, Bicep 최소권한 IaC를 구축했습니다.",
                StudyCategory.PROJECT,
                List.of("Azure Functions", "FastAPI", "Cosmos DB", "Azure OpenAI", "Bicep", "IaC"),
                "클라우드 자원 비용을 실시간으로 감시하고 에이전트 기반으로 자동 진단하는 파이프라인을 구축하며 클라우드 아키텍처와 IaC 배포 자동화를 체득했습니다.",
                LocalDate.of(2026, 6, 1)
        ));

        studyEntryRepository.save(StudyEntry.create(
                "AI 기반 실시간 모의면접 플랫폼 [개인프로젝트]",
                "실시간 AI 모의면접 서비스의 프론트엔드, BFF, Core, Socket, LLM/STT/TTS, 배포 인프라를 개발했습니다. gRPC/Redis/Kafka 기반 음성 스트리밍, 이력서 RAG 질문 생성, 면접 상태 관리와 리포트 기능을 구현했습니다.",
                StudyCategory.PROJECT,
                List.of("React", "gRPC", "Redis", "Kafka", "LLM", "STT/TTS", "RAG", "Kubernetes"),
                "비동기 메시징 및 음성 스트리밍에서 발생할 수 있는 지연과 유실을 제어하고, 생성형 AI를 실무에 녹여내는 아키텍처를 설계하는 실행력을 길렀습니다.",
                LocalDate.of(2026, 3, 1)
        ));

        studyEntryRepository.save(StudyEntry.create(
                "무료체험 신청·관리 백오피스 시스템 구축 [사내 TF]",
                "사내 무료체험 신청 프로세스 개선을 위해 자발적으로 결성한 TF에서 백엔드 전체를 담당. Spring Boot API 서버, 유입경로 추적, 카카오 알림톡 연동, Redis 세션 인증을 구현하고 Docker·Nginx·MySQL·Grafana로 배포·모니터링 인프라 구축.",
                StudyCategory.PROJECT,
                List.of("Spring Boot", "JPA", "Redis", "Docker", "Nginx", "Grafana", "MySQL"),
                "타 부서와의 유기적인 협업을 주도하고, Spring Boot 백엔드 파이프라인부터 모니터링 대시보드까지 주도적으로 구축해 서비스 유입 및 장애 파악 시간을 단축했습니다.",
                LocalDate.of(2025, 7, 1)
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
