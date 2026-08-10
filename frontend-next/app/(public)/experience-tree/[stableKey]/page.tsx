import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverGet } from '@/lib/api/server';
import type { ExperienceTreeDetail, ExperienceTreeIndex } from '@/lib/api/types';
import { ExperienceTreeDetailClient } from '@/components/experience-tree/ExperienceTreeDetailClient';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ stableKey: string }> };

async function getDetail(rawKey: string): Promise<ExperienceTreeDetail | null> {
    try {
        return await serverGet<ExperienceTreeDetail>(
            `/api/experience-tree/situations/${encodeURIComponent(decodeURIComponent(rawKey))}`
        );
    } catch {
        return null;
    }
}

async function getIndex(): Promise<ExperienceTreeIndex> {
    try {
        return await serverGet<ExperienceTreeIndex>('/api/experience-tree');
    } catch {
        return { version: '', situations: [], relations: [] };
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { stableKey } = await params;
    const detail = await getDetail(stableKey);
    if (!detail) return { title: '의사결정을 찾을 수 없습니다' };
    return { title: detail.title, description: detail.summary };
}

export default async function ExperienceTreeDetailPage({ params }: Props) {
    const { stableKey } = await params;
    const [detail, index] = await Promise.all([getDetail(stableKey), getIndex()]);
    if (!detail) notFound();
    return (
        <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
            <ExperienceTreeDetailClient detail={detail} index={index} />
        </div>
    );
}
