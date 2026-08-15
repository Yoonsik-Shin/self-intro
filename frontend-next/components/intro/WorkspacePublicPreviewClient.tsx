'use client';

import { useQuery } from '@tanstack/react-query';
import {
    PublicDraftPreviewError,
    PublicDraftPreviewFrame,
    PublicDraftPreviewLoading,
} from '@/components/common/PublicDraftPreviewState';
import { publicPageApi } from '@/lib/api/publicPage';
import { IntroPageClient } from './IntroPageClient';

export function WorkspacePublicPreviewClient({ workspaceSlug }: { workspaceSlug: string }) {
    const previewQuery = useQuery({
        queryKey: ['workspace', workspaceSlug, 'public-page-draft', 'preview'],
        queryFn: () => publicPageApi.previewIntroduction(workspaceSlug),
    });

    if (previewQuery.isLoading) {
        return <PublicDraftPreviewLoading label="프로필" />;
    }

    if (previewQuery.isError || !previewQuery.data) {
        return <PublicDraftPreviewError label="프로필" />;
    }

    return (
        <PublicDraftPreviewFrame>
            <IntroPageClient introData={previewQuery.data} workspaceSlug={workspaceSlug} />
        </PublicDraftPreviewFrame>
    );
}
