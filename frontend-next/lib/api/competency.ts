import { request, requestEventStream } from './client';
import type {
  Competency,
  CompetencyRequest,
  CompetencySuggestionRequest,
  CompetencySuggestionResponse,
  CompetencySuggestionStreamEvent,
} from './types';

export const competencyApi = {
  list: () => request<Competency[]>('/api/admin/competencies'),
  create: (payload: CompetencyRequest) =>
    request<Competency>('/api/admin/competencies', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: CompetencyRequest) =>
    request<Competency>(`/api/admin/competencies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<void>(`/api/admin/competencies/${id}`, {
      method: 'DELETE',
    }),
  suggest: (payload: CompetencySuggestionRequest) =>
    request<CompetencySuggestionResponse>('/api/admin/competencies/ai/suggestions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  suggestStream: (
    payload: CompetencySuggestionRequest,
    onEvent: (event: CompetencySuggestionStreamEvent) => void,
    signal?: AbortSignal,
  ) =>
    requestEventStream<CompetencySuggestionStreamEvent>(
      '/api/admin/competencies/ai/suggestions/stream',
      payload,
      onEvent,
      signal,
    ),
};
