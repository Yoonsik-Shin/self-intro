'use client';

import { Fragment, useMemo } from 'react';
import Link from 'next/link';
import { Briefcase, ChevronDown, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ExperienceDetail, RelatedExperience } from '@/lib/api/types';
import type { CareerCard } from '@/lib/introDerivations';
import { resumeMarkdownComponents } from '@/lib/markdown';
import { RelatedStudyNotes } from './RelatedStudyNotes';
import { RelatedExperienceLinks } from './RelatedExperienceLinks';

function getExpandableDetailIds(details: ExperienceDetail[]) {
    return details
        .filter((detail) =>
            Boolean(
                detail.situation ||
                detail.actionDetail ||
                detail.outcome ||
                detail.skills.length > 0
            )
        )
        .map((detail) => detail.id);
}

const badgeStyle =
    'resume-badge bg-slate-50 border border-slate-200/60 text-slate-700 font-bold px-2 py-0.5 rounded-md shadow-sm';
const detailBadgeStyle =
    'text-[11px] bg-slate-50 border border-slate-200/70 text-slate-700 font-bold px-1.5 py-0.5 rounded';
const cardStyle =
    'resume-section-card bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)] transition-all duration-300 relative';

function detailMarkdown(detail: ExperienceDetail) {
    const merged =
        detail.narrative ||
        [detail.situation, detail.actionDetail, detail.outcome].filter(Boolean).join('\n\n');
    if (!merged) return null;
    return (
        <div className="mt-0.5 !text-[13.5px] leading-relaxed text-slate-600 [&_p]:!text-[13.5px] [&_li]:!text-[13.5px]">
            <ReactMarkdown components={resumeMarkdownComponents}>{merged}</ReactMarkdown>
        </div>
    );
}

type Props = {
    careerCards: CareerCard[];
    careerSummary: string;
    expandedDetailIds: number[];
    onToggleDetail: (id: number) => void;
    onSetExpandedDetailIds: (ids: number[]) => void;
    expandedProjectIds: number[];
    onToggleProject: (id: number) => void;
    onSetExpandedProjectIds: (ids: number[]) => void;
    onNavigateRelatedExperience: (experience: RelatedExperience) => void;
};

export function CareerSection({
    careerCards,
    careerSummary,
    expandedDetailIds,
    onToggleDetail,
    onSetExpandedDetailIds,
    expandedProjectIds,
    onToggleProject,
    onSetExpandedProjectIds,
    onNavigateRelatedExperience,
}: Props) {
    const expandableDetailIds = useMemo(
        () =>
            careerCards
                .flatMap((career) => [
                    ...career.details,
                    ...career.projects.flatMap((project) => project.details),
                ])
                .filter((d) =>
                    Boolean(d.situation || d.actionDetail || d.outcome || d.skills.length > 0)
                )
                .map((d) => d.id),
        [careerCards]
    );
    const expandableProjectIds = useMemo(
        () => careerCards.flatMap((career) => career.projects.map((project) => project.id)),
        [careerCards]
    );
    const isAllExpanded =
        (expandableDetailIds.length > 0 || expandableProjectIds.length > 0) &&
        expandableDetailIds.every((id) => expandedDetailIds.includes(id)) &&
        expandableProjectIds.every((id) => expandedProjectIds.includes(id));
    const toggleExpandAll = () => {
        if (isAllExpanded) {
            onSetExpandedDetailIds([]);
            onSetExpandedProjectIds([]);
        } else {
            onSetExpandedDetailIds(expandableDetailIds);
            onSetExpandedProjectIds(expandableProjectIds);
        }
    };

    if (careerCards.length === 0) return null;

    return (
        <section id="career" className="scroll-mt-24 space-y-6">
            {careerCards.map((career) => (
                <div key={career.id} className={cardStyle}>
                    <h2 className="resume-section-title mb-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-3 font-black text-slate-900">
                        <span className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-slate-900" />
                            직장 경력 (총 {careerSummary})
                        </span>
                        {(expandableDetailIds.length > 0 || expandableProjectIds.length > 0) && (
                            <button
                                type="button"
                                aria-expanded={isAllExpanded}
                                onClick={toggleExpandAll}
                                className="group/expand inline-flex items-center gap-1 text-[0.6875rem] font-bold leading-4 text-slate-400 transition hover:text-slate-800"
                            >
                                <ChevronDown
                                    className={`h-3.5 w-3.5 transition-transform duration-200 ${isAllExpanded ? 'rotate-180' : ''}`}
                                />
                                {isAllExpanded ? '모두 접기' : '모두 펼치기'}
                            </button>
                        )}
                    </h2>
                    <div>
                        <span className="resume-meta inline-flex rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-bold text-slate-950">
                            {career.period}
                        </span>
                        <p className="resume-item-title mt-2 font-black text-slate-800">
                            <Link
                                href={`/experience/${career.id}`}
                                className="group/company inline-flex items-center gap-1.5 transition hover:text-blue-600 hover:underline"
                            >
                                <span>
                                    {career.companyName} ({career.employmentType})
                                </span>
                                <ExternalLink className="h-4 w-4 shrink-0 text-blue-600 opacity-40 transition-opacity group-hover/company:opacity-100" />
                            </Link>
                        </p>
                        <p className="resume-meta font-semibold text-slate-500">
                            {career.department} / {career.role}
                        </p>
                        {career.summary && (
                            <div className="resume-body mt-3 text-slate-600">
                                <ReactMarkdown components={resumeMarkdownComponents}>
                                    {career.summary}
                                </ReactMarkdown>
                            </div>
                        )}
                        <ul className="mt-4 space-y-2">
                            {career.projects.map((project) => {
                                const isProjectExpanded = expandedProjectIds.includes(project.id);
                                return (
                                    <li
                                        key={project.id}
                                        className="border-b border-slate-100 last:border-b-0"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => onToggleProject(project.id)}
                                            className="group flex w-full items-start gap-2.5 py-3 text-left"
                                        >
                                            <ChevronDown
                                                className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${isProjectExpanded ? 'rotate-180 text-slate-800' : 'group-hover:text-slate-600'}`}
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="resume-body block font-semibold text-slate-750 group-hover:text-slate-950">
                                                    {project.title}
                                                </span>
                                                <span className="resume-meta mt-0.5 block text-slate-400">
                                                    {project.periodStart ? (
                                                        <>
                                                            {project.periodStart
                                                                .replace(/-/g, '.')
                                                                .substring(0, 7)}{' '}
                                                            -{' '}
                                                            {project.periodEnd
                                                                ? project.periodEnd
                                                                      .replace(/-/g, '.')
                                                                      .substring(0, 7)
                                                                : '진행 중'}
                                                            {project.contributionRate != null
                                                                ? ` · 기여도 ${project.contributionRate}%`
                                                                : ''}
                                                        </>
                                                    ) : (
                                                        <span className="font-medium text-slate-500">
                                                            TF 활동 · 조직/프로세스 개선
                                                        </span>
                                                    )}
                                                </span>
                                            </span>
                                        </button>

                                        {isProjectExpanded && (
                                            <div className="mb-5 ml-1.5 border-l-2 border-slate-200/70 pl-4 pt-3 space-y-4">
                                                <div>
                                                    {project.summary && (
                                                        <div className="mb-4">
                                                            <h4 className="resume-label font-bold uppercase tracking-wider text-slate-400">
                                                                프로젝트 설명 및 역할
                                                            </h4>
                                                            <div className="resume-body mt-1 text-slate-600">
                                                                <ReactMarkdown
                                                                    components={
                                                                        resumeMarkdownComponents
                                                                    }
                                                                >
                                                                    {project.summary}
                                                                </ReactMarkdown>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {project.details.filter(
                                                        (d) => d.visible !== false
                                                    ).length > 0 &&
                                                        (() => {
                                                            const visibleDetails =
                                                                project.details.filter(
                                                                    (d) => d.visible !== false
                                                                );
                                                            const projectExpandableDetailIds =
                                                                visibleDetails
                                                                    .filter((d) =>
                                                                        Boolean(
                                                                            d.situation ||
                                                                            d.actionDetail ||
                                                                            d.outcome ||
                                                                            d.skills.length > 0
                                                                        )
                                                                    )
                                                                    .map((d) => d.id);
                                                            const isProjectDetailsAllExpanded =
                                                                projectExpandableDetailIds.length >
                                                                    0 &&
                                                                projectExpandableDetailIds.every(
                                                                    (id) =>
                                                                        expandedDetailIds.includes(
                                                                            id
                                                                        )
                                                                );

                                                            return (
                                                                <div className="mb-2.5 flex items-center justify-between gap-3 pt-1">
                                                                    <h4 className="resume-label flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700">
                                                                        <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                                                                        상세 경험
                                                                    </h4>
                                                                    {projectExpandableDetailIds.length >
                                                                        0 && (
                                                                        <button
                                                                            type="button"
                                                                            aria-expanded={
                                                                                isProjectDetailsAllExpanded
                                                                            }
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (
                                                                                    isProjectDetailsAllExpanded
                                                                                ) {
                                                                                    onSetExpandedDetailIds(
                                                                                        expandedDetailIds.filter(
                                                                                            (id) =>
                                                                                                !projectExpandableDetailIds.includes(
                                                                                                    id
                                                                                                )
                                                                                        )
                                                                                    );
                                                                                } else {
                                                                                    onSetExpandedDetailIds(
                                                                                        Array.from(
                                                                                            new Set(
                                                                                                [
                                                                                                    ...expandedDetailIds,
                                                                                                    ...projectExpandableDetailIds,
                                                                                                ]
                                                                                            )
                                                                                        )
                                                                                    );
                                                                                }
                                                                            }}
                                                                            className="group/expand inline-flex items-center gap-1 text-[0.6875rem] font-bold leading-4 text-slate-400 transition hover:text-slate-800"
                                                                        >
                                                                            <ChevronDown
                                                                                className={`h-3.5 w-3.5 transition-transform duration-200 ${isProjectDetailsAllExpanded ? 'rotate-180' : ''}`}
                                                                            />
                                                                            {isProjectDetailsAllExpanded
                                                                                ? '모두 접기'
                                                                                : '모두 펼치기'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    <ul className="divide-y divide-slate-100">
                                                        {project.details
                                                            .filter((d) => d.visible !== false)
                                                            .map((detail) => {
                                                                const isExpanded =
                                                                    expandedDetailIds.includes(
                                                                        detail.id
                                                                    );
                                                                const hasDetailContent = Boolean(
                                                                    detail.situation ||
                                                                    detail.actionDetail ||
                                                                    detail.outcome
                                                                );
                                                                return (
                                                                    <li
                                                                        key={detail.id}
                                                                        id={`experience-detail-${detail.id}`}
                                                                        className="scroll-mt-24 py-1 first:pt-0 last:pb-0"
                                                                    >
                                                                        <div
                                                                            className={`group grid grid-cols-[16px_minmax(0,1fr)_auto] items-start gap-x-2 py-0.5 ${hasDetailContent ? 'cursor-pointer' : 'cursor-default'}`}
                                                                            onClick={() =>
                                                                                hasDetailContent &&
                                                                                onToggleDetail(
                                                                                    detail.id
                                                                                )
                                                                            }
                                                                        >
                                                                            <span className="flex h-5 items-center justify-center">
                                                                                {hasDetailContent ? (
                                                                                    <ChevronDown
                                                                                        className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-slate-800' : ''}`}
                                                                                    />
                                                                                ) : (
                                                                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                                                                )}
                                                                            </span>
                                                                            <span className="resume-body min-w-0 text-slate-700">
                                                                                {detail.content}
                                                                            </span>
                                                                            {detail.id > 0 && (
                                                                                <Link
                                                                                    href={`/experience/${project.id}/experience-detail/${detail.id}`}
                                                                                    onClick={(e) =>
                                                                                        e.stopPropagation()
                                                                                    }
                                                                                    className={`resume-meta shrink-0 whitespace-nowrap font-bold text-slate-600 transition-opacity hover:text-slate-950 hover:underline ${isExpanded ? 'visible opacity-100' : 'invisible opacity-0'}`}
                                                                                >
                                                                                    자세히 보기
                                                                                </Link>
                                                                            )}
                                                                        </div>

                                                                        {hasDetailContent &&
                                                                            isExpanded && (
                                                                                <div className="mb-2 mt-0.5">
                                                                                    <div className="resume-body ml-7 space-y-2.5 text-slate-600">
                                                                                        {detailMarkdown(
                                                                                            detail
                                                                                        )}
                                                                                        {detail
                                                                                            .skills
                                                                                            .length >
                                                                                            0 && (
                                                                                            <div className="flex flex-wrap gap-1 pt-1">
                                                                                                {detail.skills.map(
                                                                                                    (
                                                                                                        skill
                                                                                                    ) => (
                                                                                                        <span
                                                                                                            key={
                                                                                                                skill.id
                                                                                                            }
                                                                                                            className={
                                                                                                                detailBadgeStyle
                                                                                                            }
                                                                                                        >
                                                                                                            {
                                                                                                                skill.name
                                                                                                            }
                                                                                                        </span>
                                                                                                    )
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                        {detail.id >
                                                                                            0 && (
                                                                                            <RelatedStudyNotes
                                                                                                experienceDetailId={
                                                                                                    detail.id
                                                                                                }
                                                                                            />
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                    </li>
                                                                );
                                                            })}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                        <ul className="mt-4 space-y-2">
                            {career.details.map((detail) => {
                                const isExpanded = expandedDetailIds.includes(detail.id);
                                const hasDetailContent = Boolean(
                                    detail.situation ||
                                    detail.actionDetail ||
                                    detail.outcome ||
                                    detail.skills.length > 0
                                );
                                return (
                                    <Fragment key={detail.id}>
                                        <li
                                            id={`experience-detail-${detail.id}`}
                                            className={`list-none scroll-mt-24 transition-all duration-300 ${isExpanded ? 'mb-6 border-b border-slate-200/50 pb-6 last:mb-0 last:border-0 last:pb-0' : 'border-b border-transparent'}`}
                                        >
                                            <div
                                                className={`group flex items-start justify-between gap-3 rounded-lg px-2 py-1 -mx-2 transition hover:bg-slate-50 ${hasDetailContent ? 'cursor-pointer' : 'cursor-default'}`}
                                                onClick={() =>
                                                    hasDetailContent && onToggleDetail(detail.id)
                                                }
                                            >
                                                <span
                                                    className={`resume-body flex items-start gap-2.5 font-normal transition ${hasDetailContent ? 'text-slate-700 group-hover:font-semibold group-hover:text-slate-900' : 'text-slate-500'}`}
                                                >
                                                    {hasDetailContent ? (
                                                        <ChevronDown
                                                            className={`mt-1.5 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-slate-800' : 'group-hover:text-slate-600'}`}
                                                        />
                                                    ) : (
                                                        <span className="ml-1.5 mr-1 mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                                                    )}
                                                    {detail.content}
                                                </span>
                                                {detail.id > 0 && (
                                                    <Link
                                                        href={`/experience/${career.id}/experience-detail/${detail.id}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={`resume-meta shrink-0 whitespace-nowrap font-bold text-slate-800 transition-opacity duration-200 hover:text-slate-950 hover:underline ${isExpanded ? 'visible opacity-100' : 'invisible opacity-0'}`}
                                                    >
                                                        자세히 보기
                                                    </Link>
                                                )}
                                            </div>
                                            {hasDetailContent && isExpanded && (
                                                <div className="mt-0.5">
                                                    <div className="resume-body ml-6 space-y-3.5 text-slate-600">
                                                        {detailMarkdown(detail)}
                                                        {detail.skills.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 pt-1">
                                                                {detail.skills.map((s) => (
                                                                    <span
                                                                        key={s.id}
                                                                        className={badgeStyle}
                                                                    >
                                                                        {s.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {detail.id > 0 && (
                                                            <RelatedStudyNotes
                                                                experienceDetailId={detail.id}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </li>
                                    </Fragment>
                                );
                            })}
                        </ul>
                        {career.id > 0 && (
                            <RelatedExperienceLinks
                                experienceId={career.id}
                                onNavigate={onNavigateRelatedExperience}
                            />
                        )}
                    </div>
                </div>
            ))}
        </section>
    );
}
