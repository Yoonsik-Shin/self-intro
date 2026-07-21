import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverGet } from '@/lib/api/server';
import type { Experience, ExperienceDetail, Study, StudyPage } from '@/lib/api/types';
import { ExperienceDetailClient } from '@/components/experience/ExperienceDetailClient';

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

async function findRelatedStudies(experienceDetailId: number): Promise<Study[]> {
  const search = new URLSearchParams();
  search.append('experienceDetailIds', String(experienceDetailId));
  search.set('page', '0');
  search.set('size', '100');
  const result = await serverGet<StudyPage>(`/api/studies?${search}`);
  return result.content;
}

export default async function ExperienceDetailPage({ params }: Props) {
  const { id } = await params;
  const found = await findExperienceDetail(Number(id));
  if (!found) notFound();

  const { experience, detail } = found;
  const relatedStudies = await findRelatedStudies(detail.id);

  return (
    <div className="relative mx-auto max-w-[1500px] space-y-1 px-4 py-6 sm:px-6 lg:px-8">
      <ExperienceDetailClient experience={experience} detail={detail} relatedStudies={relatedStudies} />
    </div>
  );
}
