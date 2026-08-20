import { request, requestEventStream } from './client';
import type {
    PortfolioCaseStudy,
    PortfolioCaseStudyContent,
    PortfolioCaseStudyCreateRequest,
    PortfolioCaseStudyDetail,
    PortfolioCaseStudyGenerateRequest,
    PortfolioCaseStudyGenerateStreamEvent,
    PortfolioCaseStudyPublic,
    PortfolioCaseStudyPublicSummary,
    PortfolioCaseStudyRevision,
} from './types';

export const portfolioApi = {
    workspaceList: (workspaceSlug: string) =>
        request<PortfolioCaseStudy[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/portfolio/case-studies/manage`
        ),
    workspaceDetail: (workspaceSlug: string, id: number) =>
        request<PortfolioCaseStudyDetail>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/portfolio/case-studies/manage/${id}`
        ),
    workspaceCreate: (workspaceSlug: string, payload: PortfolioCaseStudyCreateRequest) =>
        request<PortfolioCaseStudy>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/portfolio/case-studies/manage`,
            { method: 'POST', body: JSON.stringify(payload) }
        ),
    workspaceRename: (workspaceSlug: string, id: number, slug: string, title: string) =>
        request<PortfolioCaseStudy>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/portfolio/case-studies/manage/${id}`,
            { method: 'PUT', body: JSON.stringify({ slug, title }) }
        ),
    workspaceRemove: (workspaceSlug: string, id: number) =>
        request<void>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/portfolio/case-studies/manage/${id}`,
            { method: 'DELETE' }
        ),
    workspaceSaveRevision: (
        workspaceSlug: string,
        id: number,
        content: PortfolioCaseStudyContent,
        source: 'AI' | 'MANUAL',
        metadata?: {
            baseRevisionId?: number | null;
            feedbackInstruction?: string | null;
            aiModel?: string | null;
        }
    ) =>
        request<PortfolioCaseStudyRevision>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/portfolio/case-studies/manage/${id}/revisions`,
            { method: 'POST', body: JSON.stringify({ content, source, ...metadata }) }
        ),
    workspacePublish: (workspaceSlug: string, id: number, revisionId: number) =>
        request<PortfolioCaseStudy>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/portfolio/case-studies/manage/${id}/publish`,
            { method: 'POST', body: JSON.stringify({ revisionId }) }
        ),
    workspaceUnpublish: (workspaceSlug: string, id: number) =>
        request<PortfolioCaseStudy>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/portfolio/case-studies/manage/${id}/unpublish`,
            { method: 'POST' }
        ),
    workspaceGenerateStream: (
        workspaceSlug: string,
        caseStudyId: number,
        payload: PortfolioCaseStudyGenerateRequest,
        onEvent: (event: PortfolioCaseStudyGenerateStreamEvent) => void,
        signal?: AbortSignal
    ) =>
        requestEventStream<PortfolioCaseStudyGenerateStreamEvent>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/portfolio/case-studies/manage/${caseStudyId}/revisions/generate`,
            payload,
            onEvent,
            signal
        ),
    publicList: () => request<PortfolioCaseStudyPublicSummary[]>('/api/portfolio/case-studies'),
    workspacePublicList: (workspaceSlug: string) =>
        request<PortfolioCaseStudyPublicSummary[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/portfolio/case-studies`
        ),
    publicDetail: (slug: string) =>
        request<PortfolioCaseStudyPublic>(
            `/api/portfolio/case-studies/${encodeURIComponent(slug)}`
        ),
    workspacePublicDetail: (workspaceSlug: string, slug: string) =>
        request<PortfolioCaseStudyPublic>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/portfolio/case-studies/${encodeURIComponent(slug)}`
        ),
    publicListByStudy: (studyId: number) =>
        request<PortfolioCaseStudyPublicSummary[]>(
            `/api/portfolio/case-studies/by-study/${studyId}`
        ),
    workspacePublicListByStudy: (workspaceSlug: string, studyId: number) =>
        request<PortfolioCaseStudyPublicSummary[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/portfolio/case-studies/by-study/${studyId}`
        ),
};
