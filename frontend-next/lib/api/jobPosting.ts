import { request } from './client';
import type { JobApplication, JobPostingCandidate, JobPostingCollectionResult } from './types';

export const jobPostingApi = {
    list: () => request<JobPostingCandidate[]>('/api/admin/job-postings'),
    ingestUrl: (url: string) =>
        request<JobPostingCandidate>('/api/admin/job-postings/ingest-url', {
            method: 'POST',
            body: JSON.stringify({ url }),
        }),
    collect: () =>
        request<JobPostingCollectionResult>('/api/admin/job-postings/collect', {
            method: 'POST',
        }),
    save: (id: number) =>
        request<void>(`/api/admin/job-postings/${id}/save`, {
            method: 'PATCH',
        }),
    dismiss: (id: number) =>
        request<void>(`/api/admin/job-postings/${id}/dismiss`, {
            method: 'PATCH',
        }),
    convertToApplication: (id: number) =>
        request<JobApplication>(`/api/admin/job-postings/${id}/convert-to-application`, {
            method: 'POST',
        }),
};
