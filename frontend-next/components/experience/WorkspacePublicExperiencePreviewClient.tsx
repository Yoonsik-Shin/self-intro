'use client';

import { useQuery } from '@tanstack/react-query';
import {
    PublicDraftPreviewError,
    PublicDraftPreviewFrame,
    PublicDraftPreviewLoading,
} from '@/components/common/PublicDraftPreviewState';
import { SiteHeader } from '@/components/nav/SiteHeader';
import { publicPageApi } from '@/lib/api/publicPage';
import { ExperienceListClient } from './ExperienceListClient';

export function WorkspacePublicExperiencePreviewClient({
    workspaceSlug,
}: {
    workspaceSlug: string;
}) {
    const previewQuery = useQuery({
        queryKey: ['workspace', workspaceSlug, 'public-page-draft', 'preview', 'experience'],
        queryFn: () => publicPageApi.previewExperience(workspaceSlug),
    });

    if (previewQuery.isLoading) return <PublicDraftPreviewLoading label="경험" />;
    if (previewQuery.isError || !previewQuery.data) {
        return <PublicDraftPreviewError label="경험" />;
    }

    const experiences = [...previewQuery.data.experiences].sort((a, b) =>
        b.periodStart.localeCompare(a.periodStart)
    );

    return (
        <PublicDraftPreviewFrame>
            <SiteHeader />
            <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
                <ExperienceListClient
                    experiences={experiences}
                    basePath={`/workspace/${encodeURIComponent(workspaceSlug)}/experience`}
                    previewMode
                />
            </div>
        </PublicDraftPreviewFrame>
    );
}
