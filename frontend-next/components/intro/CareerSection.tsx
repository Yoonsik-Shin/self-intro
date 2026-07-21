'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { Briefcase, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ExperienceDetail, RelatedExperience } from '@/lib/api/types';
import type { CareerCard } from '@/lib/introDerivations';
import { resumeMarkdownComponents } from '@/lib/markdown';
import { RelatedStudyNotes } from './RelatedStudyNotes';
import { RelatedExperienceLinks } from './RelatedExperienceLinks';

const badgeStyle = 'bg-slate-50 border border-slate-200/60 text-slate-700 font-bold px-2 py-0.5 rounded-md shadow-sm';
const cardStyle =
  'resume-section-card bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)] transition-all duration-300 relative';

function detailMarkdown(detail: ExperienceDetail) {
  const merged = detail.narrative || [detail.situation, detail.actionDetail, detail.outcome].filter(Boolean).join('\n\n');
  if (!merged) return null;
  return (
    <div className="mt-1 text-[12px] leading-relaxed text-slate-600">
      <ReactMarkdown components={resumeMarkdownComponents}>{merged}</ReactMarkdown>
    </div>
  );
}

type Props = {
  careerCards: CareerCard[];
  careerSummary: string;
  expandedDetailIds: number[];
  onToggleDetail: (id: number) => void;
  expandedProjectIds: number[];
  onToggleProject: (id: number) => void;
  onNavigateRelatedExperience: (experience: RelatedExperience) => void;
};

export function CareerSection({
  careerCards,
  careerSummary,
  expandedDetailIds,
  onToggleDetail,
  expandedProjectIds,
  onToggleProject,
  onNavigateRelatedExperience,
}: Props) {
  if (careerCards.length === 0) return null;

  return (
    <section id="career" className="scroll-mt-24 space-y-6">
      {careerCards.map((career) => (
        <div key={career.id} className={cardStyle}>
          <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 font-black text-slate-900">
            <Briefcase className="h-5 w-5 text-slate-900" />
            직장 경력 (총 {careerSummary})
          </h2>
          <div>
            <span className="inline-flex rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-bold text-slate-950">{career.period}</span>
            <p className="mt-2 font-black text-slate-800">
              {career.companyName} ({career.employmentType})
            </p>
            <p className="font-semibold text-slate-500">
              {career.department} / {career.role}
            </p>
            {career.summary && (
              <div className="mt-3 text-slate-600">
                <ReactMarkdown components={resumeMarkdownComponents}>{career.summary}</ReactMarkdown>
              </div>
            )}

            <ul className="mt-4 space-y-2">
              {career.projects.map((project) => {
                const isProjectExpanded = expandedProjectIds.includes(project.id);
                return (
                  <li key={project.id} className="border-b border-slate-100 last:border-b-0">
                    <button type="button" onClick={() => onToggleProject(project.id)} className="group flex w-full items-start gap-2.5 py-3 text-left">
                      <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${isProjectExpanded ? 'rotate-180 text-slate-800' : 'group-hover:text-slate-600'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-750 group-hover:text-slate-950">{project.title}</span>
                        <span className="mt-0.5 block text-slate-400">
                          {project.periodStart.replace(/-/g, '.').substring(0, 7)} - {project.periodEnd ? project.periodEnd.replace(/-/g, '.').substring(0, 7) : '진행 중'}
                          {project.contributionRate != null ? ` · 기여도 ${project.contributionRate}%` : ''}
                        </span>
                      </span>
                    </button>

                    {isProjectExpanded && (
                      <div className="mb-4">
                        <div className="ml-2 border-l-2 border-slate-200 pl-3">
                          {project.summary && (
                            <div className="mb-3">
                              <h4 className="font-bold uppercase tracking-wider text-slate-400">프로젝트 설명 및 역할</h4>
                              <div className="mt-1 text-slate-600">
                                <ReactMarkdown components={resumeMarkdownComponents}>{project.summary}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                          {project.details.length > 0 && (
                            <div className="mb-1.5 mt-1 flex items-center gap-1.5">
                              <h4 className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700">
                                <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                                상세 경험
                              </h4>
                            </div>
                          )}
                          <ul className="divide-y divide-slate-100">
                            {project.details.map((detail) => {
                              const isExpanded = expandedDetailIds.includes(detail.id);
                              const hasDetailContent = Boolean(detail.situation || detail.actionDetail || detail.outcome);
                              return (
                                <li key={detail.id} id={`experience-detail-${detail.id}`} className="scroll-mt-24 py-1.5 first:pt-0 last:pb-0">
                                  <div
                                    className={`group grid grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-x-2 py-1 ${hasDetailContent ? 'cursor-pointer' : 'cursor-default'}`}
                                    onClick={() => hasDetailContent && onToggleDetail(detail.id)}
                                  >
                                    <span className="flex h-5 items-center justify-center">
                                      {hasDetailContent ? (
                                        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-slate-800' : ''}`} />
                                      ) : (
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                      )}
                                    </span>
                                    <span className="min-w-0 text-slate-700">{detail.content}</span>
                                    {detail.id > 0 && (
                                      <Link
                                        href={`/experience-detail/${detail.id}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`shrink-0 whitespace-nowrap font-bold text-slate-600 transition-opacity hover:text-slate-950 hover:underline ${isExpanded ? 'visible opacity-100' : 'invisible opacity-0'}`}
                                      >
                                        자세히 보기
                                      </Link>
                                    )}
                                  </div>

                                  {hasDetailContent && isExpanded && (
                                    <div className="mb-3 mt-2">
                                      <div className="ml-7 space-y-2.5 text-slate-600">
                                        {detailMarkdown(detail)}
                                        {detail.skills.length > 0 && (
                                          <div className="flex flex-wrap gap-1 pt-1">
                                            {detail.skills.map((skill) => (
                                              <span key={skill.id} className={badgeStyle}>
                                                {skill.name}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        {detail.id > 0 && <RelatedStudyNotes experienceDetailId={detail.id} />}
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

              {career.details.map((detail) => {
                const isExpanded = expandedDetailIds.includes(detail.id);
                const hasDetailContent = Boolean(detail.situation || detail.actionDetail || detail.outcome || detail.skills.length > 0);
                return (
                  <Fragment key={detail.id}>
                    <li
                      id={`experience-detail-${detail.id}`}
                      className={`list-none scroll-mt-24 transition-all duration-300 ${isExpanded ? 'mb-6 border-b border-slate-200/50 pb-6 last:mb-0 last:border-0 last:pb-0' : 'border-b border-transparent'}`}
                    >
                      <div
                        className={`group flex items-start justify-between gap-3 rounded-lg px-2 py-1 -mx-2 transition hover:bg-slate-50 ${hasDetailContent ? 'cursor-pointer' : 'cursor-default'}`}
                        onClick={() => hasDetailContent && onToggleDetail(detail.id)}
                      >
                        <span className={`flex items-start gap-2.5 font-normal transition ${hasDetailContent ? 'text-slate-700 group-hover:font-semibold group-hover:text-slate-900' : 'text-slate-500'}`}>
                          {hasDetailContent ? (
                            <ChevronDown className={`mt-1.5 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-slate-800' : 'group-hover:text-slate-600'}`} />
                          ) : (
                            <span className="ml-1.5 mr-1 mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                          )}
                          {detail.content}
                        </span>
                        {detail.id > 0 && (
                          <Link
                            href={`/experience-detail/${detail.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className={`shrink-0 whitespace-nowrap font-bold text-slate-800 transition-opacity duration-200 hover:text-slate-950 hover:underline ${isExpanded ? 'visible opacity-100' : 'invisible opacity-0'}`}
                          >
                            자세히 보기
                          </Link>
                        )}
                      </div>
                      {hasDetailContent && isExpanded && (
                        <div className="mt-3">
                          <div className="ml-6 space-y-3.5 text-slate-600">
                            {detailMarkdown(detail)}
                            {detail.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {detail.skills.map((s) => (
                                  <span key={s.id} className={badgeStyle}>
                                    {s.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            {detail.id > 0 && <RelatedStudyNotes experienceDetailId={detail.id} />}
                          </div>
                        </div>
                      )}
                    </li>
                  </Fragment>
                );
              })}
            </ul>
            {career.id > 0 && <RelatedExperienceLinks experienceId={career.id} onNavigate={onNavigateRelatedExperience} />}
          </div>
        </div>
      ))}
    </section>
  );
}
