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
    PortfolioLayout,
    PortfolioLayoutOrientation,
    PortfolioLayoutRequest,
} from './types';

export const portfolioApi = {
    list: () => request<PortfolioCaseStudy[]>('/api/admin/portfolio/case-studies'),
    detail: (id: number) =>
        request<PortfolioCaseStudyDetail>(`/api/admin/portfolio/case-studies/${id}`),
    create: (payload: PortfolioCaseStudyCreateRequest) =>
        request<PortfolioCaseStudy>('/api/admin/portfolio/case-studies', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    rename: (id: number, slug: string, title: string) =>
        request<PortfolioCaseStudy>(`/api/admin/portfolio/case-studies/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ slug, title }),
        }),
    remove: (id: number) =>
        request<void>(`/api/admin/portfolio/case-studies/${id}`, { method: 'DELETE' }),
    saveRevision: (id: number, content: PortfolioCaseStudyContent, source: 'AI' | 'MANUAL') =>
        request<PortfolioCaseStudyRevision>(`/api/admin/portfolio/case-studies/${id}/revisions`, {
            method: 'POST',
            body: JSON.stringify({ content, source }),
        }),
    publish: (id: number, revisionId: number) =>
        request<PortfolioCaseStudy>(`/api/admin/portfolio/case-studies/${id}/publish`, {
            method: 'POST',
            body: JSON.stringify({ revisionId }),
        }),
    unpublish: (id: number) =>
        request<PortfolioCaseStudy>(`/api/admin/portfolio/case-studies/${id}/unpublish`, {
            method: 'POST',
        }),
    generateStream: (
        caseStudyId: number,
        payload: PortfolioCaseStudyGenerateRequest,
        onEvent: (event: PortfolioCaseStudyGenerateStreamEvent) => void,
        signal?: AbortSignal
    ) =>
        requestEventStream<PortfolioCaseStudyGenerateStreamEvent>(
            `/api/admin/portfolio/case-studies/${caseStudyId}/revisions/generate`,
            payload,
            onEvent,
            signal
        ),
    publicList: () => request<PortfolioCaseStudyPublicSummary[]>('/api/portfolio/case-studies'),
    publicDetail: (slug: string) =>
        request<PortfolioCaseStudyPublic>(
            `/api/portfolio/case-studies/${encodeURIComponent(slug)}`
        ),
    listLayouts: (caseStudyId: number) =>
        request<PortfolioLayout[]>(`/api/admin/portfolio/case-studies/${caseStudyId}/layouts`),
    createLayout: (caseStudyId: number, payload: PortfolioLayoutRequest) =>
        request<PortfolioLayout>(`/api/admin/portfolio/case-studies/${caseStudyId}/layouts`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    updateLayout: (caseStudyId: number, id: number, payload: PortfolioLayoutRequest) =>
        request<PortfolioLayout>(`/api/admin/portfolio/case-studies/${caseStudyId}/layouts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    removeLayout: (caseStudyId: number, id: number) =>
        request<void>(`/api/admin/portfolio/case-studies/${caseStudyId}/layouts/${id}`, {
            method: 'DELETE',
        }),
    publicDefaultLayout: (slug: string, orientation: PortfolioLayoutOrientation) =>
        request<PortfolioLayout>(
            `/api/portfolio/case-studies/${encodeURIComponent(slug)}/layout?orientation=${orientation}`
        ),
};
