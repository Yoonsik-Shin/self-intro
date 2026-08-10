import { request } from './client';
import type {
    DecisionDomain,
    DecisionStudyLinkRequest,
    ExperienceTreeDetail,
    ExperienceTreeIndex,
    ExperienceTreeStudyLink,
} from './types';

export const experienceTreeApi = {
    index: (params: { domain?: DecisionDomain; q?: string } = {}) => {
        const search = new URLSearchParams();
        if (params.domain) search.set('domain', params.domain);
        if (params.q) search.set('q', params.q);
        return request<ExperienceTreeIndex>(`/api/experience-tree?${search}`);
    },
    adminIndex: (params: { domain?: DecisionDomain; q?: string } = {}) => {
        const search = new URLSearchParams();
        if (params.domain) search.set('domain', params.domain);
        if (params.q) search.set('q', params.q);
        return request<ExperienceTreeIndex>(`/api/admin/experience-tree?${search}`);
    },
    detail: (stableKey: string) =>
        request<ExperienceTreeDetail>(
            `/api/experience-tree/situations/${encodeURIComponent(stableKey)}`
        ),
    adminDetail: (stableKey: string) =>
        request<ExperienceTreeDetail>(
            `/api/admin/experience-tree/situations/${encodeURIComponent(stableKey)}`
        ),
    createStudyLink: (payload: DecisionStudyLinkRequest) =>
        request<ExperienceTreeStudyLink>('/api/admin/experience-tree/study-links', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    updateStudyLink: (id: number, payload: DecisionStudyLinkRequest) =>
        request<ExperienceTreeStudyLink>(`/api/admin/experience-tree/study-links/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    removeStudyLink: (id: number) =>
        request<void>(`/api/admin/experience-tree/study-links/${id}`, { method: 'DELETE' }),
};
