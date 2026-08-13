import { WorkspaceAdminGate } from '@/components/admin/WorkspaceAdminGate';

export default async function WorkspaceManagePage({
    params,
}: {
    params: Promise<{ workspaceSlug: string }>;
}) {
    const { workspaceSlug } = await params;
    return <WorkspaceAdminGate workspaceSlug={workspaceSlug} />;
}
