import { request } from './client';
import type { Profile } from './types';

export const profileApi = {
    getPrivate: (workspaceSlug: string) =>
        request<Profile>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/profile`),
    update: (workspaceSlug: string, payload: Omit<Profile, 'id' | 'updatedAt'>) =>
        request<Profile>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/profile`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
};
