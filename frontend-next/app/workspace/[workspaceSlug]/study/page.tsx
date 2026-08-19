import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { SiteHeader } from '@/components/nav/SiteHeader';
import { DonationWidget } from '@/components/donation/DonationWidget';
import { StudyListClient } from '@/components/study/StudyListClient';
import {
    getCanonicalWorkspaceSlug,
    getWorkspaceStudies,
    getWorkspaceTaxonomy,
} from '@/lib/workspace-public';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ workspaceSlug: string }> };

export const metadata: Metadata = {
    title: '학습',
    description: '이 Workspace가 공개한 학습 기록입니다.',
};

export default async function WorkspaceStudyPage({ params }: Props) {
    const { workspaceSlug } = await params;
    const canonicalSlug = await getCanonicalWorkspaceSlug(workspaceSlug);
    if (canonicalSlug !== workspaceSlug) {
        permanentRedirect(`/workspace/${encodeURIComponent(canonicalSlug)}/study`);
    }
    const [studyPage, taxonomyNodes] = await Promise.all([
        getWorkspaceStudies(workspaceSlug),
        getWorkspaceTaxonomy(workspaceSlug),
    ]);
    const studies = studyPage.content.map((study) => ({ ...study, contentMarkdown: '' }));
    return (
        <main className="min-h-screen bg-[#f8fafc] pb-6 text-slate-800">
            <SiteHeader />
            <DonationWidget />
            <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
                <StudyListClient
                    initialStudies={studies}
                    initialTotalElements={studyPage.totalElements}
                    initialTotalPages={studyPage.totalPages}
                    taxonomyNodes={taxonomyNodes}
                    workspaceSlug={workspaceSlug}
                />
            </div>
        </main>
    );
}
