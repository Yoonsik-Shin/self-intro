import { request } from './client';
import type { ExperienceConnections, RelatedExperience, SkillConnections } from './types';

export const connectionApi = {
    getWorkspaceSkill: (workspaceSlug: string, id: number) =>
        request<SkillConnections>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/skills/${id}/connections`
        ),
    updateWorkspaceSkill: (workspaceSlug: string, id: number, payload: SkillConnections) =>
        request<SkillConnections>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/skills/${id}/connections`,
            { method: 'PUT', body: JSON.stringify(payload) }
        ),
    getSkill: (id: number) => request<SkillConnections>(`/api/admin/skills/${id}/connections`),
    updateSkill: (id: number, payload: SkillConnections) =>
        request<SkillConnections>(`/api/admin/skills/${id}/connections`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    getWorkspaceExperience: (workspaceSlug: string, id: number) =>
        request<ExperienceConnections>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experiences/manage/${id}/connections`
        ),
    updateWorkspaceExperience: (
        workspaceSlug: string,
        id: number,
        payload: ExperienceConnections
    ) =>
        request<ExperienceConnections>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experiences/manage/${id}/connections`,
            { method: 'PUT', body: JSON.stringify(payload) }
        ),
    getExperience: (id: number) =>
        request<ExperienceConnections>(`/api/admin/experiences/${id}/connections`),
    updateExperience: (id: number, payload: ExperienceConnections) =>
        request<ExperienceConnections>(`/api/admin/experiences/${id}/connections`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    relatedExperiences: (id: number) =>
        request<RelatedExperience[]>(`/api/experiences/${id}/related`),
    workspaceRelatedExperiences: (workspaceSlug: string, id: number) =>
        request<RelatedExperience[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experiences/${id}/related`
        ),
};
