import type { Metadata } from 'next';
import { serverGet } from '@/lib/api/server';
import type { ExperienceTreeIndex } from '@/lib/api/types';
import { ExperienceTreeClient } from '@/components/experience-tree/ExperienceTreeClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: '개발자 온톨로지',
    description:
        '개발 영역과 능력, 기술 주제, 의사결정, 선택지, 트레이드오프, 오답, Study 회고를 연결한 개발자 지식 그래프입니다.',
};

async function getIndex(): Promise<ExperienceTreeIndex> {
    try {
        return await serverGet<ExperienceTreeIndex>('/api/experience-tree');
    } catch {
        return { version: '', situations: [], relations: [] };
    }
}

const VIEW_MODES = ['TREE', 'LIST', 'MAP'] as const;
const DOMAINS = ['BACKEND', 'INFRASTRUCTURE', 'ARCHITECTURE', 'FRONTEND'] as const;

export default async function ExperienceTreePage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const index = await getIndex();
    const query = await searchParams;
    const rawView = typeof query.view === 'string' ? query.view.toUpperCase() : undefined;
    const rawDomain = typeof query.domain === 'string' ? query.domain.toUpperCase() : undefined;
    const requestedSituation = typeof query.situation === 'string' ? query.situation : undefined;
    return (
        <ExperienceTreeClient
            initialIndex={index}
            initialView={VIEW_MODES.find((value) => value === rawView) ?? 'TREE'}
            initialDomain={DOMAINS.find((value) => value === rawDomain) ?? 'ALL'}
            initialSearch={typeof query.q === 'string' ? query.q : ''}
            initialSituation={
                index.situations.some((item) => item.stableKey === requestedSituation)
                    ? requestedSituation
                    : undefined
            }
        />
    );
}
