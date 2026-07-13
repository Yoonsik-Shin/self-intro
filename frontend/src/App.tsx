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
    label: 'CS 처리 프로세스 개선',
    period: '2026.06 - 2026.07',
    title: '생성형 AI CS 시스템 풀스택 개발 (기여도 100%)',
    body: 'n8n 자동 수집, Playwright 네이버 로그인, PII 암호화, Grafana 모니터링 환경을 구축했습니다.',
    accent: 'from-blue-500 to-indigo-500',
    skills: ['n8n', 'Playwright', 'Node.js', 'React', 'PII Encryption', 'Grafana', 'Docker'],
    role: 'Fullstack Developer',
    description: '네이버 카페 등의 고객 문의 수집·관리 CS 시스템을 생성형 AI를 활용해 풀스택 개발했습니다. n8n으로 데이터를 자동 수집해 DB에 적재하고, 웹 콘솔에서 문의 상태·이력을 관리합니다. Playwright 네이버 세션 자동 로그인, PII 암호화, RBAC 인증, Grafana 모니터링을 포함한 컨테이너 기반 운영 환경을 구축했습니다. (발주처/근무처: 런데이, 청년일경험)',
    takeaway: '고객 문의 수집부터 처리까지의 워크플로우를 자동화하여 운영 생산성을 높이고, PII 암호화 및 RBAC 권한 관리를 통해 실운영 수준의 안정성을 확보했습니다.'
  },
  {
    id: 'project2',
    label: 'Azure 로그 비용 자동진단 SaaS',
    period: '2026.03 - 2026.06',
    title: 'Teams 챗봇형 로그 진단 SaaS 개발 (기여도 70%)',
    body: 'Azure Functions 비용 누수 자동 진단, FastAPI/Cosmos DB 백엔드, OpenAI 처방을 연동했습니다.',
    accent: 'from-sky-400 to-blue-600',
    skills: ['Azure Functions', 'FastAPI', 'Cosmos DB', 'Azure OpenAI', 'Bicep', 'IaC'],
    role: 'Fullstack & Cloud Developer',
    description: 'Azure 로그 비용 폭증과 모니터링 사각지대를 해결하고자 Teams 챗봇형 로그 진단 SaaS를 기획부터 구축까지 주도 개발했습니다. 탐지·예방·필터·보존 4대 엔진이 Azure Functions 에이전트로 비용 누수를 자동 진단하고, FastAPI·Cosmos DB 백엔드, Azure OpenAI 처방, Bicep 최소권한 IaC를 구축했습니다. (Microsoft AI 엔지니어링 과정 팀프로젝트)',
    takeaway: '클라우드 자원 비용을 실시간으로 감시하고 에이전트 기반으로 자동 진단하는 파이프라인을 구축하며 클라우드 아키텍처와 IaC 배포 자동화를 체득했습니다.'
  },
  {
    id: 'project3',
    label: 'AI 실시간 모의면접 플랫폼',
    period: '2025.12 - 2026.03',
    title: '음성 스트리밍 및 RAG 면접 관리 (기여도 100%)',
    body: 'gRPC/Redis/Kafka 기반 실시간 음성 스트리밍, 이력서 RAG 질문 생성 서비스를 설계했습니다.',
    accent: 'from-purple-500 to-pink-500',
    skills: ['React', 'gRPC', 'Redis', 'Kafka', 'LLM/STT/TTS', 'RAG', 'Kubernetes'],
    role: 'Core Architect & Developer',
    description: '실시간 AI 모의면접 서비스의 프론트엔드, BFF, Core, Socket, LLM/STT/TTS, 배포 인프라를 개발했습니다. gRPC/Redis/Kafka 기반 음성 스트리밍, 이력서 RAG 질문 생성, 면접 상태 관리와 리포트 기능을 구현했습니다. (개인 프로젝트)',
    takeaway: '비동기 메시징 및 음성 스트리밍에서 발생할 수 있는 지연과 유실을 제어하고, 생성형 AI를 실무에 녹여내는 아키텍처를 설계하는 실행력을 길렀습니다.'
  },
  {
    id: 'project4',
    label: '무료체험 신청·관리 백오피스',
    period: '2025.05 - 2025.07',
    title: '신청 프로세스 백엔드 및 인프라 (기여도 40%)',
    body: 'Spring Boot API 서버, 유입 추적, 카카오 알림톡, Redis 세션, Docker/Nginx 인프라를 구축했습니다.',
    accent: 'from-teal-400 to-emerald-600',
    skills: ['Spring Boot', 'JPA', 'Redis', 'Docker', 'Nginx', 'Grafana', 'MySQL'],
    role: 'Backend & DevOps Engineer',
    description: '사내 무료체험 신청 프로세스 개선을 위해 자발적으로 결성한 TF에서 백엔드 전체를 담당. Spring Boot API 서버, 유입경로 추적, 카카오 알림톡 연동, Redis 세션 인증을 구현하고 Docker·Nginx·MySQL·Grafana로 배포·모니터링 인프라 구축. (수심달 사내 TF)',
    takeaway: '타 부서와의 유기적인 협업을 주도하고, Spring Boot 백엔드 파이프라인부터 모니터링 대시보드까지 주도적으로 구축해 서비스 유입 및 장애 파악 시간을 단축했습니다.'
  }
];

const essays = {
  WHY: {
    title: '1. 커리어 목표 및 발전 계획',
    subtitle: '시스템의 효율성 극대화와 결합도 개선을 목표로 하는 백엔드 엔지니어링 성장 계획입니다.',
    paragraphs: [
      `제가 백엔드 엔지니어로서 가장 큰 보람을 느끼는 부분은, 거대한 조직의 업무 효율을 책임지는 협업 시스템 및 플랫폼 서비스를 발전시키는 것입니다. 이전 프로젝트에서 흩어진 CS 데이터를 일원화하고 워크플로우를 자동화한 경험이 있습니다. 분산된 환경을 하나로 연결하자, 팀원들이 단순 취합에서 벗어나 핵심 업무에 집중하는 실질적인 생산성 향상을 확인했습니다. 조직의 일하는 방식을 개선하는 대규모 엔터프라이즈 환경이야말로, 제가 시스템 효율화에 대해 배운 역량을 가장 가치 있게 발휘할 곳이라 생각합니다.`,
      `수많은 사내 시스템이 연동되는 대규모 서비스 환경에서는, 작은 기능 변경이 전체 서비스의 장애로 이어지지 않도록 결합도를 낮추는 설계가 무엇보다 중요합니다. 이전 서비스 개발 당시, 학생과 교사 로직이 강하게 결합된 단일 서버에서 하나의 수정이 예기치 않은 오류를 발생시키는 문제를 겪었습니다. 이를 해결하고자 모듈을 명확히 분리하고, Read와 Write 로직을 나누어 데이터의 의존성을 끊어냈습니다. 이 과정을 통해 시스템 규모가 커질수록 도메인 경계를 나누고 유연하게 설계해야 본질적인 안정성을 확보할 수 있음을 깨달았습니다. 이러한 구조적 개선 경험은 서비스 간 결합도를 낮추고 대규모 트래픽 분산 시스템에서 장애를 예방하는 데 실질적인 도움이 될 것입니다.`,
      `새로운 환경에 합류하면 팀의 도메인과 개발 표준을 빠르게 습득하겠습니다. 기존 비즈니스 로직에 영향을 주지 않는 안정적이고 보수적인 배포로 서비스 신뢰도를 지키겠습니다. 이후에는 이벤트 주도 아키텍처(EDA) 설계 경험을 살려 시스템 간 비동기 통신의 병목을 해소하고, 대규모 트래픽을 제어하는 분산 시스템 전문가로 성장하겠습니다. 장기적으로는 워크플로우 자동화 경험을 활용해 운영 업무를 효율화함으로써, 개발 조직과 사용자 모두가 핵심 업무에 몰입하도록 돕는 소프트웨어 엔지니어가 되겠습니다.`
    ]
  },
  STRENGTH: {
    title: '2. 직무 역량 강점 및 노력/경험',
    subtitle: '지원 직무와 관련하여 어떠한 역량을(지식/기술 등) 강점으로 가지고 있는지, 그 역량을 갖추기 위해 무슨 노력과 경험을 했는지 구체적으로 작성해주시기 바랍니다. (경험 기반)',
    strengths: [
      {
        title: '객체지향 설계와 구조적 고민: 확장을 대비하는 주도적 학습',
        content: '첫 번째 강점은 당장의 기능 구현에 머물지 않고, 시스템 확장을 고려하여 구조적 설계를 고민하고 학습하는 태도입니다. 약 1년 11개월간 TypeScript 기반 백엔드 실무를 수행하며, 서비스가 커짐에 따라 단일 서버 내 로직이 복잡해지는 상황을 마주했습니다. 더 나은 구조에 대한 갈증을 느끼고 객체지향 패러다임과 도메인 주도 설계, 디자인 패턴을 개인적으로 꾸준히 학습했습니다. 배운 내용을 바탕으로 실무 코드의 비즈니스 로직 경계를 나누고 재사용성을 높이는 리팩토링을 점진적으로 시도했습니다. 또한 AWS 인프라를 운영하며, 장기적인 관점에서 현재의 모놀리식 시스템을 마이크로서비스 아키처로 전환한다면 어떤 구조가 적합할지 스스로 분리 기준을 세워보고 아키텍처를 스케치해 보는 등 차세대 시스템에 대한 학습을 이어갔습니다.'
      },
      {
        title: 'Java/Spring 생태계 체화와 풀스택 개발을 통한 시야 확장',
        content: '두 번째 강점은 엔터프라이즈 표준 기술에 대한 높은 이해도와, 전체 데이터 흐름을 파악할 수 있는 풀스택 개발 경험입니다. 특정 언어에 갇히지 않고 견고한 백엔드 생태계를 익히고자 Java와 Spring Boot를 주도적으로 학습했습니다. 이론적 학습에 그치지 않고 이를 \'청년일경험\' 프로젝트에 적용하여 풀스택 개발을 수행했습니다. 백엔드 구성 시 PostgreSQL과 Spring-Data-JPA, QueryDSL을 활용해 복잡한 동적 쿼리 작성법을 익히고 타입 안정성을 확보하는 훈련을 거쳤습니다. 프론트엔드 UI를 직접 연동하고 백엔드 파이프라인까지 구축해 보며, 클라이언트의 요청이 서버를 거쳐 데이터베이스에 도달하고 반환되는 전체 흐름을 매끄럽게 통제하는 시야를 길렀습니다.'
      },
      {
        title: '분산 환경에 대한 호기심: 관심사 분리와 비동기 통신 실험',
        content: '세 번째 강점은 최신 도구를 활용해 생산성을 높이고, 실무에서 겪어보지 못한 대규모 분산 시스템의 구조를 직접 실험하며 습득하는 실행력입니다. 대규모 트래픽과 분산 아키텍처에 대한 학습 욕구를 해소하기 위해 개인 프로젝트를 진행했습니다. 생성형 AI 개발 툴을 적극 활용하여 단순 코드 작성 시간을 대폭 단축하고, 절감된 시간을 분산 시스템의 아키텍처 고민에 투자했습니다. Oracle OKE(k8s) 환경에 서비스를 배포해 보며, 각 서버의 역할과 관심사 분리(SoC)를 명확히 하고 독립적인 데이터 상태 관리를 구현해 보고자 노력했습니다. 나아가 서비스 간 통신에서 발생할 수 있는 지연과 데이터 유실 문제를 방지하기 위해 Redis Streams와 Kafka를 도입했습니다. 이를 통해 비동기 메시징 기반의 파이프라인을 직접 구축해 보며 안정적인 트래픽 제어 방법을 체득했습니다.'
      }
    ]
  }
};

const fallbackEntries: StudyEntry[] = [
  {
    id: 1,
    title: 'CS 처리 프로세스 개선 [청년일경험]',
    description: '네이버 카페 등의 고객 문의 수집·관리 CS 시스템을 생성형 AI를 활용해 풀스택 개발했습니다. n8n으로 데이터를 자동 수집해 DB에 적재하고, 웹 콘솔에서 문의 상태·이력을 관리합니다. Playwright 네이버 세션 자동 로그인, PII 암호화, RBAC 인증, Grafana 모니터링을 포함한 컨테이너 기반 운영 환경을 구축했습니다.',
    category: 'PROJECT',
    skills: ['n8n', 'Playwright', 'Node.js', 'React', 'PII Encryption', 'RBAC', 'Grafana', 'Docker'],
    takeaway: '고객 문의 수집부터 처리까지의 워크플로우를 자동화하여 운영 생산성을 높이고, PII 암호화 및 RBAC 권한 관리를 통해 실운영 수준의 안정성을 확보했습니다.',
    learnedAt: '2026-07-01'
  },
  {
    id: 2,
    title: 'Azure 로그 비용 자동진단 SaaS [교육과정 팀프로젝트]',
    description: 'Azure 로그 비용 폭증과 모니터링 사각지대를 해결하고자 Teams 챗봇형 로그 진단 SaaS를 기획부터 구축까지 주도 개발했습니다. 탐지·예방·필터·보존 4대 엔진이 Azure Functions 에이전트로 비용 누수를 자동 진단하고, FastAPI·Cosmos DB 백엔드, Azure OpenAI 처방, Bicep 최소권한 IaC를 구축했습니다.',
    category: 'PROJECT',
    skills: ['Azure Functions', 'FastAPI', 'Cosmos DB', 'Azure OpenAI', 'Bicep', 'IaC'],
    takeaway: '클라우드 자원 비용을 실시간으로 감시하고 에이전트 기반으로 자동 진단하는 파이프라인을 구축하며 클라우드 아키텍처와 IaC 배포 자동화를 체득했습니다.',
    learnedAt: '2026-06-01'
  },
  {
    id: 3,
    title: 'AI 기반 실시간 모의면접 플랫폼 [개인프로젝트]',
    description: '실시간 AI 모의면접 서비스의 프론트엔드, BFF, Core, Socket, LLM/STT/TTS, 배포 인프라를 개발했습니다. gRPC/Redis/Kafka 기반 음성 스트리밍, 이력서 RAG 질문 생성, 면접 상태 관리와 리포트 기능을 구현했습니다.',
    category: 'PROJECT',
    skills: ['React', 'gRPC', 'Redis', 'Kafka', 'LLM', 'STT/TTS', 'RAG', 'Kubernetes'],
    takeaway: '비동기 메시징 및 음성 스트리밍에서 발생할 수 있는 지연과 유실을 제어하고, 생성형 AI를 실무에 녹여내는 아키텍처를 설계하는 실행력을 길렀습니다.',
    learnedAt: '2026-03-01'
  },
  {
    id: 4,
    title: '무료체험 신청·관리 백오피스 시스템 구축 [사내 TF]',
    description: '사내 무료체험 신청 프로세스 개선을 위해 자발적으로 결성한 TF에서 백엔드 전체를 담당. Spring Boot API 서버, 유입경로 추적, 카카오 알림톡 연동, Redis 세션 인증을 구현하고 Docker·Nginx·MySQL·Grafana로 배포·모니터링 인프라 구축.',
    category: 'PROJECT',
    skills: ['Spring Boot', 'JPA', 'Redis', 'Docker', 'Nginx', 'Grafana', 'MySQL'],
    takeaway: '타 부서와의 유기적인 협업을 주도하고, Spring Boot 백엔드 파이프라인부터 모니터링 대시보드까지 주도적으로 구축해 서비스 유입 및 장애 파악 시간을 단축했습니다.',
    learnedAt: '2025-07-01'
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
    description: 'IT 전반의 핵심 이론 및 기술 자격 검증 (한국산업인력공단 등록번호: 22201020696L)',
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
  EDUCATION: GraduationCap,
  CERTIFICATE: Trophy,
};

export function App() {
  const queryClient = useQueryClient();
  
  // Zustand States
  const {
    activeCategory,
    selectedMilestoneId,
    activeMainTab,
    activeEssayTab,
    setActiveCategory,
    setSelectedMilestoneId,
    setActiveMainTab,
    setActiveEssayTab
  } = useIntroStore();

  // Local States
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState<CreateStudyEntryRequest>({
    title: '',
    description: '',
    category: 'PROJECT',
    skills: '',
    takeaway: '',
    learnedAt: new Date().toISOString().slice(0, 10),
  });

  // Selected Milestone Project
  const selectedMilestone = milestones.find((milestone) => milestone.id === selectedMilestoneId) ?? milestones[0];

  // Fetch entries from Backend API
  const { data, isError, isLoading } = useQuery({
    queryKey: ['study-entries', activeCategory],
    queryFn: () => studyApi.list(activeCategory),
  });

  const entries = data ?? fallbackEntries;

  // Filter based on selectedCategory AND searchQuery
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesCategory = activeCategory === 'ALL' || entry.category === activeCategory;
      const matchesSearch =
        searchQuery === '' ||
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.takeaway.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [entries, activeCategory, searchQuery]);

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: studyApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-entries'] });
      setForm({
        title: '',
        description: '',
        category: 'PROJECT',
        skills: '',
        takeaway: '',
        learnedAt: new Date().toISOString().slice(0, 10),
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
    <main className="min-h-screen bg-[#070b12] text-slate-100 font-['Plus_Jakarta_Sans',Pretendard,sans-serif]">
      {/* Background Glow effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-900/10 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-emerald-900/5 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#080d17]/80 px-4 py-3 shadow-lg shadow-black/35 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex h-12 max-w-[1500px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 text-sm font-black text-white shadow-lg shadow-blue-950/40">
              YS
            </div>
            <div>
              <span className="block text-sm font-black text-white tracking-wider">YOONSIK SHIN</span>
              <span className="block text-[10px] text-blue-400 font-semibold uppercase tracking-widest">Fullstack Engineer</span>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              { id: 'INTRO', label: '자기소개서 & 정보' },
              { id: 'PROJECTS', label: '인터랙티브 포트폴리오' },
              { id: 'ARCHIVE', label: '학습 아카이브 & 등록' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMainTab(tab.id as any)}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-all duration-200 ${
                  activeMainTab === tab.id
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
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
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>unbrdn.me</span>
            </a>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:from-blue-500 hover:to-blue-600 transition shadow-sm shadow-blue-950/50"
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
        <div className="mb-8 rounded-2xl border border-blue-500/15 bg-gradient-to-r from-blue-950/20 via-blue-900/10 to-transparent p-6 relative overflow-hidden backdrop-blur-md print:hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full filter blur-[60px] -mr-20 -mt-20 pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 px-3 py-1 text-xs font-semibold text-blue-300">
                <Sparkles className="h-3 w-3 text-emerald-400" />
                Software Engineer Portfolio
              </span>
              <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white">
                신윤식 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Fullstack & Backend Developer</span>
              </h1>
              <p className="mt-2 text-sm text-slate-400 max-w-3xl leading-relaxed">
                1년 11개월의 Node.js/AWS 실무 경력과 Spring Boot, Kubernetes, 비동기 분산 메시징 파이프라인 실험 경험을 바탕으로, 안정적인 데이터 흐름을 설계하고 결합도를 개선하는 엔지니어입니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <div className="rounded-xl border border-white/5 bg-slate-900/50 px-4 py-3 text-center min-w-[140px]">
                <span className="block text-[10px] uppercase font-bold text-slate-500">실무 경력</span>
                <span className="mt-1 block text-xs font-black text-white">Node.js / AWS 1년 11개월</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-900/50 px-4 py-3 text-center min-w-[140px]">
                <span className="block text-[10px] uppercase font-bold text-slate-500">핵심 스택</span>
                <span className="mt-1 block text-xs font-black text-white">Java / Spring / Cloud</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[340px_1fr]">
          
          {/* LEFT SIDEBAR: Personal Information & Profile Card */}
          <aside className="space-y-6 print:hidden">
            {/* Profile Detail Card */}
            <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0c1220]/80 p-6 shadow-2xl backdrop-blur-md">
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />
              
              <div className="relative flex flex-col items-center text-center">
                {/* Glowing Avatar */}
                <div className="relative group">
                  <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 opacity-75 blur-sm transition duration-1000 group-hover:opacity-100" />
                  <div className="relative grid h-24 w-24 place-items-center rounded-full bg-[#0a0f1d] text-3xl font-black text-white">
                    YS
                  </div>
                </div>
                
                <h2 className="mt-4 text-xl font-black text-white">신윤식 (YOONSIK SHIN)</h2>
                <p className="text-xs font-bold text-blue-400 mt-1">Fullstack / Backend Developer</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                  <CalendarPlus className="h-3.5 w-3.5 text-slate-500" />
                  <span>1996. 05. 04 (만 30세)</span>
                </div>
              </div>

              <hr className="my-5 border-white/5" />

              {/* Personal Contact Details */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold text-slate-500">이메일</span>
                    <a href="mailto:aaa946@naver.com" className="block truncate font-bold text-slate-200 hover:text-blue-400 transition text-xs">
                      aaa946@naver.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-slate-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500">연락처</span>
                    <span className="block font-bold text-slate-200 text-xs">010-5171-0994</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-slate-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold text-slate-500">현주소</span>
                    <span className="block truncate font-bold text-slate-200 text-xs">
                      서울특별시
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500">병역사항</span>
                    <span className="block font-bold text-slate-200 text-xs">군필 (공익근무요원 이병 소집해제)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Card */}
            <div className="rounded-2xl border border-white/5 bg-[#0c1220]/80 p-6 shadow-2xl backdrop-blur-md">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-emerald-400" />
                학력 사항
              </h3>
              <div className="space-y-4">
                <div>
                  <span className="inline-flex rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                    2016. 02 - 2022. 02
                  </span>
                  <p className="mt-1 text-sm font-black text-slate-200">차의과학대학교 (학사 졸업)</p>
                  <p className="text-xs text-slate-400">의약학계열 / 스포츠의학전공 (주전공)</p>
                  <p className="text-xs font-semibold text-emerald-400 mt-0.5">평점 3.81 / 4.5 (137학점 이수)</p>
                </div>
                <hr className="border-white/5" />
                <div>
                  <span className="inline-flex rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                    2012. 03 - 2015. 02
                  </span>
                  <p className="mt-1 text-sm font-black text-slate-200">경신고등학교</p>
                  <p className="text-xs text-slate-400">과학과 졸업</p>
                </div>
              </div>
            </div>

            {/* Career Summary Card */}
            <div className="rounded-2xl border border-white/5 bg-[#0c1220]/80 p-6 shadow-2xl backdrop-blur-md">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-400" />
                직장 경력 (총 1년 11개월)
              </h3>
              <div>
                <span className="inline-flex rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  2023. 12 - 2025. 10
                </span>
                <p className="mt-1.5 text-sm font-black text-slate-200">수학에 심장을 달다 (정규직)</p>
                <p className="text-xs text-slate-400">개발팀 팀원 / Node.js 백엔드 엔지니어</p>
                <ul className="mt-2.5 space-y-1 text-xs text-slate-400 list-disc list-inside">
                  <li>중등 수학 학습 에듀테크 백엔드 개발</li>
                  <li>학생, 선생님, 시스템 관리자용 API</li>
                  <li>AWS 기반 서버 인프라 운영 관리</li>
                  <li className="text-[10px] text-slate-500 mt-1 italic list-none">퇴사사유: AI 기술 체화 및 학습 집중을 위한 퇴직</li>
                </ul>
              </div>
            </div>

            {/* Core Skills Summary */}
            <div className="rounded-2xl border border-white/5 bg-[#0c1220]/80 p-6 shadow-2xl backdrop-blur-md">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-purple-400" />
                핵심 기술 스택
              </h3>
              <div className="space-y-3">
                {[
                  { name: 'Java', level: '중급', bg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
                  { name: 'TypeScript', level: '중급', bg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
                  { name: 'Python', level: '중급', bg: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
                ].map((skill) => (
                  <div key={skill.name} className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-300">{skill.name}</span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${skill.bg}`}>{skill.level}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/5 pt-3">
                {['Spring Boot', 'JPA', 'QueryDSL', 'Node.js', 'FastAPI', 'Redis', 'Kafka', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'n8n'].map((item) => (
                  <span key={item} className="rounded bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-300">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </aside>

          {/* RIGHT CONTENT: Interactive Tabs (Cover Letters, Projects, Archive) */}
          <section className="space-y-6">
            
            {/* Mobile Navigation Tabs (visible only on mobile) */}
            <div className="flex rounded-xl bg-slate-900/50 p-1 border border-white/5 md:hidden print:hidden">
              {[
                { id: 'INTRO', label: '자기소개' },
                { id: 'PROJECTS', label: '포트폴리오' },
                { id: 'ARCHIVE', label: '학습로그' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id as any)}
                  className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition ${
                    activeMainTab === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: COVER LETTER (자기소개서) */}
            {activeMainTab === 'INTRO' && (
              <div className="space-y-6 print:hidden">
                <div className="rounded-2xl border border-white/5 bg-[#0c1220]/80 p-6 shadow-2xl backdrop-blur-md">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h2 className="text-xl font-black text-white">역량 기술서 (Core Competencies)</h2>
                      <p className="text-xs text-slate-400 mt-1">개발 철학 및 핵심 직무 강점 역량에 대한 상세 서술입니다.</p>
                    </div>
                    
                    {/* Sub-tabs for Essay selection */}
                    <div className="flex rounded-lg bg-slate-900/50 p-1 border border-white/5">
                      <button
                        onClick={() => setActiveEssayTab('WHY')}
                        className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition-all ${
                          activeEssayTab === 'WHY'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        지원 동기 & 커리어 계획
                      </button>
                      <button
                        onClick={() => setActiveEssayTab('STRENGTH')}
                        className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition-all ${
                          activeEssayTab === 'STRENGTH'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        직무 역량 강점
                      </button>
                    </div>
                  </div>

                  {/* Essay Display */}
                  <div className="mt-6 space-y-6">
                    {activeEssayTab === 'WHY' ? (
                      <div>
                        <h3 className="text-base font-black text-blue-400 mb-1">
                          {essays.WHY.title}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 italic mb-5">
                          "{essays.WHY.subtitle}"
                        </p>
                        <div className="space-y-4 text-sm text-slate-300 leading-relaxed font-normal">
                          {essays.WHY.paragraphs.map((p, idx) => (
                            <p key={idx} className="indent-2 bg-white/[0.01] hover:bg-white/[0.02] p-3 rounded-lg border border-white/[0.02] transition">
                              {p}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-base font-black text-emerald-400 mb-1">
                          {essays.STRENGTH.title}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 italic mb-5">
                          "{essays.STRENGTH.subtitle}"
                        </p>
                        <div className="space-y-6">
                          {essays.STRENGTH.strengths.map((str, idx) => (
                            <div key={idx} className="rounded-xl border border-white/5 bg-[#0e1526]/50 p-5 hover:border-blue-500/20 transition">
                              <h4 className="text-sm font-black text-white flex items-center gap-2">
                                <span className="grid h-6 w-6 place-items-center rounded bg-blue-500/10 text-xs font-black text-blue-400">
                                  {idx + 1}
                                </span>
                                {str.title}
                              </h4>
                              <p className="mt-3 text-xs leading-relaxed text-slate-300 bg-[#090d18] p-3.5 rounded-lg font-normal">
                                {str.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Action Link */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setActiveMainTab('PROJECTS')}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
                  >
                    <span>인터랙티브 프로젝트 포트폴리오 보기</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: PORTFOLIO (프로젝트 및 성장 기록) */}
            {activeMainTab === 'PROJECTS' && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[300px_1fr] print:hidden">
                {/* Milestones Sidebar */}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Projects Timeline</p>
                  <div className="space-y-2.5">
                    {milestones.map((m, index) => {
                      const isSelected = m.id === selectedMilestoneId;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMilestoneId(m.id)}
                          className={`w-full rounded-xl border p-4 text-left transition-all ${
                            isSelected
                              ? 'border-blue-500/30 bg-blue-600/[0.08] shadow-lg shadow-black/20'
                              : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'
                            }`}>
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <span className="block text-[10px] font-bold text-slate-500">{m.period}</span>
                              <span className="block text-sm font-black text-slate-200 mt-0.5 truncate">{m.label}</span>
                              <span className="block text-[11px] text-slate-400 mt-1 line-clamp-1">{m.role}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Project Detail Container */}
                <div className="rounded-2xl border border-white/5 bg-[#0c1220]/80 p-6 shadow-2xl backdrop-blur-md">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <span className="inline-flex rounded bg-blue-600/15 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                        {selectedMilestone.period}
                      </span>
                      <h2 className="mt-2 text-xl font-black text-white">{selectedMilestone.label}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{selectedMilestone.title}</p>
                    </div>
                    <div className="rounded bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300">
                      기여도 {selectedMilestone.id === 'project1' || selectedMilestone.id === 'project3' ? '100%' : selectedMilestone.id === 'project2' ? '70%' : '40%'}
                    </div>
                  </div>

                  <div className="mt-5 space-y-5">
                    {/* Description */}
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">프로젝트 개요</span>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300 bg-[#090d17] p-4 rounded-xl font-normal">
                        {selectedMilestone.description}
                      </p>
                    </div>

                    {/* Takeaway / Lesson learned */}
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">핵심 성과 & 배운 점 (Takeaway)</span>
                      <p className="mt-1 text-xs leading-relaxed text-emerald-300 bg-emerald-950/15 border border-emerald-500/10 p-4 rounded-xl font-normal">
                        {selectedMilestone.takeaway}
                      </p>
                    </div>

                    {/* Tech Stack */}
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">사용 기술 및 아키텍처 스택</span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedMilestone.skills.map((skill) => (
                          <span key={skill} className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-bold text-blue-300">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: STUDY ARCHIVE & CREATE (학습 기록 목록 및 등록) */}
            {activeMainTab === 'ARCHIVE' && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr] print:hidden">
                
                {/* Left: Interactive Archive Search & List */}
                <div className="rounded-2xl border border-white/5 bg-[#0c1220]/80 p-6 shadow-2xl backdrop-blur-md space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-black text-white">학습 아카이브</h2>
                      <p className="text-xs text-slate-400 mt-0.5">교육과정, 프로젝트, 자격증 취득 상세 정보</p>
                    </div>
                    
                    {/* Category Filter buttons */}
                    <div className="flex flex-wrap gap-1 rounded-lg bg-slate-900/50 p-1 border border-white/5">
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setActiveCategory(key as any)}
                          className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                            activeCategory === key
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Inner Search Box */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-white/5 bg-[#090d16] pl-10 pr-4 py-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50 transition placeholder:text-slate-600"
                      placeholder="프로젝트명, 교육 과정, 기술 키워드로 실시간 필터링..."
                    />
                  </div>

                  {/* Fetching statuses */}
                  {isLoading && <p className="text-center py-10 text-xs text-slate-500">API로부터 아카이브 데이터를 불러오는 중...</p>}
                  {isError && (
                    <div className="rounded-lg border border-yellow-500/15 bg-yellow-500/5 p-3 text-[11px] text-yellow-300 font-semibold leading-relaxed">
                      💡 백엔드 서버(API)에 연결되지 않아 로컬 목업 데이터를 표시 중입니다. 테스트를 위해 백엔드 포트(8080)를 실행하면 실제 DB 데이터가 로딩됩니다.
                    </div>
                  )}

                  {/* List View */}
                  <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1.5">
                    {filteredEntries.length === 0 ? (
                      <p className="text-center py-10 text-xs text-slate-600">검색 조건에 맞는 아카이브가 없습니다.</p>
                    ) : (
                      filteredEntries.map((entry) => {
                        const Icon = iconByCategory[entry.category] || Code2;
                        return (
                          <article key={entry.id} className="group rounded-xl border border-white/5 bg-slate-900/35 p-4.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/10 hover:bg-slate-900/60">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <span className="inline-flex rounded-md bg-white/5 px-2 py-0.5 text-[9px] font-bold text-slate-400">
                                  {entry.learnedAt}
                                </span>
                                <h3 className="mt-1 text-sm font-black text-white group-hover:text-blue-400 transition truncate">{entry.title}</h3>
                              </div>
                              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-slate-400 transition group-hover:bg-blue-600 group-hover:text-white">
                                <Icon className="h-4 w-4" />
                              </span>
                            </div>
                            <p className="mt-2.5 text-xs leading-relaxed text-slate-400 font-normal">{entry.description}</p>
                            <p className="mt-2 text-xs text-emerald-400/90 font-semibold bg-emerald-950/10 p-2 rounded border border-emerald-500/5">
                              📌 {entry.takeaway}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-1">
                              {entry.skills.map((skill) => (
                                <span key={skill} className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right: Registration Form */}
                <div className="rounded-2xl border border-white/5 bg-[#0c1220]/80 p-6 shadow-2xl backdrop-blur-md space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded bg-blue-600/10 text-blue-400">
                      <CalendarPlus className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">신규 이력/학습기록 등록</h3>
                      <p className="text-[10px] text-slate-500">데이터베이스에 즉각 저장 및 동기화됩니다.</p>
                    </div>
                  </div>

                  <form onSubmit={submitStudyEntry} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1.5">이름/학습제목</label>
                      <input
                        required
                        value={form.title}
                        onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                        className="w-full rounded-xl border border-white/5 bg-[#090d16] px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50 transition placeholder:text-slate-600"
                        placeholder="예: QueryDSL 기반 동적 다중 필터 구현"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5">카테고리</label>
                        <select
                          value={form.category}
                          onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as any }))}
                          className="w-full rounded-xl border border-white/5 bg-[#090d16] px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50 transition"
                        >
                          <option value="PROJECT">프로젝트 (PROJECT)</option>
                          <option value="EDUCATION">교육 (EDUCATION)</option>
                          <option value="CERTIFICATE">자격증 (CERTIFICATE)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5">날짜</label>
                        <input
                          required
                          type="date"
                          value={form.learnedAt}
                          onChange={(e) => setForm((prev) => ({ ...prev, learnedAt: e.target.value }))}
                          className="w-full rounded-xl border border-white/5 bg-[#090d16] px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1.5">기술 스택 (쉼표 구분)</label>
                      <input
                        required
                        value={form.skills}
                        onChange={(e) => setForm((prev) => ({ ...prev, skills: e.target.value }))}
                        className="w-full rounded-xl border border-white/5 bg-[#090d16] px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50 transition placeholder:text-slate-600"
                        placeholder="Java, Spring Boot, QueryDSL"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1.5">상세 내용 및 기여 사항</label>
                      <textarea
                        required
                        value={form.description}
                        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                        className="w-full rounded-xl border border-white/5 bg-[#090d16] px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50 transition min-h-[70px] placeholder:text-slate-600"
                        placeholder="수행 업무 또는 학습 내용을 구체적으로 기록해주세요."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1.5">성과 및 배운점 (Takeaway)</label>
                      <textarea
                        required
                        value={form.takeaway}
                        onChange={(e) => setForm((prev) => ({ ...prev, takeaway: e.target.value }))}
                        className="w-full rounded-xl border border-white/5 bg-[#090d16] px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50 transition min-h-[60px] placeholder:text-slate-600"
                        placeholder="이력을 통해 무엇을 개선했고 어떤 가치를 창출했는지 서술해주세요."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 text-xs transition disabled:opacity-50"
                    >
                      {createMutation.isPending ? '저장 처리 중...' : '새 아카이브 등록하기'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* LIVE A4 PRINT PREVIEW AREA (Always visible at the bottom of the web view, styled like a real document) */}
            <div className="mt-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-400" />
                    실시간 A4 이력서 및 요약본 프리뷰
                  </h3>
                  <p className="text-xs text-slate-400">우측 상단의 'PDF 인쇄' 버튼을 통해 본 프레임만 깔끔하게 PDF로 다운로드 및 프린트할 수 있습니다.</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-slate-900/50 px-3 py-1.5 text-xs text-slate-400">
                  규격: A4 (210mm x 297mm)
                </div>
              </div>

              {/* A4 Sheet Container */}
              <div id="a4-sheet-container" className="flex justify-center bg-slate-950/20 py-6 rounded-2xl border border-white/5 shadow-inner backdrop-blur-md">
                <article
                  id="a4-sheet"
                  data-testid="a4-sheet"
                  className="w-full max-w-[800px] aspect-[210/297] bg-[#fdfdfc] text-slate-900 p-8 sm:p-12 shadow-2xl flex flex-col justify-between overflow-hidden border border-slate-200 rounded-md font-sans"
                >
                  <div className="space-y-6">
                    {/* Header: Basic Details */}
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
                        <h3 className="font-bold border-b border-slate-300 pb-1 text-slate-800 uppercase tracking-wider">핵심 자격증</h3>
                        <ul className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                          <li>
                            <span className="font-bold block">정보처리기사</span>
                            <span className="text-[10px] text-slate-500">한국산업인력공단 (2022.06)</span>
                          </li>
                          <li>
                            <span className="font-bold block">SQL 개발자(SQLD)</span>
                            <span className="text-[10px] text-slate-500">한국데이터산업진흥원 (2024.09)</span>
                          </li>
                          <li>
                            <span className="font-bold block">빅데이터분석기사</span>
                            <span className="text-[10px] text-slate-500">한국데이터산업진흥원 (2022.07)</span>
                          </li>
                          <li>
                            <span className="font-bold block">컴퓨터활용 1급</span>
                            <span className="text-[10px] text-slate-500">대한상공회의소 (2018.11)</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Section 2: Projects Overview (Highlights selected milestone) */}
                    <div>
                      <h3 className="font-bold border-b border-slate-300 pb-1 text-xs text-slate-800 uppercase tracking-wider">
                        주요 프로젝트 요약 (선택 프로젝트: {selectedMilestone.label})
                      </h3>
                      
                      <div className="mt-3 p-3 bg-slate-50 rounded border border-slate-200/60">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold text-slate-800">{selectedMilestone.label}</span>
                            <span className="ml-2 text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-semibold">
                              {selectedMilestone.role} (기여도 {selectedMilestone.id === 'project1' || selectedMilestone.id === 'project3' ? '100%' : selectedMilestone.id === 'project2' ? '70%' : '40%'})
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">{selectedMilestone.period}</span>
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
