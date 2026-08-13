import { request } from './client';

export type PlatformOperationsOverview = {
    accounts: {
        total: number;
        pendingVerification: number;
        active: number;
        suspended: number;
        deleted: number;
    };
    workspaces: {
        total: number;
        active: number;
        suspended: number;
        deleted: number;
        activePrivate: number;
        activePublished: number;
    };
    memberships: {
        total: number;
        active: number;
        invited: number;
        suspended: number;
    };
    generatedAt: string;
};

export const platformOperationsApi = {
    overview: () => request<PlatformOperationsOverview>('/api/ops/overview'),
};
