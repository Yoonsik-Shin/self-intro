import type { Metadata } from 'next';
import { serverGet } from '@/lib/api/server';
import type { ArchitectureLayer, ArchitectureOverview } from '@/lib/api/types';
import { ArchitecturePageClient } from '@/components/architecture/ArchitecturePageClient';

export const dynamic = 'force-dynamic';

const DEFAULT_HEADING = '시스템 아키텍처 (Self-Intro Architecture)';
const DEFAULT_SUBHEADING =
    '이 포트폴리오 웹앱의 도메인 모듈 구조, DB 데이터 관리 방식, 그리고 Cloudflare·오라클 Free Tier 기반 배포 인프라까지 담은 설계 명세입니다.';

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

export async function generateMetadata(): Promise<Metadata> {
    const overview = await getOverview();
    return {
        title: overview?.heading ?? DEFAULT_HEADING,
        description: overview?.subheading ?? DEFAULT_SUBHEADING,
    };
}

export default async function ArchitecturePage() {
    const [overview, layers] = await Promise.all([getOverview(), getLayers()]);
    return <ArchitecturePageClient overview={overview} layers={layers} />;
}
