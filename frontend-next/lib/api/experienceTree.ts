import { request } from './client';
import type {
    DecisionDomain,
    DecisionStudyLinkRequest,
    ExperienceTreeDetail,
    ExperienceTreeIndex,
    ExperienceTreeStudyLink,
} from './types';

export const experienceTreeApi = {
    workspaceIndex: (
        workspaceSlug: string,
        params: { domain?: DecisionDomain; q?: string } = {}
    ) => {
        const search = new URLSearchParams();
        if (params.domain) search.set('domain', params.domain);
        if (params.q) search.set('q', params.q);
        return request<ExperienceTreeIndex>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experience-tree?${search}`
        );
    },
    workspaceManageIndex: (
        workspaceSlug: string,
        params: { domain?: DecisionDomain; q?: string } = {}
    ) => {
        const search = new URLSearchParams();
        if (params.domain) search.set('domain', params.domain);
        if (params.q) search.set('q', params.q);
        return request<ExperienceTreeIndex>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experience-tree/manage?${search}`
        );
    },
    workspaceDetail: (workspaceSlug: string, stableKey: string) =>
        request<ExperienceTreeDetail>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experience-tree/situations/${encodeURIComponent(stableKey)}`
        ),
    workspaceManageDetail: (workspaceSlug: string, stableKey: string) =>
        request<ExperienceTreeDetail>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experience-tree/manage/situations/${encodeURIComponent(stableKey)}`
        ),
    index: (params: { domain?: DecisionDomain; q?: string } = {}) => {
        const search = new URLSearchParams();
        if (params.domain) search.set('domain', params.domain);
        if (params.q) search.set('q', params.q);
        return request<ExperienceTreeIndex>(`/api/experience-tree?${search}`);
    },
    detail: (stableKey: string) =>
        request<ExperienceTreeDetail>(
            `/api/experience-tree/situations/${encodeURIComponent(stableKey)}`
        ),
    workspaceCreateStudyLink: (workspaceSlug: string, payload: DecisionStudyLinkRequest) =>
        request<ExperienceTreeStudyLink>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experience-tree/manage/study-links`,
            { method: 'POST', body: JSON.stringify(payload) }
        ),
    workspaceUpdateStudyLink: (
        workspaceSlug: string,
        id: number,
        payload: DecisionStudyLinkRequest
    ) =>
        request<ExperienceTreeStudyLink>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experience-tree/manage/study-links/${id}`,
            { method: 'PUT', body: JSON.stringify(payload) }
        ),
    workspaceRemoveStudyLink: (workspaceSlug: string, id: number) =>
        request<void>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experience-tree/manage/study-links/${id}`,
            { method: 'DELETE' }
        ),
};
