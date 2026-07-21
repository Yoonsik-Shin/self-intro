import { request } from './client';
import type { ExperiencePlacement, ExperiencePlacementRequest } from './types';

export const experiencePlacementApi = {
    listCoreProjects: () =>
        request<ExperiencePlacement[]>('/api/admin/experience-placements/CORE_PROJECT'),
    replaceCoreProjects: (payload: ExperiencePlacementRequest[]) =>
        request<ExperiencePlacement[]>('/api/admin/experience-placements/CORE_PROJECT', {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
};
