import { request, requestEventStream } from './client';
import type {
    JobApplication,
    JobPostingCandidate,
    JobPostingCandidateUpdateRequest,
    JobPostingCollectionResult,
    JobPostingIngestStreamEvent,
    JobPostingSetting,
    JobPostingSettingRequest,
} from './types';

export const jobPostingApi = {
    list: () => request<JobPostingCandidate[]>('/api/admin/job-postings'),
    getSettings: () => request<JobPostingSetting>('/api/admin/job-postings/settings'),
    updateSettings: (payload: JobPostingSettingRequest) =>
        request<JobPostingSetting>('/api/admin/job-postings/settings', {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    ingestUrl: (url: string) =>
        request<JobPostingCandidate>('/api/admin/job-postings/ingest-url', {
            method: 'POST',
            body: JSON.stringify({ url }),
        }),
    ingestUrlStream: (
        url: string,
        onEvent: (event: JobPostingIngestStreamEvent) => void,
        signal?: AbortSignal
    ) =>
        requestEventStream<JobPostingIngestStreamEvent>(
            '/api/admin/job-postings/ingest-url/stream',
            { url },
            onEvent,
            signal
        ),
    collect: () =>
        request<JobPostingCollectionResult>('/api/admin/job-postings/collect', {
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
    convertToApplication: (id: number) =>
        request<JobApplication>(`/api/admin/job-postings/${id}/convert-to-application`, {
            method: 'POST',
        }),
    analyzeAppeal: (id: number) =>
        request<JobPostingCandidate>(`/api/admin/job-postings/${id}/analyze-appeal`, {
            method: 'POST',
        }),
    update: (id: number, payload: JobPostingCandidateUpdateRequest) =>
        request<JobPostingCandidate>(`/api/admin/job-postings/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        }),
    remove: (id: number) =>
        request<void>(`/api/admin/job-postings/${id}`, {
            method: 'DELETE',
        }),
};
