import { request } from './client';
import type { VisitorDaily, VisitorHourly, VisitorSummary } from './types';

export const visitorApi = {
  record: () => request<VisitorSummary>('/api/visits', { method: 'POST' }),
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
