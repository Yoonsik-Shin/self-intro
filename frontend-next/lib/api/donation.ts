import { request } from './client';
import type {
    AdminDonationSummary,
    DonationConfigResponse,
    DonationCreateResponse,
    DonationEvent,
    DonationStatus,
} from './types';

export const donationApi = {
    config: () => request<DonationConfigResponse>('/api/donations/config'),
    create: (amount: number, message?: string) =>
        request<DonationCreateResponse>('/api/donations', {
            method: 'POST',
            body: JSON.stringify({ amount, message: message || undefined }),
        }),
    status: (token: string) => request<{ status: DonationStatus }>(`/api/donations/${token}`),
    adminList: () => request<AdminDonationSummary>('/api/admin/donations'),
    adminEvents: (id: number) => request<DonationEvent[]>(`/api/admin/donations/${id}/events`),
    adminUpdateSettings: (enabled: boolean) =>
        request<{ enabled: boolean }>('/api/admin/donations/settings', {
            method: 'PUT',
            body: JSON.stringify({ enabled }),
        }),
    adminCancel: (id: number) =>
        request<void>(`/api/admin/donations/${id}/cancel`, { method: 'POST' }),
};
