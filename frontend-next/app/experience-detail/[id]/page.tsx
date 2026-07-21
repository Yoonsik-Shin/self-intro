import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import { serverGet } from '@/lib/api/server';
import type { Experience, ExperienceDetail } from '@/lib/api/types';
import { markdownComponents } from '@/lib/markdown';
import { experienceOrgName, experienceTypeLabel, formatCredentialPeriod } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
};

async function findExperienceDetail(id: number): Promise<{ experience: Experience; detail: ExperienceDetail } | null> {
  if (!Number.isFinite(id)) return null;
  const experiences = await serverGet<Experience[]>('/api/experiences');
  for (const experience of experiences) {
    const detail = experience.details.find((d) => d.id === id);
    if (detail) return { experience, detail };
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const found = await findExperienceDetail(Number(id));
  if (!found) return { title: '경험을 찾을 수 없습니다' };

  const { experience, detail } = found;
  const description = detail.outcome || detail.actionDetail || detail.situation || experience.summary || '';

  return {
    title: detail.content,
    description,
    openGraph: {
      title: detail.content,
      description,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: detail.content,
      description,
    },
  };
}

export default async function ExperienceDetailPage({ params }: Props) {
  const { id } = await params;
  const found = await findExperienceDetail(Number(id));
  if (!found) notFound();

  const { experience, detail } = found;
  const merged = detail.narrative || [detail.situation, detail.actionDetail, detail.outcome].filter(Boolean).join('\n\n');
  const skills = detail.skills.length > 0 ? detail.skills : experience.skills;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 sm:px-6">
      <Link href="/experience" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950">
        <ArrowLeft className="h-4 w-4" /> 경험 목록
      </Link>
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="mb-8 border-b border-slate-100 pb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">{experienceTypeLabel(experience.type)}</span>
            <span className="font-mono">{formatCredentialPeriod(experience)}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{detail.content}</h1>
          <p className="mt-2 text-sm font-bold text-slate-500 sm:text-base">
            {experience.title}
            {experienceOrgName(experience) ? ` · ${experienceOrgName(experience)}` : ''}
          </p>
        </div>

        {merged && (
          <div className="text-sm leading-relaxed text-slate-600 sm:text-base">
            <ReactMarkdown components={markdownComponents}>{merged}</ReactMarkdown>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span key={skill.id} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600">
              {skill.name}
            </span>
          ))}
        </div>
      </article>
    </div>
  );
}
