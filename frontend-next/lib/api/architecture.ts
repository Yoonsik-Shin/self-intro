import { request } from './client';
import type {
    ArchitectureLayer,
    ArchitectureLayerRequest,
    ArchitectureOverview,
    ArchitectureOverviewRequest,
} from './types';

export const architectureApi = {
    getOverview: () => request<ArchitectureOverview>('/api/architecture/overview'),
    getLayers: () => request<ArchitectureLayer[]>('/api/architecture/layers'),
    adminListLayers: () => request<ArchitectureLayer[]>('/api/admin/architecture/layers'),
    updateOverview: (payload: ArchitectureOverviewRequest) =>
        request<ArchitectureOverview>('/api/admin/architecture/overview', {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    createLayer: (payload: ArchitectureLayerRequest) =>
        request<ArchitectureLayer>('/api/admin/architecture/layers', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    updateLayer: (id: number, payload: ArchitectureLayerRequest) =>
        request<ArchitectureLayer>(`/api/admin/architecture/layers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    removeLayer: (id: number) =>
        request<void>(`/api/admin/architecture/layers/${id}`, {
            method: 'DELETE',
        }),
};
