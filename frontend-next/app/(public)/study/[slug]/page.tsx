import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import { serverGet } from '@/lib/api/server';
import type { Study } from '@/lib/api/types';
import { markdownComponents } from '@/lib/markdown';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

async function getStudy(slug: string): Promise<Study | null> {
  try {
    return await serverGet<Study>(`/api/studies/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const study = await getStudy(slug);
  if (!study) return { title: 'Study를 찾을 수 없습니다' };

  return {
    title: study.title,
    description: study.summary,
    openGraph: {
      title: study.title,
      description: study.summary,
      type: 'article',
      publishedTime: study.publishedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: study.title,
      description: study.summary,
    },
  };
}

export default async function StudyDetailPage({ params }: Props) {
  const { slug } = await params;
  const study = await getStudy(slug);
  if (!study) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 sm:px-6">
      <Link href="/study" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950">
        <ArrowLeft className="h-4 w-4" /> Study 목록
      </Link>
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="mb-8 border-b border-slate-100 pb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">{study.category.name}</span>
            <span className="font-mono">{study.learnedAt}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{study.title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-500 sm:text-base">{study.summary}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {study.tags.map((tag) => (
              <span key={tag.id} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                #{tag.name}
              </span>
            ))}
            {study.skills.map((skill) => (
              <span key={skill.id} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600">
                {skill.name}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-slate-700 sm:text-base">
          <ReactMarkdown components={markdownComponents}>{study.contentMarkdown}</ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
