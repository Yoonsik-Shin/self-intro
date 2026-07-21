import { request } from './client';
import type { Skill } from './types';

export const skillApi = {
  list: () => request<Skill[]>('/api/skills'),
  create: (payload: Omit<Skill, 'id'>) =>
    request<Skill>('/api/skills', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: Omit<Skill, 'id'>) =>
    request<Skill>(`/api/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<void>(`/api/skills/${id}`, {
      method: 'DELETE',
    }),
};
