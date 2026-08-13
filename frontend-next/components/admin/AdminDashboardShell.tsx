'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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
    LayoutDashboard,
    UserPlus,
    Users,
    ChevronDown,
    CircleHelp,
    ShieldAlert,
    ShieldCheck,
    Database,
} from 'lucide-react';
import { bffApi, skillApi, systemStatusApi } from '@/lib/api';
import type { Experience, IntroductionResponse, Skill } from '@/lib/api/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useAdminPreviewStore } from '@/store/useAdminPreviewStore';
import { AiModelFloatingWidget } from './AiModelFloatingWidget';
import { WorkspacePublicationPanel } from './publication/WorkspacePublicationPanel';
import { WorkspaceSlugSettings } from './workspace/WorkspaceSlugSettings';
import { WorkspaceLifecycleSettings } from './workspace/WorkspaceLifecycleSettings';
import { WorkspaceMemberManagement } from './workspace/WorkspaceMemberManagement';

const StudyManagement = dynamic(() =>
    import('./study/StudyManagement').then((module) => module.StudyManagement)
);
const WorkspaceLearningResourceManagement = dynamic(() =>
    import('./learning-resource/WorkspaceLearningResourceManagement').then(
        (module) => module.WorkspaceLearningResourceManagement
    )
);
const TaxonomyManagement = dynamic(() =>
    import('./taxonomy/TaxonomyManagement').then((module) => module.TaxonomyManagement)
);
const SkillsManagement = dynamic(() =>
    import('./skills/SkillsManagement').then((module) => module.SkillsManagement)
);
const ExperienceManagement = dynamic(() =>
    import('./experience/ExperienceManagement').then((module) => module.ExperienceManagement)
);
const ProfileManagement = dynamic(() =>
    import('./profile/ProfileManagement').then((module) => module.ProfileManagement)
);
const PublicPageCompositionManagement = dynamic(() =>
    import('./publication/PublicPageCompositionManagement').then(
        (module) => module.PublicPageCompositionManagement
    )
);
const CompetencyManagement = dynamic(() =>
    import('./competency/CompetencyManagement').then((module) => module.CompetencyManagement)
);
const CoreProjectManagement = dynamic(() =>
    import('./core-project/CoreProjectManagement').then((module) => module.CoreProjectManagement)
);
const ArchitectureManagement = dynamic(() =>
    import('./architecture/ArchitectureManagement').then((module) => module.ArchitectureManagement)
);
const PrintTemplateManagement = dynamic(() =>
    import('./print-template/PrintTemplateManagement').then(
        (module) => module.PrintTemplateManagement
    )
);
const PortfolioManagement = dynamic(() =>
    import('./portfolio/PortfolioManagement').then((module) => module.PortfolioManagement)
);
const AnalyticsPanel = dynamic(() =>
    import('./analytics/AnalyticsPanel').then((module) => module.AnalyticsPanel)
);
const DonationsPanel = dynamic(() =>
    import('./donations/DonationsPanel').then((module) => module.DonationsPanel)
);
const JobCatalogPermissionOperations = dynamic(() =>
    import('./job-application/JobCatalogPermissionOperations').then(
        (module) => module.JobCatalogPermissionOperations
    )
);
const WorkspaceJobApplicationManagement = dynamic(() =>
    import('./job-application/WorkspaceJobApplicationManagement').then(
        (module) => module.WorkspaceJobApplicationManagement
    )
);
const StudyPlanManagement = dynamic(() =>
    import('./study-plan/StudyPlanManagement').then((module) => module.StudyPlanManagement)
);
const ExperienceTreeManagement = dynamic(() =>
    import('./experience-tree/ExperienceTreeManagement').then(
        (module) => module.ExperienceTreeManagement
    )
);
const InvitationOperationsPanel = dynamic(() =>
    import('@/app/ops/page').then((module) => module.default)
);
const WorkspacePurgeOperationsPanel = dynamic(() =>
    import('./ops/WorkspacePurgeOperationsPanel').then(
        (module) => module.WorkspacePurgeOperationsPanel
    )
);
const VectorReconciliationPanel = dynamic(() =>
    import('./ops/VectorReconciliationPanel').then((module) => module.VectorReconciliationPanel)
);
const SupportAccessOperationsPanel = dynamic(() =>
    import('./ops/SupportAccessOperationsPanel').then(
        (module) => module.SupportAccessOperationsPanel
    )
);
const WorkspaceSupportAccessPanel = dynamic(() =>
    import('./security/WorkspaceSupportAccessPanel').then(
        (module) => module.WorkspaceSupportAccessPanel
    )
);

const PREVIEW_MIN_WIDTH = 420;
const PREVIEW_MAX_WIDTH = 960;
const PREVIEW_DEFAULT_WIDTH = 760;
// 이 뷰포트 너비 아래에서는 도킹 대신 미리보기가 화면 전체를 차지한다(모바일 풀스크린처럼).
const PREVIEW_STACK_BREAKPOINT = 640;
// 미리보기를 도킹했을 때 사이드바 + 최소한의 admin 콘텐츠 영역을 위해 남겨두는 폭.
const ADMIN_CONTENT_RESERVE_WIDTH = 460;

type TabId =
    | 'WORKSPACE_HOME'
    | 'PUBLICATION'
    | 'PUBLIC_PROFILE'
    | 'PUBLIC_EXPERIENCE'
    | 'PUBLIC_STUDY'
    | 'MEMBERS'
    | 'INVITATIONS'
    | 'PURGE_JOBS'
    | 'VECTOR_RECONCILIATION'
    | 'SUPPORT_ACCESS_OPERATIONS'
    | 'WORKSPACE_SUPPORT_ACCESS'
    | 'ANALYTICS'
    | 'WORKSPACE_ANALYTICS'
    | 'DONATIONS'
    | 'STUDY'
    | 'EXPERIENCE_TREE'
    | 'PROFILE'
    | 'SKILLS'
    | 'COMPETENCIES'
    | 'EXPERIENCE'
    | 'CORE_PROJECTS'
    | 'ARCHITECTURE'
    | 'PRINT_TEMPLATES'
    | 'PORTFOLIO'
    | 'JOB_APPLICATIONS'
    | 'JOB_CATALOG_OPERATIONS'
    | 'LEARNING_RESOURCES'
    | 'STUDY_PLAN'
    | 'TAXONOMY';

type AdminMenuGroup = {
    label: string;
    description: string;
    scope: 'WORKSPACE' | 'SOURCE' | 'PUBLICATION' | 'OUTPUT' | 'PLATFORM';
    requiresPlatformOperator?: boolean;
    items: Array<{
        id: TabId;
        label: string;
        description: string;
        icon: typeof BookOpen;
        workspaceAdminOnly?: boolean;
        workspaceOwnerOnly?: boolean;
        operatorSection?: '사용자·서비스 운영' | '공통 데이터 운영' | '시스템 정합성';
    }>;
};

const ADMIN_MENU_GROUPS: AdminMenuGroup[] = [
    {
        label: 'Workspace 설정',
        description: '현재 Workspace의 기본 정보, 멤버, 발행 상태를 관리합니다.',
        scope: 'WORKSPACE',
        items: [
            {
                id: 'WORKSPACE_HOME',
                label: '기본 설정',
                description: 'Workspace 이름, 공개 주소, 폐쇄 등 기본 설정을 관리합니다.',
                icon: LayoutDashboard,
            },
            {
                id: 'MEMBERS',
                label: '멤버·권한',
                description: 'Workspace에 참여하는 멤버와 역할을 관리합니다.',
                icon: Users,
                workspaceAdminOnly: true,
            },
            {
                id: 'WORKSPACE_ANALYTICS',
                label: '공개 페이지 통계',
                description: '현재 Workspace 공개 페이지의 방문 현황을 확인합니다.',
                icon: BarChart3,
                workspaceAdminOnly: true,
            },
            {
                id: 'WORKSPACE_SUPPORT_ACCESS',
                label: '지원 접근 승인',
                description: '플랫폼 지원 담당자의 제한된 진단 요청을 승인·거절·철회합니다.',
                icon: ShieldCheck,
                workspaceOwnerOnly: true,
            },
        ],
    },
    {
        label: '내 기록',
        description: 'Workspace에 저장되며 저장만으로 공개 페이지에 노출되지 않습니다.',
        scope: 'SOURCE',
        items: [
            {
                id: 'PROFILE',
                label: '프로필 원본',
                description: '이름, 소개, 연락처 등 사실 데이터를 기록합니다.',
                icon: User,
            },
            {
                id: 'EXPERIENCE',
                label: '경력·프로젝트',
                description: '경력, 프로젝트, 교육, 자격 등 검증 가능한 원본을 기록합니다.',
                icon: Briefcase,
            },
            {
                id: 'STUDY',
                label: '학습 기록',
                description: '공부한 내용과 기술적 판단 근거를 기록합니다.',
                icon: BookOpen,
            },
            {
                id: 'SKILLS',
                label: '기술 스택',
                description: '공통 기술 목록에서 현재 Workspace가 사용하는 기술을 구성합니다.',
                icon: Cpu,
            },
            {
                id: 'COMPETENCIES',
                label: '역량 원본',
                description: '경험에서 도출한 역량과 근거를 기록합니다.',
                icon: Sparkles,
            },
            {
                id: 'PORTFOLIO',
                label: '포트폴리오 원본',
                description: '프로젝트 사례 문서의 원본 내용을 작성합니다.',
                icon: FolderGit2,
            },
            {
                id: 'EXPERIENCE_TREE',
                label: '경험 관계 원본',
                description: '학습과 경험 사이의 관계와 판단 근거를 기록합니다.',
                icon: GitBranch,
            },
            {
                id: 'LEARNING_RESOURCES',
                label: '학습 자료',
                description: '공통 자료 목록에서 학습 상태와 활용 여부를 관리합니다.',
                icon: GraduationCap,
            },
            {
                id: 'STUDY_PLAN',
                label: 'AI 학습 계획',
                description: '현재 Workspace의 목표와 기록을 바탕으로 학습 계획을 관리합니다.',
                icon: CalendarCheck,
            },
        ],
    },
    {
        label: '공개 페이지',
        description: '원본을 선별·연결하며 발행 전까지 방문자에게 반영되지 않습니다.',
        scope: 'PUBLICATION',
        items: [
            {
                id: 'PUBLICATION',
                label: '공개본·버전',
                description:
                    '현재 Workspace의 공개 페이지 snapshot을 발행하고 버전 이력을 관리합니다.',
                icon: Radio,
            },
            {
                id: 'PUBLIC_PROFILE',
                label: '프로필 구성',
                description: '공개할 프로필 필드, 기술과 대표 역량을 선택합니다.',
                icon: User,
            },
            {
                id: 'PUBLIC_EXPERIENCE',
                label: '경험 구성',
                description: '공개 경험, 세부 성과, 타임라인과 대표 프로젝트를 선택합니다.',
                icon: Briefcase,
            },
            {
                id: 'PUBLIC_STUDY',
                label: '학습 구성',
                description: '공개 학습 기록과 방문자용 카테고리를 선택합니다.',
                icon: BookOpen,
            },
        ],
    },
    {
        label: '지원·출력',
        description: '채용 지원과 문서 출력에 사용되며 공개 메인페이지와는 별개입니다.',
        scope: 'OUTPUT',
        items: [
            {
                id: 'JOB_APPLICATIONS',
                label: '지원 현황',
                description: '채용 공고별 지원 상태와 맞춤 자료를 관리합니다.',
                icon: ClipboardList,
            },
            {
                id: 'PRINT_TEMPLATES',
                label: '이력서·PDF 템플릿',
                description: '지원 목적별 이력서와 PDF 출력 구성을 관리합니다.',
                icon: Printer,
            },
        ],
    },
    {
        label: '플랫폼 운영자 전용',
        description: 'Workspace 콘텐츠가 아닌 플랫폼 공통 데이터와 운영 기능입니다.',
        scope: 'PLATFORM',
        requiresPlatformOperator: true,
        items: [
            {
                id: 'INVITATIONS',
                label: '비공개 베타 초대',
                description: '플랫폼 가입 초대의 발급과 수명주기를 관리합니다.',
                icon: UserPlus,
                operatorSection: '사용자·서비스 운영',
            },
            {
                id: 'SUPPORT_ACCESS_OPERATIONS',
                label: '고객 지원 접근',
                description: 'Workspace 소유자에게 제한된 진단 접근을 요청하고 이력을 확인합니다.',
                icon: ShieldCheck,
                operatorSection: '사용자·서비스 운영',
            },
            {
                id: 'ANALYTICS',
                label: '플랫폼 전체 방문 통계',
                description: '전체 공개 Workspace의 방문 현황을 확인합니다.',
                icon: BarChart3,
                operatorSection: '사용자·서비스 운영',
            },
            {
                id: 'DONATIONS',
                label: '후원 내역',
                description: '플랫폼 단위 후원 내역을 확인합니다.',
                icon: Heart,
                operatorSection: '사용자·서비스 운영',
            },
            {
                id: 'JOB_CATALOG_OPERATIONS',
                label: '공고 공유 심사',
                description: '재노출 권한 근거를 검토하고 공통 공고 공개 여부를 결정합니다.',
                icon: ClipboardList,
                operatorSection: '공통 데이터 운영',
            },
            {
                id: 'TAXONOMY',
                label: '공통 카테고리 원본',
                description: '모든 Workspace가 참조하는 분류 체계 원본을 관리합니다.',
                icon: ListTree,
                operatorSection: '공통 데이터 운영',
            },
            {
                id: 'ARCHITECTURE',
                label: '제품 시스템 아키텍처',
                description: '플랫폼 제품 설명에 사용하는 시스템 아키텍처를 관리합니다.',
                icon: Terminal,
                operatorSection: '공통 데이터 운영',
            },
            {
                id: 'PURGE_JOBS',
                label: 'Workspace 삭제 점검',
                description: 'Workspace 삭제 작업과 잔여 데이터 상태를 점검합니다.',
                icon: ShieldAlert,
                operatorSection: '시스템 정합성',
            },
            {
                id: 'VECTOR_RECONCILIATION',
                label: 'Vector 정합성 점검',
                description: '원본이 없는 파생 Vector와 namespace를 점검합니다.',
                icon: Database,
                operatorSection: '시스템 정합성',
            },
        ],
    },
];

/** CORE_PROJECTS 탭에서 "새 프로젝트 만들기"를 누르면 EXPERIENCE 탭으로 넘어가면서
 * "새 프로젝트 작성 폼을 열어라"는 의도만 전달한다. displayOrder는 ExperienceManagement가
 * 자신이 이미 불러온 experiences 목록에서 직접 계산한다(셸은 그 목록을 갖고 있지 않음). */
export type PendingExperienceIntent = { type: 'PROJECT' } | null;

export function AdminDashboardShell({ workspaceSlug }: { workspaceSlug: string }) {
    const logout = useAuthStore((s) => s.logout);
    const me = useAuthStore((s) => s.me);
    // 롤링 배포 중 구버전 API가 새 workspace/platformRoles 필드를 아직 내려주지 않아도
    // 관리 화면 자체가 쓰러지지 않게 한다. 권한은 없는 것으로 처리해 fail-closed 한다.
    const currentWorkspace = workspaceSlug
        ? me?.workspaces?.find((workspace) => workspace.slug === workspaceSlug)
        : me?.workspaces?.[0];
    const publicWorkspaceHref = currentWorkspace
        ? `/workspace/${encodeURIComponent(currentWorkspace.slug)}`
        : '/';
    const isPlatformOperator = Boolean(
        me?.platformRoles?.includes('PLATFORM_OWNER') ||
        me?.platformRoles?.includes('PLATFORM_OPERATOR')
    );
    const canViewWorkspaceAnalytics = Boolean(
        currentWorkspace && ['OWNER', 'ADMIN'].includes(currentWorkspace.role)
    );
    const canEditWorkspace = Boolean(
        currentWorkspace && ['OWNER', 'ADMIN', 'EDITOR'].includes(currentWorkspace.role)
    );
    const isWorkspaceOwner = currentWorkspace?.role === 'OWNER';
    const visibleMenuGroups = useMemo(
        () =>
            ADMIN_MENU_GROUPS.filter(
                (group) => !group.requiresPlatformOperator || isPlatformOperator
            )
                .map((group) => ({
                    ...group,
                    items: group.items.filter(
                        (item) =>
                            (!item.workspaceAdminOnly || canViewWorkspaceAnalytics) &&
                            (!item.workspaceOwnerOnly || isWorkspaceOwner)
                    ),
                }))
                .filter((group) => group.items.length > 0),
        [canViewWorkspaceAnalytics, isPlatformOperator, isWorkspaceOwner]
    );
    const allowedTabIds = useMemo(
        () => visibleMenuGroups.flatMap((group) => group.items.map((item) => item.id)),
        [visibleMenuGroups]
    );
    const [activeTab, setActiveTab] = useState<TabId>('WORKSPACE_HOME');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncTabFromUrl = () => {
            const params = new URLSearchParams(window.location.search);
            const tabInUrl = params.get('tab') as TabId | null;
            const validTabs: TabId[] = [
                'WORKSPACE_HOME',
                'PUBLICATION',
                'PUBLIC_PROFILE',
                'PUBLIC_EXPERIENCE',
                'PUBLIC_STUDY',
                'MEMBERS',
                'INVITATIONS',
                'PURGE_JOBS',
                'VECTOR_RECONCILIATION',
                'SUPPORT_ACCESS_OPERATIONS',
                'WORKSPACE_SUPPORT_ACCESS',
                'ANALYTICS',
                'WORKSPACE_ANALYTICS',
                'DONATIONS',
                'STUDY',
                'EXPERIENCE_TREE',
                'PROFILE',
                'SKILLS',
                'COMPETENCIES',
                'EXPERIENCE',
                'CORE_PROJECTS',
                'ARCHITECTURE',
                'PRINT_TEMPLATES',
                'PORTFOLIO',
                'JOB_APPLICATIONS',
                'JOB_CATALOG_OPERATIONS',
                'LEARNING_RESOURCES',
                'STUDY_PLAN',
                'TAXONOMY',
            ];
            if (tabInUrl && validTabs.includes(tabInUrl) && allowedTabIds.includes(tabInUrl)) {
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
    }, [allowedTabIds]);

    const handleTabChange = (newTab: TabId) => {
        if (!allowedTabIds.includes(newTab)) return;
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
        queryKey: ['workspace', workspaceSlug, 'introduction', 'preview'],
        queryFn: () => bffApi.getWorkspaceIntroduction(workspaceSlug),
        enabled: Boolean(workspaceSlug),
    });
    const { data: skillsList } = useQuery({
        queryKey: ['workspace', workspaceSlug, 'skills', 'preview'],
        queryFn: () => skillApi.workspaceList(workspaceSlug),
        enabled: Boolean(workspaceSlug),
    });
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
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const accountMenuRef = useRef<HTMLDivElement>(null);
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
        if (!isStatusPanelOpen && !isAccountMenuOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (statusPanelRef.current && !statusPanelRef.current.contains(event.target as Node)) {
                setIsStatusPanelOpen(false);
            }
            if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
                setIsAccountMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isAccountMenuOpen, isStatusPanelOpen]);

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
            case 'WORKSPACE_HOME':
            case 'PUBLICATION':
                return { path: publicWorkspaceHref };
            case 'PUBLIC_PROFILE':
                return { path: publicWorkspaceHref, section: 'intro-profile' };
            case 'PUBLIC_EXPERIENCE':
                return { path: `${publicWorkspaceHref}/experience` };
            case 'PUBLIC_STUDY':
                return { path: `${publicWorkspaceHref}/study` };
            case 'STUDY':
                return { path: '/study' };
            case 'EXPERIENCE_TREE':
                return { path: '/experience-tree' };
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
            case 'WORKSPACE_ANALYTICS':
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
                activeTab === 'JOB_CATALOG_OPERATIONS' ||
                activeTab === 'LEARNING_RESOURCES' ||
                activeTab === 'STUDY_PLAN' ||
                activeTab === 'TAXONOMY' ||
                activeTab === 'INVITATIONS' ||
                activeTab === 'PURGE_JOBS' ||
                activeTab === 'VECTOR_RECONCILIATION' ||
                activeTab === 'SUPPORT_ACCESS_OPERATIONS' ||
                activeTab === 'WORKSPACE_SUPPORT_ACCESS') &&
            isPreviewOpen
        ) {
            // 탭 전환에 맞춰 외부 iframe 상태를 정리한다.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            closePreviewPanel();
        }
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
                    <div>
                        <h1 className="text-base font-black text-slate-900">
                            {currentWorkspace?.name ?? '워크스페이스'}
                        </h1>
                        <p className="text-[11px] font-bold text-slate-400">
                            {currentWorkspace?.role ?? 'MEMBER'} · 경력 관리 워크스페이스
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isPlatformOperator && <AiModelFloatingWidget />}
                    {canEditWorkspace && (
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
                    )}
                    {isPlatformOperator && (
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
                    )}
                    {isPlatformOperator && (
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
                    )}
                    {isPlatformOperator && (
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
                    )}
                    {isPlatformOperator && (
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
                                <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-slate-700 bg-slate-950 p-3 text-white shadow-2xl shadow-slate-950/30 ring-1 ring-black/5">
                                    <div className="mb-2 flex items-center justify-between px-1">
                                        <span className="text-xs font-black text-slate-300">
                                            외부 서비스 상태
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => refetchExternalStatuses()}
                                            title="새로고침"
                                            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
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
                                        <p className="px-1 py-3 text-center text-xs text-red-400">
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
                                                            className="flex items-center justify-between rounded-lg px-2 py-1.5 transition hover:bg-slate-800"
                                                        >
                                                            <span className="flex items-center gap-2 text-sm font-bold text-slate-100">
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
                    )}
                    {isPlatformOperator && (
                        <Link
                            href="/"
                            title="플랫폼 메인페이지로 이동합니다"
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                        >
                            <Home className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">메인페이지</span>
                        </Link>
                    )}
                    <div className="relative" ref={accountMenuRef}>
                        <button
                            type="button"
                            onClick={() => setIsAccountMenuOpen((open) => !open)}
                            aria-expanded={isAccountMenuOpen}
                            aria-haspopup="menu"
                            title="현재 로그인 계정 확인"
                            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition ${
                                isAccountMenuOpen
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                            }`}
                        >
                            <span
                                className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-[10px] font-black ${
                                    isAccountMenuOpen
                                        ? 'bg-white/15 text-white'
                                        : 'bg-slate-100 text-slate-700'
                                }`}
                            >
                                {(me?.nickname || me?.username || '?').slice(0, 1).toUpperCase()}
                            </span>
                            <span className="hidden min-w-0 lg:block">
                                <span className="block max-w-32 truncate text-xs font-black">
                                    {me?.nickname || '로그인 계정'}
                                </span>
                                <span
                                    className={`block max-w-40 truncate text-[10px] ${isAccountMenuOpen ? 'text-white/65' : 'text-slate-400'}`}
                                >
                                    계정 정보
                                </span>
                            </span>
                            <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {isAccountMenuOpen && (
                            <section
                                role="menu"
                                className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-white shadow-2xl shadow-slate-950/30 ring-1 ring-black/5"
                            >
                                <div className="border-b border-slate-800 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                                        현재 로그인 계정
                                    </p>
                                    <p className="mt-2 truncate text-sm font-black text-white">
                                        {me?.nickname || '이름 없음'}
                                    </p>
                                    <p className="mt-0.5 break-all text-xs text-slate-300">
                                        {me?.username}
                                    </p>
                                </div>
                                <dl className="space-y-3 p-4 text-xs">
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="font-bold text-slate-400">Workspace 역할</dt>
                                        <dd className="font-black text-white">
                                            {currentWorkspace?.role ?? '없음'}
                                        </dd>
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="font-bold text-slate-400">플랫폼 역할</dt>
                                        <dd className="max-w-40 text-right font-black text-white">
                                            {me?.platformRoles?.length
                                                ? me.platformRoles.join(', ')
                                                : '일반 계정'}
                                        </dd>
                                    </div>
                                </dl>
                                <Link
                                    href="/account"
                                    role="menuitem"
                                    onClick={() => setIsAccountMenuOpen(false)}
                                    className="flex w-full items-center justify-center gap-2 border-t border-slate-800 px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-slate-800 hover:text-white"
                                >
                                    <User className="h-4 w-4" />
                                    계정 설정
                                </Link>
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => logout()}
                                    className="flex w-full items-center justify-center gap-2 border-t border-slate-800 px-4 py-3 text-sm font-black text-red-400 transition hover:bg-red-950/50 hover:text-red-300"
                                >
                                    <LogOut className="h-4 w-4" />
                                    로그아웃
                                </button>
                            </section>
                        )}
                    </div>
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
                            className={`sticky top-20 isolate self-start max-h-[calc(100vh-6rem)] min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain transition-all duration-300 ease-in-out [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isSidebarCollapsed ? 'rounded-2xl border border-slate-200 bg-white shadow-sm' : ''}`}
                        >
                            <div
                                className={
                                    isSidebarCollapsed
                                        ? 'sticky top-0 z-30 mb-3 flex h-14 items-center justify-center rounded-t-[15px] border-b border-slate-100 bg-white px-2'
                                        : undefined
                                }
                            >
                                <button
                                    type="button"
                                    onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
                                    title={isSidebarCollapsed ? '메뉴 펼치기' : '메뉴 접기'}
                                    aria-expanded={!isSidebarCollapsed}
                                    className={`z-20 flex items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 ${
                                        isSidebarCollapsed
                                            ? 'h-9 w-9 shrink-0 bg-slate-50 shadow-sm hover:bg-slate-100'
                                            : 'absolute right-1 top-0 !m-0 h-8 w-8 hover:bg-slate-100'
                                    }`}
                                >
                                    {isSidebarCollapsed ? (
                                        <ChevronRight className="h-4 w-4" />
                                    ) : (
                                        <ChevronLeft className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            <nav
                                aria-label="Workspace 관리 메뉴"
                                className={`space-y-5 ${isSidebarCollapsed ? 'px-2 pb-3' : ''}`}
                            >
                                {visibleMenuGroups.map((group, groupIndex) => (
                                    <section
                                        key={group.label}
                                        className={`transition-all duration-300 ease-in-out ${
                                            group.requiresPlatformOperator
                                                ? isSidebarCollapsed
                                                    ? 'border-t-2 border-slate-700 pt-3'
                                                    : 'rounded-xl border border-slate-800 bg-slate-950 p-2 text-white'
                                                : groupIndex > 0
                                                  ? isSidebarCollapsed
                                                      ? 'border-t border-slate-200 pt-3'
                                                      : 'border-t border-slate-200 pt-4'
                                                  : ''
                                        }`}
                                    >
                                        <div
                                            className={`relative mb-2 flex items-center gap-1.5 overflow-visible px-3 transition-all duration-300 ease-in-out ${
                                                isSidebarCollapsed
                                                    ? 'max-h-0 opacity-0'
                                                    : groupIndex === 0
                                                      ? 'h-8 max-h-8 pr-9 opacity-100'
                                                      : 'h-6 max-h-6 opacity-100'
                                            }`}
                                        >
                                            <h2
                                                className={`min-w-0 truncate text-sm font-black tracking-[0.02em] ${group.requiresPlatformOperator ? 'text-white' : 'text-slate-600'}`}
                                            >
                                                {group.label}
                                            </h2>
                                            <span className="group/help shrink-0">
                                                <button
                                                    type="button"
                                                    aria-label={`${group.label} 설명`}
                                                    className={`grid h-6 w-6 place-items-center rounded-full transition ${
                                                        group.requiresPlatformOperator
                                                            ? 'text-slate-400 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white'
                                                            : 'text-slate-400 hover:bg-slate-200 hover:text-slate-800 focus:bg-slate-200 focus:text-slate-800'
                                                    }`}
                                                >
                                                    <CircleHelp className="h-4 w-4" />
                                                </button>
                                                <span
                                                    role="tooltip"
                                                    className={`pointer-events-none absolute right-3 top-9 z-50 w-52 translate-y-1 rounded-xl px-3 py-2.5 text-left text-[11px] font-semibold leading-5 opacity-0 shadow-2xl transition group-hover/help:translate-y-0 group-hover/help:opacity-100 group-focus-within/help:translate-y-0 group-focus-within/help:opacity-100 ${
                                                        group.requiresPlatformOperator
                                                            ? 'border border-slate-200 bg-white text-slate-800 shadow-slate-950/45 ring-1 ring-black/5'
                                                            : 'border border-slate-600 bg-slate-800 text-slate-100 shadow-slate-950/40 ring-1 ring-white/10'
                                                    }`}
                                                >
                                                    {group.description}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="space-y-1.5">
                                            {group.items.map((item, itemIndex) => {
                                                const Icon = item.icon;
                                                const isActive = activeTab === item.id;
                                                const previousOperatorSection =
                                                    itemIndex > 0
                                                        ? group.items[itemIndex - 1].operatorSection
                                                        : undefined;
                                                const startsOperatorSection =
                                                    Boolean(item.operatorSection) &&
                                                    item.operatorSection !==
                                                        previousOperatorSection;
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className={
                                                            startsOperatorSection && itemIndex > 0
                                                                ? isSidebarCollapsed
                                                                    ? 'border-t border-slate-300 pt-2'
                                                                    : 'border-t border-slate-800 pt-2'
                                                                : undefined
                                                        }
                                                    >
                                                        {startsOperatorSection && (
                                                            <p
                                                                className={`mb-1 overflow-hidden px-3 text-[9px] font-black tracking-[0.1em] text-slate-500 transition-all duration-300 ${
                                                                    isSidebarCollapsed
                                                                        ? 'max-h-0 opacity-0'
                                                                        : 'max-h-5 opacity-100'
                                                                }`}
                                                            >
                                                                {item.operatorSection}
                                                            </p>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTabChange(item.id)}
                                                            title={`${item.label} · ${item.description}`}
                                                            aria-current={
                                                                isActive ? 'page' : undefined
                                                            }
                                                            className={`flex items-center rounded-xl text-sm font-bold transition-all duration-300 ease-in-out ${
                                                                isSidebarCollapsed
                                                                    ? 'mx-auto h-11 w-11 justify-center'
                                                                    : 'w-full gap-2.5 px-3 py-2.5 text-left'
                                                            } ${
                                                                isActive
                                                                    ? group.requiresPlatformOperator
                                                                        ? isSidebarCollapsed
                                                                            ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/15'
                                                                            : 'bg-white text-slate-950 shadow-sm'
                                                                        : 'bg-slate-900 text-white shadow-sm shadow-slate-800/10'
                                                                    : group.requiresPlatformOperator
                                                                      ? isSidebarCollapsed
                                                                          ? 'text-indigo-700 hover:bg-indigo-50 hover:text-indigo-950'
                                                                          : 'text-slate-200 hover:bg-white/10 hover:text-white'
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
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ))}
                            </nav>
                        </aside>

                        <section className="min-w-0 space-y-6">
                            {activeTab === 'WORKSPACE_HOME' && (
                                <>
                                    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                                        <span className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
                                            Workspace Management
                                        </span>
                                        <h2 className="mt-3 text-2xl font-black text-slate-950">
                                            {currentWorkspace?.name ?? 'Workspace'}
                                        </h2>
                                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                                            Workspace 이름과 공개 주소, 멤버가 접근할 수 있는
                                            수명주기를 관리합니다. 공개 버전과 발행 이력은 공개
                                            페이지의 공개본·버전에서 다룹니다.
                                        </p>
                                        <dl className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-5 text-sm sm:grid-cols-2">
                                            <div>
                                                <dt className="font-bold text-slate-500">
                                                    Workspace 역할
                                                </dt>
                                                <dd className="mt-1 font-black text-slate-900">
                                                    {currentWorkspace?.role ?? 'MEMBER'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="font-bold text-slate-500">
                                                    공개 주소
                                                </dt>
                                                <dd className="mt-1 truncate font-mono text-xs text-slate-700">
                                                    {currentWorkspace?.slug ?? '-'}
                                                </dd>
                                            </div>
                                        </dl>
                                    </section>
                                    {currentWorkspace && (
                                        <>
                                            <WorkspaceSlugSettings
                                                workspaceSlug={currentWorkspace.slug}
                                                role={currentWorkspace.role}
                                            />
                                            <WorkspaceLifecycleSettings
                                                workspaceSlug={currentWorkspace.slug}
                                                workspaceName={currentWorkspace.name}
                                                role={currentWorkspace.role}
                                            />
                                        </>
                                    )}
                                </>
                            )}
                            {activeTab === 'PUBLICATION' && currentWorkspace && (
                                <WorkspacePublicationPanel
                                    workspaceSlug={currentWorkspace.slug}
                                    role={currentWorkspace.role}
                                />
                            )}
                            {activeTab === 'PUBLIC_PROFILE' && currentWorkspace && (
                                <PublicPageCompositionManagement
                                    workspaceSlug={currentWorkspace.slug}
                                    section="profile"
                                />
                            )}
                            {activeTab === 'PUBLIC_EXPERIENCE' && currentWorkspace && (
                                <PublicPageCompositionManagement
                                    workspaceSlug={currentWorkspace.slug}
                                    section="experience"
                                />
                            )}
                            {activeTab === 'PUBLIC_STUDY' && currentWorkspace && (
                                <PublicPageCompositionManagement
                                    workspaceSlug={currentWorkspace.slug}
                                    section="study"
                                />
                            )}
                            {activeTab === 'STUDY' && (
                                <StudyManagement workspaceSlug={workspaceSlug} enableWorkspaceAi />
                            )}
                            {activeTab === 'MEMBERS' && currentWorkspace && (
                                <WorkspaceMemberManagement
                                    workspaceSlug={currentWorkspace.slug}
                                    role={currentWorkspace.role}
                                />
                            )}
                            {activeTab === 'EXPERIENCE_TREE' && (
                                <ExperienceTreeManagement workspaceSlug={workspaceSlug} />
                            )}
                            {activeTab === 'SKILLS' && (
                                <SkillsManagement workspaceSlug={workspaceSlug} />
                            )}
                            {activeTab === 'EXPERIENCE' && (
                                <ExperienceManagement
                                    workspaceSlug={workspaceSlug}
                                    enableWorkspaceAi
                                    pendingIntent={pendingExperienceIntent}
                                    onConsumeIntent={() => setPendingExperienceIntent(null)}
                                />
                            )}
                            {activeTab === 'PROFILE' && (
                                <ProfileManagement workspaceSlug={workspaceSlug} />
                            )}
                            {activeTab === 'COMPETENCIES' && (
                                <CompetencyManagement
                                    workspaceSlug={workspaceSlug}
                                    enableWorkspaceAi
                                />
                            )}
                            {activeTab === 'CORE_PROJECTS' && (
                                <CoreProjectManagement
                                    workspaceSlug={workspaceSlug}
                                    onCreateProject={() => {
                                        setPendingExperienceIntent({ type: 'PROJECT' });
                                        setActiveTab('EXPERIENCE');
                                    }}
                                />
                            )}
                            {activeTab === 'ARCHITECTURE' && <ArchitectureManagement />}
                            {activeTab === 'PRINT_TEMPLATES' && (
                                <PrintTemplateManagement
                                    workspaceSlug={workspaceSlug}
                                    enablePlatformAi={false}
                                />
                            )}
                            {activeTab === 'PORTFOLIO' && (
                                <PortfolioManagement
                                    workspaceSlug={workspaceSlug}
                                    enablePlatformAi={false}
                                />
                            )}
                            {isPlatformOperator && activeTab === 'ANALYTICS' && <AnalyticsPanel />}
                            {canViewWorkspaceAnalytics && activeTab === 'WORKSPACE_ANALYTICS' && (
                                <AnalyticsPanel workspaceSlug={workspaceSlug} />
                            )}
                            {isPlatformOperator && activeTab === 'DONATIONS' && <DonationsPanel />}
                            {isPlatformOperator && activeTab === 'INVITATIONS' && (
                                <InvitationOperationsPanel />
                            )}
                            {isPlatformOperator && activeTab === 'PURGE_JOBS' && (
                                <WorkspacePurgeOperationsPanel />
                            )}
                            {isPlatformOperator && activeTab === 'VECTOR_RECONCILIATION' && (
                                <VectorReconciliationPanel />
                            )}
                            {isPlatformOperator && activeTab === 'SUPPORT_ACCESS_OPERATIONS' && (
                                <SupportAccessOperationsPanel />
                            )}
                            {isWorkspaceOwner && activeTab === 'WORKSPACE_SUPPORT_ACCESS' && (
                                <WorkspaceSupportAccessPanel workspaceSlug={workspaceSlug} />
                            )}
                            {activeTab === 'JOB_APPLICATIONS' && (
                                <WorkspaceJobApplicationManagement workspaceSlug={workspaceSlug} />
                            )}
                            {isPlatformOperator && activeTab === 'JOB_CATALOG_OPERATIONS' && (
                                <JobCatalogPermissionOperations />
                            )}
                            {activeTab === 'LEARNING_RESOURCES' && (
                                <WorkspaceLearningResourceManagement
                                    workspaceSlug={workspaceSlug}
                                />
                            )}
                            {activeTab === 'STUDY_PLAN' && (
                                <StudyPlanManagement workspaceSlug={workspaceSlug} />
                            )}
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
