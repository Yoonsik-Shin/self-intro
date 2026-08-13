import { request } from './client';

export type AuthWorkspace = {
    workspaceId: number;
    publicKey: string | null;
    slug: string;
    name: string;
    role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
};

export type MeResponse = {
    userId: number;
    username: string;
    nickname: string;
    mfaEnabled: boolean;
    mfaEnrollmentRequired: boolean;
    mfaRecoveryReenrollmentAllowed: boolean;
    platformRoles: Array<'PLATFORM_OWNER' | 'PLATFORM_OPERATOR' | 'SUPPORT'>;
    workspaces: AuthWorkspace[];
};

export type LoginResponse = {
    authenticated: boolean;
    mfaRequired: boolean;
};

export type AccountWithdrawalReadiness = {
    eligible: boolean;
    activeMembershipCount: number;
    ownedWorkspaceBlockers: Array<{ workspaceId: number; slug: string; name: string }>;
    platformRoleBlockers: string[];
    confirmationPhrase: string;
};

type LegacyCompatibleMeResponse = Omit<MeResponse, 'nickname' | 'platformRoles' | 'workspaces'> & {
    nickname?: string;
    platformRoles?: MeResponse['platformRoles'];
    workspaces?: MeResponse['workspaces'];
};

function normalizeMe(response: LegacyCompatibleMeResponse): MeResponse {
    return {
        ...response,
        nickname: response.nickname ?? response.username,
        mfaEnabled: response.mfaEnabled ?? false,
        mfaEnrollmentRequired: response.mfaEnrollmentRequired ?? false,
        mfaRecoveryReenrollmentAllowed: response.mfaRecoveryReenrollmentAllowed ?? false,
        platformRoles: response.platformRoles ?? [],
        workspaces: response.workspaces ?? [],
    };
}

export const authApi = {
    csrf: () => request<void>('/api/auth/csrf'),
    register: async (payload: {
        invitationCode: string;
        email: string;
        password: string;
        nickname: string;
        termsAccepted: boolean;
        privacyAccepted: boolean;
        marketingAccepted: boolean;
    }) => {
        await request<void>('/api/auth/csrf');
        return request<void>('/api/auth/registrations', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },
    verifyEmail: async (token: string) => {
        await request<void>('/api/auth/csrf');
        return request<void>('/api/auth/email-verifications', {
            method: 'POST',
            body: JSON.stringify({ token }),
        });
    },
    createFirstWorkspace: (name: string) =>
        request<{ publicKey: string; slug: string; name: string; publicationStatus: 'PRIVATE' }>(
            '/api/workspaces/onboarding',
            { method: 'POST', body: JSON.stringify({ name }) }
        ),
    login: (username: string, password: string, totpCode?: string) =>
        request<LoginResponse>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password, totpCode: totpCode || null }),
        }),
    logout: () =>
        request<void>('/api/auth/logout', {
            method: 'POST',
        }),
    reauthenticate: async (password: string) => {
        await request<void>('/api/auth/csrf');
        return request<void>('/api/auth/reauthenticate', {
            method: 'POST',
            body: JSON.stringify({ password }),
        });
    },
    me: async () => normalizeMe(await request<LegacyCompatibleMeResponse>('/api/auth/me')),
    beginMfaEnrollment: () =>
        request<{ secret: string; otpauthUri: string }>('/api/auth/mfa/enrollment', {
            method: 'POST',
        }),
    confirmMfaEnrollment: (code: string) =>
        request<{ codes: string[] }>('/api/auth/mfa/enrollment/confirm', {
            method: 'POST',
            body: JSON.stringify({ code }),
        }),
    beginMfaRecoveryEnrollment: () =>
        request<{ secret: string; otpauthUri: string }>('/api/auth/mfa/recovery-enrollment', {
            method: 'POST',
        }),
    confirmMfaRecoveryEnrollment: (code: string) =>
        request<{ codes: string[] }>('/api/auth/mfa/recovery-enrollment/confirm', {
            method: 'POST',
            body: JSON.stringify({ code }),
        }),
    logoutAll: () =>
        request<void>('/api/auth/sessions/logout-all', {
            method: 'POST',
        }),
    withdrawalReadiness: () =>
        request<AccountWithdrawalReadiness>('/api/account/withdrawal-readiness'),
    withdrawAccount: async (confirmation: string) => {
        await request<void>('/api/auth/csrf');
        return request<void>('/api/account', {
            method: 'DELETE',
            body: JSON.stringify({ confirmation }),
        });
    },
};
