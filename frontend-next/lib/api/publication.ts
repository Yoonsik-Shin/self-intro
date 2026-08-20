import { request } from './client';
import type { IntroductionResponse } from './types';
import type { PublicStudyPreview } from './publicPage';

export type WorkspacePublicationStatus = {
    publicationStatus: 'PRIVATE' | 'PUBLISHED';
    revisionNumber: number | null;
    publishedAt: string | null;
    hasPublishedRevision: boolean;
};

export type WorkspacePublicationRevision = {
    revisionNumber: number;
    operationType: 'PUBLISH' | 'ROLLBACK';
    sourceRevisionNumber: number | null;
    profileRevisionId: number | null;
    experienceRevisionId: number | null;
    draftConfigVersion: number | null;
    schemaVersion: number;
    publishedAt: string;
    currentRevision: boolean;
    rollbackAvailable: boolean;
    pinned: boolean;
    note: string | null;
};

export type WorkspacePublicationHistory = {
    revisions: WorkspacePublicationRevision[];
    maximumRetainedRevisions: number;
    minimumRetentionDays: number;
};

const path = (workspaceSlug: string) =>
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/publication/manage`;

export const publicationApi = {
    status: (workspaceSlug: string) => request<WorkspacePublicationStatus>(path(workspaceSlug)),
    history: (workspaceSlug: string) =>
        request<WorkspacePublicationHistory>(`${path(workspaceSlug)}/revisions`),
    publish: (workspaceSlug: string, note?: string) =>
        request<WorkspacePublicationStatus>(`${path(workspaceSlug)}/publish`, {
            method: 'POST',
            body: JSON.stringify({ note: note ?? null }),
        }),
    pin: (workspaceSlug: string, revisionNumber: number) =>
        request<WorkspacePublicationRevision>(
            `${path(workspaceSlug)}/revisions/${revisionNumber}/pin`,
            { method: 'POST' }
        ),
    unpin: (workspaceSlug: string, revisionNumber: number) =>
        request<WorkspacePublicationRevision>(
            `${path(workspaceSlug)}/revisions/${revisionNumber}/unpin`,
            { method: 'POST' }
        ),
    unpublish: (workspaceSlug: string) =>
        request<WorkspacePublicationStatus>(`${path(workspaceSlug)}/unpublish`, {
            method: 'POST',
        }),
    rollback: (workspaceSlug: string, revisionNumber: number) =>
        request<WorkspacePublicationStatus>(
            `${path(workspaceSlug)}/revisions/${revisionNumber}/rollback`,
            { method: 'POST' }
        ),
    previewRevision: (workspaceSlug: string, revisionNumber: number) =>
        request<IntroductionResponse>(`${path(workspaceSlug)}/revisions/${revisionNumber}/preview`),
    previewRevisionStudy: (workspaceSlug: string, revisionNumber: number) =>
        request<PublicStudyPreview>(
            `${path(workspaceSlug)}/revisions/${revisionNumber}/preview/study`
        ),
};
