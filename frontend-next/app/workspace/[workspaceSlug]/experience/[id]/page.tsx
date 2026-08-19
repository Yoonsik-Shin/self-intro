import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { ExperienceDetailClient } from '@/components/experience/ExperienceDetailClient';
import { SiteHeader } from '@/components/nav/SiteHeader';
import { DonationWidget } from '@/components/donation/DonationWidget';
import { getWorkspaceExperienceBundle } from '@/lib/workspace-experience';
import { getCanonicalWorkspaceSlug } from '@/lib/workspace-public';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ workspaceSlug: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { workspaceSlug, id } = await params;
    const canonicalSlug = await getCanonicalWorkspaceSlug(workspaceSlug);
    if (canonicalSlug !== workspaceSlug) {
        permanentRedirect(
            `/workspace/${encodeURIComponent(canonicalSlug)}/experience/${encodeURIComponent(id)}`
        );
    }
    const bundle = await getWorkspaceExperienceBundle(workspaceSlug, id);
    if (!bundle) return { title: '경험을 찾을 수 없습니다' };
    return {
        title: bundle.experience.title,
        description: bundle.experience.summary || bundle.detail.outcome,
    };
}

export default async function WorkspaceExperienceDetailPage({ params }: Props) {
    const { workspaceSlug, id } = await params;
    const bundle = await getWorkspaceExperienceBundle(workspaceSlug, id);
    if (!bundle) notFound();
    const workspaceBase = `/workspace/${encodeURIComponent(workspaceSlug)}`;
    return (
        <main className="min-h-screen bg-[#f8fafc] pb-6 text-slate-800">
            <SiteHeader />
            <DonationWidget />
            <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
                <ExperienceDetailClient
                    {...bundle}
                    experienceBasePath={`${workspaceBase}/experience`}
                    studyBasePath={`${workspaceBase}/study`}
                />
            </div>
        </main>
    );
}
