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
    workspaceList: (workspaceSlug: string) =>
        request<Experience[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experiences/manage`
        ),
    workspaceCreate: (workspaceSlug: string, payload: ExperienceRequest) =>
        request<Experience>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experiences/manage`,
            { method: 'POST', body: JSON.stringify(payload) }
        ),
    workspaceUpdate: (workspaceSlug: string, id: number, payload: ExperienceRequest) =>
        request<Experience>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experiences/manage/${id}`,
            { method: 'PUT', body: JSON.stringify(payload) }
        ),
    workspaceRemove: (workspaceSlug: string, id: number) =>
        request<void>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experiences/manage/${id}`,
            { method: 'DELETE' }
        ),
    workspaceReorder: (workspaceSlug: string, orderedIds: number[]) =>
        request<Experience[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experiences/manage/reorder`,
            { method: 'POST', body: JSON.stringify(orderedIds) }
        ),
    workspaceSuggest: (workspaceSlug: string, payload: ExperienceSuggestionRequest) =>
        request<ExperienceSuggestionResponse>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experiences/manage/ai/suggestions`,
            { method: 'POST', body: JSON.stringify(payload) }
        ),
    workspaceSuggestStream: (
        workspaceSlug: string,
        payload: ExperienceSuggestionRequest,
        onEvent: (event: ExperienceSuggestionStreamEvent) => void,
        signal?: AbortSignal
    ) =>
        requestEventStream<ExperienceSuggestionStreamEvent>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experiences/manage/ai/suggestions/stream`,
            payload,
            onEvent,
            signal
        ),
    workspaceGenerateNarrative: (
        workspaceSlug: string,
        payload: ExperienceDetailNarrativeRequest
    ) =>
        request<ExperienceDetailNarrativeResponse>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experiences/manage/ai/details/narrative`,
            { method: 'POST', body: JSON.stringify(payload) }
        ),
};
