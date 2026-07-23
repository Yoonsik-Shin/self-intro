import { request } from './client';
import type { AdminDonationSummary, DonationConfigResponse, DonationEvent } from './types';

export const donationApi = {
    config: () => request<DonationConfigResponse>('/api/donations/config'),
    adminList: () => request<AdminDonationSummary>('/api/admin/donations'),
    adminEvents: (id: number) => request<DonationEvent[]>(`/api/admin/donations/${id}/events`),
    adminUpdateSettings: (enabled: boolean) =>
        request<DonationConfigResponse>('/api/admin/donations/settings', {
            method: 'PUT',
            body: JSON.stringify({ enabled }),
        }),
};
