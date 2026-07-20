import { Fragment, useState, type FormEvent, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Home,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  BookOpen,
  User,
  Cpu,
  Briefcase,
  PlusCircle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff,
  Eye,
  RefreshCw,
  X,
  BarChart3,
  Users,
  MousePointerClick,
  CalendarDays,
  Clock,
  Sparkles,
  Bot,
  Terminal,
  WandSparkles,
  Check,
  Heart,
  Wrench,
  ListChecks,
  Printer
} from 'lucide-react';
import { PrintTemplateManagement } from './PrintTemplateManagement';
import {
  ApiError,
  studyApi,
  profileApi,
  skillApi,
  experienceApi,
  experiencePlacementApi,
  connectionApi,
  bffApi,
  visitorApi,
  donationApi,
  type DonationEventType,
  type DonationEventActor,
  type StudyRequest,
  type Study,
  type StudySuggestion,
  type Skill,
  type Experience,
  type ExperienceRequest,
  type ExperienceDetailRequest,
  type ExperienceConnections,
  type ExperienceSuggestion,
  type ExperienceDetailSuggestion,
  type IntroductionResponse,
  type GalleryImage
} from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { MarkdownEditor } from './MarkdownEditor';
import { ExperienceDetailPanel } from './ExperienceDetailPanel';
import { SkillGroupSection } from './SkillGroupSection';
import { StudyDetailPanel } from './StudyDetailPanel';
import { ImageGalleryEditor } from './ImageGalleryEditor';
import { getSkillCategoryPresentation, skillCategoryPresentations } from './skillPresentation';
import { SkillBadgeIcon } from '../lib/SkillBadgeIcon';
import { findSkillBadge, recommendSkillBadge, skillBadgeOptions } from '../lib/skillBadges';
import { CompetencyManagement } from './CompetencyManagement';
import { ArchitectureManagement } from './ArchitectureManagement';
import { CoreProjectManagement } from './CoreProjectManagement';
import { VisitorHourlyChart, VisitorTrendChart } from './VisitorCharts';
import { AiStageBubble, useAiSuggestionStream } from './ai/AiDraftAssistant';

const STUDY_AI_FIELD_LABELS: Record<string, string> = {
  text: '사실',
  reason: '판단',
  title: '제목',
  summary: '요약',
  contentMarkdown: '본문',
};

const EXPERIENCE_AI_FIELD_LABELS: Record<string, string> = {
  text: '사실',
  reason: '판단',
  summary: '요약',
  takeaway: '배운 점',
  content: '상세 항목',
  situation: '상황',
  actionDetail: '행동',
  outcome: '성과',
};

type TabId = 'ANALYTICS' | 'DONATIONS' | 'STUDY' | 'PROFILE' | 'SKILLS' | 'COMPETENCIES' | 'EXPERIENCE' | 'CORE_PROJECTS' | 'ARCHITECTURE' | 'PRINT_TEMPLATES';

const ADMIN_MENU_GROUPS = [
  {
    label: '콘텐츠 자산',
    items: [
      { id: 'STUDY', label: '공부 정리 관리', icon: BookOpen },
      { id: 'SKILLS', label: '기술 스택 관리', icon: Cpu },
      { id: 'EXPERIENCE', label: '이력 및 경력 관리', icon: Briefcase },
    ],
  },
  {
    label: '페이지 구성',
    items: [
      { id: 'PROFILE', label: '프로필 정보 관리', icon: User },
      { id: 'COMPETENCIES', label: '핵심 역량 관리', icon: Sparkles },
      { id: 'CORE_PROJECTS', label: '핵심 프로젝트 관리', icon: Pin },
      { id: 'ARCHITECTURE', label: '시스템 아키텍처 관리', icon: Terminal },
      { id: 'PRINT_TEMPLATES', label: 'PDF 템플릿 관리', icon: Printer },
    ],
  },
  {
    label: '방문 분석',
    items: [
      { id: 'ANALYTICS', label: '방문자 통계', icon: BarChart3 },
      { id: 'DONATIONS', label: '후원 내역', icon: Heart },
    ],
  },
] satisfies Array<{
  label: string;
  items: Array<{ id: TabId; label: string; icon: typeof BookOpen }>;
}>;

const DONATION_EVENT_LABELS: Record<DonationEventType, string> = {
  CREATED: '후원 생성',
  PAY_REQUESTED: '결제요청 발급',
  PAY_FAILED: '결제요청 실패',
  PAID: '결제완료',
  CANCELED: '취소/환불',
  CALLBACK_REJECTED: '콜백 거부',
};

const DONATION_ACTOR_LABELS: Record<DonationEventActor, string> = {
  VISITOR: '방문자',
  SYSTEM: '시스템',
  PAYAPP: '페이앱',
  ADMIN: '관리자',
};

const PREVIEW_MIN_WIDTH = 420;
const PREVIEW_MAX_WIDTH = 960;
const PREVIEW_DEFAULT_WIDTH = 760;
// Below this viewport width, the preview takes the full screen instead of docking beside the admin content.
const PREVIEW_STACK_BREAKPOINT = 640;
// Space reserved for the sidebar + a usable minimum of admin content when the preview is docked.
const ADMIN_CONTENT_RESERVE_WIDTH = 460;

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type StudyForm = Omit<StudyRequest, 'tagNames' | 'images'> & { tagNames: string; images: GalleryImage[] };

const emptyStudyForm: StudyForm = {
  slug: '',
  title: '',
  summary: '',
  contentMarkdown: '',
  status: 'DRAFT',
  categoryId: 1,
  tagNames: '',
  skillIds: [],
  experienceIds: [],
  experienceDetailIds: [],
  relatedStudies: [],
  images: [],
  learnedAt: new Date().toISOString().split('T')[0],
  publishedAt: null,
};

const toStudyRequest = (form: StudyForm): StudyRequest => ({
  ...form,
  tagNames: form.tagNames.split(',').map((tag) => tag.trim()).filter(Boolean),
  images: form.images.map(({ id, objectKey, displayOrder }) => ({ id, objectKey, displayOrder })),
});

const emptyProfileForm = {
  name: '',
  nameEn: '',
  jobTitle: '',
  bio: '',
  coreStackSummary: '',
  statusBadgeText: '',
  githubUrl: '',
  email: '',
  phone: '',
};

type SkillForm = Omit<Skill, 'id'> & {
  studyIds: number[];
  experienceIds: number[];
  experienceDetailIds: number[];
};

const emptySkillForm: SkillForm = {
  name: '',
  category: 'FRAMEWORK',
  skillLevel: '중급',
  skillVersion: '',
  comment: '',
  usageType: 'LEARNING',
  badgeKey: '',
  badgeColor: '',
  isCore: false,
  displayOrder: 0,
  studyIds: [],
  experienceIds: [],
  experienceDetailIds: [],
};

const skillUsageOptions = [
  { value: 'LEARNING', label: '학습' },
  { value: 'WORK_EXPERIENCE', label: '실무 경험' },
  { value: 'PROJECT_USE', label: '프로젝트 활용' },
];

type AdminExperienceDetailForm = ExperienceDetailRequest & { studyIds: number[] };

type AdminExperienceForm = Omit<ExperienceRequest, 'details' | 'tagNames' | 'images'> & {
  details: AdminExperienceDetailForm[];
  tagNames: string;
  images: GalleryImage[];
  studyIds: number[];
  relatedExperienceIds: number[];
};

const emptyExperienceForm: AdminExperienceForm = {
  type: 'PROJECT' as ExperienceRequest['type'],
  title: '',
  periodStart: new Date().toISOString().split('T')[0],
  periodEnd: '',
  summary: '',
  takeaway: '',
  displayOrder: 0,
  showOnTimeline: true,
  timelineLabel: '',
  details: [],
  skillIds: [] as number[],
  tagNames: '',
  images: [],
  companyName: '',
  employmentType: '정규직',
  department: '',
  role: '',
  slug: '',
  contributionRate: 100,
  repositoryUrl: '',
  careerId: undefined,
  institutionName: '',
  issuer: '',
  studyIds: [],
  relatedExperienceIds: [],
};

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);

  const [activeTab, setActiveTab] = useState<TabId>('STUDY');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTemplateEditing, setIsTemplateEditing] = useState(false);

  const handleTemplateEditingChange = (editing: boolean) => {
    setIsTemplateEditing(editing);
    if (editing) {
      setIsSidebarCollapsed(true);
    }
  };
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('admin-sidebar-width') : null;
    const parsed = stored ? parseInt(stored, 10) : NaN;
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 170), 380) : 200;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const sidebarResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    sidebarResizeRef.current = { startX: e.clientX, startWidth: sidebarWidth };
  };

  useEffect(() => {
    if (!isResizingSidebar) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarResizeRef.current) return;
      const deltaX = e.clientX - sidebarResizeRef.current.startX;
      const newWidth = Math.min(Math.max(sidebarResizeRef.current.startWidth + deltaX, 170), 380);
      setSidebarWidth(newWidth);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('admin-sidebar-width', String(newWidth));
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      sidebarResizeRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar]);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [previewWidth, setPreviewWidth] = useState(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('admin-preview-width') : null;
    const parsed = stored ? parseInt(stored, 10) : NaN;
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, PREVIEW_MIN_WIDTH), PREVIEW_MAX_WIDTH) : PREVIEW_DEFAULT_WIDTH;
  });
  const [isResizingPreview, setIsResizingPreview] = useState(false);
  const previewResizeStartRef = useRef<{ x: number; width: number } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));

  useEffect(() => {
    const handleWindowResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // The largest width the preview may occupy without crowding out the admin sidebar/content.
  const previewMaxAllowedWidth = Math.min(
    PREVIEW_MAX_WIDTH,
    Math.max(PREVIEW_MIN_WIDTH, viewportWidth - ADMIN_CONTENT_RESERVE_WIDTH),
  );
  // Below the stack breakpoint the preview simply takes the full viewport (mirrors a mobile full-screen view).
  const effectivePreviewWidth = viewportWidth < PREVIEW_STACK_BREAKPOINT
    ? viewportWidth
    : Math.min(previewWidth, previewMaxAllowedWidth);

  // Unified API error handler for security expiration
  const handleMutationError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      setUnauthenticated();
    }
  };

  // --- QUERY HOOKS ---
  const {
    data: studyPage,
    isLoading: isStudyListLoading,
    isError: isStudyListError,
    refetch: refetchStudies,
  } = useQuery({
    queryKey: ['studies', 'admin'],
    queryFn: () => studyApi.adminList(),
  });

  const studies = studyPage?.content;

  const { data: studyCategories } = useQuery({
    queryKey: ['studyCategories'],
    queryFn: studyApi.categories,
  });

  const { data: introData } = useQuery({
    queryKey: ['introduction'],
    queryFn: bffApi.getIntroduction,
  });

  const { data: skillsList } = useQuery<Skill[]>({
    queryKey: ['skills'],
    queryFn: () => skillApi.list(),
  });

  const { data: experiencesList } = useQuery<Experience[]>({
    queryKey: ['experiences'],
    queryFn: () => experienceApi.list(),
  });

  const visitorDateRange = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 13);
    return { from: formatLocalDate(from), to: formatLocalDate(to) };
  }, []);

  const { data: visitorSummary, isLoading: isVisitorSummaryLoading } = useQuery({
    queryKey: ['visitor', 'admin', 'summary'],
    queryFn: visitorApi.adminSummary,
    enabled: activeTab === 'ANALYTICS',
  });

  const { data: visitorDaily = [], isLoading: isVisitorDailyLoading } = useQuery({
    queryKey: ['visitor', 'admin', 'daily', visitorDateRange.from, visitorDateRange.to],
    queryFn: () => visitorApi.adminDaily(visitorDateRange.from, visitorDateRange.to),
    enabled: activeTab === 'ANALYTICS',
  });

  const { data: visitorHourly = [], isLoading: isVisitorHourlyLoading } = useQuery({
    queryKey: ['visitor', 'admin', 'hourly', visitorDateRange.to],
    queryFn: () => visitorApi.adminHourly(visitorDateRange.to),
    enabled: activeTab === 'ANALYTICS',
  });

  const { data: donationSummary, isLoading: isDonationLoading } = useQuery({
    queryKey: ['donations', 'admin'],
    queryFn: donationApi.adminList,
    enabled: activeTab === 'DONATIONS',
  });

  const [expandedDonationId, setExpandedDonationId] = useState<number | null>(null);

  const { data: donationConfig } = useQuery({
    queryKey: ['donationConfig'],
    queryFn: donationApi.config,
    enabled: activeTab === 'DONATIONS',
  });

  const toggleDonationMutation = useMutation({
    mutationFn: (enabled: boolean) => donationApi.adminUpdateSettings(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donationConfig'] });
    },
    onError: (error) => {
      alert(error instanceof ApiError ? error.message : '설정 변경에 실패했습니다.');
    },
  });

  const { data: donationEvents = [], isLoading: isDonationEventsLoading } = useQuery({
    queryKey: ['donations', 'admin', 'events', expandedDonationId],
    queryFn: () => donationApi.adminEvents(expandedDonationId!),
    enabled: activeTab === 'DONATIONS' && expandedDonationId !== null,
  });

  const cancelDonationMutation = useMutation({
    mutationFn: (id: number) => donationApi.adminCancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations', 'admin'] });
      alert('환불 처리가 완료되었습니다.');
    },
    onError: (error) => {
      alert(error instanceof ApiError ? error.message : '환불 처리에 실패했습니다.');
    },
  });

  const handleCancelDonation = (id: number, amount: number) => {
    if (!window.confirm(`${amount.toLocaleString()}원 후원을 환불(결제취소)하시겠습니까?`)) return;
    cancelDonationMutation.mutate(id);
  };

  // --- TAB 1: STUDY STATE & MUTATIONS ---
  const [studyEditingId, setStudyEditingId] = useState<number | null>(null);
  const [studyForm, setStudyForm] = useState<StudyForm>(emptyStudyForm);
  const [isStudyFormOpen, setIsStudyFormOpen] = useState(false);
  const [selectedStudyId, setSelectedStudyId] = useState<number | null>(null);
  const [studySkillSearch, setStudySkillSearch] = useState('');
  const [studyExperienceSearch, setStudyExperienceSearch] = useState('');
  const [studyExperienceDetailSearch, setStudyExperienceDetailSearch] = useState('');
  const [relatedStudySearch, setRelatedStudySearch] = useState('');
  const [studyAiInstruction, setStudyAiInstruction] = useState('');
  const [studyAiSuggestions, setStudyAiSuggestions] = useState<StudySuggestion[]>([]);
  const [studyAiFactCount, setStudyAiFactCount] = useState(0);
  const {
    aiStages: studyAiStages, aiError: studyAiError, setAiError: setStudyAiError,
    isGenerating: isStudyAiGenerating, setIsGenerating: setIsStudyAiGenerating,
    abortRef: studyAiAbortRef, chatRef: studyAiChatRef, reset: resetStudyAiStreamBase,
    pushStage: pushStudyAiStage, appendToken: appendStudyAiToken, finishStages: finishStudyAiStages,
  } = useAiSuggestionStream();
  const resetStudyAiStream = () => {
    resetStudyAiStreamBase();
    setStudyAiFactCount(0);
  };

  // --- FILTER STATES ---
  const [studyFilter, setStudyFilter] = useState<string>('ALL');
  const [studySearch, setStudySearch] = useState<string>('');

  const [skillFilter, setSkillFilter] = useState<string>('ALL');
  const [skillSearch, setSkillSearch] = useState<string>('');

  const [expFilter, setExpFilter] = useState<string>('ALL');
  const [expSearch, setExpSearch] = useState<string>('');
  const [expSkillSearch, setExpSkillSearch] = useState<string>('');
  const [detailSkillSearch, setDetailSkillSearch] = useState('');
  const [detailStudySearch, setDetailStudySearch] = useState('');
  const [skillStudySearch, setSkillStudySearch] = useState('');
  const [skillExperienceSearch, setSkillExperienceSearch] = useState('');
  const [skillDetailSearch, setSkillDetailSearch] = useState('');
  const [expStudySearch, setExpStudySearch] = useState('');
  const [expRelatedSearch, setExpRelatedSearch] = useState('');

  // --- FILTERED DATA MEMOS ---
  const filteredStudies = useMemo(() => {
    return studies?.filter((study) => {
      const matchesCategory = studyFilter === 'ALL' || study.category.slug === studyFilter;
      const matchesSearch =
        !studySearch ||
        study.title.toLowerCase().includes(studySearch.toLowerCase()) ||
        study.summary.toLowerCase().includes(studySearch.toLowerCase()) ||
        study.contentMarkdown.toLowerCase().includes(studySearch.toLowerCase()) ||
        study.tags.some((tag) => tag.name.toLowerCase().includes(studySearch.toLowerCase())) ||
        study.skills.some((skill) => skill.name.toLowerCase().includes(studySearch.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [studies, studyFilter, studySearch]);

  const selectedStudy = useMemo(
    () => studies?.find((study) => study.id === selectedStudyId) ?? null,
    [studies, selectedStudyId],
  );

  const selectableExpSkills = useMemo(() => {
    const keyword = expSkillSearch.trim().toLowerCase();
    if (!keyword) return skillsList ?? [];
    return (skillsList ?? []).filter((skill) =>
      skill.name.toLowerCase().includes(keyword) ||
      skill.category.toLowerCase().includes(keyword));
  }, [skillsList, expSkillSearch]);

  const selectableDetailSkills = useMemo(() => {
    const keyword = detailSkillSearch.trim().toLowerCase();
    if (!keyword) return skillsList ?? [];
    return (skillsList ?? []).filter((skill) =>
      skill.name.toLowerCase().includes(keyword) ||
      skill.category.toLowerCase().includes(keyword));
  }, [skillsList, detailSkillSearch]);

  const selectableDetailStudies = useMemo(() => {
    const keyword = detailStudySearch.trim().toLowerCase();
    return (studies ?? []).filter((study) => !keyword || study.title.toLowerCase().includes(keyword));
  }, [studies, detailStudySearch]);

  const selectableStudySkills = useMemo(() => {
    const keyword = studySkillSearch.trim().toLowerCase();
    if (!keyword) return skillsList ?? [];
    return (skillsList ?? []).filter((skill) =>
      skill.name.toLowerCase().includes(keyword) ||
      skill.category.toLowerCase().includes(keyword));
  }, [skillsList, studySkillSearch]);

  const selectableStudyExperiences = useMemo(() => {
    const keyword = studyExperienceSearch.trim().toLowerCase();
    if (!keyword) return experiencesList ?? [];
    return (experiencesList ?? []).filter((experience) =>
      experience.title.toLowerCase().includes(keyword) ||
      experience.type.toLowerCase().includes(keyword));
  }, [experiencesList, studyExperienceSearch]);

  const selectableStudyExperienceDetails = useMemo(() => {
    const keyword = studyExperienceDetailSearch.trim().toLowerCase();
    return (experiencesList ?? [])
      .map((experience) => ({
        experience,
        details: experience.details.filter((detail) =>
          !keyword ||
          experience.title.toLowerCase().includes(keyword) ||
          detail.content.toLowerCase().includes(keyword)),
      }))
      .filter((group) => group.details.length > 0);
  }, [experiencesList, studyExperienceDetailSearch]);

  const selectableRelatedStudies = useMemo(() => {
    const keyword = relatedStudySearch.trim().toLowerCase();
    return (studies ?? []).filter((study) => {
      if (study.id === studyEditingId) return false;
      return !keyword ||
        study.title.toLowerCase().includes(keyword) ||
        study.slug.toLowerCase().includes(keyword);
    });
  }, [studies, studyEditingId, relatedStudySearch]);

  const filteredSkills = useMemo(() => {
    return skillsList?.filter((skill) => {
      const matchesCategory = skillFilter === 'ALL' || skill.category === skillFilter;
      const matchesSearch =
        !skillSearch ||
        skill.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
        (skill.comment ?? '').toLowerCase().includes(skillSearch.toLowerCase()) ||
        (skill.skillVersion ?? '').toLowerCase().includes(skillSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [skillsList, skillFilter, skillSearch]);

  const groupedFilteredSkills = useMemo(() => {
    const sorted = [...(filteredSkills ?? [])].sort((a, b) =>
      a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
    const knownGroups = skillCategoryPresentations
      .map((category) => ({
        category,
        skills: sorted.filter((skill) => skill.category === category.key),
      }))
      .filter((group) => group.skills.length > 0);
    const knownKeys = new Set(skillCategoryPresentations.map((category) => category.key));
    const unknownSkills = sorted.filter((skill) => !knownKeys.has(skill.category));

    if (unknownSkills.length > 0) {
      knownGroups.push({
        category: getSkillCategoryPresentation(unknownSkills[0].category),
        skills: unknownSkills,
      });
    }
    return knownGroups;
  }, [filteredSkills]);

  const filteredSkillSummary = useMemo(() => {
    const items = filteredSkills ?? [];
    return {
      total: items.length,
      core: items.filter((skill) => skill.isCore).length,
      work: items.filter((skill) => skill.usageType === 'WORK_EXPERIENCE').length,
      project: items.filter((skill) => skill.usageType === 'PROJECT_USE').length,
      learning: items.filter((skill) => skill.usageType === 'LEARNING').length,
    };
  }, [filteredSkills]);

  const filteredExperiences = useMemo(() => {
    return experiencesList?.filter((exp) => {
      const matchesType = expFilter === 'ALL' || exp.type === expFilter;
      const matchesSearch =
        !expSearch ||
        exp.title.toLowerCase().includes(expSearch.toLowerCase()) ||
        (exp.summary && exp.summary.toLowerCase().includes(expSearch.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [experiencesList, expFilter, expSearch]);

  const connectionStudies = (studies ?? []).filter((study) =>
    !skillStudySearch || study.title.toLowerCase().includes(skillStudySearch.toLowerCase()));
  const connectionExperiences = (experiencesList ?? []).filter((experience) =>
    !skillExperienceSearch ||
    experience.title.toLowerCase().includes(skillExperienceSearch.toLowerCase()) ||
    experience.type.toLowerCase().includes(skillExperienceSearch.toLowerCase()));
  const connectionDetails = (experiencesList ?? []).flatMap((experience) =>
    experience.details.map((detail) => ({ ...detail, experienceTitle: experience.title })))
    .filter((detail) =>
      !skillDetailSearch ||
      detail.content.toLowerCase().includes(skillDetailSearch.toLowerCase()) ||
      detail.experienceTitle.toLowerCase().includes(skillDetailSearch.toLowerCase()));
  const selectableExpStudies = (studies ?? []).filter((study) =>
    !expStudySearch || study.title.toLowerCase().includes(expStudySearch.toLowerCase()));

  const createStudyMutation = useMutation({
    mutationFn: (form: StudyForm) => studyApi.create(toStudyRequest(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning'] });
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      setStudyForm(emptyStudyForm);
      setIsStudyFormOpen(false);
    },
    onError: handleMutationError,
  });

  const updateStudyMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: StudyForm }) =>
      studyApi.update(id, toStudyRequest(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning'] });
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      setStudyEditingId(null);
      setStudyForm(emptyStudyForm);
      setIsStudyFormOpen(false);
    },
    onError: handleMutationError,
  });

  const deleteStudyMutation = useMutation({
    mutationFn: studyApi.remove,
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['learning'] });
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      if (selectedStudyId === deletedId) {
        setSelectedStudyId(null);
      }
    },
    onError: handleMutationError,
  });

  const handleStudySubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (studyEditingId !== null) {
      updateStudyMutation.mutate({ id: studyEditingId, payload: studyForm });
    } else {
      createStudyMutation.mutate(studyForm);
    }
  };

  const handleStudyDelete = (id: number) => {
    if (window.confirm('정말 이 공부 기록을 삭제하시겠습니까?')) {
      deleteStudyMutation.mutate(id);
    }
  };

  const requestStudyAiSuggestions = async () => {
    resetStudyAiStream();
    setStudyAiSuggestions([]);
    setIsStudyAiGenerating(true);
    const controller = new AbortController();
    studyAiAbortRef.current = controller;
    try {
      await studyApi.suggestStream(
        {
          instruction: studyAiInstruction,
          draftTitle: studyForm.title,
          draftSummary: studyForm.summary,
          skillIds: studyForm.skillIds,
          experienceIds: studyForm.experienceIds,
          experienceDetailIds: studyForm.experienceDetailIds,
          relatedStudyIds: studyForm.relatedStudies.map((item) => item.studyId),
        },
        (event) => {
          if (event.type === 'stage') {
            pushStudyAiStage(event.stage, event.message);
          } else if (event.type === 'token') {
            appendStudyAiToken(event.stage, event.text);
          } else if (event.type === 'facts') {
            setStudyAiFactCount(event.factCount);
          } else if (event.type === 'complete') {
            finishStudyAiStages();
            setStudyAiSuggestions(event.suggestions);
          } else {
            setStudyAiError(event.message);
          }
        },
        controller.signal,
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        setStudyAiError(error instanceof Error ? error.message : 'AI 초안 생성에 실패했습니다.');
      }
    } finally {
      if (studyAiAbortRef.current === controller) {
        studyAiAbortRef.current = null;
        setIsStudyAiGenerating(false);
      }
    }
  };

  const applyStudyAiSuggestion = (suggestion: StudySuggestion) => {
    if ((studyForm.title.trim() || studyForm.summary.trim() || studyForm.contentMarkdown.trim())
      && !window.confirm('현재 작성한 제목·요약·본문을 AI 초안으로 바꾸시겠습니까?')) return;
    setStudyForm({
      ...studyForm,
      title: suggestion.title,
      summary: suggestion.summary,
      contentMarkdown: suggestion.contentMarkdown,
      tagNames: suggestion.tagNames.join(', '),
    });
  };

  const openStudyEditor = (study: Study) => {
    setStudyEditingId(study.id);
    setStudyForm({
      slug: study.slug,
      title: study.title,
      summary: study.summary,
      contentMarkdown: study.contentMarkdown,
      status: study.status,
      categoryId: study.category.id,
      tagNames: study.tags.map((tag) => tag.name).join(', '),
      skillIds: study.skills.map((skill) => skill.id),
      experienceIds: study.experiences.map((experience) => experience.id),
      experienceDetailIds: study.experienceDetails.map((detail) => detail.id),
      relatedStudies: study.relatedStudies.map((related) => ({ studyId: related.id, type: related.type })),
      images: study.images,
      learnedAt: study.learnedAt,
      publishedAt: study.publishedAt ?? null,
    });
    setStudyAiSuggestions([]);
    resetStudyAiStream();
    setIsStudyFormOpen(true);
  };

  // --- TAB 2: PROFILE STATE & MUTATIONS ---
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const profileBioRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (introData?.profile) {
      const p = introData.profile;
      setProfileForm({
        name: p.name,
        nameEn: p.nameEn,
        jobTitle: p.jobTitle,
        bio: p.bio,
        coreStackSummary: p.coreStackSummary,
        statusBadgeText: p.statusBadgeText,
        githubUrl: p.githubUrl,
        email: p.email,
        phone: p.phone,
      });
    }
  }, [introData]);

  useLayoutEffect(() => {
    const textarea = profileBioRef.current;
    if (!textarea || activeTab !== 'PROFILE') return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [activeTab, profileForm.bio, viewportWidth]);

  const updateProfileMutation = useMutation({
    mutationFn: profileApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['introduction'] });
      alert('프로필 정보가 성공적으로 업데이트되었습니다!');
    },
    onError: handleMutationError,
  });

  const handleProfileSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  // --- TAB 3: SKILLS STATE & MUTATIONS ---
  const [skillEditingId, setSkillEditingId] = useState<number | null>(null);
  const [skillForm, setSkillForm] = useState(emptySkillForm);
  const [isSkillFormOpen, setIsSkillFormOpen] = useState(false);

  const createSkillMutation = useMutation({
    mutationFn: async (form: SkillForm) => {
      const { studyIds, experienceIds, experienceDetailIds, ...payload } = form;
      const skill = await skillApi.create(payload);
      await connectionApi.updateSkill(skill.id, { studyIds, experienceIds, experienceDetailIds });
      return skill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      queryClient.invalidateQueries({ queryKey: ['introduction'] });
      setSkillForm(emptySkillForm);
      setIsSkillFormOpen(false);
    },
    onError: handleMutationError,
  });

  const updateSkillMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: SkillForm }) => {
      const { studyIds, experienceIds, experienceDetailIds, ...skillPayload } = payload;
      const skill = await skillApi.update(id, skillPayload);
      await connectionApi.updateSkill(id, { studyIds, experienceIds, experienceDetailIds });
      return skill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      queryClient.invalidateQueries({ queryKey: ['introduction'] });
      setSkillEditingId(null);
      setSkillForm(emptySkillForm);
      setIsSkillFormOpen(false);
    },
    onError: handleMutationError,
  });

  const toggleCoreSkillMutation = useMutation({
    mutationFn: (skill: Skill) => {
      const { id, ...payload } = skill;
      return skillApi.update(id, { ...payload, isCore: !skill.isCore });
    },
    onMutate: async (skill) => {
      await queryClient.cancelQueries({ queryKey: ['skills'] });
      const previousSkills = queryClient.getQueryData<Skill[]>(['skills']);
      queryClient.setQueryData<Skill[]>(['skills'], (current = []) => current.map((item) =>
        item.id === skill.id ? { ...item, isCore: !item.isCore } : item));
      return { previousSkills };
    },
    onError: (error, _skill, context) => {
      if (context?.previousSkills) {
        queryClient.setQueryData(['skills'], context.previousSkills);
      }
      handleMutationError(error);
      window.alert('핵심 기술 설정을 저장하지 못했습니다. 다시 시도해 주세요.');
    },
    onSuccess: (updatedSkill) => {
      queryClient.setQueryData<Skill[]>(['skills'], (current = []) => current.map((item) =>
        item.id === updatedSkill.id ? updatedSkill : item));
      queryClient.invalidateQueries({ queryKey: ['introduction'] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });

  const deleteSkillMutation = useMutation({
    mutationFn: skillApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['introduction'] });
    },
    onError: handleMutationError,
  });

  const handleSkillSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (skillEditingId !== null) {
      updateSkillMutation.mutate({ id: skillEditingId, payload: skillForm });
    } else {
      createSkillMutation.mutate(skillForm);
    }
  };

  const handleSkillNameChange = (name: string) => {
    setSkillForm((current) => {
      const previousRecommendation = recommendSkillBadge(current.name);
      const nextRecommendation = recommendSkillBadge(name);
      const usesAutomaticBadge = !current.badgeKey || current.badgeKey === previousRecommendation?.key;
      return {
        ...current,
        name,
        badgeKey: usesAutomaticBadge ? nextRecommendation?.key ?? '' : current.badgeKey,
        badgeColor: usesAutomaticBadge ? nextRecommendation?.color ?? '' : current.badgeColor,
      };
    });
  };

  const handleSkillDelete = (id: number) => {
    if (window.confirm('정말 이 기술 스택을 삭제하시겠습니까?')) {
      deleteSkillMutation.mutate(id);
    }
  };

  const openSkillEditor = async (skill: Skill) => {
    try {
      const connections = await connectionApi.getSkill(skill.id);
      const recommendedBadge = recommendSkillBadge(skill.name);
      setSkillEditingId(skill.id);
      setSkillForm({
        name: skill.name,
        category: skill.category,
        skillLevel: skill.skillLevel ?? '',
        skillVersion: skill.skillVersion ?? '',
        comment: skill.comment ?? '',
        usageType: skill.usageType ?? 'LEARNING',
        badgeKey: skill.badgeKey ?? recommendedBadge?.key ?? '',
        badgeColor: skill.badgeColor ?? recommendedBadge?.color ?? '',
        isCore: skill.isCore,
        displayOrder: skill.displayOrder,
        ...connections,
      });
      setIsSkillFormOpen(true);
    } catch (error) {
      handleMutationError(error);
    }
  };

  // --- TAB 4: EXPERIENCE STATE & MUTATIONS ---
  const [expEditingId, setExpEditingId] = useState<number | null>(null);
  const [expForm, setExpForm] = useState(emptyExperienceForm);
  const [isExpFormOpen, setIsExpFormOpen] = useState(false);
  const [createAsCoreProject, setCreateAsCoreProject] = useState(false);
  const [detailInput, setDetailInput] = useState('');
  const [detailListSearch, setDetailListSearch] = useState('');
  const [selectedExperienceId, setSelectedExperienceId] = useState<number | null>(null);
  const [expandedDetailIdx, setExpandedDetailIdx] = useState<number | null>(null);
  const [isNarrativeGenerating, setIsNarrativeGenerating] = useState(false);
  const [narrativeError, setNarrativeError] = useState<string | null>(null);
  const [expAiInstruction, setExpAiInstruction] = useState('');
  const [expAiSuggestions, setExpAiSuggestions] = useState<ExperienceSuggestion[]>([]);
  const [expAiFactCount, setExpAiFactCount] = useState(0);
  const {
    aiStages: expAiStages, aiError: expAiError, setAiError: setExpAiError,
    isGenerating: isExpAiGenerating, setIsGenerating: setIsExpAiGenerating,
    abortRef: expAiAbortRef, chatRef: expAiChatRef, reset: resetExpAiStreamBase,
    pushStage: pushExpAiStage, appendToken: appendExpAiToken, finishStages: finishExpAiStages,
  } = useAiSuggestionStream();
  const resetExpAiStream = () => {
    resetExpAiStreamBase();
    setExpAiFactCount(0);
  };

  const selectedExperience = useMemo(
    () => experiencesList?.find((experience) => experience.id === selectedExperienceId) ?? null,
    [experiencesList, selectedExperienceId],
  );

  const selectableRelatedExperiences = (experiencesList ?? []).filter((experience) =>
    experience.id !== expEditingId && (
      !expRelatedSearch ||
      experience.title.toLowerCase().includes(expRelatedSearch.toLowerCase()) ||
      experience.type.toLowerCase().includes(expRelatedSearch.toLowerCase())
    ));

  const buildExperienceConnections = (
    saved: Experience,
    form: AdminExperienceForm,
  ): ExperienceConnections => ({
    studyIds: form.studyIds,
    detailStudies: saved.details.map((detail, index) => ({
      detailId: detail.id,
      studyIds: form.details[index]?.studyIds ?? [],
    })),
    relatedExperiences: form.relatedExperienceIds.map((experienceId) => ({
      experienceId,
      type: 'RELATED' as const,
    })),
  });

  const createExpMutation = useMutation({
    mutationFn: async ({
      payload,
      form,
      addToCoreProjects,
    }: {
      payload: ExperienceRequest;
      form: AdminExperienceForm;
      addToCoreProjects: boolean;
    }) => {
      const experience = await experienceApi.create(payload);
      await connectionApi.updateExperience(experience.id, buildExperienceConnections(experience, form));
      if (addToCoreProjects) {
        const placements = await experiencePlacementApi.listCoreProjects();
        await experiencePlacementApi.replaceCoreProjects([
          ...placements.map((placement, index) => ({
            experienceId: placement.experienceId,
            displayOrder: index,
            enabled: placement.enabled,
            detailIds: placement.detailIds,
          })),
          {
            experienceId: experience.id,
            displayOrder: placements.length,
            enabled: true,
            detailIds: experience.details.map((detail) => detail.id),
          },
        ]);
      }
      return { experience, addToCoreProjects };
    },
    onSuccess: ({ addToCoreProjects }) => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      queryClient.invalidateQueries({ queryKey: ['introduction'] });
      queryClient.invalidateQueries({ queryKey: ['experience-placements', 'CORE_PROJECT'] });
      setExpForm(emptyExperienceForm);
      setIsExpFormOpen(false);
      setCreateAsCoreProject(false);
      if (addToCoreProjects) setActiveTab('CORE_PROJECTS');
    },
    onError: handleMutationError,
  });

  const updateExpMutation = useMutation({
    mutationFn: async ({ id, payload, form }: { id: number; payload: ExperienceRequest; form: AdminExperienceForm }) => {
      const experience = await experienceApi.update(id, payload);
      await connectionApi.updateExperience(experience.id, buildExperienceConnections(experience, form));
      return experience;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      queryClient.invalidateQueries({ queryKey: ['introduction'] });
      setExpEditingId(null);
      setExpForm(emptyExperienceForm);
      setIsExpFormOpen(false);
    },
    onError: handleMutationError,
  });

  const deleteExpMutation = useMutation({
    mutationFn: experienceApi.remove,
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      queryClient.invalidateQueries({ queryKey: ['introduction'] });
      if (selectedExperienceId === deletedId) {
        setSelectedExperienceId(null);
      }
    },
    onError: handleMutationError,
  });

  const handleExpSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload: ExperienceRequest = {
      type: expForm.type,
      title: expForm.title,
      periodStart: expForm.periodStart,
      periodEnd: expForm.periodEnd ? expForm.periodEnd : null,
      summary: expForm.summary,
      takeaway: expForm.takeaway,
      displayOrder: Number(expForm.displayOrder),
      showOnTimeline: expForm.showOnTimeline,
      timelineLabel: expForm.timelineLabel?.trim() || undefined,
      details: expForm.details.map(({ studyIds: _studyIds, ...detail }) => detail),
      skillIds: expForm.skillIds,
      tagNames: expForm.tagNames.split(',').map((tag) => tag.trim()).filter(Boolean),
      images: expForm.images.map(({ id, objectKey, displayOrder }) => ({ id, objectKey, displayOrder })),
      companyName: expForm.type === 'CAREER' ? expForm.companyName : undefined,
      employmentType: expForm.type === 'CAREER' ? expForm.employmentType : undefined,
      department: expForm.type === 'CAREER' ? expForm.department : undefined,
      role: (expForm.type === 'CAREER' || expForm.type === 'PROJECT') ? expForm.role : undefined,
      slug: expForm.type === 'PROJECT' ? expForm.slug : undefined,
      contributionRate: expForm.type === 'PROJECT' && expForm.contributionRate != null
        ? Number(expForm.contributionRate)
        : undefined,
      repositoryUrl: expForm.type === 'PROJECT' ? expForm.repositoryUrl?.trim() || undefined : undefined,
      careerId: expForm.type === 'PROJECT' ? expForm.careerId : undefined,
      institutionName: expForm.type === 'EDUCATION' ? expForm.institutionName : undefined,
      issuer: expForm.type === 'CERTIFICATE' ? expForm.issuer : undefined,
    };

    if (expEditingId !== null) {
      updateExpMutation.mutate({ id: expEditingId, payload, form: expForm });
    } else {
      createExpMutation.mutate({ payload, form: expForm, addToCoreProjects: createAsCoreProject });
    }
  };

  const handleExpDelete = (id: number) => {
    if (window.confirm('정말 이 이력 항목을 삭제하시겠습니까?')) {
      deleteExpMutation.mutate(id);
    }
  };

  const requestExpAiSuggestions = async () => {
    resetExpAiStream();
    setExpAiSuggestions([]);
    setIsExpAiGenerating(true);
    const controller = new AbortController();
    expAiAbortRef.current = controller;
    try {
      await experienceApi.suggestStream(
        {
          instruction: expAiInstruction,
          type: expForm.type,
          draftTitle: expForm.title,
          companyName: expForm.type === 'CAREER' ? expForm.companyName : undefined,
          role: (expForm.type === 'CAREER' || expForm.type === 'PROJECT') ? expForm.role : undefined,
          institutionName: expForm.type === 'EDUCATION' ? expForm.institutionName : undefined,
          issuer: expForm.type === 'CERTIFICATE' ? expForm.issuer : undefined,
          repositoryUrl: expForm.type === 'PROJECT' ? expForm.repositoryUrl : undefined,
          skillIds: expForm.skillIds,
          studyIds: expForm.studyIds,
          relatedExperienceIds: expForm.relatedExperienceIds,
        },
        (event) => {
          if (event.type === 'stage') {
            pushExpAiStage(event.stage, event.message);
          } else if (event.type === 'token') {
            appendExpAiToken(event.stage, event.text);
          } else if (event.type === 'facts') {
            setExpAiFactCount(event.factCount);
          } else if (event.type === 'complete') {
            finishExpAiStages();
            setExpAiSuggestions(event.suggestions);
          } else {
            setExpAiError(event.message);
          }
        },
        controller.signal,
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        setExpAiError(error instanceof Error ? error.message : 'AI 초안 생성에 실패했습니다.');
      }
    } finally {
      if (expAiAbortRef.current === controller) {
        expAiAbortRef.current = null;
        setIsExpAiGenerating(false);
      }
    }
  };

  const applyExpAiSummary = (suggestion: ExperienceSuggestion) => {
    if ((expForm.summary?.trim() || expForm.takeaway?.trim())
      && !window.confirm('현재 작성한 요약·배운 점을 AI 초안으로 바꾸시겠습니까?')) return;
    setExpForm({
      ...expForm,
      summary: suggestion.summary,
      takeaway: suggestion.takeaway,
    });
  };

  const addExpAiDetailSuggestion = (detail: ExperienceDetailSuggestion) => {
    setExpForm({
      ...expForm,
      details: [...expForm.details, {
        content: detail.content,
        situation: detail.situation,
        actionDetail: detail.actionDetail,
        outcome: detail.outcome,
        skillIds: detail.skillIds,
        studyIds: [],
      }],
    });
  };

  const openExperienceEditor = async (experience: Experience) => {
    try {
      const connections = await connectionApi.getExperience(experience.id);
      const detailStudies = new Map(
        connections.detailStudies.map((connection) => [connection.detailId, connection.studyIds]),
      );
      setExpEditingId(experience.id);
      setCreateAsCoreProject(false);
      setExpandedDetailIdx(null);
      setDetailListSearch('');
      setExpForm({
        type: experience.type,
        title: experience.title,
        periodStart: experience.periodStart,
        periodEnd: experience.periodEnd ?? '',
        summary: experience.summary ?? '',
        takeaway: experience.takeaway ?? '',
        displayOrder: experience.displayOrder,
        showOnTimeline: experience.showOnTimeline,
        timelineLabel: experience.timelineLabel ?? '',
        details: (experience.details ?? []).map((detail) => ({
          id: detail.id,
          content: detail.content,
          situation: detail.situation ?? '',
          actionDetail: detail.actionDetail ?? '',
          outcome: detail.outcome ?? '',
          narrative: detail.narrative ?? '',
          skillIds: detail.skills?.map((skill) => skill.id) ?? [],
          studyIds: detailStudies.get(detail.id) ?? [],
        })),
        skillIds: experience.skills?.map((skill) => skill.id) ?? [],
        tagNames: experience.tags?.map((tag) => tag.name).join(', ') ?? '',
        images: experience.images ?? [],
        companyName: experience.companyName ?? '',
        employmentType: experience.employmentType ?? '정규직',
        department: experience.department ?? '',
        role: experience.role ?? '',
        slug: experience.slug ?? '',
        contributionRate: experience.contributionRate,
        repositoryUrl: experience.repositoryUrl ?? '',
        careerId: experience.careerId,
        institutionName: experience.institutionName ?? '',
        issuer: experience.issuer ?? '',
        studyIds: connections.studyIds,
        relatedExperienceIds: connections.relatedExperiences.map((related) => related.experienceId),
      });
      setExpAiSuggestions([]);
      resetExpAiStream();
      setIsExpFormOpen(true);
    } catch (error) {
      handleMutationError(error);
    }
  };

  const addDetailPoint = () => {
    if (detailInput.trim()) {
      setExpForm({
        ...expForm,
        details: [...expForm.details, { content: detailInput.trim(), situation: '', actionDetail: '', outcome: '', narrative: '', skillIds: [], studyIds: [] }],
      });
      setDetailInput('');
    }
  };

  const removeDetailPoint = (idx: number) => {
    setExpForm({
      ...expForm,
      details: expForm.details.filter((_, i) => i !== idx),
    });
  };

  const updateDetailField = (idx: number, field: 'content' | 'situation' | 'actionDetail' | 'outcome' | 'narrative', value: string) => {
    setExpForm({
      ...expForm,
      details: expForm.details.map((d, i) => (i === idx ? { ...d, [field]: value } : d)),
    });
  };

  const moveDetailPoint = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= expForm.details.length) return;
    const details = [...expForm.details];
    [details[idx], details[target]] = [details[target], details[idx]];
    setExpForm({ ...expForm, details });
    setExpandedDetailIdx((current) => (
      current === idx ? target : current === target ? idx : current
    ));
  };

  const generateDetailNarrative = async (idx: number) => {
    const detail = expForm.details[idx];
    if (!detail.situation?.trim() && !detail.actionDetail?.trim() && !detail.outcome?.trim()) {
      setNarrativeError('상황/진행 과정/성과 중 최소 하나는 입력해야 합니다.');
      return;
    }
    setNarrativeError(null);
    setIsNarrativeGenerating(true);
    try {
      const { narrative } = await experienceApi.generateNarrative({
        content: detail.content,
        situation: detail.situation,
        actionDetail: detail.actionDetail,
        outcome: detail.outcome,
      });
      updateDetailField(idx, 'narrative', narrative);
    } catch (error) {
      handleMutationError(error);
      setNarrativeError(error instanceof Error ? error.message : 'AI 재작성에 실패했습니다.');
    } finally {
      setIsNarrativeGenerating(false);
    }
  };

  const toggleDetailSkill = (idx: number, skillId: number) => {
    setExpForm({
      ...expForm,
      details: expForm.details.map((d, i) => {
        if (i !== idx) return d;
        const isChecked = d.skillIds.includes(skillId);
        return {
          ...d,
          skillIds: isChecked ? d.skillIds.filter((id) => id !== skillId) : [...d.skillIds, skillId],
        };
      }),
    });
  };

  const toggleDetailStudy = (idx: number, studyId: number) => {
    setExpForm({
      ...expForm,
      details: expForm.details.map((detail, detailIndex) => {
        if (detailIndex !== idx) return detail;
        const isChecked = detail.studyIds.includes(studyId);
        return {
          ...detail,
          studyIds: isChecked
            ? detail.studyIds.filter((id) => id !== studyId)
            : [...detail.studyIds, studyId],
        };
      }),
    });
  };

  const toggleExpSkill = (skillId: number) => {
    const isChecked = expForm.skillIds.includes(skillId);
    setExpForm({
      ...expForm,
      skillIds: isChecked
        ? expForm.skillIds.filter((id) => id !== skillId)
        : [...expForm.skillIds, skillId],
    });
  };

  // --- PREVIEW: 저장 전 작성 중인 내용을 메인페이지에 반영해 미리보기용 데이터를 구성 ---
  const buildPreviewIntroData = (): IntroductionResponse | null => {
    if (!introData) return null;

    let profile = introData.profile;
    let skills = introData.skills;
    let experiences = introData.experiences;

    if (activeTab === 'PROFILE') {
      profile = {
        id: introData.profile?.id ?? 0,
        updatedAt: introData.profile?.updatedAt ?? new Date().toISOString(),
        ...profileForm,
      };
    }

    if (activeTab === 'SKILLS' && isSkillFormOpen) {
      const {
        studyIds: _studyIds,
        experienceIds: _experienceIds,
        experienceDetailIds: _experienceDetailIds,
        ...draftSkillFields
      } = skillForm;
      const draftSkill: Skill = { id: skillEditingId ?? -1, ...draftSkillFields };
      skills = skillEditingId !== null
        ? skills.map((skill) => (skill.id === skillEditingId ? draftSkill : skill))
        : [...skills, draftSkill];
    }

    if (activeTab === 'EXPERIENCE' && isExpFormOpen) {
      const resolveSkills = (ids: number[]): Skill[] =>
        ids
          .map((id) => skillsList?.find((skill) => skill.id === id))
          .filter((skill): skill is Skill => Boolean(skill));

      const draftExperience: Experience = {
        id: expEditingId ?? -1,
        type: expForm.type,
        title: expForm.title,
        periodStart: expForm.periodStart,
        periodEnd: expForm.periodEnd ? expForm.periodEnd : undefined,
        summary: expForm.summary,
        takeaway: expForm.takeaway,
        displayOrder: Number(expForm.displayOrder),
        showOnTimeline: expForm.showOnTimeline,
        timelineLabel: expForm.timelineLabel?.trim() || undefined,
        details: expForm.details.map((detail, idx) => ({
          id: detail.id ?? -(idx + 1),
          content: detail.content,
          situation: detail.situation,
          actionDetail: detail.actionDetail,
          outcome: detail.outcome,
          displayOrder: idx,
          skills: resolveSkills(detail.skillIds),
        })),
        skills: resolveSkills(expForm.skillIds),
        tags: expForm.tagNames.split(',').map((name) => name.trim()).filter(Boolean).map((name) => ({ id: -1, name, slug: name })),
        images: expForm.images,
        companyName: expForm.type === 'CAREER' ? expForm.companyName : undefined,
        employmentType: expForm.type === 'CAREER' ? expForm.employmentType : undefined,
        department: expForm.type === 'CAREER' ? expForm.department : undefined,
        role: (expForm.type === 'CAREER' || expForm.type === 'PROJECT') ? expForm.role : undefined,
        slug: expForm.type === 'PROJECT' ? expForm.slug : undefined,
        contributionRate: expForm.type === 'PROJECT' && expForm.contributionRate != null
          ? Number(expForm.contributionRate)
          : undefined,
        repositoryUrl: expForm.type === 'PROJECT' ? expForm.repositoryUrl?.trim() || undefined : undefined,
        careerId: expForm.type === 'PROJECT' ? expForm.careerId : undefined,
        institutionName: expForm.type === 'EDUCATION' ? expForm.institutionName : undefined,
        issuer: expForm.type === 'CERTIFICATE' ? expForm.issuer : undefined,
      };

      experiences = expEditingId !== null
        ? experiences.map((experience) => (experience.id === expEditingId ? draftExperience : experience))
        : [...experiences, draftExperience];
    }

    return { ...introData, profile, skills, experiences };
  };

  // 현재 선택된 관리자 메뉴(및 하위 상태)에 대응하는 메인페이지 위치를 계산한다.
  const getPreviewTarget = (): { page: 'intro' | 'blog' | 'architecture'; section?: string } => {
    switch (activeTab) {
      case 'STUDY':
        return { page: 'blog' };
      case 'PROFILE':
        return { page: 'intro', section: 'intro-profile' };
      case 'SKILLS':
        return { page: 'intro', section: 'skills' };
      case 'COMPETENCIES':
        return { page: 'intro', section: 'competencies' };
      case 'ARCHITECTURE':
        return { page: 'architecture', section: 'architecture-components' };
      case 'CORE_PROJECTS':
        return { page: 'intro', section: 'projects' };
      case 'EXPERIENCE': {
        const type = isExpFormOpen ? expForm.type : expFilter;
        const section =
          type === 'CAREER' ? 'career'
          : type === 'PROJECT' ? 'projects'
          : type === 'EDUCATION' || type === 'CERTIFICATE' ? 'credentials'
          : 'timeline';
        return { page: 'intro', section };
      }
      case 'ANALYTICS':
      default:
        return { page: 'intro', section: 'intro-profile' };
    }
  };

  // 저장 전 작성 중인 내용과 현재 메뉴 위치를 sessionStorage에 기록한다.
  // 미리보기 iframe이 같은 탭 안에서 storage 이벤트를 받아 새로고침 없이 반영한다.
  const writePreviewState = () => {
    const data = buildPreviewIntroData();
    if (data) {
      sessionStorage.setItem('admin-preview-intro-override', JSON.stringify(data));
    } else {
      sessionStorage.removeItem('admin-preview-intro-override');
    }
    sessionStorage.setItem('admin-preview-nav', JSON.stringify(getPreviewTarget()));
  };

  // 미리보기가 열려있는 동안 편집 중인 내용과 선택된 메뉴가 바뀔 때마다 실시간으로 반영한다.
  useEffect(() => {
    if (!isPreviewOpen) return;
    const timer = setTimeout(writePreviewState, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPreviewOpen,
    activeTab,
    introData,
    profileForm,
    skillForm,
    isSkillFormOpen,
    skillEditingId,
    expForm,
    isExpFormOpen,
    expEditingId,
    expFilter,
    skillsList,
  ]);

  const refreshPreview = () => {
    writePreviewState();
    setPreviewNonce((n) => n + 1);
  };

  const openPreview = () => {
    writePreviewState();
    setIsPreviewOpen(true);
    requestAnimationFrame(() => setIsPreviewVisible(true));
  };

  // PRINT_TEMPLATES 탭으로 오면 기본적으로 미리보기 패널을 닫아두고 템플릿 목록에 집중하도록 함
  useEffect(() => {
    if (activeTab === 'PRINT_TEMPLATES' && isPreviewOpen) {
      closePreviewPanel();
    }
  }, [activeTab]);

  const closePreviewPanel = () => {
    setIsPreviewVisible(false);
    setTimeout(() => {
      setIsPreviewOpen(false);
      sessionStorage.removeItem('admin-preview-intro-override');
      sessionStorage.removeItem('admin-preview-nav');
    }, 300);
  };

  const togglePreview = () => {
    if (isPreviewOpen) {
      closePreviewPanel();
    } else {
      openPreview();
    }
  };

  const handlePreviewResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    previewResizeStartRef.current = { x: e.clientX, width: effectivePreviewWidth };
    setIsResizingPreview(true);
  };

  useEffect(() => {
    if (!isResizingPreview) return;

    const handleMouseMove = (e: MouseEvent) => {
      const start = previewResizeStartRef.current;
      if (!start) return;
      const delta = start.x - e.clientX;
      const nextWidth = Math.min(Math.max(start.width + delta, PREVIEW_MIN_WIDTH), previewMaxAllowedWidth);
      setPreviewWidth(nextWidth);
    };

    const handleMouseUp = () => {
      previewResizeStartRef.current = null;
      setIsResizingPreview(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingPreview, previewMaxAllowedWidth]);

  useEffect(() => {
    window.localStorage.setItem('admin-preview-width', String(previewWidth));
  }, [previewWidth]);

  const handleMenuSelect = (tab: TabId) => {
    setActiveTab(tab);

    if (tab === 'STUDY') {
      setIsStudyFormOpen(false);
      setSelectedStudyId(null);
    }

    if (tab === 'SKILLS') {
      setIsSkillFormOpen(false);
    }

    if (tab === 'EXPERIENCE') {
      setIsExpFormOpen(false);
      setSelectedExperienceId(null);
      setCreateAsCoreProject(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-800">
      {/* HEADER */}
      <header className="sticky top-0 z-25 flex items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-black text-slate-900">관리자 대시보드</h1>
          <span className="text-xs font-bold text-slate-400">v1.5</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePreview}
            disabled={!introData}
            title="저장 전 변경사항을 메인페이지에서 미리 확인합니다"
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              isPreviewOpen
                ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            미리보기
          </button>
          <a
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <Home className="h-3.5 w-3.5" />
            메인페이지
          </a>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            로그아웃
          </button>
        </div>
      </header>

      <div className="flex items-start">
      <div className="min-w-0 flex-1">
      <div
        className={`grid w-full grid-cols-1 transition-all duration-200 ${
          isTemplateEditing
            ? 'gap-2.5 px-2 py-1.5 sm:px-2.5 lg:px-3'
            : 'gap-6 px-4 py-6 sm:px-6 lg:px-8'
        }`}
        style={{
          gridTemplateColumns: isSidebarCollapsed
            ? '64px minmax(0, 1fr)'
            : `${sidebarWidth}px minmax(0, 1fr)`,
        }}
      >
        {/* SIDE BAR NAVIGATION */}
        <aside className={`relative min-w-0 transition-all duration-200 lg:sticky lg:top-20 lg:self-start ${
          isSidebarCollapsed
            ? 'rounded-2xl border border-slate-200 bg-white px-2 py-3 shadow-sm'
            : ''
        }`}>
          {/* Resize Handle for Sidebar */}
          {!isSidebarCollapsed && (
            <div
              onMouseDown={handleSidebarMouseDown}
              className="absolute -right-2 top-0 bottom-0 w-3 cursor-col-resize z-30 group flex items-center justify-center select-none"
              title="사이드바 너비 조절 (드래그)"
            >
              <div className="w-1 h-12 rounded-full bg-slate-200 group-hover:bg-blue-500 transition-colors shadow-sm" />
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
            title={isSidebarCollapsed ? '메뉴 펼치기' : '메뉴 접기'}
            aria-label={isSidebarCollapsed ? '메뉴 펼치기' : '메뉴 접기'}
            aria-expanded={!isSidebarCollapsed}
            className={`z-20 flex items-center justify-center text-slate-400 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
              isSidebarCollapsed
                ? 'relative mx-auto mb-3 h-8 w-8 shrink-0'
                : 'absolute -right-4 top-1 !m-0 h-10 w-8'
            }`}
          >
            {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <div className={`mb-3 flex h-8 items-center px-2 ${isSidebarCollapsed ? 'hidden' : ''}`}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">메뉴 목록</p>
          </div>

          <nav aria-label="관리자 메뉴" className="space-y-5">
            {ADMIN_MENU_GROUPS.map((group, groupIndex) => (
              <section
                key={group.label}
                aria-labelledby={`admin-menu-group-${groupIndex}`}
                className={`${groupIndex > 0 && isSidebarCollapsed ? 'border-t border-slate-200 pt-3' : ''}`}
              >
                <h2
                  id={`admin-menu-group-${groupIndex}`}
                  className={`mb-1.5 px-3 text-[11px] font-black tracking-[0.12em] text-slate-400 ${isSidebarCollapsed ? 'sr-only' : ''}`}
                >
                  {group.label}
                </h2>
                <div className="space-y-1.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleMenuSelect(item.id)}
                        title={item.label}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${isSidebarCollapsed ? 'mx-auto h-11 w-11 justify-center gap-0 p-0' : ''} ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-sm shadow-slate-800/10'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className={isSidebarCollapsed ? 'hidden' : 'truncate'}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>
        </aside>

        {/* MAIN PANEL CONTENT */}
        <section className="min-w-0 space-y-6">
          {activeTab === 'COMPETENCIES' && <CompetencyManagement />}
          {activeTab === 'ARCHITECTURE' && <ArchitectureManagement />}
          {activeTab === 'PRINT_TEMPLATES' && <PrintTemplateManagement onEditingChange={handleTemplateEditingChange} />}
          {activeTab === 'CORE_PROJECTS' && (
            <CoreProjectManagement
              onCreateProject={() => {
                const nextDisplayOrder = Math.max(-1, ...(experiencesList ?? []).map((experience) => experience.displayOrder)) + 1;
                setActiveTab('EXPERIENCE');
                setExpFilter('PROJECT');
                setSelectedExperienceId(null);
                setExpEditingId(null);
                setExpForm({ ...emptyExperienceForm, type: 'PROJECT', displayOrder: nextDisplayOrder });
                setExpandedDetailIdx(null);
                setDetailListSearch('');
                setExpAiInstruction('');
                setExpAiSuggestions([]);
                resetExpAiStream();
                setCreateAsCoreProject(true);
                setIsExpFormOpen(true);
              }}
            />
          )}
          {activeTab === 'ANALYTICS' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-xl font-black text-slate-950">방문자 통계</h2>
                <p className="mt-0.5 text-sm text-slate-500">브라우저 쿠키 기준 순 방문자와 페이지 조회 수입니다.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: '오늘 방문자', value: visitorSummary?.todayVisitors, icon: CalendarDays },
                  { label: '누적 방문자', value: visitorSummary?.totalVisitors, icon: Users },
                  { label: '누적 조회 수', value: visitorSummary?.totalPageViews, icon: MousePointerClick },
                  { label: '오늘 봇 의심', value: visitorSummary?.todayBotVisitors, icon: Bot },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-500">{label}</p>
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600">
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                      {isVisitorSummaryLoading || value === undefined ? '—' : value.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div>
                    <h3 className="font-black text-slate-900">오늘 시간대별</h3>
                    <p className="mt-0.5 text-xs font-medium text-slate-400">
                      {visitorDateRange.to} · 0시 ~ 23시
                    </p>
                  </div>
                  <Clock className="h-5 w-5 text-slate-400" />
                </div>
                <div className="px-5 pb-5 pt-4">
                  {isVisitorHourlyLoading ? (
                    <p className="py-10 text-center text-sm font-semibold text-slate-400">통계를 불러오는 중입니다.</p>
                  ) : (
                    <VisitorHourlyChart data={visitorHourly} />
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div>
                    <h3 className="font-black text-slate-900">최근 14일</h3>
                    <p className="mt-0.5 text-xs font-medium text-slate-400">
                      {visitorDateRange.from} ~ {visitorDateRange.to}
                    </p>
                  </div>
                  <BarChart3 className="h-5 w-5 text-slate-400" />
                </div>
                <div className="border-b border-slate-200 px-5 pb-5 pt-4">
                  {isVisitorDailyLoading ? (
                    <p className="py-10 text-center text-sm font-semibold text-slate-400">통계를 불러오는 중입니다.</p>
                  ) : (
                    <VisitorTrendChart data={visitorDaily} />
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-5 py-3 font-bold">날짜</th>
                        <th className="px-5 py-3 text-right font-bold">순 방문자</th>
                        <th className="px-5 py-3 text-right font-bold">조회 수</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visitorDaily.map((day) => (
                        <tr key={day.date} className="text-slate-600">
                          <td className="px-5 py-3 font-semibold text-slate-700">{day.date}</td>
                          <td className="px-5 py-3 text-right font-bold">{day.visitors.toLocaleString()}</td>
                          <td className="px-5 py-3 text-right font-bold">{day.pageViews.toLocaleString()}</td>
                        </tr>
                      ))}
                      {!isVisitorDailyLoading && visitorDaily.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-5 py-10 text-center font-semibold text-slate-400">
                            아직 집계된 방문 기록이 없습니다.
                          </td>
                        </tr>
                      )}
                      {isVisitorDailyLoading && (
                        <tr>
                          <td colSpan={3} className="px-5 py-10 text-center font-semibold text-slate-400">
                            통계를 불러오는 중입니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================= DONATIONS TAB ======================= */}
          {activeTab === 'DONATIONS' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-xl font-black text-slate-950">후원 내역</h2>
                  <p className="mt-0.5 text-sm text-slate-500">페이앱 결제 기준 후원 내역입니다. 결제완료 건은 환불(전액취소)할 수 있습니다.</p>
                </div>
                <label className="flex cursor-pointer items-center gap-3">
                  <span className="text-sm font-bold text-slate-600">후원 버튼 노출</span>
                  <button
                    role="switch"
                    aria-checked={donationConfig?.enabled === true}
                    disabled={donationConfig === undefined || toggleDonationMutation.isPending}
                    onClick={() => toggleDonationMutation.mutate(!(donationConfig?.enabled === true))}
                    className={`relative h-7 w-12 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      donationConfig?.enabled ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        donationConfig?.enabled ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: '누적 후원금 (결제완료)', value: donationSummary?.paidTotal, suffix: '원', icon: Heart },
                  { label: '결제완료 건수', value: donationSummary?.paidCount, suffix: '건', icon: Check },
                ].map(({ label, value, suffix, icon: Icon }) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-500">{label}</p>
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600">
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                      {isDonationLoading || value === undefined ? '—' : `${value.toLocaleString()}${suffix}`}
                    </p>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-5 py-3 font-bold">일시</th>
                        <th className="px-5 py-3 text-right font-bold">금액</th>
                        <th className="px-5 py-3 font-bold">메시지</th>
                        <th className="px-5 py-3 font-bold">상태</th>
                        <th className="px-5 py-3 text-right font-bold">환불</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(donationSummary?.donations ?? []).map((donation) => (
                        <Fragment key={donation.id}>
                          <tr
                            className="cursor-pointer text-slate-600 transition hover:bg-slate-50"
                            onClick={() => setExpandedDonationId(
                              expandedDonationId === donation.id ? null : donation.id)}
                          >
                            <td className="px-5 py-3 font-semibold text-slate-700 whitespace-nowrap">
                              <span className="mr-2 inline-block text-slate-400">
                                {expandedDonationId === donation.id ? '▾' : '▸'}
                              </span>
                              {donation.createdAt.replace('T', ' ').slice(0, 16)}
                            </td>
                            <td className="px-5 py-3 text-right font-bold">{donation.amount.toLocaleString()}원</td>
                            <td className="max-w-[240px] truncate px-5 py-3" title={donation.message ?? ''}>
                              {donation.message ?? <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                                donation.status === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : donation.status === 'CANCELED'
                                    ? 'bg-amber-50 text-amber-600'
                                    : donation.status === 'FAILED'
                                      ? 'bg-rose-50 text-rose-600'
                                      : 'bg-slate-100 text-slate-500'
                              }`}>
                                {donation.status === 'PAID' ? '결제완료'
                                  : donation.status === 'CANCELED' ? '취소됨'
                                    : donation.status === 'FAILED' ? '실패' : '대기'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              {donation.status === 'PAID' && (
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleCancelDonation(donation.id, donation.amount);
                                  }}
                                  disabled={cancelDonationMutation.isPending}
                                  className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-extrabold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  환불
                                </button>
                              )}
                            </td>
                          </tr>
                          {expandedDonationId === donation.id && (
                            <tr>
                              <td colSpan={5} className="bg-slate-50 px-5 py-4">
                                {isDonationEventsLoading ? (
                                  <p className="text-sm font-semibold text-slate-400">이력을 불러오는 중입니다.</p>
                                ) : donationEvents.length === 0 ? (
                                  <p className="text-sm font-semibold text-slate-400">기록된 이력이 없습니다.</p>
                                ) : (
                                  <ol className="space-y-2">
                                    {donationEvents.map((event) => (
                                      <li key={event.id} className="flex items-baseline gap-3 text-sm">
                                        <span className="whitespace-nowrap font-mono text-xs text-slate-400">
                                          {event.createdAt.replace('T', ' ').slice(0, 19)}
                                        </span>
                                        <span className={`font-extrabold ${
                                          event.eventType === 'PAID' ? 'text-emerald-600'
                                            : event.eventType === 'CANCELED' ? 'text-amber-600'
                                              : event.eventType === 'PAY_FAILED' || event.eventType === 'CALLBACK_REJECTED'
                                                ? 'text-rose-600' : 'text-slate-700'
                                        }`}>
                                          {DONATION_EVENT_LABELS[event.eventType]}
                                        </span>
                                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs font-bold text-slate-600">
                                          {DONATION_ACTOR_LABELS[event.actor]}
                                        </span>
                                        {event.payState && (
                                          <span className="text-xs text-slate-400">pay_state={event.payState}</span>
                                        )}
                                        {event.detail && (
                                          <span className="truncate text-xs text-slate-500" title={event.detail}>
                                            {event.detail}
                                          </span>
                                        )}
                                      </li>
                                    ))}
                                  </ol>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                      {!isDonationLoading && (donationSummary?.donations ?? []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-5 py-10 text-center font-semibold text-slate-400">
                            아직 후원 내역이 없습니다.
                          </td>
                        </tr>
                      )}
                      {isDonationLoading && (
                        <tr>
                          <td colSpan={5} className="px-5 py-10 text-center font-semibold text-slate-400">
                            후원 내역을 불러오는 중입니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================= STUDY TAB ======================= */}
          {activeTab === 'STUDY' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Study 관리</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Markdown 학습 문서와 관련 기술·프로젝트·경력을 관리합니다.</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedStudyId(null);
                    setStudyEditingId(null);
                    setStudyForm(emptyStudyForm);
                    setStudyAiInstruction('');
                    setStudyAiSuggestions([]);
                    resetStudyAiStream();
                    setIsStudyFormOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  새 글 작성
                </button>
              </div>

              {/* FILTERS & SEARCH */}
              {!isStudyFormOpen && !selectedStudy && (
              <div className="sticky top-14 z-20 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/95 p-4 rounded-2xl border border-slate-200 shadow-sm backdrop-blur-xl animate-fadeIn">
                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                  {[{ slug: 'ALL', name: '전체' }, ...(studyCategories ?? [])].map((category) => (
                    <button
                      key={category.slug}
                      onClick={() => setStudyFilter(category.slug)}
                      className={`px-3 py-1.5 text-sm font-bold rounded-lg transition ${
                        studyFilter === category.slug
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-100'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="제목, 본문, 기술 검색..."
                    value={studySearch}
                    onChange={(e) => setStudySearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm transition focus:border-slate-800 focus:outline-none bg-slate-50/50"
                  />
                </div>
              </div>
              )}

              {isStudyFormOpen && (
                <form onSubmit={handleStudySubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-black text-slate-800">{studyEditingId !== null ? '글 수정' : '새 글 작성'}</h3>

                  <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-600 text-white">
                        <WandSparkles className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-violet-950">AI로 학습 정리 초안 만들기</h4>
                        <p className="mt-1 text-xs leading-relaxed text-violet-700">
                          AI가 1단계에서 선택한 기술·경력·관련 Study와 메모의 사실관계를 정리하고, 2단계에서 검증된 사실만 사용해 제목·요약·태그·본문 초안을 작성합니다.
                        </p>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <textarea
                            rows={3}
                            maxLength={1000}
                            value={studyAiInstruction}
                            onChange={(event) => setStudyAiInstruction(event.target.value)}
                            placeholder="이 글에 담고 싶은 핵심 내용, 키워드, 있었던 일을 적어주세요."
                            className="min-h-[88px] flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          />
                          <button
                            type="button"
                            onClick={requestStudyAiSuggestions}
                            disabled={isStudyAiGenerating}
                            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60 sm:self-stretch"
                          >
                            <WandSparkles className={`h-4 w-4 ${isStudyAiGenerating ? 'animate-pulse' : ''}`} />
                            {isStudyAiGenerating ? '사실관계 정리·작성 중...' : studyAiSuggestions.length > 0 ? '다시 생성' : 'AI 초안 생성'}
                          </button>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-violet-500">선택한 기술·경력·Study 요약과 메모가 NVIDIA NIM API로 전송됩니다. AI 초안은 자동 저장되지 않으니 반드시 검토 후 저장하세요.</p>

                        {(studyAiStages.length > 0 || studyAiError) && (
                          <div ref={studyAiChatRef} className="mt-4 max-h-80 space-y-2.5 overflow-y-auto rounded-xl border border-violet-100 bg-white p-3">
                            {studyAiStages.map((stageItem) => (
                              <AiStageBubble
                                key={stageItem.stage}
                                stage={stageItem}
                                fieldLabels={STUDY_AI_FIELD_LABELS}
                                extra={stageItem.stage === 1 && studyAiFactCount > 0 ? (
                                  <p className="mt-2 text-[11px] font-bold text-violet-600">검증된 사실 {studyAiFactCount}개</p>
                                ) : undefined}
                              />
                            ))}
                            {studyAiError && (
                              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{studyAiError}</p>
                            )}
                          </div>
                        )}

                        {studyAiSuggestions.length > 0 && (
                          <div className="mt-4 space-y-3">
                            {studyAiSuggestions.map((suggestion, index) => (
                              <article key={`${suggestion.title}-${index}`} className="rounded-xl border border-violet-200 bg-white p-4 shadow-sm">
                                <h5 className="text-sm font-black leading-snug text-slate-900">{suggestion.title}</h5>
                                <p className="mt-2 text-xs leading-relaxed text-slate-600">{suggestion.summary}</p>
                                {suggestion.tagNames.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {suggestion.tagNames.map((tag) => (
                                      <span key={tag} className="rounded bg-blue-50 px-1.5 py-1 text-[10px] font-bold text-blue-700">{tag}</span>
                                    ))}
                                  </div>
                                )}
                                <div className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                                  {suggestion.contentMarkdown}
                                </div>
                                {suggestion.reason && <p className="mt-3 rounded-lg bg-violet-50 px-2.5 py-2 text-[11px] leading-relaxed text-violet-700">{suggestion.reason}</p>}
                                <div className="mt-3">
                                  <button type="button" onClick={() => applyStudyAiSuggestion(suggestion)} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-50">
                                    <Check className="h-3.5 w-3.5" /> 이 초안 적용
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">제목</label>
                      <input
                        type="text"
                        required
                        value={studyForm.title}
                        onChange={(e) => setStudyForm({ ...studyForm, title: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Slug</label>
                      <input
                        type="text"
                        value={studyForm.slug}
                        onChange={(e) => setStudyForm({ ...studyForm, slug: e.target.value })}
                        placeholder="비워두면 제목으로 자동 생성"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">카테고리</label>
                      <select
                        value={studyForm.categoryId}
                        onChange={(e) => setStudyForm({ ...studyForm, categoryId: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      >
                        {(studyCategories ?? []).map((category) => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">공개 상태</label>
                      <select
                        value={studyForm.status}
                        onChange={(e) => setStudyForm({ ...studyForm, status: e.target.value as StudyForm['status'] })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="DRAFT">임시 저장</option>
                        <option value="PUBLISHED">공개</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">목록 요약</label>
                    <textarea
                      required
                      rows={2}
                      maxLength={500}
                      value={studyForm.summary}
                      onChange={(e) => setStudyForm({ ...studyForm, summary: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">태그 (쉼표 구분)</label>
                    <input
                      type="text"
                      value={studyForm.tagNames}
                      onChange={(e) => setStudyForm({ ...studyForm, tagNames: e.target.value })}
                      placeholder="트랜잭션, 동시성, 장애대응"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">기술 스택</label>
                      <div className="relative mb-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="search"
                          value={studySkillSearch}
                          onChange={(event) => setStudySkillSearch(event.target.value)}
                          placeholder="기술명 또는 분류 검색"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                      <div className="max-h-44 space-y-1 overflow-auto rounded-xl border border-slate-200 p-3">
                        {selectableStudySkills.map((skill) => (
                          <label key={skill.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={studyForm.skillIds.includes(skill.id)}
                              onChange={(event) => setStudyForm({
                                ...studyForm,
                                skillIds: event.target.checked
                                  ? [...studyForm.skillIds, skill.id]
                                  : studyForm.skillIds.filter((id) => id !== skill.id),
                              })}
                            />
                            {skill.name}
                          </label>
                        ))}
                        {selectableStudySkills.length === 0 && (
                          <p className="py-4 text-center text-xs font-semibold text-slate-400">검색 결과가 없습니다.</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">관련 프로젝트·경력</label>
                      <div className="relative mb-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="search"
                          value={studyExperienceSearch}
                          onChange={(event) => setStudyExperienceSearch(event.target.value)}
                          placeholder="제목 또는 유형 검색"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                      <div className="max-h-44 space-y-1 overflow-auto rounded-xl border border-slate-200 p-3">
                        {selectableStudyExperiences.map((experience) => (
                          <label key={experience.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={studyForm.experienceIds.includes(experience.id)}
                              onChange={(event) => setStudyForm({
                                ...studyForm,
                                experienceIds: event.target.checked
                                  ? [...studyForm.experienceIds, experience.id]
                                  : studyForm.experienceIds.filter((id) => id !== experience.id),
                              })}
                            />
                            <span className="font-mono text-slate-400">{experience.type}</span>
                            {experience.title}
                          </label>
                        ))}
                        {selectableStudyExperiences.length === 0 && (
                          <p className="py-4 text-center text-xs font-semibold text-slate-400">검색 결과가 없습니다.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">관련 경력 상세 항목</label>
                    <div className="relative mb-2">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={studyExperienceDetailSearch}
                        onChange={(event) => setStudyExperienceDetailSearch(event.target.value)}
                        placeholder="경력 제목 또는 항목 내용 검색"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="max-h-52 space-y-3 overflow-auto rounded-xl border border-slate-200 p-3">
                      {selectableStudyExperienceDetails.map(({ experience, details }) => (
                        <div key={experience.id}>
                          <p className="mb-1 px-2 text-xs font-bold text-slate-400">{experience.title}</p>
                          {details.map((detail) => (
                            <label key={detail.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={studyForm.experienceDetailIds.includes(detail.id)}
                                onChange={(event) => setStudyForm({
                                  ...studyForm,
                                  experienceDetailIds: event.target.checked
                                    ? [...studyForm.experienceDetailIds, detail.id]
                                    : studyForm.experienceDetailIds.filter((id) => id !== detail.id),
                                })}
                              />
                              {detail.content}
                            </label>
                          ))}
                        </div>
                      ))}
                      {selectableStudyExperienceDetails.length === 0 && (
                        <p className="py-4 text-center text-xs font-semibold text-slate-400">검색 결과가 없습니다.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">관련 Study</label>
                    <div className="relative mb-2">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={relatedStudySearch}
                        onChange={(event) => setRelatedStudySearch(event.target.value)}
                        placeholder="Study 제목 또는 slug 검색"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="max-h-52 space-y-2 overflow-auto rounded-xl border border-slate-200 p-3">
                      {selectableRelatedStudies.map((study) => {
                        const relation = studyForm.relatedStudies.find((item) => item.studyId === study.id);
                        return (
                          <div key={study.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={Boolean(relation)}
                              onChange={(event) => setStudyForm({
                                ...studyForm,
                                relatedStudies: event.target.checked
                                  ? [...studyForm.relatedStudies, { studyId: study.id, type: 'RELATED' }]
                                  : studyForm.relatedStudies.filter((item) => item.studyId !== study.id),
                              })}
                            />
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{study.title}</span>
                            {relation && (
                              <select
                                value={relation.type}
                                onChange={(event) => setStudyForm({
                                  ...studyForm,
                                  relatedStudies: studyForm.relatedStudies.map((item) => item.studyId === study.id
                                    ? { ...item, type: event.target.value as typeof item.type }
                                    : item),
                                })}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                              >
                                <option value="RELATED">일반 관련</option>
                                <option value="PREREQUISITE">선행 학습</option>
                                <option value="FOLLOW_UP">후속 학습</option>
                                <option value="APPLIED_TO">적용 사례</option>
                              </select>
                            )}
                          </div>
                        );
                      })}
                      {selectableRelatedStudies.length === 0 && (
                        <p className="py-4 text-center text-xs font-semibold text-slate-400">검색 결과가 없습니다.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">이미지</label>
                    <ImageGalleryEditor
                      scope="STUDY_GALLERY"
                      images={studyForm.images}
                      onChange={(images) => setStudyForm({ ...studyForm, images })}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Markdown 본문</label>
                    <MarkdownEditor
                      value={studyForm.contentMarkdown}
                      onChange={(contentMarkdown) => setStudyForm({ ...studyForm, contentMarkdown })}
                      enableImageUpload
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">학습일</label>
                    <input
                      type="date"
                      required
                      value={studyForm.learnedAt}
                      onChange={(e) => setStudyForm({ ...studyForm, learnedAt: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsStudyFormOpen(false);
                        setStudyAiSuggestions([]);
                        resetStudyAiStream();
                      }}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={createStudyMutation.isPending || updateStudyMutation.isPending}
                      className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
                    >
                      {studyEditingId !== null ? '수정 완료' : '작성 완료'}
                    </button>
                  </div>
                </form>
              )}

              {!isStudyFormOpen && selectedStudy && (
                <StudyDetailPanel
                  study={selectedStudy}
                  onBack={() => setSelectedStudyId(null)}
                  onEdit={openStudyEditor}
                  onDelete={handleStudyDelete}
                />
              )}

              {!isStudyFormOpen && !selectedStudy && (
                <div className="space-y-2.5">
                  {isStudyListLoading && (
                    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                      <RefreshCw className="h-6 w-6 animate-spin text-slate-300" />
                      <p className="mt-3 text-sm font-bold text-slate-500">Study 목록을 불러오는 중입니다.</p>
                    </div>
                  )}

                  {isStudyListError && (
                    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 px-6 py-12 text-center shadow-sm">
                      <p className="text-base font-black text-red-700">Study 목록을 불러오지 못했습니다.</p>
                      <p className="mt-1 text-sm font-medium text-red-500">잠시 후 다시 시도해 주세요.</p>
                      <button
                        type="button"
                        onClick={() => { void refetchStudies(); }}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        다시 시도
                      </button>
                    </div>
                  )}

                  {!isStudyListLoading && !isStudyListError && filteredStudies?.length === 0 && (
                    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
                      <BookOpen className="h-7 w-7 text-slate-300" />
                      <p className="mt-3 text-base font-black text-slate-700">
                        {studies?.length === 0 ? '아직 등록된 Study가 없습니다.' : '조건에 맞는 Study가 없습니다.'}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-400">
                        {studies?.length === 0
                          ? '새 글 작성을 눌러 첫 번째 학습 기록을 추가해 보세요.'
                          : '카테고리나 검색어를 변경해 보세요.'}
                      </p>
                    </div>
                  )}

                  {!isStudyListLoading && !isStudyListError && filteredStudies?.map((study) => (
                    <div
                      key={study.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => setSelectedStudyId(study.id)}
                        >
                          <p className="font-mono text-xs font-bold text-slate-400">
                            {study.learnedAt} · {study.category.name} · {study.status === 'PUBLISHED' ? '공개' : '초안'}
                          </p>
                          <p className="mt-0.5 text-base font-black text-slate-800 transition hover:text-slate-950">{study.title}</p>
                          <p className="mt-1 line-clamp-1 text-sm text-slate-500">{study.summary}</p>
                        </button>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openStudyEditor(study)}
                            title="수정"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStudyDelete(study.id)}
                            title="삭제"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================= PROFILE TAB ======================= */}
          {activeTab === 'PROFILE' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-xl font-black text-slate-950">프로필 정보 관리</h2>
                <p className="text-sm text-slate-500 mt-0.5">이력서 헤더 및 바이오 요약 영역 정보를 실시간 편집합니다.</p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">이름 (한글)</label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">이름 (영문)</label>
                    <input
                      type="text"
                      required
                      value={profileForm.nameEn}
                      onChange={(e) => setProfileForm({ ...profileForm, nameEn: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">희망 직무 타이틀</label>
                    <input
                      type="text"
                      required
                      value={profileForm.jobTitle}
                      onChange={(e) => setProfileForm({ ...profileForm, jobTitle: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">활동 배지 상태 텍스트</label>
                    <input
                      type="text"
                      required
                      value={profileForm.statusBadgeText}
                      onChange={(e) => setProfileForm({ ...profileForm, statusBadgeText: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Bio (대표 소개 문장)</label>
                  <textarea
                    ref={profileBioRef}
                    required
                    rows={3}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    className="min-h-28 w-full resize-none overflow-hidden rounded-xl border border-slate-200 px-4 py-2.5 text-sm leading-relaxed transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">총 경력 기간 (자동 계산)</label>
                    <input
                      type="text"
                      readOnly
                      value={introData?.careerSummary ?? '경력 정보를 불러오는 중...'}
                      title="이력 및 경력 관리의 직장 경력 기간을 기준으로 자동 계산됩니다."
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">핵심 기술 요약 문구 (예: Java / Node.js...)</label>
                    <input
                      type="text"
                      required
                      value={profileForm.coreStackSummary}
                      onChange={(e) => setProfileForm({ ...profileForm, coreStackSummary: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">GitHub 주소</label>
                    <input
                      type="url"
                      required
                      value={profileForm.githubUrl}
                      onChange={(e) => setProfileForm({ ...profileForm, githubUrl: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">이메일</label>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">연락처</label>
                    <input
                      type="text"
                      required
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
                  >
                    프로필 저장
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ======================= SKILLS TAB ======================= */}
          {activeTab === 'SKILLS' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-xl font-black text-slate-950">기술 스택 관리</h2>
                  <p className="text-sm text-slate-500 mt-0.5">포트폴리오 핵심/일반 마스터 기술 목록을 관리합니다.</p>
                </div>
                <button
                  onClick={() => {
                    setSkillEditingId(null);
                    setSkillForm(emptySkillForm);
                    setIsSkillFormOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  새 기술 추가
                </button>
              </div>

              {/* FILTERS & SEARCH */}
              <div className="sticky top-14 z-20 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/95 p-4 rounded-2xl border border-slate-200 shadow-sm backdrop-blur-xl animate-fadeIn">
                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                  {['ALL', 'LANGUAGE', 'FRAMEWORK', 'DATABASE', 'DEVOPS', 'AI_RAG', 'ETC'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSkillFilter(cat)}
                      className={`px-3 py-1.5 text-sm font-bold rounded-lg transition ${
                        skillFilter === cat
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-100'
                      }`}
                    >
                      {cat === 'ALL'
                        ? '전체'
                        : cat === 'LANGUAGE'
                        ? '언어'
                        : cat === 'FRAMEWORK'
                        ? '프레임워크'
                        : cat === 'DATABASE'
                        ? 'DB'
                        : cat === 'DEVOPS'
                        ? '인프라/DevOps'
                        : cat === 'AI_RAG'
                        ? 'AI/RAG'
                        : '기타'}
                    </button>
                  ))}
                </div>
                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="기술명 검색..."
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm transition focus:border-slate-800 focus:outline-none bg-slate-50/50"
                  />
                </div>
              </div>

              {isSkillFormOpen && (
                <form onSubmit={handleSkillSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-black text-slate-800">{skillEditingId !== null ? '기술 수정' : '새 기술 추가'}</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">기술 스택명</label>
                      <input
                        type="text"
                        required
                        placeholder="예: Java, React"
                        value={skillForm.name}
                        onChange={(e) => handleSkillNameChange(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">분류 카테고리</label>
                      <select
                        value={skillForm.category}
                        onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="LANGUAGE">개발 언어 (LANGUAGE)</option>
                        <option value="FRAMEWORK">프레임워크 / 라이브러리 (FRAMEWORK)</option>
                        <option value="DATABASE">데이터베이스 (DATABASE)</option>
                        <option value="DEVOPS">배포 및 인프라 (DEVOPS)</option>
                        <option value="AI_RAG">인공지능 / RAG (AI_RAG)</option>
                        <option value="ETC">기타 (ETC)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">기술 레벨</label>
                      <input
                        type="text"
                        value={skillForm.skillLevel}
                        placeholder="예: 중급, 고급, 상"
                        onChange={(e) => setSkillForm({ ...skillForm, skillLevel: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">버전</label>
                      <input
                        type="text"
                        value={skillForm.skillVersion}
                        placeholder="예: 21, 3.3, 19"
                        onChange={(e) => setSkillForm({ ...skillForm, skillVersion: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">활용 구분</label>
                      <select
                        value={skillForm.usageType}
                        onChange={(e) => setSkillForm({ ...skillForm, usageType: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      >
                        {skillUsageOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">정렬 순서</label>
                      <input
                        type="number"
                        required
                        value={skillForm.displayOrder}
                        onChange={(e) => setSkillForm({ ...skillForm, displayOrder: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={skillForm.isCore}
                          onChange={(e) => setSkillForm({ ...skillForm, isCore: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                        />
                        <span className="text-xs font-bold text-slate-600 uppercase">핵심기술로 표시</span>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                      <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row">
                        <div className="min-w-0 flex-1">
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">기술 뱃지</label>
                          <select
                            value={skillForm.badgeKey ?? ''}
                            onChange={(event) => {
                              if (event.target.value === 'none') {
                                setSkillForm((current) => ({ ...current, badgeKey: 'none', badgeColor: '' }));
                                return;
                              }
                              const option = findSkillBadge(event.target.value);
                              setSkillForm((current) => ({
                                ...current,
                                badgeKey: option?.key ?? '',
                                badgeColor: option?.color ?? '',
                              }));
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                          >
                            <option value="">자동 추천 또는 글자 뱃지</option>
                            <option value="none">뱃지 표시 안 함</option>
                            {skillBadgeOptions.map((option) => (
                              <option key={option.key} value={option.key}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:w-44">
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">브랜드 색상</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={/^[0-9A-Fa-f]{6}$/.test(skillForm.badgeColor ?? '')
                                ? `#${skillForm.badgeColor}`
                                : '#64748B'}
                              onChange={(event) => setSkillForm((current) => ({
                                ...current,
                                badgeColor: event.target.value.slice(1).toUpperCase(),
                              }))}
                              className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                              aria-label="뱃지 색상 선택"
                            />
                            <input
                              type="text"
                              maxLength={6}
                              value={skillForm.badgeColor ?? ''}
                              placeholder="64748B"
                              onChange={(event) => setSkillForm((current) => ({
                                ...current,
                                badgeColor: event.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase(),
                              }))}
                              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-slate-800"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex min-w-36 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <SkillBadgeIcon
                          name={skillForm.name || '기술'}
                          badgeKey={skillForm.badgeKey}
                          badgeColor={skillForm.badgeColor}
                          className="h-7 w-7"
                        />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">미리보기</p>
                          <p className="truncate text-sm font-black text-slate-800">{skillForm.name || '기술명'}</p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-400">기술명과 일치하는 뱃지는 자동 추천되며, 없으면 첫 글자 뱃지로 표시됩니다.</p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">코멘트</label>
                    <textarea
                      rows={3}
                      value={skillForm.comment}
                      placeholder="이 기술을 어느 수준으로, 어디에 활용했는지 짧게 남깁니다."
                      onChange={(e) => setSkillForm({ ...skillForm, comment: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                        관련 Study · {skillForm.studyIds.length}개
                      </label>
                      <input
                        type="search"
                        value={skillStudySearch}
                        onChange={(event) => setSkillStudySearch(event.target.value)}
                        placeholder="Study 제목 검색"
                        className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-800"
                      />
                      <div className="max-h-48 space-y-1.5 overflow-auto">
                        {connectionStudies.map((study) => (
                          <label key={study.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs">
                            <input
                              type="checkbox"
                              checked={skillForm.studyIds.includes(study.id)}
                              onChange={() => setSkillForm((current) => ({
                                ...current,
                                studyIds: current.studyIds.includes(study.id)
                                  ? current.studyIds.filter((id) => id !== study.id)
                                  : [...current.studyIds, study.id],
                              }))}
                              className="mt-0.5"
                            />
                            <span className="font-semibold text-slate-700">{study.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                        관련 프로젝트·이력 · {skillForm.experienceIds.length}개
                      </label>
                      <input
                        type="search"
                        value={skillExperienceSearch}
                        onChange={(event) => setSkillExperienceSearch(event.target.value)}
                        placeholder="제목 또는 유형 검색"
                        className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-800"
                      />
                      <div className="max-h-48 space-y-1.5 overflow-auto">
                        {connectionExperiences.map((experience) => (
                          <label key={experience.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs">
                            <input
                              type="checkbox"
                              checked={skillForm.experienceIds.includes(experience.id)}
                              onChange={() => setSkillForm((current) => ({
                                ...current,
                                experienceIds: current.experienceIds.includes(experience.id)
                                  ? current.experienceIds.filter((id) => id !== experience.id)
                                  : [...current.experienceIds, experience.id],
                              }))}
                              className="mt-0.5"
                            />
                            <span><b className="mr-1 text-slate-400">{experience.type}</b>{experience.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                        관련 경력 상세 · {skillForm.experienceDetailIds.length}개
                      </label>
                      <input
                        type="search"
                        value={skillDetailSearch}
                        onChange={(event) => setSkillDetailSearch(event.target.value)}
                        placeholder="경력 또는 상세 내용 검색"
                        className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-800"
                      />
                      <div className="max-h-48 space-y-1.5 overflow-auto">
                        {connectionDetails.map((detail) => (
                          <label key={detail.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs">
                            <input
                              type="checkbox"
                              checked={skillForm.experienceDetailIds.includes(detail.id)}
                              onChange={() => setSkillForm((current) => ({
                                ...current,
                                experienceDetailIds: current.experienceDetailIds.includes(detail.id)
                                  ? current.experienceDetailIds.filter((id) => id !== detail.id)
                                  : [...current.experienceDetailIds, detail.id],
                              }))}
                              className="mt-0.5"
                            />
                            <span><b className="block text-slate-400">{detail.experienceTitle}</b>{detail.content}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsSkillFormOpen(false)}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={createSkillMutation.isPending || updateSkillMutation.isPending}
                      className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
                    >
                      {skillEditingId !== null ? '수정 완료' : '추가 완료'}
                    </button>
                  </div>
                </form>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-sm">
                <span className="font-black text-slate-400">현재 결과</span>
                <span className="rounded bg-slate-900 px-2 py-1 font-black text-white">전체 {filteredSkillSummary.total}</span>
                <span className="border-l border-slate-200 pl-3 font-bold text-slate-600">Core <b className="text-slate-900">{filteredSkillSummary.core}</b></span>
                <span className="border-l border-slate-200 pl-3 font-bold text-slate-500">실무 경험 <b className="text-slate-800">{filteredSkillSummary.work}</b></span>
                <span className="border-l border-slate-200 pl-3 font-bold text-slate-500">프로젝트 활용 <b className="text-slate-800">{filteredSkillSummary.project}</b></span>
                <span className="border-l border-slate-200 pl-3 font-bold text-slate-500">학습 <b className="text-slate-800">{filteredSkillSummary.learning}</b></span>
              </div>

              {groupedFilteredSkills.length > 0 ? (
                <div className="space-y-4">
                  {groupedFilteredSkills.map(({ category, skills }) => (
                    <SkillGroupSection
                      key={category.key}
                      category={category}
                      skills={skills}
                      onEdit={(skill) => { void openSkillEditor(skill); }}
                      onDelete={handleSkillDelete}
                      onToggleCore={(skill) => toggleCoreSkillMutation.mutate(skill)}
                      updatingCoreSkillId={toggleCoreSkillMutation.isPending
                        ? toggleCoreSkillMutation.variables?.id
                        : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                  <p className="text-sm font-black text-slate-600">조건에 맞는 기술이 없습니다.</p>
                  <p className="mt-1 text-xs text-slate-400">카테고리나 검색어를 변경해보세요.</p>
                </div>
              )}
            </div>
          )}

          {/* ======================= EXPERIENCE TAB ======================= */}
          {activeTab === 'EXPERIENCE' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-xl font-black text-slate-950">이력 및 경력 관리</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Career, Project, Education, Certificate 항목을 유형별로 관리합니다.</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedExperienceId(null);
                    setExpEditingId(null);
                    setExpForm(emptyExperienceForm);
                    setCreateAsCoreProject(false);
                    setExpandedDetailIdx(null);
                    setDetailListSearch('');
                    setExpAiInstruction('');
                    setExpAiSuggestions([]);
                    resetExpAiStream();
                    setIsExpFormOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  이력 추가
                </button>
              </div>

              {/* FILTERS & SEARCH */}
              {!isExpFormOpen && !selectedExperience && (
              <div className="sticky top-14 z-20 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/95 p-4 rounded-2xl border border-slate-200 shadow-sm backdrop-blur-xl animate-fadeIn">
                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                  {['ALL', 'CAREER', 'PROJECT', 'EDUCATION', 'CERTIFICATE'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setExpFilter(cat)}
                      className={`px-3 py-1.5 text-sm font-bold rounded-lg transition ${
                        expFilter === cat
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-100'
                      }`}
                    >
                      {cat === 'ALL'
                        ? '전체'
                        : cat === 'CAREER'
                        ? '회사 경력'
                        : cat === 'PROJECT'
                        ? '프로젝트'
                        : cat === 'EDUCATION'
                        ? '학력'
                        : '자격증'}
                    </button>
                  ))}
                </div>
                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="이력명, 성과 검색..."
                    value={expSearch}
                    onChange={(e) => setExpSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm transition focus:border-slate-800 focus:outline-none bg-slate-50/50"
                  />
                </div>
              </div>
              )}

              {isExpFormOpen && (
                <form onSubmit={handleExpSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-black text-slate-800">{expEditingId !== null ? '이력 수정' : '새 이력 추가'}</h3>

                  {createAsCoreProject && expEditingId === null && (
                    <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                      프로젝트를 저장하면 핵심 프로젝트의 마지막 순서에 자동으로 편성됩니다.
                    </p>
                  )}

                  <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-600 text-white">
                        <WandSparkles className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-violet-950">AI로 경력 회고 초안 만들기</h4>
                        <p className="mt-1 text-xs leading-relaxed text-violet-700">
                          AI가 1단계에서 선택한 기술·관련 Study·관련 경력과 메모의 사실관계를 정리하고, 2단계에서 검증된 사실만 사용해 요약·배운 점과 상세 항목 초안을 작성합니다.
                        </p>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <textarea
                            rows={3}
                            maxLength={1000}
                            value={expAiInstruction}
                            onChange={(event) => setExpAiInstruction(event.target.value)}
                            placeholder="이 경력·프로젝트에서 있었던 일, 맡은 역할, 핵심 키워드를 적어주세요."
                            className="min-h-[88px] flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          />
                          <button
                            type="button"
                            onClick={requestExpAiSuggestions}
                            disabled={isExpAiGenerating}
                            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60 sm:self-stretch"
                          >
                            <WandSparkles className={`h-4 w-4 ${isExpAiGenerating ? 'animate-pulse' : ''}`} />
                            {isExpAiGenerating ? '사실관계 정리·작성 중...' : expAiSuggestions.length > 0 ? '다시 생성' : 'AI 초안 생성'}
                          </button>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-violet-500">선택한 기술·관련 Study·경력 요약과 메모가 NVIDIA NIM API로 전송됩니다. AI 초안은 자동 저장되지 않으니 반드시 검토 후 저장하세요.</p>

                        {(expAiStages.length > 0 || expAiError) && (
                          <div ref={expAiChatRef} className="mt-4 max-h-80 space-y-2.5 overflow-y-auto rounded-xl border border-violet-100 bg-white p-3">
                            {expAiStages.map((stageItem) => (
                              <AiStageBubble
                                key={stageItem.stage}
                                stage={stageItem}
                                fieldLabels={EXPERIENCE_AI_FIELD_LABELS}
                                extra={stageItem.stage === 1 && expAiFactCount > 0 ? (
                                  <p className="mt-2 text-[11px] font-bold text-violet-600">검증된 사실 {expAiFactCount}개</p>
                                ) : undefined}
                              />
                            ))}
                            {expAiError && (
                              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{expAiError}</p>
                            )}
                          </div>
                        )}

                        {expAiSuggestions.length > 0 && (
                          <div className="mt-4 space-y-3">
                            {expAiSuggestions.map((suggestion, index) => (
                              <article key={index} className="rounded-xl border border-violet-200 bg-white p-4 shadow-sm">
                                <p className="text-xs leading-relaxed text-slate-600">{suggestion.summary}</p>
                                {suggestion.takeaway && (
                                  <p className="mt-2 text-xs leading-relaxed text-slate-500">배운 점: {suggestion.takeaway}</p>
                                )}
                                {suggestion.reason && <p className="mt-3 rounded-lg bg-violet-50 px-2.5 py-2 text-[11px] leading-relaxed text-violet-700">{suggestion.reason}</p>}
                                <div className="mt-3">
                                  <button type="button" onClick={() => applyExpAiSummary(suggestion)} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-50">
                                    <Check className="h-3.5 w-3.5" /> 요약·배운 점 적용
                                  </button>
                                </div>
                                {suggestion.details.length > 0 && (
                                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">제안된 상세 항목</p>
                                    {suggestion.details.map((detail, detailIndex) => (
                                      <div key={detailIndex} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-xs font-bold text-slate-700">{detail.content}</p>
                                        {detail.situation && <p className="mt-1 text-[11px] text-slate-500">상황: {detail.situation}</p>}
                                        {detail.actionDetail && <p className="text-[11px] text-slate-500">행동: {detail.actionDetail}</p>}
                                        {detail.outcome && <p className="text-[11px] text-slate-500">성과: {detail.outcome}</p>}
                                        <button type="button" onClick={() => addExpAiDetailSuggestion(detail)} className="mt-2 inline-flex items-center gap-1 rounded-lg border border-violet-200 px-2.5 py-1.5 text-[11px] font-bold text-violet-700 transition hover:bg-violet-50">
                                          <Check className="h-3 w-3" /> 상세 항목으로 추가
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2 pt-2">
                    <Briefcase className="h-4 w-4 text-slate-500" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">기본 정보</h4>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">이력 구분 (유형)</label>
                      <select
                        value={expForm.type}
                        onChange={(e) => {
                          const type = e.target.value as ExperienceRequest['type'];
                          setExpForm({ ...expForm, type, careerId: type === 'PROJECT' ? expForm.careerId : undefined });
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="CAREER">회사 경력 (CAREER)</option>
                        <option value="PROJECT">프로젝트 (PROJECT)</option>
                        <option value="EDUCATION">학력/학습 (EDUCATION)</option>
                        <option value="CERTIFICATE">자격증 (CERTIFICATE)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">이력명 (타이틀)</label>
                      <input
                        type="text"
                        required
                        value={expForm.title}
                        onChange={(e) => setExpForm({ ...expForm, title: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </div>

                  {/* Common: Period, displayOrder */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">시작일</label>
                      <input
                        type="date"
                        required
                        value={expForm.periodStart}
                        onChange={(e) => setExpForm({ ...expForm, periodStart: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">종료일 (없으면 비워둠)</label>
                      <input
                        type="date"
                        value={expForm.periodEnd ?? ''}
                        onChange={(e) => setExpForm({ ...expForm, periodEnd: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">정렬 순서</label>
                      <input
                        type="number"
                        required
                        value={expForm.displayOrder}
                        onChange={(e) => setExpForm({ ...expForm, displayOrder: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">태그 (쉼표 구분)</label>
                    <input
                      type="text"
                      value={expForm.tagNames}
                      onChange={(e) => setExpForm({ ...expForm, tagNames: e.target.value })}
                      placeholder="리드, 아키텍처, 마이그레이션"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={expForm.showOnTimeline}
                        onChange={(e) => setExpForm({ ...expForm, showOnTimeline: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                      />
                      커리어 & 학습 타임라인에 표시
                    </label>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">타임라인 짧은 라벨 (선택, 비우면 제목 사용)</label>
                      <input
                        type="text"
                        value={expForm.timelineLabel}
                        onChange={(e) => setExpForm({ ...expForm, timelineLabel: e.target.value })}
                        placeholder="예: CS, LogDr., AI면접"
                        maxLength={60}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </div>

                  {/* Subtype Conditional Fields */}
                  {expForm.type === 'CAREER' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 rounded-xl bg-slate-100/20 border border-slate-200/50 p-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">회사명</label>
                        <input
                          type="text"
                          required
                          value={expForm.companyName}
                          onChange={(e) => setExpForm({ ...expForm, companyName: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">고용 형태</label>
                        <input
                          type="text"
                          required
                          value={expForm.employmentType}
                          onChange={(e) => setExpForm({ ...expForm, employmentType: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">부서명</label>
                        <input
                          type="text"
                          required
                          value={expForm.department}
                          onChange={(e) => setExpForm({ ...expForm, department: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">담당 직무 (역할)</label>
                        <input
                          type="text"
                          required
                          value={expForm.role}
                          onChange={(e) => setExpForm({ ...expForm, role: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {expForm.type === 'PROJECT' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-xl bg-slate-100/20 border border-slate-200/50 p-4">
                      <div className="sm:col-span-3">
                        <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">프로젝트 소속</label>
                        <select
                          value={expForm.careerId ?? ''}
                          onChange={(e) => {
                            const careerId = e.target.value ? Number(e.target.value) : undefined;
                            const career = (experiencesList ?? []).find((item) => item.id === careerId && item.type === 'CAREER');
                            setExpForm({
                              ...expForm,
                              careerId,
                              periodStart: career?.periodStart ?? expForm.periodStart,
                              periodEnd: career?.periodEnd ?? expForm.periodEnd,
                              role: career?.role || expForm.role,
                            });
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                        >
                          <option value="">독립·팀 프로젝트</option>
                          {(experiencesList ?? [])
                            .filter((item) => item.type === 'CAREER')
                            .map((career) => (
                              <option key={career.id} value={career.id}>
                                {career.companyName || career.title} · {career.role || '역할 미입력'}
                              </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-slate-400">직장 경력을 선택하면 해당 회사 아래에 소속 프로젝트로 표시됩니다.</p>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">프로젝트 식별자 (slug)</label>
                        <input
                          type="text"
                          required
                          placeholder="예: project1, project2"
                          value={expForm.slug}
                          onChange={(e) => setExpForm({ ...expForm, slug: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">담당 직무 (역할)</label>
                        <input
                          type="text"
                          required
                          placeholder="예: Backend & DevOps"
                          value={expForm.role}
                          onChange={(e) => setExpForm({ ...expForm, role: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">기여도 (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={expForm.contributionRate ?? ''}
                          onChange={(e) => setExpForm({ ...expForm, contributionRate: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">GitHub 저장소 URL (선택)</label>
                        <input
                          type="url"
                          maxLength={500}
                          placeholder="https://github.com/사용자/저장소"
                          value={expForm.repositoryUrl ?? ''}
                          onChange={(e) => setExpForm({ ...expForm, repositoryUrl: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                        />
                        <p className="mt-1 text-xs text-slate-400">비공개 또는 저장소가 없는 프로젝트는 비워두세요.</p>
                      </div>
                    </div>
                  )}

                  {expForm.type === 'EDUCATION' && (
                    <div className="rounded-xl bg-slate-100/20 border border-slate-200/50 p-4">
                      <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">학교 또는 교육 기관명</label>
                      <input
                        type="text"
                        required
                        placeholder="예: OO대학교 컴퓨터공학"
                        value={expForm.institutionName}
                        onChange={(e) => setExpForm({ ...expForm, institutionName: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                      />
                    </div>
                  )}

                  {expForm.type === 'CERTIFICATE' && (
                    <div className="rounded-xl bg-slate-100/20 border border-slate-200/50 p-4">
                      <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">발급 기관</label>
                      <input
                        type="text"
                        required
                        placeholder="예: 한국산업인력공단"
                        value={expForm.issuer}
                        onChange={(e) => setExpForm({ ...expForm, issuer: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">이미지</label>
                    <ImageGalleryEditor
                      scope="EXPERIENCE_GALLERY"
                      images={expForm.images}
                      onChange={(images) => setExpForm({ ...expForm, images })}
                    />
                  </div>

                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2 pt-2">
                    <BookOpen className="h-4 w-4 text-slate-500" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">본문 내용</h4>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">한줄 요약 (Summary, 마크다운)</label>
                    <MarkdownEditor
                      value={expForm.summary ?? ''}
                      onChange={(summary) => setExpForm({ ...expForm, summary })}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Takeaway (성과 및 배운점, 마크다운)</label>
                    <MarkdownEditor
                      value={expForm.takeaway ?? ''}
                      onChange={(takeaway) => setExpForm({ ...expForm, takeaway })}
                    />
                  </div>

                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2 pt-2">
                    <Wrench className="h-4 w-4 text-slate-500" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">기술 · 관련 자료</h4>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">사용 기술 매핑</label>
                    <div className="relative mb-2">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={expSkillSearch}
                        onChange={(event) => setExpSkillSearch(event.target.value)}
                        placeholder="기술명 또는 분류 검색"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="grid max-h-56 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
                      {selectableExpSkills.map((s) => {
                        const isChecked = expForm.skillIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={`flex items-start gap-2 p-2 rounded-lg border transition cursor-pointer text-sm ${
                              isChecked
                                ? 'bg-slate-100 border-slate-300 text-slate-950 font-bold'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleExpSkill(s.id)}
                              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                            />
                            <span className="min-w-0">
                              <span className="block truncate">{s.name}</span>
                              <span className="mt-0.5 block truncate text-xs font-semibold text-slate-400">
                                {skillUsageOptions.find((option) => option.value === s.usageType)?.label ?? s.usageType}
                                {s.skillVersion ? ` · v${s.skillVersion}` : ''}
                                {s.skillLevel ? ` · ${s.skillLevel}` : ''}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                      {selectableExpSkills.length === 0 && (
                        <p className="col-span-full py-4 text-center text-xs font-semibold text-slate-400">검색 결과가 없습니다.</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                        관련 Study · {expForm.studyIds.length}개
                      </label>
                      <div className="relative mb-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="search"
                          value={expStudySearch}
                          onChange={(event) => setExpStudySearch(event.target.value)}
                          placeholder="Study 제목 검색"
                          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-800"
                        />
                      </div>
                      <div className="grid max-h-52 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2">
                        {selectableExpStudies.map((study) => (
                          <label key={study.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs">
                            <input
                              type="checkbox"
                              checked={expForm.studyIds.includes(study.id)}
                              onChange={() => setExpForm((current) => ({
                                ...current,
                                studyIds: current.studyIds.includes(study.id)
                                  ? current.studyIds.filter((id) => id !== study.id)
                                  : [...current.studyIds, study.id],
                              }))}
                              className="mt-0.5"
                            />
                            <span className="font-semibold text-slate-700">{study.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                        관련 프로젝트·이력 · {expForm.relatedExperienceIds.length}개
                      </label>
                      <div className="relative mb-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="search"
                          value={expRelatedSearch}
                          onChange={(event) => setExpRelatedSearch(event.target.value)}
                          placeholder="제목 또는 유형 검색"
                          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-800"
                        />
                      </div>
                      <div className="grid max-h-52 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2">
                        {selectableRelatedExperiences.map((experience) => (
                          <label key={experience.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs">
                            <input
                              type="checkbox"
                              checked={expForm.relatedExperienceIds.includes(experience.id)}
                              onChange={() => setExpForm((current) => ({
                                ...current,
                                relatedExperienceIds: current.relatedExperienceIds.includes(experience.id)
                                  ? current.relatedExperienceIds.filter((id) => id !== experience.id)
                                  : [...current.relatedExperienceIds, experience.id],
                              }))}
                              className="mt-0.5"
                            />
                            <span><b className="mr-1 text-slate-400">{experience.type}</b>{experience.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2 pt-2">
                    <ListChecks className="h-4 w-4 text-slate-500" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">
                      이력 상세 항목 (Bullet Points) · {expForm.details.length}개
                    </h4>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="새로운 불릿 항목 상세 입력..."
                        value={detailInput}
                        onChange={(e) => setDetailInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDetailPoint(); } }}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:border-slate-800 bg-white"
                      />
                      <button
                        type="button"
                        onClick={addDetailPoint}
                        className="rounded-lg bg-slate-100 border border-slate-300 text-slate-900 p-2 hover:bg-slate-200 text-xs font-bold flex items-center gap-1"
                      >
                        <PlusCircle className="h-4 w-4" />
                        추가
                      </button>
                    </div>

                    {expForm.details.length > 0 && (
                      <div className="relative mb-3">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="search"
                          value={detailListSearch}
                          onChange={(event) => setDetailListSearch(event.target.value)}
                          placeholder="상세 항목 내용 검색..."
                          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      {expForm.details
                        .map((d, idx) => ({ d, idx }))
                        .filter(({ d }) => !detailListSearch.trim()
                          || d.content.toLowerCase().includes(detailListSearch.trim().toLowerCase()))
                        .map(({ d, idx }) => {
                        const isDetailExpanded = expandedDetailIdx === idx;
                        return (
                          <div key={idx} className="bg-white rounded-lg border border-slate-200 text-sm">
                            <div className="flex items-center justify-between gap-1 p-2">
                              <div className="flex shrink-0 flex-col">
                                <button
                                  type="button"
                                  onClick={() => moveDetailPoint(idx, -1)}
                                  disabled={idx === 0 || detailListSearch.trim() !== ''}
                                  title="위로 이동"
                                  className="grid h-4 w-5 place-items-center text-slate-400 hover:text-slate-900 disabled:opacity-20 disabled:hover:text-slate-400"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveDetailPoint(idx, 1)}
                                  disabled={idx === expForm.details.length - 1 || detailListSearch.trim() !== ''}
                                  title="아래로 이동"
                                  className="grid h-4 w-5 place-items-center text-slate-400 hover:text-slate-900 disabled:opacity-20 disabled:hover:text-slate-400"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                              </div>
                              <input
                                type="text"
                                value={d.content}
                                onChange={(e) => updateDetailField(idx, 'content', e.target.value)}
                                placeholder="불릿 한 줄 요약"
                                className="min-w-0 flex-1 rounded-md border border-transparent px-2 py-1 text-sm focus:border-slate-400 focus:bg-slate-100/30 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedDetailIdx(isDetailExpanded ? null : idx);
                                  setDetailSkillSearch('');
                                  setDetailStudySearch('');
                                  setNarrativeError(null);
                                }}
                                className="text-slate-400 transition hover:text-slate-900"
                              >
                                {isDetailExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeDetailPoint(idx)}
                                className="text-red-500 transition hover:text-red-700"
                              >
                                <MinusCircle className="h-4 w-4" />
                              </button>
                            </div>

                            {isDetailExpanded && (
                              <div className="space-y-2 border-t border-slate-100 p-3">
                                <div>
                                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">상황 (Situation, 마크다운)</label>
                                  <MarkdownEditor
                                    value={d.situation ?? ''}
                                    onChange={(value) => updateDetailField(idx, 'situation', value)}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">과정 (Action, 마크다운)</label>
                                  <MarkdownEditor
                                    value={d.actionDetail ?? ''}
                                    onChange={(value) => updateDetailField(idx, 'actionDetail', value)}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">성과 (Outcome, 마크다운)</label>
                                  <MarkdownEditor
                                    value={d.outcome ?? ''}
                                    onChange={(value) => updateDetailField(idx, 'outcome', value)}
                                  />
                                </div>
                                <div>
                                  <div className="mb-1 flex items-center justify-between gap-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">서술 (Narrative, AI 병합 문단)</label>
                                    <button
                                      type="button"
                                      onClick={() => generateDetailNarrative(idx)}
                                      disabled={isNarrativeGenerating}
                                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700 transition hover:bg-violet-100 disabled:cursor-wait disabled:opacity-60"
                                    >
                                      {isNarrativeGenerating
                                        ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                        : <WandSparkles className="h-3.5 w-3.5" />}
                                      {isNarrativeGenerating ? '재작성 중...' : 'AI로 재작성'}
                                    </button>
                                  </div>
                                  {narrativeError && <p className="mb-1 text-[11px] font-semibold text-red-500">{narrativeError}</p>}
                                  <MarkdownEditor
                                    value={d.narrative ?? ''}
                                    onChange={(value) => updateDetailField(idx, 'narrative', value)}
                                  />
                                </div>
                                <div className="grid gap-3 lg:grid-cols-2">
                                  <div>
                                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">이 항목의 기술 태그</label>
                                    <div className="relative mb-2">
                                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                      <input
                                        type="search"
                                        value={detailSkillSearch}
                                        onChange={(event) => setDetailSkillSearch(event.target.value)}
                                        placeholder="기술명 또는 분류 검색"
                                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-200"
                                      />
                                    </div>
                                    <div className="max-h-52 space-y-1 overflow-auto rounded-xl border border-slate-200 p-3">
                                      {selectableDetailSkills.map((s) => (
                                        <label key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                                          <input
                                            type="checkbox"
                                            checked={d.skillIds.includes(s.id)}
                                            onChange={() => toggleDetailSkill(idx, s.id)}
                                          />
                                          {s.name}
                                        </label>
                                      ))}
                                      {selectableDetailSkills.length === 0 && (
                                        <p className="py-4 text-center text-xs font-semibold text-slate-400">검색 결과가 없습니다.</p>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                      이 항목의 관련 Study · {d.studyIds.length}개
                                    </label>
                                    <div className="relative mb-2">
                                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                      <input
                                        type="search"
                                        value={detailStudySearch}
                                        onChange={(event) => setDetailStudySearch(event.target.value)}
                                        placeholder="Study 제목 검색"
                                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-200"
                                      />
                                    </div>
                                    <div className="max-h-52 space-y-1 overflow-auto rounded-xl border border-slate-200 p-3">
                                      {selectableDetailStudies.map((study) => (
                                        <label key={study.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                                          <input
                                            type="checkbox"
                                            checked={d.studyIds.includes(study.id)}
                                            onChange={() => toggleDetailStudy(idx, study.id)}
                                          />
                                          {study.title}
                                        </label>
                                      ))}
                                      {selectableDetailStudies.length === 0 && (
                                        <p className="py-4 text-center text-xs font-semibold text-slate-400">검색 결과가 없습니다.</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsExpFormOpen(false);
                        setCreateAsCoreProject(false);
                        setExpAiSuggestions([]);
                        resetExpAiStream();
                      }}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={createExpMutation.isPending || updateExpMutation.isPending}
                      className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
                    >
                      {expEditingId !== null ? '수정 완료' : createAsCoreProject ? '핵심 프로젝트 생성' : '이력 생성'}
                    </button>
                  </div>
                </form>
              )}

              {!isExpFormOpen && selectedExperience && (
                <ExperienceDetailPanel
                  experience={selectedExperience}
                  onBack={() => setSelectedExperienceId(null)}
                  onEdit={(experience) => { void openExperienceEditor(experience); }}
                  onDelete={handleExpDelete}
                />
              )}

              {!isExpFormOpen && !selectedExperience && (
                <div className="space-y-2.5">
                  {filteredExperiences?.map((exp) => (
                    <div
                      key={exp.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => setSelectedExperienceId(exp.id)}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-bold text-slate-500">{exp.type}</span>
                            <p className="font-mono text-xs font-bold text-slate-400">정렬 {exp.displayOrder}</p>
                            <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-bold ${exp.showOnTimeline ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                              {exp.showOnTimeline ? <Pin className="h-2.5 w-2.5" /> : <PinOff className="h-2.5 w-2.5" />}
                              타임라인
                            </span>
                          </div>
                          <p className="mt-1 text-base font-black text-slate-800 transition hover:text-slate-950">{exp.title}</p>
                          {exp.summary && <p className="mt-1 line-clamp-1 text-sm text-slate-500">{exp.summary}</p>}
                        </button>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => { void openExperienceEditor(exp); }}
                            title="수정"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExpDelete(exp.id)}
                            title="삭제"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      </div>

      {isPreviewOpen && (
        <div
          className={`relative shrink-0 self-start overflow-hidden border-l border-slate-200 bg-white lg:sticky lg:top-20 ${
            isResizingPreview ? '' : 'transition-[width] duration-300 ease-in-out'
          }`}
          style={{
            height: 'calc(100vh - 5rem)',
            width: isPreviewVisible ? effectivePreviewWidth : 0,
          }}
        >
          <div
            onMouseDown={handlePreviewResizeStart}
            className="absolute left-0 top-0 z-10 hidden h-full w-2.5 -translate-x-1/2 cursor-col-resize touch-none group sm:block"
            title="드래그하여 너비 조절"
          >
            <div className="mx-auto h-full w-px bg-transparent transition group-hover:bg-slate-300 group-active:bg-slate-400" />
          </div>
          <div className="flex h-full w-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900">메인페이지 미리보기</h3>
                <p className="mt-0.5 text-xs text-slate-500">저장 전 변경사항이 반영된 화면입니다.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={refreshPreview}
                  title="새로고침"
                  aria-label="미리보기 새로고침"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={closePreviewPanel}
                  title="닫기"
                  aria-label="미리보기 닫기"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <iframe
              key={`${previewNonce}-${activeTab === 'PRINT_TEMPLATES' ? 'print' : 'normal'}`}
              src={activeTab === 'PRINT_TEMPLATES' ? '/?preview=1&printMode=1' : '/?preview=1'}
              title="메인페이지 미리보기"
              className="w-full flex-1 border-0"
            />
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
