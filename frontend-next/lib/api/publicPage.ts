import { request } from './client';
import type {
    Experience,
    IntroductionResponse,
    PortfolioCaseStudyPublicSummary,
    Study,
    StudyTaxonomyNode,
} from './types';

export type PublicExperiencePreview = {
    experiences: Experience[];
    coreProjects: Experience[];
    portfolios: PortfolioCaseStudyPublicSummary[];
};

export type PublicStudyPreview = {
    studies: Study[];
    taxonomy: StudyTaxonomyNode[];
};

export type PublicProfileItemSelection = {
    id: number;
    label: string;
    enabled: boolean;
    featured: boolean;
    displayOrder: number;
};

export type PublicProfileDraft = {
    showName: boolean;
    showNameEn: boolean;
    showJobTitle: boolean;
    showBio: boolean;
    showCoreStackSummary: boolean;
    showStatusBadge: boolean;
    showGithub: boolean;
    showEmail: boolean;
    showPhone: boolean;
    skills: PublicProfileItemSelection[];
    competencies: PublicProfileItemSelection[];
};

export type PublicExperienceDraft = {
    experiences: Array<{
        id: number;
        title: string;
        enabled: boolean;
        displayOrder: number;
        showOnTimeline: boolean;
        timelineLabel: string | null;
    }>;
    details: Array<{
        id: number;
        experienceId: number;
        label: string;
        enabled: boolean;
        displayOrder: number;
    }>;
    placements: Array<{
        experienceId: number;
        placementType: string;
        enabled: boolean;
        displayOrder: number;
    }>;
    portfolios: Array<{
        id: number;
        title: string;
        enabled: boolean;
        displayOrder: number;
    }>;
};

export type PublicStudyDraft = {
    studies: Array<{
        id: number;
        title: string;
        enabled: boolean;
        displayOrder: number;
    }>;
    taxonomy: Array<{
        id: number;
        schemeId: number;
        label: string;
        enabled: boolean;
        displayOrder: number;
        displayLabel: string | null;
    }>;
};

const draftPath = (workspaceSlug: string, section: 'profile' | 'experience' | 'study') =>
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/public-page/draft/${section}`;

export const publicPageApi = {
    previewIntroduction: (workspaceSlug: string) =>
        request<IntroductionResponse>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/public-page/draft/preview/introduction`
        ),
    previewExperience: (workspaceSlug: string) =>
        request<PublicExperiencePreview>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/public-page/draft/preview/experience`
        ),
    previewStudy: (workspaceSlug: string) =>
        request<PublicStudyPreview>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/public-page/draft/preview/study`
        ),
    profile: (workspaceSlug: string) =>
        request<PublicProfileDraft>(draftPath(workspaceSlug, 'profile')),
    updateProfile: (workspaceSlug: string, payload: PublicProfileDraft) =>
        request<PublicProfileDraft>(draftPath(workspaceSlug, 'profile'), {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    experience: (workspaceSlug: string) =>
        request<PublicExperienceDraft>(draftPath(workspaceSlug, 'experience')),
    updateExperience: (workspaceSlug: string, payload: PublicExperienceDraft) =>
        request<PublicExperienceDraft>(draftPath(workspaceSlug, 'experience'), {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    study: (workspaceSlug: string) => request<PublicStudyDraft>(draftPath(workspaceSlug, 'study')),
    updateStudy: (workspaceSlug: string, payload: PublicStudyDraft) =>
        request<PublicStudyDraft>(draftPath(workspaceSlug, 'study'), {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
};
