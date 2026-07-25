import { request } from './client';
import type {
    JobApplication,
    JobApplicationRequest,
    JobApplicationStage,
    JobApplicationStageEvent,
    JobApplicationUrlParseResponse,
} from './types';

export const jobApplicationApi = {
    list: () => request<JobApplication[]>('/api/admin/job-applications'),
    parseUrl: (url: string) =>
        request<JobApplicationUrlParseResponse>('/api/admin/job-applications/parse-url', {
            method: 'POST',
            body: JSON.stringify({ url }),
        }),
    get: (id: number) => request<JobApplication>(`/api/admin/job-applications/${id}`),
    create: (payload: JobApplicationRequest) =>
        request<JobApplication>('/api/admin/job-applications', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    update: (id: number, payload: JobApplicationRequest) =>
        request<JobApplication>(`/api/admin/job-applications/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    remove: (id: number) =>
        request<void>(`/api/admin/job-applications/${id}`, {
            method: 'DELETE',
        }),
    changeStage: (id: number, stage: JobApplicationStage, memo?: string) =>
        request<JobApplication>(`/api/admin/job-applications/${id}/stage`, {
            method: 'PATCH',
            body: JSON.stringify({ stage, memo }),
        }),
    stageEvents: (id: number) =>
        request<JobApplicationStageEvent[]>(`/api/admin/job-applications/${id}/stage-events`),
};
