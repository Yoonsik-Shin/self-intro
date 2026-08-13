import type { Metadata } from 'next';
import { serverGet } from '@/lib/api/server';
import type { ArchitectureLayer, ArchitectureOverview } from '@/lib/api/types';
import { ArchitecturePageClient } from '@/components/architecture/ArchitecturePageClient';

export const dynamic = 'force-dynamic';

const DEFAULT_HEADING = 'Self-Intro 경력 관리 플랫폼';
const DEFAULT_SUBHEADING =
    '경력과 근거를 구조화하고, 핵심 역량과 지원별 이력서·공개 프로필로 연결하는 경력 관리 워크스페이스입니다.';

async function getOverview(): Promise<ArchitectureOverview | null> {
    try {
        return await serverGet<ArchitectureOverview>('/api/architecture/overview');
    } catch {
        return null;
    }
}

async function getLayers(): Promise<ArchitectureLayer[]> {
    return serverGet<ArchitectureLayer[]>('/api/architecture/layers');
}

export function generateMetadata(): Metadata {
    return {
        title: DEFAULT_HEADING,
        description: DEFAULT_SUBHEADING,
    };
}

export default async function ArchitecturePage() {
    const [overview, layers] = await Promise.all([getOverview(), getLayers()]);
    return <ArchitecturePageClient overview={overview} layers={layers} />;
}
