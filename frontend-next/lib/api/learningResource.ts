import { request } from './client';
import type {
    LearningResource,
    LearningResourceGraph,
    LearningResourcePage,
    LearningResourcePriorityTier,
    LearningResourceRequest,
    LearningResourceStatus,
    LearningResourceType,
} from './types';

export const learningResourceApi = {
    adminList: (
        params: {
            q?: string;
            taxonomyNodeId?: number;
            tags?: string[];
            skillIds?: number[];
            resourceType?: LearningResourceType;
            status?: LearningResourceStatus;
            priorityTier?: LearningResourcePriorityTier;
        } = {}
    ) => {
        const search = new URLSearchParams({ size: '500' });
        if (params.q) search.set('q', params.q);
        if (params.taxonomyNodeId) search.set('taxonomyNodeId', String(params.taxonomyNodeId));
        params.tags?.forEach((tag) => search.append('tags', tag));
        params.skillIds?.forEach((id) => search.append('skillIds', String(id)));
        if (params.resourceType) search.set('resourceType', params.resourceType);
        if (params.status) search.set('status', params.status);
        if (params.priorityTier) search.set('priorityTier', params.priorityTier);
        return request<LearningResourcePage>(`/api/admin/learning-resources?${search}`);
    },
    get: (id: number) => request<LearningResource>(`/api/admin/learning-resources/${id}`),
    graph: () => request<LearningResourceGraph>('/api/admin/learning-resources/graph'),
    create: (payload: LearningResourceRequest) =>
        request<LearningResource>('/api/admin/learning-resources', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    update: (id: number, payload: LearningResourceRequest) =>
        request<LearningResource>(`/api/admin/learning-resources/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    remove: (id: number) =>
        request<void>(`/api/admin/learning-resources/${id}`, {
            method: 'DELETE',
        }),
    updateStatus: (id: number, status: LearningResourceStatus) =>
        request<LearningResource>(`/api/admin/learning-resources/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),
};
