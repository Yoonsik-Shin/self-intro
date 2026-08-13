import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { serverGet } from '@/lib/api/server';
import type { ExperienceTreeIndex } from '@/lib/api/types';
import { ExperienceTreeClient } from '@/components/experience-tree/ExperienceTreeClient';
import { getCanonicalWorkspaceSlug } from '@/lib/workspace-public';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: '개발자 온톨로지',
    description: '공통 의사결정 지식과 Workspace의 학습 근거를 연결한 개발자 온톨로지입니다.',
};

export default async function WorkspaceOntologyPage({
    params,
    searchParams,
}: {
    params: Promise<{ workspaceSlug: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { workspaceSlug } = await params;
    const query = await searchParams;
    const canonicalSlug = await getCanonicalWorkspaceSlug(workspaceSlug);
    if (canonicalSlug !== workspaceSlug) {
        const redirectQuery = new URLSearchParams();
        Object.entries(query).forEach(([key, value]) => {
            if (Array.isArray(value)) value.forEach((item) => redirectQuery.append(key, item));
            else if (value !== undefined) redirectQuery.set(key, value);
        });
        permanentRedirect(
            `/workspace/${encodeURIComponent(canonicalSlug)}/ontology${redirectQuery.size ? `?${redirectQuery}` : ''}`
        );
    }
    let index: ExperienceTreeIndex;
    try {
        index = await serverGet<ExperienceTreeIndex>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/experience-tree`
        );
    } catch {
        notFound();
    }
    const views = ['TREE', 'LIST', 'MAP'] as const;
    const domains = ['BACKEND', 'INFRASTRUCTURE', 'ARCHITECTURE', 'FRONTEND'] as const;
    const rawView = typeof query.view === 'string' ? query.view.toUpperCase() : undefined;
    const rawDomain = typeof query.domain === 'string' ? query.domain.toUpperCase() : undefined;
    return (
        <ExperienceTreeClient
            initialIndex={index}
            initialView={views.find((value) => value === rawView) ?? 'TREE'}
            initialDomain={domains.find((value) => value === rawDomain) ?? 'ALL'}
            initialSearch={typeof query.q === 'string' ? query.q : ''}
            basePath={`/workspace/${encodeURIComponent(workspaceSlug)}/ontology`}
        />
    );
}
