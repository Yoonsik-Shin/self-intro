import 'server-only';
import { notFound } from 'next/navigation';
import { ApiError } from '@/lib/api/errors';
import { serverGet } from '@/lib/api/server';
import type { IntroductionResponse, Study, StudyPage, StudyTaxonomyNode } from '@/lib/api/types';

export type PublicWorkspaceSlugResolution = {
    requestedSlug: string;
    canonicalSlug: string;
};

export async function getCanonicalWorkspaceSlug(workspaceSlug: string): Promise<string> {
    try {
        const resolution = await serverGet<PublicWorkspaceSlugResolution>(
            `/api/public/workspaces/${encodeURIComponent(workspaceSlug)}/resolution`
        );
        return resolution.canonicalSlug;
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) notFound();
        throw error;
    }
}

export async function getWorkspaceIntroduction(
    workspaceSlug: string,
    channel: 'WEB' | 'RESUME' = 'WEB'
): Promise<IntroductionResponse> {
    try {
        return await serverGet<IntroductionResponse>(
            `/api/bff/workspaces/${encodeURIComponent(workspaceSlug)}/introduction?channel=${channel}`
        );
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) notFound();
        throw error;
    }
}

export async function getWorkspaceStudies(workspaceSlug: string): Promise<StudyPage> {
    try {
        return await serverGet<StudyPage>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/studies?page=0&size=20`
        );
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) notFound();
        throw error;
    }
}

export async function getWorkspaceTaxonomy(workspaceSlug: string): Promise<StudyTaxonomyNode[]> {
    try {
        return await serverGet<StudyTaxonomyNode[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/study-taxonomy`
        );
    } catch {
        return [];
    }
}

export async function getWorkspaceStudy(workspaceSlug: string, studySlug: string): Promise<Study> {
    try {
        return await serverGet<Study>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/studies/${encodeURIComponent(decodeURIComponent(studySlug))}`
        );
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) notFound();
        throw error;
    }
}
