import { Fragment, useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ExternalLink,
  FolderGit2,
  Award,
  GraduationCap,
  Eye,
  EyeOff,
  Pin,
  PinOff,
  Heart,
  GripVertical,
  MoveVertical,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { architectureApi, bffApi, connectionApi, donationApi, printTemplateApi, studyApi, visitorApi, type Skill, type ExperienceDetail, type Experience, type IntroductionResponse, type RelatedExperience } from './lib/api';
import { useIntroStore } from './store/useIntroStore';
import { DonationModal } from './components/DonationModal';
import { PrintModeModal } from './components/PrintModeModal';
import { PrintPreviewBar } from './components/PrintPreviewBar';
import { PrintPreviewNav } from './components/PrintPreviewNav';
import { SaveServerTemplateModal } from './components/SaveServerTemplateModal';
import { markdownComponents, resumeMarkdownComponents } from './lib/markdown';
import { SkillBadgeIcon } from './lib/SkillBadgeIcon';
import { navigate, pagePaths, pathForExperienceDetail, pathForStudy } from './lib/navigation';
import { saveLocal, generateUniqueLocalName, getLocalSaves } from './lib/printTemplateLocal';
import { PdfPageLayer } from './components/PdfPageLayer';
import { partitionAtomsIntoPages, type PrintAtomItem } from './lib/pdfLayoutEngine';

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
    contributionRate: 100,
    details: [] as ExperienceDetail[],
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
    contributionRate: 70,
    details: [] as ExperienceDetail[],
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
    contributionRate: 100,
    details: [] as ExperienceDetail[],
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
    contributionRate: 43,
    details: [] as ExperienceDetail[],
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
    id: 'experience' as const,
    label: '경험',
    shortLabel: '경험',
    description: '경력, 프로젝트, 학력, 자격증 모음',
    icon: Briefcase,
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

const experienceTypeTabs = [
  { id: 'ALL' as const, label: '전체' },
  { id: 'CAREER' as const, label: '경력' },
  { id: 'PROJECT' as const, label: '프로젝트' },
  { id: 'EDUCATION' as const, label: '학력' },
  { id: 'CERTIFICATE' as const, label: '자격증' },
];

type ExperienceTypeFilter = (typeof experienceTypeTabs)[number]['id'];

function getPageFromPath(pathname: string): PageId {
  if (pathname === '/architecture' || pathname.startsWith('/architecture/')) return 'architecture';
  if (pathname === '/study' || pathname.startsWith('/study/')) return 'blog';
  if (pathname === '/experience' || pathname.startsWith('/experience-detail/')) return 'experience';
  return 'intro';
}

function getExperienceDetailIdFromPath(pathname: string): number | null {
  const match = pathname.match(/^\/experience-detail\/(\d+)\/?$/)?.[1];
  return match ? Number(match) : null;
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

function experienceTypeLabel(type: Experience['type']): string {
  switch (type) {
    case 'CAREER': return '경력';
    case 'PROJECT': return '프로젝트';
    case 'EDUCATION': return '학력·교육';
    case 'CERTIFICATE': return '자격증';
    default: return type;
  }
}

function credentialKindLabel(experience: Experience): '학력' | '교육' | '자격증' {
  if (experience.type === 'CERTIFICATE') return '자격증';
  // 현재 EDUCATION 데이터에는 별도 하위 유형이 없어 학위 표현으로 정규 학력을 구분한다.
  return /(학사|석사|박사|학위|졸업)/.test(experience.title) ? '학력' : '교육';
}

function experienceOrgName(exp: Experience): string {
  return exp.companyName ?? exp.institutionName ?? exp.issuer ?? exp.role ?? '';
}

const mainSections = [
  { id: 'intro-profile', label: '프로필', icon: User },
  { id: 'timeline', label: '커리어 & 학습 타임라인', icon: Calendar },
  { id: 'skills', label: '기술 스택', icon: Cpu },
  { id: 'competencies', label: '핵심 역량', icon: Sparkles },
  { id: 'career', label: '직장 경력', icon: Briefcase },
  { id: 'projects', label: '핵심 프로젝트', icon: Briefcase },
  { id: 'credentials', label: '학력·교육 및 자격증', icon: GraduationCap },
];

const printableSections = mainSections.filter((s) => s.id !== 'timeline');
/** 프로필은 인쇄 프리뷰에서 제외/이동이 불가능하게 고정된다 */
const LOCKED_PRINT_SECTION_ID = 'intro-profile';
const reorderablePrintSections = printableSections.filter((s) => s.id !== LOCKED_PRINT_SECTION_ID);

/**
 * A4 페이지 계산 상수.
 * 실제 출력은 @page의 12mm/14mm 여백으로 동일한 182×273mm 콘텐츠 영역을 사용한다.
 */
const MM_TO_PX = 96 / 25.4;
/** 상단 12mm, 하단 12mm 칼대칭으로 가용 높이를 273mm(297 - 12 - 12)로 정확히 보정 */
const PRINT_PAGE_CONTENT_PX = 273 * MM_TO_PX;
const PRINT_PAGE_PAD_TOP_PX = 12 * MM_TO_PX;
const PRINT_SHEET_H_PX = 297 * MM_TO_PX;
/** 프리뷰에서 A4 낱장 사이 회색 책상 간격(px) */
const PRINT_DESK_GAP_PX = 28;
/** 페이지가 넘어갈 때 프리뷰 흐름에 삽입되는 추가 높이 = 이전 장 하단여백 + 책상 + 다음 장 상단여백 */
const PRINT_PAGE_JUMP_EXTRA_PX = PRINT_SHEET_H_PX - PRINT_PAGE_CONTENT_PX + PRINT_DESK_GAP_PX;

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

const architectureSections = [
  { id: 'architecture-components', label: '구성 요소', icon: Cpu },
  { id: 'architecture-diagram', label: '배포 흐름도', icon: Terminal },
];

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

/**
 * 인쇄 프리뷰 컨트롤 컴포넌트들.
 * 주의: App 내부에 인라인으로 정의하면 렌더마다 컴포넌트 identity가 바뀌어 React가 매번
 * 언마운트/리마운트하고, 드래그 도중 state가 바뀌면 드래그 중인 DOM이 사라져
 * 네이티브 드래그 세션이 죽는 버그가 있었다. 반드시 모듈 스코프에 둔다.
 */

/** 호버 시 요소 왼편에 나타나는 핀 고정/제외 토글 버튼 (스크린샷 82 핀 기능 복원) */
function PrintEyeButton({ id, excluded, onToggle }: { id: string; excluded: boolean; onToggle: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(id); }}
      title={excluded ? '핀 고정하여 인쇄 포함' : '핀 해제하여 인쇄 제외'}
      className={`grid h-7 w-7 place-items-center rounded-full shadow-xl transition-all duration-200 ${
        excluded
          ? 'bg-slate-700/90 text-white hover:bg-slate-800 hover:scale-110'
          : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-110'
      }`}
    >
      {excluded ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
    </button>
  );
}

/** 스크린샷 97 피그마 캔버스 100% 직대응 낱장 A4 프레임 카드 렌더러. 상하단 페이지 이동 기준 가이드라인 표시 */
function PrintSheets({ contentTop, pages }: { contentTop: number; pages: number }) {
  return (
    <div data-print-preview-ui aria-hidden className="pointer-events-none absolute inset-x-0 top-0 print:hidden">
      {Array.from({ length: pages }, (_, i) => (
        <div
          key={i}
          className="print-page-frame-card absolute inset-x-0 rounded-md bg-white shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-slate-300/90"
          style={{
            top: contentTop - PRINT_PAGE_PAD_TOP_PX + i * (PRINT_SHEET_H_PX + PRINT_DESK_GAP_PX),
            height: PRINT_SHEET_H_PX,
          }}
        >
          {/* 피그마 프레임 라벨 (스크린샷 97 1페이지, 2페이지, 3페이지...) */}
          <div className="absolute -top-7 left-0 flex items-center gap-1.5 rounded-t-md bg-slate-900/90 px-3 py-1 text-[11px] font-extrabold text-white shadow-md backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
            <span>{i + 1}페이지 (A4)</span>
          </div>

          {/* 상단 페이지 시작 경계 가이드라인 (12mm) */}
          <div className="absolute inset-x-0 top-[12mm] border-b border-dashed border-blue-400/60 pointer-events-none">
            <span className="absolute -top-2.5 left-4 bg-blue-500 text-white px-1.5 py-0.5 text-[8px] font-bold rounded shadow-sm opacity-70">
              TOP (12mm)
            </span>
          </div>

          {/* 하단 페이지 이동 분할 기준선 (285mm = 하단 12mm 대칭 여백 지점) */}
          <div className="absolute inset-x-0 top-[285mm] border-b-2 border-dashed border-rose-500/80 pointer-events-none">
            <span className="absolute -top-2.5 right-16 bg-rose-500 text-white px-2 py-0.5 text-[9px] font-extrabold rounded shadow-md animate-pulse">
              BOTTOM BOUNDARY (285mm / 하단 12mm)
            </span>
          </div>

          {/* 우하단 페이지 번호 */}
          <span className="absolute bottom-3 right-4 text-[10px] font-black tracking-wide text-slate-400">
            {i + 1} / {pages}
          </span>
        </div>
      ))}
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
  const [isDonationOpen, setDonationOpen] = useState(false);
  const { data: donationConfig } = useQuery({
    queryKey: ['donationConfig'],
    queryFn: donationApi.config,
    staleTime: 5 * 60 * 1000,
  });
  const isDonationEnabled = donationConfig?.enabled === true;
  const [isPrintPreviewMode, setPrintPreviewMode] = useState(() => {
    return new URLSearchParams(window.location.search).get('mode') === 'print';
  });
  const [zoom, setZoom] = useState(1.0);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // URL mode parameter sync
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentMode = params.get('mode');
    if (isPrintPreviewMode) {
      if (currentMode !== 'print') {
        params.set('mode', 'print');
        window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
      }
    } else {
      if (currentMode === 'print') {
        params.delete('mode');
        const qs = params.toString();
        window.history.pushState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
      }
    }
  }, [isPrintPreviewMode]);

  // Handle back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const isPrint = new URLSearchParams(window.location.search).get('mode') === 'print';
      setPrintPreviewMode(isPrint);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 캔버스 마우스 휠 및 트랙패드 핀치 줌 리스너
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isPrintPreviewMode) return;

    const handleWheel = (e: WheelEvent) => {
      // Ctrl 또는 Cmd 키를 누른 채 휠 동작 시 줌 렌더링 제어
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY;
        setZoom((prev) => {
          const next = prev + (delta > 0 ? 0.05 : -0.05);
          return Math.min(Math.max(next, 0.3), 2.0); // 30% ~ 200%
        });
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [isPrintPreviewMode]);

  const handleZoomFit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasWidth = canvas.clientWidth;
    const padding = 64; // 안전 여백
    const fitZoom = (canvasWidth - padding) / 794;
    setZoom(Math.min(Math.max(fitZoom, 0.3), 2.0));
  };

  const [printExcludedIds, setPrintExcludedIds] = useState<string[]>([]);
  const [printSectionOrder, setPrintSectionOrder] = useState<string[]>(() => reorderablePrintSections.map((s) => s.id));
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after' | null>(null);
  /**
   * 현재 드래그 중인 섹션의 "진짜" 상태 — React state(위 draggedSectionId)는 setState 직후
   * 리렌더가 끝나야 반영되는데, dragstart→dragover가 그 전에 연달아 발생하면 아직 갱신 전 값(null 등)을
   * 참조해 onDragOver가 조기 return하며 preventDefault를 건너뛰어 드롭 자체가 막히는 문제가 있었다.
   * ref는 동기적으로 즉시 갱신되므로 onDragOver/onDrop의 판정은 반드시 이 ref만 본다.
   */
  const dragRef = useRef<{ kind: 'section'; id: string } | null>(null);
  /** 섹션 위쪽에 삽입되는 여백(px). 실제 인쇄에도 반영되어 페이지 넘김 위치를 조절한다. */
  const [sectionGaps, setSectionGaps] = useState<Record<string, number>>({});
  /** 특정 원자 항목의 강제 페이지 지정 오버라이드 ({ [atomId]: forcedPageIndex }) */
  const [forcedPageOverrides, setForcedPageOverrides] = useState<Record<string, number>>({});
  /** A4 페이지 오버레이 계산 결과 (총 페이지 수, 오버레이 시작 y, 마지막 페이지 채움 높이) */
  const [printPageMetrics, setPrintPageMetrics] = useState<{ pages: number; contentTop: number } | null>(null);
  const [printPending, setPrintPending] = useState(false);
  /** print 미디어로 전환되는 동안 ResizeObserver가 화면용 페이지 마커를 다시 쓰지 못하게 잠근다. */
  const printLayoutFrozenRef = useRef(false);
  /** 폰트·이미지 로딩 직후 최신 좌표로 한 번 더 동기 패킹하기 위한 콜백. */
  const recomputePrintLayoutRef = useRef<(() => void) | null>(null);
  /** xl 미만 화면에서 구성 관리 패널을 드로어로 여닫는 상태 (넓은 화면에서는 무시하고 항상 표시) */
  const [navPanelOpen, setNavPanelOpen] = useState(false);
  const [isPrintModeDialogOpen, setPrintModeDialogOpen] = useState(false);
  const [isSaveServerModalOpen, setSaveServerModalOpen] = useState(false);

  const isPreviewMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('preview') === '1' && params.get('adminEdit') !== '1';
  }, []);

  const isPrintModeParam = useMemo(
    () => new URLSearchParams(window.location.search).get('printMode') === '1',
    [],
  );

  const isAdminEditParam = useMemo(
    () => new URLSearchParams(window.location.search).get('adminEdit') === '1',
    [],
  );

  const adminTemplateIdParam = useMemo(
    () => new URLSearchParams(window.location.search).get('templateId'),
    [],
  );

  const [adminTemplateName, setAdminTemplateName] = useState('새 인쇄 템플릿');
  const [adminTemplateVisible, setAdminTemplateVisible] = useState(true);

  // 어드민 템플릿 수정 진입 시 기존 템플릿 정보 로드
  useEffect(() => {
    if (!isAdminEditParam) return;
    if (adminTemplateIdParam) {
      printTemplateApi
        .adminList()
        .then((list) => {
          const found = list.find((t) => t.id === Number(adminTemplateIdParam));
          if (found) {
            setAdminTemplateName(found.name);
            setAdminTemplateVisible(found.visible);
            setPrintExcludedIds(found.excludedIds || []);
            if (found.sectionOrder && found.sectionOrder.length > 0) {
              const allIds = reorderablePrintSections.map((s) => s.id);
              const merged = [...found.sectionOrder.filter((id) => allIds.includes(id)), ...allIds.filter((id) => !found.sectionOrder.includes(id))];
              setPrintSectionOrder(merged);
            }
            if (found.sectionGaps) {
              setSectionGaps(found.sectionGaps);
            }
          }
        })
        .catch(console.error);
    } else {
      setAdminTemplateName('새 인쇄 템플릿');
      setAdminTemplateVisible(true);
    }
  }, [isAdminEditParam, adminTemplateIdParam]);

  // printMode=1 인 경우 페이지 진입 시 자동으로 인쇄 프리뷰 모드 켬
  useEffect(() => {
    if (isPrintModeParam) {
      setPrintPreviewMode(true);
      setExpandedCareerDetailIds(expandableDetailIds);
      setExpandedCareerProjectIds(expandableCareerProjectIds);
      setExpandedCompetencyIds(orderedCompetencies.map((c) => c.id));
      setNavPanelOpen(true); // 어드민 및 기본 프리뷰 진입 시 우측 구성관리 사이드바 자동 열림

      // 신규 작성이나 기본 인쇄 진입 시에만 초기화 진행 (기존 템플릿 수정이 아닐 때)
      if (!adminTemplateIdParam) {
        setPrintExcludedIds([]);
        setPrintSectionOrder(reorderablePrintSections.map((s) => s.id));
        setSectionGaps({});
      }
    }
  }, [isPrintModeParam, adminTemplateIdParam]);

  /** 관리자 템플릿 저장 (서버 DB에 POST/PUT 처리 후 부모 창에 알림) */
  const handleAdminSaveServerTemplate = async () => {
    const trimmed = adminTemplateName.trim();
    if (!trimmed) {
      alert('템플릿 이름을 입력해 주세요.');
      return;
    }

    const payload = {
      name: trimmed,
      excludedIds: JSON.stringify(printExcludedIds),
      sectionOrder: JSON.stringify(printSectionOrder),
      sectionGaps: JSON.stringify(sectionGaps),
      visible: adminTemplateVisible,
      displayOrder: 1,
    };

    try {
      if (adminTemplateIdParam) {
        await printTemplateApi.update(Number(adminTemplateIdParam), payload);
        alert(`'${trimmed}' 템플릿이 성공적으로 수정되었습니다.`);
      } else {
        await printTemplateApi.create(payload);
        alert(`'${trimmed}' 템플릿이 성공적으로 저장되었습니다.`);
      }
      window.parent.postMessage({ type: 'SAVE_ADMIN_TEMPLATE_SUCCESS' }, '*');
    } catch (err) {
      console.error(err);
      alert('템플릿 저장 중 오류가 발생했습니다.');
    }
  };

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
  const [selectedExperienceDetailId, setSelectedExperienceDetailId] = useState(() => getExperienceDetailIdFromPath(window.location.pathname));
  const [experienceTypeFilter, setExperienceTypeFilter] = useState<ExperienceTypeFilter>('ALL');
  const [experienceSearch, setExperienceSearch] = useState('');
  const [isPageMenuOpen, setIsPageMenuOpen] = useState(false);
  const [isSectionNavCollapsed, setIsSectionNavCollapsed] = useState(false);
  const [selectedCoreSkillId, setSelectedCoreSkillId] = useState<number | null>(null);
  const [expandedCareerDetailIds, setExpandedCareerDetailIds] = useState<number[]>([]);
  const [expandedCareerProjectIds, setExpandedCareerProjectIds] = useState<number[]>([]);
  const [expandedCompetencyIds, setExpandedCompetencyIds] = useState<number[]>([]);
  const [selectedTimelineYear, setSelectedTimelineYear] = useState<number | null>(null);
  // Where to return to when the user leaves a detail view (study article or
  // experience detail) via its own back button. Captured automatically from
  // the current URL whenever such a detail is opened by clicking something
  // in-app, so "뒤로가기" always lands back on whatever screen — intro
  // section, another study, another experience detail, etc. — the user was
  // actually on. Stays null when the detail was opened by a direct link /
  // page refresh, since there is no meaningful in-app screen to return to.
  const [referrer, setReferrer] = useState<{ path: string; sectionId?: string } | null>(null);

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

  const { data: architectureOverview } = useQuery({
    queryKey: ['architecture-overview'],
    queryFn: architectureApi.getOverview,
  });

  const { data: architectureLayers } = useQuery({
    queryKey: ['architecture-layers'],
    queryFn: architectureApi.getLayers,
  });

  const { data: selectedStudy } = useQuery({
    queryKey: ['study', selectedStudySlug],
    queryFn: () => studyApi.detail(selectedStudySlug!),
    enabled: Boolean(selectedStudySlug),
  });

  const allExperiences = useMemo(
    () => [...(introData?.experiences ?? [])].sort((a, b) => b.periodStart.localeCompare(a.periodStart)),
    [introData],
  );

  const allExperienceDetails = useMemo(() => {
    return allExperiences.flatMap((exp) =>
      [...exp.details]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((detail) => ({ detail, experience: exp })),
    );
  }, [allExperiences]);

  const filteredExperienceDetails = useMemo(() => {
    const q = experienceSearch.trim().toLowerCase();
    return allExperienceDetails.filter(({ detail, experience }) => {
      if (experienceTypeFilter !== 'ALL' && experience.type !== experienceTypeFilter) return false;
      if (!q) return true;
      const haystack = [
        detail.content, detail.situation, detail.actionDetail, detail.outcome,
        experience.title, experienceOrgName(experience),
        ...detail.skills.map((s) => s.name),
        ...experience.skills.map((s) => s.name),
        ...experience.tags.map((t) => t.name),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [allExperienceDetails, experienceTypeFilter, experienceSearch]);

  const recentExperienceDetails = useMemo(() => allExperienceDetails.slice(0, 5), [allExperienceDetails]);

  const selectedExperienceDetail = useMemo(
    () => allExperienceDetails.find(({ detail }) => detail.id === selectedExperienceDetailId) ?? null,
    [allExperienceDetails, selectedExperienceDetailId],
  );

  const { data: relatedStudiesForDetail } = useQuery({
    queryKey: ['studies', 'byExperienceDetail', selectedExperienceDetailId],
    queryFn: () => studyApi.list({ experienceDetailIds: [selectedExperienceDetailId!], size: 100 }),
    enabled: selectedExperienceDetailId !== null,
  });

  useEffect(() => {
    const handlePopState = () => {
      setSelectedStudySlug(getStudySlugFromPath(window.location.pathname));
      setSelectedExperienceDetailId(getExperienceDetailIdFromPath(window.location.pathname));
      setActivePage(getPageFromPath(window.location.pathname));
      setReferrer(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let titleBeforePrint = document.title;
    const clearPrintTitle = () => {
      // 메뉴/Cmd+P로 직접 인쇄한 경우에도 print 미디어 전환 중 패킹 마커를 보존한다.
      printLayoutFrozenRef.current = true;
      titleBeforePrint = document.title;
      document.title = '';
    };
    const restorePrintTitle = () => {
      document.title = titleBeforePrint;
      printLayoutFrozenRef.current = false;
      setPrintPending(false);
    };

    window.addEventListener('beforeprint', clearPrintTitle);
    window.addEventListener('afterprint', restorePrintTitle);
    return () => {
      window.removeEventListener('beforeprint', clearPrintTitle);
      window.removeEventListener('afterprint', restorePrintTitle);
    };
  }, []);

  // 프리뷰 모드에서 body에 .print-active 클래스를 토글하여 인쇄 CSS를 적용 및 화면 좁아짐 시 자동 접기
  useEffect(() => {
    if (isPrintPreviewMode) {
      document.body.classList.add('print-active');
      const handleResize = () => {
        if (window.innerWidth < 1150) {
          setNavPanelOpen(false);
        }
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => {
        document.body.classList.remove('print-active');
        window.removeEventListener('resize', handleResize);
      };
    } else {
      document.body.classList.remove('print-active');
    }
  }, [isPrintPreviewMode]);

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
    if (introData) {
      return (introData.coreProjects ?? [])
        .map(exp => {
          const formatPeriod = (start: string, end?: string) => {
            const format = (dateStr: string) => dateStr.replace(/-/g, '.').substring(0, 7);
            return `${format(start)} - ${end ? format(end) : '진행 중'}`;
          };
          
          const label = exp.title.split(' (')[0];
          const career = exp.careerId
            ? introData.experiences.find((item) => item.id === exp.careerId && item.type === 'CAREER')
            : undefined;

          return {
            id: exp.slug ?? exp.id.toString(),
            label: label,
            period: formatPeriod(exp.periodStart, exp.periodEnd),
            title: exp.title,
            body: exp.details.map(d => d.content).join(', '),
            skills: exp.skills.map(s => s.name),
            tags: exp.tags?.map(t => t.name) ?? [],
            role: career
              ? `${career.companyName || career.title} · ${exp.role || career.role || ''}`
              : exp.role ?? '',
            description: exp.summary ?? '',
            takeaway: exp.takeaway ?? '',
            contributionRate: exp.contributionRate,
            details: [...exp.details].sort((a, b) => a.displayOrder - b.displayOrder),
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

  const orderedMilestones = activeMilestones;

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
  const orderedCompetencies = coreCompetencies;

  const careerCards = useMemo(() => {
    const formatPeriod = (start: string, end?: string) => {
      const format = (dateStr: string) => dateStr.replace(/-/g, '.').substring(0, 7);
      return `${format(start)} - ${end ? format(end) : '진행 중'}`;
    };

    if (introData?.experiences && introData.experiences.length > 0) {
      const workProjects = introData.experiences
        .filter((experience) => experience.type === 'PROJECT' && experience.careerId != null)
        .sort((a, b) => a.displayOrder - b.displayOrder);
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
          summary: exp.summary ?? '',
          details: exp.details,
          projects: workProjects.filter((project) => project.careerId === exp.id),
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
      summary: '',
      details: fallbackDetails,
      projects: [] as Experience[],
    }];
  }, [introData]);

  const orderedCareerCards = careerCards;

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

  const orderedCredentialExperiences = useMemo(() => {
    const allCreds = (introData?.experiences ?? [])
      .filter((exp) => exp.type === 'EDUCATION' || exp.type === 'CERTIFICATE');

    const rank = (exp: Experience) => {
      const kind = credentialKindLabel(exp);
      if (kind === '교육') return 1;
      if (kind === '자격증') return 2;
      if (kind === '학력') return 3;
      return 4;
    };

    return [...allCreds].sort((a, b) => {
      const rankA = rank(a);
      const rankB = rank(b);
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return b.periodStart.localeCompare(a.periodStart);
    });
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

  const toggleCareerProject = (id: number) => {
    setExpandedCareerProjectIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleCompetencyEvidence = (id: number) => {
    setExpandedCompetencyIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const expandableCompetencyIds = useMemo(
    () => orderedCompetencies
      .filter((c) => c.evidences.length > 0 || c.relatedStudies.length > 0)
      .map((c) => c.id),
    [orderedCompetencies],
  );

  const isAllCompetenciesExpanded = useMemo(
    () => expandableCompetencyIds.length > 0 && expandableCompetencyIds.every((id) => expandedCompetencyIds.includes(id)),
    [expandableCompetencyIds, expandedCompetencyIds],
  );

  const toggleExpandAllCompetencies = () => {
    setExpandedCompetencyIds(isAllCompetenciesExpanded ? [] : expandableCompetencyIds);
  };

  const getExpandableDetailIds = (details: ExperienceDetail[]) => details
    .filter(detail => Boolean(detail.situation || detail.actionDetail || detail.outcome || detail.skills.length > 0))
    .map(detail => detail.id);

  const areAllDetailsExpanded = (details: ExperienceDetail[]) => {
    const detailIds = getExpandableDetailIds(details);
    return detailIds.length > 0 && detailIds.every(id => expandedCareerDetailIds.includes(id));
  };

  const toggleAllDetails = (details: ExperienceDetail[]) => {
    const detailIds = getExpandableDetailIds(details);
    if (detailIds.length === 0) return;

    setExpandedCareerDetailIds(current => {
      const shouldCollapse = detailIds.every(id => current.includes(id));
      return shouldCollapse
        ? current.filter(id => !detailIds.includes(id))
        : [...new Set([...current, ...detailIds])];
    });
  };

  const expandableDetailIds = useMemo(() => {
    return careerCards.flatMap(c =>
      [...c.details, ...c.projects.flatMap((project) => project.details)]
        .filter(d => Boolean(d.situation || d.actionDetail || d.outcome || (d.skills && d.skills.length > 0)))
        .map(d => d.id)
    );
  }, [careerCards]);

  const expandableCareerProjectIds = useMemo(
    () => careerCards.flatMap((career) => career.projects.map((project) => project.id)),
    [careerCards],
  );

  const allMilestoneDetails = useMemo(
    () => orderedMilestones.flatMap((m) => m.details),
    [orderedMilestones],
  );

  const isAllExpanded = useMemo(() => {
    const hasExpandableContent = expandableDetailIds.length > 0 || expandableCareerProjectIds.length > 0;
    return hasExpandableContent
      && expandableDetailIds.every(id => expandedCareerDetailIds.includes(id))
      && expandableCareerProjectIds.every(id => expandedCareerProjectIds.includes(id));
  }, [expandableDetailIds, expandableCareerProjectIds, expandedCareerDetailIds, expandedCareerProjectIds]);

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedCareerDetailIds([]);
      setExpandedCareerProjectIds([]);
    } else {
      setExpandedCareerDetailIds(expandableDetailIds);
      setExpandedCareerProjectIds(expandableCareerProjectIds);
    }
  };

  const selectedMilestone = useMemo(() => {
    return activeMilestones.find(m => m.id === selectedMilestoneId) || activeMilestones[0];
  }, [selectedMilestoneId, activeMilestones]);

  /** 인쇄 프리뷰 우측 네비게이션에서 섹션별로 개별 포함/제외할 수 있는 하위 항목 목록 */
  const printItemGroups: { sectionId: string; items: { id: string; label: string }[] }[] = [
    {
      sectionId: 'competencies',
      items: orderedCompetencies.map((c) => ({ id: `competency:${c.id}`, label: c.title })),
    },
    {
      sectionId: 'career',
      items: orderedCareerCards.flatMap((career) =>
        career.projects.map((p) => ({ id: `career-project:${p.id}`, label: p.title })),
      ),
    },
    {
      sectionId: 'credentials',
      items: orderedCredentialExperiences.map((credential) => ({
        id: `credential:${credential.id}`,
        label: credential.title,
      })),
    },
    {
      sectionId: 'projects',
      items: orderedMilestones.map((m) => ({ id: `project:${m.id}`, label: m.title })),
    },
  ];

  const orderedReorderableSections = printSectionOrder
    .map((id) => reorderablePrintSections.find((s) => s.id === id))
    .filter((s): s is (typeof reorderablePrintSections)[number] => Boolean(s));
  const lockedPrintSection = printableSections.find((s) => s.id === LOCKED_PRINT_SECTION_ID)!;
  const orderedPrintableSections = [lockedPrintSection, ...orderedReorderableSections];

  const [atomHeights, setAtomHeights] = useState<Map<string, number>>(new Map());

  const printableAtoms = useMemo(() => {
    const atoms: PrintAtomItem[] = [];

    orderedPrintableSections.forEach((section) => {
      if (printExcludedIds.includes(section.id)) return;

      if (section.id === 'intro-profile') {
        atoms.push({ id: 'intro-profile', type: 'intro-profile', sectionId: 'intro-profile' });
      } else if (section.id === 'skills') {
        atoms.push({ id: 'skills-header', type: 'skills', sectionId: 'skills', isHeader: true });
        groupedCoreSkills.forEach((group) => {
          const groupId = `skills-group:${group.value}`;
          if (!printExcludedIds.includes(groupId)) {
            atoms.push({ id: groupId, type: 'skills-group', sectionId: 'skills', dataId: group.value });
          }
        });
      } else if (section.id === 'competencies') {
        atoms.push({ id: 'competencies-header', type: 'competency-header', sectionId: 'competencies', isHeader: true });
        orderedCompetencies.forEach((c) => {
          const id = `competency:${c.id}`;
          if (!printExcludedIds.includes(id)) {
            atoms.push({ id, type: 'competency-item', sectionId: 'competencies', dataId: c.id });
          }
        });
      } else if (section.id === 'career') {
        atoms.push({ id: 'career-header', type: 'career-header', sectionId: 'career', isHeader: true });
        orderedCareerCards.forEach((career) => {
          atoms.push({ id: `career-company:${career.id}`, type: 'career-company', sectionId: 'career', dataId: career.id });
          career.projects.forEach((p) => {
            const headerId = `career-project:${p.id}`;
            if (!printExcludedIds.includes(headerId)) {
              atoms.push({ id: headerId, type: 'career-item', sectionId: 'career', dataId: p.id });
              if (p.details && p.details.length > 0) {
                p.details.forEach((detail) => {
                  const detailId = `career-detail:${detail.id}`;
                  if (!printExcludedIds.includes(detailId)) {
                    atoms.push({ id: detailId, type: 'career-detail-item', sectionId: 'career', dataId: detail.id, title: detail.content });
                  }
                });
              }
            }
          });
        });
      } else if (section.id === 'credentials') {
        atoms.push({ id: 'credentials-header', type: 'credentials-header', sectionId: 'credentials', isHeader: true });
        orderedCredentialExperiences.forEach((cred) => {
          const id = `credential:${cred.id}`;
          if (!printExcludedIds.includes(id)) {
            atoms.push({ id, type: 'credential-item', sectionId: 'credentials', dataId: cred.id });
          }
        });
      } else if (section.id === 'projects') {
        atoms.push({ id: 'projects-header', type: 'projects-header', sectionId: 'projects', isHeader: true });
        orderedMilestones.forEach((m) => {
          const headerId = `project:${m.id}`;
          if (!printExcludedIds.includes(headerId)) {
            atoms.push({ id: headerId, type: 'project-item', sectionId: 'projects', dataId: m.id });
            if (m.details && m.details.length > 0) {
              m.details.forEach((detail) => {
                const detailId = `project-detail:${detail.id}`;
                if (!printExcludedIds.includes(detailId)) {
                  atoms.push({ id: detailId, type: 'project-detail-item', sectionId: 'projects', dataId: detail.id, title: detail.content });
                }
              });
            }
          }
        });
      }
    });

    return atoms;
  }, [orderedPrintableSections, printExcludedIds, orderedCompetencies, orderedCareerCards, orderedCredentialExperiences, orderedMilestones]);

  useLayoutEffect(() => {
    if (!isPrintPreviewMode) return;
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-atom-id]'));
    const newHeights = new Map<string, number>();
    elements.forEach((el) => {
      const atomId = el.getAttribute('data-atom-id');
      if (atomId) {
        const target = el.querySelector<HTMLElement>('[data-print-el]') || (el.firstElementChild as HTMLElement) || el;
        const h = target.offsetHeight || Math.round(target.getBoundingClientRect().height / (zoom || 1));
        if (h > 0) {
          newHeights.set(atomId, h);
        }
      }
    });

    setAtomHeights((prev) => {
      if (prev.size !== newHeights.size) return newHeights;
      for (const [id, h] of newHeights) {
        const prevH = prev.get(id);
        if (prevH === undefined || Math.abs(prevH - h) > 3) {
          return newHeights;
        }
      }
      return prev;
    });
  }, [
    isPrintPreviewMode,
    printableAtoms,
    sectionGaps,
    expandedCareerDetailIds,
    expandedCareerProjectIds,
    selectedCoreSkillId,
    selectedMilestoneId,
  ]);

  const pageLayers = useMemo(() => {
    return partitionAtomsIntoPages(printableAtoms, atomHeights, sectionGaps, forcedPageOverrides);
  }, [printableAtoms, atomHeights, sectionGaps, forcedPageOverrides]);

  const printSectionProps = (id: string) => {
    if (!isPrintPreviewMode) return {};
    const locked = id === LOCKED_PRINT_SECTION_ID;
    const isDragOver = !locked && dragOverSectionId === id && draggedSectionId !== null && draggedSectionId !== id;
    return {
      'data-print-exclude': printExcludedIds.includes(id) ? '' : undefined,
      'data-print-el': locked ? undefined : '',
      // 프로필/기술스택은 통짜 원자, 나머지 섹션은 내부 원자(헤더/항목)로 패킹
      'data-print-atom': locked || id === 'skills' ? '' : undefined,
      draggable: !locked,
      style: {
        order: locked ? -1 : printSectionOrder.indexOf(id),
        ...(isDragOver
          ? {
              boxShadow: dragOverPosition === 'after'
                ? 'inset 0 -3px 0 0 #3b82f6'
                : 'inset 0 3px 0 0 #3b82f6',
            }
          : {}),
      },
      onDragStart: locked
        ? undefined
        : (e: React.DragEvent<HTMLElement>) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', id);
            dragRef.current = { kind: 'section', id };
            setDraggedSectionId(id);
          },
      onDragEnd: () => {
        dragRef.current = null;
        setDraggedSectionId(null);
        setDragOverSectionId(null);
        setDragOverPosition(null);
      },
      onDragOver: (e: React.DragEvent<HTMLElement>) => {
        // ref는 dragstart에서 동기적으로 세팅되므로 리렌더 타이밍과 무관하게 항상 최신값이다.
        if (locked || dragRef.current?.kind !== 'section') return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const pos: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
        if (dragOverSectionId !== id) setDragOverSectionId(id);
        if (dragOverPosition !== pos) setDragOverPosition(pos);
      },
      onDrop: (e: React.DragEvent<HTMLElement>) => {
        if (locked || dragRef.current?.kind !== 'section') return;
        e.preventDefault();
        // ref에서 드래그 대상 id를 직접 읽고, 드롭 시점 커서 위치로 앞/뒤를 다시 계산한다.
        const rect = e.currentTarget.getBoundingClientRect();
        const pos: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
        const dragged = dragRef.current.id;
        reorderPrintSections(dragged, id, pos);
        dragRef.current = null;
        setDraggedSectionId(null);
        setDragOverSectionId(null);
        setDragOverPosition(null);
      },
    };
  };

  /** 프리뷰 모드 시 섹션에 추가할 CSS 클래스. 기존 className 뒤에 concat해서 사용. */
  const printSectionClass = (id: string) => {
    if (!isPrintPreviewMode) return '';
    // 드래그 중에는 transition을 끈다 — box-shadow가 dragover마다 바뀌는데 transition이 걸려있으면
    // 브라우저가 계속 "애니메이션 중"으로 보고, 특히 Playwright 등에서 요소 안정성 대기가 멈추는 문제가 있었다.
    // transition-all은 안 된다: inline style의 order도 transition-property: all에 포함되어
    // Chromium이 order 변경을 즉시 반영하지 않고 300ms에 걸쳐 애니메이션(중간에서 flip)한다.
    // 패커의 useLayoutEffect는 그 순간(t=0) 좌표를 측정하므로 아직 옛 위치를 읽어 페이지 분배가 틀어진다.
    let cls = draggedSectionId ? ' relative' : ' relative transition-[box-shadow,opacity] duration-300';
    if (draggedSectionId === id) cls += ' opacity-40';
    return cls;
  };

  /** 섹션/아이템 위 간격(px) 드래그 조절 시작. 최소 0px까지만 줄어들며 절대 상위 요소와 겹치지 않는다. */
  const startGapDrag = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startGap = Math.max(0, sectionGaps[id] ?? 0);
    const onMove = (me: MouseEvent) => {
      const next = Math.max(0, Math.round(startGap + (me.clientY - startY)));
      setSectionGaps((prev) => ((prev[id] ?? 0) === next ? prev : { ...prev, [id]: next }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  /** 페이지 층 레이어 기반 원자 위치 맵 */
  const atomPageMap = useMemo(() => {
    const map = new Map<string, number>();
    pageLayers.forEach((page) => {
      page.items.forEach((item) => {
        map.set(item.id, page.pageIndex);
      });
    });
    return map;
  }, [pageLayers]);

  /** 2개 이상의 페이지에 걸쳐 분할된 섹션 ID 목록 */
  const splitSectionIds = useMemo(() => {
    const sectionPagesMap = new Map<string, Set<number>>();
    printableAtoms.forEach((atom) => {
      const page = atomPageMap.get(atom.id);
      if (page !== undefined) {
        if (!sectionPagesMap.has(atom.sectionId)) {
          sectionPagesMap.set(atom.sectionId, new Set());
        }
        sectionPagesMap.get(atom.sectionId)!.add(page);
      }
    });
    const splitSet = new Set<string>();
    sectionPagesMap.forEach((pages, sectionId) => {
      if (pages.size > 1) {
        splitSet.add(sectionId);
      }
    });
    return splitSet;
  }, [printableAtoms, atomPageMap]);

  /** 페이지가 넘어가는 첫번째 경계 항목 ID 목록 (분할 지점) */
  const pageBreakBoundaryAtomIds = useMemo(() => {
    const set = new Set<string>();
    for (let p = 1; p < pageLayers.length; p++) {
      const prevPageItems = pageLayers[p - 1].items;
      const currentPageItems = pageLayers[p].items;
      if (currentPageItems.length > 0) {
        const firstAtomOnNewPage = currentPageItems[0];
        const sectionId = firstAtomOnNewPage.sectionId;
        const hasPrevItemsInSameSection = prevPageItems.some((it) => it.sectionId === sectionId);
        if (hasPrevItemsInSameSection) {
          set.add(firstAtomOnNewPage.id);
        }
      }
    }
    return set;
  }, [pageLayers]);

  /** 헤더 또는 항목과 연관된 세부 항목 atom ID 목록을 반환한다 (예: 상세경험 헤더 선택 시 하위 세부 경험 전체 동시 제어) */
  const getAssociatedAtomIds = (id: string): string[] => {
    if (id.startsWith('project-details-header:')) {
      const milestoneId = id.replace('project-details-header:', '');
      const m = orderedMilestones.find((item) => String(item.id) === milestoneId);
      if (m && m.details) {
        return [id, ...m.details.map((d) => `project-detail:${d.id}`)];
      }
    }
    if (id.startsWith('career-details-header:')) {
      const projectId = id.replace('career-details-header:', '');
      const allProjects = orderedCareerCards.flatMap((c) => c.projects);
      const p = allProjects.find((item) => String(item.id) === projectId);
      if (p && p.details) {
        return [id, ...p.details.map((d) => `career-detail:${d.id}`)];
      }
    }
    return [id];
  };

  /** 분할된 지점에서만 활성화되는 페이지 경계 이동/여백 조절 컨트롤 렌더링 (플로팅 렌더링으로 본문 높이 왜곡 방지) */
  const renderPageBreakControl = (id: string, sectionId: string) => {
    if (!isPrintPreviewMode) return null;
    const isSplit = splitSectionIds.has(sectionId);
    const isBoundary = pageBreakBoundaryAtomIds.has(id);
    const currentGap = sectionGaps[id] ?? 0;
    const forcedPage = forcedPageOverrides[id];
    const currentPage = atomPageMap.get(id);

    // 강제 페이지 고정 상태일 때: 본문 레이아웃 높이를 소비하지 않는 오버레이 배지 및 내리기 버튼
    if (forcedPage !== undefined) {
      // 부모 details-header가 이미 강제 고정된 상태라면 하위 세부 항목에는 중복 배지를 렌더링하지 않는다
      const isChildDetail = id.startsWith('project-detail:') || id.startsWith('career-detail:');
      if (isChildDetail) {
        let parentHeaderId: string | null = null;
        if (id.startsWith('project-detail:')) {
          const detailId = id.replace('project-detail:', '');
          const m = orderedMilestones.find((item) => item.details.some((d) => String(d.id) === detailId));
          if (m) parentHeaderId = `project-details-header:${m.id}`;
        } else if (id.startsWith('career-detail:')) {
          const detailId = id.replace('career-detail:', '');
          const p = orderedCareerCards.flatMap((c) => c.projects).find((proj) => proj.details.some((d) => String(d.id) === detailId));
          if (p) parentHeaderId = `career-details-header:${p.id}`;
        }
        if (parentHeaderId && forcedPageOverrides[parentHeaderId] !== undefined) {
          return null;
        }
      }

      const nextPageNum = forcedPage + 2;
      const isHeaderBlock = id.startsWith('project-details-header:') || id.startsWith('career-details-header:');
      const labelText = isHeaderBlock
        ? `상세 경험 및 세부 내용 전체가 ${forcedPage + 1}페이지로 강제 배치되었습니다.`
        : `이 항목은 ${forcedPage + 1}페이지로 강제 배치되었습니다.`;

      return (
        <div
          data-print-preview-ui
          className="absolute -top-7 left-0 right-0 z-30 flex items-center justify-between rounded-md border border-indigo-400/50 bg-slate-900/90 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-md print:hidden pointer-events-auto"
        >
          <div className="flex items-center gap-2">
            <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-black text-white">
              강제 위치 배치됨
            </span>
            <span className="text-[11px] text-indigo-100 font-semibold">
              {labelText}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const idsToClear = getAssociatedAtomIds(id);
              setForcedPageOverrides((prev) => {
                const next = { ...prev };
                idsToClear.forEach((atomId) => delete next[atomId]);
                return next;
              });
            }}
            className="flex items-center gap-1 rounded bg-rose-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-rose-700 active:scale-95 transition shadow-sm cursor-pointer"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            <span>원래대로 내리기 ({nextPageNum}페이지)</span>
          </button>
        </div>
      );
    }

    if (!isBoundary && currentGap === 0) return null;

    const targetPrevPage = (currentPage ?? 1) - 1;

    // 페이지 경계 컨트롤: 상단 여백 공간에 플로팅되어 본문 레이아웃 높이를 1px도 차지하지 않음
    return (
      <div
        data-print-preview-ui
        className="absolute -top-7 left-0 right-0 z-30 flex items-center justify-between rounded-md border border-blue-400/50 bg-slate-900/90 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-md print:hidden pointer-events-auto"
      >
        <div className="flex items-center gap-2">
          <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-black text-white">
            페이지 분할 지점
          </span>
          <span className="text-[11px] text-slate-200 font-semibold">
            {isBoundary
              ? '이 항목부터 다음 페이지로 분할되었습니다.'
              : '페이지 이동 간격 세밀 조절 중'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isBoundary && targetPrevPage >= 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const idsToForce = getAssociatedAtomIds(id);
                setForcedPageOverrides((prev) => {
                  const next = { ...prev };
                  idsToForce.forEach((atomId) => {
                    next[atomId] = targetPrevPage;
                  });
                  return next;
                });
              }}
              className="flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-indigo-500 active:scale-95 transition shadow-sm cursor-pointer"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              <span>강제로 {targetPrevPage + 1}페이지로 올리기</span>
            </button>
          )}
          <div
            onMouseDown={startGapDrag(id)}
            title="마우스로 위아래 여백을 끌어서 조절 (다음 페이지 위치 세밀 조절)"
            className="flex cursor-ns-resize items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-blue-500 active:scale-95 transition shadow-sm"
          >
            <MoveVertical className="h-3.5 w-3.5" />
            <span>위치/여백 조절</span>
          </div>
        </div>
      </div>
    );
  };

  /** 호버 시 섹션 왼편에 나타나는 컨트롤 (포함/제외 + 위 간격 조절 + 드래그 안내) */
  const renderSectionControls = (id: string) => {
    if (!isPrintPreviewMode) return null;
    return (
      <div data-print-preview-ui className="pp-controls print:hidden">
        <PrintEyeButton id={id} excluded={printExcludedIds.includes(id)} onToggle={togglePrintSection} />
        <div
          onMouseDown={startGapDrag(id)}
          draggable
          onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
          title="위쪽 간격 조절 (아래로 끌면 넓어짐)"
          className="grid h-7 w-7 cursor-ns-resize place-items-center rounded-full bg-slate-900/90 text-white shadow-lg transition hover:bg-slate-900"
        >
          <MoveVertical className="h-3.5 w-3.5" />
        </div>
        <div title="요소 자체를 드래그해서 순서 이동" className="grid h-7 w-7 cursor-grab place-items-center rounded-full bg-slate-900/60 text-white shadow-lg">
          <GripVertical className="h-3.5 w-3.5" />
        </div>
      </div>
    );
  };

  /** 호버 시 우상단에 뜨는 컨트롤 툴바 (핀 고정/해제 + 수직 간격 마우스 드래그 조절 + 내리기 버튼) */
  const renderItemControls = (id: string) => {
    if (!isPrintPreviewMode) return null;
    const isForced = forcedPageOverrides[id] !== undefined;
    const forcedPage = forcedPageOverrides[id];
    const nextPageNum = (forcedPage ?? 0) + 2;

    return (
      <div data-print-preview-ui className="pp-controls print:hidden flex items-center gap-1 bg-slate-900/90 p-1 rounded-full shadow-lg backdrop-blur-md z-40">
        <PrintEyeButton id={id} excluded={printExcludedIds.includes(id)} onToggle={togglePrintSection} />

        {isForced && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const idsToClear = getAssociatedAtomIds(id);
              setForcedPageOverrides((prev) => {
                const next = { ...prev };
                idsToClear.forEach((atomId) => delete next[atomId]);
                return next;
              });
            }}
            title={`원래 위치(${nextPageNum}페이지)로 다시 내리기`}
            className="flex h-6 items-center gap-1 rounded-full bg-rose-600 px-2.5 text-[10px] font-black text-white hover:bg-rose-700 transition cursor-pointer shadow-sm"
          >
            <ArrowDown className="h-3 w-3" />
            <span>{nextPageNum}p로 내리기</span>
          </button>
        )}

        {/* 마우스 미세 드래그로 위아래 간격 조절 */}
        <div
          onMouseDown={startGapDrag(id)}
          title="마우스를 위아래로 끌어서 간격 세밀 조절"
          className="grid h-6 w-6 cursor-ns-resize place-items-center rounded-full bg-slate-700/90 text-white transition hover:bg-blue-600 hover:scale-110"
        >
          <MoveVertical className="h-3 w-3" />
        </div>
      </div>
    );
  };

  /** 아이템/필드 위쪽 간격 스페이서 (페이지 분할 시에만 분할 조절 컨트롤 활성화) */
  const renderItemGap = (id: string, sectionId?: string) => {
    if (!isPrintPreviewMode) return null;
    const h = Math.max(0, sectionGaps[id] ?? 0);

    return (
      <Fragment key={`gap:${id}`}>
        {sectionId && renderPageBreakControl(id, sectionId)}
        {h > 0 && (
          <div
            aria-hidden
            data-print-gap
            className="print-gap-spacer shrink-0 w-full"
            style={{ height: `${h}px` }}
          />
        )}
      </Fragment>
    );
  };

  /** 상세 경험 항목의 서술(narrative, 없으면 상황/진행 과정/성과를 합친 값)을 하나의 페이징 원자로 렌더링한다. */
  const renderDetailFields = (detail: ExperienceDetail, detailIdKey: string) => {
    const merged = detail.narrative
      || [detail.situation, detail.actionDetail, detail.outcome].filter(Boolean).join('\n\n');
    if (!merged) return null;
    const id = `field:merged:${detailIdKey}`;
    return (
      <Fragment key="merged">
        <div className="resume-detail-text">
          <ReactMarkdown components={resumeMarkdownComponents}>{merged}</ReactMarkdown>
        </div>
      </Fragment>
    );
  };

  /** 섹션 위쪽 간격 스페이서 (최소 0px 안전 보장으로 겹침 방지) */
  const renderSectionGap = (id: string) => {
    if (!isPrintPreviewMode) return null;
    const h = Math.max(0, sectionGaps[id] ?? 0);
    if (h === 0 || printExcludedIds.includes(id)) return null;
    return (
      <div
        aria-hidden
        data-print-gap
        className="print-gap-spacer shrink-0 w-full"
        style={{ height: `${h}px` }}
      />
    );
  };

  /** 아이템 레벨: 제외/호버/드래그 순서교체 props. groupKey와 현재 순서 배열을 함께 넘긴다. */
  /** 아이템 레벨: 제외/호버/페이지 간격 제어 props. 순서 변경 드래그는 제공하지 않는다. */
  const printItemProps = (id: string) => {
    if (!isPrintPreviewMode) return {};
    return {
      'data-print-exclude': printExcludedIds.includes(id) ? '' : undefined,
      'data-print-id': id,
      'data-print-el': '',
      'data-print-atom': '',
      style: { position: 'relative' as const },
    };
  };

  const handlePrint = () => {
    setPrintModeDialogOpen(true);
  };

  /** 모달에서 "직접 조정하기" 선택 시 — 빈 상태로 프리뷰 진입 */
  const handlePrintManual = () => {
    setPrintModeDialogOpen(false);
    printLayoutFrozenRef.current = false;
    setPrintPreviewMode(true);
    setPrintExcludedIds([]);
    setPrintSectionOrder(reorderablePrintSections.map((s) => s.id));
    setSectionGaps({});
    setPrintPending(false);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** 모달에서 템플릿/로컬 저장 선택 시 — 해당 설정으로 프리뷰 진입 */
  const handlePrintApplyTemplate = (settings: {
    excludedIds: string[];
    sectionOrder: string[];
    sectionGaps: Record<string, number>;
    forcedPageOverrides?: Record<string, number>;
  }) => {
    setPrintModeDialogOpen(false);
    printLayoutFrozenRef.current = false;
    setPrintPreviewMode(true);
    setPrintExcludedIds(settings.excludedIds);
    // 템플릿의 sectionOrder에 새로 추가된 섹션이 누락될 수 있으므로, 기존 섹션 중 누락된 것을 뒤에 추가
    const allIds = reorderablePrintSections.map((s) => s.id);
    const merged = [...settings.sectionOrder.filter((id) => allIds.includes(id)), ...allIds.filter((id) => !settings.sectionOrder.includes(id))];
    setPrintSectionOrder(merged);
    setSectionGaps(settings.sectionGaps);
    setForcedPageOverrides(settings.forcedPageOverrides ?? {});
    setPrintPending(false);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** 현재 조정된 프리뷰 설정을 브라우저 localStorage에 저장 */
  const handleSaveLocalPrintConfig = () => {
    const defaultName = generateUniqueLocalName('내 맞춤 인쇄 설정');
    const memo = window.prompt('현재 인쇄 설정에 대한 설명/메모를 입력하세요:', defaultName);
    if (memo === null) return; // 취소
    const trimmed = memo.trim() || defaultName;

    const existingSaves = getLocalSaves();
    const isDuplicate = existingSaves.some((s) => s.memo.trim() === trimmed);

    if (isDuplicate) {
      const confirmed = window.confirm(`'${trimmed}' 이름의 인쇄 설정이 이미 존재합니다.\n\n기존 설정을 덮어쓰시겠습니까?`);
      if (!confirmed) return; // 취소
    }

    saveLocal({
      memo: trimmed,
      excludedIds: printExcludedIds,
      sectionOrder: printSectionOrder,
      sectionGaps,
      forcedPageOverrides,
    });
    alert(`'${trimmed}' 인쇄 설정이 성공적으로 저장되었습니다.`);
  };

  /** 구성 관리 패널에서 섹션/항목을 클릭했을 때 본문의 실제 위치로 스크롤한다. */
  const scrollToPrintElement = (id: string) => {
    const el = document.getElementById(id) ?? document.querySelector<HTMLElement>(`[data-print-id="${CSS.escape(id)}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const togglePrintSection = (id: string) => {
    if (id === LOCKED_PRINT_SECTION_ID) return;
    setPrintExcludedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleAllPrintSections = () => {
    setPrintExcludedIds((prev) =>
      prev.length === 0 ? reorderablePrintSections.map((s) => s.id) : [],
    );
  };

  const reorderPrintSections = (draggedId: string, targetId: string, position: 'before' | 'after' = 'before') => {
    if (draggedId === targetId) return;
    if (draggedId === LOCKED_PRINT_SECTION_ID || targetId === LOCKED_PRINT_SECTION_ID) return;
    setPrintSectionOrder((prev) => {
      const next = prev.filter((id) => id !== draggedId);
      let targetIndex = next.indexOf(targetId);
      if (position === 'after') targetIndex += 1;
      next.splice(targetIndex, 0, draggedId);
      return next;
    });
  };

  const handlePrintConfirm = () => {
    printLayoutFrozenRef.current = false;
    setPrintPending(true);
  };

  const handlePrintCancel = () => {
    printLayoutFrozenRef.current = false;
    setPrintPreviewMode(false);
    setPrintExcludedIds([]);
    setPrintSectionOrder(reorderablePrintSections.map((s) => s.id));
    setSectionGaps({});
    setPrintPending(false);
    setNavPanelOpen(false);

    if (isAdminEditParam) {
      window.parent.postMessage({ type: 'CLOSE_ADMIN_EDIT' }, '*');
    }
  };

  useEffect(() => {
    if (!printPending || !isPrintPreviewMode) return;

    let cancelled = false;
    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const waitAtMost = async (promise: Promise<unknown>, timeoutMs = 5000) => {
      let timer = 0;
      await Promise.race([
        promise.catch(() => undefined),
        new Promise<void>((resolve) => {
          timer = window.setTimeout(resolve, timeoutMs);
        }),
      ]);
      window.clearTimeout(timer);
    };
    const printWhenLayoutIsStable = async () => {
      // 웹폰트 적용과 ResizeObserver 재패킹이 끝난 뒤의 DOM을 인쇄해야
      // 화면에서 계산한 줄바꿈·페이지 시작점과 PDF가 달라지지 않는다.
      await waitAtMost(document.fonts.ready);
      if (cancelled) return;
      await Promise.all(
        Array.from(document.querySelectorAll<HTMLImageElement>('.resume-page img')).map(async (image) => {
          if (!image.complete) {
            await new Promise<void>((resolve) => {
              let timer = 0;
              const finish = () => {
                window.clearTimeout(timer);
                image.removeEventListener('load', finish);
                image.removeEventListener('error', finish);
                resolve();
              };
              image.addEventListener('load', finish);
              image.addEventListener('error', finish);
              timer = window.setTimeout(finish, 5000);
              // complete가 이벤트 리스너 등록 직전에 바뀐 경우를 놓치지 않는다.
              if (image.complete) finish();
            });
          }
          // decode() 자체가 멈추거나 실패한 이미지 하나가 인쇄 전체를 막지 않도록 한다.
          await waitAtMost(image.decode());
        }),
      );
      await nextFrame();
      await nextFrame();
      if (cancelled) return;

      // 마지막 좌표를 동기 반영한 직후 레이아웃을 잠가, beforeprint의 미디어 전환이
      // ResizeObserver를 깨워 data-print-break를 지우는 경쟁 조건을 없앤다.
      recomputePrintLayoutRef.current?.();
      printLayoutFrozenRef.current = true;
      try {
        window.print();
      } catch {
        // print()가 차단되면 afterprint가 오지 않으므로 여기서 잠금을 직접 해제한다.
        printLayoutFrozenRef.current = false;
      } finally {
        if (!cancelled) setPrintPending(false);
      }
    };

    void printWhenLayoutIsStable();
    return () => {
      cancelled = true;
    };
  }, [isPrintPreviewMode, printPending]);

  const goToPage = (pageId: PageId) => {
    setActivePage(pageId);
    setSelectedStudySlug(null);
    setSelectedExperienceDetailId(null);
    setReferrer(null);
    navigate(pagePaths[pageId]);
    setIsPageMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // The exact path we're on right now (an intro anchor, another study,
  // another experience detail, the plain list, whatever) — read *before*
  // navigating away, so a detail view opened from here can return to it
  // precisely. navigate() dispatches a synchronous popstate that clears
  // `referrer`, so callers must apply this snapshot via setReferrer only
  // after navigate() has run, not before.
  const currentPath = () => `${window.location.pathname}${window.location.search}`;

  const returnToReferrer = (fallbackPath: string) => {
    if (referrer) {
      const targetPath = referrer.path;
      const targetId = referrer.sectionId;
      setReferrer(null);
      navigate(targetPath);

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
      navigate(fallbackPath);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openExperienceDetail = (id: number, refSectionId?: string) => {
    const fromPath = currentPath();
    setSelectedExperienceDetailId(id);
    setActivePage('experience');
    navigate(pathForExperienceDetail(id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setReferrer({ path: fromPath, sectionId: refSectionId });
  };

  const closeExperienceDetail = () => {
    setSelectedExperienceDetailId(null);
    returnToReferrer(pagePaths.experience);
  };

  const openStudy = (slug: string, refSectionId?: string) => {
    const fromPath = currentPath();
    setSelectedStudySlug(slug);
    setActivePage('blog');
    navigate(pathForStudy(slug));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setReferrer({ path: fromPath, sectionId: refSectionId });
  };

  const closeStudy = () => {
    setSelectedStudySlug(null);
    returnToReferrer(pagePaths.blog);
  };

  // 공통 카드 레이아웃 스타일 통일
  const cardStyle = "resume-section-card bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)] transition-all duration-300 relative";
  
  // 공통 배지 스타일 통일
  const badgeStyle = "resume-badge bg-slate-50 border border-slate-200/60 text-slate-700 font-bold px-2 py-0.5 rounded-md shadow-sm";

  const sidebarGridClass = isPrintPreviewMode
    ? 'block w-[820px] max-w-full mx-auto z-[1]'
    : `grid grid-cols-[minmax(0,1fr)_52px] gap-4 sm:gap-6 relative items-start transition-[grid-template-columns] duration-300 ${
        isSectionNavCollapsed
          ? 'min-[900px]:grid-cols-[minmax(0,1fr)_52px]'
          : 'min-[900px]:grid-cols-[minmax(0,1fr)_240px]'
      }`;

  const renderSectionNavToggle = () => (
    <button
      type="button"
      onClick={() => setIsSectionNavCollapsed((collapsed) => !collapsed)}
      className={`z-20 hidden items-center justify-center border border-slate-200 bg-white text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 min-[900px]:flex ${
        isSectionNavCollapsed
          ? 'relative mx-auto h-8 w-8 shrink-0 rounded-full shadow-sm'
          : 'absolute -right-[11px] top-7 !m-0 h-10 w-5 rounded-r-lg border-l-0 bg-white/95 shadow-[3px_1px_6px_-3px_rgba(15,23,42,0.35)]'
      }`}
      title={isSectionNavCollapsed ? '네비게이션 펼치기' : '네비게이션 접기'}
      aria-label={isSectionNavCollapsed ? '네비게이션 펼치기' : '네비게이션 접기'}
      aria-expanded={!isSectionNavCollapsed}
    >
      {isSectionNavCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
    </button>
  );

  const renderAtomContent = (atom: PrintAtomItem) => {
    switch (atom.type) {
      case 'intro-profile':
        return (
          <div id="intro-profile" data-print-el className={`resume-profile-card relative ${isPrintPreviewMode ? 'p-0 pb-3 border-b border-slate-200 shadow-none rounded-none bg-transparent' : 'rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] backdrop-blur-md'}`}>
            {renderSectionGap('intro-profile')}
            {renderSectionControls('intro-profile')}
            <div className="relative z-10 space-y-4">
              <div className="resume-profile-toprow flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="space-y-1 shrink-0">
                  <h2 className="resume-profile-role font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-950 whitespace-nowrap text-sm">
                    {profile.jobTitle}
                  </h2>
                  <div className="flex items-baseline gap-2 whitespace-nowrap">
                    <h1 className="resume-profile-name font-black text-slate-900 whitespace-nowrap text-lg sm:text-xl">{profile.name}</h1>
                    <span className="resume-profile-name-en font-bold text-slate-400 font-mono whitespace-nowrap text-xs">{profile.nameEn}</span>
                  </div>
                </div>
              </div>
              <div className="resume-print-contact flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-200 pb-2 text-slate-600 text-xs font-mono">
                <span>{profile.email}</span>
                <span>{profile.phone}</span>
                <span>{profile.githubUrl.replace(/^https?:\/\//, '')}</span>
                <span>unbrdn.me</span>
              </div>
              <div>
                <p className="resume-body mt-1 max-w-4xl whitespace-pre-line break-words text-slate-600 text-xs leading-relaxed">
                  {profile.bio}
                </p>
              </div>
            </div>
          </div>
        );

      case 'skills':
        return (
          <div data-print-el className="flex flex-col font-black text-slate-900 w-full mt-6 pt-2 relative">
            {renderSectionGap('skills')}
            {renderSectionControls('skills')}
            <div className="flex items-center justify-start gap-2 border-b border-slate-200 pb-2 w-full">
              <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                <Cpu className="h-4 w-4 text-slate-900" />
                기술 스택
              </h2>
            </div>
          </div>
        );

      case 'skills-group': {
        const group = groupedCoreSkills.find((g) => g.value === atom.dataId);
        if (!group) return null;
        const itemId = `skills-group:${group.value}`;
        return (
          <Fragment key={atom.id}>
            {renderItemGap(itemId, 'skills')}
            <div data-print-el className="py-3.5 border-b border-slate-100 last:border-b-0 w-full relative">
              {renderItemControls(itemId)}
              <div className="resume-skill-group space-y-1.5">
                <h4 className="resume-skill-group-title resume-subtitle flex items-center gap-2 border-b border-slate-100 pb-0.5 font-black text-slate-500 text-xs">
                  <span className="resume-skill-group-bar h-3 w-1 shrink-0 rounded-full bg-slate-900" aria-hidden />
                  {group.label}
                </h4>
                <div className="resume-skill-badges flex flex-wrap gap-1.5 border-l-2 border-slate-100 pl-2">
                  {group.skills.map((skill) => (
                    <span key={skill.id} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-black text-slate-800">
                      {skill.name}
                      {skill.skillVersion && (
                        <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] font-bold text-slate-500">
                          v{skill.skillVersion}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Fragment>
        );
      }

      case 'competency-header':
        return (
          <div data-print-el className="resume-competency-header flex flex-col w-full mt-6 pt-2 relative">
            {renderSectionGap('competencies')}
            {renderSectionControls('competencies')}
            <div className="flex items-center justify-start gap-2 border-b border-slate-200 pb-2 w-full">
              <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                <Sparkles className="h-4 w-4 text-slate-900" />
                핵심 역량
              </h2>
            </div>
          </div>
        );

      case 'competency-item': {
        const competency = orderedCompetencies.find((c) => c.id === atom.dataId);
        if (!competency) return null;
        const index = orderedCompetencies.indexOf(competency);
        const itemId = `competency:${competency.id}`;
        return (
          <Fragment key={atom.id}>
            {renderItemGap(itemId, 'competencies')}
            <div data-print-el className="relative w-full">
              {renderItemControls(itemId)}
              <article
                className="print-competency-row grid gap-3 py-3.5 sm:grid-cols-[minmax(180px,0.32fr)_minmax(0,1fr)] sm:gap-6 print:grid-cols-[31%_69%] print:gap-4 print:py-3.5 border-b border-slate-100 last:border-b-0 w-full"
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="resume-label inline-block w-7 shrink-0 font-black tabular-nums tracking-[0.14em] text-slate-400 text-xs">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="resume-item-title font-black text-slate-900 text-xs">
                      {competency.title}
                    </h3>
                  </div>
                  {competency.skills.length > 0 && (
                    <p className="resume-meta mt-1 pl-9 font-bold text-slate-500 text-[10px]">
                      {competency.skills.slice(0, 6).map((skill) => skill.name).join(' · ')}
                    </p>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="resume-body font-semibold text-slate-700 text-xs leading-relaxed">
                    {competency.summary}
                  </p>
                </div>
              </article>
            </div>
          </Fragment>
        );
      }

      case 'career-header':
        return (
          <div data-print-el className="mb-2 flex flex-col font-black text-slate-900 w-full mt-6 pt-2 relative">
            {renderSectionGap('career')}
            {renderSectionControls('career')}
            <div className="flex items-center justify-start gap-2 border-b border-slate-200 pb-2 w-full">
              <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                <Briefcase className="h-4 w-4 text-slate-900" />
                직장 경력 (총 {careerSummary})
              </h2>
            </div>
          </div>
        );

      case 'career-company': {
        const career = orderedCareerCards.find((c) => c.id === atom.dataId);
        if (!career) return null;
        const itemId = `career-company:${career.id}`;
        return (
          <Fragment key={atom.id}>
            {renderItemGap(itemId, 'career')}
            <div data-print-el className="border-b border-slate-100 py-3.5 w-full relative">
              {renderItemControls(itemId)}
              <span className="resume-print-plain resume-meta inline-flex rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-bold text-slate-950 text-xs">
                {career.period}
              </span>
              <p className="resume-item-title mt-1.5 font-black text-slate-800 text-sm">{career.companyName} ({career.employmentType})</p>
              <p className="resume-meta font-semibold text-slate-500 text-xs">{career.department} / {career.role}</p>
              {career.summary && (
                <div className="resume-body mt-2 text-xs text-slate-600">
                  <ReactMarkdown components={resumeMarkdownComponents}>{career.summary}</ReactMarkdown>
                </div>
              )}
            </div>
          </Fragment>
        );
      }

      case 'career-item': {
        const career = orderedCareerCards.find((c) => c.projects.some((p) => p.id === atom.dataId));
        const project = career?.projects.find((p) => p.id === atom.dataId);
        if (!project || !career) return null;
        const itemId = `career-project:${project.id}`;
        const hasDetails = project.details && project.details.length > 0;

        return (
          <Fragment key={atom.id}>
            {renderItemGap(itemId, 'career')}
            <div data-print-el className={`w-full relative ${hasDetails ? 'pt-3.5 pb-2' : 'py-3.5 border-b border-slate-100 last:border-b-0'}`}>
              {renderItemControls(itemId)}

              {/* Project Header */}
              <div className="flex w-full items-start gap-2.5 text-left">
                <span className="min-w-0 flex-1">
                  <span className="resume-body block font-bold text-slate-900 text-xs">{project.title}</span>
                  <span className="resume-meta mt-0.5 block text-slate-400 text-[10px]">
                    {project.periodStart.replace(/-/g, '.').substring(0, 7)} - {project.periodEnd ? project.periodEnd.replace(/-/g, '.').substring(0, 7) : '진행 중'}
                    {project.contributionRate != null ? ` · 기여도 ${project.contributionRate}%` : ''}
                  </span>
                </span>
              </div>

              {/* Project Summary */}
              {project.summary && (
                <div className="mt-1.5">
                  <h4 className="resume-label font-bold text-slate-400 uppercase tracking-wider text-[10px]">프로젝트 설명 및 역할</h4>
                  <div className="resume-body mt-0.5 text-xs text-slate-600">
                    <ReactMarkdown components={resumeMarkdownComponents}>{project.summary}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Project Tech Stack Badges */}
              {project.skills && project.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {project.skills.map((s) => (
                    <span key={s.id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 border border-slate-200/60">
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Fragment>
        );
      }

      case 'career-details-header': {
        const career = orderedCareerCards.find((c) => c.projects.some((p) => p.id === atom.dataId));
        const project = career?.projects.find((p) => p.id === atom.dataId);
        if (!project || !career || !project.details || project.details.length === 0) return null;
        const itemId = `career-details-header:${project.id}`;

        return (
          <div data-print-el className="pt-2 pb-1 w-full relative">
            {renderItemGap(itemId, 'career')}
            {renderItemControls(itemId)}
            <div className="resume-detail-header flex items-center gap-1.5">
              <h4 className="resume-label flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700 text-[10px]">
                <Briefcase className="h-3 w-3 text-slate-500" />
                상세 경험
              </h4>
            </div>
          </div>
        );
      }

      case 'career-detail-item': {
        const allProjects = orderedCareerCards.flatMap((c) => c.projects);
        const p = allProjects.find((proj) => proj.details?.some((d) => d.id === atom.dataId));
        const detail = p?.details?.find((d) => d.id === atom.dataId);
        if (!detail || !p) return null;
        const itemId = `career-detail:${detail.id}`;
        const isFirst = p.details[0]?.id === detail.id;

        return (
          <Fragment key={atom.id}>
            {renderItemGap(itemId, 'career')}
            <div data-print-el className="py-2 pl-3 border-l-2 border-slate-200 border-b border-slate-100/60 last:border-b-0 w-full relative">
              {renderItemControls(itemId)}
              {isFirst && (
                <div className="resume-detail-header flex items-center gap-1.5 pb-1.5 border-b border-slate-100 mb-2">
                  <h4 className="resume-label flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700 text-[10px]">
                    <Briefcase className="h-3 w-3 text-slate-500" />
                    상세 경험
                  </h4>
                </div>
              )}
              <span className="font-bold text-slate-900 block text-xs">• {detail.content}</span>
              {renderDetailFields(detail, `${detail.id}`)}
            </div>
          </Fragment>
        );
      }

      case 'credentials-header':
        return (
          <div data-print-el className="flex flex-col font-black text-slate-900 w-full mt-6 pt-2 relative">
            {renderSectionGap('credentials')}
            {renderSectionControls('credentials')}
            <div className="flex items-center justify-start gap-2 border-b border-slate-200 pb-2 w-full">
              <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                <GraduationCap className="h-4 w-4 text-slate-900" />
                학력·교육 및 자격증
              </h2>
            </div>
          </div>
        );

      case 'credential-item': {
        const cred = orderedCredentialExperiences.find((c) => c.id === atom.dataId);
        if (!cred) return null;
        const itemId = `credential:${cred.id}`;
        const kind = credentialKindLabel(cred);

        return (
          <Fragment key={atom.id}>
            {renderItemGap(itemId, 'credentials')}
            <article data-print-el className="py-2.5 border-b border-slate-100 last:border-b-0 w-full relative flex flex-col">
              {renderItemControls(itemId)}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="resume-label rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 shrink-0">
                    {kind}
                  </span>
                  <h3 className="font-bold text-slate-900 text-xs truncate">{cred.title}</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">{formatCredentialPeriod(cred)}</span>
              </div>
              
              {/* 교육 항목: 설명글 및 기술 스택 배지 유지 */}
              {kind === '교육' && cred.summary && (
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{cred.summary}</p>
              )}
              {kind === '교육' && cred.skills && cred.skills.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {cred.skills.map((s) => (
                    <span key={s.id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 border border-slate-200/60">
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </article>
          </Fragment>
        );
      }

      case 'projects-header':
        return (
          <div data-print-el className="flex flex-col font-black text-slate-900 w-full mt-6 pt-2 relative">
            {renderSectionGap('projects')}
            {renderSectionControls('projects')}
            <div className="flex items-center justify-start gap-2 border-b border-slate-200 pb-2 w-full">
              <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                <FolderGit2 className="h-4 w-4 text-slate-900" />
                핵심 프로젝트 포트폴리오
              </h2>
            </div>
          </div>
        );

      case 'project-item': {
        const m = orderedMilestones.find((item) => item.id === atom.dataId);
        if (!m) return null;
        const itemId = `project:${m.id}`;
        const hasDetails = (m.details && m.details.length > 0);

        return (
          <Fragment key={atom.id}>
            {renderItemGap(itemId, 'projects')}
            <article data-print-el className={`w-full relative flex flex-col ${hasDetails ? 'pt-3.5 pb-2' : 'py-3.5 border-b border-slate-100 last:border-b-0'}`}>
              {renderItemControls(itemId)}
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-black text-slate-900 text-xs">{m.title}</h3>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">{m.period}</span>
              </div>
              {m.role && <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{m.role}</p>}
              {m.description && <p className="mt-1 text-xs text-slate-600">{m.description}</p>}
              {m.skills && m.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.skills.map((s) => (
                    <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 border border-slate-200/60">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </article>
          </Fragment>
        );
      }

      case 'project-detail-item': {
        const m = orderedMilestones.find((item) => item.details?.some((d) => d.id === atom.dataId));
        const detail = m?.details?.find((d) => d.id === atom.dataId);
        if (!detail || !m) return null;
        const itemId = `project-detail:${detail.id}`;
        const isFirst = m.details[0]?.id === detail.id;

        return (
          <Fragment key={atom.id}>
            {renderItemGap(itemId, 'projects')}
            <div data-print-el className="py-2 pl-3 border-l-2 border-slate-200 border-b border-slate-100/60 last:border-b-0 w-full relative">
              {renderItemControls(itemId)}
              {isFirst && (
                <div className="resume-detail-header flex items-center gap-1.5 pb-1.5 border-b border-slate-100 mb-2">
                  <h4 className="resume-label flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700 text-[10px]">
                    <Briefcase className="h-3 w-3 text-slate-500" />
                    상세 경험
                  </h4>
                </div>
              )}
              <span className="font-bold text-slate-900 block text-xs">• {detail.content}</span>
              {renderDetailFields(detail, `${detail.id}`)}
            </div>
          </Fragment>
        );
      }

      default:
        return null;
    }
  };

  return (
    <>
      <main className={`text-slate-800 font-['Plus_Jakarta_Sans',Pretendard,sans-serif] print:bg-white print:text-black ${isPrintPreviewMode ? 'h-screen overflow-hidden flex flex-col bg-slate-900 pb-0 print:h-auto print:overflow-visible print:bg-white print:pb-0' : 'min-h-screen pb-12 bg-[#f8fafc]'}`}>
        {isPrintPreviewMode && (
          <PrintPreviewBar
            excludedCount={printExcludedIds.length}
            totalPages={pageLayers.length}
            navOpen={navPanelOpen}
            onToggleAll={toggleAllPrintSections}
            onToggleNav={() => setNavPanelOpen((prev) => !prev)}
            onSaveLocal={isAdminEditParam ? undefined : handleSaveLocalPrintConfig}
            onSaveServer={undefined}
            onPrint={handlePrintConfirm}
            onCancel={handlePrintCancel}
            zoom={zoom}
            onZoomChange={setZoom}
            onZoomFit={handleZoomFit}
            isAdminEditMode={isAdminEditParam}
            adminTemplateName={adminTemplateName}
            onAdminTemplateNameChange={setAdminTemplateName}
            adminTemplateVisible={adminTemplateVisible}
            onAdminTemplateVisibleChange={setAdminTemplateVisible}
            onAdminSaveTemplate={handleAdminSaveServerTemplate}
          />
        )}
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
        <header className={`sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 py-2 shadow-sm backdrop-blur-xl print:hidden ${isPrintPreviewMode ? 'hidden' : ''}`}>
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
        {isPrintPreviewMode ? (
          <div
            ref={canvasRef}
            className="pdf-canvas flex-1 min-h-0 overflow-y-auto bg-[#cbd5e1] flex flex-col items-center py-8 relative print:block print:h-auto print:w-full print:bg-transparent print:p-0 print:m-0"
            style={{ paddingRight: navPanelOpen ? 256 : 56 }}
          >
            <div
              className="resume-print-shell transition-all duration-300 flex flex-col items-center gap-10 print:gap-0 print:w-full print:max-w-none print:m-0 print:p-0 print:bg-transparent"
              style={{ zoom: zoom }}
            >
              {pageLayers.map((page, pageIdx) => (
                <PdfPageLayer
                  key={pageIdx}
                  pageIndex={pageIdx}
                  totalPages={pageLayers.length}
                >
                  {page.items.map((atom) => (
                    <div key={atom.id} data-atom-id={atom.id} className="w-full">
                      {renderAtomContent(atom)}
                    </div>
                  ))}
                </PdfPageLayer>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative max-w-[1500px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
            {activePage === 'intro' ? (
              <div className={`${sidebarGridClass} print:block z-[1]`}>

            {/* Main Content Column */}
            <div className={isPrintPreviewMode ? 'resume-page flex min-w-0 flex-col gap-0 space-y-0 relative z-10' : 'resume-page flex min-w-0 flex-col gap-12'}>
              
              {/* General Career Summary Banner (Hero) / Combined Profile Banner */}
              <div id="intro-profile" {...printSectionProps('intro-profile')} className={`resume-profile-card scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] backdrop-blur-md${printSectionClass('intro-profile')}`}>
            <div className="absolute top-0 right-0 w-96 h-96 bg-slate-800/5 rounded-full filter blur-[60px] -mr-20 -mt-20 pointer-events-none print:hidden" />

            <div className="relative z-10 space-y-6">
              
              {/* Top Row: Name, English Name, Social Links, and Deploy Badge */}
              {/* Top Row: Name, English Name, Job Title and Social Links */}
              <div className="resume-profile-toprow flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
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
                <span>unbrdn.me</span>
              </div>

              {/* Bio & Personal Info */}
              <div className="space-y-6">
                <div>
                  <p className="resume-body mt-2 max-w-4xl whitespace-pre-line break-words text-slate-600">
                    {profile.bio}
                  </p>
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
              {renderSectionGap('skills')}
              <section id="skills" {...printSectionProps('skills')} className={`scroll-mt-24 space-y-6${printSectionClass('skills')}`}>
                {renderSectionControls('skills')}
                <div className={cardStyle}>
                  <h2 className="resume-section-title mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 font-black text-slate-900">
                    <Cpu className="h-5 w-5 text-slate-900" />
                    기술 스택
                  </h2>
                  <div className="resume-skill-groups space-y-5">
                    {groupedCoreSkills.map((group) => (
                      <div key={group.value} className="resume-skill-group space-y-4">
                        <h4 className="resume-skill-group-title resume-subtitle flex items-center gap-2 border-b border-slate-100 pb-1.5 font-black text-slate-500">
                          <span className="resume-skill-group-bar h-4 w-1 shrink-0 rounded-full bg-slate-900" aria-hidden />
                          {group.label}
                        </h4>
                        {group.skills.length === 0 ? (
                          <p className="border-l-4 border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-400">
                            선택된 기술이 없습니다.
                          </p>
                        ) : isPrintPreviewMode ? (
                          // PDF 인쇄 프리뷰: 서브카테고리·아이콘 없이 배지만 나열
                          <div className="resume-skill-badges flex flex-wrap gap-1.5 border-l-2 border-slate-100 pl-3">
                            {group.skills.map((skill) => (
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
                        ) : (
                          // 일반 화면: 서브카테고리 + 아이콘 표시
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

                        {selectedCoreSkill.comment && (
                          <p className="resume-body mt-3 text-slate-600">{selectedCoreSkill.comment}</p>
                        )}

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
              {renderSectionGap('competencies')}
              <section id="competencies" {...printSectionProps('competencies')} className={`print-competency-section scroll-mt-24 space-y-6${printSectionClass('competencies')}`}>
                {renderSectionControls('competencies')}
                <div className={`${cardStyle} print:rounded-none print:border-x-0 print:border-t-0 print:p-0 print:shadow-none`}>
                  <div data-print-atom="" className="resume-competency-header flex items-center justify-between gap-2 border-b border-slate-200 pb-4 print:pb-2">
                    <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                      <Sparkles className="h-5 w-5 text-slate-900" />
                      핵심 역량
                    </h2>
                    {expandableCompetencyIds.length > 0 && (
                      <button
                        type="button"
                        aria-expanded={isAllCompetenciesExpanded}
                        onClick={toggleExpandAllCompetencies}
                        className="group/expand inline-flex items-center gap-1 text-[0.6875rem] font-bold leading-4 text-slate-400 transition hover:text-slate-800 print:hidden"
                      >
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isAllCompetenciesExpanded ? 'rotate-180' : ''}`} />
                        {isAllCompetenciesExpanded ? '모두 접기' : '모두 펼치기'}
                      </button>
                    )}
                  </div>

                  <div className="mt-2 divide-y divide-slate-200 border-b border-slate-200">
                    {orderedCompetencies.map((competency, index) => (
                      <Fragment key={competency.id}>
                      {renderItemGap(`competency:${competency.id}`)}
                      <article
                        id={`competency-${competency.id}`}
                        {...printItemProps(`competency:${competency.id}`)}
                        className="print-competency-row scroll-mt-24 grid gap-3 py-5 sm:grid-cols-[minmax(180px,0.32fr)_minmax(0,1fr)] sm:gap-6 print:grid-cols-[31%_69%] print:gap-4 print:py-3"
                      >
                        {renderItemControls(`competency:${competency.id}`)}
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="resume-label inline-block w-7 shrink-0 font-black tabular-nums tracking-[0.14em] text-slate-400">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <h3 className="resume-item-title font-black text-slate-900">
                              {competency.title}
                            </h3>
                          </div>
                          {competency.skills.length > 0 && (
                            <p className="resume-meta mt-2 pl-9 font-bold text-slate-500 print:mt-1 print:pl-9">
                              {competency.skills.slice(0, 6).map((skill) => skill.name).join(' · ')}
                            </p>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="resume-body font-semibold text-slate-700">
                            {competency.summary}
                          </p>

                          {!isPrintPreviewMode && (competency.evidences.length > 0 || competency.relatedStudies.length > 0) && (
                            <div className="mt-3 print:hidden">
                              <button
                                type="button"
                                onClick={() => toggleCompetencyEvidence(competency.id)}
                                aria-expanded={expandedCompetencyIds.includes(competency.id)}
                                className="flex items-center gap-1.5 text-left print:hidden"
                              >
                                <span className="resume-label font-black uppercase tracking-[0.14em] text-slate-400">
                                  근거
                                </span>
                                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${expandedCompetencyIds.includes(competency.id) ? 'rotate-180 text-slate-800' : ''}`} />
                              </button>

                              {expandedCompetencyIds.includes(competency.id) && (
                                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                  {competency.evidences.map((evidence) => (
                                    <button
                                      key={`evidence-${evidence.id}`}
                                      type="button"
                                      title={evidence.experienceTitle}
                                      onClick={() => {
                                        if (evidence.experienceType === 'PROJECT') {
                                          const milestone = activeMilestones.find((item) => item.experienceId === evidence.experienceId);
                                          if (milestone) setSelectedMilestoneId(milestone.id);
                                          document.getElementById(`project-experience-${evidence.experienceId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        } else {
                                          scrollToSection('career');
                                        }
                                      }}
                                      className="font-semibold text-slate-600 hover:text-slate-900 hover:underline"
                                    >
                                      {evidence.experienceType === 'CAREER' ? '경력' : '프로젝트'} · {evidence.experienceTitle}
                                    </button>
                                  ))}
                                  {competency.relatedStudies.map((study) => (
                                    <button
                                      key={`study-${study.id}`}
                                      type="button"
                                      onClick={() => openStudy(study.slug, `competency-${competency.id}`)}
                                      className="font-bold text-blue-700 hover:underline"
                                    >
                                      {study.title}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </article>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </section>

              {/* SECTION 2: 직장 경력 */}
              {renderSectionGap('career')}
              <section id="career" {...printSectionProps('career')} className={`scroll-mt-24 space-y-6${printSectionClass('career')}`}>
                {renderSectionControls('career')}
                {orderedCareerCards.map(career => (
                  <div key={career.id} className={cardStyle}>
                    <h2 data-print-atom="" className="resume-section-title mb-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-3 font-black text-slate-900">
                      <span className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-slate-900" />
                        직장 경력 (총 {careerSummary})
                      </span>
                      {(expandableDetailIds.length > 0 || expandableCareerProjectIds.length > 0) && (
                        <button
                          type="button"
                          aria-expanded={isAllExpanded}
                          onClick={toggleExpandAll}
                          className="group/expand inline-flex items-center gap-1 text-[0.6875rem] font-bold leading-4 text-slate-400 transition hover:text-slate-800 print:hidden"
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isAllExpanded ? 'rotate-180' : ''}`} />
                          {isAllExpanded ? '모두 접기' : '모두 펼치기'}
                        </button>
                      )}
                    </h2>
                    <div>
                      <div data-print-atom="">
                        <span className="resume-print-plain resume-meta inline-flex rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-bold text-slate-950">
                          {career.period}
                        </span>
                        <p className="resume-item-title mt-2 font-black text-slate-800">{career.companyName} ({career.employmentType})</p>
                        <p className="resume-meta font-semibold text-slate-500">{career.department} / {career.role}</p>
                        {career.summary && (
                          <div className="resume-body mt-3 text-slate-600">
                            <ReactMarkdown components={resumeMarkdownComponents}>{career.summary}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                      <ul className="mt-4 space-y-2">
                        {(() => {
                          return career.projects.map((project) => {
                          const isProjectExpanded = expandedCareerProjectIds.includes(project.id);
                          return (
                            <Fragment key={project.id}>
                            {renderItemGap(`career-project:${project.id}`)}
                            <li {...printItemProps(`career-project:${project.id}`)} className="border-b border-slate-100 last:border-b-0">
                              {renderItemControls(`career-project:${project.id}`)}
                              <button
                                type="button"
                                onClick={() => toggleCareerProject(project.id)}
                                data-print-atom="" className="group flex w-full items-start gap-2.5 py-3 text-left"
                              >
                                <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 print:hidden ${isProjectExpanded ? 'rotate-180 text-slate-800' : 'group-hover:text-slate-600'}`} />
                                <span className="min-w-0 flex-1">
                                  <span className="resume-body block font-semibold text-slate-750 group-hover:text-slate-950">{project.title}</span>
                                  <span className="resume-meta mt-0.5 block text-slate-400">
                                    {project.periodStart.replace(/-/g, '.').substring(0, 7)} - {project.periodEnd ? project.periodEnd.replace(/-/g, '.').substring(0, 7) : '진행 중'}
                                    {project.contributionRate != null ? ` · 기여도 ${project.contributionRate}%` : ''}
                                  </span>
                                </span>
                              </button>

                              <div className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out print:block print:opacity-100 ${isProjectExpanded ? 'mb-4 grid-rows-[1fr] opacity-100' : 'mb-0 grid-rows-[0fr] opacity-0'}`}>
                                <div className="min-h-0 overflow-hidden">
                                  <div className="ml-2 border-l-2 border-slate-200 pl-3 print:ml-0 print:border-l-0 print:pl-0">
                                    {project.summary && (
                                      <div className="mb-3">
                                        <h4 className="resume-label font-bold text-slate-400 uppercase tracking-wider">프로젝트 설명 및 역할</h4>
                                        <div data-print-atom="" className="resume-body mt-1 text-slate-600">
                                          <ReactMarkdown components={resumeMarkdownComponents}>{project.summary}</ReactMarkdown>
                                        </div>
                                      </div>
                                    )}
                                    {project.details.length > 0 && (
                                      <div data-print-atom="" className="resume-detail-header mb-1.5 mt-1 flex items-center gap-1.5">
                                        <h4 className="resume-label flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700">
                                          <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                                          상세 경험
                                        </h4>
                                      </div>
                                    )}
                                    <ul className="divide-y divide-slate-100">
                                      {(() => {
                                        return project.details.map((detail) => {
                                        const isExpanded = expandedCareerDetailIds.includes(detail.id);
                                        const hasDetailContent = Boolean(detail.situation || detail.actionDetail || detail.outcome);
                                        return (
                                          <Fragment key={detail.id}>
                                          {renderItemGap(`detail:${detail.id}`)}
                                          <li
                                            id={`experience-detail-${detail.id}`}
                                            {...printItemProps(`detail:${detail.id}`)}
                                            data-print-atom=""
                                            className="scroll-mt-24 py-1.5 first:pt-0 last:pb-0"
                                          >
                                            {renderItemControls(`detail:${detail.id}`)}
                                            <div
                                              className={`print-detail-row group grid grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-x-2 py-1 ${hasDetailContent ? 'cursor-pointer' : 'cursor-default'}`}
                                              onClick={() => hasDetailContent && toggleCareerDetail(detail.id)}
                                            >
                                              <span className="flex h-5 items-center justify-center">
                                                {hasDetailContent ? (
                                                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 print:hidden ${isExpanded ? 'rotate-180 text-slate-800' : ''}`} />
                                                ) : (
                                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                                )}
                                              </span>
                                              <span className="resume-body min-w-0 text-slate-700">{detail.content}</span>
                                              {detail.id > 0 && (
                                                <button
                                                  type="button"
                                                  aria-hidden={!isExpanded}
                                                  tabIndex={isExpanded ? 0 : -1}
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    openExperienceDetail(detail.id, `experience-detail-${detail.id}`);
                                                  }}
                                                  className={`resume-meta shrink-0 whitespace-nowrap font-bold text-slate-600 transition-opacity hover:text-slate-950 hover:underline print:hidden ${isExpanded ? 'visible opacity-100' : 'invisible opacity-0'}`}
                                                >
                                                  자세히 보기
                                                </button>
                                              )}
                                            </div>

                                            {hasDetailContent && (
                                              <div className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out print:block print:opacity-100 ${isExpanded ? 'mb-3 mt-2 grid-rows-[1fr] opacity-100' : 'mb-0 mt-0 grid-rows-[0fr] opacity-0'}`}>
                                                <div className="min-h-0 overflow-hidden">
                                                  <div className="resume-career-detail resume-body ml-7 space-y-2.5 text-slate-600 print:ml-0">
                                                    {renderDetailFields(detail, `${detail.id}`)}
                                                    {detail.skills.length > 0 && (
                                                      <div className="flex flex-wrap gap-1 pt-1">
                                                        {detail.skills.map((skill) => <span key={skill.id} className={badgeStyle}>{skill.name}</span>)}
                                                      </div>
                                                    )}
                                                    {detail.id > 0 && <RelatedStudyNotes experienceDetailId={detail.id} onOpenStudy={openStudy} />}
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </li>
                                          </Fragment>
                                        );
                                        });
                                      })()}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </li>
                            </Fragment>
                          );
                        });
                        })()}
                        {career.details.map(detail => {
                          const isExpanded = expandedCareerDetailIds.includes(detail.id);
                          const hasDetailContent = Boolean(detail.situation || detail.actionDetail || detail.outcome || detail.skills.length > 0);
                          return (
                            <Fragment key={detail.id}>
                            {renderItemGap(`detail:${detail.id}`)}
                            <li
                              id={`experience-detail-${detail.id}`}
                              {...printItemProps(`detail:${detail.id}`)}
                              className={`resume-career-item list-none scroll-mt-24 transition-all duration-300 ${
                                isExpanded
                                  ? 'pb-6 mb-6 border-b border-slate-200/50 last:border-0 last:pb-0 last:mb-0'
                                  : 'border-b border-transparent'
                              }`}
                            >
                              {renderItemControls(`detail:${detail.id}`)}
                              <div
                                data-print-atom=""
                                data-print-break-parent=""
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
                                    aria-hidden={!isExpanded}
                                    tabIndex={isExpanded ? 0 : -1}
                                    onClick={(e) => { e.stopPropagation(); openExperienceDetail(detail.id, `experience-detail-${detail.id}`); }}
                                    className={`resume-meta shrink-0 whitespace-nowrap font-bold text-slate-800 transition-opacity duration-200 hover:text-slate-950 hover:underline print:hidden ${isExpanded ? 'visible opacity-100' : 'invisible opacity-0'}`}
                                  >
                                    자세히 보기
                                  </button>
                                )}
                              </div>
                              {hasDetailContent && (
                                <div className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out print:block print:opacity-100 ${isExpanded ? 'mt-3 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'}`}>
                                  <div className="min-h-0 overflow-hidden">
                                    <div className="resume-career-detail resume-body ml-6 space-y-3.5 text-slate-600 print:ml-0">
                                  {renderDetailFields(detail, `${detail.id}`)}
                                  {detail.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                      {detail.skills.map(s => (
                                        <span key={s.id} className={badgeStyle}>{s.name}</span>
                                      ))}
                                    </div>
                                  )}
                                  {detail.id > 0 && <RelatedStudyNotes experienceDetailId={detail.id} onOpenStudy={openStudy} />}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </li>
                            </Fragment>
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
              {renderSectionGap('credentials')}
              <section id="credentials" {...printSectionProps('credentials')} className={`resume-credentials-section order-2 scroll-mt-24 space-y-6${printSectionClass('credentials')}`}>
                {renderSectionControls('credentials')}
                <div className={cardStyle}>
                  <div data-print-atom="" className="resume-credentials-header border-b border-slate-100 pb-4">
                    <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                      <GraduationCap className="h-5 w-5 text-slate-900" />
                      학력 · 교육 및 자격증
                    </h2>
                  </div>

                  <div className="resume-credential-groups mt-6">
                    {isPrintPreviewMode ? (
                      orderedCredentialExperiences.length > 0 ? (
                        <div className="resume-credential-list space-y-3">
                          {orderedCredentialExperiences.map((credential) => {
                            const kind = credentialKindLabel(credential);
                            const isCertificate = credential.type === 'CERTIFICATE';
                            const kindStyle = kind === '학력'
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                              : kind === '교육'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700';
                            return (
                              <Fragment key={credential.id}>
                                {renderItemGap(`credential:${credential.id}`)}
                                {kind === '교육' ? (
                                  /* 교육 항목: 상세 설명, 기술스택, 기간, 관련 노트 생생하게 유지 */
                                  <article
                                    id={`credential-experience-${credential.id}`}
                                    {...printItemProps(`credential:${credential.id}`)}
                                    className="resume-credential-item scroll-mt-24 rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm relative"
                                  >
                                    {renderItemControls(`credential:${credential.id}`)}
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className={`resume-credential-kind resume-label shrink-0 rounded-full border px-2 py-0.5 font-black ${kindStyle}`}>
                                            {kind}
                                          </span>
                                          <h4 className="resume-subtitle min-w-0 font-black text-slate-800">{credential.title}</h4>
                                        </div>
                                        {credential.institutionName && (
                                          <p className="resume-meta mt-1 font-semibold text-slate-500">
                                            {credential.institutionName}
                                          </p>
                                        )}
                                      </div>
                                      <span className="resume-print-plain resume-label shrink-0 rounded border border-slate-200 bg-white px-2 py-1 font-bold text-slate-600">
                                        {formatCredentialPeriod(credential)}
                                      </span>
                                    </div>
                                    {credential.summary && (
                                      <div className="resume-body mt-3 text-slate-600">
                                        <ReactMarkdown components={resumeMarkdownComponents}>{credential.summary}</ReactMarkdown>
                                      </div>
                                    )}
                                    {credential.skills.length > 0 && (
                                      <div className="mt-3 flex flex-wrap gap-1">
                                        {credential.skills.map((skill) => <span key={skill.id} className={badgeStyle}>{skill.name}</span>)}
                                      </div>
                                    )}
                                    <RelatedStudyNotes experienceId={credential.id} refSectionId={`credential-experience-${credential.id}`} onOpenStudy={openStudy} />
                                  </article>
                                ) : (
                                  /* 자격증 및 학력 항목: 깔끔하게 단 1줄 컴팩트 처리 */
                                  <article
                                    id={`credential-experience-${credential.id}`}
                                    {...printItemProps(`credential:${credential.id}`)}
                                    className="resume-credential-item scroll-mt-24 rounded-lg border border-slate-200/80 bg-white p-2.5 px-3 shadow-none flex items-center justify-between gap-3 text-xs"
                                  >
                                    {renderItemControls(`credential:${credential.id}`)}
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span className={`resume-credential-kind resume-label shrink-0 rounded-full border px-2 py-0.5 font-black text-[10px] ${kindStyle}`}>
                                        {kind}
                                      </span>
                                      <h4 className="resume-subtitle font-bold text-slate-800 truncate">{credential.title}</h4>
                                      {(isCertificate ? credential.issuer : credential.institutionName) && (
                                        <>
                                          <span className="text-slate-300 shrink-0">|</span>
                                          <span className="resume-meta font-medium text-slate-500 truncate">
                                            {isCertificate ? credential.issuer : credential.institutionName}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    <span className="resume-print-plain resume-label shrink-0 font-bold text-slate-500 text-[11px] whitespace-nowrap">
                                      {formatCredentialPeriod(credential)}{isCertificate ? ' 취득' : ''}
                                    </span>
                                  </article>
                                )}
                              </Fragment>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="resume-body rounded-xl border border-dashed border-slate-200 p-4 text-slate-400">등록된 학력·교육·자격 정보가 없습니다.</p>
                      )
                    ) : (
                      <div className="grid gap-8 lg:grid-cols-2">
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
                                  {certificate.skills.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1">
                                      {certificate.skills.map((skill) => <span key={skill.id} className={badgeStyle}>{skill.name}</span>)}
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
                    )}
                  </div>
                </div>
              </section>

              {/* SECTION 4: 핵심 프로젝트 포트폴리오 */}
              {renderSectionGap('projects')}
              <section id="projects" {...printSectionProps('projects')} className={`order-1 scroll-mt-24 space-y-6${printSectionClass('projects')}`}>
                {renderSectionControls('projects')}
                <div className={cardStyle}>
                  <div data-print-atom="" className="resume-projects-header border-b border-slate-100 pb-4">
                    <h2 className="resume-section-title flex items-center justify-between gap-2 font-black text-slate-900">
                      <span className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-slate-900" />
                        핵심 프로젝트 포트폴리오
                      </span>
                      {getExpandableDetailIds(allMilestoneDetails).length > 0 && (
                        <button
                          type="button"
                          aria-expanded={areAllDetailsExpanded(allMilestoneDetails)}
                          onClick={() => toggleAllDetails(allMilestoneDetails)}
                          className="group/expand inline-flex items-center gap-1 text-[0.6875rem] font-bold leading-4 text-slate-400 transition hover:text-slate-800 print:hidden"
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${areAllDetailsExpanded(allMilestoneDetails) ? 'rotate-180' : ''}`} />
                          {areAllDetailsExpanded(allMilestoneDetails) ? '모두 접기' : '모두 펼치기'}
                        </button>
                      )}
                    </h2>
                    <p className="resume-section-description mt-1 text-slate-500">담당 역할, 설계 세부 사항, 핵심 성과 및 실무 성과에 대한 타임라인 상세입니다.</p>
                  </div>

                  <div className={`resume-project-list relative mt-8 space-y-8 ${activeMilestones.length > 0 ? 'before:absolute before:top-4 before:bottom-4 before:left-[15px] before:w-[2px] before:bg-slate-200' : ''}`}>
                    {activeMilestones.length === 0 && (
                      <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-semibold text-slate-400">
                        편성된 핵심 프로젝트가 없습니다.
                      </p>
                    )}
                    {orderedMilestones.map((m) => (
                      <Fragment key={m.id}>
                      {renderItemGap(`project:${m.id}`)}
                      <div
                        id={`project-experience-${m.experienceId ?? m.id}`}
                        {...printItemProps(`project:${m.id}`)}
                        className="resume-project-item relative pl-10 group cursor-pointer"
                        onClick={() => setSelectedMilestoneId(m.id)}
                      >
                        {renderItemControls(`project:${m.id}`)}

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
                          <div data-print-atom="" className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div>
                              <span className="resume-print-plain resume-meta inline-flex rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-950 border border-slate-200">
                                {m.role} ({m.period})
                              </span>
                              <h3 className="resume-item-title mt-1.5 font-black text-slate-800">
                                {m.title}
                              </h3>
                            </div>
                            {m.repositoryUrl && (
                              <a
                                href={m.repositoryUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(event) => event.stopPropagation()}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 print:hidden"
                              >
                                <Github className="h-4 w-4" />
                                GitHub 저장소
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h4 className="resume-label font-bold text-slate-400 uppercase tracking-wider">
                                프로젝트 설명 및 역할{m.contributionRate != null ? ` · 기여도 ${m.contributionRate}%` : ''}
                              </h4>
                              <div data-print-atom="" className="resume-project-description resume-body mt-1 font-normal text-slate-600">
                                <ReactMarkdown components={resumeMarkdownComponents}>{m.description}</ReactMarkdown>
                              </div>
                            </div>

                            {m.tags.length > 0 && (
                              <div className="print:hidden">
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

                            {m.details.length > 0 && (
                              <div className="border-t border-slate-100 pt-3">
                                <div data-print-atom="" className="resume-detail-header mb-2.5 flex items-center justify-between gap-3">
                                  <h4 className="resume-label flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700">
                                    <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                                    상세 경험
                                  </h4>
                                  {getExpandableDetailIds(m.details).length > 0 && (
                                    <button
                                      type="button"
                                      aria-expanded={areAllDetailsExpanded(m.details)}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        toggleAllDetails(m.details);
                                      }}
                                      className="group/expand inline-flex items-center gap-1 text-[0.6875rem] font-bold leading-4 text-slate-400 transition hover:text-slate-800 print:hidden"
                                    >
                                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${areAllDetailsExpanded(m.details) ? 'rotate-180' : ''}`} />
                                      {areAllDetailsExpanded(m.details) ? '모두 접기' : '모두 펼치기'}
                                    </button>
                                  )}
                                </div>
                                <ul className="divide-y divide-slate-100">
                                  {(() => {
                                    return m.details.map((detail) => {
                                    const isExpanded = expandedCareerDetailIds.includes(detail.id);
                                    const hasDetailContent = Boolean(detail.situation || detail.actionDetail || detail.outcome || detail.skills.length > 0);
                                    return (
                                      <Fragment key={detail.id}>
                                      {renderItemGap(`detail:${detail.id}`)}
                                      <li
                                        id={`experience-detail-${detail.id}`}
                                        {...printItemProps(`detail:${detail.id}`)}
                                        className="resume-career-item list-none scroll-mt-24 py-1.5 first:pt-0.5 last:pb-0.5"
                                      >
                                        {renderItemControls(`detail:${detail.id}`)}
                                        <div
                                          data-print-atom=""
                                          data-print-break-parent=""
                                          className={`print-detail-row group grid grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-x-2.5 rounded-md py-1 transition ${
                                            hasDetailContent ? 'cursor-pointer' : 'cursor-default'
                                          }`}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            if (hasDetailContent) toggleCareerDetail(detail.id);
                                          }}
                                        >
                                          <span className="flex h-5 items-center justify-center">
                                            {hasDetailContent ? (
                                              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 print:hidden ${isExpanded ? 'rotate-180 text-slate-800' : 'group-hover:text-slate-600'}`} />
                                            ) : (
                                              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                            )}
                                          </span>
                                          <span className={`min-w-0 text-sm leading-5 transition sm:text-[0.9375rem] ${
                                            hasDetailContent
                                              ? 'font-medium text-slate-700 group-hover:text-slate-900'
                                              : 'text-slate-500'
                                          }`}>
                                            {detail.content}
                                          </span>
                                          {detail.id > 0 && (
                                            <button
                                              type="button"
                                              aria-hidden={!isExpanded}
                                              tabIndex={isExpanded ? 0 : -1}
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                openExperienceDetail(detail.id, `experience-detail-${detail.id}`);
                                              }}
                                              className={`resume-meta shrink-0 whitespace-nowrap font-bold text-slate-600 transition-opacity duration-200 hover:text-slate-950 hover:underline print:hidden ${isExpanded ? 'visible opacity-100' : 'invisible opacity-0'}`}
                                            >
                                              자세히 보기
                                            </button>
                                          )}
                                        </div>

                                        {hasDetailContent && (
                                          <div className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out print:block print:opacity-100 ${isExpanded ? 'mt-2 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'}`}>
                                            <div className="min-h-0 overflow-hidden">
                                              <div className="resume-career-detail resume-body ml-[30px] space-y-2.5 text-slate-600 print:ml-0">
                                            {renderDetailFields(detail, `${detail.id}`)}
                                            {detail.skills.length > 0 && (
                                              <div className="flex flex-wrap gap-1 pt-1 print:hidden">
                                                {detail.skills.map((skill) => (
                                                  <span key={skill.id} className={badgeStyle}>{skill.name}</span>
                                                ))}
                                              </div>
                                            )}
                                            {detail.id > 0 && <RelatedStudyNotes experienceDetailId={detail.id} onOpenStudy={openStudy} />}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </li>
                                      </Fragment>
                                    );
                                    });
                                  })()}
                                </ul>
                              </div>
                            )}

                            {m.experienceId && (
                              <>
                                <RelatedExperienceLinks experienceId={m.experienceId} onNavigate={navigateToRelatedExperience} />
                              </>
                            )}

                            {m.takeaway && (
                              <div data-print-atom="" className="resume-project-takeaway border-t border-slate-100 pt-3.5">
                                <h4 className="resume-label flex items-center gap-1 font-bold text-emerald-700">
                                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                                  핵심 성과 & 배운 점 (Takeaway)
                                </h4>
                                <div className="resume-body mt-1 font-semibold text-emerald-800">
                                  <ReactMarkdown components={resumeMarkdownComponents}>{m.takeaway}</ReactMarkdown>
                                </div>
                              </div>
                            )}

                            <div>
                              <h4 className="resume-label mb-1.5 font-bold uppercase tracking-wider text-slate-400">활용 기술 스택</h4>
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
                      </Fragment>
                    ))}
                  </div>
                </div>
              </section>

            </div>

            {/* Right Sticky Sidebar Column */}
            <aside className="block print:hidden w-full sticky top-24 self-start">
              <div className={`relative rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-md backdrop-blur-md min-[900px]:flex min-[900px]:flex-col min-[900px]:border-l-4 min-[900px]:border-l-slate-300 ${isSectionNavCollapsed ? 'min-[900px]:gap-3 min-[900px]:px-1.5 min-[900px]:py-3' : 'min-[900px]:gap-4 min-[900px]:px-5 min-[900px]:py-4'}`}>
                {renderSectionNavToggle()}
                <div className={`hidden relative pl-4 before:absolute before:top-2.5 before:bottom-2.5 before:left-[4px] before:w-[2px] before:bg-slate-200 ${isSectionNavCollapsed ? '' : 'min-[900px]:block'}`}>
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

                <div className={`relative flex flex-col items-center gap-2 py-1.5 before:absolute before:bottom-5 before:top-5 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-slate-200 ${isSectionNavCollapsed ? 'min-[900px]:flex' : 'min-[900px]:hidden'}`}>
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

                <hr className={`hidden border-slate-100 ${isSectionNavCollapsed ? '' : 'min-[900px]:block'}`} />

                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="mt-2 grid h-8 w-full place-items-center rounded-lg border border-slate-200 bg-white text-sm font-extrabold text-slate-500 transition hover:border-slate-300 hover:text-slate-900 min-[900px]:mt-0 min-[900px]:flex min-[900px]:items-center min-[900px]:justify-center min-[900px]:gap-1 min-[900px]:py-2"
                  title="위로 가기"
                  aria-label="위로 가기"
                >
                  <ArrowUp className="h-4 w-4 shrink-0" />
                  <span className={`hidden ${isSectionNavCollapsed ? '' : 'min-[900px]:inline'}`}>위로 가기</span>
                </button>
              </div>
            </aside>

          </div>
        ) : activePage === 'architecture' ? (
          /* SYSTEM ARCHITECTURE PAGE */
          <div className={`${sidebarGridClass} print:hidden pb-12`}>

            {/* Main Content Column */}
            <div className="resume-page min-w-0 space-y-8">
              <div id="architecture-components" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] backdrop-blur-md">
                <div className="absolute top-0 right-0 w-80 h-80 bg-slate-800/5 rounded-full filter blur-[50px] -mr-16 -mt-16 pointer-events-none" />
                <div className="relative z-10 border-b border-slate-100 pb-5">
                  <h1 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                    <Terminal className="h-6 w-6 text-slate-900" />
                    {architectureOverview?.heading ?? '시스템 아키텍처 (Self-Intro Architecture)'}
                  </h1>
                  <p className="resume-section-description mt-2 text-slate-500 font-normal leading-relaxed">
                    {architectureOverview?.subheading ?? '이 포트폴리오 웹앱의 도메인 모듈 구조, DB 데이터 관리 방식, 그리고 Cloudflare·오라클 Free Tier 기반 배포 인프라까지 담은 설계 명세입니다.'}
                  </p>
                </div>

                <div className="relative z-10 mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                  {!architectureLayers ? (
                    <p className="py-10 text-center text-sm font-bold text-slate-400 md:col-span-3">구성 요소를 불러오는 중입니다...</p>
                  ) : architectureLayers.length === 0 ? (
                    <p className="py-10 text-center text-sm font-bold text-slate-400 md:col-span-3">등록된 아키텍처 구성 요소가 없습니다.</p>
                  ) : architectureLayers.map((layer) => (
                    <div key={layer.id} className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-5 shadow-sm">
                      <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-3">
                        <span className="p-1.5 rounded bg-slate-100 leading-none">{layer.icon}</span>
                        {layer.title}
                      </h2>
                      <ul className="resume-body text-slate-600 space-y-2 leading-relaxed font-normal [overflow-wrap:anywhere]">
                        {layer.items.map((item) => (
                          <li key={item.id}>
                            {item.strongText && <strong className="text-slate-800 font-bold">{item.strongText}</strong>}
                            {item.bodyText}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div id="architecture-diagram" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-slate-950 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.12)]">
                <h2 className="text-base sm:text-lg font-black text-slate-100 mb-3 flex items-center gap-1.5">
                  <span>☸️</span>
                  <span>{architectureOverview?.diagramHeading ?? '실제 운영(Production) 시스템 아키텍처 및 배포 흐름도'}</span>
                </h2>
                <div className="text-[10px] xs:text-[11px] sm:text-[12.5px] md:text-[14px] lg:text-[12.5px] xl:text-[14px] print:text-[9px] font-mono text-slate-300 bg-slate-900 p-4 rounded-lg leading-normal tracking-tight sm:tracking-normal print:leading-[1.15] print:tracking-tighter whitespace-pre overflow-x-auto border border-slate-800">
                  {architectureOverview?.diagramText ?? '배포 흐름도를 불러오는 중입니다...'}
                </div>
              </div>
            </div>

            {/* Right Sticky Sidebar Column */}
            <aside className="block print:hidden w-full sticky top-24 self-start">
              <div className={`relative rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-md backdrop-blur-md min-[900px]:flex min-[900px]:flex-col min-[900px]:border-l-4 min-[900px]:border-l-slate-300 ${isSectionNavCollapsed ? 'min-[900px]:gap-3 min-[900px]:px-1.5 min-[900px]:py-3' : 'min-[900px]:gap-4 min-[900px]:px-5 min-[900px]:py-4'}`}>
                {renderSectionNavToggle()}
                <div className={`hidden relative pl-4 before:absolute before:top-2.5 before:bottom-2.5 before:left-[4px] before:w-[2px] before:bg-slate-200 ${isSectionNavCollapsed ? '' : 'min-[900px]:block'}`}>
                  {architectureSections.map((step) => (
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

                <div className={`relative flex flex-col items-center gap-2 py-1.5 before:absolute before:bottom-5 before:top-5 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-slate-200 ${isSectionNavCollapsed ? 'min-[900px]:flex' : 'min-[900px]:hidden'}`}>
                  {architectureSections.map((step) => {
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

                <hr className={`hidden border-slate-100 ${isSectionNavCollapsed ? '' : 'min-[900px]:block'}`} />

                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="mt-2 grid h-8 w-full place-items-center rounded-lg border border-slate-200 bg-white text-sm font-extrabold text-slate-500 transition hover:border-slate-300 hover:text-slate-900 min-[900px]:mt-0 min-[900px]:flex min-[900px]:items-center min-[900px]:justify-center min-[900px]:gap-1 min-[900px]:py-2"
                  title="위로 가기"
                  aria-label="위로 가기"
                >
                  <ArrowUp className="h-4 w-4 shrink-0" />
                  <span className={`hidden ${isSectionNavCollapsed ? '' : 'min-[900px]:inline'}`}>위로 가기</span>
                </button>
              </div>
            </aside>

          </div>
        ) : activePage === 'experience' ? (
          /* EXPERIENCE PAGE */
          <div className="space-y-4 animate-fadeIn">
            {selectedExperienceDetailId && (
              <div className="flex items-center justify-between pb-1">
                <button onClick={closeExperienceDetail} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950">
                  <ArrowLeft className="h-4 w-4" /> {referrer ? '이전 화면으로' : '경험 목록'}
                </button>
              </div>
            )}
            <div className={`${sidebarGridClass} print:block pb-12`}>

              {/* Main Content Column */}
              <div className="min-w-0 space-y-8">
                {selectedExperienceDetailId ? (
                  <>
                    {selectedExperienceDetail && (
                      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
                        <div className="mb-8 border-b border-slate-100 pb-6">
                          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">{experienceTypeLabel(selectedExperienceDetail.experience.type)}</span>
                            <span className="font-mono">{formatCredentialPeriod(selectedExperienceDetail.experience)}</span>
                          </div>
                          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{selectedExperienceDetail.detail.content}</h1>
                          <p className="mt-2 text-sm font-bold text-slate-500 sm:text-base">
                            {selectedExperienceDetail.experience.title}
                            {experienceOrgName(selectedExperienceDetail.experience) ? ` · ${experienceOrgName(selectedExperienceDetail.experience)}` : ''}
                          </p>
                        </div>

                        <div className="space-y-6">
                          {(() => {
                            const detail = selectedExperienceDetail.detail;
                            const merged = detail.narrative
                              || [detail.situation, detail.actionDetail, detail.outcome].filter(Boolean).join('\n\n');
                            return merged ? (
                              <div className="text-sm leading-relaxed text-slate-600 sm:text-base">
                                <ReactMarkdown components={markdownComponents}>{merged}</ReactMarkdown>
                              </div>
                            ) : null;
                          })()}
                        </div>

                        <div className="mt-8 flex flex-wrap gap-1.5">
                          {(selectedExperienceDetail.detail.skills.length > 0 ? selectedExperienceDetail.detail.skills : selectedExperienceDetail.experience.skills).map((skill) => (
                            <span key={skill.id} className={badgeStyle}>{skill.name}</span>
                          ))}
                        </div>
                      </article>
                    )}
                  </>
                ) : (
                  <>
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                      <div className="absolute right-0 top-0 h-80 w-80 -translate-y-16 translate-x-16 rounded-full bg-slate-800/5 blur-[50px]" />
                      <div className="relative">
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">경험</h1>
                        <p className="mt-1 text-sm leading-relaxed text-slate-500 sm:text-base">실무 경력, 프로젝트, 학력, 자격증에서의 세부 경험을 모아 정리했습니다.</p>
                      </div>
                    </div>
                    <div className="sticky top-16 z-20 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {experienceTypeTabs.map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setExperienceTypeFilter(tab.id)}
                            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${experienceTypeFilter === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <input
                        type="search"
                        value={experienceSearch}
                        onChange={(event) => setExperienceSearch(event.target.value)}
                        placeholder="내용, 제목, 기관명, 기술 검색..."
                        className="w-full rounded-xl border border-slate-200 px-4 py-2 text-xs outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-200 sm:w-72"
                      />
                    </div>
                    <div className="space-y-5">
                      {filteredExperienceDetails.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-sm font-semibold text-slate-400">검색 조건에 맞는 경험이 없습니다.</div>
                      ) : filteredExperienceDetails.map(({ detail, experience }) => (
                        <button
                          key={detail.id}
                          onClick={() => openExperienceDetail(detail.id)}
                          className="block w-full rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-8"
                        >
                          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                            <span className="rounded bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">{experienceTypeLabel(experience.type)}</span>
                            <span className="font-mono text-xs font-bold text-slate-400">{formatCredentialPeriod(experience)}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-400">
                            {experience.title}{experienceOrgName(experience) ? ` · ${experienceOrgName(experience)}` : ''}
                          </p>
                          <h2 className="mt-1 text-xl font-black text-slate-900">{detail.content}</h2>
                          {(detail.outcome || detail.actionDetail || detail.situation) && (
                            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                              {detail.outcome || detail.actionDetail || detail.situation}
                            </p>
                          )}
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {(detail.skills.length > 0 ? detail.skills : experience.skills).map((skill) => (
                              <span key={skill.id} className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">{skill.name}</span>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Right Sticky Sidebar Column */}
              <aside className="block print:hidden w-full sticky top-24 self-start">
                <div className={`relative rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-md backdrop-blur-md min-[900px]:flex min-[900px]:flex-col min-[900px]:border-l-4 min-[900px]:border-l-slate-300 ${isSectionNavCollapsed ? 'min-[900px]:gap-3 min-[900px]:px-1.5 min-[900px]:py-3' : 'min-[900px]:gap-4 min-[900px]:px-5 min-[900px]:py-4'}`}>
                  {renderSectionNavToggle()}
                  {selectedExperienceDetailId ? (
                    /* Detail View Sidebar */
                    <>
                      <div className={`hidden ${isSectionNavCollapsed ? '' : 'min-[900px]:block min-[900px]:pr-12'}`}>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">연결 항목</h3>
                        <p className="text-sm text-slate-500 leading-none mt-0.5">
                          이 경험과 연관된 학습 기록입니다.
                        </p>
                      </div>

                      <div className={`hidden space-y-4 ${isSectionNavCollapsed ? '' : 'min-[900px]:block'}`}>
                        {(relatedStudiesForDetail?.content?.length ?? 0) > 0 ? (
                          <div>
                            <h4 className="text-xs font-black uppercase text-slate-400 mb-1">관련 학습 · 기술노트</h4>
                            <div className="space-y-1.5">
                              {relatedStudiesForDetail!.content.map((study) => (
                                <button
                                  key={study.id}
                                  onClick={() => openStudy(study.slug)}
                                  className="flex w-full items-start gap-1 text-left text-xs font-semibold text-slate-600 hover:text-slate-950 leading-normal"
                                >
                                  <span className="mt-0.5 text-slate-400 font-bold shrink-0">›</span>
                                  <span>{study.title}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs font-bold text-slate-400 italic">연결된 항목이 없습니다.</p>
                        )}
                      </div>

                      <div className={`flex flex-col items-center gap-2 py-1 ${isSectionNavCollapsed ? 'min-[900px]:flex' : 'min-[900px]:hidden'}`}>
                        <button
                          onClick={closeExperienceDetail}
                          title={referrer ? '이전 화면으로' : '경험 목록'}
                          className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 shadow-sm"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    /* List View Sidebar */
                    <>
                      <div className={`hidden ${isSectionNavCollapsed ? '' : 'min-[900px]:block min-[900px]:pr-12'}`}>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">최근 경험</h3>
                        <p className="text-sm text-slate-500 leading-none mt-0.5">
                          최근 기간의 경험입니다.
                        </p>
                      </div>

                      <div className={`hidden space-y-2 ${isSectionNavCollapsed ? '' : 'min-[900px]:block'}`}>
                        {recentExperienceDetails.map(({ detail }) => (
                          <button
                            key={detail.id}
                            onClick={() => openExperienceDetail(detail.id)}
                            className="block w-full text-left text-xs font-semibold text-slate-600 hover:text-slate-900 transition truncate leading-relaxed"
                            title={detail.content}
                          >
                            • {detail.content}
                          </button>
                        ))}
                      </div>

                      <div className={`flex flex-col items-center gap-2 py-1 ${isSectionNavCollapsed ? 'min-[900px]:flex' : 'min-[900px]:hidden'}`}>
                        <button
                          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                          title="경험 목록 상단"
                          aria-label="경험 목록 상단"
                          className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-slate-900 text-white shadow-sm shadow-slate-800/20 ring-4 ring-slate-200"
                        >
                          <Briefcase className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}

                  <hr className={`hidden border-slate-100 ${isSectionNavCollapsed ? '' : 'min-[900px]:block'}`} />

                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="grid h-8 w-full place-items-center rounded-lg border border-slate-200 bg-white text-sm font-extrabold text-slate-500 transition hover:border-slate-300 hover:text-slate-900 min-[900px]:flex min-[900px]:items-center min-[900px]:justify-center min-[900px]:gap-1 min-[900px]:py-2"
                    title="위로 가기"
                    aria-label="위로 가기"
                  >
                    <ArrowUp className="h-4 w-4 shrink-0" />
                    <span className={`hidden ${isSectionNavCollapsed ? '' : 'min-[900px]:inline'}`}>위로 가기</span>
                  </button>
                </div>
              </aside>

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
            <div className={`${sidebarGridClass} print:block pb-12`}>
              
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
                        <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-500">{selectedStudy.summary}</p>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {selectedStudy.tags.map((tag) => <span key={tag.id} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">#{tag.name}</span>)}
                          {selectedStudy.skills.map((skill) => <span key={skill.id} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600">{skill.name}</span>)}
                        </div>
                      </div>
                      <div className="space-y-4 text-sm sm:text-base leading-relaxed text-slate-700">
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
                  <div className="sticky top-16 z-20 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center">
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
              <div className={`relative rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-md backdrop-blur-md min-[900px]:flex min-[900px]:flex-col min-[900px]:border-l-4 min-[900px]:border-l-slate-300 ${isSectionNavCollapsed ? 'min-[900px]:gap-3 min-[900px]:px-1.5 min-[900px]:py-3' : 'min-[900px]:gap-4 min-[900px]:px-5 min-[900px]:py-4'}`}>
                {renderSectionNavToggle()}
                {selectedStudySlug ? (
                  /* Detail View Sidebar */
                  <>
                    <div className={`hidden ${isSectionNavCollapsed ? '' : 'min-[900px]:block min-[900px]:pr-12'}`}>
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">연결 항목</h3>
                      <p className="text-sm text-slate-500 leading-none mt-0.5">
                        이 학습과 연관된 이력 정보입니다.
                      </p>
                    </div>

                    <div className={`hidden space-y-4 ${isSectionNavCollapsed ? '' : 'min-[900px]:block'}`}>
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
                                onClick={() => openExperienceDetail(detail.id)}
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

                    <div className={`flex flex-col items-center gap-2 py-1 ${isSectionNavCollapsed ? 'min-[900px]:flex' : 'min-[900px]:hidden'}`}>
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
                    <div className={`hidden ${isSectionNavCollapsed ? '' : 'min-[900px]:block min-[900px]:pr-12'}`}>
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">최근 작성글</h3>
                      <p className="text-sm text-slate-500 leading-none mt-0.5">
                        최근 등록된 학습 기록입니다.
                      </p>
                    </div>

                    <div className={`hidden space-y-2 ${isSectionNavCollapsed ? '' : 'min-[900px]:block'}`}>
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

                    <div className={`flex flex-col items-center gap-2 py-1 ${isSectionNavCollapsed ? 'min-[900px]:flex' : 'min-[900px]:hidden'}`}>
                      <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        title="공부 정리 목록 상단"
                        aria-label="공부 정리 목록 상단"
                        className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-slate-900 text-white shadow-sm shadow-slate-800/20 ring-4 ring-slate-200"
                      >
                        <BookOpen className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}

                <hr className={`hidden border-slate-100 ${isSectionNavCollapsed ? '' : 'min-[900px]:block'}`} />

                <div className="flex flex-col gap-2 w-full">
                  {selectedStudySlug && (
                    <button
                      onClick={closeStudy}
                      className={`hidden h-8 w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-xs font-extrabold text-slate-500 transition hover:border-slate-300 hover:text-slate-900 ${isSectionNavCollapsed ? '' : 'min-[900px]:flex'}`}
                    >
                      {referrer ? '이전 화면으로' : '목록으로'}
                    </button>
                  )}
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="grid h-8 w-full place-items-center rounded-lg border border-slate-200 bg-white text-sm font-extrabold text-slate-500 transition hover:border-slate-300 hover:text-slate-900 min-[900px]:flex min-[900px]:items-center min-[900px]:justify-center min-[900px]:gap-1 min-[900px]:py-2"
                    title="위로 가기"
                    aria-label="위로 가기"
                  >
                    <ArrowUp className="h-4 w-4 shrink-0" />
                  </button>
                </div>
              </div>
            </aside>
            </div>
          </div>
        )}
      </div>
    )}
  </main>
      {isDonationEnabled && (
        <button
          onClick={() => setDonationOpen(true)}
          className={`fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700 hover:shadow-xl print:hidden ${isPrintPreviewMode ? 'hidden' : ''}`}
          title="후원하기"
        >
          <Heart className="h-4 w-4" />
          <span>후원하기</span>
        </button>
      )}
      {isDonationEnabled && isDonationOpen && <DonationModal onClose={() => setDonationOpen(false)} />}

      {isPrintPreviewMode && (
        <aside
          data-print-preview-ui
          className={`fixed right-0 top-14 bottom-0 z-[60] bg-slate-900 border-l border-slate-800 shadow-2xl transition-all duration-300 print:hidden ${
            navPanelOpen ? 'w-64' : 'w-14'
          }`}
        >
          <PrintPreviewNav
            sections={orderedPrintableSections}
            excludedIds={printExcludedIds}
            itemGroups={printItemGroups}
            lockedSectionIds={[LOCKED_PRINT_SECTION_ID]}
            open={navPanelOpen}
            onRequestToggle={() => setNavPanelOpen((prev) => !prev)}
            onToggle={togglePrintSection}
            onReorder={reorderPrintSections}
            onNavigate={scrollToPrintElement}
            onToggleAll={toggleAllPrintSections}
            excludedCount={printExcludedIds.length}
          />
        </aside>
      )}
      <PrintModeModal
        open={isPrintModeDialogOpen}
        onClose={() => setPrintModeDialogOpen(false)}
        onManual={handlePrintManual}
        onApplyTemplate={handlePrintApplyTemplate}
      />
      <SaveServerTemplateModal
        open={isSaveServerModalOpen}
        onClose={() => setSaveServerModalOpen(false)}
        currentSettings={{
          excludedIds: printExcludedIds,
          sectionOrder: printSectionOrder,
          sectionGaps,
        }}
      />
    </>
  );
}
