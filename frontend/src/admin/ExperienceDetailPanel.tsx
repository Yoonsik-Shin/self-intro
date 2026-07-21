import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Github,
  Pencil,
  Pin,
  PinOff,
  Search,
  Tags,
  Trash2,
  Wrench,
} from 'lucide-react';
import type { Experience } from '../lib/api';
import { adminDetailMarkdownComponents } from '../lib/markdown';

type ExperienceDetailPanelProps = {
  experience: Experience;
  allExperiences?: Experience[];
  parentExperience?: Experience | null;
  onBack: () => void;
  onEdit: (experience: Experience) => void;
  onDelete: (id: number) => void;
  onSelectExperience?: (experience: Experience) => void;
};

const typeLabels: Record<Experience['type'], string> = {
  CAREER: '회사 경력',
  PROJECT: '프로젝트',
  EDUCATION: '학력·교육',
  CERTIFICATE: '자격증',
};

function formatPeriod(start: string, end?: string) {
  return `${start} — ${end ?? '진행 중'}`;
}

export function ExperienceDetailPanel({
  experience,
  allExperiences,
  parentExperience,
  onBack,
  onEdit,
  onDelete,
  onSelectExperience,
}: ExperienceDetailPanelProps) {
  const organization = experience.companyName ?? experience.institutionName ?? experience.issuer;
  const [expandedDetailId, setExpandedDetailId] = useState<number | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);
  const [detailSearch, setDetailSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  const childProjects = experience.type === 'CAREER'
    ? (allExperiences ?? []).filter((item) => item.type === 'PROJECT' && item.careerId === experience.id)
    : [];

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-fadeIn">
      <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 transition hover:text-slate-950 group"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
            {parentExperience ? (
              <span>
                <b className="font-extrabold text-slate-900 group-hover:underline">{parentExperience.title}</b> (경력)으로 돌아가기
              </span>
            ) : (
              '목록으로'
            )}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(experience)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
            >
              <Pencil className="h-3.5 w-3.5" />
              수정
            </button>
            <button
              type="button"
              onClick={() => onDelete(experience.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-bold text-red-500 transition hover:border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              삭제
            </button>
          </div>
        </div>

        <div className="mt-6 max-w-5xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-white">{typeLabels[experience.type]}</span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatPeriod(experience.periodStart, experience.periodEnd)}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${experience.showOnTimeline ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
              {experience.showOnTimeline ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
              {experience.showOnTimeline ? '타임라인 표시' : '타임라인 숨김'}
            </span>
          </div>
          <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{experience.title}</h3>
          {(organization || experience.role) && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
              <Building2 className="h-4 w-4" />
              {[organization, experience.department, experience.role].filter(Boolean).join(' · ')}
            </p>
          )}
          {experience.summary && (
            <div className="mt-4 text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
              <ReactMarkdown components={adminDetailMarkdownComponents}>{experience.summary}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-8 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_260px] lg:py-8">
        <div className="min-w-0 space-y-8">
          {experience.images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {[...experience.images].sort((a, b) => a.displayOrder - b.displayOrder).map((image) => (
                <img
                  key={image.objectKey}
                  src={image.url}
                  alt=""
                  className="h-28 w-28 rounded-xl border border-slate-200 object-cover"
                />
              ))}
            </div>
          )}

          {experience.takeaway && (
            <section className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700">핵심 성과 및 배운 점</h4>
              <div className="mt-2 text-sm leading-relaxed text-emerald-900">
                <ReactMarkdown components={adminDetailMarkdownComponents}>{experience.takeaway}</ReactMarkdown>
              </div>
            </section>
          )}

          {experience.type === 'CAREER' && childProjects.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                <BriefcaseBusiness className="h-4 w-4 text-slate-500" />
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">
                  소속 직장 프로젝트 · {childProjects.length}개
                </h4>
              </div>

              {childProjects.length > 1 && (
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={projectSearch}
                    onChange={(event) => setProjectSearch(event.target.value)}
                    placeholder="소속 프로젝트 검색..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              )}

              <div className="space-y-3">
                {childProjects
                  .map((project, index) => ({ project, index }))
                  .filter(({ project }) => !projectSearch.trim()
                    || project.title.toLowerCase().includes(projectSearch.trim().toLowerCase())
                    || (project.summary && project.summary.toLowerCase().includes(projectSearch.trim().toLowerCase())))
                  .map(({ project, index }) => {
                    const isExpanded = expandedProjectId === project.id;
                    return (
                      <div key={project.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-slate-300">
                        <button
                          type="button"
                          onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                          className="flex w-full items-start gap-3 text-left cursor-pointer"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="font-black leading-snug text-slate-800 text-base sm:text-lg block">
                              {project.title}
                            </span>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                              <span>{formatPeriod(project.periodStart, project.periodEnd)}</span>
                              {project.contributionRate != null && <span>· 기여도 {project.contributionRate}%</span>}
                              {project.role && <span>· {project.role}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {onSelectExperience && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectExperience(project);
                                }}
                                title="이 프로젝트 상세 페이지로 이동"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:bg-white"
                              >
                                <span>상세 이동</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                            ) : (
                              <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="ml-9 mt-4 space-y-4 border-t border-slate-100 pt-3">
                            {project.summary && (
                              <div className="text-sm leading-relaxed text-slate-600">
                                <ReactMarkdown components={adminDetailMarkdownComponents}>{project.summary}</ReactMarkdown>
                              </div>
                            )}

                            {project.takeaway && (
                              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                                <h5 className="text-[11px] font-black uppercase tracking-wider text-emerald-700">핵심 성과 & 배운 점</h5>
                                <div className="mt-1 text-xs leading-relaxed text-emerald-900">
                                  <ReactMarkdown components={adminDetailMarkdownComponents}>{project.takeaway}</ReactMarkdown>
                                </div>
                              </div>
                            )}

                            {project.details && project.details.length > 0 && (
                              <div className="space-y-2 rounded-xl bg-slate-50 p-3 border border-slate-200/70">
                                <p className="text-xs font-black uppercase tracking-wider text-slate-500">세부 이력 (Bullet Points) · {project.details.length}개</p>
                                <ul className="space-y-1.5 list-disc pl-4 text-xs font-medium text-slate-700">
                                  {project.details.map((detail) => (
                                    <li key={detail.id} className="leading-relaxed">
                                      <span className="font-semibold text-slate-800">{detail.content}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {project.skills && project.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {project.skills.map((skill) => (
                                  <span key={skill.id} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                                    {skill.name}{skill.skillVersion ? ` v${skill.skillVersion}` : ''}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                              {project.repositoryUrl ? (
                                <a
                                  href={project.repositoryUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 transition hover:text-slate-950 underline"
                                >
                                  <Github className="h-3.5 w-3.5" /> 저장소 바로가기 <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : <div />}

                              {onSelectExperience && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectExperience(project);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800"
                                >
                                  <span>프로젝트 페이지로 이동</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                {childProjects.length > 0 && projectSearch.trim()
                  && !childProjects.some((project) => project.title.toLowerCase().includes(projectSearch.trim().toLowerCase()) || (project.summary && project.summary.toLowerCase().includes(projectSearch.trim().toLowerCase()))) && (
                  <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs font-semibold text-slate-400">검색 결과가 없습니다.</p>
                )}
              </div>
            </section>
          )}

          {experience.details.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                <BriefcaseBusiness className="h-4 w-4 text-slate-500" />
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">
                  상세 경험 · {experience.details.length}개
                </h4>
              </div>

              {experience.details.length > 1 && (
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={detailSearch}
                    onChange={(event) => setDetailSearch(event.target.value)}
                    placeholder="상세 경험 내용 검색..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              )}

              <div className="space-y-3">
                {experience.details
                  .map((detail, index) => ({ detail, index }))
                  .filter(({ detail }) => !detailSearch.trim()
                    || detail.content.toLowerCase().includes(detailSearch.trim().toLowerCase()))
                  .map(({ detail, index }) => {
                    const isExpanded = expandedDetailId === detail.id;
                    const merged = detail.narrative
                      || [detail.situation, detail.actionDetail, detail.outcome].filter(Boolean).join('\n\n');
                    const hasContent = Boolean(merged) || detail.skills.length > 0;
                    return (
                      <div key={detail.id} className="rounded-xl border border-slate-200 p-4">
                        <button
                          type="button"
                          onClick={() => hasContent && setExpandedDetailId(isExpanded ? null : detail.id)}
                          className={`flex w-full items-start gap-3 text-left ${hasContent ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">{index + 1}</span>
                          <span className="min-w-0 flex-1 font-black leading-snug text-slate-800">{detail.content}</span>
                          {hasContent && (
                            isExpanded
                              ? <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                              : <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="ml-9 mt-3">
                            {merged && (
                              <div className="space-y-3 text-sm leading-relaxed text-slate-600">
                                <ReactMarkdown components={adminDetailMarkdownComponents}>{merged}</ReactMarkdown>
                              </div>
                            )}
                            {detail.skills.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {detail.skills.map((skill) => <span key={skill.id} className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{skill.name}</span>)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                {experience.details.length > 0 && detailSearch.trim()
                  && !experience.details.some((detail) => detail.content.toLowerCase().includes(detailSearch.trim().toLowerCase())) && (
                  <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs font-semibold text-slate-400">검색 결과가 없습니다.</p>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:border-l lg:border-slate-100 lg:pl-6">
          {experience.type === 'PROJECT' && (
            <section className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">프로젝트 정보</p>
              <dl className="mt-2 space-y-2 text-xs">
                <div className="flex justify-between gap-3"><dt className="text-slate-400">역할</dt><dd className="text-right font-bold text-slate-700">{experience.role ?? '-'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-400">기여도</dt><dd className="font-bold text-slate-700">{experience.contributionRate ?? 0}%</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-400">Slug</dt><dd className="truncate font-mono font-bold text-slate-700">{experience.slug ?? '-'}</dd></div>
              </dl>
              {experience.repositoryUrl && (
                <a
                  href={experience.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                >
                  <Github className="h-3.5 w-3.5" /> GitHub 저장소 <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </section>
          )}

          {experience.skills.length > 0 && (
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400"><Wrench className="h-3.5 w-3.5" /> 기술 스택</h4>
              <div className="flex flex-wrap gap-1.5">
                {experience.skills.map((skill) => <span key={skill.id} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{skill.name}{skill.skillVersion ? ` v${skill.skillVersion}` : ''}</span>)}
              </div>
            </section>
          )}

          {experience.tags.length > 0 && (
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400"><Tags className="h-3.5 w-3.5" /> 태그</h4>
              <div className="flex flex-wrap gap-1.5">
                {experience.tags.map((tag) => <span key={tag.id} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">#{tag.name}</span>)}
              </div>
            </section>
          )}

          <section className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            <p><span className="font-bold text-slate-700">정렬 순서</span> {experience.displayOrder}</p>
            {experience.timelineLabel && <p className="mt-1"><span className="font-bold text-slate-700">타임라인 라벨</span> {experience.timelineLabel}</p>}
          </section>
        </aside>
      </div>
    </article>
  );
}
