import { WorkspaceRevisionStudyPreviewClient } from '@/components/study/WorkspaceRevisionStudyPreviewClient';

export default async function WorkspacePublicationRevisionStudyPreviewPage({
    params,
}: {
    params: Promise<{ workspaceSlug: string; revisionNumber: string }>;
}) {
    const { workspaceSlug, revisionNumber } = await params;
    return (
        <WorkspaceRevisionStudyPreviewClient
            workspaceSlug={workspaceSlug}
            revisionNumber={Number(revisionNumber)}
        />
    );
}
