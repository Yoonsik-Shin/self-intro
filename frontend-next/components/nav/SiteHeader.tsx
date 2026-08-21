'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft,
    BookOpen,
    Briefcase,
    Building2,
    ChevronDown,
    ChevronRight,
    Eye,
    Home,
    LogIn,
    LogOut,
    Menu,
    Printer,
    CreditCard,
    ShieldCheck,
    User,
    UserPlus,
    X,
} from 'lucide-react';
import { visitorApi } from '@/lib/api';
import { ORGANIZATION_EXAMPLE_HREF, PLATFORM_EXAMPLE_WORKSPACE_HREF } from '@/lib/exampleWorkspace';
import { usePrintStore } from '@/store/usePrintStore';
import { useAuthStore } from '@/store/useAuthStore';

type NavPage = {
    href: string;
    label: string;
    shortLabel: string;
    icon: typeof Home;
    exact?: boolean;
};

function isActivePage(pathname: string, href: string, exact = false): boolean {
    if (exact) return pathname.replace(/\/$/, '') === href.replace(/\/$/, '');
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
}

function platformExampleSessionKey(workspaceSlug: string): string {
    return `self-intro:platform-example:${workspaceSlug}`;
}

export function SiteHeader() {
    const pathname = usePathname();
    const workspaceMatch = pathname.match(/^\/workspace\/([^/]+)(?:\/|$)/);
    const workspaceSlug = workspaceMatch?.[1] ? decodeURIComponent(workspaceMatch[1]) : undefined;
    const workspaceBase = workspaceSlug ? `/workspace/${workspaceSlug}` : null;
    const isWorkspacePublicArea =
        workspaceBase !== null && !pathname.includes('/admin') && !pathname.includes('/manage');
    const isPlatformArea = !isWorkspacePublicArea;
    const pages: NavPage[] = isWorkspacePublicArea
        ? [
              {
                  href: workspaceBase!,
                  label: '프로필',
                  shortLabel: '프로필',
                  icon: User,
                  exact: true,
              },
              {
                  href: `${workspaceBase!}/experience`,
                  label: '경험',
                  shortLabel: '경험',
                  icon: Briefcase,
                  exact: false,
              },
              {
                  href: `${workspaceBase!}/study`,
                  label: '학습',
                  shortLabel: '학습',
                  icon: BookOpen,
                  exact: false,
              },
          ]
        : [
              { href: '/', label: '서비스 소개', shortLabel: '서비스 소개', icon: Home },
              {
                  href: '/architecture/demo',
                  label: '기능 체험',
                  shortLabel: '기능 체험',
                  icon: Eye,
              },
              {
                  href: PLATFORM_EXAMPLE_WORKSPACE_HREF,
                  label: '개인 예시',
                  shortLabel: '개인 예시',
                  icon: User,
              },
              {
                  href: ORGANIZATION_EXAMPLE_HREF,
                  label: '기업 예시',
                  shortLabel: '기업 예시',
                  icon: Building2,
              },
              {
                  href: '/pricing',
                  label: '요금제',
                  shortLabel: '요금제',
                  icon: CreditCard,
              },
          ];
    const [isPageMenuOpen, setIsPageMenuOpen] = useState(false);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const [showPlatformReturn, setShowPlatformReturn] = useState(false);
    const accountMenuRef = useRef<HTMLDivElement>(null);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isCheckingSession = useAuthStore((state) => state.isChecking);
    const checkSession = useAuthStore((state) => state.checkSession);
    const logout = useAuthStore((state) => state.logout);
    const me = useAuthStore((state) => state.me);
    const [isPreviewMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return new URLSearchParams(window.location.search).get('preview') === '1';
        }
        return false;
    });
    const setPrintModalOpen = usePrintStore((s) => s.setPrintModalOpen);

    useEffect(() => {
        if (isCheckingSession) {
            void checkSession();
        }
    }, [checkSession, isCheckingSession]);

    useEffect(() => {
        if (!isAccountMenuOpen) return;

        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!accountMenuRef.current?.contains(event.target as Node)) {
                setIsAccountMenuOpen(false);
            }
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsAccountMenuOpen(false);
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isAccountMenuOpen]);

    useEffect(() => {
        let shouldShow = false;

        if (isWorkspacePublicArea && workspaceSlug) {
            const sessionKey = platformExampleSessionKey(workspaceSlug);
            const url = new URL(window.location.href);
            const enteredFromPlatform = url.searchParams.get('from') === 'platform';

            try {
                if (enteredFromPlatform) {
                    window.sessionStorage.setItem(sessionKey, '1');
                }
                shouldShow =
                    enteredFromPlatform || window.sessionStorage.getItem(sessionKey) === '1';
            } catch {
                shouldShow = enteredFromPlatform;
            }

            if (enteredFromPlatform) {
                url.searchParams.delete('from');
                window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
            }
        }

        const timer = window.setTimeout(() => setShowPlatformReturn(shouldShow), 0);
        return () => window.clearTimeout(timer);
    }, [isWorkspacePublicArea, workspaceSlug]);

    const leavePlatformExample = () => {
        if (workspaceSlug) {
            try {
                window.sessionStorage.removeItem(platformExampleSessionKey(workspaceSlug));
            } catch {
                // sessionStorage가 차단되어도 서비스 소개 이동 자체는 계속 진행한다.
            }
        }
        setIsPageMenuOpen(false);
    };

    const currentWorkspace = me?.workspaces[0];
    const workspaceActionHref = currentWorkspace
        ? `/workspace/${encodeURIComponent(currentWorkspace.slug)}/manage`
        : '/onboarding/workspace';
    const workspaceActionLabel = currentWorkspace ? '내 워크스페이스' : '워크스페이스 만들기';
    const isPlatformOperator = Boolean(
        me?.platformRoles.includes('PLATFORM_OWNER') ||
        me?.platformRoles.includes('PLATFORM_OPERATOR')
    );
    const workspaceMembership = workspaceSlug
        ? me?.workspaces.find((workspace) => workspace.slug === workspaceSlug)
        : undefined;
    const canManageCurrentWorkspace = Boolean(
        workspaceMembership && ['OWNER', 'ADMIN', 'EDITOR'].includes(workspaceMembership.role)
    );

    // 관리자 라이브 프리뷰(iframe) 안에서는 방문 기록을 남기지 않는다 — 실제 방문자 통계를 왜곡하지 않기 위함.
    const { data: visitorSummary } = useQuery({
        queryKey: ['visitor', 'record', workspaceSlug ?? 'platform'],
        queryFn: () =>
            workspaceSlug ? visitorApi.workspaceRecord(workspaceSlug) : visitorApi.record(),
        enabled: !isPreviewMode && isWorkspacePublicArea,
        staleTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
    });

    const isIntro = workspaceBase !== null && pathname.replace(/\/$/, '') === workspaceBase;

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white py-2 print:hidden">
            <div className="mx-auto flex h-12 max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-6">
                    <Link
                        href={workspaceBase ?? '/'}
                        className="flex shrink-0 items-center text-left transition hover:opacity-90 focus:outline-none"
                        title={
                            isWorkspacePublicArea ? 'Workspace 홈으로 이동' : '서비스 소개로 이동'
                        }
                        aria-label={
                            isWorkspacePublicArea ? 'Workspace 홈으로 이동' : '서비스 소개로 이동'
                        }
                    >
                        {isWorkspacePublicArea ? (
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-950 text-white">
                                <Briefcase className="h-4 w-4" />
                            </div>
                        ) : (
                            <span className="text-lg font-black tracking-[-0.03em] text-slate-950">
                                Self-Intro
                            </span>
                        )}
                    </Link>

                    <nav
                        aria-label="페이지 네비게이션"
                        className="hidden min-w-0 items-center gap-3 overflow-x-auto scrollbar-none sm:flex lg:gap-5"
                    >
                        {pages.map((page) => {
                            const Icon = page.icon;
                            const isActive = isActivePage(pathname, page.href, page.exact);
                            return (
                                <Link
                                    key={page.href}
                                    href={page.href}
                                    className={`relative inline-flex h-12 shrink-0 items-center gap-2 px-1 text-sm font-black transition-colors duration-200 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-center after:rounded-full after:bg-slate-900 after:transition-transform after:duration-200 ${
                                        isActive
                                            ? 'text-slate-950 after:scale-x-100'
                                            : 'text-slate-500 after:scale-x-0 hover:text-slate-900'
                                    }`}
                                    title={page.label}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="hidden min-[1100px]:inline">
                                        {page.shortLabel}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {/* 데스크톱 "Workspace 관리" 버튼은 계정 드롭다운의 "내 Workspace" 목록(현재
                        workspace는 "관리 화면 열기"로 안내)과 기능이 겹쳐서 여기서는 없앰 —
                        모바일 드로어 쪽은 그 드롭다운 자체가 안 보이므로 그대로 유지. */}
                    {isPlatformArea &&
                        !isCheckingSession &&
                        isAuthenticated &&
                        isPlatformOperator && (
                            <Link
                                href="/ops"
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                                title="플랫폼 운영"
                            >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span className="hidden min-[1100px]:inline">플랫폼 운영</span>
                            </Link>
                        )}
                    {!isCheckingSession && !isAuthenticated && (
                        <>
                            <Link
                                href="/login"
                                className="hidden h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex"
                                title="로그인"
                            >
                                <LogIn className="h-3.5 w-3.5" />
                                <span className="hidden min-[1100px]:inline">로그인</span>
                            </Link>
                            <Link
                                href="/signup"
                                className="hidden h-9 items-center justify-center gap-1.5 rounded-md bg-slate-950 px-3 text-sm font-black text-white transition hover:bg-slate-800 sm:inline-flex"
                                title="초대받아 가입하기"
                            >
                                <UserPlus className="h-3.5 w-3.5" />
                                <span className="hidden min-[1100px]:inline">
                                    초대받아 가입하기
                                </span>
                            </Link>
                        </>
                    )}
                    {isWorkspacePublicArea && showPlatformReturn && (
                        <Link
                            href="/"
                            onClick={leavePlatformExample}
                            className="hidden h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950 sm:inline-flex"
                            title="서비스 소개로 돌아가기"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">서비스 소개로 돌아가기</span>
                            <span className="lg:hidden">돌아가기</span>
                        </Link>
                    )}
                    {visitorSummary && canManageCurrentWorkspace && (
                        <span className="inline-flex items-center gap-1.5 px-1 text-xs font-semibold text-slate-400">
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">
                                오늘 {visitorSummary.todayVisitors.toLocaleString()} ·{' '}
                            </span>
                            누적 {visitorSummary.totalVisitors.toLocaleString()}
                        </span>
                    )}

                    {isIntro && (
                        <button
                            onClick={() => setPrintModalOpen(true)}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-slate-950 px-3 text-sm font-bold text-white transition hover:bg-slate-800"
                            title="PDF 인쇄"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            <span className="hidden min-[1100px]:inline">PDF 인쇄</span>
                        </button>
                    )}
                    {!isCheckingSession && isAuthenticated && (
                        <div className="relative ml-1 hidden sm:block" ref={accountMenuRef}>
                            <button
                                type="button"
                                onClick={() => setIsAccountMenuOpen((open) => !open)}
                                className={`flex items-center gap-2 rounded-lg border border-slate-900 bg-slate-900 px-2.5 py-1.5 text-left text-white transition ${
                                    isAccountMenuOpen ? 'bg-slate-800' : 'hover:bg-slate-800'
                                }`}
                                title="현재 로그인 계정 확인"
                                aria-haspopup="menu"
                                aria-expanded={isAccountMenuOpen}
                            >
                                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/15 text-[10px] font-black text-white">
                                    {(me?.nickname || me?.username || '?')
                                        .slice(0, 1)
                                        .toUpperCase()}
                                </span>
                                <span className="hidden min-w-0 min-[1100px]:block">
                                    <span className="block max-w-32 truncate text-xs font-black">
                                        {me?.nickname || '로그인 계정'}
                                    </span>
                                    <span className="block max-w-40 truncate text-[10px] text-white/60">
                                        계정 정보
                                    </span>
                                </span>
                                <ChevronDown
                                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {isAccountMenuOpen && (
                                <section
                                    role="menu"
                                    className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-white shadow-2xl shadow-slate-950/30 ring-1 ring-black/5"
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

                                    <dl className="space-y-3 border-b border-slate-800 p-4 text-xs">
                                        <div className="flex items-start justify-between gap-4">
                                            <dt className="font-bold text-slate-400">
                                                Workspace 역할
                                            </dt>
                                            <dd className="font-black text-white">
                                                {workspaceMembership?.role ?? '없음'}
                                            </dd>
                                        </div>
                                        <div className="flex items-start justify-between gap-4">
                                            <dt className="font-bold text-slate-400">
                                                플랫폼 역할
                                            </dt>
                                            <dd className="max-w-40 text-right font-black text-white">
                                                {me?.platformRoles.length
                                                    ? me.platformRoles.join(', ')
                                                    : '일반 계정'}
                                            </dd>
                                        </div>
                                    </dl>

                                    <div className="border-b border-slate-800 p-3">
                                        <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                            내 Workspace
                                        </p>
                                        <div className="max-h-64 space-y-1 overflow-y-auto">
                                            {me?.workspaces.length ? (
                                                me.workspaces.map((workspace) => {
                                                    const canManage = [
                                                        'OWNER',
                                                        'ADMIN',
                                                        'EDITOR',
                                                    ].includes(workspace.role);
                                                    const href = canManage
                                                        ? `/workspace/${encodeURIComponent(workspace.slug)}/manage`
                                                        : `/workspace/${encodeURIComponent(workspace.slug)}`;
                                                    const isCurrent =
                                                        workspace.slug === workspaceSlug;
                                                    return (
                                                        <Link
                                                            key={workspace.workspaceId}
                                                            href={href}
                                                            role="menuitem"
                                                            onClick={() =>
                                                                setIsAccountMenuOpen(false)
                                                            }
                                                            className="group flex items-center gap-3 rounded-md border border-slate-800 bg-slate-800/50 px-3 py-3 transition hover:border-slate-700 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                                                        >
                                                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-900 text-slate-300">
                                                                <Briefcase className="h-4 w-4" />
                                                            </span>
                                                            <span className="min-w-0 flex-1">
                                                                <span className="block break-words text-sm font-black leading-snug text-white">
                                                                    {workspace.name}
                                                                </span>
                                                                <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-bold text-slate-400">
                                                                    <span>{workspace.role}</span>
                                                                    <span aria-hidden="true">
                                                                        ·
                                                                    </span>
                                                                    <span className="text-slate-300">
                                                                        {isCurrent
                                                                            ? '현재 열람 중'
                                                                            : canManage
                                                                              ? '관리 화면 열기'
                                                                              : '공개 페이지 열기'}
                                                                    </span>
                                                                </span>
                                                            </span>
                                                            <span className="ml-auto grid h-8 w-8 shrink-0 place-items-center text-slate-500 transition group-hover:text-white">
                                                                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                                            </span>
                                                        </Link>
                                                    );
                                                })
                                            ) : (
                                                <Link
                                                    href="/onboarding/workspace"
                                                    role="menuitem"
                                                    onClick={() => setIsAccountMenuOpen(false)}
                                                    className="group flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-800/50 px-3 py-3 text-sm font-black text-white transition hover:border-slate-700 hover:bg-slate-800"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Briefcase className="h-4 w-4" />첫
                                                        Workspace 만들기
                                                    </span>
                                                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>

                                    <Link
                                        href="/account"
                                        role="menuitem"
                                        onClick={() => setIsAccountMenuOpen(false)}
                                        className="flex w-full items-center justify-center gap-2 border-b border-slate-800 px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-slate-800 hover:text-white"
                                    >
                                        <User className="h-4 w-4" />
                                        계정 설정
                                    </Link>

                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => void logout()}
                                        className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-black text-red-400 transition hover:bg-red-950/50 hover:text-red-300"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        로그아웃
                                    </button>
                                </section>
                            )}
                        </div>
                    )}
                    <button
                        onClick={() => setIsPageMenuOpen((open) => !open)}
                        className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 sm:hidden"
                        title="페이지 메뉴"
                        aria-label="페이지 메뉴"
                        aria-expanded={isPageMenuOpen}
                    >
                        {isPageMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {isPageMenuOpen && (
                <div className="absolute left-0 right-0 top-full z-40 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-slate-200 bg-white px-3 py-2 shadow-md sm:hidden">
                    <nav
                        aria-label="모바일 페이지 네비게이션"
                        className="mx-auto flex max-w-[1500px] flex-col gap-1"
                    >
                        {pages.map((page) => {
                            const Icon = page.icon;
                            const isActive = isActivePage(pathname, page.href, page.exact);
                            return (
                                <Link
                                    key={page.href}
                                    href={page.href}
                                    onClick={() => setIsPageMenuOpen(false)}
                                    className={`relative flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-black transition-colors duration-200 after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-slate-900 ${
                                        isActive
                                            ? 'text-slate-950 after:opacity-100'
                                            : 'text-slate-600 after:opacity-0 hover:text-slate-900'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{page.label}</span>
                                </Link>
                            );
                        })}
                        {isWorkspacePublicArea && showPlatformReturn && (
                            <div className="mt-1 border-t border-slate-100 pt-3">
                                <Link
                                    href="/"
                                    onClick={leavePlatformExample}
                                    className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-black text-slate-800"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    서비스 소개로 돌아가기
                                </Link>
                            </div>
                        )}
                        {isWorkspacePublicArea &&
                            !isCheckingSession &&
                            isAuthenticated &&
                            canManageCurrentWorkspace && (
                                <div className="mt-1 border-t border-slate-100 pt-3">
                                    <Link
                                        href={`${workspaceBase}/manage`}
                                        onClick={() => setIsPageMenuOpen(false)}
                                        className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-black text-slate-700"
                                    >
                                        <ShieldCheck className="h-4 w-4" />
                                        Workspace 관리
                                    </Link>
                                </div>
                            )}
                        {isPlatformArea && (
                            <div className="mt-1 grid gap-2 border-t border-slate-100 pt-3">
                                {isCheckingSession ? (
                                    <div className="h-10 animate-pulse rounded-md bg-slate-100" />
                                ) : isAuthenticated ? (
                                    <>
                                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left">
                                            <p className="text-xs font-bold text-slate-400">
                                                로그인 계정
                                            </p>
                                            <p className="mt-1 truncate text-sm font-black text-slate-900">
                                                {me?.nickname || me?.username}
                                            </p>
                                            <p className="truncate text-xs text-slate-500">
                                                {me?.username}
                                            </p>
                                        </div>
                                        {isPlatformOperator && (
                                            <Link
                                                href="/ops"
                                                onClick={() => setIsPageMenuOpen(false)}
                                                className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-black text-slate-700"
                                            >
                                                <ShieldCheck className="h-4 w-4" />
                                                플랫폼 운영
                                            </Link>
                                        )}
                                        <Link
                                            href={workspaceActionHref}
                                            onClick={() => setIsPageMenuOpen(false)}
                                            className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2.5 text-sm font-black text-white"
                                        >
                                            <Briefcase className="h-4 w-4" />
                                            {workspaceActionLabel}
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsPageMenuOpen(false);
                                                void logout();
                                            }}
                                            className="flex w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-black text-red-700"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            로그아웃
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            href="/login"
                                            onClick={() => setIsPageMenuOpen(false)}
                                            className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-black text-slate-700"
                                        >
                                            <LogIn className="h-4 w-4" />
                                            로그인
                                        </Link>
                                        <Link
                                            href="/signup"
                                            onClick={() => setIsPageMenuOpen(false)}
                                            className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2.5 text-sm font-black text-white"
                                        >
                                            <UserPlus className="h-4 w-4" />
                                            초대받아 가입하기
                                        </Link>
                                        <p className="text-center text-[11px] font-semibold text-slate-400">
                                            현재 초대받은 사용자만 가입할 수 있습니다.
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                        {!isPlatformArea && !isCheckingSession && isAuthenticated && (
                            <div className="mt-1 grid gap-2 border-t border-slate-100 pt-3">
                                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left">
                                    <p className="text-xs font-bold text-slate-400">로그인 계정</p>
                                    <p className="mt-1 truncate text-sm font-black text-slate-900">
                                        {me?.nickname || me?.username}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                        {me?.username}
                                    </p>
                                </div>
                                <div className="grid gap-1 rounded-md border border-slate-200 bg-white p-2">
                                    <p className="px-1 pb-1 text-xs font-bold text-slate-400">
                                        내 Workspace
                                    </p>
                                    {me?.workspaces.map((workspace) => {
                                        const canManage = ['OWNER', 'ADMIN', 'EDITOR'].includes(
                                            workspace.role
                                        );
                                        return (
                                            <Link
                                                key={workspace.workspaceId}
                                                href={
                                                    canManage
                                                        ? `/workspace/${encodeURIComponent(workspace.slug)}/manage`
                                                        : `/workspace/${encodeURIComponent(workspace.slug)}`
                                                }
                                                onClick={() => setIsPageMenuOpen(false)}
                                                className="group flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-black text-slate-800 transition hover:border-slate-400 hover:bg-white hover:shadow-sm"
                                            >
                                                <span className="truncate">{workspace.name}</span>
                                                <span className="flex shrink-0 items-center gap-1 text-[10px] text-slate-400 group-hover:text-slate-700">
                                                    {workspace.role}
                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                                <Link
                                    href="/account"
                                    onClick={() => setIsPageMenuOpen(false)}
                                    className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-black text-slate-700"
                                >
                                    <User className="h-4 w-4" />
                                    계정 설정
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPageMenuOpen(false);
                                        void logout();
                                    }}
                                    className="flex w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-black text-red-700"
                                >
                                    <LogOut className="h-4 w-4" />
                                    로그아웃
                                </button>
                            </div>
                        )}
                        {!isPlatformArea && !isCheckingSession && !isAuthenticated && (
                            <div className="mt-1 grid gap-2 border-t border-slate-100 pt-3">
                                <Link
                                    href="/login"
                                    onClick={() => setIsPageMenuOpen(false)}
                                    className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-black text-slate-700"
                                >
                                    <LogIn className="h-4 w-4" />
                                    로그인
                                </Link>
                                <Link
                                    href="/signup"
                                    onClick={() => setIsPageMenuOpen(false)}
                                    className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2.5 text-sm font-black text-white"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    초대받아 가입하기
                                </Link>
                                <p className="text-center text-[11px] font-semibold text-slate-400">
                                    현재 초대받은 사용자만 가입할 수 있습니다.
                                </p>
                            </div>
                        )}
                        {isIntro && (
                            <button
                                onClick={() => {
                                    setIsPageMenuOpen(false);
                                    setPrintModalOpen(true);
                                }}
                                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-black text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-slate-950"
                            >
                                <Printer className="h-4 w-4" />
                                <span>PDF 인쇄</span>
                            </button>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}
