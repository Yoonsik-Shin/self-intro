import { request } from './client';
import type { VisitorDaily, VisitorHourly, VisitorSummary } from './types';

export const visitorApi = {
    record: () => request<VisitorSummary>('/api/visits', { method: 'POST' }),
    workspaceRecord: (workspaceSlug: string) =>
        request<VisitorSummary>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/visits`, {
            method: 'POST',
        }),
    workspaceSummary: (workspaceSlug: string) =>
        request<VisitorSummary>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/visits/manage/summary`
        ),
    workspaceDaily: (workspaceSlug: string, from?: string, to?: string) => {
        const search = new URLSearchParams();
        if (from) search.set('from', from);
        if (to) search.set('to', to);
        const query = search.toString();
        return request<VisitorDaily[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/visits/manage/daily${query ? `?${query}` : ''}`
        );
    },
    workspaceHourly: (workspaceSlug: string, date?: string) =>
        request<VisitorHourly[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/visits/manage/hourly${date ? `?date=${date}` : ''}`
        ),
    adminSummary: () => request<VisitorSummary>('/api/admin/visits/summary'),
    adminDaily: (from?: string, to?: string) => {
        const search = new URLSearchParams();
        if (from) search.set('from', from);
        if (to) search.set('to', to);
        const query = search.toString();
        return request<VisitorDaily[]>(`/api/admin/visits/daily${query ? `?${query}` : ''}`);
    },
    adminHourly: (date?: string) =>
        request<VisitorHourly[]>(`/api/admin/visits/hourly${date ? `?date=${date}` : ''}`),
};
