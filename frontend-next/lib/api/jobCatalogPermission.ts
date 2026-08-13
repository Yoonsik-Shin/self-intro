'use client';

import { request } from './client';

export type JobCatalogPermissionBasis =
    'UNKNOWN' | 'EMPLOYER_DIRECT_SUBMISSION' | 'WRITTEN_LICENSE' | 'OFFICIAL_API_LICENSE';

export type JobCatalogPermissionReviewStatus = 'REVIEW_REQUIRED' | 'APPROVED' | 'REJECTED';

export type JobCatalogPermissionPosting = {
    id: number;
    companyName: string;
    positionTitle: string;
    postingUrl: string | null;
    source: string;
    permissionBasis: JobCatalogPermissionBasis;
    permissionReviewStatus: JobCatalogPermissionReviewStatus;
    permissionEvidenceReference: string | null;
    permissionGrantorName: string | null;
    permissionGrantorAuthority: string | null;
    permissionScopeNote: string | null;
    permissionTermsVersion: string | null;
    permissionRevocationContact: string | null;
    permissionExpiresAt: string | null;
    permissionReviewedByUserId: number | null;
    permissionReviewedAt: string | null;
    sharedCatalogEligible: boolean;
    updatedAt: string;
};

export type JobCatalogPermissionReviewRequest = {
    reviewStatus: JobCatalogPermissionReviewStatus;
    permissionBasis: JobCatalogPermissionBasis;
    evidenceReference?: string | null;
    grantorName?: string | null;
    grantorAuthority?: string | null;
    permissionScopeNote?: string | null;
    termsVersion?: string | null;
    revocationContact?: string | null;
    expiresAt?: string | null;
};

export const jobCatalogPermissionApi = {
    list: () => request<JobCatalogPermissionPosting[]>('/api/admin/job-postings'),
    review: (id: number, payload: JobCatalogPermissionReviewRequest) =>
        request<JobCatalogPermissionPosting>(`/api/admin/job-postings/${id}/permission-review`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
};
