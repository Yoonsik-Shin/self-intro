import { request } from './client';

export interface ExternalServiceStatus {
    name: string;
    indicator: 'none' | 'minor' | 'major' | 'critical' | 'unknown';
    description: string;
    url: string;
}

export const systemStatusApi = {
    external: () => request<ExternalServiceStatus[]>('/api/admin/system-status/external'),
};
