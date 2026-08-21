import type { MeResponse } from '@/lib/api/auth';
import { IS_PRIVATE_BETA } from '@/lib/publicRelease';

const previewWorkspaceSlugs = new Set(
    (process.env.NEXT_PUBLIC_PLATFORM_OWNER_PREVIEW_WORKSPACE_SLUGS ?? '')
        .split(',')
        .map((slug) => slug.trim().toLowerCase())
        .filter(Boolean)
);

export function isPlatformOwnerPreview(
    me: Pick<MeResponse, 'platformRoles'> | null | undefined,
    workspaceSlug: string | null | undefined
) {
    return Boolean(
        IS_PRIVATE_BETA &&
        workspaceSlug &&
        me?.platformRoles.includes('PLATFORM_OWNER') &&
        previewWorkspaceSlugs.has(workspaceSlug.trim().toLowerCase())
    );
}
