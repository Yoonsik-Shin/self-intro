import { redirect } from 'next/navigation';

export default async function LegacyWorkspacePublicPage({
    params,
}: {
    params: Promise<{ workspaceSlug: string }>;
}) {
    const { workspaceSlug } = await params;
    redirect(`/workspace/${encodeURIComponent(workspaceSlug)}`);
}
