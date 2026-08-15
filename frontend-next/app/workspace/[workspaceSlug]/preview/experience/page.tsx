import { WorkspacePublicExperiencePreviewClient } from '@/components/experience/WorkspacePublicExperiencePreviewClient';

export default async function WorkspacePublicExperiencePreviewPage({
    params,
}: {
    params: Promise<{ workspaceSlug: string }>;
}) {
    const { workspaceSlug } = await params;
    return <WorkspacePublicExperiencePreviewClient workspaceSlug={workspaceSlug} />;
}
