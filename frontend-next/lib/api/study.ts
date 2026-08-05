import { request } from './client';
import type {
    Study,
    StudyPage,
    StudyTaxonomyNode,
    TaxonomyNode,
    Tag,
    StudyStatus,
    StudyRequest,
    StudySuggestionRequest,
    StudySuggestionResponse,
    StudySuggestionStreamEvent,
} from './types';
import { requestEventStream } from './client';

export const studyApi = {
    list: (
        params: {
            q?: string;
            taxonomyNodeId?: number;
            skillIds?: number[];
            experienceIds?: number[];
            experienceDetailIds?: number[];
            page?: number;
            size?: number;
        } = {}
    ) => {
        const search = new URLSearchParams();
        if (params.q) search.set('q', params.q);
        if (params.taxonomyNodeId) search.set('taxonomyNodeId', String(params.taxonomyNodeId));
        params.skillIds?.forEach((id) => search.append('skillIds', String(id)));
        params.experienceIds?.forEach((id) => search.append('experienceIds', String(id)));
        params.experienceDetailIds?.forEach((id) =>
            search.append('experienceDetailIds', String(id))
        );
        search.set('page', String(params.page ?? 0));
        search.set('size', String(params.size ?? 20));
        return request<StudyPage>(`/api/studies?${search}`);
    },
    detail: (slug: string) => {
        const decoded = decodeURIComponent(slug);
        return request<Study>(`/api/studies/${encodeURIComponent(decoded)}`);
    },
    adminList: (
        params: {
            q?: string;
            taxonomyNodeId?: number;
            status?: StudyStatus;
            skillIds?: number[];
            experienceIds?: number[];
            experienceDetailIds?: number[];
        } = {}
    ) => {
        const search = new URLSearchParams({ size: '100' });
        if (params.q) search.set('q', params.q);
        if (params.taxonomyNodeId) search.set('taxonomyNodeId', String(params.taxonomyNodeId));
        if (params.status) search.set('status', params.status);
        params.skillIds?.forEach((id) => search.append('skillIds', String(id)));
        params.experienceIds?.forEach((id) => search.append('experienceIds', String(id)));
        params.experienceDetailIds?.forEach((id) =>
            search.append('experienceDetailIds', String(id))
        );
        return request<StudyPage>(`/api/admin/studies?${search}`);
    },
    publicTaxonomy: () => request<StudyTaxonomyNode[]>('/api/study-taxonomy'),
    curation: () => request<TaxonomyNode[]>('/api/admin/study-taxonomy-curation'),
    updateCuration: (taxonomyNodeIds: number[]) =>
        request<TaxonomyNode[]>('/api/admin/study-taxonomy-curation', {
            method: 'PUT',
            body: JSON.stringify(taxonomyNodeIds),
        }),
    tags: () => request<Tag[]>('/api/tags'),
    create: (payload: StudyRequest) =>
        request<Study>('/api/admin/studies', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    update: (id: number, payload: StudyRequest) =>
        request<Study>(`/api/admin/studies/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    remove: (id: number) =>
        request<void>(`/api/admin/studies/${id}`, {
            method: 'DELETE',
        }),
    batchPublish: (ids: number[]) =>
        request<Study[]>('/api/admin/studies/batch-publish', {
            method: 'POST',
            body: JSON.stringify(ids),
        }),
    batchUnpublish: (ids: number[]) =>
        request<Study[]>('/api/admin/studies/batch-unpublish', {
            method: 'POST',
            body: JSON.stringify(ids),
        }),
    toggleStatus: (id: number) =>
        request<Study>(`/api/admin/studies/${id}/toggle-status`, {
            method: 'POST',
        }),
    suggest: (payload: StudySuggestionRequest) =>
        request<StudySuggestionResponse>('/api/admin/studies/ai/suggestions', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    suggestStream: (
        payload: StudySuggestionRequest,
        onEvent: (event: StudySuggestionStreamEvent) => void,
        signal?: AbortSignal
    ) =>
        requestEventStream<StudySuggestionStreamEvent>(
            '/api/admin/studies/ai/suggestions/stream',
            payload,
            onEvent,
            signal
        ),
};
