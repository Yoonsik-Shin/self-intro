import { request, requestEventStream } from './client';
import type {
    GapProjectDocument,
    JobApplicationUrlParseResponse,
    JobApplicationUrlParseStreamEvent,
    JobPosting,
    JobPostingBulkIngestRow,
    JobPostingBulkIngestStreamEvent,
    JobPostingCoverLetterDraftRequest,
    JobPostingCoverLetterDraftResponse,
    JobPostingCoverLetterItem,
    JobPostingCoverLetterItemRequest,
    JobPostingCoverLetterRevision,
    JobPostingCollectionResult,
    JobPostingIngestStreamEvent,
    JobPostingPositionChoice,
    JobPostingPositionChoiceRequest,
    JobPostingPrintDraftResponse,
    JobPostingRequest,
    JobPostingSetting,
    JobPostingSettingRequest,
    JobPostingStatus,
    JobPostingStatusEvent,
    JobplanetCompanyRequest,
    JobplanetLookup,
} from './types';

export const jobPostingApi = {
    list: () => request<JobPosting[]>('/api/admin/job-postings'),
    get: (id: number) => request<JobPosting>(`/api/admin/job-postings/${id}`),
    coverLetterItems: (id: number) =>
        request<JobPostingCoverLetterItem[]>(`/api/admin/job-postings/${id}/cover-letter-items`),
    coverLetterRevisions: (itemId: number) =>
        request<JobPostingCoverLetterRevision[]>(
            `/api/admin/job-postings/cover-letter-items/${itemId}/revisions`
        ),
    replaceCoverLetterItems: (id: number, items: JobPostingCoverLetterItemRequest[]) =>
        request<JobPostingCoverLetterItem[]>(`/api/admin/job-postings/${id}/cover-letter-items`, {
            method: 'PUT',
            body: JSON.stringify({ items }),
        }),
    /** 2지망 이상을 확정/수정한다(1지망은 update()가 관리하는 positionTitle이 담당). */
    replacePositionChoices: (id: number, choices: JobPostingPositionChoiceRequest[]) =>
        request<JobPostingPositionChoice[]>(`/api/admin/job-postings/${id}/position-choices`, {
            method: 'PUT',
            body: JSON.stringify({ choices }),
        }),
    /** "새 지원 공고 등록" — 수집 단계 없이 이미 지원 완료한 공고를 바로 기록한다. */
    create: (payload: JobPostingRequest) =>
        request<JobPosting>('/api/admin/job-postings', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    update: (id: number, payload: JobPostingRequest) =>
        request<JobPosting>(`/api/admin/job-postings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    updateMemo: (id: number, memo: string | null) =>
        request<JobPosting>(`/api/admin/job-postings/${id}/memo`, {
            method: 'PATCH',
            body: JSON.stringify({ memo }),
        }),
    remove: (id: number) =>
        request<void>(`/api/admin/job-postings/${id}`, {
            method: 'DELETE',
        }),
    parseUrl: (url: string) =>
        request<JobApplicationUrlParseResponse>('/api/worker/job-postings/parse-url', {
            method: 'POST',
            body: JSON.stringify({ url }),
        }),
    parseUrlStream: (
        url: string,
        onEvent: (event: JobApplicationUrlParseStreamEvent) => void,
        signal?: AbortSignal
    ) =>
        requestEventStream<JobApplicationUrlParseStreamEvent>(
            '/api/worker/job-postings/parse-url/stream',
            { url },
            onEvent,
            signal
        ),
    getSettings: () => request<JobPostingSetting>('/api/admin/job-postings/settings'),
    updateSettings: (payload: JobPostingSettingRequest) =>
        request<JobPostingSetting>('/api/admin/job-postings/settings', {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    ingestUrl: (url: string) =>
        request<JobPosting>('/api/worker/job-postings/ingest-url', {
            method: 'POST',
            body: JSON.stringify({ url }),
        }),
    ingestUrlStream: (
        url: string,
        onEvent: (event: JobPostingIngestStreamEvent) => void,
        signal?: AbortSignal
    ) =>
        requestEventStream<JobPostingIngestStreamEvent>(
            '/api/worker/job-postings/ingest-url/stream',
            { url },
            onEvent,
            signal
        ),
    /** URL 파싱이 불가능한 공고를 JD 스크린샷으로 등록한다. */
    ingestImagesStream: (
        images: { objectKey: string; url: string; contentType: string }[],
        sourceUrl: string | null,
        onEvent: (event: JobPostingIngestStreamEvent) => void,
        signal?: AbortSignal
    ) =>
        requestEventStream<JobPostingIngestStreamEvent>(
            '/api/worker/job-postings/ingest-images/stream',
            { images, sourceUrl },
            onEvent,
            signal
        ),
    /** rows의 각 행은 url만 있으면 URL 자동수집, images가 있으면(url이 같이 있어도) 스크린샷 등록으로 처리된다. */
    ingestUrlsStream: (
        rows: JobPostingBulkIngestRow[],
        onEvent: (event: JobPostingBulkIngestStreamEvent) => void,
        signal?: AbortSignal
    ) =>
        requestEventStream<JobPostingBulkIngestStreamEvent>(
            '/api/worker/job-postings/ingest-urls/stream',
            { rows },
            onEvent,
            signal
        ),
    collect: () =>
        request<JobPostingCollectionResult>('/api/worker/job-postings/collect', {
            method: 'POST',
        }),
    /** 이미 수집/등록된 공고를 원본 URL에서 다시 읽어 최신 정보(마감일 등)로 갱신한다. */
    refresh: (id: number) =>
        request<JobPosting>(`/api/worker/job-postings/${id}/refresh`, {
            method: 'POST',
        }),
    save: (id: number) =>
        request<void>(`/api/admin/job-postings/${id}/save`, {
            method: 'PATCH',
        }),
    unsave: (id: number) =>
        request<void>(`/api/admin/job-postings/${id}/unsave`, {
            method: 'PATCH',
        }),
    dismiss: (id: number) =>
        request<void>(`/api/admin/job-postings/${id}/dismiss`, {
            method: 'PATCH',
        }),
    undismiss: (id: number) =>
        request<void>(`/api/admin/job-postings/${id}/undismiss`, {
            method: 'PATCH',
        }),
    /** 지원 전 후보를 "지원 완료" 상태로 전환한다(예전의 "지원 전환"). */
    apply: (id: number) =>
        request<JobPosting>(`/api/admin/job-postings/${id}/apply`, {
            method: 'POST',
        }),
    /** 실수로 지원 전환했거나 보드에서 잘못 옮긴 경우 지원 전 상태로 되돌린다. */
    unapply: (id: number) =>
        request<JobPosting>(`/api/admin/job-postings/${id}/unapply`, {
            method: 'POST',
        }),
    changeStatus: (id: number, status: JobPostingStatus, memo?: string) =>
        request<JobPosting>(`/api/admin/job-postings/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, memo }),
        }),
    statusEvents: (id: number) =>
        request<JobPostingStatusEvent[]>(`/api/admin/job-postings/${id}/status-events`),
    deleteStatusEvent: (id: number, eventId: number) =>
        request<JobPosting>(`/api/admin/job-postings/${id}/status-events/${eventId}`, {
            method: 'DELETE',
        }),
    analyzeAppeal: (id: number) =>
        request<JobPosting>(`/api/worker/job-postings/${id}/analyze-appeal`, {
            method: 'POST',
        }),
    generateCoverLetterDraft: (id: number, payload: JobPostingCoverLetterDraftRequest) =>
        request<JobPostingCoverLetterDraftResponse>(
            `/api/worker/job-postings/${id}/generate-cover-letter-draft`,
            {
                method: 'POST',
                body: JSON.stringify(payload),
            }
        ),
    generatePrintDraft: (id: number) =>
        request<JobPostingPrintDraftResponse>(
            `/api/worker/job-postings/${id}/print-template-draft`,
            { method: 'POST' }
        ),
    getJobplanet: (id: number) =>
        request<JobplanetLookup>(`/api/admin/job-postings/${id}/jobplanet`),
    saveJobplanet: (id: number, payload: JobplanetCompanyRequest) =>
        request<JobplanetLookup>(`/api/admin/job-postings/${id}/jobplanet`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    clearJobplanet: (id: number) =>
        request<JobplanetLookup>(`/api/admin/job-postings/${id}/jobplanet`, {
            method: 'DELETE',
        }),
    gapProjectDocuments: (id: number) =>
        request<GapProjectDocument[]>(`/api/worker/job-postings/${id}/gap-project-documents`),
    generateGapProjectDocument: (id: number) =>
        request<GapProjectDocument>(`/api/worker/job-postings/${id}/gap-project-documents`, {
            method: 'POST',
        }),
    rematch: (id: number) =>
        request<JobPosting>(`/api/worker/job-postings/${id}/rematch`, {
            method: 'POST',
        }),
};
