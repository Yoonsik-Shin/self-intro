import { request } from './client';

export const authApi = {
  login: (username: string, password: string) =>
    request<void>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () =>
    request<void>('/api/auth/logout', {
      method: 'POST',
    }),
  me: () => request<{ username: string }>('/api/auth/me'),
};
