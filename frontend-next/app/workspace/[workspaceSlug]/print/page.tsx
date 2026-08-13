import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { PrintPageClient } from '@/components/print/PrintPageClient';
import { getCanonicalWorkspaceSlug, getWorkspaceIntroduction } from '@/lib/workspace-public';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'PDF 인쇄 미리보기',
    robots: { index: false, follow: false },
};

export default async function WorkspacePrintPage({
    params,
    searchParams,
}: {
    params: Promise<{ workspaceSlug: string }>;
    searchParams: Promise<{ templateId?: string; admin?: string; jobPostingId?: string }>;
}) {
    const { workspaceSlug } = await params;
    const query = await searchParams;
    const adminMode = query.admin === '1';
    const canonicalSlug = adminMode
        ? workspaceSlug
        : await getCanonicalWorkspaceSlug(workspaceSlug);
    if (!adminMode && canonicalSlug !== workspaceSlug) {
        const target = new URLSearchParams(query);
        permanentRedirect(
            `/workspace/${encodeURIComponent(canonicalSlug)}/print${target.size ? `?${target}` : ''}`
        );
    }

    const parsedTemplateId = Number(query.templateId);
    const templateId = Number.isFinite(parsedTemplateId) ? parsedTemplateId : null;
    const introData = adminMode ? null : await getWorkspaceIntroduction(workspaceSlug, 'RESUME');
    const parsedJobPostingId = Number(query.jobPostingId);
    const jobPostingId = Number.isFinite(parsedJobPostingId) ? parsedJobPostingId : null;

    if (!adminMode && !introData?.profile) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm font-bold text-slate-400">
                프로필 정보를 불러올 수 없습니다.
            </div>
        );
    }

    return (
        <PrintPageClient
            workspaceSlug={workspaceSlug}
            introData={introData}
            adminMode={adminMode}
            templateId={templateId}
            jobPostingId={jobPostingId}
        />
    );
}
