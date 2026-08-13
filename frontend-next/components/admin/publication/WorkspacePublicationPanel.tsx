'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, History, LoaderCircle, RotateCcw, Send } from 'lucide-react';
import { publicationApi } from '@/lib/api/publication';

type Props = {
    workspaceSlug: string;
    role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
};

export function WorkspacePublicationPanel({ workspaceSlug, role }: Props) {
    const queryClient = useQueryClient();
    const queryKey = ['workspace-publication', workspaceSlug];
    const historyQueryKey = ['workspace-publication-history', workspaceSlug];
    const canPublish = role === 'OWNER' || role === 'ADMIN';
    const statusQuery = useQuery({
        queryKey,
        queryFn: () => publicationApi.status(workspaceSlug),
    });
    const historyQuery = useQuery({
        queryKey: historyQueryKey,
        queryFn: () => publicationApi.history(workspaceSlug),
    });
    const publishMutation = useMutation({
        mutationFn: () => publicationApi.publish(workspaceSlug),
        onSuccess: (status) => {
            queryClient.setQueryData(queryKey, status);
            void queryClient.invalidateQueries({ queryKey: historyQueryKey });
        },
    });
    const unpublishMutation = useMutation({
        mutationFn: () => publicationApi.unpublish(workspaceSlug),
        onSuccess: (status) => queryClient.setQueryData(queryKey, status),
    });
    const rollbackMutation = useMutation({
        mutationFn: (revisionNumber: number) =>
            publicationApi.rollback(workspaceSlug, revisionNumber),
        onSuccess: (status) => {
            queryClient.setQueryData(queryKey, status);
            void queryClient.invalidateQueries({ queryKey: historyQueryKey });
        },
    });
    const pending =
        publishMutation.isPending || unpublishMutation.isPending || rollbackMutation.isPending;
    const error =
        statusQuery.error ??
        historyQuery.error ??
        publishMutation.error ??
        unpublishMutation.error ??
        rollbackMutation.error;
    const status = statusQuery.data;
    const published = status?.publicationStatus === 'PUBLISHED';

    const rollback = (revisionNumber: number) => {
        if (
            window.confirm(
                `v${revisionNumber}의 공개 내용으로 복원하시겠습니까? 현재 초안은 변경하지 않고 새 revision을 발행합니다.`
            )
        ) {
            rollbackMutation.mutate(revisionNumber);
        }
    };

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
                        Publication
                    </span>
                    <div className="mt-3 flex items-center gap-3">
                        <h2 className="text-2xl font-black text-slate-950">
                            공개 페이지 버전 발행
                        </h2>
                        {status && (
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-black ${
                                    published
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                                {published ? '공개 중' : '비공개'}
                            </span>
                        )}
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                        현재 Workspace에서 공개 대상으로 구성한 내용을 하나의 snapshot으로 묶습니다.{' '}
                        <strong>발행</strong> 전까지 방문자는 이전 버전을 계속 봅니다.
                    </p>
                    <div className="mt-4 max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-6 text-slate-600">
                        <p>
                            <strong className="text-slate-950">독립 revision:</strong> 프로필 구성과
                            경험 구성은 각각 불변 revision으로 저장된 뒤 전체 공개본이 두 revision을
                            고정합니다.
                        </p>
                        <p className="mt-1">
                            <strong className="text-slate-950">전체 공개본 snapshot:</strong> 학습
                            기록·탐색 카테고리는 별도 revision 없이 이 버전에 함께 복사됩니다.
                            포트폴리오는 사례 revision이 준비되고 경험 구성에서 선택된 경우에만
                            포함됩니다.
                        </p>
                    </div>
                    {status?.hasPublishedRevision && (
                        <p className="mt-3 text-xs font-semibold text-slate-500">
                            최근 발행 v{status.revisionNumber} ·{' '}
                            {status.publishedAt
                                ? new Date(status.publishedAt).toLocaleString('ko-KR')
                                : '-'}
                        </p>
                    )}
                    {error && (
                        <p className="mt-3 text-sm font-bold text-red-600">
                            {error instanceof Error
                                ? error.message
                                : '발행 상태를 처리하지 못했습니다.'}
                        </p>
                    )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                    <a
                        href={`/workspace/${encodeURIComponent(workspaceSlug)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                    >
                        <Eye className="h-4 w-4" /> 공개 페이지
                    </a>
                    {canPublish && published && (
                        <button
                            type="button"
                            disabled={pending}
                            onClick={() => unpublishMutation.mutate()}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                            {pending ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                                <EyeOff className="h-4 w-4" />
                            )}
                            공개 중지
                        </button>
                    )}
                    {canPublish && (
                        <button
                            type="button"
                            disabled={pending || statusQuery.isLoading}
                            onClick={() => publishMutation.mutate()}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {pending ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            {status?.hasPublishedRevision ? '새 버전 발행' : '첫 버전 발행'}
                        </button>
                    )}
                </div>
            </div>
            {!canPublish && (
                <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    발행과 공개 중지는 Workspace OWNER 또는 ADMIN만 할 수 있습니다.
                </p>
            )}
            <div className="mt-8 border-t border-slate-200 pt-7">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-slate-950">
                            <History className="h-5 w-5" />
                            <h3 className="text-lg font-black">발행 이력</h3>
                        </div>
                        {historyQuery.data && (
                            <p className="mt-2 text-xs font-semibold text-slate-500">
                                최근 {historyQuery.data.maximumRetainedRevisions}개는 항상 보존하며,
                                그 이전 revision도 최소 {historyQuery.data.minimumRetentionDays}일간
                                보존합니다.
                            </p>
                        )}
                    </div>
                </div>
                {historyQuery.isLoading ? (
                    <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-500">
                        <LoaderCircle className="h-4 w-4 animate-spin" /> 발행 이력을 불러오는
                        중입니다.
                    </div>
                ) : historyQuery.data?.revisions.length ? (
                    <div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                        {historyQuery.data.revisions.map((revision) => (
                            <div
                                key={revision.revisionNumber}
                                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <strong className="text-sm text-slate-950">
                                            v{revision.revisionNumber}
                                        </strong>
                                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">
                                            {revision.operationType === 'ROLLBACK'
                                                ? `v${revision.sourceRevisionNumber}에서 복원`
                                                : '직접 발행'}
                                        </span>
                                        {revision.currentRevision && (
                                            <span className="rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-black text-indigo-700">
                                                {published ? '현재 공개본' : '최근 발행본'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                        {new Date(revision.publishedAt).toLocaleString('ko-KR')} ·
                                        schema v{revision.schemaVersion}
                                    </p>
                                    {revision.schemaVersion >= 3 && (
                                        <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                            프로필 revision #{revision.profileRevisionId ?? '-'} ·
                                            경험 revision #{revision.experienceRevisionId ?? '-'} ·
                                            구성 v{revision.draftConfigVersion ?? '-'}
                                        </p>
                                    )}
                                </div>
                                {canPublish && revision.rollbackAvailable && (
                                    <button
                                        type="button"
                                        disabled={pending}
                                        onClick={() => rollback(revision.revisionNumber)}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 px-3 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                                    >
                                        {rollbackMutation.isPending ? (
                                            <LoaderCircle className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <RotateCcw className="h-4 w-4" />
                                        )}
                                        이 버전으로 복원
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500">
                        아직 발행된 revision이 없습니다.
                    </p>
                )}
            </div>
        </section>
    );
}
