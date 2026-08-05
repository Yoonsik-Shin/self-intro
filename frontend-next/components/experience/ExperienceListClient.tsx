'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
    ArrowUp,
    Briefcase,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    History,
    X,
} from 'lucide-react';
import { SidebarSection } from '@/components/common/SidebarSection';
import { useResponsiveSidebar } from '@/hooks/useResponsiveSidebar';
import type { Experience } from '@/lib/api/types';
import { experienceOrgName, experienceTypeLabel, formatCredentialPeriod } from '@/lib/format';
import {
    TimelineSection,
    parseYear,
    type ExperienceTypeFilter,
} from '@/components/intro/TimelineSection';

type Props = {
    experiences: Experience[];
};

type RecentlyViewedExperienceItem = {
    id: number;
    experienceId: number;
    title: string;
    content: string;
    viewedAt: number;
};

const RECENTLY_VIEWED_KEY = 'recently_viewed_experiences';
const RECENTLY_VIEWED_CHANGED_EVENT = 'recently-viewed-experiences-changed';
const EMPTY_RECENTLY_VIEWED: RecentlyViewedExperienceItem[] = [];

let cachedRaw: string | null = null;
let cachedParsed: RecentlyViewedExperienceItem[] = EMPTY_RECENTLY_VIEWED;

// localStorage는 서버에 없는 값이라, 하이드레이션 시 서버/클라이언트 첫 렌더가 어긋나지 않도록
// useSyncExternalStore로 읽는다. getServerSnapshot은 항상 빈 배열을 반환해 서버와 클라이언트
// 최초 렌더를 일치시키고, 마운트 이후에는 subscribe를 통해 실제 값으로 갱신된다.
function getRecentlyViewedSnapshot(): RecentlyViewedExperienceItem[] {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (raw === cachedRaw) return cachedParsed;
    cachedRaw = raw;
    try {
        const parsed = raw ? JSON.parse(raw) : EMPTY_RECENTLY_VIEWED;
        cachedParsed = Array.isArray(parsed) ? parsed : EMPTY_RECENTLY_VIEWED;
    } catch {
        cachedParsed = EMPTY_RECENTLY_VIEWED;
    }
    return cachedParsed;
}

function getRecentlyViewedServerSnapshot(): RecentlyViewedExperienceItem[] {
    return EMPTY_RECENTLY_VIEWED;
}

function subscribeToRecentlyViewed(onStoreChange: () => void) {
    window.addEventListener('storage', onStoreChange);
    window.addEventListener(RECENTLY_VIEWED_CHANGED_EVENT, onStoreChange);
    return () => {
        window.removeEventListener('storage', onStoreChange);
        window.removeEventListener(RECENTLY_VIEWED_CHANGED_EVENT, onStoreChange);
    };
}

function writeRecentlyViewed(items: RecentlyViewedExperienceItem[]) {
    if (items.length === 0) {
        localStorage.removeItem(RECENTLY_VIEWED_KEY);
    } else {
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(items));
    }
    window.dispatchEvent(new Event(RECENTLY_VIEWED_CHANGED_EVENT));
}

export function ExperienceListClient({ experiences }: Props) {
    const [selectedTypes, setSelectedTypes] = useState<ExperienceTypeFilter[]>(['ALL']);
    const [selectedYears, setSelectedYears] = useState<number[]>([]);
    const [selectedExperienceIds, setSelectedExperienceIds] = useState<number[]>([]);
    const [search, setSearch] = useState('');
    const [isNavCollapsed, setIsNavCollapsed] = useResponsiveSidebar(false);
    const [isRecentExpanded, setIsRecentExpanded] = useState(false);
    const recentlyViewed = useSyncExternalStore(
        subscribeToRecentlyViewed,
        getRecentlyViewedSnapshot,
        getRecentlyViewedServerSnapshot
    );

    const handleClearHistory = () => {
        try {
            writeRecentlyViewed([]);
        } catch {
            // Ignore
        }
    };

    const handleRemoveItem = (id: number) => {
        try {
            writeRecentlyViewed(recentlyViewed.filter((item) => item.id !== id));
        } catch {
            // Ignore
        }
    };

    const toggleTypeFilter = (tabId: ExperienceTypeFilter) => {
        if (tabId === 'ALL') {
            setSelectedTypes(['ALL']);
            return;
        }
        setSelectedTypes((prev) => {
            const withoutAll = prev.filter((t) => t !== 'ALL');
            if (withoutAll.includes(tabId)) {
                const next = withoutAll.filter((t) => t !== tabId);
                return next.length === 0 ? ['ALL'] : next;
            } else {
                return [...withoutAll, tabId];
            }
        });
    };

    const toggleYear = (year: number | null) => {
        if (year === null) {
            setSelectedYears([]);
            return;
        }
        setSelectedYears((prev) => {
            if (prev.includes(year)) {
                return prev.filter((y) => y !== year);
            } else {
                return [...prev, year];
            }
        });
    };

    const toggleExperienceId = (id: number) => {
        setSelectedExperienceIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter((i) => i !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const resetAllFilters = () => {
        setSelectedTypes(['ALL']);
        setSelectedYears([]);
        setSelectedExperienceIds([]);
        setSearch('');
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return experiences.filter((experience) => {
            // Hide sub-projects (projects belonging to a career) from top-level list
            if (experience.type === 'PROJECT' && experience.careerId) return false;

            // Specific Experience Selection (multi-select)
            if (selectedExperienceIds.length > 0 && !selectedExperienceIds.includes(experience.id))
                return false;

            // Type Filter (multi-select)
            if (
                !selectedTypes.includes('ALL') &&
                selectedTypes.length > 0 &&
                !selectedTypes.includes(experience.type as ExperienceTypeFilter)
            )
                return false;

            // Year Filter (multi-select)
            if (selectedYears.length > 0) {
                const startYr = parseYear(experience.periodStart);
                const endYr = experience.periodEnd
                    ? parseYear(experience.periodEnd)
                    : new Date().getFullYear();
                const yearMatches = selectedYears.some((year) => year >= startYr && year <= endYr);
                if (!yearMatches) return false;
            }

            // Keyword Search
            if (!q) return true;
            const haystack = [
                experience.title,
                experience.summary,
                experience.takeaway,
                experience.timelineLabel,
                experienceOrgName(experience),
                experience.role,
                ...experience.details.flatMap((d) => [
                    d.content,
                    d.situation,
                    d.actionDetail,
                    d.outcome,
                    d.narrative,
                ]),
                ...experience.skills.map((s) => s.name),
                ...experience.tags.map((t) => t.name),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [experiences, selectedTypes, selectedYears, selectedExperienceIds, search]);

    const recentExperiences = useMemo(() => {
        return experiences.filter((exp) => exp.type !== 'PROJECT' || !exp.careerId).slice(0, 5);
    }, [experiences]);

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
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">경험</h1>
                        <p className="mt-1 text-sm leading-relaxed text-slate-500 sm:text-base">
                            실무 경력, 프로젝트, 학력, 자격증에서의 경험과 세부 성과를 한눈에 모아
                            구성했습니다.
                        </p>
                    </div>
                </div>

                {/* Unified Interactive Timeline & Filter Section */}
                <TimelineSection
                    experiences={experiences}
                    selectedTypes={selectedTypes}
                    toggleTypeFilter={toggleTypeFilter}
                    selectedYears={selectedYears}
                    toggleYear={toggleYear}
                    selectedExperienceIds={selectedExperienceIds}
                    toggleExperienceId={toggleExperienceId}
                    search={search}
                    setSearch={setSearch}
                    resetAllFilters={resetAllFilters}
                />

                <div className="space-y-5">
                    {filtered.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-sm font-semibold text-slate-400">
                            검색 조건에 맞는 경험이 없습니다.
                        </div>
                    ) : (
                        filtered.map((experience) => {
                            const targetUrl = `/experience/${experience.id}`;

                            return (
                                <Link
                                    key={experience.id}
                                    href={targetUrl}
                                    className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-8 space-y-4"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                                                {experienceTypeLabel(experience.type)}
                                            </span>
                                            <span className="font-mono text-xs font-bold text-slate-400">
                                                {formatCredentialPeriod(experience)}
                                            </span>
                                        </div>
                                        {experienceOrgName(experience) && (
                                            <span className="text-xs font-bold text-slate-500 font-mono">
                                                {experienceOrgName(experience)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <h2 className="text-xl font-black tracking-tight text-slate-900 transition group-hover:text-blue-700 sm:text-2xl">
                                            {experience.title}
                                        </h2>
                                        {experience.summary && (
                                            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
                                                {experience.summary}
                                            </p>
                                        )}
                                    </div>

                                    {/* Skills badges */}
                                    {experience.skills && experience.skills.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-4">
                                            {experience.skills.map((skill) => (
                                                <span
                                                    key={skill.id}
                                                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600"
                                                >
                                                    {skill.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>

            <aside
                className={`block w-full sticky top-[89px] self-start transition-all duration-300 ${
                    isNavCollapsed ? 'min-[900px]:w-[64px]' : 'min-[900px]:w-[260px]'
                }`}
            >
                <div className="relative rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md overflow-visible max-h-[calc(100vh-113px)] flex flex-col">
                    <button
                        type="button"
                        onClick={() => setIsNavCollapsed((collapsed) => !collapsed)}
                        className={`z-30 hidden items-center justify-center border border-slate-200 bg-white text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 min-[900px]:flex ${
                            isNavCollapsed
                                ? 'relative mx-auto mt-2 h-8 w-8 shrink-0 rounded-full shadow-xs'
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

                    <div
                        className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar min-[900px]:flex min-[900px]:flex-col ${
                            isNavCollapsed
                                ? 'min-[900px]:gap-3 min-[900px]:p-1.5'
                                : 'min-[900px]:gap-4 min-[900px]:px-5 min-[900px]:pt-4 min-[900px]:pb-2'
                        }`}
                    >
                        <SidebarSection
                            title="최근 읽은 경험"
                            icon={History}
                            badge={recentlyViewed.length}
                            description="최근에 방문한 이력 성과입니다."
                            isNavCollapsed={isNavCollapsed}
                            onExpandSidebar={() => setIsNavCollapsed(false)}
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
                                    <div key={item.id} className="flex items-start gap-1.5">
                                        <Link
                                            href={`/experience/${item.experienceId}/experience-detail/${item.id}`}
                                            className="flex min-w-0 flex-1 items-start gap-1.5 text-left text-xs font-semibold leading-normal text-slate-600 hover:text-blue-600 group"
                                            title={item.content || item.title}
                                        >
                                            <span className="mt-0.5 shrink-0 font-bold text-slate-400 group-hover:text-blue-600">
                                                ›
                                            </span>
                                            <span className="line-clamp-2">
                                                {item.content || item.title}
                                            </span>
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="mt-0.5 shrink-0 rounded p-0.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                                            title="이 항목 삭제"
                                            aria-label={`${item.content || item.title} 삭제`}
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
                            title="최근 이력"
                            description="최근 기간의 프로젝트 및 경력입니다."
                            isNavCollapsed={isNavCollapsed}
                        >
                            {recentExperiences.map((exp) => {
                                const targetDetailId = exp.details?.[0]?.id;
                                if (!targetDetailId) return null;
                                return (
                                    <Link
                                        key={exp.id}
                                        href={`/experience/${exp.id}/experience-detail/${targetDetailId}`}
                                        className="flex w-full items-start gap-1.5 text-left text-xs font-semibold leading-normal text-slate-600 hover:text-slate-950 group"
                                        title={exp.title}
                                    >
                                        <span className="mt-0.5 shrink-0 font-bold text-slate-400 group-hover:text-blue-600">
                                            ›
                                        </span>
                                        <span className="line-clamp-2">{exp.title}</span>
                                    </Link>
                                );
                            })}
                        </SidebarSection>
                    </div>

                    {/* 무조건 하단 고정 영역 (Sticky Bottom) */}
                    <div className="shrink-0 p-3 min-[900px]:px-4 border-t border-slate-100 bg-white/90 backdrop-blur-md rounded-b-2xl">
                        <button
                            type="button"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="grid h-9 w-full place-items-center rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-xs font-extrabold text-slate-600 hover:text-slate-900 transition-all shadow-2xs group min-[900px]:flex min-[900px]:items-center min-[900px]:justify-center min-[900px]:gap-1.5"
                            title="위로 가기"
                            aria-label="위로 가기"
                        >
                            <ArrowUp className="h-4 w-4 shrink-0 group-hover:-translate-y-0.5 transition-transform" />
                            <span
                                className={`hidden ${isNavCollapsed ? '' : 'min-[900px]:inline'}`}
                            >
                                위로 가기
                            </span>
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
}
