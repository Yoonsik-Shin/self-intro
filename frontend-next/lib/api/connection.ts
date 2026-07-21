import { request } from './client';
import type { ExperienceConnections, RelatedExperience, SkillConnections } from './types';

export const connectionApi = {
  getSkill: (id: number) => request<SkillConnections>(`/api/admin/skills/${id}/connections`),
  updateSkill: (id: number, payload: SkillConnections) =>
    request<SkillConnections>(`/api/admin/skills/${id}/connections`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getExperience: (id: number) => request<ExperienceConnections>(`/api/admin/experiences/${id}/connections`),
  updateExperience: (id: number, payload: ExperienceConnections) =>
    request<ExperienceConnections>(`/api/admin/experiences/${id}/connections`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  relatedExperiences: (id: number) => request<RelatedExperience[]>(`/api/experiences/${id}/related`),
};
