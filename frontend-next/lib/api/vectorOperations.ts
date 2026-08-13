'use client';

import { request } from './client';

export type VectorReconciliationInspection = {
    scannedExperienceNamespaces: number;
    sourceExperienceNamespaces: number;
    orphanExperienceNamespaces: number;
    missingExperienceNamespaces: number;
    scannedStudyNamespaces: number;
    sourceStudyNamespaces: number;
    orphanStudyNamespaces: number;
    missingStudyNamespaces: number;
};

export type VectorOrphanReconciliationResult = {
    scannedExperienceNamespaces: number;
    deletedExperienceNamespaces: number;
    deletedExperienceChunks: number;
    scannedStudyNamespaces: number;
    deletedStudyNamespaces: number;
    deletedStudyChunks: number;
};

export type VectorMissingRepairResult = {
    repairedExperienceNamespaces: number;
    createdExperienceChunks: number;
    repairedStudyNamespaces: number;
    createdStudyChunks: number;
};

export const vectorOperationsApi = {
    inspectReconciliation: () =>
        request<VectorReconciliationInspection>('/api/v1/vector-sync/reconciliation'),
    reconcileOrphans: () =>
        request<VectorOrphanReconciliationResult>('/api/v1/vector-sync/reconcile-orphans', {
            method: 'POST',
        }),
    repairMissingWithExternalProvider: () =>
        request<VectorMissingRepairResult>('/api/v1/vector-sync/reconcile-missing-external', {
            method: 'POST',
            body: JSON.stringify({ confirmation: 'EXTERNAL_NVIDIA' }),
        }),
};
