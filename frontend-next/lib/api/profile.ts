import { request } from './client';
import type { Profile } from './types';

export const profileApi = {
    update: (payload: Omit<Profile, 'id' | 'updatedAt'>) =>
        request<Profile>('/api/profile', {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
};
