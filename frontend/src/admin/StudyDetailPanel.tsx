import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  CalendarDays,
  Link2,
  Pencil,
  Tags,
  Trash2,
  Wrench,
} from 'lucide-react';
import type { Study } from '../lib/api';
import { markdownComponents } from '../lib/markdown';

type StudyDetailPanelProps = {
  study: Study;
  onBack: () => void;
  onEdit: (study: Study) => void;
  onDelete: (id: number) => void;
};

const relationTypeLabels: Record<string, string> = {
  RELATED: '관련 글',
  PREREQUISITE: '선행 학습',
  FOLLOW_UP: '후속 학습',
  APPLIED_TO: '적용 사례',
};

export function StudyDetailPanel({ study, onBack, onEdit, onDelete }: StudyDetailPanelProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-fadeIn">
      <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            목록으로
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(study)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
            >
              <Pencil className="h-3.5 w-3.5" />
              수정
            </button>
            <button
              type="button"
              onClick={() => onDelete(study.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-bold text-red-500 transition hover:border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              삭제
            </button>
          </div>
        </div>

        <div className="mt-6 max-w-5xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-white">{study.category.name}</span>
            <span className={`rounded-full px-2.5 py-1 ${study.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {study.status === 'PUBLISHED' ? '공개' : '초안'}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {study.learnedAt}
            </span>
          </div>
          <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{study.title}</h3>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 sm:text-base">{study.summary}</p>
        </div>
      </div>

      <div className="grid gap-8 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_260px] lg:py-8">
        <div className="min-w-0">
          {study.images.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-3">
              {[...study.images].sort((a, b) => a.displayOrder - b.displayOrder).map((image) => (
                <img
                  key={image.objectKey}
                  src={image.url}
                  alt=""
                  className="h-28 w-28 rounded-xl border border-slate-200 object-cover"
                />
              ))}
            </div>
          )}
          <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
            <BookOpen className="h-4 w-4 text-slate-500" />
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">학습 내용</h4>
          </div>
          <div className="min-w-0 break-words">
            <ReactMarkdown components={markdownComponents}>{study.contentMarkdown}</ReactMarkdown>
          </div>
        </div>

        <aside className="space-y-5 lg:border-l lg:border-slate-100 lg:pl-6">
          {study.tags.length > 0 && (
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
                <Tags className="h-3.5 w-3.5" /> 태그
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {study.tags.map((tag) => (
                  <span key={tag.id} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">#{tag.name}</span>
                ))}
              </div>
            </section>
          )}

          {study.skills.length > 0 && (
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
                <Wrench className="h-3.5 w-3.5" /> 기술 스택
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {study.skills.map((skill) => (
                  <span key={skill.id} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{skill.name}</span>
                ))}
              </div>
            </section>
          )}

          {(study.experiences.length > 0 || study.experienceDetails.length > 0) && (
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
                <Briefcase className="h-3.5 w-3.5" /> 관련 프로젝트·경력
              </h4>
              <div className="space-y-2">
                {study.experiences.map((experience) => (
                  <div key={experience.id} className="rounded-lg border border-slate-200 p-2.5">
                    <p className="text-[10px] font-black uppercase text-slate-400">{experience.type}</p>
                    <p className="mt-0.5 text-xs font-bold leading-snug text-slate-700">{experience.title}</p>
                  </div>
                ))}
                {study.experienceDetails.map((detail) => (
                  <div key={detail.id} className="rounded-lg bg-slate-50 p-2.5">
                    <p className="text-[10px] font-bold text-slate-400">{detail.experienceTitle}</p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-600">{detail.content}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {study.relatedStudies.length > 0 && (
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
                <Link2 className="h-3.5 w-3.5" /> 연결된 학습 글
              </h4>
              <div className="space-y-2">
                {study.relatedStudies.map((related) => (
                  <div key={`${related.id}-${related.type}`} className="rounded-lg border border-slate-200 p-2.5">
                    <p className="text-[10px] font-black text-blue-600">{relationTypeLabels[related.type] ?? related.type}</p>
                    <p className="mt-0.5 text-xs font-bold leading-snug text-slate-700">{related.title}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
