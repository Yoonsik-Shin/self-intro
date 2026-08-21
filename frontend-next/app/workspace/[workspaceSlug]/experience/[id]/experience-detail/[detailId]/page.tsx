import { notFound, permanentRedirect } from 'next/navigation';
import { ExperienceDetailClient } from '@/components/experience/ExperienceDetailClient';
import { SiteHeader } from '@/components/nav/SiteHeader';
import { WorkspacePlatformAttribution } from '@/components/nav/WorkspacePlatformAttribution';
import { DonationWidget } from '@/components/donation/DonationWidget';
import { getWorkspaceExperienceBundle } from '@/lib/workspace-experience';
import { getCanonicalWorkspaceSlug } from '@/lib/workspace-public';

export const dynamic = 'force-dynamic';

type Props = {
    params: Promise<{ workspaceSlug: string; id: string; detailId: string }>;
};

export default async function WorkspaceExperienceBulletPage({ params }: Props) {
    const { workspaceSlug, id, detailId } = await params;
    const canonicalSlug = await getCanonicalWorkspaceSlug(workspaceSlug);
    if (canonicalSlug !== workspaceSlug) {
        permanentRedirect(
            `/workspace/${encodeURIComponent(canonicalSlug)}/experience/${encodeURIComponent(id)}/experience-detail/${encodeURIComponent(detailId)}`
        );
    }
    const bundle = await getWorkspaceExperienceBundle(workspaceSlug, id, detailId);
    if (!bundle) notFound();
    const workspaceBase = `/workspace/${encodeURIComponent(workspaceSlug)}`;
    return (
        <main className="min-h-screen bg-[#f8fafc] text-slate-800">
            <SiteHeader />
            <DonationWidget />
            <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
                <ExperienceDetailClient
                    {...bundle}
                    focusDetail
                    experienceBasePath={`${workspaceBase}/experience`}
                    studyBasePath={`${workspaceBase}/study`}
                />
            </div>
            <WorkspacePlatformAttribution />
        </main>
    );
}
