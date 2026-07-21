'use client';

import { ArrowLeft, BookOpen, BriefcaseBusiness, Eye, EyeOff, Pencil, Sparkles, Trash2, Wrench } from 'lucide-react';
import type { Competency } from '@/lib/api/types';

type CompetencyDetailPanelProps = {
  competency: Competency;
  onBack: () => void;
  onEdit: (competency: Competency) => void;
  onDelete: (id: number) => void;
};

export function CompetencyDetailPanel({ competency, onBack, onEdit, onDelete }: CompetencyDetailPanelProps) {
  const primaryEvidence = competency.evidences.find((evidence) => evidence.primary);
  const otherEvidences = competency.evidences.filter((evidence) => !evidence.primary);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-fadeIn">
      <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" /> 목록으로
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onEdit(competency)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950">
              <Pencil className="h-3.5 w-3.5" /> 수정
            </button>
            <button type="button" onClick={() => onDelete(competency.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-bold text-red-500 transition hover:border-red-200 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> 삭제
            </button>
          </div>
        </div>

        <div className="mt-6 max-w-5xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${competency.visible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
              {competency.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {competency.visible ? '공개' : '숨김'}
            </span>
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-white">정렬 {competency.displayOrder}</span>
          </div>
          <h3 className="mt-3 flex items-center gap-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
            <Sparkles className="h-6 w-6 text-slate-500" /> {competency.title}
          </h3>
          <p className="mt-4 text-sm font-medium leading-relaxed text-slate-600 sm:text-base">{competency.summary}</p>
        </div>
      </div>

      <div className="grid gap-8 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_260px] lg:py-8">
        <div className="min-w-0 space-y-8">
          {primaryEvidence && (
            <section className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
              <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700">
                <BriefcaseBusiness className="h-3.5 w-3.5" /> 대표 실무 근거
              </h4>
              <p className="mt-2 font-black text-emerald-950">{primaryEvidence.experienceTitle}</p>
              <p className="mt-1 text-xs font-bold text-emerald-700">{primaryEvidence.experienceType === 'CAREER' ? '경력' : '프로젝트'}</p>
              {primaryEvidence.evidenceSummary && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-emerald-900">{primaryEvidence.evidenceSummary}</p>}
            </section>
          )}

          <section>
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <BriefcaseBusiness className="h-4 w-4 text-slate-500" />
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">연결된 실무 근거</h4>
            </div>
            {otherEvidences.length > 0 ? (
              <div className="space-y-3">
                {otherEvidences.map((evidence) => (
                  <div key={evidence.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-800">{evidence.experienceTitle}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{evidence.experienceType === 'CAREER' ? '경력' : '프로젝트'}</span>
                    </div>
                    {evidence.evidenceSummary && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{evidence.evidenceSummary}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">추가로 연결된 실무 근거가 없습니다.</p>
            )}
          </section>
        </div>

        <aside className="space-y-5 lg:border-l lg:border-slate-100 lg:pl-6">
          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
              <Wrench className="h-3.5 w-3.5" /> 기술 스택
            </h4>
            {competency.skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {competency.skills.map((skill) => (
                  <span key={skill.id} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                    {skill.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">연결된 기술이 없습니다.</p>
            )}
          </section>

          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
              <BookOpen className="h-3.5 w-3.5" /> 관련 Study
            </h4>
            {competency.relatedStudies.length > 0 ? (
              <div className="space-y-2">
                {competency.relatedStudies.map((study) => (
                  <div key={study.id} className="rounded-lg border border-slate-200 p-2.5">
                    <p className="text-xs font-bold leading-snug text-slate-700">{study.title}</p>
                    <p className="mt-1 text-[10px] font-bold text-slate-400">{study.status}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">연결된 Study가 없습니다.</p>
            )}
          </section>

          <section className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            <p>
              <span className="font-bold text-slate-700">공개 상태</span> {competency.visible ? '공개' : '숨김'}
            </p>
            <p className="mt-1">
              <span className="font-bold text-slate-700">정렬 순서</span> {competency.displayOrder}
            </p>
            <p className="mt-1">
              <span className="font-bold text-slate-700">실무 근거</span> {competency.evidences.length}개
            </p>
          </section>
        </aside>
      </div>
    </article>
  );
}
