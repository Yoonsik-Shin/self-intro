'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';
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

export function ExperienceListClient({ experiences }: Props) {
    const [selectedTypes, setSelectedTypes] = useState<ExperienceTypeFilter[]>(['ALL']);
    const [selectedYears, setSelectedYears] = useState<number[]>([]);
    const [selectedExperienceIds, setSelectedExperienceIds] = useState<number[]>([]);
    const [search, setSearch] = useState('');
    const [isNavCollapsed, setIsNavCollapsed] = useState(false);

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
                            const targetUrl = `/experience-detail/${experience.id}`;

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
                            최근 이력
                        </h3>
                        <p className="mt-0.5 text-sm leading-none text-slate-500">
                            최근 기간의 프로젝트 및 경력입니다.
                        </p>
                    </div>

                    <div
                        className={`hidden space-y-2 ${isNavCollapsed ? '' : 'min-[900px]:block'}`}
                    >
                        {recentExperiences.map((exp) => {
                            const targetDetailId = exp.details?.[0]?.id;
                            if (!targetDetailId) return null;
                            return (
                                <Link
                                    key={exp.id}
                                    href={`/experience-detail/${targetDetailId}`}
                                    className="block w-full truncate text-left text-xs font-semibold leading-relaxed text-slate-600 transition hover:text-slate-900"
                                    title={exp.title}
                                >
                                    • {exp.title}
                                </Link>
                            );
                        })}
                    </div>

                    <div
                        className={`flex flex-col items-center gap-2 py-1 ${isNavCollapsed ? 'min-[900px]:flex' : 'min-[900px]:hidden'}`}
                    >
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            title="경험 목록 상단"
                            aria-label="경험 목록 상단"
                            className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-slate-900 text-white shadow-sm shadow-slate-800/20 ring-4 ring-slate-200"
                        >
                            <Briefcase className="h-4 w-4" />
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
