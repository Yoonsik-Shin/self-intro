'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Sparkles } from 'lucide-react';
import type { Competency } from '@/lib/api/types';
import type { Milestone } from '@/lib/introDerivations';
import { scrollToSection, scrollToElement } from '@/lib/scroll';

type Props = {
    competencies: Competency[];
    milestones: Milestone[];
    onSelectMilestone: (id: string) => void;
    studyBasePath?: string;
};

export function CompetenciesSection({
    competencies,
    milestones,
    onSelectMilestone,
    studyBasePath = '/study',
}: Props) {
    const [expandedIds, setExpandedIds] = useState<number[]>([]);

    const ordered = competencies.filter((c) => c.visible);
    const expandableIds = useMemo(
        () =>
            ordered
                .filter((c) => c.evidences.length > 0 || c.relatedStudies.length > 0)
                .map((c) => c.id),
        [ordered]
    );
    const isAllExpanded =
        expandableIds.length > 0 && expandableIds.every((id) => expandedIds.includes(id));

    const toggle = (id: number) =>
        setExpandedIds((current) =>
            current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
        );
    const toggleAll = () => setExpandedIds(isAllExpanded ? [] : expandableIds);

    const cardStyle =
        'resume-section-card relative rounded-lg border border-slate-200 bg-white p-6 sm:p-8';

    if (ordered.length === 0) return null;

    return (
        <section id="competencies" className="scroll-mt-24 space-y-6">
            <div className={cardStyle}>
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-4">
                    <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                        <Sparkles className="h-5 w-5 text-slate-900" />
                        핵심 역량
                    </h2>
                    {expandableIds.length > 0 && (
                        <button
                            type="button"
                            aria-expanded={isAllExpanded}
                            onClick={toggleAll}
                            className="group/expand inline-flex items-center gap-1 text-[0.6875rem] font-bold leading-4 text-slate-400 transition hover:text-slate-800"
                        >
                            <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform duration-200 ${isAllExpanded ? 'rotate-180' : ''}`}
                            />
                            {isAllExpanded ? '모두 접기' : '모두 펼치기'}
                        </button>
                    )}
                </div>

                <div className="mt-2 divide-y divide-slate-200 border-b border-slate-200">
                    {ordered.map((competency) => (
                        <article
                            key={competency.id}
                            id={`competency-${competency.id}`}
                            className="scroll-mt-24 grid gap-3 py-5 sm:grid-cols-[minmax(200px,0.34fr)_minmax(0,1fr)] sm:gap-6"
                        >
                            <div className="min-w-0">
                                <div>
                                    <h3 className="resume-item-title font-black text-slate-900">
                                        {competency.title}
                                    </h3>
                                </div>
                                {((competency.tags ?? []).length > 0 ||
                                    competency.skills.length > 0) && (
                                    <p className="resume-meta mt-2 font-bold text-slate-500">
                                        {((competency.tags ?? []).length > 0
                                            ? (competency.tags ?? [])
                                            : competency.skills
                                        )
                                            .slice(0, 6)
                                            .map((skill) => skill.name)
                                            .join(' · ')}
                                    </p>
                                )}
                            </div>

                            <div className="min-w-0">
                                <p className="resume-body font-semibold text-slate-700">
                                    {competency.summary}
                                </p>

                                {(competency.evidences.length > 0 ||
                                    competency.relatedStudies.length > 0) && (
                                    <div className="mt-3">
                                        <button
                                            type="button"
                                            onClick={() => toggle(competency.id)}
                                            aria-expanded={expandedIds.includes(competency.id)}
                                            className="flex items-center gap-1.5 text-left"
                                        >
                                            <span className="resume-label font-black text-slate-500">
                                                근거
                                            </span>
                                            <ChevronDown
                                                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${expandedIds.includes(competency.id) ? 'rotate-180 text-slate-800' : ''}`}
                                            />
                                        </button>

                                        {expandedIds.includes(competency.id) && (
                                            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                                {competency.evidences.map((evidence) => (
                                                    <button
                                                        key={`evidence-${evidence.id}`}
                                                        type="button"
                                                        title={evidence.experienceTitle}
                                                        onClick={() => {
                                                            if (
                                                                evidence.experienceType ===
                                                                'PROJECT'
                                                            ) {
                                                                const milestone = milestones.find(
                                                                    (item) =>
                                                                        item.experienceId ===
                                                                        evidence.experienceId
                                                                );
                                                                if (milestone)
                                                                    onSelectMilestone(milestone.id);
                                                                scrollToElement(
                                                                    `project-experience-${evidence.experienceId}`
                                                                );
                                                            } else {
                                                                scrollToSection('career');
                                                            }
                                                        }}
                                                        className="font-semibold text-slate-600 hover:text-slate-900 hover:underline"
                                                    >
                                                        {evidence.experienceType === 'CAREER'
                                                            ? '경력'
                                                            : '프로젝트'}{' '}
                                                        · {evidence.experienceTitle}
                                                    </button>
                                                ))}
                                                {competency.relatedStudies.map((study) => (
                                                    <Link
                                                        key={`study-${study.id}`}
                                                        href={`${studyBasePath}/${encodeURIComponent(study.slug)}`}
                                                        className="font-bold text-blue-700 hover:underline"
                                                    >
                                                        {study.title}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
