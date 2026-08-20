import { WorkspaceRevisionExperiencePreviewClient } from '@/components/experience/WorkspaceRevisionExperiencePreviewClient';

export default async function WorkspacePublicationRevisionExperiencePreviewPage({
    params,
}: {
    params: Promise<{ workspaceSlug: string; revisionNumber: string }>;
}) {
    const { workspaceSlug, revisionNumber } = await params;
    return (
        <WorkspaceRevisionExperiencePreviewClient
            workspaceSlug={workspaceSlug}
            revisionNumber={Number(revisionNumber)}
        />
    );
}
