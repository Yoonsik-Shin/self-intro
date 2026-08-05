import type { Metadata } from 'next';
import { serverGet } from '@/lib/api/server';
import type { Study, StudyTaxonomyNode, StudyPage } from '@/lib/api/types';
import { StudyListClient } from '@/components/study/StudyListClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Study',
    description: '학습 내용과 실제 프로젝트 적용 경험을 연결해 기록하는 기술 아카이브입니다.',
};

async function getStudies(): Promise<StudyPage> {
    try {
        const search = new URLSearchParams({ page: '0', size: '10' });
        return await serverGet<StudyPage>(`/api/studies?${search}`);
    } catch {
        return { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0 };
    }
}

async function getTaxonomy(): Promise<StudyTaxonomyNode[]> {
    try {
        return await serverGet<StudyTaxonomyNode[]>('/api/study-taxonomy');
    } catch {
        return [];
    }
}

export default async function StudyListPage() {
    const [studyPage, taxonomyNodes] = await Promise.all([getStudies(), getTaxonomy()]);
    const rawStudies = studyPage?.content ?? [];
    // 목록 페이지에서는 본문 마크다운(contentMarkdown)이 불필요하므로 제거하여 SSR HTML 용량을 최적화
    const studies: Study[] = rawStudies.map((study) => ({
        ...study,
        contentMarkdown: '',
    }));

    return (
        <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
            <StudyListClient
                initialStudies={studies}
                initialTotalElements={studyPage?.totalElements ?? studies.length}
                initialTotalPages={studyPage?.totalPages ?? 1}
                taxonomyNodes={taxonomyNodes}
            />
        </div>
    );
}
