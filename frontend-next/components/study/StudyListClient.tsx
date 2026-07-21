'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { studyApi } from '@/lib/api';
import type { Study, StudyCategory, StudyPage } from '@/lib/api/types';

type Props = {
  initialStudies: Study[];
  categories: StudyCategory[];
};

export function StudyListClient({ initialStudies, categories }: Props) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const isDefaultQuery = search === '' && activeCategory === 'ALL';

  const { data: studyPage } = useQuery<StudyPage>({
    queryKey: ['studies', 'public', search, activeCategory],
    queryFn: () =>
      studyApi.list({
        q: search || undefined,
        category: activeCategory === 'ALL' ? undefined : activeCategory,
        size: 100,
      }),
    initialData: isDefaultQuery
      ? { content: initialStudies, page: 0, size: initialStudies.length, totalElements: initialStudies.length, totalPages: 1 }
      : undefined,
  });

  const studies = studyPage?.content ?? [];

  return (
    <>
      <div className="sticky top-16 z-20 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          {[{ slug: 'ALL', name: '전체' }, ...categories].map((category) => (
            <button
              key={category.slug}
              onClick={() => setActiveCategory(category.slug)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${activeCategory === category.slug ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              {category.name}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="제목, 본문, 태그, 기술 검색..."
          className="w-full rounded-xl border border-slate-200 px-4 py-2 text-xs outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-200 sm:w-72"
        />
      </div>

      <div className="space-y-5">
        {studies.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-sm font-semibold text-slate-400">
            검색 조건에 맞는 Study가 없습니다.
          </div>
        ) : (
          studies.map((study) => (
            <Link
              key={study.id}
              href={`/study/${encodeURIComponent(study.slug)}`}
              className="block w-full rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-8"
            >
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <span className="rounded bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">{study.category.name}</span>
                <span className="font-mono text-xs font-bold text-slate-400">{study.learnedAt}</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">{study.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{study.summary}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {study.tags.map((tag) => (
                  <span key={tag.id} className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                    #{tag.name}
                  </span>
                ))}
                {study.skills.map((skill) => (
                  <span key={skill.id} className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                    {skill.name}
                  </span>
                ))}
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
