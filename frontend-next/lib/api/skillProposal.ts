import { request } from './client';

export type SkillReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export type SkillProposal = {
    id: number;
    workspaceId: number;
    workspaceName: string | null;
    workspaceSlug: string | null;
    name: string;
    category: string;
    skillLevel?: string;
    skillVersion?: string;
    comment?: string;
    usageType: string;
    badgeKey?: string | null;
    badgeColor?: string | null;
    isCore: boolean;
    displayOrder: number;
    reviewStatus: SkillReviewStatus;
    rejectionReason: string | null;
    reviewedAt: string | null;
    createdAt: string;
};

export type SkillProposalPayload = {
    name: string;
    category: string;
    skillLevel?: string;
    skillVersion?: string;
    comment?: string;
    usageType?: string;
    badgeKey?: string | null;
    badgeColor?: string | null;
    isCore?: boolean;
    displayOrder?: number;
};

export type SkillProposalReviewPayload = {
    reviewStatus: 'APPROVED' | 'REJECTED';
    rejectionReason?: string;
};

export const skillProposalApi = {
    workspaceList: (workspaceSlug: string) =>
        request<SkillProposal[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/skill-proposals`
        ),
    propose: (workspaceSlug: string, payload: SkillProposalPayload) =>
        request<SkillProposal>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/skill-proposals`,
            { method: 'POST', body: JSON.stringify(payload) }
        ),
    pendingReview: () => request<SkillProposal[]>('/api/admin/skill-proposals'),
    review: (id: number, payload: SkillProposalReviewPayload) =>
        request<SkillProposal>(`/api/admin/skill-proposals/${id}/review`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
};
