'use client';

import { request } from './client';
import type { PageResponse } from './types';

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

export type JobCatalogPermissionReviewEvent = {
    id: number;
    reviewStatus: JobCatalogPermissionReviewStatus;
    permissionBasis: JobCatalogPermissionBasis;
    evidenceReference: string | null;
    grantorName: string | null;
    grantorAuthority: string | null;
    permissionScopeNote: string | null;
    termsVersion: string | null;
    revocationContact: string | null;
    expiresAt: string | null;
    reviewedByUserId: number;
    reviewedAt: string;
};

export type JobCatalogPermissionQueryParams = {
    q?: string;
    reviewStatus?: JobCatalogPermissionReviewStatus;
    page?: number;
    size?: number;
    sort?: string;
    direction?: 'ASC' | 'DESC';
};

export const jobCatalogPermissionApi = {
    list: (params?: JobCatalogPermissionQueryParams) => {
        const search = new URLSearchParams();
        if (params?.q) search.set('q', params.q);
        if (params?.reviewStatus) search.set('reviewStatus', params.reviewStatus);
        if (params?.page !== undefined) search.set('page', String(params.page));
        if (params?.size !== undefined) search.set('size', String(params.size));
        if (params?.sort) {
            search.set('sort', `${params.sort},${(params.direction || 'DESC').toLowerCase()}`);
        }
        const queryString = search.toString();
        const url = queryString
            ? `/api/admin/job-postings?${queryString}`
            : '/api/admin/job-postings';
        return request<PageResponse<JobCatalogPermissionPosting>>(url);
    },
    review: (id: number, payload: JobCatalogPermissionReviewRequest) =>
        request<JobCatalogPermissionPosting>(`/api/admin/job-postings/${id}/permission-review`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    reviewEvents: (id: number) =>
        request<JobCatalogPermissionReviewEvent[]>(
            `/api/admin/job-postings/${id}/permission-review-events`
        ),
};
