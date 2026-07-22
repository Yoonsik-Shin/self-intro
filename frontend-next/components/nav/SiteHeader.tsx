'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Briefcase, Eye, Home, Menu, Printer, Terminal, X } from 'lucide-react';
import { visitorApi } from '@/lib/api';
import { usePrintStore } from '@/store/usePrintStore';

const pages = [
    { href: '/', label: '메인페이지', shortLabel: '메인', icon: Home },
    { href: '/experience', label: '경험', shortLabel: '경험', icon: Briefcase },
    { href: '/study', label: '공부 정리', shortLabel: '공부 정리', icon: BookOpen },
    {
        href: '/architecture',
        label: '시스템 아키텍처',
        shortLabel: '시스템 아키텍처',
        icon: Terminal,
    },
];

function isActivePage(pathname: string, href: string): boolean {
    if (href === '/') return pathname === '/';
    if (href === '/experience') return pathname.startsWith('/experience');
    return pathname.startsWith(href);
}

export function SiteHeader() {
    const pathname = usePathname();
    const [isPageMenuOpen, setIsPageMenuOpen] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const setPrintModalOpen = usePrintStore((s) => s.setPrintModalOpen);

    useEffect(() => {
        setIsPreviewMode(new URLSearchParams(window.location.search).get('preview') === '1');
    }, []);

    // 관리자 라이브 프리뷰(iframe) 안에서는 방문 기록을 남기지 않는다 — 실제 방문자 통계를 왜곡하지 않기 위함.
    const { data: visitorSummary } = useQuery({
        queryKey: ['visitor', 'record'],
        queryFn: visitorApi.record,
        enabled: !isPreviewMode,
        staleTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
    });

    const isIntro = pathname === '/';

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 py-2 shadow-sm backdrop-blur-xl print:hidden">
            <div className="mx-auto flex h-12 max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-6">
                    <Link
                        href="/"
                        className="flex shrink-0 items-center text-left focus:outline-none hover:opacity-90 transition"
                        title="소개 페이지로 이동"
                    >
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-slate-900 to-slate-950 text-sm font-black text-white shadow-md shadow-slate-800/20">
                            YS
                        </div>
                    </Link>

                    <nav
                        aria-label="페이지 네비게이션"
                        className="hidden min-w-0 items-center gap-5 overflow-x-auto scrollbar-none min-[900px]:flex"
                    >
                        {pages.map((page) => {
                            const Icon = page.icon;
                            const isActive = isActivePage(pathname, page.href);
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
                                    <span>{page.shortLabel}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {visitorSummary && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-500 sm:px-2.5">
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
                    <nav
                        aria-label="모바일 페이지 네비게이션"
                        className="mx-auto flex max-w-[1500px] flex-col gap-1"
                    >
                        {pages.map((page) => {
                            const Icon = page.icon;
                            const isActive = isActivePage(pathname, page.href);
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
                        {isIntro && (
                            <button
                                onClick={() => {
                                    setIsPageMenuOpen(false);
                                    setPrintModalOpen(true);
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
    );
}
