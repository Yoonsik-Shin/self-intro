import { redirect } from 'next/navigation';

export default async function LegacyWorkspaceAdminPage({
    params,
    searchParams,
}: {
    params: Promise<{ workspaceSlug: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { workspaceSlug } = await params;
    const query = new URLSearchParams();
    Object.entries(await searchParams).forEach(([key, value]) => {
        if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
        else if (value !== undefined) query.set(key, value);
    });
    const suffix = query.size > 0 ? `?${query}` : '';
    redirect(`/workspace/${encodeURIComponent(workspaceSlug)}/manage${suffix}`);
}
