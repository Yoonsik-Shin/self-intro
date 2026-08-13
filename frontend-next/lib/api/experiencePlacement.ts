import { request } from './client';
import type { ExperiencePlacement, ExperiencePlacementRequest } from './types';

export const experiencePlacementApi = {
    workspaceListCoreProjects: (workspaceSlug: string) =>
        request<ExperiencePlacement[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experience-placements/CORE_PROJECT`
        ),
    workspaceReplaceCoreProjects: (workspaceSlug: string, payload: ExperiencePlacementRequest[]) =>
        request<ExperiencePlacement[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experience-placements/CORE_PROJECT`,
            { method: 'PUT', body: JSON.stringify(payload) }
        ),
};
