import { request, requestEventStream } from './client';
import type {
    Competency,
    CompetencyRequest,
    CompetencySuggestionRequest,
    CompetencySuggestionResponse,
    CompetencySuggestionStreamEvent,
} from './types';

export const competencyApi = {
    workspaceList: (workspaceSlug: string) =>
        request<Competency[]>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/competencies`),
    workspaceCreate: (workspaceSlug: string, payload: CompetencyRequest) =>
        request<Competency>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/competencies`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    workspaceUpdate: (workspaceSlug: string, id: number, payload: CompetencyRequest) =>
        request<Competency>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/competencies/${id}`,
            { method: 'PUT', body: JSON.stringify(payload) }
        ),
    workspaceRemove: (workspaceSlug: string, id: number) =>
        request<void>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/competencies/${id}`, {
            method: 'DELETE',
        }),
    workspaceReorder: (workspaceSlug: string, orderedIds: number[]) =>
        request<Competency[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/competencies/reorder`,
            { method: 'POST', body: JSON.stringify(orderedIds) }
        ),
    workspaceSuggest: (workspaceSlug: string, payload: CompetencySuggestionRequest) =>
        request<CompetencySuggestionResponse>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/competencies/ai/suggestions`,
            { method: 'POST', body: JSON.stringify(payload) }
        ),
    workspaceSuggestStream: (
        workspaceSlug: string,
        payload: CompetencySuggestionRequest,
        onEvent: (event: CompetencySuggestionStreamEvent) => void,
        signal?: AbortSignal
    ) =>
        requestEventStream<CompetencySuggestionStreamEvent>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/competencies/ai/suggestions/stream`,
            payload,
            onEvent,
            signal
        ),
};
