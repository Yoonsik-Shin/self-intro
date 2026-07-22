'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { ArrowLeft, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Study } from '@/lib/api/types';
import { markdownComponents } from '@/lib/markdown';

type Props = {
    study: Study;
};

export function StudyDetailClient({ study }: Props) {
    const router = useRouter();
    const [isNavCollapsed, setIsNavCollapsed] = useState(false);

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
                        <div className="space-y-4 text-sm leading-relaxed text-slate-700 sm:text-base">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                                components={markdownComponents}
                            >
                                {study.contentMarkdown}
                            </ReactMarkdown>
                        </div>
                    </article>
                </div>

                <aside className="block w-full sticky top-24 self-start">
                    <div
                        className={`relative rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-md backdrop-blur-md min-[900px]:flex min-[900px]:flex-col min-[900px]:border-l-4 min-[900px]:border-l-slate-300 ${
                            isNavCollapsed
                                ? 'min-[900px]:gap-3 min-[900px]:px-1.5 min-[900px]:py-3'
                                : 'min-[900px]:gap-4 min-[900px]:px-5 min-[900px]:py-4'
                        }`}
                    >
                        <button
                            type="button"
                            onClick={() => setIsNavCollapsed((collapsed) => !collapsed)}
                            className={`z-20 hidden items-center justify-center border border-slate-200 bg-white text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 min-[900px]:flex ${
                                isNavCollapsed
                                    ? 'relative mx-auto h-8 w-8 shrink-0 rounded-full shadow-sm'
                                    : 'absolute -right-[11px] top-7 !m-0 h-10 w-5 rounded-r-lg border-l-0 bg-white/95 shadow-[3px_1px_6px_-3px_rgba(15,23,42,0.35)]'
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

                        <div
                            className={`hidden ${isNavCollapsed ? '' : 'min-[900px]:block min-[900px]:pr-12'}`}
                        >
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">
                                연결 항목
                            </h3>
                            <p className="mt-0.5 text-sm leading-none text-slate-500">
                                이 학습과 연관된 이력 정보입니다.
                            </p>
                        </div>

                        <div
                            className={`hidden space-y-4 ${isNavCollapsed ? '' : 'min-[900px]:block'}`}
                        >
                            {study.experiences.length > 0 && (
                                <div>
                                    <h4 className="mb-1 text-xs font-black uppercase text-slate-400">
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
                                    <h4 className="mb-1 text-xs font-black uppercase text-slate-400">
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
                                    <h4 className="mb-1 text-xs font-black uppercase text-slate-400">
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

                        <div
                            className={`flex flex-col items-center gap-2 py-1 ${isNavCollapsed ? 'min-[900px]:flex' : 'min-[900px]:hidden'}`}
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

                        <hr
                            className={`hidden border-slate-100 ${isNavCollapsed ? '' : 'min-[900px]:block'}`}
                        />

                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="mt-2 grid h-8 w-full place-items-center rounded-lg border border-slate-200 bg-white text-sm font-extrabold text-slate-500 transition hover:border-slate-300 hover:text-slate-900 min-[900px]:mt-0 min-[900px]:flex min-[900px]:items-center min-[900px]:justify-center min-[900px]:gap-1 min-[900px]:py-2"
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
                </aside>
            </div>
        </div>
    );
}
