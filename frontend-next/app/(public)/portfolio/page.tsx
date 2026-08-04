import type { Metadata } from 'next';
import { serverGet } from '@/lib/api/server';
import type { PortfolioCaseStudyPublicSummary } from '@/lib/api/types';
import { PortfolioListClient } from '@/components/portfolio/PortfolioListClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: '포트폴리오',
    description: '문제 인식부터 트레이드오프, 해결, 성과까지 프로젝트별 케이스스터디를 모았습니다.',
};

async function getCaseStudies(): Promise<PortfolioCaseStudyPublicSummary[]> {
    return serverGet<PortfolioCaseStudyPublicSummary[]>('/api/portfolio/case-studies');
}

export default async function PortfolioListPage() {
    const caseStudies = await getCaseStudies();

    return (
        <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
            <div className="mb-6 space-y-1">
                <h1 className="text-xl font-black text-slate-900 sm:text-2xl">포트폴리오</h1>
                <p className="text-sm text-slate-500">
                    문제 인식 → 고민/트레이드오프 → 해결 → 성과 구조로 정리한 프로젝트
                    케이스스터디입니다.
                </p>
            </div>
            <PortfolioListClient caseStudies={caseStudies} />
        </div>
    );
}
