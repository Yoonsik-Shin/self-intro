import { notFound, permanentRedirect } from 'next/navigation';
import { serverGet } from '@/lib/api/server';
import type { ExperienceTreeDetail, ExperienceTreeIndex } from '@/lib/api/types';
import { ExperienceTreeDetailClient } from '@/components/experience-tree/ExperienceTreeDetailClient';
import { getCanonicalWorkspaceSlug } from '@/lib/workspace-public';

export const dynamic = 'force-dynamic';

export default async function WorkspaceOntologyDetailPage({
    params,
}: {
    params: Promise<{ workspaceSlug: string; stableKey: string }>;
}) {
    const { workspaceSlug, stableKey } = await params;
    const canonicalSlug = await getCanonicalWorkspaceSlug(workspaceSlug);
    if (canonicalSlug !== workspaceSlug) {
        permanentRedirect(
            `/workspace/${encodeURIComponent(canonicalSlug)}/ontology/${encodeURIComponent(stableKey)}`
        );
    }
    const workspacePath = `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experience-tree`;
    let detail: ExperienceTreeDetail | null = null;
    let index: ExperienceTreeIndex = { version: '', situations: [], relations: [] };
    try {
        [detail, index] = await Promise.all([
            serverGet<ExperienceTreeDetail>(
                `${workspacePath}/situations/${encodeURIComponent(decodeURIComponent(stableKey))}`
            ),
            serverGet<ExperienceTreeIndex>(workspacePath),
        ]);
    } catch {
        notFound();
    }
    if (!detail) notFound();
    const basePath = `/workspace/${encodeURIComponent(workspaceSlug)}/ontology`;
    return (
        <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
            <ExperienceTreeDetailClient
                detail={detail}
                index={index}
                basePath={basePath}
                studyBasePath={`/workspace/${encodeURIComponent(workspaceSlug)}/study`}
            />
        </div>
    );
}
