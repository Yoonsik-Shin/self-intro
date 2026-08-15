import { WorkspacePublicPreviewClient } from '@/components/intro/WorkspacePublicPreviewClient';

export default async function WorkspacePublicPreviewPage({
    params,
}: {
    params: Promise<{ workspaceSlug: string }>;
}) {
    const { workspaceSlug } = await params;
    return <WorkspacePublicPreviewClient workspaceSlug={workspaceSlug} />;
}
