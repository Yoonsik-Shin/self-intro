import { request } from './client';
import type { TaxonomyNode, TaxonomyNodeRequest } from './types';

export type TaxonomyScheme = {
    id: number;
    scopeType: 'PLATFORM' | 'WORKSPACE';
    familyKey: string;
    version: number;
    name: string;
    description: string;
    status: 'DRAFT' | 'ACTIVE' | 'RETIRED';
    subscribed: boolean;
    primaryScheme: boolean;
    displayOrder: number;
};

export const taxonomyApi = {
    /** 공개 페이지 breadcrumb용 전체 트리 (인증 불필요) */
    publicList: () => request<TaxonomyNode[]>('/api/taxonomy-nodes'),
    list: () => request<TaxonomyNode[]>('/api/admin/taxonomy-nodes'),
    create: (payload: TaxonomyNodeRequest) =>
        request<TaxonomyNode>('/api/admin/taxonomy-nodes', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    update: (id: number, payload: TaxonomyNodeRequest) =>
        request<TaxonomyNode>(`/api/admin/taxonomy-nodes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    remove: (id: number) =>
        request<void>(`/api/admin/taxonomy-nodes/${id}`, {
            method: 'DELETE',
        }),
};

const schemePath = (workspaceSlug: string) =>
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/taxonomy-schemes`;

export const taxonomySchemeApi = {
    catalog: (workspaceSlug: string) =>
        request<TaxonomyScheme[]>(`${schemePath(workspaceSlug)}/catalog`),
    subscriptions: (workspaceSlug: string) => request<TaxonomyScheme[]>(schemePath(workspaceSlug)),
    replace: (workspaceSlug: string, schemeIds: number[], primarySchemeId: number) =>
        request<TaxonomyScheme[]>(schemePath(workspaceSlug), {
            method: 'PUT',
            body: JSON.stringify({ schemeIds, primarySchemeId }),
        }),
};
