import { WorkspacePublicStudyPreviewClient } from '@/components/study/WorkspacePublicStudyPreviewClient';

export default async function WorkspacePublicStudyPreviewPage({
    params,
}: {
    params: Promise<{ workspaceSlug: string }>;
}) {
    const { workspaceSlug } = await params;
    return <WorkspacePublicStudyPreviewClient workspaceSlug={workspaceSlug} />;
}
