import { request } from './client';
import type {
    Study,
    StudyPage,
    StudyTaxonomyNode,
    Tag,
    StudySection,
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
            section?: StudySection;
        } = {}
    ) => {
        const search = new URLSearchParams();
        if (params.q) search.set('q', params.q);
        if (params.taxonomyNodeId) search.set('taxonomyNodeId', String(params.taxonomyNodeId));
        if (params.section) search.set('section', params.section);
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
    workspaceList: (
        workspaceSlug: string,
        params: {
            q?: string;
            taxonomyNodeId?: number;
            skillIds?: number[];
            experienceIds?: number[];
            experienceDetailIds?: number[];
            page?: number;
            size?: number;
            section?: StudySection;
        } = {}
    ) => {
        const search = studySearchParams(params);
        return request<StudyPage>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/studies?${search}`
        );
    },
    workspaceDetail: (workspaceSlug: string, slug: string) =>
        request<Study>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/studies/${encodeURIComponent(decodeURIComponent(slug))}`
        ),
    workspaceAdminList: (
        workspaceSlug: string,
        params: {
            q?: string;
            taxonomyNodeId?: number;
            skillIds?: number[];
            experienceIds?: number[];
            experienceDetailIds?: number[];
            section?: StudySection;
        } = {}
    ) => {
        const search = studyAdminSearchParams(params);
        return request<StudyPage>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/studies/manage?${search}`
        );
    },
    workspaceTags: (workspaceSlug: string) =>
        request<Tag[]>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/tags`),
    workspaceCreate: (workspaceSlug: string, payload: StudyRequest) =>
        request<Study>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/studies/manage`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    workspaceUpdate: (workspaceSlug: string, id: number, payload: StudyRequest) =>
        request<Study>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/studies/manage/${id}`,
            { method: 'PUT', body: JSON.stringify(payload) }
        ),
    workspaceRemove: (workspaceSlug: string, id: number) =>
        request<void>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/studies/manage/${id}`, {
            method: 'DELETE',
        }),
    publicTaxonomy: () => request<StudyTaxonomyNode[]>('/api/study-taxonomy'),
    tags: () => request<Tag[]>('/api/tags'),
    workspaceSuggest: (workspaceSlug: string, payload: StudySuggestionRequest) =>
        request<StudySuggestionResponse>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/studies/manage/ai/suggestions`,
            { method: 'POST', body: JSON.stringify(payload) }
        ),
    workspaceSuggestStream: (
        workspaceSlug: string,
        payload: StudySuggestionRequest,
        onEvent: (event: StudySuggestionStreamEvent) => void,
        signal?: AbortSignal
    ) =>
        requestEventStream<StudySuggestionStreamEvent>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/studies/manage/ai/suggestions/stream`,
            payload,
            onEvent,
            signal
        ),
};

function studyAdminSearchParams(params: {
    q?: string;
    taxonomyNodeId?: number;
    skillIds?: number[];
    experienceIds?: number[];
    experienceDetailIds?: number[];
    section?: StudySection;
}) {
    const search = studySearchParams(params);
    search.set('size', '100');
    return search;
}

function studySearchParams(params: {
    q?: string;
    taxonomyNodeId?: number;
    skillIds?: number[];
    experienceIds?: number[];
    experienceDetailIds?: number[];
    page?: number;
    size?: number;
    section?: StudySection;
}) {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.taxonomyNodeId) search.set('taxonomyNodeId', String(params.taxonomyNodeId));
    if (params.section) search.set('section', params.section);
    params.skillIds?.forEach((id) => search.append('skillIds', String(id)));
    params.experienceIds?.forEach((id) => search.append('experienceIds', String(id)));
    params.experienceDetailIds?.forEach((id) => search.append('experienceDetailIds', String(id)));
    search.set('page', String(params.page ?? 0));
    search.set('size', String(params.size ?? 20));
    return search;
}
