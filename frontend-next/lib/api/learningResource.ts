import { request } from './client';
import type {
    LearningResource,
    LearningResourceCatalogItem,
    LearningResourceGraph,
    LearningResourcePage,
    LearningResourcePriorityTier,
    LearningResourceRequest,
    LearningResourceStatus,
    LearningResourceType,
    PageResponse,
    WorkspaceLearningResourceRequest,
} from './types';

export const learningResourceApi = {
    workspaceList: (
        workspaceSlug: string,
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
        const search = learningResourceSearch(params);
        return request<LearningResourcePage>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/learning-resources/manage?${search}`
        );
    },
    workspaceCatalog: (
        workspaceSlug: string,
        params?: { q?: string; page?: number; size?: number }
    ) => {
        const search = new URLSearchParams();
        if (params?.q) search.set('q', params.q);
        if (params?.page !== undefined) search.set('page', String(params.page));
        if (params?.size !== undefined) search.set('size', String(params.size));
        const query = search.toString();
        return request<PageResponse<LearningResourceCatalogItem>>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/learning-resources/manage/catalog${query ? `?${query}` : ''}`
        );
    },
    workspaceGet: (workspaceSlug: string, id: number) =>
        request<LearningResource>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/learning-resources/manage/${id}`
        ),
    workspaceGraph: (workspaceSlug: string) =>
        request<LearningResourceGraph>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/learning-resources/manage/graph`
        ),
    workspaceAdd: (
        workspaceSlug: string,
        resourceId: number,
        payload: WorkspaceLearningResourceRequest
    ) =>
        request<LearningResource>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/learning-resources/manage/${resourceId}`,
            { method: 'POST', body: JSON.stringify(payload) }
        ),
    workspaceUpdate: (
        workspaceSlug: string,
        resourceId: number,
        payload: WorkspaceLearningResourceRequest
    ) =>
        request<LearningResource>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/learning-resources/manage/${resourceId}`,
            { method: 'PUT', body: JSON.stringify(payload) }
        ),
    workspaceRemove: (workspaceSlug: string, resourceId: number) =>
        request<void>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/learning-resources/manage/${resourceId}`,
            { method: 'DELETE' }
        ),
    workspaceUpdateStatus: (
        workspaceSlug: string,
        resourceId: number,
        status: LearningResourceStatus
    ) =>
        request<LearningResource>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/learning-resources/manage/${resourceId}/status`,
            { method: 'PATCH', body: JSON.stringify({ status }) }
        ),
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

function learningResourceSearch(params: {
    q?: string;
    taxonomyNodeId?: number;
    tags?: string[];
    skillIds?: number[];
    resourceType?: LearningResourceType;
    status?: LearningResourceStatus;
    priorityTier?: LearningResourcePriorityTier;
}) {
    const search = new URLSearchParams({ size: '500' });
    if (params.q) search.set('q', params.q);
    if (params.taxonomyNodeId) search.set('taxonomyNodeId', String(params.taxonomyNodeId));
    params.tags?.forEach((tag) => search.append('tags', tag));
    params.skillIds?.forEach((id) => search.append('skillIds', String(id)));
    if (params.resourceType) search.set('resourceType', params.resourceType);
    if (params.status) search.set('status', params.status);
    if (params.priorityTier) search.set('priorityTier', params.priorityTier);
    return search;
}
