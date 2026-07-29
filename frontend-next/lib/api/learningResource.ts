import { request } from './client';
import type {
    LearningResource,
    LearningResourceCategory,
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
            category?: string;
            tags?: string[];
            skillIds?: number[];
            resourceType?: LearningResourceType;
            status?: LearningResourceStatus;
            priorityTier?: LearningResourcePriorityTier;
        } = {}
    ) => {
        const search = new URLSearchParams({ size: '500' });
        if (params.q) search.set('q', params.q);
        if (params.category && params.category !== 'ALL') search.set('category', params.category);
        params.tags?.forEach((tag) => search.append('tags', tag));
        params.skillIds?.forEach((id) => search.append('skillIds', String(id)));
        if (params.resourceType) search.set('resourceType', params.resourceType);
        if (params.status) search.set('status', params.status);
        if (params.priorityTier) search.set('priorityTier', params.priorityTier);
        return request<LearningResourcePage>(`/api/admin/learning-resources?${search}`);
    },
    categories: () =>
        request<LearningResourceCategory[]>('/api/admin/learning-resource-categories'),
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
