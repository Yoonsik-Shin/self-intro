'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUp, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { studyApi } from '@/lib/api';
import type { Study, StudyCategory, StudyPage } from '@/lib/api/types';

type Props = {
    initialStudies: Study[];
    categories: StudyCategory[];
};

export function StudyListClient({ initialStudies, categories }: Props) {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [isNavCollapsed, setIsNavCollapsed] = useState(false);
    const isDefaultQuery = search === '' && activeCategory === 'ALL';

    const { data: studyPage } = useQuery<StudyPage>({
        queryKey: ['studies', 'public', search, activeCategory],
        queryFn: () =>
            studyApi.list({
                q: search || undefined,
                category: activeCategory === 'ALL' ? undefined : activeCategory,
                size: 100,
            }),
        initialData: isDefaultQuery
            ? {
                  content: initialStudies,
                  page: 0,
                  size: initialStudies.length,
                  totalElements: initialStudies.length,
                  totalPages: 1,
              }
            : undefined,
    });

    const studies = studyPage?.content ?? [];
    const recentStudies = studies.slice(0, 5);

    return (
        <div
            className={`grid grid-cols-[minmax(0,1fr)_52px] gap-4 items-start relative transition-[grid-template-columns] duration-300 pb-12 sm:gap-6 ${
                isNavCollapsed
                    ? 'min-[900px]:grid-cols-[minmax(0,1fr)_52px]'
                    : 'min-[900px]:grid-cols-[minmax(0,1fr)_240px]'
            }`}
        >
            <div className="min-w-0 space-y-8">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 -translate-y-16 translate-x-16 rounded-full bg-slate-800/5 blur-[50px]" />
                    <div className="relative">
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">Study</h1>
                        <p className="mt-1 text-sm leading-relaxed text-slate-500 sm:text-base">
                            학습 내용과 실제 프로젝트 적용 경험을 연결해 기록하는 기술
                            아카이브입니다.
                        </p>
                    </div>
                </div>

                <div className="sticky top-16 z-20 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {[{ slug: 'ALL', name: '전체' }, ...categories].map((category) => (
                            <button
                                key={category.slug}
                                onClick={() => setActiveCategory(category.slug)}
                                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${activeCategory === category.slug ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="제목, 본문, 태그, 기술 검색..."
                        className="w-full rounded-xl border border-slate-200 px-4 py-2 text-xs outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-200 sm:w-72"
                    />
                </div>

                <div className="space-y-5">
                    {studies.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-sm font-semibold text-slate-400">
                            검색 조건에 맞는 Study가 없습니다.
                        </div>
                    ) : (
                        studies.map((study) => (
                            <Link
                                key={study.id}
                                href={`/study/${encodeURIComponent(study.slug)}`}
                                className="block w-full rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-8"
                            >
                                <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                    <span className="rounded bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">
                                        {study.category.name}
                                    </span>
                                    <span className="font-mono text-xs font-bold text-slate-400">
                                        {study.learnedAt}
                                    </span>
                                </div>
                                <h2 className="text-xl font-black text-slate-900">{study.title}</h2>
                                <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                                    {study.summary}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-1.5">
                                    {study.tags.map((tag) => (
                                        <span
                                            key={tag.id}
                                            className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700"
                                        >
                                            #{tag.name}
                                        </span>
                                    ))}
                                    {study.skills.map((skill) => (
                                        <span
                                            key={skill.id}
                                            className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600"
                                        >
                                            {skill.name}
                                        </span>
                                    ))}
                                </div>
                            </Link>
                        ))
                    )}
                </div>
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
                            최근 작성글
                        </h3>
                        <p className="mt-0.5 text-sm leading-none text-slate-500">
                            최근 등록된 학습 기록입니다.
                        </p>
                    </div>

                    <div
                        className={`hidden space-y-2 ${isNavCollapsed ? '' : 'min-[900px]:block'}`}
                    >
                        {recentStudies.map((study) => (
                            <Link
                                key={study.id}
                                href={`/study/${encodeURIComponent(study.slug)}`}
                                className="block w-full truncate text-left text-xs font-semibold leading-relaxed text-slate-600 transition hover:text-slate-900"
                                title={study.title}
                            >
                                • {study.title}
                            </Link>
                        ))}
                        {studies.length === 0 && (
                            <p className="text-xs font-bold italic text-slate-400">
                                등록된 글이 없습니다.
                            </p>
                        )}
                    </div>

                    <div
                        className={`flex flex-col items-center gap-2 py-1 ${isNavCollapsed ? 'min-[900px]:flex' : 'min-[900px]:hidden'}`}
                    >
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            title="공부 정리 목록 상단"
                            aria-label="공부 정리 목록 상단"
                            className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-slate-900 text-white shadow-sm shadow-slate-800/20 ring-4 ring-slate-200"
                        >
                            <BookOpen className="h-4 w-4" />
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
                        <span className={`hidden ${isNavCollapsed ? '' : 'min-[900px]:inline'}`}>
                            위로 가기
                        </span>
                    </button>
                </div>
            </aside>
        </div>
    );
}
