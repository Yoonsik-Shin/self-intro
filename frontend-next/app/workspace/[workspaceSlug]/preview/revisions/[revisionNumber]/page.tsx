import { WorkspaceRevisionPreviewClient } from '@/components/intro/WorkspaceRevisionPreviewClient';

export default async function WorkspacePublicationRevisionPreviewPage({
    params,
}: {
    params: Promise<{ workspaceSlug: string; revisionNumber: string }>;
}) {
    const { workspaceSlug, revisionNumber } = await params;
    return (
        <WorkspaceRevisionPreviewClient
            workspaceSlug={workspaceSlug}
            revisionNumber={Number(revisionNumber)}
        />
    );
}
