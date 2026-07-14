import { create } from 'zustand';
import { authApi } from '../lib/api';

type AuthState = {
  isAuthenticated: boolean;
  isChecking: boolean;
  checkSession: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUnauthenticated: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isChecking: true,
  checkSession: async () => {
    try {
      await authApi.me();
      set({ isAuthenticated: true, isChecking: false });
    } catch {
      set({ isAuthenticated: false, isChecking: false });
    }
  },
  login: async (username, password) => {
    await authApi.login(username, password);
    set({ isAuthenticated: true });
  },
  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({ isAuthenticated: false });
    }
  },
  setUnauthenticated: () => set({ isAuthenticated: false }),
}));
