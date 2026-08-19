'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import {
    ArrowLeft,
    ArrowUp,
    ChevronLeft,
    ChevronRight,
    Link as LinkIcon,
    ListOrdered,
} from 'lucide-react';
import { SidebarSection } from '@/components/common/SidebarSection';
import { useResponsiveSidebar } from '@/hooks/useResponsiveSidebar';
import { taxonomyApi } from '@/lib/api';
import type { Study } from '@/lib/api/types';
import { taxonomyBreadcrumbLabel, toTaxonomyNodeMap } from '@/lib/taxonomy';
import {
    markdownComponents,
    remarkKoreanEmphasis,
    remarkDisableIndentedCode,
    remarkCalloutToggle,
    remarkGithubAlerts,
    preprocessMarkdown,
    remarkUnindentListLines,
} from '@/lib/markdown';
import { extractToc } from '@/lib/toc';

type Props = {
    study: Study;
    basePath?: string;
};

export function StudyDetailClient({ study, basePath = '/study' }: Props) {
    const router = useRouter();
    const { data: allTaxonomyNodes } = useQuery({
        queryKey: ['taxonomyNodesPublic'],
        queryFn: taxonomyApi.publicList,
        staleTime: 5 * 60 * 1000,
    });
    const taxonomyNodesById = useMemo(
        () => toTaxonomyNodeMap(allTaxonomyNodes ?? []),
        [allTaxonomyNodes]
    );
    const [isNavCollapsed, setIsNavCollapsed] = useResponsiveSidebar(false);
    const [activeId, setActiveId] = useState<string>('');
    const [showScrollTop, setShowScrollTop] = useState(false);

    const toc = useMemo(() => extractToc(study.contentMarkdown), [study.contentMarkdown]);

    useEffect(() => {
        try {
            const STORAGE_KEY = 'recently_viewed_studies';
            const existingRaw = localStorage.getItem(STORAGE_KEY);
            let items: Array<{
                slug: string;
                title: string;
                categoryName: string;
                viewedAt: number;
            }> = existingRaw ? JSON.parse(existingRaw) : [];

            // Remove duplicate if already exists
            items = items.filter((item) => item.slug !== study.slug);

            // Add to beginning
            items.unshift({
                slug: study.slug,
                title: study.title,
                categoryName: study.taxonomyNodes.map((node) => node.name).join(', '),
                viewedAt: Date.now(),
            });

            // Limit to 10 items max
            if (items.length > 10) {
                items = items.slice(0, 10);
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {
            // Ignore localStorage errors (e.g. incognito)
        }
    }, [study.slug, study.title, study.taxonomyNodes]);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 40);

            if (toc.length === 0) return;
            const scrollPosition = window.scrollY + 120;
            for (let i = toc.length - 1; i >= 0; i--) {
                const item = toc[i];
                const el = document.getElementById(item.id);
                if (el && el.offsetTop <= scrollPosition) {
                    setActiveId(item.id);
                    break;
                }
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [toc]);

    const scrollToHeading = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            setActiveId(id);
        }
    };

    const hasRelated =
        study.experiences.length > 0 ||
        study.experienceDetails.length > 0 ||
        study.relatedStudies.length > 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"
                >
                    <ArrowLeft className="h-4 w-4" /> 이전 화면으로
                </button>
            </div>

            <div
                className={`grid grid-cols-[minmax(0,1fr)_52px] gap-4 items-start relative transition-[grid-template-columns] duration-300 pb-4 sm:gap-6 ${
                    isNavCollapsed
                        ? 'min-[900px]:grid-cols-[minmax(0,1fr)_52px]'
                        : 'min-[900px]:grid-cols-[minmax(0,1fr)_220px] min-[1200px]:grid-cols-[minmax(0,1fr)_240px]'
                }`}
            >
                <div className="min-w-0 space-y-8">
                    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
                        <div className="mb-8 border-b border-slate-100 pb-6">
                            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                                <span className="rounded-full bg-blue-600 px-3 py-1 font-black text-white">
                                    {study.section}
                                </span>
                                {study.taxonomyNodes.map((node) => (
                                    <span
                                        key={node.id}
                                        className="rounded-full bg-slate-100 px-3 py-1 text-slate-800"
                                    >
                                        {taxonomyBreadcrumbLabel(node, taxonomyNodesById)}
                                    </span>
                                ))}
                                <span className="font-mono">{study.learnedAt}</span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                                {study.title}
                            </h1>
                            <p className="mt-4 text-sm leading-relaxed text-slate-500 sm:text-base">
                                {study.summary}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-1.5">
                                {study.tags.map((tag) => (
                                    <span
                                        key={tag.id}
                                        className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700"
                                    >
                                        #{tag.name}
                                    </span>
                                ))}
                                {study.skills.map((skill) => (
                                    <span
                                        key={skill.id}
                                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600"
                                    >
                                        {skill.name}
                                    </span>
                                ))}
                            </div>

                            {/* Applied ExperienceDetails Banner */}
                            {study.experienceDetails && study.experienceDetails.length > 0 && (
                                <div className="mt-6 rounded-md border border-blue-100 bg-blue-50/60 p-4 space-y-2">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                                        이 기술 공부가 적용된 실무 성과 (Experience Detail)
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {study.experienceDetails.map((detail) => (
                                            <Link
                                                key={detail.id}
                                                href={
                                                    detail.experienceId
                                                        ? `/experience/${detail.experienceId}/experience-detail/${detail.id}`
                                                        : `/experience-detail/${detail.id}`
                                                }
                                                className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-950 transition hover:border-blue-400 hover:bg-blue-50 shadow-2xs"
                                            >
                                                {detail.experienceTitle && (
                                                    <span className="text-blue-600 font-extrabold font-mono">
                                                        [{detail.experienceTitle}]
                                                    </span>
                                                )}
                                                <span>{detail.content}</span>
                                                <ChevronRight className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="markdown-body text-sm leading-relaxed text-slate-700 sm:text-base">
                            <ReactMarkdown
                                remarkPlugins={[
                                    remarkGfm,
                                    remarkBreaks,
                                    remarkMath,
                                    remarkKoreanEmphasis,
                                    remarkDisableIndentedCode,
                                    remarkCalloutToggle,
                                    remarkGithubAlerts,
                                    remarkUnindentListLines,
                                ]}
                                rehypePlugins={[rehypeRaw, rehypeKatex]}
                                components={markdownComponents}
                            >
                                {preprocessMarkdown(study.contentMarkdown)}
                            </ReactMarkdown>
                        </div>
                    </article>

                    {/* 본문 기준 오른쪽 하단 위로 가기 버튼 (sticky, 0px 레이아웃 공간 점유) */}
                    {showScrollTop && (
                        <div className="sticky bottom-6 z-30 !mt-0 flex h-0 justify-end overflow-visible pointer-events-none">
                            <button
                                type="button"
                                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                className="pointer-events-auto -translate-y-[calc(100%+0.75rem)] flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 print:hidden"
                                title="본문 맨 위로 스크롤"
                                aria-label="본문 맨 위로 스크롤"
                            >
                                <ArrowUp className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>

                <aside
                    className={`block w-full sticky top-[89px] self-start transition-all duration-300 min-[900px]:pr-3 ${
                        isNavCollapsed ? 'min-[900px]:w-[76px]' : 'min-[900px]:w-[272px]'
                    }`}
                >
                    <div className="relative rounded-lg border border-slate-200/80 bg-white shadow-sm overflow-visible max-h-[calc(100vh-113px)] flex flex-col">
                        <button
                            type="button"
                            onClick={() => setIsNavCollapsed((collapsed) => !collapsed)}
                            className={`z-30 hidden items-center justify-center border border-slate-200 bg-white text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 min-[900px]:flex ${
                                isNavCollapsed
                                    ? 'relative mx-auto mt-2 h-8 w-8 shrink-0 rounded-full shadow-xs'
                                    : 'absolute -right-[11px] top-6 !m-0 h-10 w-5 rounded-r-lg border-l-0 bg-white/95 shadow-[3px_1px_6px_-3px_rgba(15,23,42,0.35)]'
                            }`}
                            title={isNavCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
                            aria-label={isNavCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
                            aria-expanded={!isNavCollapsed}
                        >
                            {isNavCollapsed ? (
                                <ChevronLeft className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </button>

                        <div
                            className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col ${
                                isNavCollapsed
                                    ? 'min-[900px]:gap-3 min-[900px]:p-1.5'
                                    : 'min-[900px]:gap-3 min-[900px]:px-4 min-[900px]:pt-4 min-[900px]:pb-2'
                            }`}
                        >
                            {/* Table of Contents (목차) */}
                            {toc.length > 0 && (
                                <SidebarSection
                                    title="목차"
                                    icon={ListOrdered}
                                    badge={toc.length}
                                    isNavCollapsed={isNavCollapsed}
                                    onExpandSidebar={() => setIsNavCollapsed(false)}
                                >
                                    <nav className="max-h-[360px] overflow-y-auto overflow-x-hidden space-y-0.5 pr-1 text-xs scroll-smooth custom-scrollbar">
                                        {toc.map((item) => {
                                            const isActive = activeId === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => scrollToHeading(item.id)}
                                                    className={`group relative flex w-full items-center text-left transition-all duration-150 rounded-md px-2.5 py-1 ${
                                                        item.level === 1
                                                            ? 'font-bold text-slate-800'
                                                            : item.level === 2
                                                              ? 'pl-5 font-medium text-slate-600'
                                                              : 'pl-7 text-slate-500'
                                                    } ${
                                                        isActive
                                                            ? 'bg-blue-50/90 text-blue-700 font-extrabold shadow-2xs'
                                                            : 'hover:bg-slate-100/70 hover:text-slate-900'
                                                    }`}
                                                >
                                                    {isActive && (
                                                        <span className="absolute left-1 top-1/2 -translate-y-1/2 h-3.5 w-1 rounded-full bg-blue-600 shadow-2xs" />
                                                    )}
                                                    <span className="line-clamp-2 leading-snug">
                                                        {item.text}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </nav>
                                    <hr className="mt-3 border-slate-100 shrink-0" />
                                </SidebarSection>
                            )}

                            {/* 연결 항목 (Related Items) */}
                            <SidebarSection
                                title="연결 항목"
                                icon={LinkIcon}
                                badge={study.experiences.length}
                                description="이 학습과 연관된 이력 정보입니다."
                                isNavCollapsed={isNavCollapsed}
                                onExpandSidebar={() => setIsNavCollapsed(false)}
                            >
                                {study.experiences.length > 0 && (
                                    <div>
                                        <h4 className="mb-1 text-[11px] font-black uppercase tracking-wider text-slate-400">
                                            관련 프로젝트·경력
                                        </h4>
                                        <div className="space-y-1.5 pl-0.5">
                                            {study.experiences.map((experience) => (
                                                <Link
                                                    key={experience.id}
                                                    href={`/experience/${experience.id}`}
                                                    className="flex w-full items-start gap-1.5 text-left text-xs leading-normal text-slate-600 hover:text-slate-950 group"
                                                >
                                                    <span className="shrink-0 rounded-md bg-slate-100 px-1 py-0.5 font-mono text-[10px] font-bold text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-700">
                                                        {experience.type}
                                                    </span>
                                                    <span className="font-semibold group-hover:text-slate-950">
                                                        {experience.title}
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {study.experienceDetails.length > 0 && (
                                    <div>
                                        <h4 className="mb-1 text-[11px] font-black uppercase tracking-wider text-slate-400">
                                            관련 경력 항목
                                        </h4>
                                        <div className="space-y-1.5 pl-0.5">
                                            {study.experienceDetails.map((detail) => (
                                                <Link
                                                    key={detail.id}
                                                    href={
                                                        detail.experienceId
                                                            ? `/experience/${detail.experienceId}/experience-detail/${detail.id}`
                                                            : `/experience-detail/${detail.id}`
                                                    }
                                                    className="flex w-full items-start gap-1.5 text-left text-xs font-semibold leading-normal text-slate-600 hover:text-slate-950 group"
                                                >
                                                    <span className="shrink-0 font-bold text-slate-400 group-hover:text-blue-600">
                                                        ›
                                                    </span>
                                                    <span>{detail.content}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {study.relatedStudies.length > 0 && (
                                    <div className="space-y-3">
                                        {(
                                            [
                                                ['PREREQUISITE', '선수 학습'],
                                                ['FOLLOW_UP', '다음 글'],
                                                ['RELATED', '관련 글'],
                                            ] as const
                                        ).map(([type, label]) => {
                                            const items = study.relatedStudies.filter((related) =>
                                                type === 'RELATED'
                                                    ? related.type === 'RELATED' ||
                                                      related.type === 'APPLIED_TO'
                                                    : related.type === type
                                            );
                                            if (items.length === 0) return null;
                                            return (
                                                <div key={type}>
                                                    <h4 className="mb-1 text-[11px] font-black uppercase tracking-wider text-slate-400">
                                                        {label}
                                                    </h4>
                                                    <div className="space-y-1.5 pl-0.5">
                                                        {items.map((related) => (
                                                            <Link
                                                                key={`${related.id}-${related.type}`}
                                                                href={`${basePath}/${encodeURIComponent(related.slug)}`}
                                                                className="flex w-full items-start gap-1.5 text-left text-xs font-semibold leading-normal text-slate-600 hover:text-blue-600 group"
                                                            >
                                                                <span className="shrink-0 font-bold text-slate-400 group-hover:text-blue-600">
                                                                    ▪
                                                                </span>
                                                                <span>{related.title}</span>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {!hasRelated && (
                                    <p className="text-xs font-bold italic text-slate-400">
                                        연결된 이력 항목이 없습니다.
                                    </p>
                                )}
                            </SidebarSection>

                            <div
                                className={`flex flex-col items-center gap-2 py-1 shrink-0 ${
                                    isNavCollapsed ? 'min-[900px]:flex' : 'min-[900px]:hidden'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    title="이전 화면으로"
                                    aria-label="이전 화면으로"
                                    className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-slate-300 hover:text-slate-900"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </button>
                            </div>

                            {/* 무조건 하단 고정 영역 (Sticky Bottom) */}
                            <div className="shrink-0 p-3 min-[900px]:px-4 border-t border-slate-100 bg-white rounded-b-lg">
                                <button
                                    type="button"
                                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                    className={`grid place-items-center border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-xs font-extrabold text-slate-600 hover:text-slate-900 transition-all shadow-2xs group ${
                                        isNavCollapsed
                                            ? 'h-9 w-9 mx-auto rounded-full'
                                            : 'h-9 w-full rounded-md min-[900px]:flex min-[900px]:items-center min-[900px]:justify-center min-[900px]:gap-1.5'
                                    }`}
                                    title="위로 가기"
                                    aria-label="위로 가기"
                                >
                                    <ArrowUp className="h-4 w-4 shrink-0" />
                                    <span
                                        className={`hidden ${isNavCollapsed ? '' : 'min-[900px]:inline'}`}
                                    >
                                        위로 가기
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
