import { create } from 'zustand';
import { authApi } from '@/lib/api';
import type { MeResponse } from '@/lib/api/auth';
import { publishAuthSessionEvent } from '@/lib/auth/sessionEvents';

type AuthState = {
    isAuthenticated: boolean;
    isChecking: boolean;
    me: MeResponse | null;
    reauthenticationExpiresAt: number | null;
    explicitReauthenticationExpiresAt: number | null;
    checkSession: () => Promise<void>;
    login: (
        username: string,
        password: string,
        totpCode?: string
    ) => Promise<{ mfaRequired: true } | { mfaRequired: false; me: MeResponse }>;
    logout: () => Promise<void>;
    withdrawAccount: (confirmation: string) => Promise<void>;
    confirmReauthentication: (password: string) => Promise<void>;
    expireReauthentication: () => Promise<void>;
    clearReauthentication: () => void;
    updateWorkspaceName: (workspaceSlug: string, name: string) => void;
    setUnauthenticated: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    isChecking: true,
    me: null,
    reauthenticationExpiresAt: null,
    explicitReauthenticationExpiresAt: null,
    checkSession: async () => {
        try {
            const me = await authApi.me();
            set({
                isAuthenticated: true,
                isChecking: false,
                me,
                reauthenticationExpiresAt: me.reauthenticationExpiresAtEpochMillis,
                explicitReauthenticationExpiresAt: me.explicitReauthenticationExpiresAtEpochMillis,
            });
        } catch {
            set({
                isAuthenticated: false,
                isChecking: false,
                me: null,
                reauthenticationExpiresAt: null,
                explicitReauthenticationExpiresAt: null,
            });
        }
    },
    login: async (username, password, totpCode) => {
        const result = await authApi.login(username, password, totpCode);
        if (result.mfaRequired) {
            set({
                isAuthenticated: false,
                me: null,
                reauthenticationExpiresAt: null,
                explicitReauthenticationExpiresAt: null,
            });
            return { mfaRequired: true };
        }
        const me = await authApi.me();
        set({
            isAuthenticated: true,
            me,
            reauthenticationExpiresAt: me.reauthenticationExpiresAtEpochMillis,
            explicitReauthenticationExpiresAt: me.explicitReauthenticationExpiresAtEpochMillis,
        });
        publishAuthSessionEvent('AUTHENTICATED');
        return { mfaRequired: false, me };
    },
    logout: async () => {
        try {
            await authApi.logout();
        } finally {
            set({
                isAuthenticated: false,
                me: null,
                reauthenticationExpiresAt: null,
                explicitReauthenticationExpiresAt: null,
            });
            publishAuthSessionEvent('UNAUTHENTICATED');
        }
    },
    withdrawAccount: async (confirmation) => {
        await authApi.withdrawAccount(confirmation);
        set({
            isAuthenticated: false,
            me: null,
            reauthenticationExpiresAt: null,
            explicitReauthenticationExpiresAt: null,
        });
        publishAuthSessionEvent('UNAUTHENTICATED');
    },
    confirmReauthentication: async (password) => {
        const status = await authApi.reauthenticate(password);
        set({
            reauthenticationExpiresAt: status.expiresAtEpochMillis,
            explicitReauthenticationExpiresAt: status.explicitExpiresAtEpochMillis,
        });
    },
    expireReauthentication: async () => {
        await authApi.expireReauthentication();
        set({
            reauthenticationExpiresAt: null,
            explicitReauthenticationExpiresAt: null,
        });
    },
    clearReauthentication: () =>
        set({
            reauthenticationExpiresAt: null,
            explicitReauthenticationExpiresAt: null,
        }),
    updateWorkspaceName: (workspaceSlug, name) =>
        set((state) => ({
            me: state.me
                ? {
                      ...state.me,
                      workspaces: state.me.workspaces.map((workspace) =>
                          workspace.slug === workspaceSlug ? { ...workspace, name } : workspace
                      ),
                  }
                : null,
        })),
    setUnauthenticated: () =>
        set({
            isAuthenticated: false,
            me: null,
            reauthenticationExpiresAt: null,
            explicitReauthenticationExpiresAt: null,
        }),
}));
