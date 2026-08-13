'use client';

import { request } from './client';

export type SupportAccessScope = 'PROFILE_READ' | 'EXPERIENCE_READ' | 'STUDY_READ';

export type SupportAccessRequestView = {
    id: number;
    workspaceId: number;
    workspaceSlug: string;
    workspaceName: string;
    operatorDisplayName: string;
    reason: string;
    scopes: SupportAccessScope[];
    requestedDurationMinutes: number;
    status: 'PENDING' | 'APPROVED' | 'DENIED' | 'REVOKED' | 'EXPIRED';
    requestedAt: string;
    requestExpiresAt: string;
    approvedAt: string | null;
    accessExpiresAt: string | null;
    revokedAt: string | null;
};

export type SupportSnapshot = {
    grantId: number;
    workspaceId: number;
    workspaceSlug: string;
    scope: SupportAccessScope;
    accessExpiresAt: string;
    data: Record<string, boolean | number | string | null>;
};

export const supportAccessApi = {
    listForOperator: () => request<SupportAccessRequestView[]>('/api/ops/support-access'),
    create: (payload: {
        workspaceSlug: string;
        reason: string;
        scopes: SupportAccessScope[];
        durationMinutes: number;
    }) =>
        request<SupportAccessRequestView>('/api/ops/support-access', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    revokeAsOperator: (requestId: number) =>
        request<SupportAccessRequestView>(`/api/ops/support-access/${requestId}/revoke`, {
            method: 'POST',
        }),
    snapshot: (workspaceSlug: string, scope: SupportAccessScope) =>
        request<SupportSnapshot>(
            `/api/ops/support-access/${encodeURIComponent(workspaceSlug)}/snapshot?scope=${scope}`
        ),
    listForWorkspace: (workspaceSlug: string) =>
        request<SupportAccessRequestView[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/support-access`
        ),
    approve: (workspaceSlug: string, requestId: number) =>
        request<SupportAccessRequestView>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/support-access/${requestId}/approve`,
            { method: 'POST' }
        ),
    deny: (workspaceSlug: string, requestId: number) =>
        request<SupportAccessRequestView>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/support-access/${requestId}/deny`,
            { method: 'POST' }
        ),
    revokeAsOwner: (workspaceSlug: string, requestId: number) =>
        request<SupportAccessRequestView>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/support-access/${requestId}/revoke`,
            { method: 'POST' }
        ),
};
