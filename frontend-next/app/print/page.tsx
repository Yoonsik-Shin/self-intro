import type { Metadata } from 'next';
import { serverGet } from '@/lib/api/server';
import type { IntroductionResponse } from '@/lib/api/types';
import { PrintPageClient } from '@/components/print/PrintPageClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'PDF 인쇄 미리보기',
    robots: { index: false, follow: false },
};

async function getIntroduction(): Promise<IntroductionResponse> {
    return serverGet<IntroductionResponse>('/api/bff/introduction');
}

export default async function PrintPage({
    searchParams,
}: {
    searchParams: Promise<{ templateId?: string; admin?: string }>;
}) {
    const introData = await getIntroduction();
    const query = await searchParams;
    const parsedTemplateId = Number(query.templateId);
    const templateId = Number.isFinite(parsedTemplateId) ? parsedTemplateId : null;
    const adminMode = query.admin === '1';

    if (!introData.profile) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm font-bold text-slate-400">
                프로필 정보를 불러올 수 없습니다.
            </div>
        );
    }

    return <PrintPageClient introData={introData} adminMode={adminMode} templateId={templateId} />;
}
