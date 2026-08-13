import { request } from './client';
import type { Skill } from './types';

export const skillApi = {
    catalog: () => request<Skill[]>('/api/skill-catalog'),
    workspaceList: (workspaceSlug: string) =>
        request<Skill[]>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/skills`),
    workspaceCreate: (workspaceSlug: string, payload: Omit<Skill, 'id'>) =>
        request<Skill>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/skills`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    workspaceUpdate: (workspaceSlug: string, catalogSkillId: number, payload: Omit<Skill, 'id'>) =>
        request<Skill>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/skills/${catalogSkillId}`,
            { method: 'PUT', body: JSON.stringify(payload) }
        ),
    workspaceRemove: (workspaceSlug: string, catalogSkillId: number) =>
        request<void>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/skills/${catalogSkillId}`,
            { method: 'DELETE' }
        ),
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
