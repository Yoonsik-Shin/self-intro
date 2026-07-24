'use client';

import Link from 'next/link';
import { Briefcase, ChevronDown, ExternalLink, Github, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ExperienceDetail, RelatedExperience } from '@/lib/api/types';
import type { Milestone } from '@/lib/introDerivations';
import { resumeMarkdownComponents } from '@/lib/markdown';
import { RelatedStudyNotes } from './RelatedStudyNotes';
import { RelatedExperienceLinks } from './RelatedExperienceLinks';

const badgeStyle =
    'resume-badge bg-slate-50 border border-slate-200/60 text-slate-700 font-bold px-2 py-0.5 rounded-md shadow-sm';
const cardStyle =
    'resume-section-card bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)] transition-all duration-300 relative';

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

type Props = {
    milestones: Milestone[];
    selectedMilestoneId: string | null;
    onSelectMilestone: (id: string) => void;
    expandedDetailIds: number[];
    onToggleDetail: (id: number) => void;
    onSetExpandedDetailIds: (ids: number[]) => void;
    onNavigateRelatedExperience: (experience: RelatedExperience) => void;
};

export function ProjectsSection({
    milestones,
    selectedMilestoneId,
    onSelectMilestone,
    expandedDetailIds,
    onToggleDetail,
    onSetExpandedDetailIds,
    onNavigateRelatedExperience,
}: Props) {
    const areAllDetailsExpanded = (details: ExperienceDetail[]) => {
        const ids = getExpandableDetailIds(details);
        return ids.length > 0 && ids.every((id) => expandedDetailIds.includes(id));
    };
    const toggleAllDetails = (details: ExperienceDetail[]) => {
        const ids = getExpandableDetailIds(details);
        if (ids.length === 0) return;
        const shouldCollapse = ids.every((id) => expandedDetailIds.includes(id));
        onSetExpandedDetailIds(
            shouldCollapse
                ? expandedDetailIds.filter((id) => !ids.includes(id))
                : [...new Set([...expandedDetailIds, ...ids])]
        );
    };
    const allMilestoneDetails = milestones.flatMap((m) => m.details);

    return (
        <section id="projects" className="scroll-mt-24 space-y-6">
            <div className={cardStyle}>
                <div className="resume-projects-header border-b border-slate-100 pb-4">
                    <h2 className="resume-section-title flex items-center justify-between gap-2 font-black text-slate-900">
                        <span className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-slate-900" />
                            핵심 프로젝트 포트폴리오
                        </span>
                        {getExpandableDetailIds(allMilestoneDetails).length > 0 && (
                            <button
                                type="button"
                                aria-expanded={areAllDetailsExpanded(allMilestoneDetails)}
                                onClick={() => toggleAllDetails(allMilestoneDetails)}
                                className="group/expand inline-flex items-center gap-1 text-[0.6875rem] font-bold leading-4 text-slate-400 transition hover:text-slate-800"
                            >
                                <ChevronDown
                                    className={`h-3.5 w-3.5 transition-transform duration-200 ${areAllDetailsExpanded(allMilestoneDetails) ? 'rotate-180' : ''}`}
                                />
                                {areAllDetailsExpanded(allMilestoneDetails)
                                    ? '모두 접기'
                                    : '모두 펼치기'}
                            </button>
                        )}
                    </h2>
                    <p className="resume-section-description mt-1 text-slate-500">
                        담당 역할, 설계 세부 사항, 핵심 성과 및 실무 성과에 대한 타임라인
                        상세입니다.
                    </p>
                </div>

                <div
                    className={`resume-project-list relative mt-8 space-y-8 ${milestones.length > 0 ? 'before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-[2px] before:bg-slate-200' : ''}`}
                >
                    {milestones.length === 0 && (
                        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-semibold text-slate-400">
                            편성된 핵심 프로젝트가 없습니다.
                        </p>
                    )}
                    {milestones.map((m) => (
                        <div
                            key={m.id}
                            id={`project-experience-${m.experienceId ?? m.id}`}
                            className="resume-project-item group relative cursor-pointer pl-10"
                            onClick={() => onSelectMilestone(m.id)}
                        >
                            <div
                                className={`resume-project-bullet absolute left-[7px] top-1.5 z-10 h-[18px] w-[18px] rounded-full border-4 border-white shadow-sm transition-colors ${selectedMilestoneId === m.id ? 'scale-110 bg-slate-900' : 'bg-slate-300 group-hover:bg-slate-500'}`}
                            />

                            <div
                                className={`resume-project-card space-y-4 rounded-xl border p-6 shadow-sm transition-all duration-300 ${selectedMilestoneId === m.id ? 'border-slate-800 bg-white ring-2 ring-slate-100/50' : 'border-slate-200/80 bg-slate-50/50 hover:border-slate-400 hover:bg-white'}`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                    <div>
                                        <span className="resume-meta inline-flex rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-bold text-slate-950">
                                            {m.role} ({m.period})
                                        </span>
                                        <h3 className="resume-item-title mt-1.5 font-black text-slate-800">
                                            {m.title}
                                        </h3>
                                    </div>
                                    {m.repositoryUrl && (
                                        <a
                                            href={m.repositoryUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(event) => event.stopPropagation()}
                                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                                        >
                                            <Github className="h-4 w-4" />
                                            GitHub 저장소
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="resume-label font-bold uppercase tracking-wider text-slate-400">
                                            프로젝트 설명 및 역할
                                            {m.contributionRate != null
                                                ? ` · 기여도 ${m.contributionRate}%`
                                                : ''}
                                        </h4>
                                        <div className="resume-project-description resume-body mt-1 font-normal text-slate-600">
                                            <ReactMarkdown components={resumeMarkdownComponents}>
                                                {m.description}
                                            </ReactMarkdown>
                                        </div>
                                    </div>

                                    {m.tags.length > 0 && (
                                        <div>
                                            <h4 className="resume-label mb-1.5 font-bold uppercase tracking-wider text-slate-400">
                                                태그
                                            </h4>
                                            <div className="flex flex-wrap gap-1">
                                                {m.tags.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="resume-badge rounded-md bg-blue-50 px-2 py-1 font-bold text-blue-700"
                                                    >
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {m.details.length > 0 && (
                                        <div className="border-t border-slate-100 pt-3">
                                            <div className="resume-detail-header mb-2.5 flex items-center justify-between gap-3">
                                                <h4 className="resume-label flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700">
                                                    <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                                                    상세 경험
                                                </h4>
                                                {getExpandableDetailIds(m.details).length > 0 && (
                                                    <button
                                                        type="button"
                                                        aria-expanded={areAllDetailsExpanded(
                                                            m.details
                                                        )}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            toggleAllDetails(m.details);
                                                        }}
                                                        className="group/expand inline-flex items-center gap-1 text-[0.6875rem] font-bold leading-4 text-slate-400 transition hover:text-slate-800"
                                                    >
                                                        <ChevronDown
                                                            className={`h-3.5 w-3.5 transition-transform duration-200 ${areAllDetailsExpanded(m.details) ? 'rotate-180' : ''}`}
                                                        />
                                                        {areAllDetailsExpanded(m.details)
                                                            ? '모두 접기'
                                                            : '모두 펼치기'}
                                                    </button>
                                                )}
                                            </div>
                                            <ul className="divide-y divide-slate-100">
                                                {m.details.map((detail) => {
                                                    const isExpanded = expandedDetailIds.includes(
                                                        detail.id
                                                    );
                                                    const hasDetailContent = Boolean(
                                                        detail.situation ||
                                                        detail.actionDetail ||
                                                        detail.outcome ||
                                                        detail.skills.length > 0
                                                    );
                                                    const merged =
                                                        detail.narrative ||
                                                        [
                                                            detail.situation,
                                                            detail.actionDetail,
                                                            detail.outcome,
                                                        ]
                                                            .filter(Boolean)
                                                            .join('\n\n');
                                                    return (
                                                        <li
                                                            key={detail.id}
                                                            id={`experience-detail-${detail.id}`}
                                                            className="scroll-mt-24 py-1.5 first:pt-0.5 last:pb-0.5"
                                                        >
                                                            <div
                                                                className={`group grid grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-x-2.5 rounded-md py-1 transition ${hasDetailContent ? 'cursor-pointer' : 'cursor-default'}`}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    if (hasDetailContent)
                                                                        onToggleDetail(detail.id);
                                                                }}
                                                            >
                                                                <span className="flex h-5 items-center justify-center">
                                                                    {hasDetailContent ? (
                                                                        <ChevronDown
                                                                            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-slate-800' : 'group-hover:text-slate-600'}`}
                                                                        />
                                                                    ) : (
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                                                    )}
                                                                </span>
                                                                <span
                                                                    className={`resume-body min-w-0 text-sm leading-5 transition sm:text-[0.9375rem] ${hasDetailContent ? 'font-medium text-slate-700 group-hover:text-slate-900' : 'text-slate-500'}`}
                                                                >
                                                                    {detail.content}
                                                                </span>
                                                                {detail.id > 0 && (
                                                                    <Link
                                                                        href={`/experience/${m.id}/experience-detail/${detail.id}`}
                                                                        onClick={(event) =>
                                                                            event.stopPropagation()
                                                                        }
                                                                        className={`resume-meta shrink-0 whitespace-nowrap font-bold text-slate-600 transition-opacity duration-200 hover:text-slate-950 hover:underline ${isExpanded ? 'visible opacity-100' : 'invisible opacity-0'}`}
                                                                    >
                                                                        자세히 보기
                                                                    </Link>
                                                                )}
                                                            </div>

                                                            {hasDetailContent && isExpanded && (
                                                                <div className="mt-0.5">
                                                                    <div className="resume-body ml-[30px] space-y-2.5 text-slate-600">
                                                                        {merged && (
                                                                            <div className="mt-0.5 !text-[13.5px] leading-relaxed [&_p]:!text-[13.5px] [&_li]:!text-[13.5px]">
                                                                                <ReactMarkdown
                                                                                    components={
                                                                                        resumeMarkdownComponents
                                                                                    }
                                                                                >
                                                                                    {merged}
                                                                                </ReactMarkdown>
                                                                            </div>
                                                                        )}
                                                                        {detail.skills.length >
                                                                            0 && (
                                                                            <div className="flex flex-wrap gap-1 pt-1">
                                                                                {detail.skills.map(
                                                                                    (skill) => (
                                                                                        <span
                                                                                            key={
                                                                                                skill.id
                                                                                            }
                                                                                            className={
                                                                                                badgeStyle
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
                                                                        {detail.id > 0 && (
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
                                    )}

                                    {m.experienceId && (
                                        <RelatedExperienceLinks
                                            experienceId={m.experienceId}
                                            onNavigate={onNavigateRelatedExperience}
                                        />
                                    )}

                                    {m.takeaway && (
                                        <div className="resume-project-takeaway border-t border-slate-100 pt-3.5">
                                            <h4 className="resume-label flex items-center gap-1 font-bold text-emerald-700">
                                                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                                                핵심 성과 & 배운 점 (Takeaway)
                                            </h4>
                                            <div className="resume-body mt-1 font-semibold text-emerald-800">
                                                <ReactMarkdown
                                                    components={resumeMarkdownComponents}
                                                >
                                                    {m.takeaway}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="resume-label mb-1.5 font-bold uppercase tracking-wider text-slate-400">
                                            활용 기술 스택
                                        </h4>
                                        <div className="flex flex-wrap gap-1">
                                            {m.skills.map((skill) => (
                                                <span key={skill} className={badgeStyle}>
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
