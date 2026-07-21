import type { Metadata } from 'next';
import { serverGet } from '@/lib/api/server';
import type { Experience } from '@/lib/api/types';
import { ExperienceListClient } from '@/components/experience/ExperienceListClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '경험',
  description: '실무 경력, 프로젝트, 학력, 자격증에서의 세부 경험을 모아 정리했습니다.',
};

async function getExperiences(): Promise<Experience[]> {
  return serverGet<Experience[]>('/api/experiences');
}

export default async function ExperienceListPage() {
  const experiences = await getExperiences();
  const sortedExperiences = [...experiences].sort((a, b) => b.periodStart.localeCompare(a.periodStart));
  const details = sortedExperiences.flatMap((experience) =>
    [...experience.details].sort((a, b) => a.displayOrder - b.displayOrder).map((detail) => ({ experience, detail })),
  );

  return (
    <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <ExperienceListClient details={details} />
    </div>
  );
}
