'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Experience, ExperienceDetail } from '@/lib/api/types';
import { experienceOrgName, experienceTypeLabel, formatCredentialPeriod } from '@/lib/format';

const experienceTypeTabs = [
  { id: 'ALL' as const, label: '전체' },
  { id: 'CAREER' as const, label: '경력' },
  { id: 'PROJECT' as const, label: '프로젝트' },
  { id: 'EDUCATION' as const, label: '학력' },
  { id: 'CERTIFICATE' as const, label: '자격증' },
];

type ExperienceTypeFilter = (typeof experienceTypeTabs)[number]['id'];

type DetailEntry = { detail: ExperienceDetail; experience: Experience };

type Props = {
  details: DetailEntry[];
};

export function ExperienceListClient({ details }: Props) {
  const [typeFilter, setTypeFilter] = useState<ExperienceTypeFilter>('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return details.filter(({ detail, experience }) => {
      if (typeFilter !== 'ALL' && experience.type !== typeFilter) return false;
      if (!q) return true;
      const haystack = [
        detail.content,
        detail.situation,
        detail.actionDetail,
        detail.outcome,
        experience.title,
        experienceOrgName(experience),
        ...detail.skills.map((s) => s.name),
        ...experience.skills.map((s) => s.name),
        ...experience.tags.map((t) => t.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [details, typeFilter, search]);

  return (
    <>
      <div className="sticky top-16 z-20 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          {experienceTypeTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${typeFilter === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="내용, 제목, 기관명, 기술 검색..."
          className="w-full rounded-xl border border-slate-200 px-4 py-2 text-xs outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-200 sm:w-72"
        />
      </div>

      <div className="space-y-5">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-sm font-semibold text-slate-400">
            검색 조건에 맞는 경험이 없습니다.
          </div>
        ) : (
          filtered.map(({ detail, experience }) => (
            <Link
              key={detail.id}
              href={`/experience-detail/${detail.id}`}
              className="block w-full rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-8"
            >
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <span className="rounded bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">{experienceTypeLabel(experience.type)}</span>
                <span className="font-mono text-xs font-bold text-slate-400">{formatCredentialPeriod(experience)}</span>
              </div>
              <p className="text-xs font-bold text-slate-400">
                {experience.title}
                {experienceOrgName(experience) ? ` · ${experienceOrgName(experience)}` : ''}
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-900">{detail.content}</h2>
              {(detail.outcome || detail.actionDetail || detail.situation) && (
                <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                  {detail.outcome || detail.actionDetail || detail.situation}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(detail.skills.length > 0 ? detail.skills : experience.skills).map((skill) => (
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
