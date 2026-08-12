import { request } from './client';

export type WorkspaceSlugResolution = {
    requestedSlug: string;
    canonicalSlug: string;
};

export type WorkspaceSlugSettings = {
    canonicalSlug: string;
    activeAliases: string[];
    minimumLength: number;
    maximumLength: number;
};

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export type WorkspaceMember = {
    id: number;
    displayName: string;
    emailMasked: string | null;
    role: WorkspaceRole;
    joinedAt: string;
};

export type WorkspaceMembershipInvitation = {
    id: number;
    recipientEmailMasked: string;
    role: WorkspaceRole;
    status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'DECLINED' | 'EXPIRED';
    expiresAt: string;
    createdAt: string;
};

export type WorkspaceMembershipManagement = {
    members: WorkspaceMember[];
    invitations: WorkspaceMembershipInvitation[];
};

export const workspaceApi = {
    resolveSlug: (workspaceSlug: string) =>
        request<WorkspaceSlugResolution>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/slug-resolution`
        ),
    slugSettings: (workspaceSlug: string) =>
        request<WorkspaceSlugSettings>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/settings/slug`
        ),
    changeSlug: (workspaceSlug: string, slug: string) =>
        request<WorkspaceSlugSettings>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/settings/slug`,
            { method: 'PUT', body: JSON.stringify({ slug }) }
        ),
    rename: (workspaceSlug: string, name: string) =>
        request<{ workspaceId: number; slug: string; name: string }>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/settings/name`,
            { method: 'PUT', body: JSON.stringify({ name }) }
        ),
    leave: (workspaceSlug: string) =>
        request<void>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/members/leave`, {
            method: 'POST',
        }),
    close: (workspaceSlug: string, workspaceName: string) =>
        request<void>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/lifecycle`, {
            method: 'DELETE',
            body: JSON.stringify({ workspaceName }),
        }),
    membership: (workspaceSlug: string) =>
        request<WorkspaceMembershipManagement>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/members/manage`
        ),
    inviteMember: (
        workspaceSlug: string,
        payload: { email: string; role: Exclude<WorkspaceRole, 'OWNER'>; validForHours: number }
    ) =>
        request<WorkspaceMembershipInvitation>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/members/manage/invitations`,
            { method: 'POST', body: JSON.stringify(payload) }
        ),
    revokeMemberInvitation: (workspaceSlug: string, invitationId: number) =>
        request<WorkspaceMembershipInvitation>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/members/manage/invitations/${invitationId}`,
            { method: 'DELETE' }
        ),
    changeMemberRole: (
        workspaceSlug: string,
        memberId: number,
        role: Exclude<WorkspaceRole, 'OWNER'>
    ) =>
        request<WorkspaceMember>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/members/manage/${memberId}/role`,
            { method: 'PUT', body: JSON.stringify({ role }) }
        ),
    removeMember: (workspaceSlug: string, memberId: number) =>
        request<void>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/members/manage/${memberId}`,
            { method: 'DELETE' }
        ),
    transferOwnership: (workspaceSlug: string, memberId: number) =>
        request<{ previousOwner: WorkspaceMember; newOwner: WorkspaceMember }>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/members/manage/${memberId}/transfer-ownership`,
            { method: 'POST' }
        ),
    acceptMembershipInvitation: async (token: string) => {
        await request<void>('/api/auth/csrf');
        return request<{ workspaceSlug: string; member: WorkspaceMember }>(
            '/api/workspace-membership-invitations/accept',
            {
                method: 'POST',
                body: JSON.stringify({ token }),
            }
        );
    },
    declineMembershipInvitation: async (token: string) => {
        await request<void>('/api/auth/csrf');
        return request<void>('/api/workspace-membership-invitations/decline', {
            method: 'POST',
            body: JSON.stringify({ token }),
        });
    },
};
