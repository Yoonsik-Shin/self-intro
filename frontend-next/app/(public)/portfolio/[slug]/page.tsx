import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverGet } from '@/lib/api/server';
import type { PortfolioCaseStudyPublic } from '@/lib/api/types';
import { PortfolioCaseStudyDetailClient } from '@/components/portfolio/PortfolioCaseStudyDetailClient';

export const dynamic = 'force-dynamic';

type Props = {
    params: Promise<{ slug: string }>;
};

async function getCaseStudy(rawSlug: string): Promise<PortfolioCaseStudyPublic | null> {
    try {
        const decoded = decodeURIComponent(rawSlug);
        return await serverGet<PortfolioCaseStudyPublic>(
            `/api/portfolio/case-studies/${encodeURIComponent(decoded)}`
        );
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const caseStudy = await getCaseStudy(slug);
    if (!caseStudy) return { title: '포트폴리오를 찾을 수 없습니다' };

    return {
        title: caseStudy.title,
        description: caseStudy.content.summary,
        openGraph: {
            title: caseStudy.title,
            description: caseStudy.content.summary,
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title: caseStudy.title,
            description: caseStudy.content.summary,
        },
    };
}

export default async function PortfolioCaseStudyPage({ params }: Props) {
    const { slug } = await params;
    const caseStudy = await getCaseStudy(slug);
    if (!caseStudy) notFound();

    return (
        <div className="relative mx-auto max-w-[1000px] px-4 py-6 sm:px-6">
            <PortfolioCaseStudyDetailClient caseStudy={caseStudy} />
        </div>
    );
}
