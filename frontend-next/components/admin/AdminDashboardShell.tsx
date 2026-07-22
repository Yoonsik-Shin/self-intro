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
    X,
} from 'lucide-react';
import { bffApi, skillApi } from '@/lib/api';
import type { Experience, IntroductionResponse, Skill } from '@/lib/api/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useAdminPreviewStore } from '@/store/useAdminPreviewStore';
import { StudyManagement } from './study/StudyManagement';
import { SkillsManagement } from './skills/SkillsManagement';
import { ExperienceManagement } from './experience/ExperienceManagement';
import { ProfileManagement } from './profile/ProfileManagement';
import { CompetencyManagement } from './competency/CompetencyManagement';
import { CoreProjectManagement } from './core-project/CoreProjectManagement';
import { ArchitectureManagement } from './architecture/ArchitectureManagement';
import { PrintTemplateManagement } from './print-template/PrintTemplateManagement';
import { AnalyticsPanel } from './analytics/AnalyticsPanel';
import { DonationsPanel } from './donations/DonationsPanel';

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
    | 'PRINT_TEMPLATES';

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

/** CORE_PROJECTS 탭에서 "새 프로젝트 만들기"를 누르면 EXPERIENCE 탭으로 넘어가면서
 * "새 프로젝트 작성 폼을 열어라"는 의도만 전달한다. displayOrder는 ExperienceManagement가
 * 자신이 이미 불러온 experiences 목록에서 직접 계산한다(셸은 그 목록을 갖고 있지 않음). */
export type PendingExperienceIntent = { type: 'PROJECT' } | null;

export function AdminDashboardShell() {
    const logout = useAuthStore((s) => s.logout);
    const [activeTab, setActiveTab] = useState<TabId>('STUDY');

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
            ];
            if (tabInUrl && validTabs.includes(tabInUrl)) {
                setActiveTab(tabInUrl);
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
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', newTab);
            url.searchParams.delete('studyId');
            url.searchParams.delete('expId');
            url.searchParams.delete('action');
            window.history.replaceState(null, '', url.pathname + url.search);
        }
    };

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [pendingExperienceIntent, setPendingExperienceIntent] =
        useState<PendingExperienceIntent>(null);

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
    const [viewportWidth, setViewportWidth] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth : 1280
    );

    useEffect(() => {
        const handleWindowResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleWindowResize);
        return () => window.removeEventListener('resize', handleWindowResize);
    }, []);

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

    // PRINT_TEMPLATES 탭으로 오면 미리보기 패널을 닫아 템플릿 목록에 집중하도록 한다.
    useEffect(() => {
        if (activeTab === 'PRINT_TEMPLATES' && isPreviewOpen) closePreviewPanel();
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
            <header className="sticky top-0 z-25 flex items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <h1 className="text-base font-black text-slate-900">관리자 대시보드</h1>
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
                        className="grid w-full grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:px-8"
                        style={{
                            gridTemplateColumns: isSidebarCollapsed
                                ? '64px minmax(0, 1fr)'
                                : '240px minmax(0, 1fr)',
                        }}
                    >
                        <aside
                            className={`relative min-w-0 lg:sticky lg:top-20 lg:self-start ${isSidebarCollapsed ? 'rounded-2xl border border-slate-200 bg-white px-2 py-3 shadow-sm' : ''}`}
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
                                className={`mb-3 flex h-8 items-center px-2 ${isSidebarCollapsed ? 'hidden' : ''}`}
                            >
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                    메뉴 목록
                                </p>
                            </div>

                            <nav aria-label="관리자 메뉴" className="space-y-5">
                                {ADMIN_MENU_GROUPS.map((group, groupIndex) => (
                                    <section
                                        key={group.label}
                                        className={
                                            groupIndex > 0 && isSidebarCollapsed
                                                ? 'border-t border-slate-200 pt-3'
                                                : ''
                                        }
                                    >
                                        <h2
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
                                                        onClick={() => handleTabChange(item.id)}
                                                        title={item.label}
                                                        aria-current={isActive ? 'page' : undefined}
                                                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${isSidebarCollapsed ? 'mx-auto h-11 w-11 justify-center gap-0 p-0' : ''} ${
                                                            isActive
                                                                ? 'bg-slate-900 text-white shadow-sm shadow-slate-800/10'
                                                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                                        }`}
                                                    >
                                                        <Icon className="h-4 w-4 shrink-0" />
                                                        <span
                                                            className={
                                                                isSidebarCollapsed
                                                                    ? 'hidden'
                                                                    : 'truncate'
                                                            }
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
                            {activeTab === 'ANALYTICS' && <AnalyticsPanel />}
                            {activeTab === 'DONATIONS' && <DonationsPanel />}
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
