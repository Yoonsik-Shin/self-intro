import type { Metadata } from 'next';
import { serverGet } from '@/lib/api/server';
import type { StudyCategory, StudyPage } from '@/lib/api/types';
import { StudyListClient } from '@/components/study/StudyListClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Study',
  description: '학습 내용과 실제 프로젝트 적용 경험을 연결해 기록하는 기술 아카이브입니다.',
};

async function getStudies(): Promise<StudyPage> {
  const search = new URLSearchParams({ page: '0', size: '100' });
  return serverGet<StudyPage>(`/api/studies?${search}`);
}

async function getCategories(): Promise<StudyCategory[]> {
  return serverGet<StudyCategory[]>('/api/study-categories');
}

export default async function StudyListPage() {
  const [{ content: studies }, categories] = await Promise.all([getStudies(), getCategories()]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-10 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 h-80 w-80 -translate-y-16 translate-x-16 rounded-full bg-slate-800/5 blur-[50px]" />
        <div className="relative">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Study</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-500 sm:text-base">
            학습 내용과 실제 프로젝트 적용 경험을 연결해 기록하는 기술 아카이브입니다.
          </p>
        </div>
      </div>

      <StudyListClient initialStudies={studies} categories={categories} />
    </div>
  );
}
