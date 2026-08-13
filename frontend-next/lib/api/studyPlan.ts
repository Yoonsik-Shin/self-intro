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
    list: (workspaceSlug: string) => request<StudyPlanSummary[]>(`${workspaceBase(workspaceSlug)}`),
    get: (workspaceSlug: string, id: number) =>
        request<StudyPlan>(`${workspaceBase(workspaceSlug)}/${id}`),
    create: (workspaceSlug: string, payload: StudyPlanCreateRequest) =>
        request<StudyPlan>(workspaceBase(workspaceSlug), {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    sendMessage: (
        workspaceSlug: string,
        id: number,
        content: string,
        aiModel?: string,
        customModelName?: string
    ) =>
        request<StudyPlan>(`${workspaceBase(workspaceSlug)}/${id}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content, aiModel, customModelName }),
        }),
    generate: (workspaceSlug: string, id: number, aiModel?: string, customModelName?: string) =>
        request<StudyPlan>(
            `${workspaceBase(workspaceSlug)}/${id}/generate${aiModelQuery(aiModel, customModelName)}`,
            { method: 'POST' }
        ),
    toggleCandidateSelected: (workspaceSlug: string, planId: number, resourceId: number) =>
        request<StudyPlan>(
            `${workspaceBase(workspaceSlug)}/${planId}/candidates/${resourceId}/toggle-selected`,
            { method: 'PATCH' }
        ),
    setCategorySelected: (
        workspaceSlug: string,
        planId: number,
        category: string,
        selected: boolean
    ) =>
        request<StudyPlan>(
            `${workspaceBase(workspaceSlug)}/${planId}/candidates/category-selection`,
            {
                method: 'PATCH',
                body: JSON.stringify({ category, selected }),
            }
        ),
    confirm: (workspaceSlug: string, id: number) =>
        request<StudyPlan>(`${workspaceBase(workspaceSlug)}/${id}/confirm`, { method: 'POST' }),
    unconfirm: (workspaceSlug: string, id: number) =>
        request<StudyPlan>(`${workspaceBase(workspaceSlug)}/${id}/unconfirm`, { method: 'POST' }),
    toggleCompleted: (workspaceSlug: string, planId: number, itemId: number) =>
        request<StudyPlan>(
            `${workspaceBase(workspaceSlug)}/${planId}/items/${itemId}/toggle-completed`,
            {
                method: 'PATCH',
            }
        ),
    toggleUnderstanding: (workspaceSlug: string, planId: number, itemId: number) =>
        request<StudyPlan>(
            `${workspaceBase(workspaceSlug)}/${planId}/items/${itemId}/toggle-understanding`,
            { method: 'PATCH' }
        ),
    remove: (workspaceSlug: string, id: number) =>
        request<void>(`${workspaceBase(workspaceSlug)}/${id}`, { method: 'DELETE' }),
};

function workspaceBase(workspaceSlug: string): string {
    return `/api/worker/workspaces/${encodeURIComponent(workspaceSlug)}/study-plans/manage`;
}
