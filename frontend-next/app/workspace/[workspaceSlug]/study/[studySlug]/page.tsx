import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { SiteHeader } from '@/components/nav/SiteHeader';
import { WorkspacePlatformAttribution } from '@/components/nav/WorkspacePlatformAttribution';
import { DonationWidget } from '@/components/donation/DonationWidget';
import { StudyDetailClient } from '@/components/study/StudyDetailClient';
import { getCanonicalWorkspaceSlug, getWorkspaceStudy } from '@/lib/workspace-public';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ workspaceSlug: string; studySlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { workspaceSlug, studySlug } = await params;
    const canonicalSlug = await getCanonicalWorkspaceSlug(workspaceSlug);
    if (canonicalSlug !== workspaceSlug) {
        permanentRedirect(
            `/workspace/${encodeURIComponent(canonicalSlug)}/study/${encodeURIComponent(studySlug)}`
        );
    }
    const study = await getWorkspaceStudy(workspaceSlug, studySlug);
    return { title: study.title, description: study.summary };
}

export default async function WorkspaceStudyDetailPage({ params }: Props) {
    const { workspaceSlug, studySlug } = await params;
    const study = await getWorkspaceStudy(workspaceSlug, studySlug);
    return (
        <main className="min-h-screen bg-[#f8fafc] text-slate-800">
            <SiteHeader />
            <DonationWidget />
            <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
                <StudyDetailClient
                    study={study}
                    basePath={`/workspace/${encodeURIComponent(workspaceSlug)}/study`}
                />
            </div>
            <WorkspacePlatformAttribution />
        </main>
    );
}
