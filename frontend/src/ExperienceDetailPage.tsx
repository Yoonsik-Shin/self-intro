import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { bffApi, studyApi, type Experience } from './lib/api';
import { markdownComponents } from './lib/markdown';

function parseDetailId(hash: string): number | null {
  const match = hash.match(/^#\/experience-detail\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function formatPeriod(exp: Experience) {
  const format = (dateStr: string) => dateStr.replace(/-/g, '.').substring(0, 7);
  return `${format(exp.periodStart)} - ${exp.periodEnd ? format(exp.periodEnd) : '진행 중'}`;
}

export function ExperienceDetailPage() {
  const [detailId, setDetailId] = useState(() => parseDetailId(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setDetailId(parseDetailId(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const { data: introData, isLoading } = useQuery({
    queryKey: ['introduction'],
    queryFn: bffApi.getIntroduction,
  });

  const { data: relatedPage } = useQuery({
    queryKey: ['studies', 'byExperienceDetail', detailId],
    queryFn: () => studyApi.list({ experienceDetailIds: [detailId!] }),
    enabled: detailId !== null,
  });
  const relatedStudies = relatedPage?.content ?? [];

  const found = useMemo(() => {
    if (!introData?.experiences || detailId === null) {
      return null;
    }
    for (const exp of introData.experiences) {
      const detail = exp.details.find((d) => d.id === detailId);
      if (detail) {
        return { exp, detail };
      }
    }
    return null;
  }, [introData, detailId]);

  const goBack = () => {
    window.location.hash = '';
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-10 text-slate-800">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={goBack}
          className="mb-6 flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </button>

        {isLoading && <p className="text-sm text-slate-500">불러오는 중...</p>}

        {!isLoading && !found && (
          <p className="text-sm text-slate-500">해당 상세 항목을 찾을 수 없습니다.</p>
        )}

        {found && (
          <article className="space-y-6 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm sm:p-8">
            <header className="space-y-2 border-b border-slate-100 pb-5">
              <span className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-950">
                <Briefcase className="h-3.5 w-3.5" />
                {found.exp.companyName ?? found.exp.title} · {formatPeriod(found.exp)}
              </span>
              <h1 className="text-2xl font-black text-slate-900">{found.detail.content}</h1>
            </header>

            {found.detail.situation && (
              <section>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">상황</h2>
                <div className="text-base leading-relaxed text-slate-600">
                  <ReactMarkdown components={markdownComponents}>{found.detail.situation}</ReactMarkdown>
                </div>
              </section>
            )}

            {found.detail.actionDetail && (
              <section>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">진행 과정</h2>
                <div className="text-base leading-relaxed text-slate-600">
                  <ReactMarkdown components={markdownComponents}>{found.detail.actionDetail}</ReactMarkdown>
                </div>
              </section>
            )}

            {found.detail.outcome && (
              <section className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-emerald-700">성과</h2>
                <div className="text-base leading-relaxed text-emerald-800">
                  <ReactMarkdown components={markdownComponents}>{found.detail.outcome}</ReactMarkdown>
                </div>
              </section>
            )}

            {found.detail.skills.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">활용 기술</h2>
                <div className="flex flex-wrap gap-1.5">
                  {found.detail.skills.map((s) => (
                    <span
                      key={s.id}
                      className="rounded-md border border-slate-200/60 bg-slate-50 px-2 py-0.5 text-sm font-bold text-slate-700 shadow-sm"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {relatedStudies.length > 0 && (
              <section className="rounded-xl border border-blue-100 bg-blue-50/30 p-4">
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-blue-700">관련 기술노트</h2>
                <div className="space-y-1.5">
                  {relatedStudies.map((study) => (
                    <a
                      key={study.id}
                      href={`/study/${encodeURIComponent(study.slug)}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
                    >
                      {study.title}
                    </a>
                  ))}
                </div>
              </section>
            )}
          </article>
        )}
      </div>
    </main>
  );
}
