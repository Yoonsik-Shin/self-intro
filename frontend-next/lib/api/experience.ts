import { request, requestEventStream } from './client';
import type {
    Experience,
    ExperienceRequest,
    ExperienceSuggestionRequest,
    ExperienceSuggestionResponse,
    ExperienceSuggestionStreamEvent,
    ExperienceDetailNarrativeRequest,
    ExperienceDetailNarrativeResponse,
} from './types';

export const experienceApi = {
    list: () => request<Experience[]>('/api/experiences'),
    create: (payload: ExperienceRequest) =>
        request<Experience>('/api/experiences', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    update: (id: number, payload: ExperienceRequest) =>
        request<Experience>(`/api/experiences/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    remove: (id: number) =>
        request<void>(`/api/experiences/${id}`, {
            method: 'DELETE',
        }),
    suggest: (payload: ExperienceSuggestionRequest) =>
        request<ExperienceSuggestionResponse>('/api/admin/experiences/ai/suggestions', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    suggestStream: (
        payload: ExperienceSuggestionRequest,
        onEvent: (event: ExperienceSuggestionStreamEvent) => void,
        signal?: AbortSignal
    ) =>
        requestEventStream<ExperienceSuggestionStreamEvent>(
            '/api/admin/experiences/ai/suggestions/stream',
            payload,
            onEvent,
            signal
        ),
    generateNarrative: (payload: ExperienceDetailNarrativeRequest) =>
        request<ExperienceDetailNarrativeResponse>('/api/admin/experiences/ai/details/narrative', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    toggleTimeline: (id: number) =>
        request<Experience>(`/api/experiences/${id}/toggle-timeline`, {
            method: 'PATCH',
        }),
    batchTimelineShow: (ids: number[]) =>
        request<Experience[]>('/api/experiences/batch-timeline-show', {
            method: 'POST',
            body: JSON.stringify(ids),
        }),
    batchTimelineHide: (ids: number[]) =>
        request<Experience[]>('/api/experiences/batch-timeline-hide', {
            method: 'POST',
            body: JSON.stringify(ids),
        }),
    reorder: (orderedIds: number[]) =>
        request<Experience[]>('/api/experiences/reorder', {
            method: 'POST',
            body: JSON.stringify(orderedIds),
        }),
};
