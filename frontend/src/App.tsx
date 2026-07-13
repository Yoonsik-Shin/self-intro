import { type FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  BookOpen,
  CalendarPlus,
  Code2,
  Database,
  Github,
  GraduationCap,
  Layers3,
  Moon,
  Search,
  Server,
  Sparkles,
  Trophy,
  Mail,
  Phone,
  MapPin,
  Award,
  User,
  Briefcase,
  ChevronRight,
  FileText,
  Send,
  Terminal,
  Cpu,
  Check,
  Download,
  ExternalLink,
  Sun,
  Printer
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
    accent: 'from-blue-500 to-indigo-500',
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
    accent: 'from-sky-500 to-blue-600',
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
    accent: 'from-purple-500 to-pink-500',
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
    accent: 'from-teal-400 to-emerald-600',
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
  },
  {
    id: 5,
    title: '[Microsoft] AI 엔지니어링 과정 (3기)',
    description: 'ML/DL 기초학습, Agentic AI 구축 (LangChain, LangGraph), RAG 구축, AI Azure 기반의 클라우드 엔지니어 학습 (600시간)',
    category: 'EDUCATION',
    skills: ['ML/DL', 'LangChain', 'LangGraph', 'RAG', 'Azure'],
    takeaway: 'Agentic AI와 RAG 아키텍처를 깊이 있게 다루고, 클라우드 환경에서 AI 인프라를 구축하고 운영하는 방법을 익혔습니다.',
    learnedAt: '2026-03-15'
  },
  {
    id: 6,
    title: '풀스택 프로젝트 실무과정 [청년취업사관학교]',
    description: 'TypeScript 기반 풀스택 교육으로 주로 JavaScript/TypeScript 언어에 대한 깊은 이해와 프레임워크 사용법 등을 학습 (265시간)',
    category: 'EDUCATION',
    skills: ['TypeScript', 'Node.js', 'React', 'Express'],
    takeaway: 'TypeScript와 React/Express 환경에서 웹 애플리케이션의 풀스택 개발 생태계와 협업 워크플로우를 체화했습니다.',
    learnedAt: '2023-10-31'
  },
  {
    id: 7,
    title: '정보처리기사 자격증 취득',
    description: 'IT 전반의 핵심 이론 및 기술 자격 검증 (한국산업인력공단)',
    category: 'CERTIFICATE',
    skills: ['Software Engineering', 'Database', 'Network'],
    takeaway: '개발 생명주기 전반에 걸친 기초 체력을 공인 자격을 통해 입증했습니다.',
    learnedAt: '2022-06-17'
  },
  {
    id: 8,
    title: 'SQL 개발자(SQLD) 자격 취득',
    description: '데이터베이스 모델링 및 SQL 작성 능력 검증 (등록번호: SQLD-054006969)',
    category: 'CERTIFICATE',
    skills: ['SQL', 'DB Modeling', 'Optimization'],
    takeaway: '데이터베이스를 단순히 저장소로 쓰는 것을 넘어 성능과 무결성을 고려하여 쿼리하고 모델링할 수 있음을 검증했습니다.',
    learnedAt: '2024-09-20'
  }
];

const categoryLabels = {
  ALL: '전체',
  PROJECT: '프로젝트',
  EDUCATION: '교육',
  CERTIFICATE: '자격',
} as const;

const iconByCategory = {
  PROJECT: Code2,
  EDUCATION: BookOpen,
  CERTIFICATE: Award,
} as const;

export function App() {
  const queryClient = useQueryClient();
  
  // Zustand 스토어 상태 연동
  const {
    selectedMilestoneId,
    activeCategory,
    activeMainTab,
    activeEssayTab,
    setSelectedMilestoneId,
    setActiveCategory,
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

  const { data: studyEntries, isLoading } = useQuery<StudyEntry[]>({
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

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-800 font-['Plus_Jakarta_Sans',Pretendard,sans-serif]">
      {/* Background Glow effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl print:hidden">
        <div className="mx-auto flex h-12 max-w-[1500px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-sm font-black text-white shadow-md shadow-blue-500/20">
              YS
            </div>
            <div>
              <span className="block text-sm font-black text-slate-800 tracking-wider">YOONSIK SHIN</span>
              <span className="block text-[10px] text-blue-600 font-bold uppercase tracking-widest">Fullstack Engineer</span>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              { id: 'INTRO', label: '경력 및 역량' },
              { id: 'PROJECTS', label: '핵심 프로젝트' },
              { id: 'THIS_APP', label: '이 웹앱의 아키텍처' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMainTab(tab.id as any)}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-all duration-200 ${
                  activeMainTab === tab.id
                    ? 'bg-blue-50 text-blue-600 border border-blue-200/50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="https://unbrdn.me"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>unbrdn.me</span>
            </a>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:from-blue-500 hover:to-blue-600 transition shadow-sm shadow-blue-500/20"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF 인쇄</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Layout */}
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        
        {/* General Career Summary Banner (Always Visible on Web) */}
        <div className="mb-8 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50/20 to-white p-6 relative overflow-hidden shadow-sm backdrop-blur-md print:hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full filter blur-[60px] -mr-20 -mt-20 pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-700">
                  <Sparkles className="h-3 w-3 text-indigo-500" />
                  Software Engineer Portfolio
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-700 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  실시간 아키텍처 및 콘텐츠 개선 중 (Refactoring)
                </span>
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-800">
                신윤식 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Fullstack & Backend Developer</span>
              </h1>
              <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">
                1년 11개월의 에듀테크 실무 백엔드 개발 경험과 Java/Spring Boot, MSA 및 Cloud 인프라 구축 지식을 기반으로 안정적이고 최적화된 아키텍처를 추구하는 엔지니어입니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-center min-w-[140px] shadow-sm">
                <span className="block text-[10px] uppercase font-bold text-slate-500">실무 경력</span>
                <span className="mt-1 block text-xs font-black text-slate-800">에듀테크 스타트업 1년 11개월</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-center min-w-[140px] shadow-sm">
                <span className="block text-[10px] uppercase font-bold text-slate-500">핵심 스택</span>
                <span className="mt-1 block text-xs font-black text-slate-800">Java / Node.js / Cloud</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[340px_1fr]">
          
          {/* LEFT SIDEBAR: Personal Information & Profile Card */}
          <aside className="space-y-6 print:hidden">
            {/* Profile Detail Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="relative h-24 w-24 overflow-hidden rounded-full ring-4 ring-blue-50 shadow-inner">
                  <div className="grid h-full w-full place-items-center bg-gradient-to-tr from-blue-600 to-indigo-500 text-3xl font-black text-white">
                    YS
                  </div>
                </div>
                <h2 className="mt-4 text-lg font-black text-slate-800">신윤식</h2>
                <p className="text-xs font-semibold text-slate-500 mt-1">Fullstack / Backend Developer</p>
                <div className="mt-3 flex justify-center gap-3">
                  <a
                    href="https://github.com"
                    target="_blank"
                    className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-slate-500 hover:text-slate-800 transition"
                  >
                    <Github className="h-4 w-4" />
                  </a>
                  <a
                    href="mailto:aaa946@naver.com"
                    className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-slate-500 hover:text-slate-800 transition"
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <hr className="my-6 border-slate-100" />

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 border border-slate-200 text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400">생년월일</span>
                    <span className="block font-bold text-slate-700 text-xs">1996. 05. 04 (만 30세)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 border border-slate-200 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400">이메일</span>
                    <span className="block font-bold text-slate-700 text-xs truncate">aaa946@naver.com</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 border border-slate-200 text-slate-500">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400">연락처</span>
                    <span className="block font-bold text-slate-700 text-xs">010-5171-0994</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 border border-slate-200 text-slate-500">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold text-slate-400">현주소</span>
                    <span className="block truncate font-bold text-slate-700 text-xs">
                      서울특별시
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 border border-slate-200 text-slate-500">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400">병역사항</span>
                    <span className="block font-bold text-slate-700 text-xs">군필 (공익근무요원 이병 소집해제)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-indigo-500" />
                학력 사항
              </h3>
              <div className="space-y-4">
                <div>
                  <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-100">
                    2016. 02 - 2022. 02
                  </span>
                  <p className="mt-1 text-sm font-black text-slate-700">차의과학대학교 (학사 졸업)</p>
                  <p className="text-xs text-slate-500">의약학계열 / 스포츠의학전공 (주전공)</p>
                  <p className="text-xs font-semibold text-emerald-600 mt-0.5">평점 3.81 / 4.5 (137학점 이수)</p>
                </div>
                <hr className="border-slate-100" />
                <div>
                  <span className="inline-flex rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200/50">
                    2012. 03 - 2015. 02
                  </span>
                  <p className="mt-1 text-sm font-black text-slate-700">경신고등학교</p>
                  <p className="text-xs text-slate-500">과학과 졸업</p>
                </div>
              </div>
            </div>

            {/* Career Summary Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-500" />
                직장 경력 (총 1년 11개월)
              </h3>
              <div>
                <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-100">
                  2023. 12 - 2025. 10
                </span>
                <p className="mt-1.5 text-sm font-black text-slate-700">에듀테크 스타트업 (정규직)</p>
                <p className="text-xs text-slate-500">개발팀 / 백엔드 엔지니어</p>
                <ul className="mt-2.5 space-y-1 text-xs text-slate-500 list-disc list-inside">
                  <li>AI 튜터링 및 학습 플랫폼 핵심 API 서버 개발</li>
                  <li>프론트엔드 중계용 BFF(Backend for Frontend) 서버 설계 및 구축</li>
                  <li>Spring Boot 기반 사내 무료체험 관리 백오피스 단독 구축</li>
                  <li>AWS 클라우드 인프라 및 CI/CD 배포 자동화 파이프라인 설계/운영</li>
                </ul>
              </div>
            </div>

            {/* Core Skills Summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-purple-500" />
                핵심 기술 스택
              </h3>
              <div className="space-y-3">
                {[
                  { name: 'Java', level: '중급', bg: 'bg-orange-50 text-orange-600 border border-orange-100' },
                  { name: 'TypeScript', level: '중급', bg: 'bg-blue-50 text-blue-600 border border-blue-100' },
                  { name: 'Python', level: '중급', bg: 'bg-yellow-50 text-yellow-600 border border-yellow-100' },
                ].map((skill) => (
                  <div key={skill.name} className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">{skill.name}</span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${skill.bg}`}>{skill.level}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                {['Spring Boot', 'JPA', 'QueryDSL', 'Node.js', 'FastAPI', 'Redis', 'Kafka', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'n8n'].map((item) => (
                  <span key={item} className="rounded bg-slate-50 border border-slate-200/50 px-2 py-1 text-[10px] font-bold text-slate-600">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </aside>

          {/* RIGHT CONTENT: Interactive Tabs */}
          <section className="space-y-6">
            
            {/* Mobile Navigation Tabs (visible only on mobile) */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 md:hidden print:hidden">
              {[
                { id: 'INTRO', label: '경력/역량' },
                { id: 'PROJECTS', label: '프로젝트' },
                { id: 'THIS_APP', label: '이 웹앱' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id as any)}
                  className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition ${
                    activeMainTab === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: COVER LETTER (자기소개서/역량기술서) */}
            {activeMainTab === 'INTRO' && (
              <div className="space-y-6 print:hidden">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-xl font-black text-slate-800">역량 기술서 (Core Competencies)</h2>
                      <p className="text-xs text-slate-500 mt-1">프로젝트 실무 및 취득 자격증에 기반한 기술 상세 명세입니다.</p>
                    </div>
                    
                    {/* Sub-tabs for Essay selection */}
                    <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                      <button
                        onClick={() => setActiveEssayTab('WHY')}
                        className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition-all ${
                          activeEssayTab === 'WHY'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        프로젝트 기술 적용 상세
                      </button>
                      <button
                        onClick={() => setActiveEssayTab('STRENGTH')}
                        className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition-all ${
                          activeEssayTab === 'STRENGTH'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        자격증 기반 기술 전문성
                      </button>
                    </div>
                  </div>

                  {/* Essay Display */}
                  <div className="mt-6 space-y-6">
                    {activeEssayTab === 'WHY' ? (
                      <div>
                        <h3 className="text-base font-black text-blue-600 mb-1">
                          {essays.WHY.title}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 italic mb-5">
                          "{essays.WHY.subtitle}"
                        </p>
                        <div className="space-y-4 text-sm text-slate-600 leading-relaxed font-normal">
                          {essays.WHY.paragraphs.map((p, idx) => (
                            <p key={idx} className="indent-2 bg-slate-50 hover:bg-slate-100/50 p-4 rounded-xl border border-slate-200/50 transition">
                              {p}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-base font-black text-indigo-600 mb-1">
                          {essays.STRENGTH.title}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 italic mb-5">
                          "{essays.STRENGTH.subtitle}"
                        </p>
                        <div className="space-y-6">
                          {essays.STRENGTH.strengths.map((str, idx) => (
                            <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 hover:border-blue-300 transition">
                              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                <span className="grid h-6 w-6 place-items-center rounded bg-blue-50 text-xs font-black text-blue-600 border border-blue-100">
                                  {idx + 1}
                                </span>
                                {str.title}
                              </h4>
                              <p className="mt-3 text-xs leading-relaxed text-slate-600 bg-white border border-slate-100 p-3.5 rounded-lg font-normal">
                                {str.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setActiveMainTab('PROJECTS')}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-500 transition"
                  >
                    <span>핵심 프로젝트 상세 대시보드 보기</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: INTERACTIVE PROJECTS (프로젝트 타임라인 대시보드) */}
            {activeMainTab === 'PROJECTS' && (
              <div className="space-y-6 print:hidden animate-fadeIn">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">핵심 프로젝트 포트폴리오</h2>
                    <p className="text-xs text-slate-500 mt-1">상세 항목을 클릭하시면 구체적인 담당 업무 및 성과가 동적으로 조회됩니다.</p>
                  </div>
                  
                  {/* Timeline Selection Grid */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {milestones.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMilestoneId(m.id)}
                        className={`rounded-xl border p-4 text-left transition-all relative ${
                          selectedMilestoneId === m.id
                            ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400">{m.period}</span>
                          {selectedMilestoneId === m.id && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <h4 className="mt-2 text-xs font-black text-slate-800 truncate">{m.label}</h4>
                        <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-snug">{m.body}</p>
                      </button>
                    ))}
                  </div>

                  {/* Selected Project Detailed Display Box */}
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-6 space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <span className="inline-flex rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-100">
                          {selectedMilestone.role} ({selectedMilestone.period})
                        </span>
                        <h3 className="mt-2 text-base font-black text-slate-800">
                          {selectedMilestone.title}
                        </h3>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">프로젝트 설명 및 담당 업무</h4>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600 bg-white border border-slate-100 p-4 rounded-xl font-normal">
                          {selectedMilestone.description}
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                        <h4 className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                          핵심 성과 & 배운 점 (Takeaway)
                        </h4>
                        <p className="mt-2 text-xs leading-relaxed text-emerald-800 font-semibold">
                          {selectedMilestone.takeaway}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">활용 기술 스택</h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedMilestone.skills.map((skill) => (
                            <span key={skill} className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2.5: THIS WEB APP ARCHITECTURE (이 웹앱 자체의 시스템 아키텍처) */}
            {activeMainTab === 'THIS_APP' && (
              <div className="space-y-6 print:hidden animate-fadeIn">
                <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <Terminal className="h-5 w-5 text-blue-600" />
                      이 포트폴리오 웹앱 자체의 시스템 아키텍처 (Self-Intro Architecture)
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      지금 접속해 계신 이 웹 서버를 구동하고 데이터를 서빙하는 풀스택 컨테이너 인프라 설계 명세입니다.
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                      <h3 className="text-sm font-black text-blue-600 flex items-center gap-2 mb-3">
                        <span className="p-1.5 rounded bg-blue-50">💻</span>
                        Backend Layer
                      </h3>
                      <ul className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
                        <li>
                          <strong className="text-slate-800">Java 21 & Spring Boot 3.3</strong> 기반의 안정적인 API 서비스 구축
                        </li>
                        <li>
                          <strong className="text-slate-800">Spring Data JPA</strong> 및 H2/MySQL 데이터베이스 통합 제어
                        </li>
                        <li>
                          <strong className="text-slate-800">Flyway 스키마 마이그레이션</strong>을 활용해 실행 시 DDL 데이터 자동 적재 및 버전 제어
                        </li>
                        <li>
                          <strong className="text-slate-800">SampleDataLoader</strong>를 통해 로컬/인메모리 시작 시 테스트용 개발 이력 시드 자동 세팅
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                      <h3 className="text-sm font-black text-emerald-600 flex items-center gap-2 mb-3">
                        <span className="p-1.5 rounded bg-emerald-50">🎨</span>
                        Frontend Layer
                      </h3>
                      <ul className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
                        <li>
                          <strong className="text-slate-800">React 19 & TypeScript & Vite</strong> 환경의 고성능 컴파일러 및 리플로우 최적화
                        </li>
                        <li>
                          <strong className="text-slate-800">Zustand & TanStack Query</strong>를 조합한 프론트 전역 상태 및 비동기 API 캐시 제어
                        </li>
                        <li>
                          <strong className="text-slate-800">Tailwind CSS (Vanilla CSS 폴백)</strong> 미드나잇 글래스모피즘 프리미엄 UI 디자인 테마
                        </li>
                        <li>
                          <strong className="text-slate-800">PDF 인쇄 미디어 쿼리</strong> 최적화로 브라우저 상의 인쇄 레이아웃 단일 이력서 규격화
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                      <h3 className="text-sm font-black text-amber-600 flex items-center gap-2 mb-3">
                        <span className="p-1.5 rounded bg-amber-50">🐳</span>
                        DevOps & Docker
                      </h3>
                      <ul className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
                        <li>
                          <strong className="text-slate-800">Docker Compose 오케스트레이션</strong>으로 DB-API-Nginx-Vite 환경 분리 가상화
                        </li>
                        <li>
                          <strong className="text-slate-800">실시간 HMR (자동 새로고침) 지원</strong>: Docker 볼륨 바인딩 및 익명 볼륨 설정으로 macOS의 빌드 바이너리 충돌 문제를 극복하고 폴링 감시(`usePolling: true`) 탑재
                        </li>
                        <li>
                          <strong className="text-slate-800">원클릭 관리자 스크립트</strong>: `./start-docker.sh` 및 `./start-local.sh` 제어를 통해 백그라운드 구동 및 PID 기반 안전 프로세스 종료 자동화
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 rounded-xl border border-slate-200 bg-slate-950 p-5">
                    <h3 className="text-sm font-black text-slate-100 mb-4">🖥️ 풀스택 가상화 아키텍처 흐름도</h3>
                    <div className="text-xs font-mono text-slate-300 bg-slate-900 p-4 rounded-lg leading-relaxed whitespace-pre overflow-x-auto border border-slate-850">
{` +------------------------------------------------------------------------------------+
 |                                  Host Machine (Mac OS)                             |
 |                                                                                    |
 |  [ Client Web Browser ]                                                            |
 |           |                                                                        |
 |           | Port 5173 (Vite HMR WebSocket / Static Server)                         |
 |           v                                                                        |
 |  +------------------------------------------------------------------------------+  |
 |  |                       Docker Compose Bridge Network                          |  |
 |  |                                                                              |  |
 |  |  [ self-intro-frontend (Node 20 Alpine) ]                                    |  |
 |  |    - Runs: vite --host 0.0.0.0 (Vite Dev Server)                             |  |
 |  |    - Volume Mount: ./frontend -> /app (with usePolling: true)                |  |
 |  |         |                                                                    |  |
 |  |         | Proxies /api requests to http://backend:8080                       |  |
 |  |         v                                                                    |  |
 |  |  [ self-intro-backend (Spring Boot 3.3) ]                                    |  |
 |  |    - Runs: Java 21 app.jar                                                   |  |
 |  |    - Profiles: local-docker (Flyway Database Schema Initialization)         |  |
 |  |         |                                                                    |  |
 |  |         | Port 3306 (MySQL Driver Connection)                                |  |
 |  |         v                                                                    |  |
 |  |  [ self-intro-db (MySQL 8.0) ]                                               |  |
 |  |    - Volume Mount: mysql_data -> /var/lib/mysql                              |  |
 |  |                                                                              |  |
 |  +------------------------------------------------------------------------------+  |
 +------------------------------------------------------------------------------------+`}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: STUDY ARCHIVE & CREATE (학습 기록 목록 및 등록) */}
            {activeMainTab === 'ARCHIVE' && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr] print:hidden">
                
                {/* Left: Interactive Archive Search & List */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-black text-slate-800">학습 아카이브</h2>
                      <p className="text-xs text-slate-500 mt-0.5">교육과정, 프로젝트, 자격증 취득 상세 정보</p>
                    </div>
                    
                    {/* Category Filter buttons */}
                    <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200">
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setActiveCategory(key as any)}
                          className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                            activeCategory === key
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search box */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="학습 내역, 기술 스택, 키워드 검색..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-inner"
                    />
                  </div>

                  {/* Grid Table display */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                          <th className="px-4 py-3">분류</th>
                          <th className="px-4 py-3">내용 및 기술 정보</th>
                          <th className="px-4 py-3 text-right">날짜</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-12 text-center text-slate-400">
                              데이터 로드 중...
                            </td>
                          </tr>
                        ) : filteredEntries.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-12 text-center text-slate-400">
                              검색 결과가 없습니다.
                            </td>
                          </tr>
                        ) : (
                          filteredEntries.map((entry) => {
                            const IconComp = iconByCategory[entry.category as keyof typeof iconByCategory] || Code2;
                            return (
                              <tr key={entry.id} className="hover:bg-slate-50/50 border-b border-slate-100 text-slate-700 transition">
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 border border-slate-200/50">
                                    <IconComp className="h-3 w-3" />
                                    {categoryLabels[entry.category as keyof typeof categoryLabels]}
                                  </span>
                                </td>
                                <td className="px-4 py-4 space-y-1">
                                  <p className="font-bold text-slate-800 text-sm">{entry.title}</p>
                                  <p className="text-slate-500 text-xs leading-relaxed font-normal">{entry.description}</p>
                                  {entry.takeaway && (
                                    <p className="text-[11px] text-emerald-600 font-medium leading-relaxed">
                                      성과: {entry.takeaway}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap gap-1 pt-1.5">
                                    {entry.skills.map((skill) => (
                                      <span key={skill} className="rounded bg-slate-50 border border-slate-200/50 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-right whitespace-nowrap text-slate-400 text-[10px]">
                                  {entry.learnedAt}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right: Add New Entry Form */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 h-fit">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">이력 정보 추가</h2>
                    <p className="text-xs text-slate-500 mt-0.5">새로운 경력, 자격증, 교육 내역을 데이터베이스에 실시간으로 적재합니다.</p>
                  </div>
                  
                  <form onSubmit={submitStudyEntry} className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600">분류</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-inner"
                      >
                        <option value="PROJECT">프로젝트</option>
                        <option value="EDUCATION">교육</option>
                        <option value="CERTIFICATE">자격증</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600">제목</label>
                      <input
                        type="text"
                        required
                        placeholder="예: 정보처리기사 자격 취득, BFF NestJS 서버 구축"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-inner"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600">상세 설명</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="프로젝트 핵심 설계나 자격 내용 기술..."
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-inner resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600">주요 스택 (콤마 구분)</label>
                      <input
                        type="text"
                        placeholder="예: Java, Spring Boot, JPA, QueryDSL"
                        value={form.skills}
                        onChange={(e) => setForm({ ...form, skills: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-inner"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600">성과 및 배운 점 (Takeaway)</label>
                      <input
                        type="text"
                        placeholder="예: N+1 문제를 방지하여 조회 성능 200% 증가"
                        value={form.takeaway || ''}
                        onChange={(e) => setForm({ ...form, takeaway: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-inner"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600">취득/완료 날짜</label>
                      <input
                        type="date"
                        required
                        value={form.learnedAt}
                        onChange={(e) => setForm({ ...form, learnedAt: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-inner"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3 font-bold text-white hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 transition shadow-md shadow-blue-500/20"
                    >
                      <Send className="h-4 w-4" />
                      <span>{createMutation.isPending ? '등록 중...' : '데이터베이스 적재'}</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* PRINT ONLY A4 SHEET (인쇄 모드 시 브라우저에서 A4 1페이지 출력용 레이아웃) */}
            <div id="a4-sheet-container" className="hidden print:block w-full">
              <div className="mx-auto border border-slate-300 bg-white p-[20mm] w-[210mm] h-[297mm] shadow-inner text-slate-800 font-sans leading-normal">
                <article id="a4-sheet" className="h-full flex flex-col justify-between">
                  
                  {/* Document Header */}
                  <div className="space-y-5">
                    <div className="border-b-2 border-slate-800 pb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-blue-800 tracking-widest uppercase">Software Engineer Profile</p>
                          <h1 className="text-3xl font-black tracking-tight text-slate-900 mt-1">신 윤 식</h1>
                          <p className="text-sm font-bold text-slate-600 mt-1">Fullstack / Backend Developer</p>
                        </div>
                        <div className="text-right text-[11px] text-slate-500 space-y-0.5">
                          <p>aaa946@naver.com</p>
                          <p>010-5171-0994</p>
                          <p>서울특별시</p>
                        </div>
                      </div>

                      {/* Primary Choice indicator */}
                      <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold">
                        <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                          실무 경력: 1년 11개월 (Node.js 백엔드)
                        </span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          Java / Spring Boot / QueryDSL
                        </span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          AWS & Cloud Infrastructure
                        </span>
                      </div>
                    </div>

                    {/* Section 1: Academics & Info */}
                    <div className="grid grid-cols-2 gap-6 text-xs">
                      <div>
                        <h3 className="font-bold border-b border-slate-300 pb-1 text-slate-800 uppercase tracking-wider">학력 및 인적 사항</h3>
                        <ul className="mt-2 space-y-1.5 text-slate-700">
                          <li>
                            <span className="font-bold">차의과학대학교</span> (학사 졸업)
                            <span className="block text-[11px] text-slate-500">스포츠의학전공 | 평점 3.81/4.5 (137학점)</span>
                          </li>
                          <li>
                            <span className="font-bold">경신고등학교</span> (과학과 졸업)
                          </li>
                          <li>
                            <span className="font-bold">병역:</span> 공익근무요원 (육군이병 소집해제)
                          </li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-bold border-b border-slate-300 pb-1 text-slate-800 uppercase tracking-wider">자격증 사항</h3>
                        <ul className="mt-2 space-y-1.5 text-slate-700">
                          <li>
                            <span className="font-bold">정보처리기사</span> (한국산업인력공단)
                            <span className="block text-[10px] text-slate-400">취득일: 2022. 06. 17</span>
                          </li>
                          <li>
                            <span className="font-bold">SQL 개발자(SQLD)</span> (한국데이터산업진흥원)
                            <span className="block text-[10px] text-slate-400">취득일: 2024. 09. 20</span>
                          </li>
                          <li>
                            <span className="font-bold">빅데이터분석기사</span> (한국데이터산업진흥원)
                            <span className="block text-[10px] text-slate-400">취득일: 2022. 07. 15</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Section 2: Core Project Detail (Dynamic binding) */}
                    <div>
                      <h3 className="font-bold border-b border-slate-300 pb-1 text-xs text-slate-800 uppercase tracking-wider">핵심 프로젝트 개발 성과</h3>
                      <div className="mt-2.5 border border-slate-200 bg-slate-50/50 p-4 rounded-xl">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-xs text-slate-900">{selectedMilestone.title}</span>
                          <span className="text-[10px] font-bold text-slate-400">{selectedMilestone.period}</span>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-600 leading-relaxed font-normal">
                          {selectedMilestone.description}
                        </p>
                        <p className="mt-2 text-[11px] text-emerald-800 font-semibold">
                          Takeaway: {selectedMilestone.takeaway}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {selectedMilestone.skills.map(skill => (
                            <span key={skill} className="bg-slate-200/80 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Professional Focus / COVER LETTER SUMMARY */}
                    <div>
                      <h3 className="font-bold border-b border-slate-300 pb-1 text-xs text-slate-800 uppercase tracking-wider">개발 철학 및 핵심 역량 요약</h3>
                      <div className="mt-2 space-y-2 text-[11px] text-slate-700 leading-relaxed">
                        <p className="font-normal">
                          <span className="font-bold text-slate-800">1. 관심사 분리와 결합도 개선:</span> 서비스 규모 확장 시 안정성을 확보하기 위해 도메인 경계를 명확히 나누고 Read/Write 데이터 의존성을 격리하는 유연한 아키텍처 설계를 지향합니다.
                        </p>
                        <p className="font-normal">
                          <span className="font-bold text-slate-800">2. 엔터프라이즈 역량과 풀스택 시야:</span> 1년 11개월의 Node.js/AWS 실무 경력 외에 Java, Spring Boot, JPA, QueryDSL 생태계를 체화하고 Kubernetes 환경과 Redis/Kafka 메시지 대기열을 제어할 수 있는 실행력을 갖추고 있습니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Document Footer */}
                  <div className="border-t border-slate-300 pt-3 flex justify-between items-center text-[10px] text-slate-400">
                    <span>신윤식 개발자 포트폴리오 요약본 (Resume Summary)</span>
                    <span>Page 01 / 01</span>
                  </div>
                </article>
              </div>
            </div>

          </section>
        </div>

      </div>
    </main>
  );
}
