import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { ExperienceListClient } from '@/components/experience/ExperienceListClient';
import { SiteHeader } from '@/components/nav/SiteHeader';
import { DonationWidget } from '@/components/donation/DonationWidget';
import { getCanonicalWorkspaceSlug, getWorkspaceIntroduction } from '@/lib/workspace-public';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ workspaceSlug: string }> };

export const metadata: Metadata = {
    title: '경험',
    description: '이 Workspace가 공개한 경력과 프로젝트입니다.',
};

export default async function WorkspaceExperiencePage({ params }: Props) {
    const { workspaceSlug } = await params;
    const canonicalSlug = await getCanonicalWorkspaceSlug(workspaceSlug);
    if (canonicalSlug !== workspaceSlug) {
        permanentRedirect(`/workspace/${encodeURIComponent(canonicalSlug)}/experience`);
    }
    const intro = await getWorkspaceIntroduction(workspaceSlug);
    const experiences = [...intro.experiences].sort((a, b) =>
        b.periodStart.localeCompare(a.periodStart)
    );
    return (
        <main className="min-h-screen bg-[#f8fafc] pb-6 text-slate-800">
            <SiteHeader />
            <DonationWidget />
            <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
                <ExperienceListClient
                    experiences={experiences}
                    basePath={`/workspace/${encodeURIComponent(workspaceSlug)}/experience`}
                />
            </div>
        </main>
    );
}
