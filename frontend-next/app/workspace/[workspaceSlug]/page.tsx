import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { IntroPageClient } from '@/components/intro/IntroPageClient';
import { SiteHeader } from '@/components/nav/SiteHeader';
import { PreviewModeBanner } from '@/components/nav/PreviewModeBanner';
import { GlobalPrintModal } from '@/components/print/GlobalPrintModal';
import { getCanonicalWorkspaceSlug, getWorkspaceIntroduction } from '@/lib/workspace-public';

export const dynamic = 'force-dynamic';

type WorkspacePageProps = {
    params: Promise<{ workspaceSlug: string }>;
};

export async function generateMetadata({ params }: WorkspacePageProps): Promise<Metadata> {
    const { workspaceSlug } = await params;
    const { profile } = await getWorkspaceIntroduction(workspaceSlug);
    if (!profile) return { title: workspaceSlug };

    const title = `${profile.name} · ${profile.jobTitle}`;
    const description = profile.bio;
    return {
        title,
        description,
        openGraph: { title, description, type: 'profile' },
        twitter: { card: 'summary_large_image', title, description },
    };
}

export default async function WorkspacePublicPage({ params }: WorkspacePageProps) {
    const { workspaceSlug } = await params;
    const canonicalSlug = await getCanonicalWorkspaceSlug(workspaceSlug);
    if (canonicalSlug !== workspaceSlug) {
        permanentRedirect(`/workspace/${encodeURIComponent(canonicalSlug)}`);
    }
    const introData = await getWorkspaceIntroduction(workspaceSlug);
    return (
        <main className="min-h-screen bg-[#f8fafc] pb-6 text-slate-800">
            <SiteHeader />
            <PreviewModeBanner />
            <IntroPageClient introData={introData} workspaceSlug={workspaceSlug} />
            <GlobalPrintModal workspaceSlug={workspaceSlug} />
        </main>
    );
}
