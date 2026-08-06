'use client';

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Home,
    LogOut,
    BookOpen,
    User,
    Cpu,
    Briefcase,
    ChevronLeft,
    ChevronRight,
    Eye,
    RefreshCw,
    Sparkles,
    Pin,
    Terminal,
    Printer,
    BarChart3,
    Heart,
    ClipboardList,
    GraduationCap,
    CalendarCheck,
    X,
    Activity,
    GitBranch,
    Github,
    ExternalLink,
    FolderGit2,
    ListTree,
    Radio,
} from 'lucide-react';
import { bffApi, skillApi, systemStatusApi } from '@/lib/api';
import type { Experience, IntroductionResponse, Skill } from '@/lib/api/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useAdminPreviewStore } from '@/store/useAdminPreviewStore';
import { useAiModelStore } from '@/store/useAiModelStore';
import { AI_MODEL_OPTIONS } from '@/lib/constants/aiModels';
import { StudyManagement } from './study/StudyManagement';
import { LearningResourceManagement } from './learning-resource/LearningResourceManagement';
import { TaxonomyManagement } from './taxonomy/TaxonomyManagement';
import { SkillsManagement } from './skills/SkillsManagement';
import { ExperienceManagement } from './experience/ExperienceManagement';
import { ProfileManagement } from './profile/ProfileManagement';
import { CompetencyManagement } from './competency/CompetencyManagement';
import { CoreProjectManagement } from './core-project/CoreProjectManagement';
import { ArchitectureManagement } from './architecture/ArchitectureManagement';
import { PrintTemplateManagement } from './print-template/PrintTemplateManagement';
import { PortfolioManagement } from './portfolio/PortfolioManagement';
import { AnalyticsPanel } from './analytics/AnalyticsPanel';
import { DonationsPanel } from './donations/DonationsPanel';
import { JobApplicationManagement } from './job-application/JobApplicationManagement';
import { StudyPlanManagement } from './study-plan/StudyPlanManagement';

const PREVIEW_MIN_WIDTH = 420;
const PREVIEW_MAX_WIDTH = 960;
const PREVIEW_DEFAULT_WIDTH = 760;
// 이 뷰포트 너비 아래에서는 도킹 대신 미리보기가 화면 전체를 차지한다(모바일 풀스크린처럼).
const PREVIEW_STACK_BREAKPOINT = 640;
// 미리보기를 도킹했을 때 사이드바 + 최소한의 admin 콘텐츠 영역을 위해 남겨두는 폭.
const ADMIN_CONTENT_RESERVE_WIDTH = 460;

type TabId =
    | 'ANALYTICS'
    | 'DONATIONS'
    | 'STUDY'
    | 'PROFILE'
    | 'SKILLS'
    | 'COMPETENCIES'
    | 'EXPERIENCE'
    | 'CORE_PROJECTS'
    | 'ARCHITECTURE'
    | 'PRINT_TEMPLATES'
    | 'PORTFOLIO'
    | 'JOB_APPLICATIONS'
    | 'LEARNING_RESOURCES'
    | 'STUDY_PLAN'
    | 'TAXONOMY';

const ADMIN_MENU_GROUPS = [
    {
        label: '콘텐츠 자산',
        items: [
            { id: 'STUDY', label: '공부 정리 관리', icon: BookOpen },
            { id: 'LEARNING_RESOURCES', label: '학습 자료 관리', icon: GraduationCap },
            { id: 'STUDY_PLAN', label: 'AI 학습 계획', icon: CalendarCheck },
            { id: 'SKILLS', label: '기술 스택 관리', icon: Cpu },
        ],
    },
    {
        label: '커리어 관리',
        items: [
            { id: 'EXPERIENCE', label: '이력 및 경력 관리', icon: Briefcase },
            { id: 'JOB_APPLICATIONS', label: '지원 공고 관리', icon: ClipboardList },
        ],
    },
    {
        label: '페이지 구성',
        items: [
            { id: 'PROFILE', label: '프로필 정보 관리', icon: User },
            { id: 'TAXONOMY', label: '카테고리 체계 관리', icon: ListTree },
            { id: 'COMPETENCIES', label: '핵심 역량 관리', icon: Sparkles },
            { id: 'CORE_PROJECTS', label: '핵심 프로젝트 관리', icon: Pin },
            { id: 'ARCHITECTURE', label: '시스템 아키텍처 관리', icon: Terminal },
            { id: 'PORTFOLIO', label: '포트폴리오 관리', icon: FolderGit2 },
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

/** CORE_PROJECTS 탭에서 "새 프로젝트 만들기"를 누르면 EXPERIENCE 탭으로 넘어가면서
 * "새 프로젝트 작성 폼을 열어라"는 의도만 전달한다. displayOrder는 ExperienceManagement가
 * 자신이 이미 불러온 experiences 목록에서 직접 계산한다(셸은 그 목록을 갖고 있지 않음). */
export type PendingExperienceIntent = { type: 'PROJECT' } | null;

export function AdminDashboardShell() {
    const logout = useAuthStore((s) => s.logout);
    const [activeTab, setActiveTab] = useState<TabId>('STUDY');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncTabFromUrl = () => {
            const params = new URLSearchParams(window.location.search);
            const tabInUrl = params.get('tab') as TabId | null;
            const validTabs: TabId[] = [
                'ANALYTICS',
                'DONATIONS',
                'STUDY',
                'PROFILE',
                'SKILLS',
                'COMPETENCIES',
                'EXPERIENCE',
                'CORE_PROJECTS',
                'ARCHITECTURE',
                'PRINT_TEMPLATES',
                'PORTFOLIO',
                'JOB_APPLICATIONS',
                'LEARNING_RESOURCES',
                'STUDY_PLAN',
                'TAXONOMY',
            ];
            if (tabInUrl && validTabs.includes(tabInUrl)) {
                setActiveTab(tabInUrl);
                if (tabInUrl === 'JOB_APPLICATIONS') {
                    setIsSidebarCollapsed(true);
                }
            }
        };

        syncTabFromUrl();

        const handlePopState = () => {
            syncTabFromUrl();
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const handleTabChange = (newTab: TabId) => {
        setActiveTab(newTab);
        if (newTab === 'JOB_APPLICATIONS') {
            setIsSidebarCollapsed(true);
        }
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', newTab);
            url.searchParams.delete('studyId');
            url.searchParams.delete('expId');
            url.searchParams.delete('resourceId');
            url.searchParams.delete('fromResourceId');
            url.searchParams.delete('action');
            window.history.replaceState(null, '', url.pathname + url.search);
        }
    };

    const [pendingExperienceIntent, setPendingExperienceIntent] =
        useState<PendingExperienceIntent>(null);

    useEffect(() => {
        const compactViewport = window.matchMedia('(max-width: 1279px)');
        const syncSidebarToViewport = (matches: boolean) => setIsSidebarCollapsed(matches);

        syncSidebarToViewport(compactViewport.matches);
        const handleViewportChange = (event: MediaQueryListEvent) =>
            syncSidebarToViewport(event.matches);
        compactViewport.addEventListener('change', handleViewportChange);
        return () => compactViewport.removeEventListener('change', handleViewportChange);
    }, []);

    const { data: introData } = useQuery({
        queryKey: ['introduction'],
        queryFn: bffApi.getIntroduction,
    });
    const { data: skillsList } = useQuery({ queryKey: ['skills'], queryFn: () => skillApi.list() });
    const profileDraft = useAdminPreviewStore((s) => s.profileDraft);
    const skillDraft = useAdminPreviewStore((s) => s.skillDraft);
    const experienceDraft = useAdminPreviewStore((s) => s.experienceDraft);

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [previewNonce, setPreviewNonce] = useState(0);
    const [previewWidth, setPreviewWidth] = useState(() => {
        const stored =
            typeof window !== 'undefined'
                ? window.localStorage.getItem('admin-preview-width')
                : null;
        const parsed = stored ? parseInt(stored, 10) : NaN;
        return Number.isFinite(parsed)
            ? Math.min(Math.max(parsed, PREVIEW_MIN_WIDTH), PREVIEW_MAX_WIDTH)
            : PREVIEW_DEFAULT_WIDTH;
    });
    const [isResizingPreview, setIsResizingPreview] = useState(false);
    const previewResizeStartRef = useRef<{ x: number; width: number } | null>(null);
    const [isStatusPanelOpen, setIsStatusPanelOpen] = useState(false);
    const statusPanelRef = useRef<HTMLDivElement>(null);
    const [isAiModelPanelOpen, setIsAiModelPanelOpen] = useState(false);
    const aiModelPanelRef = useRef<HTMLDivElement>(null);
    const aiModel = useAiModelStore((state) => state.modelKey);
    const aiCustomModelName = useAiModelStore((state) => state.customModelName);
    const setAiModel = useAiModelStore((state) => state.setModelKey);
    const setAiCustomModelName = useAiModelStore((state) => state.setCustomModelName);
    const selectedAiModelOption = AI_MODEL_OPTIONS.find((option) => option.id === aiModel);
    const {
        data: externalStatuses,
        isFetching: isStatusLoading,
        isError: isStatusError,
        refetch: refetchExternalStatuses,
    } = useQuery({
        queryKey: ['admin-external-status'],
        queryFn: systemStatusApi.external,
        enabled: false,
        staleTime: 30_000,
    });

    useEffect(() => {
        if (!isStatusPanelOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (statusPanelRef.current && !statusPanelRef.current.contains(event.target as Node)) {
                setIsStatusPanelOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isStatusPanelOpen]);

    useEffect(() => {
        if (!isAiModelPanelOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (
                aiModelPanelRef.current &&
                !aiModelPanelRef.current.contains(event.target as Node)
            ) {
                setIsAiModelPanelOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isAiModelPanelOpen]);

    const toggleStatusPanel = () => {
        setIsStatusPanelOpen((open) => {
            const next = !open;
            if (next) refetchExternalStatuses();
            return next;
        });
    };

    const STATUS_INDICATOR_STYLE: Record<string, { label: string; dot: string; text: string }> = {
        none: { label: '정상', dot: 'bg-emerald-500', text: 'text-emerald-600' },
        minor: { label: '부분 장애', dot: 'bg-amber-500', text: 'text-amber-600' },
        major: { label: '주요 장애', dot: 'bg-orange-500', text: 'text-orange-600' },
        critical: { label: '심각한 장애', dot: 'bg-red-500', text: 'text-red-600' },
        unknown: { label: '확인 불가', dot: 'bg-slate-400', text: 'text-slate-500' },
    };
    const worstIndicator = (externalStatuses ?? []).reduce<string | null>((worst, service) => {
        const rank = ['none', 'unknown', 'minor', 'major', 'critical'];
        if (!worst || rank.indexOf(service.indicator) > rank.indexOf(worst)) {
            return service.indicator;
        }
        return worst;
    }, null);
    const [viewportWidth, setViewportWidth] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth : 1280
    );

    useEffect(() => {
        const handleWindowResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleWindowResize);
        return () => window.removeEventListener('resize', handleWindowResize);
    }, []);

    const grafanaUrl =
        process.env.NEXT_PUBLIC_GRAFANA_URL ||
        (typeof window !== 'undefined' && window.location.hostname === 'localhost'
            ? 'http://localhost:3001'
            : 'https://grafana.unbrdn.me');
    const argocdUrl = process.env.NEXT_PUBLIC_ARGOCD_URL || 'https://argocd.unbrdn.me';
    const githubActionsUrl = 'https://github.com/Yoonsik-Shin/self-intro/actions';

    // 미리보기를 도킹했을 때 사이드바/admin 콘텐츠를 침범하지 않는 최대 폭.
    const previewMaxAllowedWidth = Math.min(
        PREVIEW_MAX_WIDTH,
        Math.max(PREVIEW_MIN_WIDTH, viewportWidth - ADMIN_CONTENT_RESERVE_WIDTH)
    );
    // 스택 브레이크포인트 아래에서는 미리보기가 뷰포트 전체를 차지한다(모바일 풀스크린).
    const effectivePreviewWidth =
        viewportWidth < PREVIEW_STACK_BREAKPOINT
            ? viewportWidth
            : Math.min(previewWidth, previewMaxAllowedWidth);

    // 관리자에서 현재 선택된 메뉴(및 편집 중인 폼)에 대응하는 메인페이지 경로/섹션을 계산한다.
    const getPreviewTarget = (): { path: string; section?: string } => {
        switch (activeTab) {
            case 'STUDY':
                return { path: '/study' };
            case 'PROFILE':
                return { path: '/', section: 'intro-profile' };
            case 'SKILLS':
                return { path: '/', section: 'skills' };
            case 'COMPETENCIES':
                return { path: '/', section: 'competencies' };
            case 'ARCHITECTURE':
                return { path: '/architecture', section: 'architecture-components' };
            case 'CORE_PROJECTS':
                return { path: '/', section: 'projects' };
            case 'EXPERIENCE': {
                const type = experienceDraft?.form.type;
                const section =
                    type === 'CAREER'
                        ? 'career'
                        : type === 'PROJECT'
                          ? 'projects'
                          : type === 'EDUCATION' || type === 'CERTIFICATE'
                            ? 'credentials'
                            : 'timeline';
                return { path: '/', section };
            }
            case 'ANALYTICS':
            case 'DONATIONS':
            default:
                return { path: '/', section: 'intro-profile' };
        }
    };

    // 저장 전 작성 중인 초안을 현재 저장된 introData 위에 겹쳐 미리보기용 데이터를 구성한다.
    const buildPreviewIntroData = (): IntroductionResponse | null => {
        if (!introData) return null;

        let profile = introData.profile;
        let skills = introData.skills;
        let experiences = introData.experiences;

        if (activeTab === 'PROFILE' && profileDraft) {
            profile = {
                id: introData.profile?.id ?? 0,
                updatedAt: introData.profile?.updatedAt ?? new Date().toISOString(),
                ...profileDraft,
            };
        }

        if (activeTab === 'SKILLS' && skillDraft) {
            const {
                studyIds: _studyIds,
                experienceIds: _experienceIds,
                experienceDetailIds: _experienceDetailIds,
                ...draftSkillFields
            } = skillDraft.form;
            const draftSkill: Skill = { id: skillDraft.editingId ?? -1, ...draftSkillFields };
            skills =
                skillDraft.editingId !== null
                    ? skills.map((skill) =>
                          skill.id === skillDraft.editingId ? draftSkill : skill
                      )
                    : [...skills, draftSkill];
        }

        if (activeTab === 'EXPERIENCE' && experienceDraft) {
            const form = experienceDraft.form;
            const resolveSkills = (ids: number[]): Skill[] =>
                ids
                    .map((id) => skillsList?.find((skill) => skill.id === id))
                    .filter((skill): skill is Skill => Boolean(skill));

            const draftExperience: Experience = {
                id: experienceDraft.editingId ?? -1,
                type: form.type,
                title: form.title,
                periodStart: form.periodStart,
                periodEnd: form.periodEnd ? form.periodEnd : undefined,
                summary: form.summary,
                takeaway: form.takeaway,
                displayOrder: Number(form.displayOrder),
                showOnTimeline: form.showOnTimeline,
                timelineLabel: form.timelineLabel?.trim() || undefined,
                details: form.details.map((detail, idx) => ({
                    id: detail.id ?? -(idx + 1),
                    content: detail.content,
                    situation: detail.situation,
                    actionDetail: detail.actionDetail,
                    outcome: detail.outcome,
                    displayOrder: idx,
                    skills: resolveSkills(detail.skillIds),
                })),
                skills: resolveSkills(form.skillIds),
                tags: form.tagNames
                    .split(',')
                    .map((name) => name.trim())
                    .filter(Boolean)
                    .map((name) => ({ id: -1, name, slug: name })),
                images: form.images,
                companyName: form.type === 'CAREER' ? form.companyName : undefined,
                employmentType: form.type === 'CAREER' ? form.employmentType : undefined,
                department: form.type === 'CAREER' ? form.department : undefined,
                role: form.type === 'CAREER' || form.type === 'PROJECT' ? form.role : undefined,
                slug: form.type === 'PROJECT' ? form.slug : undefined,
                contributionRate:
                    form.type === 'PROJECT' && form.contributionRate != null
                        ? Number(form.contributionRate)
                        : undefined,
                repositoryUrl:
                    form.type === 'PROJECT' ? form.repositoryUrl?.trim() || undefined : undefined,
                careerId: form.type === 'PROJECT' ? form.careerId : undefined,
                institutionName: form.type === 'EDUCATION' ? form.institutionName : undefined,
                issuer: form.type === 'CERTIFICATE' ? form.issuer : undefined,
            };

            experiences =
                experienceDraft.editingId !== null
                    ? experiences.map((experience) =>
                          experience.id === experienceDraft.editingId ? draftExperience : experience
                      )
                    : [...experiences, draftExperience];
        }

        return { ...introData, profile, skills, experiences };
    };

    const writePreviewState = () => {
        const data = buildPreviewIntroData();
        if (data) sessionStorage.setItem('admin-preview-intro-override', JSON.stringify(data));
        else sessionStorage.removeItem('admin-preview-intro-override');
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
        profileDraft,
        skillDraft,
        experienceDraft,
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

    const closePreviewPanel = () => {
        setIsPreviewVisible(false);
        setTimeout(() => {
            setIsPreviewOpen(false);
            sessionStorage.removeItem('admin-preview-intro-override');
            sessionStorage.removeItem('admin-preview-nav');
        }, 300);
    };

    const togglePreview = () => {
        if (isPreviewOpen) closePreviewPanel();
        else openPreview();
    };

    // 공개 페이지에 대응되는 화면이 없는 탭으로 오면 미리보기 패널을 닫는다.
    useEffect(() => {
        if (
            (activeTab === 'PRINT_TEMPLATES' ||
                activeTab === 'PORTFOLIO' ||
                activeTab === 'JOB_APPLICATIONS' ||
                activeTab === 'LEARNING_RESOURCES' ||
                activeTab === 'STUDY_PLAN' ||
                activeTab === 'TAXONOMY') &&
            isPreviewOpen
        )
            closePreviewPanel();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const handlePreviewResizeStart = (event: ReactMouseEvent) => {
        event.preventDefault();
        previewResizeStartRef.current = { x: event.clientX, width: effectivePreviewWidth };
        setIsResizingPreview(true);
    };

    useEffect(() => {
        if (!isResizingPreview) return;

        const handleMouseMove = (event: MouseEvent) => {
            const start = previewResizeStartRef.current;
            if (!start) return;
            const delta = start.x - event.clientX;
            const nextWidth = Math.min(
                Math.max(start.width + delta, PREVIEW_MIN_WIDTH),
                previewMaxAllowedWidth
            );
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

    return (
        <main className="min-h-screen bg-[#f8fafc] text-slate-800">
            <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <h1 className="text-base font-black text-slate-900">관리자 대시보드</h1>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative" ref={aiModelPanelRef}>
                        <button
                            type="button"
                            onClick={() => setIsAiModelPanelOpen((open) => !open)}
                            title="어필분석/보완프로젝트추천/학습계획/PDF초안/자소서에서 기본으로 쓸 AI 모델을 고릅니다"
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold transition ${
                                isAiModelPanelOpen
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600'
                            }`}
                        >
                            <Cpu className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">
                                {selectedAiModelOption?.name ?? 'AI 모델'}
                            </span>
                        </button>
                        {isAiModelPanelOpen && (
                            <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
                                <div className="mb-2 px-1 text-xs font-black text-slate-500">
                                    기본 AI 모델
                                </div>
                                <select
                                    value={aiModel}
                                    onChange={(e) => setAiModel(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-extrabold text-slate-800 focus:border-indigo-500 focus:outline-none"
                                >
                                    {AI_MODEL_OPTIONS.map((option) => (
                                        <option key={option.id} value={option.id}>
                                            {option.name} ({option.badge} · {option.price})
                                        </option>
                                    ))}
                                </select>
                                {aiModel === 'CUSTOM' && (
                                    <input
                                        type="text"
                                        value={aiCustomModelName}
                                        onChange={(e) => setAiCustomModelName(e.target.value)}
                                        placeholder="공식 API 모델명 입력 (예: claude-sonnet-5, gpt-5.4-mini)"
                                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                                    />
                                )}
                                <p className="mt-2 px-1 text-[11px] leading-relaxed text-slate-400">
                                    어필분석·보완프로젝트추천·학습계획·PDF초안·자소서 초안 생성의
                                    기본값입니다. 각 화면에서 필요하면 그때그때 다른 모델로 덮어써
                                    실행할 수 있습니다.
                                </p>
                            </div>
                        )}
                    </div>
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
                        <span className="hidden md:inline">미리보기</span>
                    </button>
                    <a
                        href={grafanaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Grafana 메트릭 & 로그 대시보드로 이동합니다"
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                    >
                        <Activity className="h-3.5 w-3.5 text-orange-500" />
                        <span className="hidden md:inline">Grafana</span>
                        <ExternalLink className="hidden h-3 w-3 opacity-40 md:inline" />
                    </a>
                    <a
                        href={argocdUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="ArgoCD 배포 관리자로 이동합니다"
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
                    >
                        <GitBranch className="h-3.5 w-3.5 text-sky-500" />
                        <span className="hidden md:inline">ArgoCD</span>
                        <ExternalLink className="hidden h-3 w-3 opacity-40 md:inline" />
                    </a>
                    <a
                        href={githubActionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="GitHub Actions 워크플로우로 이동합니다"
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                    >
                        <Github className="h-3.5 w-3.5 text-slate-700" />
                        <span className="hidden md:inline">Actions</span>
                        <ExternalLink className="hidden h-3 w-3 opacity-40 md:inline" />
                    </a>
                    <div className="relative" ref={statusPanelRef}>
                        <button
                            type="button"
                            onClick={toggleStatusPanel}
                            title="GitHub/Anthropic/OpenAI/Google Cloud 서비스 상태를 확인합니다"
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold transition ${
                                isStatusPanelOpen
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-200 text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600'
                            }`}
                        >
                            <Radio className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">서비스 상태</span>
                            {worstIndicator && (
                                <span
                                    className={`h-2 w-2 rounded-full ${STATUS_INDICATOR_STYLE[worstIndicator]?.dot ?? 'bg-slate-400'}`}
                                />
                            )}
                        </button>
                        {isStatusPanelOpen && (
                            <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
                                <div className="mb-2 flex items-center justify-between px-1">
                                    <span className="text-xs font-black text-slate-500">
                                        외부 서비스 상태
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => refetchExternalStatuses()}
                                        title="새로고침"
                                        className="text-slate-400 hover:text-slate-700"
                                    >
                                        <RefreshCw
                                            className={`h-3.5 w-3.5 ${isStatusLoading ? 'animate-spin' : ''}`}
                                        />
                                    </button>
                                </div>
                                {isStatusLoading && !externalStatuses ? (
                                    <p className="px-1 py-3 text-center text-xs text-slate-400">
                                        확인 중...
                                    </p>
                                ) : isStatusError ? (
                                    <p className="px-1 py-3 text-center text-xs text-red-500">
                                        조회 실패
                                    </p>
                                ) : (
                                    <ul className="space-y-1">
                                        {externalStatuses?.map((service) => {
                                            const style =
                                                STATUS_INDICATOR_STYLE[service.indicator] ??
                                                STATUS_INDICATOR_STYLE.unknown;
                                            return (
                                                <li key={service.name}>
                                                    <a
                                                        href={service.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50"
                                                    >
                                                        <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                            <span
                                                                className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`}
                                                            />
                                                            {service.name}
                                                        </span>
                                                        <span
                                                            className={`text-xs font-bold ${style.text}`}
                                                        >
                                                            {style.label}
                                                        </span>
                                                    </a>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                    <a
                        href="/"
                        title="메인페이지로 이동합니다"
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                    >
                        <Home className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">메인페이지</span>
                    </a>
                    <button
                        onClick={() => logout()}
                        title="로그아웃"
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">로그아웃</span>
                    </button>
                </div>
            </header>

            <div className="flex items-start">
                <div className="min-w-0 flex-1">
                    <div
                        className="grid w-full grid-cols-1 gap-6 px-4 py-6 transition-[grid-template-columns] duration-300 ease-in-out sm:px-6 lg:px-8"
                        style={{
                            gridTemplateColumns: isSidebarCollapsed
                                ? '64px minmax(0, 1fr)'
                                : '240px minmax(0, 1fr)',
                        }}
                    >
                        <aside
                            className={`relative min-w-0 transition-all duration-300 ease-in-out lg:sticky lg:top-20 lg:self-start ${isSidebarCollapsed ? 'rounded-2xl border border-slate-200 bg-white px-2 py-3 shadow-sm' : ''}`}
                        >
                            <button
                                type="button"
                                onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
                                title={isSidebarCollapsed ? '메뉴 펼치기' : '메뉴 접기'}
                                aria-expanded={!isSidebarCollapsed}
                                className={`z-20 flex items-center justify-center text-slate-400 transition-colors hover:text-slate-900 ${
                                    isSidebarCollapsed
                                        ? 'relative mx-auto mb-3 h-8 w-8 shrink-0'
                                        : 'absolute -right-4 top-1 !m-0 h-10 w-8'
                                }`}
                            >
                                {isSidebarCollapsed ? (
                                    <ChevronRight className="h-4 w-4" />
                                ) : (
                                    <ChevronLeft className="h-4 w-4" />
                                )}
                            </button>
                            <div
                                className={`mb-3 flex items-center overflow-hidden px-2 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'h-0 opacity-0' : 'h-8 opacity-100'}`}
                            >
                                <p className="whitespace-nowrap text-xs font-bold uppercase tracking-widest text-slate-400">
                                    메뉴 목록
                                </p>
                            </div>

                            <nav aria-label="관리자 메뉴" className="space-y-5">
                                {ADMIN_MENU_GROUPS.map((group, groupIndex) => (
                                    <section
                                        key={group.label}
                                        className={`transition-all duration-300 ease-in-out ${
                                            groupIndex > 0 && isSidebarCollapsed
                                                ? 'border-t border-slate-200 pt-3'
                                                : ''
                                        }`}
                                    >
                                        <h2
                                            className={`mb-1.5 overflow-hidden whitespace-nowrap px-3 text-[11px] font-black tracking-[0.12em] text-slate-400 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'max-h-0 opacity-0' : 'max-h-5 opacity-100'}`}
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
                                                        onClick={() => handleTabChange(item.id)}
                                                        title={item.label}
                                                        aria-current={isActive ? 'page' : undefined}
                                                        className={`flex items-center rounded-xl text-sm font-bold transition-all duration-300 ease-in-out ${
                                                            isSidebarCollapsed
                                                                ? 'mx-auto h-11 w-11 justify-center'
                                                                : 'w-full gap-2.5 px-3 py-2.5 text-left'
                                                        } ${
                                                            isActive
                                                                ? 'bg-slate-900 text-white shadow-sm shadow-slate-800/10'
                                                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                                        }`}
                                                    >
                                                        <Icon className="h-4 w-4 shrink-0" />
                                                        <span
                                                            className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
                                                                isSidebarCollapsed
                                                                    ? 'max-w-0 opacity-0'
                                                                    : 'max-w-[160px] opacity-100'
                                                            }`}
                                                        >
                                                            {item.label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ))}
                            </nav>
                        </aside>

                        <section className="min-w-0 space-y-6">
                            {activeTab === 'STUDY' && <StudyManagement />}
                            {activeTab === 'SKILLS' && <SkillsManagement />}
                            {activeTab === 'EXPERIENCE' && (
                                <ExperienceManagement
                                    pendingIntent={pendingExperienceIntent}
                                    onConsumeIntent={() => setPendingExperienceIntent(null)}
                                />
                            )}
                            {activeTab === 'PROFILE' && <ProfileManagement />}
                            {activeTab === 'COMPETENCIES' && <CompetencyManagement />}
                            {activeTab === 'CORE_PROJECTS' && (
                                <CoreProjectManagement
                                    onCreateProject={() => {
                                        setPendingExperienceIntent({ type: 'PROJECT' });
                                        setActiveTab('EXPERIENCE');
                                    }}
                                />
                            )}
                            {activeTab === 'ARCHITECTURE' && <ArchitectureManagement />}
                            {activeTab === 'PRINT_TEMPLATES' && <PrintTemplateManagement />}
                            {activeTab === 'PORTFOLIO' && <PortfolioManagement />}
                            {activeTab === 'ANALYTICS' && <AnalyticsPanel />}
                            {activeTab === 'DONATIONS' && <DonationsPanel />}
                            {activeTab === 'JOB_APPLICATIONS' && <JobApplicationManagement />}
                            {activeTab === 'LEARNING_RESOURCES' && <LearningResourceManagement />}
                            {activeTab === 'STUDY_PLAN' && <StudyPlanManagement />}
                            {activeTab === 'TAXONOMY' && <TaxonomyManagement />}
                        </section>
                    </div>
                </div>

                {isPreviewOpen && (
                    <div
                        className={`relative shrink-0 self-start overflow-hidden border-l border-slate-200 bg-white lg:sticky lg:top-20 ${isResizingPreview ? '' : 'transition-[width] duration-300 ease-in-out'}`}
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
                                    <h3 className="text-sm font-black text-slate-900">
                                        메인페이지 미리보기
                                    </h3>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        저장 전 변경사항이 반영된 화면입니다.
                                    </p>
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
                                key={`${previewNonce}-${getPreviewTarget().path}`}
                                src={`${getPreviewTarget().path}?preview=1`}
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
