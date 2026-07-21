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
    <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <StudyListClient initialStudies={studies} categories={categories} />
    </div>
  );
}
