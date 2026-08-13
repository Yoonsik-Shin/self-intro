import { requestEventStream } from './client';
import type { PortfolioPrintDraftStreamEvent } from './types';

function draftQuery(
    orientation: 'PORTRAIT' | 'LANDSCAPE',
    aiModel?: string,
    customModelName?: string
): string {
    const params = new URLSearchParams({ orientation });
    if (aiModel) params.set('aiModel', aiModel);
    if (customModelName) params.set('customModelName', customModelName);
    return `?${params.toString()}`;
}

function aiModelQuery(aiModel?: string, customModelName?: string): string {
    const params = new URLSearchParams();
    if (aiModel) params.set('aiModel', aiModel);
    if (customModelName) params.set('customModelName', customModelName);
    const query = params.toString();
    return query ? `?${query}` : '';
}

export const portfolioPrintDraftApi = {
    generateStream: (
        workspaceSlug: string,
        caseStudyId: number,
        orientation: 'PORTRAIT' | 'LANDSCAPE',
        onEvent: (event: PortfolioPrintDraftStreamEvent) => void,
        signal?: AbortSignal,
        aiModel?: string,
        customModelName?: string
    ) =>
        requestEventStream<PortfolioPrintDraftStreamEvent>(
            `/api/worker/workspaces/${encodeURIComponent(workspaceSlug)}/portfolio/case-studies/manage/${caseStudyId}/print-draft/stream${draftQuery(orientation, aiModel, customModelName)}`,
            {},
            onEvent,
            signal
        ),
    reviseStream: (
        workspaceSlug: string,
        caseStudyId: number,
        templateId: number,
        feedbackInstruction: string,
        onEvent: (event: PortfolioPrintDraftStreamEvent) => void,
        signal?: AbortSignal,
        aiModel?: string,
        customModelName?: string
    ) =>
        requestEventStream<PortfolioPrintDraftStreamEvent>(
            `/api/worker/workspaces/${encodeURIComponent(workspaceSlug)}/portfolio/case-studies/manage/${caseStudyId}/print-draft/${templateId}/revise/stream${aiModelQuery(aiModel, customModelName)}`,
            { feedbackInstruction },
            onEvent,
            signal
        ),
};
