'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import {
    ArrowLeft,
    ArrowUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ListOrdered,
} from 'lucide-react';
import type { Study } from '@/lib/api/types';
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
};

export function StudyDetailClient({ study }: Props) {
    const router = useRouter();
    const [isNavCollapsed, setIsNavCollapsed] = useState(false);
    const [activeId, setActiveId] = useState<string>('');
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isTocOpen, setIsTocOpen] = useState(true);
    const [isRelatedOpen, setIsRelatedOpen] = useState(true);

    const toc = useMemo(() => extractToc(study.contentMarkdown), [study.contentMarkdown]);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);

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
                className={`grid grid-cols-[minmax(0,1fr)_52px] gap-4 items-start relative transition-[grid-template-columns] duration-300 pb-12 sm:gap-6 ${
                    isNavCollapsed
                        ? 'min-[900px]:grid-cols-[minmax(0,1fr)_52px]'
                        : 'min-[900px]:grid-cols-[minmax(0,1fr)_240px]'
                }`}
            >
                <div className="min-w-0 space-y-8">
                    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
                        <div className="mb-8 border-b border-slate-100 pb-6">
                            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">
                                    {study.category.name}
                                </span>
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
                                <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-2">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                                        <span>💼</span> 이 기술 공부가 적용된 실무 성과 (Experience
                                        Detail)
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
                                                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-950 transition hover:border-blue-400 hover:bg-blue-50 shadow-2xs"
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
                </div>

                <aside className="block w-full sticky top-24 self-start max-h-[calc(100vh-7.5rem)]">
                    <div
                        className={`relative flex flex-col max-h-[calc(100vh-7.5rem)] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-md backdrop-blur-md min-[900px]:border-l-4 min-[900px]:border-l-slate-300 ${
                            isNavCollapsed
                                ? 'min-[900px]:gap-3 min-[900px]:p-2'
                                : 'min-[900px]:gap-3 min-[900px]:p-4'
                        }`}
                    >
                        <button
                            type="button"
                            onClick={() => setIsNavCollapsed((collapsed) => !collapsed)}
                            className={`z-20 hidden items-center justify-center border border-slate-200 bg-white text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 min-[900px]:flex ${
                                isNavCollapsed
                                    ? 'relative mx-auto h-8 w-8 shrink-0 rounded-full shadow-sm'
                                    : 'absolute -right-[11px] top-5 !m-0 h-10 w-5 rounded-r-lg border-l-0 bg-white/95 shadow-[3px_1px_6px_-3px_rgba(15,23,42,0.35)]'
                            }`}
                            title={isNavCollapsed ? '네비게이션 펼치기' : '네비게이션 접기'}
                            aria-label={isNavCollapsed ? '네비게이션 펼치기' : '네비게이션 접기'}
                            aria-expanded={!isNavCollapsed}
                        >
                            {isNavCollapsed ? (
                                <ChevronLeft className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </button>

                        {/* Table of Contents (목차) */}
                        {toc.length > 0 && (
                            <div
                                className={`hidden shrink-0 ${isNavCollapsed ? '' : 'min-[900px]:flex min-[900px]:flex-col'} ${
                                    isRelatedOpen ? 'flex-[3] min-h-0' : 'flex-1 min-h-0'
                                }`}
                            >
                                <div
                                    onClick={() => setIsTocOpen((prev) => !prev)}
                                    className="mb-2 flex items-center justify-between shrink-0 cursor-pointer select-none group"
                                    title={isTocOpen ? '목차 접기' : '목차 펼치기'}
                                >
                                    <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-800 group-hover:text-blue-600 transition-colors">
                                        <ChevronDown
                                            className={`h-3.5 w-3.5 text-blue-600 transition-transform duration-200 ${
                                                isTocOpen ? '' : '-rotate-90'
                                            }`}
                                        />
                                        <ListOrdered className="h-3.5 w-3.5 text-blue-600" />
                                        <span>목차</span>
                                    </h3>
                                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-600">
                                        {toc.length}
                                    </span>
                                </div>
                                {isTocOpen && (
                                    <nav
                                        className={`overflow-y-auto overflow-x-hidden space-y-0.5 pr-1 text-xs scroll-smooth custom-scrollbar ${
                                            isRelatedOpen
                                                ? 'max-h-[280px] min-[1200px]:max-h-[420px]'
                                                : 'flex-1 min-h-0 max-h-none'
                                        }`}
                                    >
                                        {toc.map((item) => {
                                            const isActive = activeId === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => scrollToHeading(item.id)}
                                                    className={`group flex w-full items-start text-left transition-all duration-150 rounded-md px-2 py-1 ${
                                                        item.level === 1
                                                            ? 'font-bold text-slate-800'
                                                            : item.level === 2
                                                              ? 'pl-3.5 font-medium text-slate-600'
                                                              : 'pl-6 text-slate-500'
                                                    } ${
                                                        isActive
                                                            ? 'bg-blue-50 text-blue-700 font-bold border-l-2 border-blue-600'
                                                            : 'hover:bg-slate-100/80 hover:text-slate-900'
                                                    }`}
                                                >
                                                    <span className="line-clamp-2 leading-relaxed">
                                                        {item.text}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </nav>
                                )}
                                <hr className="mt-3 border-slate-100 shrink-0" />
                            </div>
                        )}

                        {/* 연결 항목 (Related Items) Header */}
                        <div
                            onClick={() => setIsRelatedOpen((prev) => !prev)}
                            className={`hidden shrink-0 cursor-pointer select-none group ${
                                isNavCollapsed ? '' : 'min-[900px]:block'
                            }`}
                            title={isRelatedOpen ? '연결 항목 접기' : '연결 항목 펼치기'}
                        >
                            <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700 group-hover:text-slate-950 transition-colors">
                                <ChevronDown
                                    className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${
                                        isRelatedOpen ? '' : '-rotate-90'
                                    }`}
                                />
                                <span>연결 항목</span>
                            </h3>
                            <p className="mt-0.5 text-[11px] leading-tight text-slate-400 pl-5">
                                이 학습과 연관된 이력 정보입니다.
                            </p>
                        </div>

                        {/* 연결 항목 List (접기 및 개별 스크롤 적용) */}
                        {isRelatedOpen && (
                            <div
                                className={`hidden flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-3 pr-1 pt-1.5 custom-scrollbar ${
                                    isNavCollapsed ? '' : 'min-[900px]:block'
                                }`}
                            >
                                {study.experiences.length > 0 && (
                                    <div>
                                        <h4 className="mb-1 text-[11px] font-black uppercase text-slate-400">
                                            관련 프로젝트·경력
                                        </h4>
                                        <div className="space-y-1.5">
                                            {study.experiences.map((experience) => (
                                                <p
                                                    key={experience.id}
                                                    className="text-xs leading-normal text-slate-600"
                                                >
                                                    <span className="mr-1.5 rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] font-bold text-slate-400">
                                                        {experience.type}
                                                    </span>
                                                    {experience.title}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {study.experienceDetails.length > 0 && (
                                    <div>
                                        <h4 className="mb-1 text-[11px] font-black uppercase text-slate-400">
                                            관련 경력 항목
                                        </h4>
                                        <div className="space-y-1.5">
                                            {study.experienceDetails.map((detail) => (
                                                <Link
                                                    key={detail.id}
                                                    href={
                                                        detail.experienceId
                                                            ? `/experience/${detail.experienceId}/experience-detail/${detail.id}`
                                                            : `/experience-detail/${detail.id}`
                                                    }
                                                    className="flex w-full items-start gap-1 text-left text-xs font-semibold leading-normal text-slate-600 hover:text-slate-950"
                                                >
                                                    <span className="mt-0.5 shrink-0 font-bold text-slate-400">
                                                        ›
                                                    </span>
                                                    <span>{detail.content}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {study.relatedStudies.length > 0 && (
                                    <div>
                                        <h4 className="mb-1 text-[11px] font-black uppercase text-slate-400">
                                            관련 Study
                                        </h4>
                                        <div className="space-y-1.5">
                                            {study.relatedStudies.map((related) => (
                                                <Link
                                                    key={`${related.id}-${related.type}`}
                                                    href={`/study/${encodeURIComponent(related.slug)}`}
                                                    className="flex w-full items-start gap-1 text-left text-xs font-semibold leading-normal text-slate-600 hover:text-slate-900"
                                                >
                                                    <span className="mt-0.5 shrink-0 font-bold text-slate-400">
                                                        ▪
                                                    </span>
                                                    <span>{related.title}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {!hasRelated && (
                                    <p className="text-xs font-bold italic text-slate-400">
                                        연결된 이력 항목이 없습니다.
                                    </p>
                                )}
                            </div>
                        )}

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
                    </div>
                </aside>
            </div>

            {/* Floating scroll to top button stacked above donation widget */}
            {showScrollTop && (
                <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-20 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-md backdrop-blur-md transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 print:hidden"
                    title="페이지 맨 위로 스크롤"
                    aria-label="페이지 맨 위로 스크롤"
                >
                    <ArrowUp className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
