import { request } from './client';
import type { StudyPlan, StudyPlanCreateRequest, StudyPlanSummary } from './types';

function aiModelQuery(aiModel?: string, customModelName?: string): string {
    const params = new URLSearchParams();
    if (aiModel) params.set('aiModel', aiModel);
    if (customModelName) params.set('customModelName', customModelName);
    const query = params.toString();
    return query ? `?${query}` : '';
}

export const studyPlanApi = {
    list: () => request<StudyPlanSummary[]>('/api/admin/study-plans'),
    get: (id: number) => request<StudyPlan>(`/api/admin/study-plans/${id}`),
    create: (payload: StudyPlanCreateRequest) =>
        request<StudyPlan>('/api/admin/study-plans', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    sendMessage: (id: number, content: string, aiModel?: string, customModelName?: string) =>
        request<StudyPlan>(`/api/admin/study-plans/${id}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content, aiModel, customModelName }),
        }),
    generate: (id: number, aiModel?: string, customModelName?: string) =>
        request<StudyPlan>(
            `/api/admin/study-plans/${id}/generate${aiModelQuery(aiModel, customModelName)}`,
            { method: 'POST' }
        ),
    toggleCandidateSelected: (planId: number, resourceId: number) =>
        request<StudyPlan>(
            `/api/admin/study-plans/${planId}/candidates/${resourceId}/toggle-selected`,
            { method: 'PATCH' }
        ),
    setCategorySelected: (planId: number, category: string, selected: boolean) =>
        request<StudyPlan>(`/api/admin/study-plans/${planId}/candidates/category-selection`, {
            method: 'PATCH',
            body: JSON.stringify({ category, selected }),
        }),
    confirm: (id: number) =>
        request<StudyPlan>(`/api/admin/study-plans/${id}/confirm`, { method: 'POST' }),
    unconfirm: (id: number) =>
        request<StudyPlan>(`/api/admin/study-plans/${id}/unconfirm`, { method: 'POST' }),
    toggleCompleted: (planId: number, itemId: number) =>
        request<StudyPlan>(`/api/admin/study-plans/${planId}/items/${itemId}/toggle-completed`, {
            method: 'PATCH',
        }),
    toggleUnderstanding: (planId: number, itemId: number) =>
        request<StudyPlan>(
            `/api/admin/study-plans/${planId}/items/${itemId}/toggle-understanding`,
            { method: 'PATCH' }
        ),
    remove: (id: number) => request<void>(`/api/admin/study-plans/${id}`, { method: 'DELETE' }),
};
