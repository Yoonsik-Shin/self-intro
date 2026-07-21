'use client';

import { useMemo, useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, FolderGit2, RotateCcw, Search } from 'lucide-react';
import type { Experience } from '@/lib/api/types';
import { experienceOrgName } from '@/lib/format';

export const experienceTypeTabs = [
    { id: 'ALL' as const, label: '전체' },
    { id: 'CAREER' as const, label: '경력' },
    { id: 'PROJECT' as const, label: '프로젝트' },
    { id: 'EDUCATION' as const, label: '학력 · 교육' },
    { id: 'CERTIFICATE' as const, label: '자격증' },
];

export type ExperienceTypeFilter = (typeof experienceTypeTabs)[number]['id'];

type Props = {
    experiences: Experience[];
    selectedTypes: ExperienceTypeFilter[];
    toggleTypeFilter: (filter: ExperienceTypeFilter) => void;
    selectedYears: number[];
    toggleYear: (year: number | null) => void;
    selectedExperienceIds: number[];
    toggleExperienceId: (id: number) => void;
    search: string;
    setSearch: (s: string) => void;
    resetAllFilters: () => void;
};

export function parseYear(dateStr: string | undefined | null): number {
    if (!dateStr) return new Date().getFullYear();
    const match = dateStr.match(/\d{4}/);
    if (match) return parseInt(match[0], 10);
    return new Date().getFullYear();
}

function parseMs(dateStr: string | undefined | null, defaultNowMs: number): number {
    if (!dateStr) return defaultNowMs;
    const normalized = dateStr.replace(/\./g, '-');
    const ms = new Date(normalized).getTime();
    if (!isNaN(ms)) return ms;
    const yr = parseYear(dateStr);
    return new Date(`${yr}-01-01`).getTime();
}

export function TimelineSection({
    experiences,
    selectedTypes,
    toggleTypeFilter,
    selectedYears,
    toggleYear,
    selectedExperienceIds,
    toggleExperienceId,
    search,
    setSearch,
    resetAllFilters,
}: Props) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const timelineExperiences = useMemo(
        () => experiences.filter((exp) => exp.showOnTimeline),
        [experiences]
    );

    const nowMs = useMemo(() => new Date().getTime(), []);

    const range = useMemo(() => {
        if (selectedYears.length > 0) {
            const minY = Math.min(...selectedYears);
            const maxY = Math.max(...selectedYears);
            return { startYear: minY, endYear: maxY };
        }
        if (timelineExperiences.length === 0) return { startYear: 2022, endYear: 2026 };
        const yearsList = timelineExperiences.flatMap((exp) => [
            parseYear(exp.periodStart),
            exp.periodEnd ? parseYear(exp.periodEnd) : new Date().getFullYear(),
        ]);
        const minYear = Math.min(...yearsList);
        const maxYear = Math.max(...yearsList);
        return { startYear: minYear, endYear: Math.max(maxYear, minYear + 1) };
    }, [timelineExperiences, selectedYears]);

    const years = useMemo(() => {
        const list: number[] = [];
        for (let y = range.startYear; y <= range.endYear; y++) list.push(y);
        return list;
    }, [range]);

    const rangeStartMs = new Date(`${range.startYear}-01-01`).getTime();
    const rangeEndMs = new Date(`${range.endYear + 1}-01-01`).getTime();
    const rangeSpanMs = rangeEndMs - rangeStartMs;

    const percentFor = (dateStr: string) => {
        const ms = parseMs(dateStr, nowMs);
        return Math.min(100, Math.max(0, ((ms - rangeStartMs) / rangeSpanMs) * 100));
    };

    const pointBounds = (dateStr: string) => {
        const ms = parseMs(dateStr, nowMs);
        if (ms < rangeStartMs || ms >= rangeEndMs) return null;
        const left = Math.min(100, Math.max(0, ((ms - rangeStartMs) / rangeSpanMs) * 100));
        return { left };
    };

    const barBounds = (startStr: string, endStr?: string) => {
        const startMs = parseMs(startStr, nowMs);
        const endMs = endStr ? parseMs(endStr, nowMs) : nowMs;
        if (endMs < rangeStartMs || startMs >= rangeEndMs) return null;

        const clampedStartMs = Math.max(startMs, rangeStartMs);
        const clampedEndMs = Math.min(endMs, rangeEndMs);

        const left = Math.min(
            100,
            Math.max(0, ((clampedStartMs - rangeStartMs) / rangeSpanMs) * 100)
        );
        const right = Math.min(
            100,
            Math.max(0, ((clampedEndMs - rangeStartMs) / rangeSpanMs) * 100)
        );
        const width = Math.max(3, right - left);
        return { left, width };
    };

    const isYearActive = (startStr: string, endStr?: string) => {
        if (selectedYears.length === 0) return true;
        const startYear = parseYear(startStr);
        const endYear = endStr ? parseYear(endStr) : new Date().getFullYear();
        return selectedYears.some((year) => year >= startYear && year <= endYear);
    };

    const isTypeActive = (type: string) => {
        if (selectedTypes.includes('ALL') || selectedTypes.length === 0) return true;
        return selectedTypes.includes(type as ExperienceTypeFilter);
    };

    const isSelectedActive = (id: number) => {
        if (selectedExperienceIds.length === 0) return true;
        return selectedExperienceIds.includes(id);
    };

    const isSearchActive = (exp: Experience) => {
        if (!search || !search.trim()) return true;
        const q = search.trim().toLowerCase();
        const haystack = [
            exp.title,
            exp.summary,
            exp.takeaway,
            exp.timelineLabel,
            experienceOrgName(exp),
            exp.role,
            ...exp.details.flatMap((d) => [
                d.content,
                d.situation,
                d.actionDetail,
                d.outcome,
                d.narrative,
            ]),
            ...exp.skills.map((s) => s.name),
            ...exp.tags.map((t) => t.name),
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        return haystack.includes(q);
    };

    const dimClass = (exp: Experience) => {
        const yearActive = isYearActive(exp.periodStart, exp.periodEnd);
        const typeActive = isTypeActive(exp.type);
        const selectedActive = isSelectedActive(exp.id);
        const searchActive = isSearchActive(exp);
        return yearActive && typeActive && selectedActive && searchActive
            ? 'opacity-100 ring-1 ring-slate-900/10'
            : 'opacity-20 grayscale hover:opacity-75 transition-opacity';
    };

    const shortDate = (dateStr: string) => {
        const match = dateStr.replace(/\./g, '-').split('-');
        if (match.length >= 2) return `${match[0].slice(2)}.${match[1]}`;
        return dateStr;
    };

    const longDate = (dateStr: string) => {
        const match = dateStr.replace(/\./g, '-').split('-');
        if (match.length >= 2) return `${match[0]}.${match[1]}`;
        return dateStr;
    };

    const tooltip = (exp: Experience, isPoint: boolean) =>
        isPoint
            ? `${exp.title} (${shortDate(exp.periodStart)})`
            : `${exp.title} (${longDate(exp.periodStart)} - ${exp.periodEnd ? longDate(exp.periodEnd) : '진행 중'})`;

    const onItemClick = (exp: Experience) => {
        toggleExperienceId(exp.id);
    };

    const certItems = timelineExperiences.filter((exp) => exp.type === 'CERTIFICATE');
    const eduDegreeItems = timelineExperiences.filter(
        (exp) => exp.type === 'EDUCATION' && (!exp.periodEnd || exp.periodStart === exp.periodEnd)
    );
    const eduCourseItems = timelineExperiences.filter(
        (exp) => exp.type === 'EDUCATION' && exp.periodEnd && exp.periodStart !== exp.periodEnd
    );
    const careerItems = timelineExperiences.filter((exp) => exp.type === 'CAREER');
    const projectItems = [...timelineExperiences.filter((exp) => exp.type === 'PROJECT')].sort(
        (a, b) => a.periodStart.localeCompare(b.periodStart)
    );

    // non-overlapping row packing algorithm for projects
    const projectRows = useMemo(() => {
        const rows: Experience[][] = [];
        for (const exp of projectItems) {
            let placed = false;
            const expStartMs = parseMs(exp.periodStart, nowMs);
            for (const row of rows) {
                const lastInRow = row[row.length - 1];
                const lastEndMs = lastInRow.periodEnd ? parseMs(lastInRow.periodEnd, nowMs) : nowMs;
                if (expStartMs >= lastEndMs - 3 * 24 * 60 * 60 * 1000) {
                    row.push(exp);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                rows.push([exp]);
            }
        }
        return rows;
    }, [projectItems, nowMs]);

    const hasActiveFilter =
        (!selectedTypes.includes('ALL') && selectedTypes.length > 0) ||
        selectedYears.length > 0 ||
        selectedExperienceIds.length > 0 ||
        search.trim().length > 0;

    const timelineTicks = useMemo(() => {
        const count = selectedYears.length;
        let monthStep = 0;
        if (count === 1) monthStep = 1;
        else if (count === 2) monthStep = 2;
        else if (count === 3) monthStep = 4;
        else if (count === 4) monthStep = 3;

        const ticks: { key: string; label: string; percent: number; isYearStart: boolean }[] = [];

        for (let y = range.startYear; y <= range.endYear; y++) {
            if (monthStep === 0) {
                const dateStr = `${y}-01-01`;
                ticks.push({
                    key: dateStr,
                    label: `${y}`,
                    percent: percentFor(dateStr),
                    isYearStart: true,
                });
            } else {
                for (let m = 1; m <= 12; m += monthStep) {
                    const monthPad = m < 10 ? `0${m}` : `${m}`;
                    const dateStr = `${y}-${monthPad}-01`;
                    const label = count === 1 ? `${m}월` : m === 1 ? `${y}.${monthPad}` : `${m}월`;
                    ticks.push({
                        key: dateStr,
                        label,
                        percent: percentFor(dateStr),
                        isYearStart: m === 1,
                    });
                }
            }
        }

        return ticks;
    }, [range, selectedYears, percentFor]);

    const cardStyle =
        'resume-section-card bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm transition-all duration-300 relative space-y-6';

    return (
        <section id="timeline" className="scroll-mt-24 print:hidden">
            <div className={cardStyle}>
                {/* Header Title & Integrated Search / Tabs */}
                <div className={`space-y-4 ${isCollapsed ? '' : 'border-b border-slate-100 pb-5'}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <Calendar className="h-6 w-6 text-slate-900" />
                                커리어 & 학습 타임라인 및 필터
                            </h2>
                            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                                타임라인 바, 카테고리 탭, 연도 및 검색어를 조합하여 아래 경험
                                리스트를 실시간 필터링합니다. (다중 선택 가능)
                            </p>
                        </div>

                        <div className="flex items-center gap-2 self-start shrink-0">
                            {hasActiveFilter && (
                                <button
                                    type="button"
                                    onClick={resetAllFilters}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 transition hover:text-rose-800 px-1 py-1"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" /> 필터 초기화
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setIsCollapsed((prev) => !prev)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-900 px-1 py-1"
                            >
                                {isCollapsed ? (
                                    <>
                                        <span>타임라인 펼치기</span>
                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                    </>
                                ) : (
                                    <>
                                        <span>타임라인 접기</span>
                                        <ChevronUp className="h-4 w-4 text-slate-400" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {isCollapsed ? (
                        hasActiveFilter && (
                            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 pt-1">
                                <span className="text-slate-400 font-extrabold">
                                    적용 중인 필터:
                                </span>
                                {!selectedTypes.includes('ALL') && (
                                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-800 border border-slate-200/60">
                                        분류:{' '}
                                        {selectedTypes
                                            .map(
                                                (t) =>
                                                    experienceTypeTabs.find((tab) => tab.id === t)
                                                        ?.label
                                            )
                                            .join(', ')}
                                    </span>
                                )}
                                {selectedYears.length > 0 && (
                                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-800 border border-slate-200/60">
                                        연도: {selectedYears.join(', ')}년
                                    </span>
                                )}
                                {search.trim() && (
                                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-800 border border-slate-200/60">
                                        검색: &quot;{search.trim()}&quot;
                                    </span>
                                )}
                            </div>
                        )
                    ) : (
                        <>
                            {/* Unified Controls: Type Tabs & Search Input */}
                            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {experienceTypeTabs.map((tab) => {
                                        const isSelected = selectedTypes.includes(tab.id);
                                        return (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => toggleTypeFilter(tab.id)}
                                                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                                                    isSelected
                                                        ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20'
                                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-100'
                                                }`}
                                            >
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="relative w-full sm:w-72">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="search"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="프로젝트, 기술, 성과, 기관명 검색..."
                                        className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-1.5 text-xs outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-200 bg-slate-50/50 focus:bg-white"
                                    />
                                </div>
                            </div>

                            {/* Year Pills & Legend */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                {years.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-xs font-extrabold text-slate-400 mr-1">
                                            연도 선택:
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => toggleYear(null)}
                                            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                                                selectedYears.length === 0
                                                    ? 'bg-slate-800 text-white shadow-xs'
                                                    : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                            }`}
                                        >
                                            전체 기간
                                        </button>
                                        {[2022, 2023, 2024, 2025, 2026].map((year) => {
                                            const isSelected = selectedYears.includes(year);
                                            return (
                                                <button
                                                    key={year}
                                                    type="button"
                                                    onClick={() => toggleYear(year)}
                                                    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                                                        isSelected
                                                            ? 'bg-slate-800 text-white shadow-xs'
                                                            : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                                    }`}
                                                >
                                                    {year}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500">
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full border border-white bg-emerald-500 shadow-xs" />
                                        자격증
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-3 rounded bg-gradient-to-r from-blue-500 to-slate-800" />
                                        학력 · 교육
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-3 rounded bg-gradient-to-r from-violet-600 to-slate-900" />
                                        실무 경력
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-3 rounded bg-gradient-to-r from-pink-500 to-rose-500" />
                                        프로젝트
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Timeline Visualization */}
                {!isCollapsed &&
                    (timelineExperiences.length === 0 ? (
                        <p className="py-10 text-center text-sm font-bold text-slate-400">
                            타임라인에 표시할 항목이 없습니다.
                        </p>
                    ) : (
                        <div className="relative select-none pt-2">
                            <div className="relative flex h-8 items-center border-b border-slate-100">
                                <div className="w-32 sm:w-36 shrink-0" />
                                <div className="relative h-full flex-1 text-xs font-black text-slate-400">
                                    {timelineTicks.map((tick) => (
                                        <div
                                            key={tick.key}
                                            className={`absolute -translate-x-1/2 whitespace-nowrap ${
                                                tick.isYearStart
                                                    ? 'font-black text-slate-800 text-xs'
                                                    : 'font-extrabold text-slate-400 text-[10px]'
                                            }`}
                                            style={{ left: `${tick.percent}%` }}
                                        >
                                            {tick.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pointer-events-none absolute inset-y-0 left-32 sm:left-36 right-0 top-8 z-0">
                                {timelineTicks.map((tick) => (
                                    <div
                                        key={tick.key}
                                        className={`absolute bottom-0 top-0 w-[1px] ${
                                            tick.isYearStart
                                                ? 'border-l border-slate-300'
                                                : 'border-l border-dashed border-slate-200'
                                        }`}
                                        style={{ left: `${tick.percent}%` }}
                                    />
                                ))}
                            </div>

                            <div className="mt-4 space-y-3 pb-2">
                                {/* Row 1: Certificate Points */}
                                {certItems.length > 0 && (
                                    <div className="relative flex h-9 items-center">
                                        <div className="w-32 sm:w-36 shrink-0 text-xs sm:text-sm font-black text-slate-500">
                                            자격증
                                        </div>
                                        <div className="relative h-full flex-1">
                                            {certItems.map((exp) => {
                                                const bounds = pointBounds(exp.periodStart);
                                                if (!bounds) return null;
                                                return (
                                                    <div
                                                        key={exp.id}
                                                        style={{ left: `${bounds.left}%` }}
                                                        className={`group/item absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer ${dimClass(exp)}`}
                                                        onClick={() => onItemClick(exp)}
                                                    >
                                                        <div
                                                            className={`h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-md transition hover:scale-125 ${selectedExperienceIds.includes(exp.id) ? 'ring-2 ring-emerald-600 ring-offset-2' : ''}`}
                                                        />
                                                        <span className="pointer-events-none absolute left-1/2 top-5 z-30 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800/90 px-2 py-0.5 text-[10px] font-bold text-white opacity-0 shadow-sm transition-opacity group-hover/item:opacity-100">
                                                            {tooltip(exp, true)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Row 2: Unified Education & Course Items */}
                                {(eduDegreeItems.length > 0 || eduCourseItems.length > 0) && (
                                    <div className="relative flex h-9 items-center">
                                        <div className="w-32 sm:w-36 shrink-0 text-xs sm:text-sm font-black text-slate-500">
                                            학력 및 교육
                                        </div>
                                        <div className="relative h-full flex-1">
                                            {eduDegreeItems.map((exp) => {
                                                const bounds = pointBounds(exp.periodStart);
                                                if (!bounds) return null;
                                                return (
                                                    <div
                                                        key={exp.id}
                                                        style={{ left: `${bounds.left}%` }}
                                                        className={`group/item absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer ${dimClass(exp)}`}
                                                        onClick={() => onItemClick(exp)}
                                                    >
                                                        <div
                                                            className={`h-3.5 w-3.5 rounded-full bg-blue-600 border-2 border-white shadow-md transition hover:scale-125 ${selectedExperienceIds.includes(exp.id) ? 'ring-2 ring-blue-600 ring-offset-2' : ''}`}
                                                        />
                                                        <span className="pointer-events-none absolute left-1/2 top-5 z-30 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800/90 px-2 py-0.5 text-[10px] font-bold text-white opacity-0 shadow-sm transition-opacity group-hover/item:opacity-100">
                                                            {tooltip(exp, true)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            {eduCourseItems.map((exp) => {
                                                const bounds = barBounds(
                                                    exp.periodStart,
                                                    exp.periodEnd
                                                );
                                                if (!bounds) return null;
                                                return (
                                                    <div
                                                        key={exp.id}
                                                        style={{
                                                            left: `${bounds.left}%`,
                                                            width: `${bounds.width}%`,
                                                        }}
                                                        className={`group/item absolute bottom-1 top-1 flex cursor-pointer items-center justify-center rounded-lg border border-white bg-gradient-to-r from-blue-500 to-slate-800 px-2 text-[10px] font-black text-white shadow-xs transition hover:brightness-105 active:scale-[0.98] ${dimClass(exp)} ${selectedExperienceIds.includes(exp.id) ? 'ring-2 ring-slate-900 ring-offset-1 z-30' : ''}`}
                                                        onClick={() => onItemClick(exp)}
                                                    >
                                                        <span className="truncate">
                                                            {exp.timelineLabel || exp.title}
                                                        </span>
                                                        <span className="pointer-events-none absolute bottom-full mb-2 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900/95 px-3 py-1.5 text-xs font-bold text-white opacity-0 shadow-xl transition-all duration-200 group-hover/item:opacity-100">
                                                            {tooltip(exp, false)}
                                                            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Career Items */}
                                {careerItems.length > 0 && (
                                    <div className="relative flex h-9 items-center">
                                        <div className="w-32 sm:w-36 shrink-0 text-xs sm:text-sm font-black text-slate-500">
                                            실무 경력
                                        </div>
                                        <div className="relative h-full flex-1">
                                            {careerItems.map((exp) => {
                                                const bounds = barBounds(
                                                    exp.periodStart,
                                                    exp.periodEnd
                                                );
                                                if (!bounds) return null;
                                                return (
                                                    <div
                                                        key={exp.id}
                                                        style={{
                                                            left: `${bounds.left}%`,
                                                            width: `${bounds.width}%`,
                                                        }}
                                                        className={`group/item absolute bottom-1 top-1 flex cursor-pointer items-center justify-center rounded-lg border border-white bg-gradient-to-r from-violet-600 to-slate-900 px-2 text-[10px] font-black text-white shadow-xs transition hover:brightness-105 active:scale-[0.98] ${dimClass(exp)} ${selectedExperienceIds.includes(exp.id) ? 'ring-2 ring-slate-900 ring-offset-1 z-30' : ''}`}
                                                        onClick={() => onItemClick(exp)}
                                                    >
                                                        <span className="truncate">
                                                            {exp.timelineLabel || exp.title}
                                                        </span>
                                                        <span className="pointer-events-none absolute bottom-full mb-2 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900/95 px-3 py-1.5 text-xs font-bold text-white opacity-0 shadow-xl transition-all duration-200 group-hover/item:opacity-100">
                                                            {tooltip(exp, false)}
                                                            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Packed Project Rows (Non-overlapping Projects in single rows) */}
                                {projectRows.map((row, rowIndex) => (
                                    <div key={rowIndex} className="relative flex h-9 items-center">
                                        <div className="flex w-32 sm:w-36 shrink-0 items-center gap-1 text-xs sm:text-sm font-black text-slate-500">
                                            <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                                            <span className="truncate">
                                                {rowIndex === 0 ? '프로젝트' : ''}
                                            </span>
                                        </div>
                                        <div className="relative h-full flex-1">
                                            {row.map((exp) => {
                                                const bounds = barBounds(
                                                    exp.periodStart,
                                                    exp.periodEnd
                                                );
                                                if (!bounds) return null;
                                                return (
                                                    <div
                                                        key={exp.id}
                                                        style={{
                                                            left: `${bounds.left}%`,
                                                            width: `${bounds.width}%`,
                                                        }}
                                                        className={`group/item absolute bottom-1 top-1 flex cursor-pointer items-center justify-center rounded-lg border border-white bg-gradient-to-r from-pink-500 to-rose-500 px-2 text-[10px] font-black text-white shadow-xs transition hover:brightness-105 active:scale-[0.98] ${dimClass(exp)} ${selectedExperienceIds.includes(exp.id) ? 'ring-2 ring-rose-600 ring-offset-1 z-30 font-extrabold' : ''}`}
                                                        onClick={() => onItemClick(exp)}
                                                    >
                                                        <span className="truncate">
                                                            {exp.timelineLabel || exp.title}
                                                        </span>
                                                        <span className="pointer-events-none absolute bottom-full mb-2 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900/95 px-3 py-1.5 text-xs font-bold text-white opacity-0 shadow-xl transition-all duration-200 group-hover/item:opacity-100">
                                                            {tooltip(exp, false)}
                                                            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="relative mt-1 flex h-6 items-center border-t border-slate-100">
                                <div className="w-32 sm:w-36 shrink-0" />
                                <div className="relative h-full flex-1 text-[11px] font-black text-slate-300">
                                    {timelineTicks.map((tick) => (
                                        <div
                                            key={tick.key}
                                            className={`absolute -translate-x-1/2 whitespace-nowrap ${
                                                tick.isYearStart
                                                    ? 'font-black text-slate-600 text-xs'
                                                    : 'font-bold text-slate-400 text-[10px]'
                                            }`}
                                            style={{ left: `${tick.percent}%` }}
                                        >
                                            {tick.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
            </div>
        </section>
    );
}
