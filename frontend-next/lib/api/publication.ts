import { request } from './client';

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
    publish: (workspaceSlug: string) =>
        request<WorkspacePublicationStatus>(`${path(workspaceSlug)}/publish`, {
            method: 'POST',
        }),
    unpublish: (workspaceSlug: string) =>
        request<WorkspacePublicationStatus>(`${path(workspaceSlug)}/unpublish`, {
            method: 'POST',
        }),
    rollback: (workspaceSlug: string, revisionNumber: number) =>
        request<WorkspacePublicationStatus>(
            `${path(workspaceSlug)}/revisions/${revisionNumber}/rollback`,
            { method: 'POST' }
        ),
};
