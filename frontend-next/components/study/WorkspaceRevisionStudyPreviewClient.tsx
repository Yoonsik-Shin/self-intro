'use client';

import { useQuery } from '@tanstack/react-query';
import {
    PublicDraftPreviewError,
    PublicDraftPreviewFrame,
    PublicDraftPreviewLoading,
} from '@/components/common/PublicDraftPreviewState';
import { SiteHeader } from '@/components/nav/SiteHeader';
import { publicationApi } from '@/lib/api/publication';
import { StudyListClient } from './StudyListClient';

export function WorkspaceRevisionStudyPreviewClient({
    workspaceSlug,
    revisionNumber,
}: {
    workspaceSlug: string;
    revisionNumber: number;
}) {
    const previewQuery = useQuery({
        queryKey: [
            'workspace',
            workspaceSlug,
            'publication-revision-preview',
            revisionNumber,
            'study',
        ],
        queryFn: () => publicationApi.previewRevisionStudy(workspaceSlug, revisionNumber),
    });

    if (previewQuery.isLoading) {
        return (
            <PublicDraftPreviewLoading
                label={`v${revisionNumber}`}
                message={`v${revisionNumber} 발행본을 불러오는 중입니다.`}
            />
        );
    }
    if (previewQuery.isError || !previewQuery.data) {
        return (
            <PublicDraftPreviewError
                label={`v${revisionNumber}`}
                message={`v${revisionNumber} 발행본을 불러올 수 없습니다. 보존 기간이 지났거나 접근 권한이 없을 수 있습니다.`}
            />
        );
    }

    return (
        <PublicDraftPreviewFrame
            message={`v${revisionNumber} 발행본 미리보기 · 발행 당시 방문자에게 보였던 화면입니다.`}
        >
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
