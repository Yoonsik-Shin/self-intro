'use client';

import { useQuery } from '@tanstack/react-query';
import {
    PublicDraftPreviewError,
    PublicDraftPreviewFrame,
    PublicDraftPreviewLoading,
} from '@/components/common/PublicDraftPreviewState';
import { SiteHeader } from '@/components/nav/SiteHeader';
import { publicPageApi } from '@/lib/api/publicPage';
import { StudyListClient } from './StudyListClient';

export function WorkspacePublicStudyPreviewClient({ workspaceSlug }: { workspaceSlug: string }) {
    const previewQuery = useQuery({
        queryKey: ['workspace', workspaceSlug, 'public-page-draft', 'preview', 'study'],
        queryFn: () => publicPageApi.previewStudy(workspaceSlug),
    });

    if (previewQuery.isLoading) return <PublicDraftPreviewLoading label="학습" />;
    if (previewQuery.isError || !previewQuery.data) {
        return <PublicDraftPreviewError label="학습" />;
    }

    return (
        <PublicDraftPreviewFrame>
            <SiteHeader />
            <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
                <StudyListClient
                    initialStudies={previewQuery.data.studies}
                    initialTotalElements={previewQuery.data.studies.length}
                    initialTotalPages={Math.max(
                        1,
                        Math.ceil(previewQuery.data.studies.length / 20)
                    )}
                    taxonomyNodes={previewQuery.data.taxonomy}
                    workspaceSlug={workspaceSlug}
                    previewMode
                />
            </div>
        </PublicDraftPreviewFrame>
    );
}
