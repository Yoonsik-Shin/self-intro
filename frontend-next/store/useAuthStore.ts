import { create } from 'zustand';
import { authApi } from '@/lib/api';
import type { MeResponse } from '@/lib/api/auth';
import { publishAuthSessionEvent } from '@/lib/auth/sessionEvents';

type AuthState = {
    isAuthenticated: boolean;
    isChecking: boolean;
    me: MeResponse | null;
    checkSession: () => Promise<void>;
    login: (
        username: string,
        password: string,
        totpCode?: string
    ) => Promise<{ mfaRequired: true } | { mfaRequired: false; me: MeResponse }>;
    logout: () => Promise<void>;
    withdrawAccount: (confirmation: string) => Promise<void>;
    setUnauthenticated: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    isChecking: true,
    me: null,
    checkSession: async () => {
        try {
            const me = await authApi.me();
            set({ isAuthenticated: true, isChecking: false, me });
        } catch {
            set({ isAuthenticated: false, isChecking: false, me: null });
        }
    },
    login: async (username, password, totpCode) => {
        const result = await authApi.login(username, password, totpCode);
        if (result.mfaRequired) {
            set({ isAuthenticated: false, me: null });
            return { mfaRequired: true };
        }
        const me = await authApi.me();
        set({ isAuthenticated: true, me });
        publishAuthSessionEvent('AUTHENTICATED');
        return { mfaRequired: false, me };
    },
    logout: async () => {
        try {
            await authApi.logout();
        } finally {
            set({ isAuthenticated: false, me: null });
            publishAuthSessionEvent('UNAUTHENTICATED');
        }
    },
    withdrawAccount: async (confirmation) => {
        await authApi.withdrawAccount(confirmation);
        set({ isAuthenticated: false, me: null });
        publishAuthSessionEvent('UNAUTHENTICATED');
    },
    setUnauthenticated: () => set({ isAuthenticated: false, me: null }),
}));
