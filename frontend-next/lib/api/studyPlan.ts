import { request } from './client';
import type { StudyPlan, StudyPlanCreateRequest, StudyPlanSummary } from './types';

export const studyPlanApi = {
    list: () => request<StudyPlanSummary[]>('/api/admin/study-plans'),
    get: (id: number) => request<StudyPlan>(`/api/admin/study-plans/${id}`),
    create: (payload: StudyPlanCreateRequest) =>
        request<StudyPlan>('/api/admin/study-plans', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    sendMessage: (id: number, content: string) =>
        request<StudyPlan>(`/api/admin/study-plans/${id}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        }),
    generate: (id: number) =>
        request<StudyPlan>(`/api/admin/study-plans/${id}/generate`, { method: 'POST' }),
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
