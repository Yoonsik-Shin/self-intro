'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
    ArrowUp,
    BookOpen,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    History,
    ListTree,
    Loader2,
    X,
} from 'lucide-react';
import { SidebarSection } from '@/components/common/SidebarSection';
import { studyApi, taxonomyApi } from '@/lib/api';
import type { Study, StudyTaxonomyNode, StudyPage } from '@/lib/api/types';
import { taxonomyBreadcrumbLabel, toTaxonomyNodeMap } from '@/lib/taxonomy';
import { TaxonomyList } from './TaxonomyList';

import { useResponsiveSidebar } from '@/hooks/useResponsiveSidebar';

type Props = {
    initialStudies: Study[];
    initialTotalElements?: number;
    initialTotalPages?: number;
    taxonomyNodes: StudyTaxonomyNode[];
};

type RecentlyViewedItem = {
    slug: string;
    title: string;
    categoryName: string;
    viewedAt: number;
};

export function StudyListClient({
    initialStudies,
    initialTotalElements,
    initialTotalPages,
    taxonomyNodes,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();

    const [idFilters, setIdFilters] = useState<{
        skillIdNum?: number;
        experienceIdNum?: number;
        experienceDetailIdNum?: number;
    }>({});

    const { skillIdNum, experienceIdNum, experienceDetailIdNum } = idFilters;

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setIdFilters({
                skillIdNum: params.get('skillId') ? Number(params.get('skillId')) : undefined,
                experienceIdNum: params.get('experienceId')
                    ? Number(params.get('experienceId'))
                    : undefined,
                experienceDetailIdNum: params.get('experienceDetailId')
                    ? Number(params.get('experienceDetailId'))
                    : undefined,
            });
        }
    }, []);

    const hasIdFilter = Boolean(skillIdNum || experienceIdNum || experienceDetailIdNum);
    const clearIdFilter = () => {
        setIdFilters({});
        router.push(pathname);
    };

    const [search, setSearch] = useState('');
    const [activeTaxonomyNodeId, setActiveTaxonomyNodeId] = useState<number | null>(null);
    const [isNavCollapsed, setIsNavCollapsed] = useResponsiveSidebar(false);
    const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);
    const [isRecentExpanded, setIsRecentExpanded] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('recently_viewed_studies');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) setRecentlyViewed(parsed);
            }
        } catch {
            // Ignore (e.g. sandboxed iframe, incognito)
        }
    }, []);

    const isDefaultQuery = search === '' && activeTaxonomyNodeId === null && !hasIdFilter;

    const handleClearHistory = () => {
        try {
            localStorage.removeItem('recently_viewed_studies');
            setRecentlyViewed([]);
        } catch {
            // Ignore
        }
    };

    const handleRemoveItem = (slug: string) => {
        try {
            const next = recentlyViewed.filter((item) => item.slug !== slug);
            setRecentlyViewed(next);
            if (next.length === 0) {
                localStorage.removeItem('recently_viewed_studies');
            } else {
                localStorage.setItem('recently_viewed_studies', JSON.stringify(next));
            }
        } catch {
            // Ignore
        }
    };

    const {
        data: studyInfiniteData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery<StudyPage>({
        queryKey: [
            'studies',
            'public-infinite',
            search,
            activeTaxonomyNodeId,
            skillIdNum,
            experienceIdNum,
            experienceDetailIdNum,
        ],
        queryFn: ({ pageParam = 0 }) =>
            studyApi.list({
                q: search || undefined,
                taxonomyNodeId: activeTaxonomyNodeId ?? undefined,
                skillIds: skillIdNum ? [skillIdNum] : undefined,
                experienceIds: experienceIdNum ? [experienceIdNum] : undefined,
                experienceDetailIds: experienceDetailIdNum ? [experienceDetailIdNum] : undefined,
                page: pageParam as number,
                size: 20,
            }),
        getNextPageParam: (lastPage) => {
            if (lastPage.page + 1 < lastPage.totalPages) {
                return lastPage.page + 1;
            }
            return undefined;
        },
        initialPageParam: 0,
        initialData: isDefaultQuery
            ? {
                  pages: [
                      {
                          content: initialStudies,
                          page: 0,
                          size: 20,
                          totalElements: initialTotalElements ?? initialStudies.length,
                          totalPages: initialTotalPages ?? 1,
                      },
                  ],
                  pageParams: [0],
              }
            : undefined,
        staleTime: 60 * 1000,
    });

    const studies = studyInfiniteData
        ? studyInfiniteData.pages.flatMap((page) => page.content)
        : initialStudies;
    const recentStudies = studies.slice(0, 5);

    // breadcrumb 렌더링용 — study 응답엔 직접 attach된 노드만 들어있어 조상 이름을 알 수 없어서
    // 전체 taxonomy 트리를 따로 받아 id→node 맵을 만든다.
    const { data: allTaxonomyNodes } = useQuery({
        queryKey: ['taxonomyNodesPublic'],
        queryFn: taxonomyApi.publicList,
        staleTime: 5 * 60 * 1000,
    });
    const taxonomyNodesById = useMemo(
        () => toTaxonomyNodeMap(allTaxonomyNodes ?? []),
        [allTaxonomyNodes]
    );

    const observerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = observerRef.current;
        if (!el || !hasNextPage || isFetchingNextPage) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const idFilterLabel = skillIdNum
        ? studies.flatMap((study) => study.skills).find((skill) => skill.id === skillIdNum)?.name
        : experienceDetailIdNum
          ? studies
                .flatMap((study) => study.experienceDetails)
                .find((detail) => detail.id === experienceDetailIdNum)?.experienceTitle
          : experienceIdNum
            ? studies
                  .flatMap((study) => study.experiences)
                  .find((experience) => experience.id === experienceIdNum)?.title
            : undefined;

    return (
        <div
            className={`grid grid-cols-[minmax(0,1fr)_52px] gap-4 items-start relative transition-[grid-template-columns] duration-300 pb-4 sm:gap-6 ${
                isNavCollapsed
                    ? 'min-[900px]:grid-cols-[minmax(0,1fr)_52px]'
                    : 'min-[900px]:grid-cols-[minmax(0,1fr)_220px] min-[1200px]:grid-cols-[minmax(0,1fr)_240px]'
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

                {hasIdFilter && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm">
                        <p className="font-bold text-blue-700">
                            <span className="text-blue-900">{idFilterLabel ?? '선택한 항목'}</span>{' '}
                            관련 학습만 모아보는 중이에요
                        </p>
                        <button
                            type="button"
                            onClick={clearIdFilter}
                            className="flex shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-bold text-blue-600 transition hover:bg-blue-100"
                        >
                            <X className="h-3 w-3" />
                            필터 해제
                        </button>
                    </div>
                )}

                <div className="sticky top-16 z-20 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            onClick={() => setActiveTaxonomyNodeId(null)}
                            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${activeTaxonomyNodeId === null ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                        >
                            전체 ({taxonomyNodes.reduce((sum, node) => sum + node.studyCount, 0)})
                        </button>
                        {taxonomyNodes.map((node) => (
                            <button
                                key={node.id}
                                onClick={() => setActiveTaxonomyNodeId(node.id)}
                                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${activeTaxonomyNodeId === node.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                            >
                                {node.name} ({node.studyCount})
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
                                    <div className="flex flex-wrap gap-1">
                                        {study.taxonomyNodes.map((node) => (
                                            <span
                                                key={node.id}
                                                className="rounded bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800"
                                            >
                                                {taxonomyBreadcrumbLabel(node, taxonomyNodesById)}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="font-mono text-xs font-bold text-slate-400 shrink-0">
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

                    {hasNextPage && (
                        <div ref={observerRef} className="pt-4 text-center">
                            <button
                                type="button"
                                onClick={() => fetchNextPage()}
                                disabled={isFetchingNextPage}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                            >
                                {isFetchingNextPage ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                        <span>다음 학습 기록을 불러오는 중...</span>
                                    </>
                                ) : (
                                    <span>학습 기록 더 불러오기</span>
                                )}
                            </button>
                        </div>
                    )}
                    {!hasNextPage && studies.length > 0 && (
                        <div className="pt-4 text-center text-xs font-bold text-slate-400">
                            모든 학습 기록({studies.length}개)을 불러왔습니다.
                        </div>
                    )}
                </div>
            </div>

            <aside className="block w-full sticky top-[89px] self-start">
                <div
                    className={`relative max-h-[calc(100vh-113px)] overflow-y-auto custom-scrollbar rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md min-[900px]:flex min-[900px]:flex-col ${
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
                                ? 'relative mx-auto h-8 w-8 shrink-0 rounded-full shadow-xs'
                                : 'absolute -right-[11px] top-6 !m-0 h-10 w-5 rounded-r-lg border-l-0 bg-white/95 shadow-[3px_1px_6px_-3px_rgba(15,23,42,0.35)]'
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

                    {taxonomyNodes.length > 0 && (
                        <SidebarSection
                            title="카테고리"
                            icon={ListTree}
                            isNavCollapsed={isNavCollapsed}
                        >
                            <TaxonomyList
                                nodes={taxonomyNodes}
                                activeNodeId={activeTaxonomyNodeId}
                                onSelect={setActiveTaxonomyNodeId}
                                hideHeader
                            />
                        </SidebarSection>
                    )}

                    <hr
                        className={`hidden -mb-1 border-slate-100 ${taxonomyNodes.length > 0 && !isNavCollapsed ? 'min-[900px]:block' : ''}`}
                    />

                    {recentlyViewed.length > 0 ? (
                        <SidebarSection
                            title="최근 읽은 글"
                            icon={History}
                            description="최근에 방문한 학습 기록입니다."
                            isNavCollapsed={isNavCollapsed}
                            extraAction={
                                <button
                                    type="button"
                                    onClick={handleClearHistory}
                                    className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition"
                                    title="최근 본 기록 비우기"
                                >
                                    지우기
                                </button>
                            }
                        >
                            {(isRecentExpanded ? recentlyViewed : recentlyViewed.slice(0, 7)).map(
                                (item) => (
                                    <div key={item.slug} className="flex items-start gap-1.5">
                                        <Link
                                            href={`/study/${encodeURIComponent(item.slug)}`}
                                            className="flex min-w-0 flex-1 items-start gap-1.5 text-left text-xs font-semibold leading-normal text-slate-600 hover:text-blue-600 group"
                                            title={item.title}
                                        >
                                            <span className="mt-0.5 shrink-0 font-bold text-slate-400 group-hover:text-blue-600">
                                                ›
                                            </span>
                                            <span className="line-clamp-2">{item.title}</span>
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(item.slug)}
                                            className="mt-0.5 shrink-0 rounded p-0.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                                            title="이 항목 삭제"
                                            aria-label={`${item.title} 삭제`}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                )
                            )}

                            {recentlyViewed.length > 7 && (
                                <button
                                    type="button"
                                    onClick={() => setIsRecentExpanded(!isRecentExpanded)}
                                    className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors w-full py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60"
                                >
                                    {isRecentExpanded ? (
                                        <>
                                            <span>접기</span>
                                            <ChevronUp className="h-3.5 w-3.5" />
                                        </>
                                    ) : (
                                        <>
                                            <span>더 보기 (+{recentlyViewed.length - 7})</span>
                                            <ChevronDown className="h-3.5 w-3.5" />
                                        </>
                                    )}
                                </button>
                            )}
                        </SidebarSection>
                    ) : (
                        <SidebarSection
                            title="최근 작성글"
                            description="최근 등록된 학습 기록입니다."
                            isNavCollapsed={isNavCollapsed}
                        >
                            {recentStudies.map((study) => (
                                <Link
                                    key={study.id}
                                    href={`/study/${encodeURIComponent(study.slug)}`}
                                    className="flex w-full items-start gap-1.5 text-left text-xs font-semibold leading-normal text-slate-600 hover:text-slate-950 group"
                                    title={study.title}
                                >
                                    <span className="mt-0.5 shrink-0 font-bold text-slate-400 group-hover:text-blue-600">
                                        ›
                                    </span>
                                    <span className="line-clamp-2">{study.title}</span>
                                </Link>
                            ))}
                            {studies.length === 0 && (
                                <p className="text-xs font-bold italic text-slate-400">
                                    등록된 글이 없습니다.
                                </p>
                            )}
                        </SidebarSection>
                    )}

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
                        className={`hidden -mb-4 border-slate-100 ${isNavCollapsed ? '' : 'min-[900px]:block'}`}
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
