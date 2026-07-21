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
  const details = experiences.flatMap((experience) =>
    [...experience.details].sort((a, b) => a.displayOrder - b.displayOrder).map((detail) => ({ experience, detail })),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-10 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 h-80 w-80 -translate-y-16 translate-x-16 rounded-full bg-slate-800/5 blur-[50px]" />
        <div className="relative">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">경험</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-500 sm:text-base">
            실무 경력, 프로젝트, 학력, 자격증에서의 세부 경험을 모아 정리했습니다.
          </p>
        </div>
      </div>

      <ExperienceListClient details={details} />
    </div>
  );
}
