'use client';

import { request } from './client';

export type WorkspacePurgeCheckpoint = {
    store: 'MYSQL_PRIMARY' | 'OBJECT_STORAGE' | 'ORACLE_VECTOR' | 'ORACLE_NOSQL' | 'REDIS_CACHE';
    status: 'PENDING' | 'BLOCKED' | 'READY' | 'COMPLETED' | 'FAILED';
    candidateCount: number;
    blockerCode: string | null;
    summary: string | null;
    lastInspectedAt: string | null;
};

export type WorkspacePurgeJob = {
    id: number;
    workspaceId: number;
    workspacePublicKey: string;
    status:
        'PENDING_GRACE' | 'BLOCKED' | 'READY' | 'PURGING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    eligibleAt: string;
    lastInspectedAt: string | null;
    blockerCount: number;
    inventoryVersion: string;
    checkpoints: WorkspacePurgeCheckpoint[];
};

export const workspacePurgeApi = {
    list: () => request<WorkspacePurgeJob[]>('/api/ops/workspace-purge-jobs'),
    dryRun: (jobId: number) =>
        request<WorkspacePurgeJob>(`/api/ops/workspace-purge-jobs/${jobId}/dry-run`, {
            method: 'POST',
        }),
};
