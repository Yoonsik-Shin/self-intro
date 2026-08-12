import { request } from './client';

export type InvitationStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';

export type Invitation = {
    id: number;
    label: string;
    recipientEmailMasked: string | null;
    status: InvitationStatus;
    maxUses: number;
    usedCount: number;
    sentCount: number;
    lastSentAt: string | null;
    expiresAt: string;
    revokedAt: string | null;
    createdAt: string;
};

export type IssuedInvitation = {
    invitation: Invitation;
    code: string | null;
    invitationUrl: string | null;
};

async function prepareMutation() {
    await request<void>('/api/auth/csrf');
}

export const invitationApi = {
    list: () => request<Invitation[]>('/api/ops/invitations'),
    issue: async (payload: {
        label: string;
        recipientEmail: string;
        maxUses: number;
        validForHours: number;
        sendEmail: boolean;
    }) => {
        await prepareMutation();
        return request<IssuedInvitation>('/api/ops/invitations', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },
    revoke: async (invitationId: number) => {
        await prepareMutation();
        return request<Invitation>(`/api/ops/invitations/${invitationId}`, {
            method: 'DELETE',
        });
    },
    replaceAndSend: async (invitationId: number) => {
        await prepareMutation();
        return request<IssuedInvitation>(`/api/ops/invitations/${invitationId}/replacement-email`, {
            method: 'POST',
        });
    },
};
