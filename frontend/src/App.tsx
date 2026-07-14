import { type FormEvent, useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Printer,
  Briefcase,
  Cpu,
  MapPin,
  User,
  Mail,
  Phone,
  ChevronRight,
  Terminal,
  Code2,
  BookOpen,
  Send,
  Github
} from 'lucide-react';
import { studyApi, type CreateStudyEntryRequest, type StudyEntry } from './lib/api';
import { useIntroStore } from './store/useIntroStore';

const milestones = [
  {
    id: 'project1',
    label: 'CS Test Bed',
    period: '2026.06 - 2026.07',
    title: '고객문의 수집·자동응답 통합 테스트베드 (기여도 100%)',
    body: 'n8n 자동 수집, Playwright 네이버 로그인, PII 암호화, Grafana 모니터링 환경을 구축했습니다.',
    skills: ['Java 21', 'Spring Boot 3.3', 'QueryDSL', 'Flyway', 'React 19', 'Playwright', 'n8n', 'Nginx', 'Docker Compose', 'Grafana', 'Loki', 'Alloy'],
    role: 'Backend & DevOps Engineer',
    description: '고객 문의 수집·관리 및 브라우저 자동화(Playwright)와 노코드 n8n 워크플로우를 활용해 네이버 카페, 이메일 등의 문의 수작업 처리 과정을 자동화한 E2E 테스트베드 시스템입니다. DB 기반 RBAC 및 PII 암호화, Nginx auth_request 인증 계층과 Loki/Grafana/Alloy로 실시간 모니터링 환경을 구성했습니다.',
    takeaway: 'HMAC 인증 토큰과 Nginx auth_request를 활용해 내부 툴들의 보안 계층을 구축하고, n8n 분산 Lock 패턴과 무중단 개인정보(PII) 암호화 마이그레이션을 통해 운영 안정성을 하드닝했습니다.'
  },
  {
    id: 'project2',
    label: 'LogDoctor (SaaS)',
    period: '2026.03 - 2026.06',
    title: 'Azure 클라우드 로그 비용 진단 및 최적화 SaaS (기여도 70%)',
    body: 'Azure Functions 비용 누수 자동 진단, FastAPI/Cosmos DB 백엔드, OpenAI 처방을 연동했습니다.',
    skills: ['Azure Functions', 'FastAPI', 'Cosmos DB', 'Azure OpenAI', 'Teams SDK', 'Bicep', 'IaC'],
    role: 'Fullstack & Cloud Developer',
    description: 'Microsoft Azure LAW(Log Analytics Workspace) 요금 분석 및 비용 리스크를 진단하고 권장 진료 가이드를 발급하는 Microsoft Teams 전용 SaaS 솔루션입니다. 에이전트 기반 VM 연결 단절 탐지, 디버그 로그 폭증 추적, Azure OpenAI RAG 기반 맞춤 처방 제공, 로그 데이터 PII 마스킹 처리 등을 구축했습니다. (팀 프로젝트)',
    takeaway: '쓰기 권한을 제외한 최소 읽기 전용 권한(18개) 진단 체계로 인프라 보안 위험을 차단하고, LLM을 결합하여 비용 최적화를 자동 진단·안내하는 파이프라인을 체득했습니다.'
  },
  {
    id: 'project3',
    label: 'AI 실시간 모의면접 플랫폼',
    period: '2025.12 - 2026.03',
    title: '음성 스트리밍 및 RAG 면접 관리 (기여도 100%)',
    body: 'gRPC/Redis/Kafka 기반 실시간 음성 스트리밍, 이력서 RAG 질문 생성 서비스를 설계했습니다.',
    skills: ['React', 'gRPC', 'Redis', 'Kafka', 'LLM', 'STT/TTS', 'RAG', 'Kubernetes'],
    role: 'Core Architect & Developer',
    description: '실시간 AI 모의면접 및 역량 평가 서비스의 전체 시스템 아키텍처와 분산 메시징 처리 부분을 담당했습니다. gRPC 기반 실시간 음성 스트리밍 제어, Redis/Kafka 비동기 메시지 큐를 통한 음성 데이터 및 AI 상태 변경 큐잉, 이력서 RAG 질문 생성 기능 등을 구현하고 Kubernetes 환경에 배포했습니다. (개인 프로젝트)',
    takeaway: '비동기 메시징 및 대용량 음성 스트리밍 환경에서 발생할 수 있는 데이터 유실과 지연 병목을 제어하며 분산 인프라 설계 능력을 키웠습니다.'
  },
  {
    id: 'project4',
    label: '에듀테크 플랫폼 핵심 서버/BFF',
    period: '2023.12 - 2025.10',
    title: '학습 플랫폼 핵심 API 및 BFF 구축 (기여도 43%)',
    body: 'AI 튜터 세션 모델 설계, 실시간 학생 Presence 추적, 백오피스 단독 구축을 총괄했습니다.',
    skills: ['Node.js', 'TypeScript', 'NestJS', 'Express', 'MongoDB', 'Redis', 'Spring Boot', 'AWS ECS/SQS', 'Docker', 'Datadog'],
    role: 'Backend & DevOps Engineer',
    description: '커리큘럼 기반 AI 학습 플랫폼의 핵심 Express API 서버와 NestJS 기반 BFF(Backend for Frontend) 서버를 부트스트랩하고 설계·개발을 전담했습니다. AI 튜터 메시징 대화 세션 모델 추상화 및 SQS 비동기 연동, 교사용 실시간 학생 관리(Presence) 모듈 설계, SubmittedProblem 도메인 CQRS 리팩토링 및 대형 마이그레이션을 총괄했습니다. Spring Boot 기반 백오피스 서비스도 1인 단독 구축하였습니다. (에듀테크 스타트업 실무 경력)',
    takeaway: '실무 서비스의 9,500여 개 커밋 중 약 43%를 담당한 최다 기여자로서 비즈니스 확장 시 도메인 관심사 격리, 성능 튜닝, 그리고 인프라 CI/CD 파이프라인 전반을 주도하는 리드 엔지니어로 성장했습니다.'
  }
];

const essays = {
  WHY: {
    title: '1. 프로젝트별 기술 적용 및 문제 해결 상세',
    subtitle: '실무 경력 및 핵심 프로젝트에서 직접 설계하고 해결한 구체적인 기술적 경험을 기술합니다.',
    paragraphs: [
      `에듀테크 스타트업 실무 경력 (1년 11개월): 핵심 애플리케이션 및 BFF 서버 개발을 전담하며 전체 9,500여 개 커밋 중 약 43%를 담당한 최다 기여자로 활약했습니다. 특히 AI 튜터 메시징 대화 세션의 4개 컨텍스트 다형성(문제풀이/복습/챌린지/개념보강) 모델을 추상화하여 외부 AI 서버와의 SQS 비동기 연동을 주도했으며, MongoDB 트랜잭션을 적용해 상태 변화의 데이터 정합성을 보장했습니다. 또한 교사용 실시간 학생 Presence 추적과 이상행동(manageable-action) 감지, 제출문제(SubmittedProblem) 도메인의 CQRS 리팩토링 및 6만 건의 데이터 마이그레이션 스크립트를 작성하여 시스템 효율화를 이뤄냈습니다.`,
      `백오피스 TF 및 공용 서비스 단독 구축: 무료체험 프로세스 개선을 위한 자발적 TF에서 Spring Boot 3.2 + Security + JPA 기반 백오피스 서버(144개 클래스) 전체를 단독 개발했습니다. NCP 카카오 알림톡(HMAC 서명 구현) 및 MS Teams 웹훅 연동을 통해 알림을 자동화했으며, Redis Session을 활용해 크로스도메인 쿠키 인증 이슈를 해결했습니다. 추가로 여러 부서가 공용하는 6만여 개의 문항 조회를 위한 NestJS 마이크로서비스를 단독 설계하고, 공통 DB/캐시 모듈을 사내 npm 패키지로 격리하며 신규 NestJS 프로젝트 생성용 CLI 도구까지 주도 개발했습니다.`,
      `CS Test Bed 및 신규 프로젝트 개발: CS 문의 수집·답변 자동화 E2E 시스템(CS Test Bed)을 단독 구축했습니다. n8n 워크플로우로 카페 게시판과 이메일 문의를 수집하고, Playwright를 활용해 네이버 세션 만료 및 자동 답변 우회 로직을 구현했습니다. Nginx auth_request 및 HMAC 토큰을 활용한 보안 프록시 계층을 설계하여 MinIO/Grafana 등 내부 도구에 SSO를 연동했습니다. AI 실시간 모의면접 플랫폼에서는 gRPC/Redis/Kafka 기반의 음성 스트리밍 파이프라인을 설계해 비동기 상태 통제와 RAG Rerank 최적화 성능을 확보했습니다.`
    ]
  },
  STRENGTH: {
    title: '2. 전공 자격증 기반의 기술적 전문성 증명',
    subtitle: '정보처리기사, SQLD, 빅데이터분석기사 자격을 통해 획득한 이론을 실제 프로젝트 아키텍처에 접목한 상세 내용입니다.',
    strengths: [
      {
        title: '정보처리기사: 소프트웨어 공학 주기 및 클린 아키텍처 실무 접목',
        content: '정보처리기사 취득 과정에서 체화한 소프트웨어 개발 생명주기(SDLC), 모듈 설계 원칙(응집도와 결합도), 객체지향 설계(SOLID)를 실무에 직접 투영했습니다. 도메인의 경계를 명확히 분리하고 인프라 변경에 유연하게 대응하기 위해 헥사고날(포트-어댑터) 아키텍처와 DDD 4계층(adapter-application-domain-infrastructure) 구조를 에듀테크 서비스 전체에 일관 적용하여 코드 가독성과 확장성을 대폭 높였습니다.'
      },
      {
        title: 'SQL 개발자(SQLD): 관계형 데이터베이스 모델링 및 동적 쿼리 최적화',
        content: '데이터 모델 정규화 및 반정규화, 인덱스(Index) 설계 원리와 조인(Join) 메커니즘을 심도 있게 학습했습니다. Spring Boot 기반 백오피스 개발 시 8개 도메인 간의 유기적 관계(1:N, N:M)를 매핑하고, 복잡한 동적 필터 조회를 위해 QueryDSL을 연동하여 성능 향상을 이뤄냈습니다. N+1 문제를 방지하기 위해 Fetch Join과 인덱스 튜닝을 도입하여 조회 속도를 개선했습니다.'
      },
      {
        title: '빅데이터분석기사: 대용량 데이터 전처리 및 통계 분석 파이프라인 설계',
        content: '대량 데이터 수집, 이상치 정제, 통계적 분석(가설 검정, 회귀 모형) 및 평가 메커니즘을 마이그레이션과 AI RAG 파이프라인에 접목했습니다. SubmittedProblem 통계 병합 마이그레이션 시 14개 집계 지표(제출수/정답수/소요시간 등)를 MongoDB 트랜잭션 내에서 정량 데이터로 가공·적재하는 파이프라인을 구축하였으며, AI 모의면접 플랫폼에서 PDF 이력서 RAG 질문 생성의 답변 정확도를 분석하는 통계 평가 체계에 응용했습니다.'
      }
    ]
  }
};

const fallbackEntries: StudyEntry[] = [
  {
    id: 1,
    title: 'CS Test Bed (고객문의 수집·자동응답 통합 테스트베드)',
    description: '고객 문의 수집·관리 및 브라우저 자동화(Playwright)와 노코드 n8n 워크플로우를 활용해 네이버 카페, 이메일 등의 문의 수작업 처리 과정을 자동화한 E2E 테스트베드 시스템입니다. Spring Boot 3.3 백엔드, React 19 프론트엔드, Playwright Express 워커, n8n 오케스트레이터, DB 기반 RBAC 및 PII 암호화를 구축하고, Nginx auth_request 인증 계층과 Loki/Grafana/Alloy로 실시간 모니터링 환경을 구성했습니다.',
    category: 'PROJECT',
    skills: ['Java 21', 'Spring Boot 3.3', 'QueryDSL', 'Flyway', 'React 19', 'Playwright', 'n8n', 'Nginx', 'Docker Compose', 'Grafana', 'Loki', 'Alloy'],
    takeaway: 'HMAC 인증 토큰과 Nginx auth_request를 활용해 내부 툴들의 보안 계층을 구축하고, n8n 분산 Lock 패턴과 무중단 개인정보(PII) 암호화 마이그레이션을 통해 운영 안정성을 하드닝했습니다.',
    learnedAt: '2026-07-01'
  },
  {
    id: 2,
    title: 'LogDoctor (Azure 클라우드 로그 비용 진단 및 최적화 SaaS)',
    description: 'Microsoft Azure LAW(Log Analytics Workspace) 요금 분석 및 비용 리스크를 진단하고 권장 진료 가이드를 발급하는 Microsoft Teams 전용 SaaS 솔루션입니다. 에이전트 기반 VM 연결 단절 탐지, 디버그 로그 폭증 추적, Azure OpenAI RAG 기반 맞춤 처방 제공, 로그 데이터 PII 마스킹 처리 등을 구축했습니다.',
    category: 'PROJECT',
    skills: ['Azure Functions', 'FastAPI', 'Cosmos DB', 'Azure OpenAI', 'Teams SDK', 'Bicep', 'IaC'],
    takeaway: '쓰기 권한을 제외한 최소 읽기 전용 권한(18개) 진단 체계로 인프라 보안 위험을 차단하고, LLM을 결합하여 비용 최적화를 자동 진단·안내하는 파이프라인을 체득했습니다.',
    learnedAt: '2026-06-01'
  },
  {
    id: 3,
    title: 'AI 기반 실시간 모의면접 플랫폼',
    description: '실시간 AI 모의면접 및 역량 평가 서비스의 전체 시스템 아키텍처와 분산 메시징 처리 부분을 담당했습니다. gRPC 기반 실시간 음성 스트리밍 제어, Redis/Kafka 비동기 메시지 큐를 통한 음성 데이터 및 AI 상태 변경 큐잉, 이력서 RAG 질문 생성 기능 등을 구현하고 Kubernetes 환경에 배포했습니다.',
    category: 'PROJECT',
    skills: ['React', 'gRPC', 'Redis', 'Kafka', 'LLM', 'STT/TTS', 'RAG', 'Kubernetes'],
    takeaway: '비동기 메시징 및 대용량 음성 스트리밍 환경에서 발생할 수 있는 데이터 유실과 지연 병목을 제어하며 분산 인프라 설계 능력을 키웠습니다.',
    learnedAt: '2026-03-01'
  },
  {
    id: 4,
    title: '에듀테크 학습 플랫폼 핵심 서버 및 BFF 구축 [실무 경력]',
    description: '커리큘럼 기반 AI 학습 플랫폼의 핵심 Express API 서버와 NestJS 기반 BFF(Backend for Frontend) 서버를 부트스트랩하고 설계·개발을 전담했습니다. AI 튜터 메시징 대화 세션 모델 추상화 및 SQS 비동기 연동, 교사용 실시간 학생 관리(Presence) 모듈 설계, SubmittedProblem 도메인 CQRS 리팩토링 및 대형 마이그레이션을 총괄했습니다. Spring Boot 기반 백오피스 서비스도 1인 단독 구축하여 알림톡 연동과 Redis 세션 로그인을 구현했습니다.',
    category: 'PROJECT',
    skills: ['Node.js', 'TypeScript', 'NestJS', 'Express', 'MongoDB', 'Redis', 'Spring Boot', 'AWS ECS/SQS', 'Docker', 'Datadog'],
    takeaway: '실무 서비스의 9,500여 개 커밋 중 약 43%를 담당한 최다 기여자로서 비즈니스 확장 시 도메인 관심사 격리, 성능 튜닝, 그리고 인프라 CI/CD 파이프라인 전반을 주도하는 리드 엔지니어로 성장했습니다.',
    learnedAt: '2025-09-15'
  }
];

export function App() {
  const queryClient = useQueryClient();
  
  const {
    selectedMilestoneId,
    activeCategory,
    activeMainTab,
    activeEssayTab,
    setSelectedMilestoneId,
    setActiveMainTab,
    setActiveEssayTab,
  } = useIntroStore();

  const [search, setSearch] = useState('');
  const [form, setForm] = useState<CreateStudyEntryRequest>({
    title: '',
    description: '',
    category: 'PROJECT',
    skills: '',
    takeaway: '',
    learnedAt: new Date().toISOString().split('T')[0]
  });

  const [activeSection, setActiveSection] = useState('intro-profile');

  useEffect(() => {
    const sections = ['intro-profile', 'career', 'skills', 'competencies', 'projects', 'architecture'];
    
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -55% 0px', // 스크롤 시 화면 중앙 부근에서 변경되도록 마진 설정
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      sections.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.unobserve(el);
      });
    };
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const { data: studyEntries } = useQuery<StudyEntry[]>({
    queryKey: ['studyEntries'],
    queryFn: () => studyApi.list(),
  });

  const selectedMilestone = useMemo(() => {
    return milestones.find(m => m.id === selectedMilestoneId) || milestones[0];
  }, [selectedMilestoneId]);

  const filteredEntries = useMemo((): StudyEntry[] => {
    const entries = studyEntries ?? fallbackEntries;
    return entries.filter((entry: StudyEntry) => {
      const matchCategory = activeCategory === 'ALL' || entry.category === activeCategory;
      const matchSearch = entry.title.toLowerCase().includes(search.toLowerCase()) ||
                          entry.description.toLowerCase().includes(search.toLowerCase()) ||
                          entry.skills.some((s: string) => s.toLowerCase().includes(search.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [studyEntries, activeCategory, search]);

  const createMutation = useMutation({
    mutationFn: studyApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyEntries'] });
      setForm({
        title: '',
        description: '',
        category: 'PROJECT',
        skills: '',
        takeaway: '',
        learnedAt: new Date().toISOString().split('T')[0]
      });
      alert('성공적으로 등록되었습니다!');
    },
  });

  const submitStudyEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate(form);
  };

  const handlePrint = () => {
    window.print();
  };

  // 공통 카드 레이아웃 스타일 통일
  const cardStyle = "bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)] transition-all duration-300 relative";
  
  // 공통 배지 스타일 통일
  const badgeStyle = "bg-slate-50 border border-slate-200/60 text-slate-700 text-sm font-bold px-2 py-0.5 rounded-md shadow-sm";

  return (
    <>
      <main className="min-h-screen bg-[#f8fafc] text-slate-800 font-['Plus_Jakarta_Sans',Pretendard,sans-serif] print:bg-white print:text-black pb-12">
        {/* Background Glow effects */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full filter blur-[120px] pointer-events-none print:hidden" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-indigo-500/3 rounded-full filter blur-[100px] pointer-events-none print:hidden" />

        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl print:hidden">
          <div className="mx-auto flex h-12 max-w-[1500px] items-center justify-between gap-4">
            <button onClick={() => scrollToSection('intro-profile')} className="flex items-center gap-3 text-left focus:outline-none hover:opacity-90 transition" title="프로필로 이동">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-sm font-black text-white shadow-md shadow-indigo-500/20">
                YS
              </div>
            </button>

            <nav className="hidden items-center gap-0.5 lg:gap-1 md:flex">
              {[
                { id: 'intro-profile', label: '프로필' },
                { id: 'career', label: '직장 경력' },
                { id: 'skills', label: '기술 스택' },
                { id: 'competencies', label: '역량 기술서' },
                { id: 'projects', label: '핵심 프로젝트' },
                { id: 'architecture', label: '시스템 아키텍처' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => scrollToSection(tab.id)}
                  className={`rounded-lg px-2 lg:px-4 py-2 text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                    activeSection === tab.id
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-200/50'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-3 py-1.5 text-sm font-bold text-white hover:from-indigo-500 hover:to-indigo-600 transition shadow-sm shadow-indigo-500/20"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">PDF 인쇄</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Body Layout */}
        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_260px] print:block relative items-start">
            
            {/* Main Content Column */}
            <div className="min-w-0 space-y-12">
              
              {/* General Career Summary Banner (Hero) / Combined Profile Banner */}
              <div id="intro-profile" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] backdrop-blur-md">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-550/5 rounded-full filter blur-[60px] -mr-20 -mt-20 pointer-events-none" />
            
            <div className="relative z-10 space-y-6">
              
              {/* Top Row: Name, English Name, Social Links, and Deploy Badge */}
              {/* Top Row: Name, English Name, Job Title and Social Links */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-700 leading-none">
                    Software Engineer
                  </h2>
                  <div className="flex items-baseline gap-2.5">
                    <h1 className="text-3xl font-black text-slate-900 leading-none">신윤식</h1>
                    <span className="text-lg font-bold text-slate-450 font-mono">Yoonsik Shin</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3.5 mt-2 md:mt-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 animate-pulse shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    실시간 아키텍처 및 콘텐츠 개선 중 (v1.2.4 - 2026. 07. 14 10:07 배포)
                  </span>

                  <div className="flex items-center gap-2">
                    <a
                      href="https://github.com/Yoonsik-Shin"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-slate-50 border border-slate-200/60 p-2 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition"
                      title="GitHub"
                    >
                      <Github className="h-4 w-4" />
                    </a>
                    <a
                      href="mailto:aaa946@naver.com"
                      className="rounded-lg bg-slate-50 border border-slate-200/60 p-2 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition"
                      title="이메일 보내기"
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                    <a
                      href="tel:010-5171-0994"
                      className="rounded-lg bg-slate-50 border border-slate-200/60 p-2 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition"
                      title="전화 걸기"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Bio & Personal Info */}
              <div className="space-y-6">
                <div>
                  <p className="mt-2 text-sm sm:text-base text-slate-650 leading-relaxed max-w-4xl">
                    에듀테크 실무 백엔드 개발 경험과 Java/Spring Boot, MSA 및 Cloud 인프라 구축 지식을 기반으로 안정적이고 최적화된 아키텍처를 설계하고 운영합니다.
                  </p>
                </div>

                    <div className="flex flex-col sm:flex-row print:flex-row gap-4 pt-2">
                      <button
                        onClick={() => scrollToSection('career')}
                        className="flex-1 flex items-center gap-3.5 text-left bg-slate-50/50 hover:bg-slate-50 border border-slate-150 hover:border-indigo-200 p-4 rounded-xl transition group shadow-sm"
                      >
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white border border-slate-200 text-slate-500 shrink-0 group-hover:text-indigo-600 group-hover:border-indigo-200 transition shadow-sm">
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-indigo-550 transition">실무 경력</span>
                          <span className="block font-black text-slate-800 text-sm group-hover:text-indigo-700 transition mt-0.5">1년 11개월 (에듀테크 스타트업)</span>
                        </div>
                      </button>

                      <button
                        onClick={() => scrollToSection('skills')}
                        className="flex-1 flex items-center gap-3.5 text-left bg-slate-50/50 hover:bg-slate-50 border border-slate-150 hover:border-indigo-200 p-4 rounded-xl transition group shadow-sm"
                      >
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white border border-slate-200 text-slate-500 shrink-0 group-hover:text-indigo-600 group-hover:border-indigo-200 transition shadow-sm">
                          <Cpu className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-indigo-550 transition">핵심 스택</span>
                          <span className="block font-black text-slate-800 text-sm group-hover:text-indigo-700 transition mt-0.5">Java / Node.js / Cloud</span>
                        </div>
                      </button>
                    </div>



              </div>
            </div>
          </div>

              {/* SECTION 1: 직장 경력 */}
              <section id="career" className="scroll-mt-24 space-y-6">
                <div className={cardStyle}>
                  <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Briefcase className="h-5 w-5 text-indigo-600" />
                    직장 경력 (총 1년 11개월)
                  </h3>
                  <div>
                    <span className="inline-flex rounded bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                      2023. 12 - 2025. 10
                    </span>
                    <p className="mt-2 text-lg font-black text-slate-800">에듀테크 스타트업 (정규직)</p>
                    <p className="text-sm font-semibold text-slate-500">개발팀 / 백엔드 엔지니어</p>
                    <ul className="mt-4 space-y-2 text-base text-slate-650 list-disc list-inside leading-relaxed font-normal">
                      <li>AI 튜터링 및 학습 플랫폼 핵심 API 서버 개발</li>
                      <li>프론트엔드 중계용 BFF 서버 설계 및 구축</li>
                      <li>Spring Boot 기반 사내 백오피스 단독 구축</li>
                      <li>AWS 인프라 및 CI/CD 파이프라인 설계/운영</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* SECTION 1.5: 핵심 기술 스택 */}
              <section id="skills" className="scroll-mt-24 space-y-6">
                <div className={cardStyle}>
                  <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Cpu className="h-5 w-5 text-indigo-600" />
                    핵심 기술 스택
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Core Languages</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {['Java', 'TypeScript', 'Python'].map((lang) => (
                          <span key={lang} className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-bold px-3 py-1 rounded-md shadow-sm">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Frameworks, Libraries & DevOps</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {['Spring Boot', 'JPA', 'QueryDSL', 'Node.js', 'FastAPI', 'Redis', 'Kafka', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'n8n'].map((item) => (
                          <span key={item} className={badgeStyle}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 2: 역량 기술서 */}
              <section id="competencies" className="scroll-mt-24 space-y-6">
                <div className={cardStyle}>
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-indigo-600" />
                      역량 기술서 (Core Competencies)
                    </h2>
                    <p className="text-base text-slate-500 mt-1">프로젝트 실무 및 자격증에 기반하여 입증 가능한 전문 기술 상세 명세입니다.</p>
                  </div>

                  <div className="mt-6 space-y-8">
                    
                    {/* Essay 1 */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-5">
                      <h3 className="text-lg font-black text-indigo-600 mb-1 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-indigo-50 text-sm font-black text-indigo-600 border border-indigo-100">1</span>
                        {essays.WHY.title}
                      </h3>
                      <p className="text-base font-semibold text-slate-500 italic mb-4 ml-0 sm:ml-8">
                        "{essays.WHY.subtitle}"
                      </p>
                      <div className="space-y-4 text-base sm:text-lg text-slate-650 leading-relaxed font-normal ml-0 sm:ml-8">
                        {essays.WHY.paragraphs.map((p, idx) => (
                          <p key={idx} className="indent-2 bg-white p-4 rounded-xl border border-slate-200/50 transition shadow-sm">
                            {p}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Essay 2 */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-5">
                      <h3 className="text-lg font-black text-indigo-600 mb-1 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-indigo-50 text-sm font-black text-indigo-600 border border-indigo-100">2</span>
                        {essays.STRENGTH.title}
                      </h3>
                      <p className="text-base font-semibold text-slate-500 italic mb-4 ml-0 sm:ml-8">
                        "{essays.STRENGTH.subtitle}"
                      </p>
                      <div className="grid grid-cols-1 gap-4 ml-0 sm:ml-8">
                        {essays.STRENGTH.strengths.map((str, idx) => (
                          <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300 transition">
                            <h4 className="text-base sm:text-lg font-black text-slate-800">
                              {str.title}
                            </h4>
                            <p className="mt-2 text-base leading-relaxed text-slate-650 font-normal">
                              {str.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </section>

              {/* SECTION 3: 핵심 프로젝트 포트폴리오 */}
              <section id="projects" className="scroll-mt-24 space-y-6">
                <div className={cardStyle}>
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-indigo-600" />
                      핵심 프로젝트 포트폴리오
                    </h2>
                    <p className="text-base text-slate-500 mt-1">담당 역할, 설계 세부 사항, 핵심 성과 및 실무 성과에 대한 타임라인 상세입니다.</p>
                  </div>

                  <div className="mt-8 space-y-8 relative before:absolute before:top-4 before:bottom-4 before:left-[15px] before:w-[2px] before:bg-slate-200">
                    {milestones.map((m, idx) => (
                      <div
                        key={m.id}
                        className="relative pl-10 group cursor-pointer"
                        onClick={() => setSelectedMilestoneId(m.id)}
                      >
                        
                        {/* Timeline Bullet node */}
                        <div className={`absolute left-[7px] top-1.5 w-[18px] h-[18px] rounded-full border-4 border-white transition-colors shadow-sm z-10 ${
                          selectedMilestoneId === m.id
                            ? 'bg-indigo-600 scale-110'
                            : 'bg-slate-300 group-hover:bg-indigo-400'
                        }`} />
                        
                        <div className={`rounded-xl border p-6 space-y-4 transition-all duration-300 shadow-sm ${
                          selectedMilestoneId === m.id
                            ? 'border-indigo-500 bg-white ring-2 ring-indigo-50/50'
                            : 'border-slate-200/80 bg-slate-50/50 hover:border-indigo-300 hover:bg-white'
                        }`}>
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div>
                              <span className="inline-flex rounded bg-indigo-50 px-2 py-0.5 text-sm font-bold text-indigo-700 border border-indigo-100">
                                {m.role} ({m.period})
                              </span>
                              <h3 className="mt-1.5 text-lg font-black text-slate-800">
                                {m.title}
                              </h3>
                            </div>
                            <span className="text-sm font-bold text-slate-400 bg-white border border-slate-150 px-2.5 py-1 rounded-md shrink-0">
                              기여도 {idx === 0 || idx === 2 ? '100%' : idx === 1 ? '70%' : '43%'}
                            </span>
                          </div>

                          <div className="space-y-3.5">
                            <div>
                              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">프로젝트 설명 및 역할</h4>
                              <p className="mt-1 text-base leading-relaxed text-slate-650 bg-white border border-slate-100 p-3 rounded-lg font-normal">
                                {m.description}
                              </p>
                            </div>

                            <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3.5">
                              <h4 className="text-sm font-bold text-emerald-700 flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                                핵심 성과 & 배운 점 (Takeaway)
                              </h4>
                              <p className="mt-1 text-base leading-relaxed text-emerald-800 font-semibold">
                                {m.takeaway}
                              </p>
                            </div>

                            <div>
                              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1.5">활용 기술 스택</h4>
                              <div className="flex flex-wrap gap-1">
                                {m.skills.map((skill) => (
                                  <span key={skill} className={badgeStyle}>
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* SECTION 4: 이 웹앱의 아키텍처 */}
              <section id="architecture" className="scroll-mt-24 space-y-6">
                <div className={cardStyle}>
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                      <Terminal className="h-5 w-5 text-indigo-600" />
                      이 포트폴리오 웹앱 자체의 시스템 아키텍처 (Self-Intro Architecture)
                    </h2>
                    <p className="text-base text-slate-500 mt-1">
                      지금 접속해 계신 이 웹 서버를 구동하고 데이터를 서빙하는 풀스택 컨테이너 인프라 설계 명세입니다.
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-5 shadow-sm">
                      <h3 className="text-sm font-black text-indigo-600 flex items-center gap-2 mb-3">
                        <span className="p-1.5 rounded bg-indigo-50 leading-none">💻</span>
                        Backend Layer
                      </h3>
                      <ul className="text-base sm:text-lg text-slate-650 space-y-2 leading-relaxed font-normal">
                        <li>
                          <strong className="text-slate-800 font-bold">Java 21 & Spring Boot 3.3</strong> 기반의 안정적인 API 서비스 구축
                        </li>
                        <li>
                          <strong className="text-slate-800 font-bold">Spring Data JPA</strong> 및 H2/MySQL 데이터베이스 통합 제어
                        </li>
                        <li>
                          <strong className="text-slate-800 font-bold">Flyway 스키마 마이그레이션</strong>을 활용해 실행 시 DDL 데이터 자동 적재 및 버전 제어
                        </li>
                        <li>
                          <strong className="text-slate-800 font-bold">SampleDataLoader</strong>를 통해 로컬/인메모리 시작 시 테스트용 개발 이력 시드 자동 세팅
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-5 shadow-sm">
                      <h3 className="text-sm font-black text-indigo-600 flex items-center gap-2 mb-3">
                        <span className="p-1.5 rounded bg-indigo-50 leading-none">🎨</span>
                        Frontend Layer
                      </h3>
                      <ul className="text-base sm:text-lg text-slate-650 space-y-2 leading-relaxed font-normal">
                        <li>
                          <strong className="text-slate-800 font-bold">React 19 & TypeScript & Vite</strong> 환경의 고성능 컴파일러 및 리플로우 최적화
                        </li>
                        <li>
                          <strong className="text-slate-800 font-bold">Zustand & TanStack Query</strong>를 조합한 프론트 전역 상태 및 비동기 API 캐시 제어
                        </li>
                        <li>
                          <strong className="text-slate-800 font-bold">Tailwind CSS (Vanilla CSS 폴백)</strong> 미드나잇 글래스모피즘 프리미엄 UI 디자인 테마
                        </li>
                        <li>
                          <strong className="text-slate-800 font-bold">PDF 인쇄 미디어 쿼리</strong> 최적화로 브라우저 상의 인쇄 레이아웃 단일 이력서 규격화
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-5 shadow-sm">
                      <h3 className="text-sm font-black text-indigo-600 flex items-center gap-2 mb-3">
                        <span className="p-1.5 rounded bg-indigo-50 leading-none">☸️</span>
                        DevOps & GitOps
                      </h3>
                      <ul className="text-base sm:text-lg text-slate-655 space-y-2 leading-relaxed font-normal">
                        <li>
                          <strong className="text-slate-850 font-bold">Cloudflare Pages CDN</strong>: 프론트엔드 정적 빌드 파일을 전 세계 엣지 노드에 초고속 캐싱 및 배포
                        </li>
                        <li>
                          <strong className="text-slate-850 font-bold">GitHub Actions & OCIR</strong>: 백엔드 푸시 시 ARM64 네이티브 컨테이너 이미지 자동 빌드 및 Oracle OCI Registry 배포
                        </li>
                        <li>
                          <strong className="text-slate-850 font-bold">Argo CD 자동 동기화</strong>: k8s 배포 매니페스트 변경을 Argo CD가 실시간 감지하여 OKE 클러스터에 무중단 롤아웃 배포
                        </li>
                        <li>
                          <strong className="text-slate-850 font-bold">Sealed Secrets 보안</strong>: DB 비밀번호 등 민감 데이터를 비대칭 키로 안전하게 암호화하여 Git에 안심하고 형상 관리
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-950 p-5 shadow-inner">
                    <h3 className="text-base sm:text-lg font-black text-slate-100 mb-3 flex items-center gap-1.5">
                      <span>☸️</span>
                      <span>실제 운영(Production) 시스템 아키텍처 및 배포 흐름도</span>
                    </h3>
                    <div className="text-[8px] xs:text-[9.5px] sm:text-[11px] md:text-[13px] lg:text-[11px] xl:text-[12.5px] print:text-[8.5px] font-mono text-slate-300 bg-slate-900 p-4 rounded-lg leading-normal tracking-tight sm:tracking-normal print:leading-[1.15] print:tracking-tighter whitespace-pre overflow-x-auto border border-slate-800">
{` +-----------------------------------------------------------------------------------------+
 |                                    [ Web Client User ]                                  |
 |                                             |                                           |
 |                       https://unbrdn.me     |     https://api.unbrdn.me                 |
 |                     +-----------------------+-----------------------+                   |
 |                     |                                               |                   |
 |                     v                                               v                   |
 |           [ Cloudflare Pages ]                            [ Cloudflare DNS Proxy ]      |
 |           - Frontend Static Hosting                                 |                   |
 |           - Worldwide Edge Caching                                  | OCI Load Balancer |
 |                                                                     v                   |
 |                                                          [ Ingress Nginx Controller ]   |
 |                                                                     | SSL / TLS Route   |
 |                                                                     v                   |
 |  +-----------------------------------------------------------------------------------+  |
 |  |                          Oracle Kubernetes Engine (OKE Cluster)                   |  |
 |  |                                                                                   |  |
 |  |   [ Argo CD Engine ]                 [ Sealed Secrets Controller ]                |  |
 |  |     - Watches GitHub Repository        - Decrypts encrypted DB Secrets            |  |
 |  |     - Automated git sync to cluster                                               |  |
 |  |                    |                                 |                            |  |
 |  |                    v                                 v                            |  |
 |  |        +-------------------------------------------------------+                  |  |
 |  |        |                  [ self-intro-backend-pod ]           |                  |  |
 |  |        |     - Spring Boot 3.3.3 API Server (Java 21 JRE)      |                  |  |
 |  |        |     - Runs on ARM64 Ampere A1 Compute Instance        |                  |  |
 |  |        +-------------------------------------------------------+                  |  |
 |  |                                    |                                              |  |
 |  +------------------------------------|----------------------------------------------+  |
 |                                       | JDBC Connector (OCI VCN Private Subnet)          |
 |                                       v                                                 |
 |                   [ MySQL HeatWave Database (Always Free) ]                             |
 |                     - Persistent relational database store                              |
 |                     - Flyway schema & SampleDataLoader automatic seeds                  |
 +-----------------------------------------------------------------------------------------+`}
                    </div>
                  </div>
                </div>
              </section>


            </div>

            {/* Right Sticky Sidebar Column */}
            <aside className="hidden lg:block print:hidden w-full sticky top-24 self-start">
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-md backdrop-blur-md space-y-5">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">내비게이션</h3>
                  <p className="text-sm text-slate-500 leading-none mt-0.5">클릭하면 해당 섹션으로 부드럽게 이동합니다.</p>
                </div>
                
                {/* Vertical Stepper Links */}
                <div className="relative pl-4 before:absolute before:top-2.5 before:bottom-2.5 before:left-[4px] before:w-[2px] before:bg-slate-100">
                  {[
                    { id: 'intro-profile', label: '프로필' },
                    { id: 'career', label: '직장 경력' },
                    { id: 'skills', label: '기술 스택' },
                    { id: 'competencies', label: '역량 기술서' },
                    { id: 'projects', label: '핵심 프로젝트' },
                    { id: 'architecture', label: '시스템 아키텍처' },
                  ].map((step) => (
                    <button
                      key={step.id}
                      onClick={() => scrollToSection(step.id)}
                      className="group flex items-start gap-3 w-full text-left py-2.5 relative transition-all duration-200"
                    >
                      {/* Stepper Bullet Node */}
                      <div className={`absolute left-[-15px] top-[14px] w-2 h-2 rounded-full border border-white transition-all duration-300 z-10 ${
                        activeSection === step.id
                          ? 'bg-indigo-600 scale-125 ring-4 ring-indigo-100'
                          : 'bg-slate-350 group-hover:bg-indigo-400'
                      }`} />
                      
                      <span className={`text-sm font-bold leading-tight transition-colors duration-200 ${
                        activeSection === step.id
                          ? 'text-indigo-600 font-extrabold'
                          : 'text-slate-450 hover:text-slate-800'
                      }`}>
                        {step.label}
                      </span>
                    </button>
                  ))}
                </div>

                <hr className="border-slate-100" />

                {/* Back to top button */}
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="w-full flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-2 text-sm font-extrabold text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition"
                >
                  위로 가기
                </button>
              </div>
            </aside>

          </div>

        </div>
      </main>
    </>
  );
}
