import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverGet } from '@/lib/api/server';
import type { Study } from '@/lib/api/types';
import { StudyDetailClient } from '@/components/study/StudyDetailClient';

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
    <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <StudyDetailClient study={study} />
    </div>
  );
}
