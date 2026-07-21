'use client';

import { useMemo, useState } from 'react';
import { Calendar, FolderGit2 } from 'lucide-react';
import type { Experience } from '@/lib/api/types';
import { scrollToSection } from '@/lib/scroll';

type Props = {
  experiences: Experience[];
  onSelectMilestone: (id: string) => void;
};

export function TimelineSection({ experiences, onSelectMilestone }: Props) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const timelineExperiences = useMemo(() => experiences.filter((exp) => exp.showOnTimeline), [experiences]);

  const range = useMemo(() => {
    const now = new Date();
    const dates = timelineExperiences.flatMap((exp) => [new Date(exp.periodStart), exp.periodEnd ? new Date(exp.periodEnd) : now]);
    if (dates.length === 0) return { startYear: now.getFullYear() - 1, endYear: now.getFullYear() };
    const minYear = Math.min(...dates.map((d) => d.getFullYear()));
    const maxYear = Math.max(...dates.map((d) => d.getFullYear()));
    return { startYear: minYear, endYear: Math.max(maxYear, minYear + 1) };
  }, [timelineExperiences]);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = range.startYear; y <= range.endYear; y++) list.push(y);
    return list;
  }, [range]);

  const rangeStartMs = new Date(`${range.startYear}-01-01`).getTime();
  const rangeEndMs = new Date(`${range.endYear + 1}-01-01`).getTime();
  const rangeSpanMs = rangeEndMs - rangeStartMs;

  const percentFor = (dateStr: string) => {
    const ms = new Date(dateStr).getTime();
    return Math.min(100, Math.max(0, ((ms - rangeStartMs) / rangeSpanMs) * 100));
  };
  const widthFor = (startStr: string, endStr?: string) => {
    const startMs = new Date(startStr).getTime();
    const endMs = endStr ? new Date(endStr).getTime() : Date.now();
    return Math.max(2, ((endMs - startMs) / rangeSpanMs) * 100);
  };
  const isYearActive = (startStr: string, endStr?: string) => {
    if (selectedYear === null) return true;
    const startYear = new Date(startStr).getFullYear();
    const endYear = endStr ? new Date(endStr).getFullYear() : new Date().getFullYear();
    return selectedYear >= startYear && selectedYear <= endYear;
  };
  const dimClass = (startStr: string, endStr?: string) => (isYearActive(startStr, endStr) ? 'opacity-100' : 'opacity-20 grayscale');
  const shortDate = (dateStr: string) => {
    const [y, m] = dateStr.split('-');
    return `${y.slice(2)}.${m}`;
  };
  const longDate = (dateStr: string) => {
    const [y, m] = dateStr.split('-');
    return `${y}.${m}`;
  };
  const tooltip = (exp: Experience, isPoint: boolean) =>
    isPoint ? `${exp.title} (${shortDate(exp.periodStart)})` : `${exp.title} (${longDate(exp.periodStart)} - ${exp.periodEnd ? longDate(exp.periodEnd) : '진행 중'})`;

  const onItemClick = (exp: Experience) => {
    if (exp.type === 'PROJECT') {
      onSelectMilestone(exp.slug ?? exp.id.toString());
      scrollToSection('projects');
    } else if (exp.type === 'EDUCATION' || exp.type === 'CERTIFICATE') {
      scrollToSection('credentials');
    } else {
      scrollToSection('career');
    }
  };

  const pointItems = timelineExperiences.filter((exp) => (exp.type === 'EDUCATION' || exp.type === 'CERTIFICATE') && exp.periodEnd && exp.periodStart === exp.periodEnd);
  const courseItems = timelineExperiences.filter((exp) => exp.type === 'EDUCATION' && !(exp.periodEnd && exp.periodStart === exp.periodEnd));
  const careerItems = timelineExperiences.filter((exp) => exp.type === 'CAREER');
  const projectItems = [...timelineExperiences.filter((exp) => exp.type === 'PROJECT')].sort((a, b) => a.periodStart.localeCompare(b.periodStart));

  const cardStyle =
    'resume-section-card bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)] transition-all duration-300 relative';

  return (
    <section id="timeline" className="scroll-mt-24 space-y-6 print:hidden">
      <div className={cardStyle}>
        <div className="border-b border-slate-100 pb-3">
          <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
            <Calendar className="h-5 w-5 text-slate-900" />
            커리어 & 학습 타임라인
          </h2>
          <p className="resume-section-description mt-1 text-slate-500">
            자격증 취득, 교육 수강, 실무 경력 및 프로젝트 이력을 한눈에 보는 타임라인입니다. 요소를 클릭하면 해당 위치로 스크롤됩니다.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-white bg-blue-600 shadow-sm" />
              자격증/학력 취득
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-3.5 rounded bg-gradient-to-r from-blue-500 to-slate-800" />
              교육 수강
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-3.5 rounded bg-gradient-to-r from-violet-600 to-slate-900" />
              실무 경력
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-3.5 rounded bg-gradient-to-r from-pink-500 to-rose-500" />
              <FolderGit2 className="h-3 w-3 text-rose-500" />
              프로젝트
            </span>
          </div>
          {years.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedYear(null)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${selectedYear === null ? 'bg-slate-900 text-white shadow-sm' : 'border border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
              >
                전체 기간
              </button>
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear((current) => (current === year ? null : year))}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${selectedYear === year ? 'bg-slate-900 text-white shadow-sm' : 'border border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>

        {timelineExperiences.length === 0 ? (
          <p className="py-10 text-center text-sm font-bold text-slate-400">타임라인에 표시할 항목이 없습니다.</p>
        ) : (
          <div className="relative mt-8 select-none">
            <div className="relative flex h-8 items-center border-b border-slate-100">
              <div className="w-36 shrink-0" />
              <div className="relative h-full flex-1 text-xs font-black text-slate-400">
                {years.map((year) => (
                  <div key={year} className="absolute -translate-x-1/2" style={{ left: `${percentFor(`${year}-01-01`)}%` }}>
                    {year}
                  </div>
                ))}
              </div>
            </div>

            <div className="pointer-events-none absolute inset-y-0 left-36 right-0 top-8 z-0">
              {years.map((year) => (
                <div key={year} className="absolute bottom-0 top-0 w-[1px] border-l border-dashed border-slate-200" style={{ left: `${percentFor(`${year}-01-01`)}%` }} />
              ))}
            </div>

            <div className="mt-4 space-y-4 pb-2">
              {pointItems.length > 0 && (
                <div className="relative flex h-10 items-center">
                  <div className="w-36 shrink-0 text-sm font-black text-slate-500">자격증 및 학력</div>
                  <div className="relative h-full flex-1">
                    {pointItems.map((exp) => (
                      <div
                        key={exp.id}
                        style={{ left: `${percentFor(exp.periodStart)}%` }}
                        className="group/item absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                        onClick={() => onItemClick(exp)}
                      >
                        <div className={`h-3.5 w-3.5 rounded-full ${exp.type === 'CERTIFICATE' ? 'bg-emerald-500' : 'bg-blue-600'} border-2 border-white shadow-md transition hover:scale-125 ${dimClass(exp.periodStart, exp.periodEnd)}`} />
                        <span className="pointer-events-none absolute left-1/2 top-5 z-30 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800/90 px-2 py-0.5 text-[10px] font-bold text-white opacity-0 shadow-sm transition-opacity group-hover/item:opacity-100">
                          {tooltip(exp, true)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {courseItems.length > 0 && (
                <div className="relative flex h-10 items-center">
                  <div className="w-36 shrink-0 text-sm font-black text-slate-500">교육 수강</div>
                  <div className="relative h-full flex-1">
                    {courseItems.map((exp) => (
                      <div
                        key={exp.id}
                        style={{ left: `${percentFor(exp.periodStart)}%`, width: `${widthFor(exp.periodStart, exp.periodEnd)}%` }}
                        className={`absolute bottom-1.5 top-1.5 flex cursor-pointer items-center justify-center overflow-hidden truncate rounded-lg border border-white bg-gradient-to-r from-blue-500 to-slate-800 px-1 text-[10px] font-black text-white shadow-sm transition hover:brightness-105 active:scale-[0.98] ${dimClass(exp.periodStart, exp.periodEnd)}`}
                        title={tooltip(exp, false)}
                        onClick={() => onItemClick(exp)}
                      >
                        <span className="truncate">{exp.timelineLabel || exp.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {careerItems.length > 0 && (
                <div className="relative flex h-10 items-center">
                  <div className="w-36 shrink-0 text-sm font-black text-slate-500">실무 경력</div>
                  <div className="relative h-full flex-1">
                    {careerItems.map((exp) => (
                      <div
                        key={exp.id}
                        style={{ left: `${percentFor(exp.periodStart)}%`, width: `${widthFor(exp.periodStart, exp.periodEnd)}%` }}
                        className={`absolute bottom-1.5 top-1.5 flex cursor-pointer items-center justify-center overflow-hidden truncate rounded-lg border border-white bg-gradient-to-r from-violet-600 to-slate-900 px-1 text-[10px] font-black text-white shadow-sm transition hover:brightness-105 active:scale-[0.98] ${dimClass(exp.periodStart, exp.periodEnd)}`}
                        title={tooltip(exp, false)}
                        onClick={() => onItemClick(exp)}
                      >
                        <span className="truncate">{exp.timelineLabel || exp.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {projectItems.map((exp) => (
                <div key={exp.id} className="relative flex h-10 items-center">
                  <div className="flex w-36 shrink-0 items-center gap-1 pl-2 text-xs font-bold text-slate-400">
                    <FolderGit2 className="h-3 w-3 shrink-0 text-rose-400" />
                    <span className="truncate">{exp.title}</span>
                  </div>
                  <div className="relative h-full flex-1">
                    <div
                      style={{ left: `${percentFor(exp.periodStart)}%`, width: `${widthFor(exp.periodStart, exp.periodEnd)}%` }}
                      className={`absolute bottom-1.5 top-1.5 flex cursor-pointer items-center justify-center overflow-hidden truncate rounded-lg border border-white bg-gradient-to-r from-pink-500 to-rose-500 px-1 text-[10px] font-black text-white shadow-sm transition hover:brightness-105 active:scale-[0.98] ${dimClass(exp.periodStart, exp.periodEnd)}`}
                      title={tooltip(exp, false)}
                      onClick={() => onItemClick(exp)}
                    >
                      <span className="truncate">{exp.timelineLabel || exp.title}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative mt-1 flex h-6 items-center border-t border-slate-100">
              <div className="w-36 shrink-0" />
              <div className="relative h-full flex-1 text-[11px] font-black text-slate-300">
                {years.map((year) => (
                  <div key={year} className="absolute -translate-x-1/2" style={{ left: `${percentFor(`${year}-01-01`)}%` }}>
                    {year}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
