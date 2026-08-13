import { request, requestEventStream } from './client';
import { ApiError } from './errors';
import type {
    GapProjectDocument,
    JobApplicationUrlParseResponse,
    JobApplicationUrlParseStreamEvent,
    JobPosting,
    JobPostingCatalogItem,
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
    JobPostingPermissionReviewRequest,
    JobPostingPrintDraftStreamEvent,
    JobPostingRequest,
    JobPostingSetting,
    JobPostingSettingRequest,
    JobPostingStatus,
    JobPostingStatusEvent,
    JobplanetCompanyRequest,
    JobplanetLookup,
    WorkspaceJobApplicationRequest,
    WorkspacePrivateJobPostingRequest,
    WorkspaceJobScreenshotUploadResponse,
} from './types';

function aiModelQuery(aiModel?: string, customModelName?: string): string {
    const params = new URLSearchParams();
    if (aiModel) params.set('aiModel', aiModel);
    if (customModelName) params.set('customModelName', customModelName);
    const query = params.toString();
    return query ? `?${query}` : '';
}

function removedPersonalJobApplicationRoute<T>(...legacyArguments: unknown[]): Promise<T> {
    void legacyArguments;
    return Promise.reject(
        new ApiError(
            410,
            '개인 지원 관리는 현재 Workspace의 지원 현황 화면에서만 사용할 수 있습니다.'
        )
    );
}

export const jobPostingApi = {
    workspaceList: (workspaceSlug: string) =>
        request<JobPosting[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage`
        ),
    workspaceCatalog: (workspaceSlug: string, q?: string) => {
        const search = new URLSearchParams();
        if (q) search.set('q', q);
        return request<JobPostingCatalogItem[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/catalog?${search}`
        );
    },
    workspaceGet: (workspaceSlug: string, id: number) =>
        request<JobPosting>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/${id}`
        ),
    workspaceSave: (workspaceSlug: string, id: number, payload: WorkspaceJobApplicationRequest) =>
        request<JobPosting>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/${id}`,
            { method: 'POST', body: JSON.stringify(payload) }
        ),
    workspaceCreatePrivateSource: (
        workspaceSlug: string,
        payload: WorkspacePrivateJobPostingRequest
    ) =>
        request<JobPosting>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/private-sources`,
            { method: 'POST', body: JSON.stringify(payload) }
        ),
    workspaceParsePrivateSourceUrl: (workspaceSlug: string, url: string) =>
        request<JobApplicationUrlParseResponse>(
            `/api/worker/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/parse-url`,
            { method: 'POST', body: JSON.stringify({ url }) }
        ),
    workspaceIssueScreenshotUpload: (
        workspaceSlug: string,
        fileName: string,
        contentType: string,
        contentLength: number
    ) =>
        request<WorkspaceJobScreenshotUploadResponse>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/private-sources/screenshots/uploads`,
            {
                method: 'POST',
                body: JSON.stringify({ fileName, contentType, contentLength }),
            }
        ),
    workspaceParsePrivateSourceScreenshots: (workspaceSlug: string, uploadIds: string[]) =>
        request<JobApplicationUrlParseResponse>(
            `/api/worker/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/parse-screenshots`,
            { method: 'POST', body: JSON.stringify({ uploadIds }) }
        ),
    workspaceCancelScreenshotUpload: (workspaceSlug: string, uploadId: string) =>
        request<void>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/private-sources/screenshots/uploads/${encodeURIComponent(uploadId)}`,
            { method: 'DELETE' }
        ),
    workspaceUpdate: (workspaceSlug: string, id: number, payload: WorkspaceJobApplicationRequest) =>
        request<JobPosting>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/${id}`,
            { method: 'PUT', body: JSON.stringify(payload) }
        ),
    workspaceChangeStatus: (
        workspaceSlug: string,
        id: number,
        status: JobPostingStatus,
        appliedAt?: string | null,
        memo?: string
    ) =>
        request<JobPosting>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/${id}/status`,
            { method: 'PATCH', body: JSON.stringify({ status, appliedAt, memo }) }
        ),
    workspaceStatusEvents: (workspaceSlug: string, id: number) =>
        request<JobPostingStatusEvent[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/${id}/status-events`
        ),
    workspaceCoverLetterItems: (workspaceSlug: string, id: number) =>
        request<JobPostingCoverLetterItem[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/${id}/cover-letter-items`
        ),
    workspaceCoverLetterRevisions: (workspaceSlug: string, id: number, itemId: number) =>
        request<JobPostingCoverLetterRevision[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/${id}/cover-letter-items/${itemId}/revisions`
        ),
    workspaceReplaceCoverLetterItems: (
        workspaceSlug: string,
        id: number,
        items: JobPostingCoverLetterItemRequest[]
    ) =>
        request<JobPostingCoverLetterItem[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/${id}/cover-letter-items`,
            { method: 'PUT', body: JSON.stringify({ items }) }
        ),
    workspaceGenerateCoverLetterDraft: (
        workspaceSlug: string,
        id: number,
        payload: JobPostingCoverLetterDraftRequest,
        options?: { signal?: AbortSignal }
    ) =>
        request<JobPostingCoverLetterDraftResponse>(
            `/api/worker/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/${id}/generate-cover-letter-draft`,
            { method: 'POST', body: JSON.stringify(payload), signal: options?.signal }
        ),
    workspaceAnalyzeAppeal: (
        workspaceSlug: string,
        id: number,
        aiModel?: string,
        customModelName?: string
    ) =>
        request<JobPosting>(
            `/api/worker/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/${id}/analyze-appeal${aiModelQuery(aiModel, customModelName)}`,
            { method: 'POST' }
        ),
    workspaceRematch: (workspaceSlug: string, id: number) =>
        request<JobPosting>(
            `/api/worker/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/${id}/rematch`,
            { method: 'POST' }
        ),
    workspaceGapProjectDocuments: (workspaceSlug: string, id: number) =>
        request<GapProjectDocument[]>(
            `/api/worker/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/${id}/gap-project-documents`
        ),
    workspaceGenerateGapProjectDocument: (
        workspaceSlug: string,
        id: number,
        aiModel?: string,
        customModelName?: string
    ) =>
        request<GapProjectDocument>(
            `/api/worker/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/${id}/gap-project-documents${aiModelQuery(aiModel, customModelName)}`,
            { method: 'POST' }
        ),
    workspaceGeneratePrintDraftStream: (
        workspaceSlug: string,
        id: number,
        onEvent: (event: JobPostingPrintDraftStreamEvent) => void,
        signal?: AbortSignal,
        aiModel?: string,
        customModelName?: string
    ) =>
        requestEventStream<JobPostingPrintDraftStreamEvent>(
            `/api/worker/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/${id}/print-template-draft/stream${aiModelQuery(aiModel, customModelName)}`,
            {},
            onEvent,
            signal
        ),
    workspaceReviseAiPrintDraftStream: (
        workspaceSlug: string,
        id: number,
        templateId: number,
        feedbackInstruction: string,
        onEvent: (event: JobPostingPrintDraftStreamEvent) => void,
        signal?: AbortSignal,
        aiModel?: string,
        customModelName?: string
    ) =>
        requestEventStream<JobPostingPrintDraftStreamEvent>(
            `/api/worker/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/${id}/print-template-draft/${templateId}/revise/stream${aiModelQuery(aiModel, customModelName)}`,
            { feedbackInstruction },
            onEvent,
            signal
        ),
    workspaceRemove: (workspaceSlug: string, id: number) =>
        request<void>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/job-applications/manage/${id}`,
            { method: 'DELETE' }
        ),
    list: () => request<JobPosting[]>('/api/admin/job-postings'),
    get: (id: number) => request<JobPosting>(`/api/admin/job-postings/${id}`),
    reviewSharingPermission: (id: number, payload: JobPostingPermissionReviewRequest) =>
        request<JobPosting>(`/api/admin/job-postings/${id}/permission-review`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    /** @deprecated 개인 지원 관리는 Workspace canonical API만 사용한다. */
    replacePositionChoices: (id: number, choices: JobPostingPositionChoiceRequest[]) =>
        removedPersonalJobApplicationRoute<JobPostingPositionChoice[]>(id, choices),
    /** @deprecated 개인 지원 관리는 Workspace canonical API만 사용한다. */
    create: (payload: JobPostingRequest) => removedPersonalJobApplicationRoute<JobPosting>(payload),
    /** @deprecated 개인 지원 관리는 Workspace canonical API만 사용한다. */
    update: (id: number, payload: JobPostingRequest) =>
        removedPersonalJobApplicationRoute<JobPosting>(id, payload),
    /** @deprecated 개인 지원 관리는 Workspace canonical API만 사용한다. */
    updateMemo: (id: number, memo: string | null) =>
        removedPersonalJobApplicationRoute<JobPosting>(id, memo),
    /** @deprecated 개인 지원 관리는 Workspace canonical API만 사용한다. */
    remove: (id: number) => removedPersonalJobApplicationRoute<void>(id),
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
    /** @deprecated 개인 지원 설정은 Workspace 계약 확정 전까지 제공하지 않는다. */
    getSettings: () => removedPersonalJobApplicationRoute<JobPostingSetting>(),
    /** @deprecated 개인 지원 설정은 Workspace 계약 확정 전까지 제공하지 않는다. */
    updateSettings: (payload: JobPostingSettingRequest) =>
        removedPersonalJobApplicationRoute<JobPostingSetting>(payload),
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
    /** 등록된 공고 전체를 원본 URL에서 일괄 다시 읽어 최신 정보로 백필/갱신한다. */
    refreshAll: (onlyActive: boolean = true) =>
        request<{
            totalTarget: number;
            successCount: number;
            failedCount: number;
            skippedCount: number;
            logs: string[];
        }>(`/api/worker/job-postings/refresh-all?onlyActive=${onlyActive}`, {
            method: 'POST',
        }),
    /** 등록된 공고 전체 백필 재수집을 SSE 스트림으로 실시간 진행상황 받아오며 수행한다. */
    refreshAllStream: (
        onEvent: (event: JobPostingBulkIngestStreamEvent) => void,
        onlyActive: boolean = true,
        signal?: AbortSignal
    ) =>
        requestEventStream<JobPostingBulkIngestStreamEvent>(
            `/api/worker/job-postings/refresh-all/stream?onlyActive=${onlyActive}`,
            {},
            onEvent,
            signal
        ),
    /** @deprecated 개인 지원 관리는 Workspace canonical API만 사용한다. */
    save: (id: number) => removedPersonalJobApplicationRoute<void>(id),
    /** @deprecated 개인 지원 관리는 Workspace canonical API만 사용한다. */
    unsave: (id: number) => removedPersonalJobApplicationRoute<void>(id),
    /** @deprecated 개인 지원 관리는 Workspace canonical API만 사용한다. */
    dismiss: (id: number) => removedPersonalJobApplicationRoute<void>(id),
    /** @deprecated 개인 지원 관리는 Workspace canonical API만 사용한다. */
    undismiss: (id: number) => removedPersonalJobApplicationRoute<void>(id),
    /** @deprecated 개인 지원 관리는 Workspace canonical API만 사용한다. */
    apply: (id: number) => removedPersonalJobApplicationRoute<JobPosting>(id),
    /** @deprecated 개인 지원 관리는 Workspace canonical API만 사용한다. */
    unapply: (id: number) => removedPersonalJobApplicationRoute<JobPosting>(id),
    /** @deprecated 개인 지원 관리는 Workspace canonical API만 사용한다. */
    changeStatus: (id: number, status: JobPostingStatus, memo?: string) =>
        removedPersonalJobApplicationRoute<JobPosting>(id, status, memo),
    /** @deprecated 개인 지원 관리는 Workspace canonical API만 사용한다. */
    statusEvents: (id: number) => removedPersonalJobApplicationRoute<JobPostingStatusEvent[]>(id),
    /** @deprecated 개인 지원 관리는 Workspace canonical API만 사용한다. */
    deleteStatusEvent: (id: number, eventId: number) =>
        removedPersonalJobApplicationRoute<JobPosting>(id, eventId),
    /** @deprecated 개인 지원 관리는 Workspace canonical API만 사용한다. */
    getJobplanet: (id: number) => removedPersonalJobApplicationRoute<JobplanetLookup>(id),
    /** @deprecated 개인 지원 관리는 Workspace canonical API만 사용한다. */
    saveJobplanet: (id: number, payload: JobplanetCompanyRequest) =>
        removedPersonalJobApplicationRoute<JobplanetLookup>(id, payload),
    /** @deprecated 개인 지원 관리는 Workspace canonical API만 사용한다. */
    clearJobplanet: (id: number) => removedPersonalJobApplicationRoute<JobplanetLookup>(id),
};
