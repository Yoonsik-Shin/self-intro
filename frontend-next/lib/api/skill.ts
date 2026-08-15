import { request } from './client';
import type { Skill } from './types';

export type WorkspaceSkillSettingsPayload = Pick<
    Skill,
    'skillLevel' | 'skillVersion' | 'comment' | 'usageType' | 'isCore' | 'displayOrder'
>;

export type WorkspaceSkillCreatePayload = WorkspaceSkillSettingsPayload & {
    catalogSkillId: number;
};

export type CatalogSkillPayload = Pick<Skill, 'name' | 'category' | 'badgeKey' | 'badgeColor'>;

export const skillApi = {
    catalog: () => request<Skill[]>('/api/skill-catalog'),
    workspaceList: (workspaceSlug: string) =>
        request<Skill[]>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/skills`),
    workspaceCreate: (workspaceSlug: string, payload: WorkspaceSkillCreatePayload) =>
        request<Skill>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/skills`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    workspaceUpdate: (
        workspaceSlug: string,
        catalogSkillId: number,
        payload: WorkspaceSkillSettingsPayload
    ) =>
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
    create: (payload: CatalogSkillPayload) =>
        request<Skill>('/api/skills', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    update: (id: number, payload: CatalogSkillPayload) =>
        request<Skill>(`/api/skills/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    remove: (id: number) =>
        request<void>(`/api/skills/${id}`, {
            method: 'DELETE',
        }),
};
