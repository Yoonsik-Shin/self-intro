'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { IntroductionResponse } from '@/lib/api/types';
import { ApiError, jobPostingApi, printTemplateApi } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { PrintCanvas } from './PrintCanvas';

export function PrintPageClient({
    workspaceSlug,
    introData,
    adminMode,
    templateId,
    jobPostingId,
}: {
    workspaceSlug: string;
    introData: IntroductionResponse | null;
    adminMode: boolean;
    templateId: number | null;
    jobPostingId: number | null;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
    const {
        data: outputSource,
        error: outputSourceError,
        isError: isOutputSourceError,
        isLoading: isOutputSourceLoading,
    } = useQuery({
        queryKey: ['workspace', workspaceSlug, 'output-source'],
        queryFn: () => printTemplateApi.workspaceOutputSource(workspaceSlug),
        enabled: adminMode,
        // 원본 관리 화면에서 저장한 직후 이동해도 이전의 빈 projection을 재사용하지 않는다.
        staleTime: 0,
        refetchOnMount: 'always',
    });
    const resolvedIntroData = adminMode ? (outputSource ?? null) : introData;
    const shouldLoadTemplates = templateId != null || !adminMode;
    const { data: templates = [], isLoading } = useQuery({
        queryKey: ['printTemplates', workspaceSlug, adminMode ? 'admin' : 'public', 'print-page'],
        queryFn: () =>
            adminMode
                ? printTemplateApi.workspaceAdminList(workspaceSlug)
                : printTemplateApi.workspacePublicList(workspaceSlug),
        enabled: shouldLoadTemplates,
    });
    const defaultTemplate = adminMode
        ? null
        : (templates.find((template) => template.targetRole === 'BACKEND_GENERAL') ?? null);
    const initialTemplate =
        templateId == null
            ? defaultTemplate
            : (templates.find((template) => template.id === templateId) ?? null);

    const { data: coverLetterItems = [] } = useQuery({
        queryKey: ['jobPostingCoverLetterItems', workspaceSlug, jobPostingId],
        queryFn: () =>
            jobPostingApi.workspaceCoverLetterItems(workspaceSlug, jobPostingId as number),
        enabled: adminMode && jobPostingId != null,
    });

    const isSessionExpired =
        adminMode && outputSourceError instanceof ApiError && outputSourceError.status === 401;

    useEffect(() => {
        if (!isSessionExpired) return;
        setUnauthenticated();
        const query = searchParams.toString();
        const next = `${pathname}${query ? `?${query}` : ''}`;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
    }, [isSessionExpired, pathname, router, searchParams, setUnauthenticated]);

    const isLoadingScreen =
        (shouldLoadTemplates && isLoading) ||
        (adminMode && isOutputSourceLoading) ||
        isSessionExpired;
    if (isLoadingScreen) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm font-bold text-slate-300">
                템플릿을 불러오는 중입니다.
            </div>
        );
    }

    if (adminMode && isOutputSourceError && !isSessionExpired) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-900 px-6 text-center">
                <p className="text-sm font-bold text-rose-300">출력 원본을 불러오지 못했습니다.</p>
                <p className="max-w-xl text-xs text-slate-400">
                    {outputSourceError instanceof Error
                        ? outputSourceError.message
                        : '로그인 상태와 Workspace 접근 권한을 확인해 주세요.'}
                </p>
            </div>
        );
    }

    if (!resolvedIntroData?.profile) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm font-bold text-rose-300">
                {adminMode
                    ? '먼저 프로필 원본을 저장해 주세요.'
                    : '프로필 정보를 불러올 수 없습니다.'}
            </div>
        );
    }

    if (templateId != null && !initialTemplate) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm font-bold text-rose-300">
                템플릿을 찾을 수 없거나 접근 권한이 없습니다.
            </div>
        );
    }

    return (
        <PrintCanvas
            key={initialTemplate?.id ?? 'manual'}
            workspaceSlug={workspaceSlug}
            introData={resolvedIntroData}
            adminMode={adminMode}
            initialTemplate={initialTemplate}
            coverLetterItems={coverLetterItems}
            jobPostingId={jobPostingId}
            onExit={() =>
                router.push(
                    adminMode
                        ? `/workspace/${encodeURIComponent(workspaceSlug)}/manage?tab=PRINT_TEMPLATES`
                        : `/workspace/${encodeURIComponent(workspaceSlug)}`
                )
            }
        />
    );
}
