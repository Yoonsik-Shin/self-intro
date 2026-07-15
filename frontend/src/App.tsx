import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Printer,
  Briefcase,
  Cpu,
  Terminal,
  BookOpen,
  Github,
  Home,
  Mail,
  Menu,
  Phone,
  User,
  X,
  Calendar,
  ChevronDown,
  ArrowLeft,
  ExternalLink,
  FolderGit2,
  Award,
  GraduationCap,
  Eye,
  MessageCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { bffApi, connectionApi, studyApi, visitorApi, type Skill, type ExperienceDetail, type Experience, type IntroductionResponse, type RelatedExperience } from './lib/api';
import { useIntroStore } from './store/useIntroStore';
import { markdownComponents, resumeMarkdownComponents } from './lib/markdown';
import { SkillBadgeIcon } from './lib/SkillBadgeIcon';
import { navigate, pagePaths, pathForExperienceDetail, pathForStudy } from './lib/navigation';

const KAKAOPAY_DONATION_URL = 'https://qr.kakaopay.com/YOUR_CODE';

const milestones = [
  {
    id: 'project1',
    label: 'CS Test Bed',
    period: '2026.06 - 2026.07',
    title: '고객문의 수집·자동응답 통합 테스트베드 (기여도 100%)',
    body: 'n8n 자동 수집, Playwright 네이버 로그인, PII 암호화, Grafana 모니터링 환경을 구축했습니다.',
    skills: ['Java', 'Spring Boot', 'Spring Data JPA', 'Spring Security', 'QueryDSL', 'PostgreSQL', 'Flyway', 'React', 'Playwright', 'n8n', 'Nginx', 'Docker Compose', 'Grafana', 'Loki', 'Alloy'],
    role: 'Backend & DevOps Engineer',
    description: '고객 문의 수집·관리 및 브라우저 자동화(Playwright)와 노코드 n8n 워크플로우를 활용해 네이버 카페, 이메일 등의 문의 수작업 처리 과정을 자동화한 E2E 테스트베드 시스템입니다. DB 기반 RBAC 및 PII 암호화, Nginx auth_request 인증 계층과 Loki/Grafana/Alloy로 실시간 모니터링 환경을 구성했습니다.',
    takeaway: 'HMAC 인증 토큰과 Nginx auth_request를 활용해 내부 툴들의 보안 계층을 구축하고, n8n 분산 Lock 패턴과 무중단 개인정보(PII) 암호화 마이그레이션을 통해 운영 안정성을 하드닝했습니다.',
    tags: [] as string[]
  },
  {
    id: 'project2',
    label: 'LogDoctor (SaaS)',
    period: '2026.03 - 2026.06',
    title: 'Azure 클라우드 로그 비용 진단 및 최적화 SaaS (기여도 70%)',
    body: 'Azure Functions 비용 누수 자동 진단, FastAPI/Cosmos DB 백엔드, OpenAI 처방을 연동했습니다.',
    skills: ['Azure Functions', 'FastAPI', 'Cosmos DB', 'KQL', 'Azure Log Analytics', 'Azure OpenAI', 'Teams SDK', 'Bicep', 'Infrastructure as Code (IaC)'],
    role: 'Fullstack & Cloud Developer',
    description: 'Microsoft Azure LAW(Log Analytics Workspace) 요금 분석 및 비용 리스크를 진단하고 권장 진료 가이드를 발급하는 Microsoft Teams 전용 SaaS 솔루션입니다. 에이전트 기반 VM 연결 단절 탐지, 디버그 로그 폭증 추적, Azure OpenAI RAG 기반 맞춤 처방 제공, 로그 데이터 PII 마스킹 처리 등을 구축했습니다. (팀 프로젝트)',
    takeaway: '쓰기 권한을 제외한 최소 읽기 전용 권한(18개) 진단 체계로 인프라 보안 위험을 차단하고, LLM을 결합하여 비용 최적화를 자동 진단·안내하는 파이프라인을 체득했습니다.',
    tags: [] as string[]
  },
  {
    id: 'project3',
    label: 'AI 실시간 모의면접 플랫폼',
    period: '2025.12 - 2026.03',
    title: '음성 스트리밍 및 RAG 면접 관리 (기여도 100%)',
    body: 'gRPC/Redis/Kafka 기반 실시간 음성 스트리밍, 이력서 RAG 질문 생성 서비스를 설계했습니다.',
    skills: ['React', 'gRPC', 'Redis', 'Apache Kafka', 'LLM', 'STT/TTS', 'RAG', 'Kubernetes'],
    role: 'Core Architect & Developer',
    description: '실시간 AI 모의면접 및 역량 평가 서비스의 전체 시스템 아키텍처와 분산 메시징 처리 부분을 담당했습니다. gRPC 기반 실시간 음성 스트리밍 제어, Redis/Kafka 비동기 메시지 큐를 통한 음성 데이터 및 AI 상태 변경 큐잉, 이력서 RAG 질문 생성 기능 등을 구현하고 Kubernetes 환경에 배포했습니다. (개인 프로젝트)',
    takeaway: '비동기 메시징 및 대용량 음성 스트리밍 환경에서 발생할 수 있는 데이터 유실과 지연 병목을 제어하며 분산 인프라 설계 능력을 키웠습니다.',
    tags: [] as string[]
  },
  {
    id: 'project4',
    label: '에듀테크 플랫폼 핵심 서버/BFF',
    period: '2023.12 - 2025.10',
    title: '학습 플랫폼 핵심 API 및 BFF 구축 (기여도 43%)',
    body: 'AI 튜터 세션 모델 설계, 실시간 학생 Presence 추적, 백오피스 단독 구축을 총괄했습니다.',
    skills: ['Node.js', 'TypeScript', 'NestJS', 'Express', 'MongoDB', 'Redis', 'Spring Boot', 'Spring Data JPA', 'Spring Security', 'MySQL', 'AWS ECS', 'Amazon SQS', 'Docker', 'Datadog', 'GitHub Actions'],
    role: 'Backend & DevOps Engineer',
    description: '커리큘럼 기반 AI 학습 플랫폼의 핵심 Express API 서버와 NestJS 기반 BFF(Backend for Frontend) 서버를 부트스트랩하고 설계·개발을 전담했습니다. AI 튜터 메시징 대화 세션 모델 추상화 및 SQS 비동기 연동, 교사용 실시간 학생 관리(Presence) 모듈 설계, SubmittedProblem 도메인 CQRS 리팩토링 및 대형 마이그레이션을 총괄했습니다. Spring Boot 기반 백오피스 서비스도 1인 단독 구축하였습니다. (에듀테크 스타트업 실무 경력)',
    takeaway: '실무 서비스의 9,500여 개 커밋 중 약 43%를 담당한 최다 기여자로서 비즈니스 확장 시 도메인 관심사 격리, 성능 튜닝, 그리고 인프라 CI/CD 파이프라인 전반을 주도하는 리드 엔지니어로 성장했습니다.',
    tags: [] as string[]
  }
];

const pages = [
  {
    id: 'intro' as const,
    label: '메인페이지',
    shortLabel: '메인',
    description: '프로필, 경력, 프로젝트, 아키텍처',
    icon: Home,
  },
  {
    id: 'blog' as const,
    label: '공부 정리',
    shortLabel: '공부 정리',
    description: '기술 글, 학습 기록, 프로젝트 회고',
    icon: BookOpen,
  },
  {
    id: 'architecture' as const,
    label: '시스템 아키텍처',
    shortLabel: '시스템 아키텍처',
    description: '운영 인프라, 배포 흐름, 애플리케이션 구조',
    icon: Terminal,
  },
];

type PageId = (typeof pages)[number]['id'];

function getPageFromPath(pathname: string): PageId {
  if (pathname === '/architecture' || pathname.startsWith('/architecture/')) return 'architecture';
  if (pathname === '/study' || pathname.startsWith('/study/')) return 'blog';
  return 'intro';
}

function getStudySlugFromPath(pathname: string): string | null {
  const slug = pathname.match(/^\/study\/([^/]+)\/?$/)?.[1];
  if (!slug) return null;
  try {
    return decodeURIComponent(slug);
  } catch {
    return null;
  }
}

const mainSections = [
  { id: 'intro-profile', label: '프로필', icon: User },
  { id: 'timeline', label: '커리어 & 학습 타임라인', icon: Calendar },
  { id: 'skills', label: '기술 스택', icon: Cpu },
  { id: 'competencies', label: '핵심 역량', icon: Sparkles },
  { id: 'career', label: '직장 경력', icon: Briefcase },
  { id: 'credentials', label: '학력·교육 및 자격증', icon: GraduationCap },
  { id: 'projects', label: '핵심 프로젝트', icon: Briefcase },
];

const architectureSections = [
  { id: 'architecture-components', label: '구성 요소', icon: Cpu },
  { id: 'architecture-diagram', label: '배포 흐름도', icon: Terminal },
];

function getDisplayCategory(skill: Skill): string {
  const nameLower = skill.name.toLowerCase();
  if (nameLower.includes('react') || nameLower.includes('vue') || nameLower.includes('svelte') || nameLower.includes('html') || nameLower.includes('css')) {
    return 'Frontend';
  }
  if (skill.category === 'LANGUAGE' || skill.category === 'FRAMEWORK') {
    return 'Backend & Language';
  }
  if (skill.category === 'DATABASE') {
    return 'Database';
  }
  if (skill.category === 'DEVOPS') {
    return 'DevOps & Infra';
  }
  if (skill.category === 'AI_RAG') {
    return 'AI / RAG';
  }
  return 'Others';
}

const fallbackCoreSkills: Skill[] = [
  { id: -1, name: 'Java', category: 'LANGUAGE', skillLevel: '중급', skillVersion: '21', comment: 'Spring Boot 기반 백엔드 주력 언어', usageType: 'WORK_EXPERIENCE', isCore: true, displayOrder: 1 },
  { id: -2, name: 'TypeScript', category: 'LANGUAGE', skillLevel: '중급', skillVersion: '5', comment: 'NestJS, React 프로젝트에서 사용', usageType: 'WORK_EXPERIENCE', isCore: true, displayOrder: 2 },
  { id: -3, name: 'Spring Boot', category: 'FRAMEWORK', skillLevel: '중급', skillVersion: '3', comment: '백오피스 및 포트폴리오 API 구축', usageType: 'WORK_EXPERIENCE', isCore: true, displayOrder: 3 },
  { id: -4, name: 'React', category: 'FRAMEWORK', skillLevel: '중급', skillVersion: '19', comment: '관리자/포트폴리오 화면 구현', usageType: 'WORK_EXPERIENCE', isCore: true, displayOrder: 4 },
  { id: -5, name: 'Docker', category: 'DEVOPS', skillLevel: '중급', comment: '로컬/운영 컨테이너 환경 구성', usageType: 'PROJECT_USE', isCore: true, displayOrder: 5 },
  { id: -6, name: 'RAG', category: 'AI_RAG', skillLevel: '학습/활용', comment: 'AI 면접 질문 생성과 로그 진단에 적용', usageType: 'LEARNING', isCore: true, displayOrder: 6 },
];

type RelatedStudyNotesProps = {
  skillId?: number;
  experienceId?: number;
  experienceDetailId?: number;
  refSectionId?: string;
  onOpenStudy: (slug: string, refPage?: PageId, refSectionId?: string) => void;
};

function RelatedStudyNotes({ skillId, experienceId, experienceDetailId, refSectionId: customRefSectionId, onOpenStudy }: RelatedStudyNotesProps) {
  const relationKey = skillId
    ? `skill-${skillId}`
    : experienceDetailId
      ? `detail-${experienceDetailId}`
      : `experience-${experienceId}`;
  const { data: relatedPage } = useQuery({
    queryKey: ['studies', 'byExperience', relationKey],
    queryFn: () => studyApi.list({
      skillIds: skillId ? [skillId] : undefined,
      experienceIds: experienceId ? [experienceId] : undefined,
      experienceDetailIds: experienceDetailId ? [experienceDetailId] : undefined,
      size: 100,
    }),
    enabled: Boolean(skillId || experienceId || experienceDetailId),
  });
  const relatedStudies = relatedPage?.content ?? [];
  const refSectionId = customRefSectionId ?? (skillId
    ? 'skills'
    : experienceDetailId
      ? `experience-detail-${experienceDetailId}`
      : `project-experience-${experienceId}`);

  if (relatedStudies.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 border-t border-slate-100 pt-2.5 print:hidden">
      <p className="resume-label mb-2 flex items-center gap-1.5 font-bold uppercase tracking-wider text-blue-600">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
        관련 학습 · 기술노트
      </p>
      <div className="space-y-2">
        {relatedStudies.map((study) => (
          <button
            key={study.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenStudy(study.slug, 'intro', refSectionId);
            }}
            className="resume-meta flex w-full items-center justify-between gap-2.5 rounded-xl border border-blue-100/50 bg-blue-50/40 px-4 py-2.5 text-left font-semibold text-blue-700 transition hover:border-blue-200 hover:bg-blue-50/80 hover:text-blue-800 shadow-sm"
          >
            <span>{study.title}</span>
            <ExternalLink className="h-4 w-4 shrink-0 text-blue-500" />
          </button>
        ))}
      </div>
    </div>
  );
}

function RelatedExperienceLinks({
  experienceId,
  onNavigate,
}: {
  experienceId: number;
  onNavigate: (experience: RelatedExperience) => void;
}) {
  const { data = [] } = useQuery({
    queryKey: ['experiences', 'related', experienceId],
    queryFn: () => connectionApi.relatedExperiences(experienceId),
    enabled: experienceId > 0,
  });

  if (data.length === 0) return null;

  return (
    <div className="mt-2 border-t border-slate-100 pt-2.5 print:hidden">
      <p className="resume-label mb-2 font-bold uppercase tracking-wider text-violet-600">관련 프로젝트 · 이력</p>
      <div className="flex flex-wrap gap-1.5">
        {data.map((experience) => (
          <button
            key={experience.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNavigate(experience);
            }}
            className="resume-meta rounded-lg border border-violet-100 bg-violet-50/50 px-2.5 py-1.5 font-semibold text-violet-700 transition hover:border-violet-200 hover:bg-violet-50"
          >
            {experience.title}
          </button>
        ))}
      </div>
    </div>
  );
}

export function App() {
  const queryClient = useQueryClient();
  
  const {
    selectedMilestoneId,
    activeCategory,
    setSelectedMilestoneId,
    setActiveCategory,
  } = useIntroStore();

  const [search, setSearch] = useState('');

  const isPreviewMode = useMemo(
    () => new URLSearchParams(window.location.search).get('preview') === '1',
    [],
  );

  // 관리자 대시보드가 현재 선택된 메뉴에 맞춰 미리보기 위치를 지정할 수 있도록 sessionStorage에서 초기 목표 지점을 읽어온다.
  const [previewNav, setPreviewNav] = useState<{ page: PageId; section?: string } | null>(() => {
    if (!isPreviewMode) return null;
    try {
      const raw = sessionStorage.getItem('admin-preview-nav');
      return raw ? (JSON.parse(raw) as { page: PageId; section?: string }) : null;
    } catch {
      return null;
    }
  });

  const [activeSection, setActiveSection] = useState('intro-profile');
  const initialStudySlug = getStudySlugFromPath(window.location.pathname);
  const [activePage, setActivePage] = useState<PageId>(
    previewNav?.page ?? getPageFromPath(window.location.pathname),
  );
  const [selectedStudySlug, setSelectedStudySlug] = useState(initialStudySlug);
  const [isPageMenuOpen, setIsPageMenuOpen] = useState(false);
  const [selectedCoreSkillId, setSelectedCoreSkillId] = useState<number | null>(null);
  const [expandedCareerDetailIds, setExpandedCareerDetailIds] = useState<number[]>([]);
  const [selectedTimelineYear, setSelectedTimelineYear] = useState<number | null>(null);
  const [referrer, setReferrer] = useState<{ page: PageId; sectionId?: string } | null>(null);

  useEffect(() => {
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
    
    const allSections = [...mainSections, ...architectureSections];
    allSections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      allSections.forEach(({ id }) => {
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

  const [previewIntroData, setPreviewIntroData] = useState<IntroductionResponse | undefined>(() => {
    if (!isPreviewMode) return undefined;
    try {
      const raw = sessionStorage.getItem('admin-preview-intro-override');
      return raw ? (JSON.parse(raw) as IntroductionResponse) : undefined;
    } catch {
      return undefined;
    }
  });

  // 관리자 대시보드(부모 창)가 sessionStorage를 갱신하면 같은 탭 내 iframe인 이 창에도 storage 이벤트가 전달되어,
  // 페이지 새로고침 없이 미리보기 데이터와 위치를 실시간으로 반영할 수 있다.
  useEffect(() => {
    if (!isPreviewMode) return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'admin-preview-intro-override') {
        try {
          setPreviewIntroData(event.newValue ? (JSON.parse(event.newValue) as IntroductionResponse) : undefined);
        } catch {
          setPreviewIntroData(undefined);
        }
      } else if (event.key === 'admin-preview-nav') {
        try {
          setPreviewNav(event.newValue ? (JSON.parse(event.newValue) as { page: PageId; section?: string }) : null);
        } catch {
          // ignore malformed nav payloads
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isPreviewMode]);

  // 관리자에서 선택된 메뉴에 대응하는 페이지/섹션으로 미리보기를 이동시킨다.
  useEffect(() => {
    if (!isPreviewMode || !previewNav) return;
    setActivePage(previewNav.page);
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (previewNav.section) {
          scrollToSection(previewNav.section);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewMode, previewNav]);

  const { data: visitorSummary } = useQuery({
    queryKey: ['visitor', 'record'],
    queryFn: visitorApi.record,
    enabled: !isPreviewMode,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: fetchedIntroData } = useQuery({
    queryKey: ['introduction'],
    queryFn: bffApi.getIntroduction,
    enabled: !isPreviewMode,
  });

  const introData = isPreviewMode ? previewIntroData : fetchedIntroData;

  const { data: studyPage } = useQuery({
    queryKey: ['studies', 'public', search, activeCategory],
    queryFn: () => studyApi.list({
      q: search || undefined,
      category: activeCategory === 'ALL' ? undefined : activeCategory,
      size: 100,
    }),
  });

  const studies = studyPage?.content ?? [];

  const { data: studyCategories } = useQuery({
    queryKey: ['studyCategories'],
    queryFn: studyApi.categories,
  });

  const { data: selectedStudy } = useQuery({
    queryKey: ['study', selectedStudySlug],
    queryFn: () => studyApi.detail(selectedStudySlug!),
    enabled: Boolean(selectedStudySlug),
  });

  useEffect(() => {
    const handlePopState = () => {
      setSelectedStudySlug(getStudySlugFromPath(window.location.pathname));
      setActivePage(getPageFromPath(window.location.pathname));
      setReferrer(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let titleBeforePrint = document.title;
    const clearPrintTitle = () => {
      titleBeforePrint = document.title;
      document.title = '';
    };
    const restorePrintTitle = () => {
      document.title = titleBeforePrint;
    };

    window.addEventListener('beforeprint', clearPrintTitle);
    window.addEventListener('afterprint', restorePrintTitle);
    return () => {
      window.removeEventListener('beforeprint', clearPrintTitle);
      window.removeEventListener('afterprint', restorePrintTitle);
    };
  }, []);

  const fallbackProfile = {
    name: "신윤식",
    nameEn: "Yoonsik Shin",
    jobTitle: "Software Engineer",
    bio: "에듀테크 실무 백엔드 개발 경험과 Java/Spring Boot, MSA 및 Cloud 인프라 구축 지식을 기반으로 안정적이고 최적화된 아키텍처를 설계하고 운영합니다.",
    coreStackSummary: "Java / Node.js / Cloud",
    statusBadgeText: "실시간 아키텍처 및 콘텐츠 개선 중",
    githubUrl: "https://github.com/Yoonsik-Shin",
    email: "aaa946@naver.com",
    phone: "010-5171-0994"
  };

  const profile = introData?.profile ?? fallbackProfile;
  const careerSummary = introData?.careerSummary ?? '1년 11개월';

  const groupedCoreSkills = useMemo(() => {
    const coreSkills =
      introData?.skills && introData.skills.length > 0
        ? introData.skills.filter((skill) => skill.isCore)
        : fallbackCoreSkills;

    return [
      {
        value: 'CORE',
        label: '핵심 기술 스택',
        skills: coreSkills
          .filter((skill) => skill.usageType === 'WORK_EXPERIENCE')
          .sort((a, b) => a.displayOrder - b.displayOrder),
      },
      {
        value: 'PROJECT_LEARNING',
        label: '프로젝트/학습',
        skills: coreSkills
          .filter((skill) => skill.usageType === 'PROJECT_USE' || skill.usageType === 'LEARNING')
          .sort((a, b) => a.displayOrder - b.displayOrder),
      },
    ];
  }, [introData]);

  const selectedCoreSkill = useMemo(() => {
    return groupedCoreSkills
      .flatMap((group) => group.skills)
      .find((skill) => skill.id === selectedCoreSkillId);
  }, [groupedCoreSkills, selectedCoreSkillId]);

  const selectedCoreSkillExperiences = useMemo(() => {
    if (!selectedCoreSkill) {
      return [];
    }

    if (introData?.experiences && introData.experiences.length > 0) {
      return introData.experiences
        .filter((experience) => experience.skills.some((skill) => skill.id === selectedCoreSkill.id))
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((experience) => ({
          id: experience.id.toString(),
          type: experience.type,
          title: experience.title,
          period: `${experience.periodStart.replace(/-/g, '.').substring(0, 7)} - ${
            experience.periodEnd ? experience.periodEnd.replace(/-/g, '.').substring(0, 7) : '진행 중'
          }`,
          role: experience.role ?? experience.companyName ?? experience.institutionName ?? experience.issuer ?? '',
          summary: experience.summary ?? experience.details?.[0]?.content ?? '',
        }));
    }

    return milestones
      .filter((milestone) => milestone.skills.includes(selectedCoreSkill.name))
      .map((milestone) => ({
        id: milestone.id,
        type: 'PROJECT',
        title: milestone.title,
        period: milestone.period,
        role: milestone.role,
        summary: milestone.body,
      }));
  }, [introData, selectedCoreSkill]);

  const activeMilestones = useMemo(() => {
    if (introData?.experiences && introData.experiences.length > 0) {
      return introData.experiences
        .filter(exp => exp.type === 'PROJECT' || exp.type === 'CAREER')
        .map(exp => {
          const formatPeriod = (start: string, end?: string) => {
            const format = (dateStr: string) => dateStr.replace(/-/g, '.').substring(0, 7);
            return `${format(start)} - ${end ? format(end) : '진행 중'}`;
          };
          
          let label = exp.title.split(' (')[0];
          if (exp.type === 'CAREER') {
             label = '에듀테크 플랫폼 핵심 서버/BFF';
          } else if (exp.slug === 'project1') {
             label = 'CS Test Bed';
          } else if (exp.slug === 'project2') {
             label = 'LogDoctor (SaaS)';
          } else if (exp.slug === 'project3') {
             label = 'AI 실시간 모의면접 플랫폼';
          }

          return {
            id: exp.slug ?? exp.id.toString(),
            label: label,
            period: formatPeriod(exp.periodStart, exp.periodEnd),
            title: exp.title,
            body: exp.details.map(d => d.content).join(', '),
            skills: exp.skills.map(s => s.name),
            tags: exp.tags?.map(t => t.name) ?? [],
            role: exp.role ?? '',
            description: exp.summary ?? '',
            takeaway: exp.takeaway ?? '',
            essayContent: exp.essayContent,
            repositoryUrl: exp.repositoryUrl,
            experienceId: exp.id,
          };
        });
    }
    return milestones.map((milestone) => ({
      ...milestone,
      repositoryUrl: undefined as string | undefined,
      experienceId: undefined as number | undefined,
    }));
  }, [introData]);

  const navigateToRelatedExperience = (experience: RelatedExperience) => {
    if (experience.type === 'PROJECT') {
      const milestone = activeMilestones.find((item) => item.experienceId === experience.id);
      if (milestone) setSelectedMilestoneId(milestone.id);
      document.getElementById(`project-experience-${experience.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    scrollToSection(experience.type === 'CAREER' ? 'career' : 'credentials');
  };

  const coreCompetencies = introData?.competencies ?? [];

  const careerCards = useMemo(() => {
    const formatPeriod = (start: string, end?: string) => {
      const format = (dateStr: string) => dateStr.replace(/-/g, '.').substring(0, 7);
      return `${format(start)} - ${end ? format(end) : '진행 중'}`;
    };

    if (introData?.experiences && introData.experiences.length > 0) {
      return introData.experiences
        .filter(exp => exp.type === 'CAREER')
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map(exp => ({
          id: exp.id,
          period: formatPeriod(exp.periodStart, exp.periodEnd),
          companyName: exp.companyName ?? '',
          employmentType: exp.employmentType ?? '',
          department: exp.department ?? '',
          role: exp.role ?? '',
          details: exp.details,
        }));
    }

    const fallbackDetails: ExperienceDetail[] = [
      { id: -1, content: 'AI 튜터링 및 학습 플랫폼 핵심 API 서버 개발', displayOrder: 0, skills: [] },
      { id: -2, content: '프론트엔드 중계용 BFF 서버 설계 및 구축', displayOrder: 1, skills: [] },
      { id: -3, content: 'Spring Boot 기반 사내 백오피스 단독 구축', displayOrder: 2, skills: [] },
      { id: -4, content: 'AWS 인프라 및 CI/CD 파이프라인 설계/운영', displayOrder: 3, skills: [] },
    ];
    return [{
      id: -1,
      period: '2023. 12 - 2025. 10',
      companyName: '에듀테크 스타트업',
      employmentType: '정규직',
      department: '개발팀',
      role: '백엔드 엔지니어',
      details: fallbackDetails,
    }];
  }, [introData]);

  const educationExperiences = useMemo(() => {
    return (introData?.experiences ?? [])
      .filter((experience) => experience.type === 'EDUCATION')
      .sort((a, b) => b.periodStart.localeCompare(a.periodStart));
  }, [introData]);

  const certificateExperiences = useMemo(() => {
    return (introData?.experiences ?? [])
      .filter((experience) => experience.type === 'CERTIFICATE')
      .sort((a, b) => b.periodStart.localeCompare(a.periodStart));
  }, [introData]);

  const formatCredentialDate = (date: string) => date.replace(/-/g, '.');
  const formatCredentialPeriod = (experience: Experience) => {
    const start = formatCredentialDate(experience.periodStart);
    if (!experience.periodEnd || experience.periodEnd === experience.periodStart) {
      return start;
    }
    return `${start} - ${formatCredentialDate(experience.periodEnd)}`;
  };

  const timelineExperiences = useMemo(() => {
    return (introData?.experiences ?? []).filter((exp) => exp.showOnTimeline);
  }, [introData]);

  const timelineRange = useMemo(() => {
    const now = new Date();
    const dates = timelineExperiences.flatMap((exp) => [
      new Date(exp.periodStart),
      exp.periodEnd ? new Date(exp.periodEnd) : now,
    ]);
    if (dates.length === 0) {
      return { startYear: now.getFullYear() - 1, endYear: now.getFullYear() };
    }
    const minYear = Math.min(...dates.map((d) => d.getFullYear()));
    const maxYear = Math.max(...dates.map((d) => d.getFullYear()));
    return { startYear: minYear, endYear: Math.max(maxYear, minYear + 1) };
  }, [timelineExperiences]);

  const timelineYears = useMemo(() => {
    const years: number[] = [];
    for (let y = timelineRange.startYear; y <= timelineRange.endYear; y++) years.push(y);
    return years;
  }, [timelineRange]);

  const timelineRangeStartMs = new Date(`${timelineRange.startYear}-01-01`).getTime();
  const timelineRangeEndMs = new Date(`${timelineRange.endYear + 1}-01-01`).getTime();
  const timelineRangeSpanMs = timelineRangeEndMs - timelineRangeStartMs;

  const timelinePercentFor = (dateStr: string) => {
    const ms = new Date(dateStr).getTime();
    return Math.min(100, Math.max(0, ((ms - timelineRangeStartMs) / timelineRangeSpanMs) * 100));
  };

  const timelineWidthFor = (startStr: string, endStr?: string) => {
    const startMs = new Date(startStr).getTime();
    const endMs = endStr ? new Date(endStr).getTime() : Date.now();
    return Math.max(2, ((endMs - startMs) / timelineRangeSpanMs) * 100);
  };

  const isTimelineYearActive = (startStr: string, endStr?: string) => {
    if (selectedTimelineYear === null) return true;
    const startYear = new Date(startStr).getFullYear();
    const endYear = endStr ? new Date(endStr).getFullYear() : new Date().getFullYear();
    return selectedTimelineYear >= startYear && selectedTimelineYear <= endYear;
  };

  const timelineDim = (startStr: string, endStr?: string) =>
    isTimelineYearActive(startStr, endStr) ? 'opacity-100' : 'opacity-20 grayscale';

  const timelineShortDate = (dateStr: string) => {
    const [y, m] = dateStr.split('-');
    return `${y.slice(2)}.${m}`;
  };
  const timelineLongDate = (dateStr: string) => {
    const [y, m] = dateStr.split('-');
    return `${y}.${m}`;
  };

  const timelineTooltip = (exp: { title: string; periodStart: string; periodEnd?: string }, isPoint: boolean) =>
    isPoint
      ? `${exp.title} (${timelineShortDate(exp.periodStart)})`
      : `${exp.title} (${timelineLongDate(exp.periodStart)} - ${exp.periodEnd ? timelineLongDate(exp.periodEnd) : '진행 중'})`;

  const onTimelineItemClick = (exp: Experience) => {
    if (exp.type === 'PROJECT') {
      setSelectedMilestoneId(exp.slug ?? exp.id.toString());
      scrollToSection('projects');
    } else if (exp.type === 'EDUCATION' || exp.type === 'CERTIFICATE') {
      scrollToSection('credentials');
    } else {
      scrollToSection('career');
    }
  };

  const timelinePointItems = useMemo(() =>
    timelineExperiences.filter((exp) =>
      (exp.type === 'EDUCATION' || exp.type === 'CERTIFICATE') && exp.periodEnd && exp.periodStart === exp.periodEnd
    ), [timelineExperiences]);

  const timelineCourseItems = useMemo(() =>
    timelineExperiences.filter((exp) =>
      exp.type === 'EDUCATION' && !(exp.periodEnd && exp.periodStart === exp.periodEnd)
    ), [timelineExperiences]);

  const timelineCareerItems = useMemo(() =>
    timelineExperiences.filter((exp) => exp.type === 'CAREER'), [timelineExperiences]);

  const timelineProjectItems = useMemo(() =>
    timelineExperiences.filter((exp) => exp.type === 'PROJECT').sort((a, b) => a.periodStart.localeCompare(b.periodStart)),
    [timelineExperiences]);

  const toggleCareerDetail = (id: number) => {
    setExpandedCareerDetailIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const expandableDetailIds = useMemo(() => {
    return careerCards.flatMap(c =>
      c.details
        .filter(d => Boolean(d.situation || d.actionDetail || d.outcome || (d.skills && d.skills.length > 0)))
        .map(d => d.id)
    );
  }, [careerCards]);

  const isAllExpanded = useMemo(() => {
    return expandableDetailIds.length > 0 && expandableDetailIds.every(id => expandedCareerDetailIds.includes(id));
  }, [expandableDetailIds, expandedCareerDetailIds]);

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedCareerDetailIds([]);
    } else {
      setExpandedCareerDetailIds(expandableDetailIds);
    }
  };

  const selectedMilestone = useMemo(() => {
    return activeMilestones.find(m => m.id === selectedMilestoneId) || activeMilestones[0];
  }, [selectedMilestoneId, activeMilestones]);

  const handlePrint = () => {
    window.print();
  };

  const goToPage = (pageId: PageId) => {
    setActivePage(pageId);
    setSelectedStudySlug(null);
    setReferrer(null);
    navigate(pagePaths[pageId]);
    setIsPageMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openStudy = (slug: string, refPage?: PageId, refSectionId?: string) => {
    setSelectedStudySlug(slug);
    setActivePage('blog');
    navigate(pathForStudy(slug));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (refPage) {
      setReferrer({ page: refPage, sectionId: refSectionId });
    } else {
      setReferrer(null);
    }
  };

  const closeStudy = () => {
    if (referrer) {
      setActivePage(referrer.page);
      setSelectedStudySlug(null);
      navigate(pagePaths[referrer.page]);
      const targetId = referrer.sectionId;
      setReferrer(null);
      
      setTimeout(() => {
        if (targetId) {
          const el = document.getElementById(targetId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('bg-blue-50/40', 'transition-colors', 'duration-500');
            setTimeout(() => {
              el.classList.remove('bg-blue-50/40');
            }, 1500);
            return;
          }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 150);
    } else {
      setSelectedStudySlug(null);
      navigate(pagePaths.blog);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 공통 카드 레이아웃 스타일 통일
  const cardStyle = "resume-section-card bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)] transition-all duration-300 relative";
  
  // 공통 배지 스타일 통일
  const badgeStyle = "resume-badge bg-slate-50 border border-slate-200/60 text-slate-700 font-bold px-2 py-0.5 rounded-md shadow-sm";

  return (
    <>
      <main className="min-h-screen bg-[#f8fafc] text-slate-800 font-['Plus_Jakarta_Sans',Pretendard,sans-serif] print:bg-white print:text-black pb-12">
        {isPreviewMode && (
          <div className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-1.5 text-xs font-black text-amber-950 print:hidden">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-900" />
            미리보기 모드 · 저장되지 않은 변경사항을 표시하고 있습니다
          </div>
        )}
        {/* Background Glow effects */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-slate-800/5 rounded-full filter blur-[120px] pointer-events-none print:hidden" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-slate-800/3 rounded-full filter blur-[100px] pointer-events-none print:hidden" />

        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 py-2 shadow-sm backdrop-blur-xl print:hidden relative">
          <div className="mx-auto flex h-12 max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-6">
              <button
                onClick={() => goToPage('intro')}
                className="flex shrink-0 items-center text-left focus:outline-none hover:opacity-90 transition"
                title="소개 페이지로 이동"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-slate-900 to-slate-950 text-sm font-black text-white shadow-md shadow-slate-800/20">
                  YS
                </div>
              </button>

              <nav
                aria-label="페이지 네비게이션"
                className="hidden min-w-0 items-center gap-5 overflow-x-auto scrollbar-none min-[900px]:flex"
              >
                {pages.map((page) => {
                  const Icon = page.icon;
                  const isActive = activePage === page.id;
                  return (
                    <button
                      key={page.id}
                      onClick={() => goToPage(page.id)}
                      className={`relative inline-flex h-12 shrink-0 items-center gap-2 px-1 text-sm font-black transition-colors duration-200 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-center after:rounded-full after:bg-slate-900 after:transition-transform after:duration-200 ${
                        isActive
                          ? 'text-slate-950 after:scale-x-100'
                          : 'text-slate-500 after:scale-x-0 hover:text-slate-900'
                      }`}
                      title={page.label}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{page.shortLabel}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {visitorSummary && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-500 sm:px-2.5">
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">오늘 {visitorSummary.todayVisitors.toLocaleString()} · </span>
                  누적 {visitorSummary.totalVisitors.toLocaleString()}
                </span>
              )}
              {activePage === 'intro' && (
                <button
                  onClick={handlePrint}
                  className="hidden h-9 items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-slate-900 to-slate-950 px-3 text-sm font-bold text-white hover:from-slate-800 hover:to-slate-900 transition shadow-sm shadow-slate-800/20 min-[900px]:flex"
                  title="PDF 인쇄"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>PDF 인쇄</span>
                </button>
              )}
              <button
                onClick={() => setIsPageMenuOpen((open) => !open)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 min-[900px]:hidden"
                title="페이지 메뉴"
                aria-label="페이지 메뉴"
                aria-expanded={isPageMenuOpen}
              >
                {isPageMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isPageMenuOpen && (
            <div className="absolute left-0 right-0 top-full z-40 border-b border-slate-200/80 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-xl min-[900px]:hidden">
              <nav aria-label="모바일 페이지 네비게이션" className="mx-auto flex max-w-[1500px] flex-col gap-1">
                {pages.map((page) => {
                  const Icon = page.icon;
                  const isActive = activePage === page.id;
                  return (
                    <button
                      key={page.id}
                      onClick={() => goToPage(page.id)}
                      className={`relative flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-black transition-colors duration-200 after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-slate-900 ${
                        isActive
                          ? 'text-slate-950 after:opacity-100'
                          : 'text-slate-600 after:opacity-0 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{page.label}</span>
                    </button>
                  );
                })}
                {activePage === 'intro' && (
                  <button
                    onClick={() => {
                      setIsPageMenuOpen(false);
                      handlePrint();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-black text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-slate-950"
                  >
                    <Printer className="h-4 w-4" />
                    <span>PDF 인쇄</span>
                  </button>
                )}
              </nav>
            </div>
          )}
        </header>

        {/* Main Body Layout */}
        <div className="resume-print-shell mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          
          {activePage === 'intro' ? (
            <div className="grid grid-cols-[minmax(0,1fr)_52px] gap-4 sm:gap-6 min-[900px]:grid-cols-[minmax(0,1fr)_240px] print:block relative items-start">
            
            {/* Main Content Column */}
            <div className="resume-page min-w-0 space-y-12">
              
              {/* General Career Summary Banner (Hero) / Combined Profile Banner */}
              <div id="intro-profile" className="resume-profile-card scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] backdrop-blur-md">
            <div className="absolute top-0 right-0 w-96 h-96 bg-slate-800/5 rounded-full filter blur-[60px] -mr-20 -mt-20 pointer-events-none print:hidden" />
            
            <div className="relative z-10 space-y-6">
              
              {/* Top Row: Name, English Name, Social Links, and Deploy Badge */}
              {/* Top Row: Name, English Name, Job Title and Social Links */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-2 shrink-0">
                  <h2 className="resume-profile-role font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-950 whitespace-nowrap">
                    {profile.jobTitle}
                  </h2>
                  <div className="flex items-baseline gap-2.5 whitespace-nowrap">
                    <h1 className="resume-profile-name font-black text-slate-900 whitespace-nowrap">{profile.name}</h1>
                    <span className="resume-profile-name-en font-bold text-slate-400 font-mono whitespace-nowrap">{profile.nameEn}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3.5 mt-2 md:mt-0">
                  <span className="resume-meta inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 font-semibold text-amber-700 animate-pulse shadow-sm print:hidden">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {profile.statusBadgeText} (v{__APP_VERSION__} - {__BUILD_DATE__} 배포)
                  </span>

                  <div className="flex items-center gap-2 print:hidden">
                    <a
                      href={profile.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-slate-50 border border-slate-200/60 p-2 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition"
                      title="GitHub"
                    >
                      <Github className="h-4 w-4" />
                    </a>
                    <a
                      href={`mailto:${profile.email}`}
                      className="rounded-lg bg-slate-50 border border-slate-200/60 p-2 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition"
                      title="이메일 보내기"
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                    <a
                      href={`tel:${profile.phone}`}
                      className="rounded-lg bg-slate-50 border border-slate-200/60 p-2 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition"
                      title="전화 걸기"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="resume-print-contact hidden flex-wrap gap-x-4 gap-y-1 border-b border-slate-200 pb-3 text-slate-600 print:flex">
                <span>{profile.email}</span>
                <span>{profile.phone}</span>
                <span>{profile.githubUrl.replace(/^https?:\/\//, '')}</span>
              </div>

              {/* Bio & Personal Info */}
              <div className="space-y-6">
                <div>
                  <p className="resume-body mt-2 max-w-4xl whitespace-pre-line break-words text-slate-600">
                    {profile.bio}
                  </p>
                </div>

                    <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 print:grid-cols-2">
                      <button
                        onClick={() => scrollToSection('career')}
                        className="resume-summary-item flex-1 flex items-center gap-3.5 text-left bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 p-4 rounded-xl transition group shadow-sm"
                      >
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white border border-slate-200 text-slate-500 shrink-0 group-hover:text-slate-900 group-hover:border-slate-300 transition shadow-sm">
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="resume-label block font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-800 transition">실무 경력</span>
                          <span className="resume-subtitle mt-0.5 block font-black text-slate-800 group-hover:text-slate-950 transition">{careerSummary}</span>
                        </div>
                      </button>

                      <button
                        onClick={() => scrollToSection('skills')}
                        className="resume-summary-item flex-1 flex items-center gap-3.5 text-left bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 p-4 rounded-xl transition group shadow-sm"
                      >
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white border border-slate-200 text-slate-500 shrink-0 group-hover:text-slate-900 group-hover:border-slate-300 transition shadow-sm">
                          <Cpu className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="resume-label block font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-800 transition">핵심 스택</span>
                          <span className="resume-subtitle mt-0.5 block font-black text-slate-800 group-hover:text-slate-950 transition">{profile.coreStackSummary}</span>
                        </div>
                      </button>

                      <button
                        onClick={() => scrollToSection('credentials')}
                        className="resume-summary-item flex-1 flex items-center gap-3.5 text-left bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 p-4 rounded-xl transition group shadow-sm"
                      >
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white border border-slate-200 text-slate-500 shrink-0 group-hover:text-slate-900 group-hover:border-slate-300 transition shadow-sm">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="resume-label block font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-800 transition">학력 · 교육</span>
                          <span className="resume-subtitle mt-0.5 block font-black text-slate-800 group-hover:text-slate-950 transition">{educationExperiences.length}건</span>
                        </div>
                      </button>

                      <button
                        onClick={() => scrollToSection('credentials')}
                        className="resume-summary-item flex-1 flex items-center gap-3.5 text-left bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 p-4 rounded-xl transition group shadow-sm"
                      >
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white border border-slate-200 text-slate-500 shrink-0 group-hover:text-slate-900 group-hover:border-slate-300 transition shadow-sm">
                          <Award className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="resume-label block font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-800 transition">보유 자격증</span>
                          <span className="resume-subtitle mt-0.5 block font-black text-slate-800 group-hover:text-slate-950 transition">{certificateExperiences.length}개</span>
                        </div>
                      </button>
                    </div>



              </div>
            </div>
          </div>

              {/* SECTION 1.4: 커리어 & 학습 타임라인 그래프 */}
              <section id="timeline" className="scroll-mt-24 space-y-6 print:hidden">
                <div className={cardStyle}>
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                      <Calendar className="h-5 w-5 text-slate-900" />
                      커리어 & 학습 타임라인
                    </h2>
                    <p className="resume-section-description mt-1 text-slate-500">자격증 취득, 교육 수강, 실무 경력 및 프로젝트 이력을 한눈에 보는 타임라인입니다. 요소를 클릭하면 해당 위치로 스크롤됩니다.</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-bold text-slate-500">
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-600 border border-white shadow-sm" />자격증/학력 취득</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-3.5 rounded bg-gradient-to-r from-blue-500 to-slate-800" />교육 수강</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-3.5 rounded bg-gradient-to-r from-violet-600 to-slate-900" />실무 경력</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-3.5 rounded bg-gradient-to-r from-pink-500 to-rose-500" /><FolderGit2 className="h-3 w-3 text-rose-500" />프로젝트</span>
                    </div>
                    {timelineYears.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5 print:hidden">
                        <button
                          type="button"
                          onClick={() => setSelectedTimelineYear(null)}
                          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                            selectedTimelineYear === null
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-100'
                          }`}
                        >
                          전체 기간
                        </button>
                        {timelineYears.map((year) => (
                          <button
                            key={year}
                            type="button"
                            onClick={() => setSelectedTimelineYear((current) => (current === year ? null : year))}
                            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                              selectedTimelineYear === year
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-100'
                            }`}
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {!introData ? (
                    <p className="py-10 text-center text-sm font-bold text-slate-400">타임라인 데이터를 불러오는 중입니다...</p>
                  ) : timelineExperiences.length === 0 ? (
                    <p className="py-10 text-center text-sm font-bold text-slate-400">타임라인에 표시할 항목이 없습니다. 어드민에서 "타임라인에 표시"를 켜주세요.</p>
                  ) : (
                    <div className="relative mt-8 select-none">
                      {/* Header Row: Contains Year labels */}
                      <div className="relative flex items-center h-8 border-b border-slate-100">
                        <div className="w-36 shrink-0"></div> {/* Empty spacer for row header */}
                        <div className="relative flex-1 h-full text-xs font-black text-slate-400">
                          {timelineYears.map((year) => (
                            <div key={year} className="absolute -translate-x-1/2" style={{ left: `${timelinePercentFor(`${year}-01-01`)}%` }}>{year}</div>
                          ))}
                        </div>
                      </div>

                      {/* Vertical grid lines */}
                      <div className="absolute inset-y-0 left-36 right-0 top-8 pointer-events-none z-0">
                        {timelineYears.map((year) => (
                          <div key={year} className="absolute top-0 bottom-0 w-[1px] border-l border-dashed border-slate-200" style={{ left: `${timelinePercentFor(`${year}-01-01`)}%` }}></div>
                        ))}
                      </div>

                      {/* Rows */}
                      <div className="mt-4 space-y-4 pb-2">
                        {timelinePointItems.length > 0 && (
                          <div className="relative flex items-center h-10">
                            <div className="w-36 text-sm font-black text-slate-500 shrink-0">자격증 및 학력</div>
                            <div className="relative flex-1 h-full">
                              {timelinePointItems.map((exp) => (
                                <div
                                  key={exp.id}
                                  style={{ left: `${timelinePercentFor(exp.periodStart)}%` }}
                                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group/item cursor-pointer z-10"
                                  onClick={() => onTimelineItemClick(exp)}
                                >
                                  <div className={`w-3.5 h-3.5 rounded-full ${exp.type === 'CERTIFICATE' ? 'bg-emerald-500' : 'bg-blue-600'} border-2 border-white shadow-md hover:scale-125 transition ${timelineDim(exp.periodStart, exp.periodEnd)}`}></div>
                                  <span className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-white bg-slate-800/90 shadow-sm px-2 py-0.5 rounded opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none z-30">
                                    {timelineTooltip(exp, true)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {timelineCourseItems.length > 0 && (
                          <div className="relative flex items-center h-10">
                            <div className="w-36 text-sm font-black text-slate-500 shrink-0">교육 수강</div>
                            <div className="relative flex-1 h-full">
                              {timelineCourseItems.map((exp) => (
                                <div
                                  key={exp.id}
                                  style={{ left: `${timelinePercentFor(exp.periodStart)}%`, width: `${timelineWidthFor(exp.periodStart, exp.periodEnd)}%` }}
                                  className={`absolute top-1.5 bottom-1.5 bg-gradient-to-r from-blue-500 to-slate-800 rounded-lg shadow-sm border border-white hover:brightness-105 active:scale-[0.98] transition cursor-pointer flex items-center justify-center text-[10px] font-black text-white px-1 overflow-hidden ${timelineDim(exp.periodStart, exp.periodEnd)}`}
                                  title={timelineTooltip(exp, false)}
                                  onClick={() => onTimelineItemClick(exp)}
                                >
                                  <span className="truncate">{exp.timelineLabel || exp.title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {timelineCareerItems.length > 0 && (
                          <div className="relative flex items-center h-10">
                            <div className="w-36 text-sm font-black text-slate-500 shrink-0">실무 경력</div>
                            <div className="relative flex-1 h-full">
                              {timelineCareerItems.map((exp) => (
                                <div
                                  key={exp.id}
                                  style={{ left: `${timelinePercentFor(exp.periodStart)}%`, width: `${timelineWidthFor(exp.periodStart, exp.periodEnd)}%` }}
                                  className={`absolute top-1.5 bottom-1.5 bg-gradient-to-r from-violet-600 to-slate-900 rounded-lg shadow-sm border border-white hover:brightness-105 active:scale-[0.98] transition cursor-pointer flex items-center justify-center text-[10px] font-black text-white px-1 overflow-hidden ${timelineDim(exp.periodStart, exp.periodEnd)}`}
                                  title={timelineTooltip(exp, false)}
                                  onClick={() => onTimelineItemClick(exp)}
                                >
                                  <span className="truncate">{exp.timelineLabel || exp.title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {timelineProjectItems.map((exp) => (
                          <div key={exp.id} className="relative flex items-center h-10">
                            <div className="w-36 flex items-center gap-1 text-xs font-bold text-slate-400 pl-2 shrink-0">
                              <FolderGit2 className="h-3 w-3 shrink-0 text-rose-400" />
                              <span className="truncate">{exp.title}</span>
                            </div>
                            <div className="relative flex-1 h-full">
                              <div
                                style={{ left: `${timelinePercentFor(exp.periodStart)}%`, width: `${timelineWidthFor(exp.periodStart, exp.periodEnd)}%` }}
                                className={`absolute top-1.5 bottom-1.5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg shadow-sm border border-white hover:brightness-105 active:scale-[0.98] transition cursor-pointer flex items-center justify-center text-[10px] font-black text-white px-1 overflow-hidden ${timelineDim(exp.periodStart, exp.periodEnd)}`}
                                title={timelineTooltip(exp, false)}
                                onClick={() => onTimelineItemClick(exp)}
                              >
                                <span className="truncate">{exp.timelineLabel || exp.title}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Footer Row: mirrors the year header so the axis stays readable next to the bottom rows */}
                      <div className="relative flex items-center h-6 border-t border-slate-100 mt-1">
                        <div className="w-36 shrink-0"></div>
                        <div className="relative flex-1 h-full text-[11px] font-black text-slate-300">
                          {timelineYears.map((year) => (
                            <div key={year} className="absolute -translate-x-1/2" style={{ left: `${timelinePercentFor(`${year}-01-01`)}%` }}>{year}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* SECTION 1.5: 기술 스택 */}
              <section id="skills" className="scroll-mt-24 space-y-6">
                <div className={cardStyle}>
                  <h2 className="resume-section-title mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 font-black text-slate-900">
                    <Cpu className="h-5 w-5 text-slate-900" />
                    기술 스택
                  </h2>
                  <div className="space-y-5">
                    {groupedCoreSkills.map((group) => (
                      <div key={group.value} className="space-y-4">
                        <h4 className="resume-subtitle border-b border-slate-100 pb-1.5 font-black text-slate-500">{group.label}</h4>
                        {group.skills.length > 0 ? (
                          <div className="space-y-4 pl-1">
                            {['Backend & Language', 'Frontend', 'Database', 'DevOps & Infra', 'AI / RAG', 'Others'].map((cat) => {
                              const catSkills = group.skills.filter(s => getDisplayCategory(s) === cat);
                              if (catSkills.length === 0) return null;
                              return (
                                <div key={cat} className="space-y-2">
                                  <h5 className="resume-label font-black text-slate-400 uppercase tracking-wider">{cat}</h5>
                                  <div className="flex flex-wrap gap-1.5">
                                    {catSkills.map((skill) => (
                                      <button
                                        type="button"
                                        key={skill.id}
                                        onClick={() => setSelectedCoreSkillId((current) => (current === skill.id ? null : skill.id))}
                                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left transition ${
                                          selectedCoreSkillId === skill.id
                                            ? 'border-slate-500 bg-slate-900 text-white shadow-sm shadow-slate-800/20'
                                            : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-100/50'
                                        }`}
                                      >
                                        <SkillBadgeIcon
                                          name={skill.name}
                                          badgeKey={skill.badgeKey}
                                          badgeColor={skill.badgeColor}
                                          className="h-5 w-5"
                                        />
                                        <span className="resume-badge font-black">{skill.name}</span>
                                        {skill.skillVersion && (
                                          <span className={`shrink-0 rounded-md border px-1 py-0.5 text-[10px] font-black leading-none ${
                                            selectedCoreSkillId === skill.id
                                              ? 'border-white/25 bg-white/15 text-white'
                                              : 'border-slate-200 bg-slate-50 text-slate-500'
                                          }`}>
                                            v{skill.skillVersion}
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="border-l-4 border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-400">
                            선택된 기술이 없습니다.
                          </p>
                        )}
                      </div>
                    ))}

                    {selectedCoreSkill && (
                      <div className="border-t border-slate-200 pt-5 print:hidden">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <SkillBadgeIcon
                              name={selectedCoreSkill.name}
                              badgeKey={selectedCoreSkill.badgeKey}
                              badgeColor={selectedCoreSkill.badgeColor}
                              className="h-9 w-9"
                            />
                            <div className="min-w-0">
                              <span className="resume-label font-black text-slate-900">이 기술을 사용한 경험</span>
                              <h4 className="resume-item-title mt-0.5 font-black text-slate-900">{selectedCoreSkill.name}</h4>
                              {selectedCoreSkill.skillVersion && (
                                <p className="resume-meta mt-0.5 font-bold text-slate-500">v{selectedCoreSkill.skillVersion}</p>
                              )}
                            </div>
                          </div>
                          <span className="resume-meta rounded-md bg-slate-100 px-2.5 py-1 font-black text-slate-900">
                            연결된 경험 {selectedCoreSkillExperiences.length}개
                          </span>
                        </div>

                        <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
                          {selectedCoreSkillExperiences.length > 0 ? (
                            selectedCoreSkillExperiences.map((experience) => (
                              <button
                                type="button"
                                key={experience.id}
                                onClick={() => {
                                  const milestone = activeMilestones.find((item) => item.title === experience.title);
                                  if (milestone) {
                                    setSelectedMilestoneId(milestone.id);
                                    scrollToSection('projects');
                                  }
                                }}
                                className="w-full px-1 py-3.5 text-left transition hover:bg-slate-100/40 sm:px-2"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="resume-label rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-black text-slate-500">
                                    {experience.type}
                                  </span>
                                  <span className="resume-meta font-black text-slate-400">{experience.period}</span>
                                </div>
                                <p className="resume-subtitle mt-1.5 font-black text-slate-900">{experience.title}</p>
                                {experience.role && (
                                  <p className="resume-meta mt-0.5 font-black text-slate-900">{experience.role}</p>
                                )}
                                {experience.summary && (
                                  <div className="resume-meta mt-1.5 line-clamp-2 font-semibold text-slate-600">
                                    <ReactMarkdown components={resumeMarkdownComponents}>{experience.summary}</ReactMarkdown>
                                  </div>
                                )}
                              </button>
                            ))
                          ) : (
                            <p className="px-1 py-3 text-sm font-bold text-slate-400">
                              연결된 experience가 없습니다.
                            </p>
                          )}
                        </div>
                        {selectedCoreSkill.id > 0 && (
                          <RelatedStudyNotes
                            skillId={selectedCoreSkill.id}
                            refSectionId="skills"
                            onOpenStudy={openStudy}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* SECTION 1.6: 핵심 역량 */}
              <section id="competencies" className="print-competency-section scroll-mt-24 space-y-6">
                <div className={`${cardStyle} print:rounded-none print:border-x-0 print:border-t-0 print:p-0 print:shadow-none`}>
                  <div className="resume-competency-header border-b border-slate-200 pb-4 print:pb-2">
                    <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                      <Sparkles className="h-5 w-5 text-slate-900" />
                      핵심 역량
                    </h2>
                    <p className="resume-section-description mt-1 text-slate-500">
                      실무 경력과 프로젝트 성과를 기준으로 정리한 문제 해결 역량입니다.
                    </p>
                  </div>

                  <div className="mt-2 divide-y divide-slate-200 border-b border-slate-200">
                    {coreCompetencies.map((competency, index) => (
                      <article
                        key={competency.id}
                        id={`competency-${competency.id}`}
                        className="print-competency-row scroll-mt-24 grid gap-3 py-5 sm:grid-cols-[minmax(180px,0.32fr)_minmax(0,1fr)] sm:gap-6 print:grid-cols-[31%_69%] print:gap-4 print:py-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="resume-label font-black tabular-nums tracking-[0.14em] text-slate-400">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <h3 className="resume-item-title font-black text-slate-900">
                              {competency.title}
                            </h3>
                          </div>
                          {competency.skills.length > 0 && (
                            <p className="resume-meta mt-2 font-bold text-slate-500 print:mt-1">
                              {competency.skills.slice(0, 6).map((skill) => skill.name).join(' · ')}
                            </p>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="resume-body font-semibold text-slate-700">
                            {competency.summary}
                          </p>

                          {competency.evidences.length > 0 ? (
                            <div className="mt-3 print:mt-1.5">
                              <p className="resume-label font-black uppercase tracking-[0.14em] text-slate-400">
                                대표 실무 근거
                              </p>
                              <button
                                type="button"
                                title={competency.evidences[0].experienceTitle}
                                onClick={() => {
                                  const evidence = competency.evidences[0];
                                  if (evidence.experienceType === 'PROJECT') {
                                    const milestone = activeMilestones.find((item) => item.experienceId === evidence.experienceId);
                                    if (milestone) setSelectedMilestoneId(milestone.id);
                                    document.getElementById(`project-experience-${evidence.experienceId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  } else {
                                    scrollToSection('career');
                                  }
                                }}
                                className="resume-body mt-1 block w-full text-left text-slate-700 transition hover:text-slate-950 print:pointer-events-none"
                              >
                                <span className="font-black text-slate-900">
                                  {competency.evidences[0].experienceType === 'CAREER' ? '경력' : '프로젝트'} · {competency.evidences[0].experienceTitle}
                                </span>
                                {competency.evidences[0].evidenceSummary && (
                                  <span className="mt-0.5 block font-medium text-slate-600">
                                    {competency.evidences[0].evidenceSummary}
                                  </span>
                                )}
                              </button>

                              {competency.evidences.length > 1 && (
                                <p className="resume-meta mt-1.5 font-semibold text-slate-500">
                                  추가 검증 사례 · {competency.evidences.slice(1).map((evidence) => evidence.experienceTitle).join(' · ')}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs font-semibold text-slate-400">연결된 실무 근거가 없습니다.</p>
                          )}

                          {competency.relatedStudies.length > 0 && (
                            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs print:hidden">
                              <span className="font-black text-slate-400">관련 학습</span>
                              {competency.relatedStudies.map((study) => (
                                <button
                                  key={`study-${study.id}`}
                                  type="button"
                                  onClick={() => openStudy(study.slug, 'intro', `competency-${competency.id}`)}
                                  className="font-bold text-blue-700 hover:underline"
                                >
                                  {study.title}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>

              {/* SECTION 2: 직장 경력 */}
              <section id="career" className="scroll-mt-24 space-y-6">
                {careerCards.map(career => (
                  <div key={career.id} className={cardStyle}>
                    <h2 className="resume-section-title mb-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-3 font-black text-slate-900">
                      <span className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-slate-900" />
                        직장 경력 (총 {careerSummary})
                      </span>
                      {expandableDetailIds.length > 0 && (
                        <button
                          type="button"
                          onClick={toggleExpandAll}
                          className="resume-meta flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-500 shadow-xs transition hover:bg-slate-100 hover:text-slate-950 print:hidden"
                        >
                          {isAllExpanded ? '모두 접기' : '모두 펼치기'}
                        </button>
                      )}
                    </h2>
                    <div>
                      <span className="resume-print-plain resume-meta inline-flex rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                        {career.period}
                      </span>
                      <p className="resume-item-title mt-2 font-black text-slate-800">{career.companyName} ({career.employmentType})</p>
                      <p className="resume-meta font-semibold text-slate-500">{career.department} / {career.role}</p>
                      <ul className="mt-4 space-y-2">
                        {career.details.map(detail => {
                          const isExpanded = expandedCareerDetailIds.includes(detail.id);
                          const hasDetailContent = Boolean(detail.situation || detail.actionDetail || detail.outcome || detail.skills.length > 0);
                          return (
                            <li
                              key={detail.id}
                              id={`experience-detail-${detail.id}`}
                              className={`resume-career-item list-none scroll-mt-24 transition-all duration-300 ${
                                isExpanded
                                  ? 'pb-6 mb-6 border-b border-slate-200/50 last:border-0 last:pb-0 last:mb-0'
                                  : 'border-b border-transparent'
                              }`}
                            >
                              <div
                                className={`group flex items-start justify-between gap-3 rounded-lg px-2 py-1 -mx-2 transition hover:bg-slate-50 ${
                                  hasDetailContent ? 'cursor-pointer' : 'cursor-default'
                                }`}
                                onClick={() => hasDetailContent && toggleCareerDetail(detail.id)}
                              >
                                <span className={`resume-body flex items-start gap-2.5 font-normal transition ${
                                  hasDetailContent 
                                    ? 'text-slate-700 group-hover:text-slate-900 group-hover:font-semibold' 
                                    : 'text-slate-500'
                                }`}>
                                  {hasDetailContent ? (
                                    <ChevronDown className={`mt-1.5 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 print:hidden ${isExpanded ? 'rotate-180 text-slate-800' : 'group-hover:text-slate-600'}`} />
                                  ) : (
                                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 ml-1.5 mr-1" />
                                  )}
                                  {detail.content}
                                </span>
                                {detail.id > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); navigate(pathForExperienceDetail(detail.id)); }}
                                    className="resume-meta shrink-0 whitespace-nowrap font-bold text-slate-800 transition hover:text-slate-950 hover:underline print:hidden"
                                  >
                                    자세히 보기
                                  </button>
                                )}
                              </div>
                              {hasDetailContent && (
                                <div className={`resume-career-detail resume-body mt-3 ml-6 space-y-3.5 text-slate-600 print:block print:ml-0 ${isExpanded ? 'block' : 'hidden'}`}>
                                  {detail.situation && (
                                    <div>
                                      <p className="resume-label mb-1 font-bold uppercase tracking-wider text-slate-400">상황</p>
                                      <ReactMarkdown components={resumeMarkdownComponents}>{detail.situation}</ReactMarkdown>
                                    </div>
                                  )}
                                  {detail.actionDetail && (
                                    <div>
                                      <p className="resume-label mb-1 font-bold uppercase tracking-wider text-slate-400">진행 과정</p>
                                      <ReactMarkdown components={resumeMarkdownComponents}>{detail.actionDetail}</ReactMarkdown>
                                    </div>
                                  )}
                                  {detail.outcome && (
                                    <div>
                                      <p className="resume-label mb-1 font-bold uppercase tracking-wider text-emerald-600">성과</p>
                                      <ReactMarkdown components={resumeMarkdownComponents}>{detail.outcome}</ReactMarkdown>
                                    </div>
                                  )}
                                  {detail.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                      {detail.skills.map(s => (
                                        <span key={s.id} className={badgeStyle}>{s.name}</span>
                                      ))}
                                    </div>
                                  )}
                                  {detail.id > 0 && <RelatedStudyNotes experienceDetailId={detail.id} onOpenStudy={openStudy} />}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      {career.id > 0 && (
                        <RelatedExperienceLinks experienceId={career.id} onNavigate={navigateToRelatedExperience} />
                      )}
                    </div>
                  </div>
                ))}
              </section>

              {/* SECTION 3: 학력·교육 및 자격증 */}
              <section id="credentials" className="resume-credentials-section scroll-mt-24 space-y-6">
                <div className={cardStyle}>
                  <div className="resume-credentials-header border-b border-slate-100 pb-4">
                    <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                      <GraduationCap className="h-5 w-5 text-slate-900" />
                      학력 · 교육 및 자격증
                    </h2>
                    <p className="resume-section-description mt-1 text-slate-500">
                      전공 학력과 직무 교육 이수 내역, 보유 자격을 정리했습니다.
                    </p>
                  </div>

                  <div className="resume-credential-groups mt-6 grid gap-8 lg:grid-cols-2">
                    <div className="resume-credential-group">
                      <h3 className="resume-credential-group-title resume-item-title mb-4 flex items-center gap-2 font-black text-slate-800">
                        <GraduationCap className="h-4 w-4 text-blue-600" />
                        학력 · 교육
                        <span className="resume-credential-count resume-meta rounded-full bg-blue-50 px-2 py-0.5 font-bold text-blue-700">{educationExperiences.length}건</span>
                      </h3>

                      {educationExperiences.length > 0 ? (
                        <div className="resume-credential-list space-y-3">
                          {educationExperiences.map((education) => (
                            <article id={`credential-experience-${education.id}`} key={education.id} className="resume-credential-item scroll-mt-24 rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <h4 className="resume-subtitle font-black text-slate-800">{education.title}</h4>
                                  <p className="resume-meta mt-0.5 font-semibold text-slate-500">{education.institutionName}</p>
                                </div>
                                <span className="resume-print-plain resume-label shrink-0 rounded border border-blue-100 bg-blue-50 px-2 py-1 font-bold text-blue-700">
                                  {formatCredentialPeriod(education)}
                                </span>
                              </div>
                              {education.summary && (
                                <div className="resume-body mt-3 text-slate-600">
                                  <ReactMarkdown components={resumeMarkdownComponents}>{education.summary}</ReactMarkdown>
                                </div>
                              )}
                              {education.skills.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                  {education.skills.map((skill) => <span key={skill.id} className={badgeStyle}>{skill.name}</span>)}
                                </div>
                              )}
                              <RelatedStudyNotes experienceId={education.id} refSectionId={`credential-experience-${education.id}`} onOpenStudy={openStudy} />
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="resume-body rounded-xl border border-dashed border-slate-200 p-4 text-slate-400">등록된 학력·교육 정보가 없습니다.</p>
                      )}
                    </div>

                    <div className="resume-credential-group">
                      <h3 className="resume-credential-group-title resume-item-title mb-4 flex items-center gap-2 font-black text-slate-800">
                        <Award className="h-4 w-4 text-amber-600" />
                        자격증
                        <span className="resume-credential-count resume-meta rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-700">{certificateExperiences.length}개</span>
                      </h3>

                      {certificateExperiences.length > 0 ? (
                        <div className="resume-credential-list space-y-3">
                          {certificateExperiences.map((certificate) => (
                            <article id={`credential-experience-${certificate.id}`} key={certificate.id} className="resume-credential-item scroll-mt-24 rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <h4 className="resume-subtitle font-black text-slate-800">{certificate.title}</h4>
                                  <p className="resume-meta mt-0.5 font-semibold text-slate-500">{certificate.issuer}</p>
                                </div>
                                <span className="resume-print-plain resume-label shrink-0 rounded border border-amber-100 bg-amber-50 px-2 py-1 font-bold text-amber-700">
                                  {formatCredentialPeriod(certificate)} 취득
                                </span>
                              </div>
                              {certificate.summary && (
                                <div className="resume-body mt-3 text-slate-600">
                                  <ReactMarkdown components={resumeMarkdownComponents}>{certificate.summary}</ReactMarkdown>
                                </div>
                              )}
                              <RelatedStudyNotes experienceId={certificate.id} refSectionId={`credential-experience-${certificate.id}`} onOpenStudy={openStudy} />
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="resume-body rounded-xl border border-dashed border-slate-200 p-4 text-slate-400">등록된 자격증 정보가 없습니다.</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 4: 핵심 프로젝트 포트폴리오 */}
              <section id="projects" className="scroll-mt-24 space-y-6">
                <div className={cardStyle}>
                  <div className="resume-projects-header border-b border-slate-100 pb-4">
                    <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                      <Briefcase className="h-5 w-5 text-slate-900" />
                      핵심 프로젝트 포트폴리오
                    </h2>
                    <p className="resume-section-description mt-1 text-slate-500">담당 역할, 설계 세부 사항, 핵심 성과 및 실무 성과에 대한 타임라인 상세입니다.</p>
                  </div>

                  <div className="resume-project-list mt-8 space-y-8 relative before:absolute before:top-4 before:bottom-4 before:left-[15px] before:w-[2px] before:bg-slate-200">
                    {activeMilestones.map((m, idx) => (
                      <div
                        key={m.id}
                        id={`project-experience-${m.experienceId ?? m.id}`}
                        className="resume-project-item relative pl-10 group cursor-pointer"
                        onClick={() => setSelectedMilestoneId(m.id)}
                      >
                        
                        {/* Timeline Bullet node */}
                        <div className={`resume-project-bullet absolute left-[7px] top-1.5 w-[18px] h-[18px] rounded-full border-4 border-white transition-colors shadow-sm z-10 ${
                          selectedMilestoneId === m.id
                            ? 'bg-slate-900 scale-110'
                            : 'bg-slate-300 group-hover:bg-slate-500'
                        }`} />
                        
                        <div className={`resume-project-card rounded-xl border p-6 space-y-4 transition-all duration-300 shadow-sm ${
                          selectedMilestoneId === m.id
                            ? 'border-slate-800 bg-white ring-2 ring-slate-100/50'
                            : 'border-slate-200/80 bg-slate-50/50 hover:border-slate-400 hover:bg-white'
                        }`}>
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div>
                              <span className="resume-print-plain resume-meta inline-flex rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-950 border border-slate-200">
                                {m.role} ({m.period})
                              </span>
                              <h3 className="resume-item-title mt-1.5 font-black text-slate-800">
                                {m.title}
                              </h3>
                            </div>
                            <span className="resume-print-plain resume-meta shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-400">
                              기여도 {idx === 0 || idx === 2 ? '100%' : idx === 1 ? '70%' : '43%'}
                            </span>
                          </div>

                          <div className="space-y-3.5">
                            <div>
                              <h4 className="resume-label font-bold text-slate-400 uppercase tracking-wider">프로젝트 설명 및 역할</h4>
                              <div className="resume-project-description resume-body mt-1 rounded-lg border border-slate-100 bg-white p-3 font-normal text-slate-600">
                                <ReactMarkdown components={resumeMarkdownComponents}>{m.description}</ReactMarkdown>
                              </div>
                            </div>

                            <div className="resume-project-takeaway rounded-lg border border-emerald-100 bg-emerald-50/30 p-3.5">
                              <h4 className="resume-label flex items-center gap-1 font-bold text-emerald-700">
                                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                                핵심 성과 & 배운 점 (Takeaway)
                              </h4>
                              <div className="resume-body mt-1 font-semibold text-emerald-800">
                                <ReactMarkdown components={resumeMarkdownComponents}>{m.takeaway}</ReactMarkdown>
                              </div>
                            </div>

                            <div>
                              <h4 className="resume-label mb-1.5 font-bold text-slate-400 uppercase tracking-wider">활용 기술 스택</h4>
                              <div className="flex flex-wrap gap-1">
                                {m.skills.map((skill) => (
                                  <span key={skill} className={badgeStyle}>
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {m.repositoryUrl && (
                              <div>
                                <a
                                  href={m.repositoryUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                                >
                                  <Github className="h-4 w-4" />
                                  GitHub 저장소
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            )}

                            {m.tags.length > 0 && (
                              <div>
                                <h4 className="resume-label mb-1.5 font-bold text-slate-400 uppercase tracking-wider">태그</h4>
                                <div className="flex flex-wrap gap-1">
                                  {m.tags.map((tag) => (
                                    <span key={tag} className="resume-badge rounded-md bg-blue-50 px-2 py-1 font-bold text-blue-700">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {m.experienceId && (
                              <>
                                <RelatedStudyNotes experienceId={m.experienceId} onOpenStudy={openStudy} />
                                <RelatedExperienceLinks experienceId={m.experienceId} onNavigate={navigateToRelatedExperience} />
                              </>
                            )}
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              </section>

            </div>

            {/* Right Sticky Sidebar Column */}
            <aside className="block print:hidden w-full sticky top-24 self-start">
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-md backdrop-blur-md min-[900px]:border-l-4 min-[900px]:border-l-slate-300 min-[900px]:p-5 min-[900px]:space-y-5">
                <div className="hidden min-[900px]:block">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">내비게이션</h3>
                  <p className="text-sm text-slate-500 leading-none mt-0.5">
                    클릭하면 해당 섹션으로 부드럽게 이동합니다.
                  </p>
                </div>
                
                <div className="hidden min-[900px]:block relative pl-4 before:absolute before:top-2.5 before:bottom-2.5 before:left-[4px] before:w-[2px] before:bg-slate-200">
                  {mainSections.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => scrollToSection(step.id)}
                      className="group flex items-start gap-3 w-full text-left py-2.5 relative transition-all duration-200"
                    >
                      <div className={`absolute left-[-15px] top-[14px] w-2 h-2 rounded-full border border-white transition-all duration-300 z-10 ${
                        activeSection === step.id
                          ? 'bg-slate-900 scale-125 ring-4 ring-slate-200'
                          : 'bg-slate-300 group-hover:bg-slate-500'
                      }`} />
                      
                      <span className={`rounded-lg px-2 py-1 text-sm font-bold leading-tight transition-all duration-200 ${
                        activeSection === step.id
                          ? 'bg-slate-100 text-slate-900 font-extrabold'
                          : 'text-slate-600 hover:bg-slate-100/60 hover:text-slate-950'
                      }`}>
                        {step.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative flex flex-col items-center gap-2 py-1.5 min-[900px]:hidden before:absolute before:bottom-5 before:top-5 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-slate-200">
                  {mainSections.map((step) => {
                    const Icon = step.icon;
                    return (
                      <button
                        key={step.id}
                        onClick={() => scrollToSection(step.id)}
                        title={step.label}
                        aria-label={step.label}
                        className={`relative z-10 grid h-8 w-8 place-items-center rounded-full border transition-all duration-200 ${
                          activeSection === step.id
                            ? 'border-slate-300 bg-slate-900 text-white shadow-sm shadow-slate-800/20 ring-4 ring-slate-200'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>

                <hr className="hidden border-slate-100 min-[900px]:block" />

                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="mt-2 grid h-8 w-full place-items-center rounded-lg border border-slate-200 bg-white text-sm font-extrabold text-slate-500 transition hover:border-slate-300 hover:text-slate-900 min-[900px]:mt-0 min-[900px]:flex min-[900px]:items-center min-[900px]:justify-center min-[900px]:gap-1 min-[900px]:py-2"
                  title="위로 가기"
                  aria-label="위로 가기"
                >
                  <span className="min-[900px]:hidden">↑</span>
                  <span className="hidden min-[900px]:inline">위로 가기</span>
                </button>
              </div>
            </aside>

          </div>
        ) : activePage === 'architecture' ? (
          /* SYSTEM ARCHITECTURE PAGE */
          <div className="mx-auto max-w-6xl space-y-8 animate-fadeIn pb-12 print:hidden">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] backdrop-blur-md">
              <div className="absolute top-0 right-0 w-80 h-80 bg-slate-800/5 rounded-full filter blur-[50px] -mr-16 -mt-16 pointer-events-none" />
              <div className="relative z-10 border-b border-slate-100 pb-5">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                  <Terminal className="h-6 w-6 text-slate-900" />
                  시스템 아키텍처 (Self-Intro Architecture)
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-500 font-normal leading-relaxed">
                  이 포트폴리오 웹앱을 구동하고 데이터를 서빙하는 풀스택 컨테이너 인프라 설계 명세입니다.
                </p>
              </div>

              <div className="relative z-10 mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-5 shadow-sm">
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-3">
                    <span className="p-1.5 rounded bg-slate-100 leading-none">💻</span>
                    Backend Layer
                  </h2>
                  <ul className="text-base sm:text-lg text-slate-600 space-y-2 leading-relaxed font-normal">
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
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-3">
                    <span className="p-1.5 rounded bg-slate-100 leading-none">🎨</span>
                    Frontend Layer
                  </h2>
                  <ul className="text-base sm:text-lg text-slate-600 space-y-2 leading-relaxed font-normal">
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
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-3">
                    <span className="p-1.5 rounded bg-slate-100 leading-none">☸️</span>
                    DevOps & GitOps
                  </h2>
                  <ul className="text-base sm:text-lg text-slate-600 space-y-2 leading-relaxed font-normal">
                    <li>
                      <strong className="text-slate-900 font-bold">Cloudflare Pages CDN</strong>: 프론트엔드 정적 빌드 파일을 전 세계 엣지 노드에 초고속 캐싱 및 배포
                    </li>
                    <li>
                      <strong className="text-slate-900 font-bold">GitHub Actions & OCIR</strong>: 백엔드 푸시 시 ARM64 네이티브 컨테이너 이미지 자동 빌드 및 Oracle OCI Registry 배포
                    </li>
                    <li>
                      <strong className="text-slate-900 font-bold">Argo CD 자동 동기화</strong>: k8s 배포 매니페스트 변경을 Argo CD가 실시간 감지하여 OKE 클러스터에 무중단 롤아웃 배포
                    </li>
                    <li>
                      <strong className="text-slate-900 font-bold">Sealed Secrets 보안</strong>: DB 비밀번호 등 민감 데이터를 비대칭 키로 안전하게 암호화하여 Git에 안심하고 형상 관리
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.12)]">
              <h2 className="text-base sm:text-lg font-black text-slate-100 mb-3 flex items-center gap-1.5">
                <span>☸️</span>
                <span>실제 운영(Production) 시스템 아키텍처 및 배포 흐름도</span>
              </h2>
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
        ) : (
          /* STUDY PAGE */
          <div className="space-y-4 animate-fadeIn">
            {selectedStudySlug && (
              <div className="flex items-center justify-between pb-1">
                <button onClick={closeStudy} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950">
                  <ArrowLeft className="h-4 w-4" /> {referrer ? '이전 화면으로' : 'Study 목록'}
                </button>
              </div>
            )}
            <div className="grid grid-cols-[minmax(0,1fr)_52px] gap-4 sm:gap-6 min-[900px]:grid-cols-[minmax(0,1fr)_240px] print:block relative items-start pb-12">
              
              {/* Main Content Column */}
              <div className="min-w-0 space-y-8">
                {selectedStudySlug ? (
                  <>
                    {selectedStudy && (
                      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
                      <div className="mb-8 border-b border-slate-100 pb-6">
                        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">{selectedStudy.category.name}</span>
                          <span className="font-mono">{selectedStudy.learnedAt}</span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{selectedStudy.title}</h1>
                        <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-500">{selectedStudy.summary}</p>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {selectedStudy.tags.map((tag) => <span key={tag.id} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">#{tag.name}</span>)}
                          {selectedStudy.skills.map((skill) => <span key={skill.id} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600">{skill.name}</span>)}
                        </div>
                      </div>
                      <div className="space-y-4 text-base sm:text-lg leading-relaxed text-slate-700">
                        <ReactMarkdown components={markdownComponents}>{selectedStudy.contentMarkdown}</ReactMarkdown>
                      </div>
                    </article>
                  )}
                </>
              ) : (
                <>
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="absolute right-0 top-0 h-80 w-80 -translate-y-16 translate-x-16 rounded-full bg-slate-800/5 blur-[50px]" />
                    <div className="relative">
                      <h1 className="text-3xl font-black tracking-tight text-slate-900">Study</h1>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500 sm:text-base">학습 내용과 실제 프로젝트 적용 경험을 연결해 기록하는 기술 아카이브입니다.</p>
                    </div>
                  </div>
                  <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[{ slug: 'ALL', name: '전체' }, ...(studyCategories ?? [])].map((category) => (
                        <button key={category.slug} onClick={() => setActiveCategory(category.slug)} className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${activeCategory === category.slug ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{category.name}</button>
                      ))}
                    </div>
                    <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="제목, 본문, 태그, 기술 검색..." className="w-full rounded-xl border border-slate-200 px-4 py-2 text-xs outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-200 sm:w-72" />
                  </div>
                  <div className="space-y-5">
                    {studies.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-sm font-semibold text-slate-400">검색 조건에 맞는 Study가 없습니다.</div>
                    ) : studies.map((study) => (
                      <button key={study.id} onClick={() => openStudy(study.slug)} className="block w-full rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-8">
                        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <span className="rounded bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">{study.category.name}</span>
                          <span className="font-mono text-xs font-bold text-slate-400">{study.learnedAt}</span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900">{study.title}</h2>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{study.summary}</p>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {study.tags.map((tag) => <span key={tag.id} className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">#{tag.name}</span>)}
                          {study.skills.map((skill) => <span key={skill.id} className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">{skill.name}</span>)}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Right Sticky Sidebar Column */}
            <aside className="block print:hidden w-full sticky top-24 self-start">
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-md backdrop-blur-md min-[900px]:border-l-4 min-[900px]:border-l-slate-300 min-[900px]:p-5 min-[900px]:space-y-5">
                {selectedStudySlug ? (
                  /* Detail View Sidebar */
                  <>
                    <div className="hidden min-[900px]:block">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">연결 항목</h3>
                      <p className="text-sm text-slate-500 leading-none mt-0.5">
                        이 학습과 연관된 이력 정보입니다.
                      </p>
                    </div>

                    <div className="hidden min-[900px]:block space-y-4">
                      {selectedStudy && selectedStudy.experiences.length > 0 && (
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-400 mb-1">관련 프로젝트·경력</h4>
                          <div className="space-y-1.5">
                            {selectedStudy.experiences.map((experience) => (
                              <p key={experience.id} className="text-xs leading-normal text-slate-600">
                                <span className="mr-1.5 font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1 py-0.5 rounded">{experience.type}</span>
                                {experience.title}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedStudy && selectedStudy.experienceDetails.length > 0 && (
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-400 mb-1">관련 경력 항목</h4>
                          <div className="space-y-1.5">
                            {selectedStudy.experienceDetails.map((detail) => (
                              <button
                                key={detail.id}
                                onClick={() => navigate(pathForExperienceDetail(detail.id))}
                                className="flex w-full items-start gap-1 text-left text-xs font-semibold text-slate-600 hover:text-slate-950 leading-normal"
                              >
                                <span className="mt-0.5 text-slate-400 font-bold shrink-0">›</span>
                                <span>{detail.content}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedStudy && selectedStudy.relatedStudies.length > 0 && (
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-400 mb-1">관련 Study</h4>
                          <div className="space-y-1.5">
                            {selectedStudy.relatedStudies.map((related) => (
                              <button
                                key={`${related.id}-${related.type}`}
                                onClick={() => openStudy(related.slug)}
                                className="flex w-full items-start gap-1 text-left text-xs font-semibold text-slate-600 hover:text-slate-905 leading-normal"
                              >
                                <span className="mt-0.5 text-slate-400 font-bold shrink-0">▪</span>
                                <span>{related.title}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedStudy && selectedStudy.experiences.length === 0 && selectedStudy.experienceDetails.length === 0 && selectedStudy.relatedStudies.length === 0 && (
                        <p className="text-xs font-bold text-slate-400 italic">연결된 이력 항목이 없습니다.</p>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-2 py-1 min-[900px]:hidden">
                      <button
                        onClick={closeStudy}
                        title="Study 목록"
                        className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 shadow-sm"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  /* List View Sidebar */
                  <>
                    <div className="hidden min-[900px]:block">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">최근 작성글</h3>
                      <p className="text-sm text-slate-500 leading-none mt-0.5">
                        최근 등록된 학습 기록입니다.
                      </p>
                    </div>

                    <div className="hidden min-[900px]:block space-y-2">
                      {studies.slice(0, 5).map((study) => (
                        <button
                          key={study.id}
                          onClick={() => openStudy(study.slug)}
                          className="block w-full text-left text-xs font-semibold text-slate-600 hover:text-slate-900 transition truncate leading-relaxed"
                          title={study.title}
                        >
                          • {study.title}
                        </button>
                      ))}
                      {studies.length === 0 && (
                        <p className="text-xs font-bold text-slate-400 italic">등록된 글이 없습니다.</p>
                      )}
                    </div>
                  </>
                )}

                <hr className="hidden border-slate-100 min-[900px]:block" />

                <div className="flex flex-col gap-2 w-full">
                  {selectedStudySlug && (
                    <button
                      onClick={closeStudy}
                      className="hidden min-[900px]:flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-xs font-extrabold text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      {referrer ? '이전 화면으로' : '목록으로'}
                    </button>
                  )}
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="grid h-8 w-full place-items-center rounded-lg border border-slate-200 bg-white text-sm font-extrabold text-slate-500 transition hover:border-slate-300 hover:text-slate-900 min-[900px]:flex min-[900px]:items-center min-[900px]:justify-center min-[900px]:gap-1 min-[900px]:py-2"
                    title="위로 가기"
                  >
                    <span className="min-[900px]:hidden">↑</span>
                    <span className="hidden min-[900px]:inline">위로 가기</span>
                  </button>
                </div>
              </div>
            </aside>

          </div>
        </div>
        )}
        </div>
      </main>
      <a
        href={KAKAOPAY_DONATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-[#FEE500] px-5 text-sm font-black text-slate-900 shadow-lg shadow-amber-500/30 transition hover:brightness-95 hover:shadow-xl print:hidden"
        title="카카오페이로 후원하기"
      >
        <MessageCircle className="h-4 w-4" />
        <span>후원하기</span>
      </a>
    </>
  );
}
