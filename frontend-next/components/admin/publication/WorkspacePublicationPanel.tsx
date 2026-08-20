'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Braces,
    Eye,
    EyeOff,
    FilePenLine,
    History,
    LoaderCircle,
    Pin,
    PinOff,
    RotateCcw,
    Send,
} from 'lucide-react';
import { publicationApi } from '@/lib/api/publication';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

type Props = {
    workspaceSlug: string;
    role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
    beforePublish?: () => Promise<void>;
    onViewRevision?: (revisionNumber: number) => void;
};

export function WorkspacePublicationPanel({
    workspaceSlug,
    role,
    beforePublish,
    onViewRevision,
}: Props) {
    const [now] = useState(() => Date.now());
    const [noteInput, setNoteInput] = useState('');
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
        mutationFn: async () => {
            await beforePublish?.();
            return publicationApi.publish(workspaceSlug, noteInput.trim() || undefined);
        },
        onSuccess: (status) => {
            queryClient.setQueryData(queryKey, status);
            setNoteInput('');
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
    const pinMutation = useMutation({
        mutationFn: ({ revisionNumber, pinned }: { revisionNumber: number; pinned: boolean }) =>
            pinned
                ? publicationApi.pin(workspaceSlug, revisionNumber)
                : publicationApi.unpin(workspaceSlug, revisionNumber),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: historyQueryKey }),
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
        <div className="space-y-4">
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-1.5 text-indigo-700">
                    <FilePenLine className="h-3.5 w-3.5" />
                    <h3 className="text-sm font-black text-slate-900">발행 준비 중인 초안</h3>
                </div>
                <div className="rounded-xl bg-indigo-50 px-4 py-3">
                    <p className="text-xs leading-5 text-indigo-950">
                        지금 편집한 프로필·경력·학습 기록은 아직 방문자에게 보이지 않습니다.
                        미리보기로 확인한 뒤 발행을 눌러야 방문자에게 반영됩니다.
                    </p>
                    {canPublish && (
                        <input
                            type="text"
                            value={noteInput}
                            onChange={(event) => setNoteInput(event.target.value)}
                            placeholder="발행 메모 (선택) — 예: 프로필 문구 수정, 신규 프로젝트 추가"
                            maxLength={500}
                            className="mt-3 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                        {canPublish && (
                            <button
                                type="button"
                                disabled={pending || statusQuery.isLoading}
                                onClick={() => publishMutation.mutate()}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {pending ? (
                                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Send className="h-3.5 w-3.5" />
                                )}
                                {status?.hasPublishedRevision ? '새 버전 발행' : '첫 버전 발행'}
                            </button>
                        )}
                    </div>
                </div>
                {error && (
                    <p className="text-xs font-bold text-red-600">
                        {error instanceof Error
                            ? error.message
                            : '발행 상태를 처리하지 못했습니다.'}
                    </p>
                )}
                {!canPublish && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                        발행과 공개 중지는 Workspace OWNER 또는 ADMIN만 할 수 있습니다.
                    </p>
                )}
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-1.5 text-slate-500">
                    <History className="h-3.5 w-3.5" />
                    <h3 className="text-sm font-black text-slate-900">발행 이력</h3>
                </div>
                {historyQuery.data && (
                    <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        최근 {historyQuery.data.maximumRetainedRevisions}개는 항상 보존하며, 그 이전
                        revision도 최소 {historyQuery.data.minimumRetentionDays}일간 보존합니다.
                    </p>
                )}
                {historyQuery.isLoading ? (
                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> 발행 이력을 불러오는
                        중입니다.
                    </div>
                ) : historyQuery.data?.revisions.length ? (
                    <div className="mt-3 divide-y divide-slate-200 border-t border-slate-200">
                        {(() => {
                            const { maximumRetainedRevisions, minimumRetentionDays } =
                                historyQuery.data;
                            return historyQuery.data.revisions.map((revision, index) => {
                                const retainedByCount = index < maximumRetainedRevisions;
                                const cutoffTime =
                                    new Date(revision.publishedAt).getTime() +
                                    minimumRetentionDays * 24 * 60 * 60 * 1000;
                                const daysRemaining = Math.ceil(
                                    (cutoffTime - now) / (24 * 60 * 60 * 1000)
                                );
                                const retentionLabel =
                                    daysRemaining > 0
                                        ? `보관 만료까지 ${daysRemaining}일 남음`
                                        : '보관 기간이 지나 다음 발행 시 삭제될 수 있음';
                                return (
                                    <div
                                        key={revision.revisionNumber}
                                        className={`flex flex-col gap-2.5 px-3 py-3 ${
                                            published && revision.currentRevision
                                                ? 'bg-emerald-50'
                                                : revision.pinned
                                                  ? 'bg-amber-50'
                                                  : ''
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <strong className="text-xs text-slate-950">
                                                    v{revision.revisionNumber}
                                                </strong>
                                                {revision.operationType === 'ROLLBACK' && (
                                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">
                                                        v{revision.sourceRevisionNumber}에서 복원
                                                    </span>
                                                )}
                                                {revision.currentRevision && (
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-[11px] font-black ${
                                                            published
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : 'bg-slate-200 text-slate-700'
                                                        }`}
                                                    >
                                                        {published ? '현재 공개본' : '최근 발행본'}
                                                    </span>
                                                )}
                                                {revision.pinned && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-700">
                                                        <Pin className="h-3 w-3" /> 고정
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                                {new Date(revision.publishedAt).toLocaleString(
                                                    'ko-KR'
                                                )}
                                                {!revision.pinned && !retainedByCount && (
                                                    <span
                                                        className={
                                                            daysRemaining > 0
                                                                ? 'text-amber-600'
                                                                : 'text-red-600'
                                                        }
                                                    >
                                                        {' '}
                                                        · {retentionLabel}
                                                    </span>
                                                )}
                                                {revision.pinned && (
                                                    <span className="text-amber-700">
                                                        {' '}
                                                        · 고정됨 — 보관 정책과 무관하게 삭제되지
                                                        않음
                                                    </span>
                                                )}
                                            </p>
                                            {revision.note && (
                                                <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                                                    “{revision.note}”
                                                </p>
                                            )}
                                            {!published && revision.currentRevision && (
                                                <p className="mt-1 text-[11px] font-bold text-slate-600">
                                                    공개 중지 상태이므로 이 snapshot은 보존만 되고
                                                    노출되지 않습니다.
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {published && revision.currentRevision ? (
                                                <a
                                                    href={`/workspace/${encodeURIComponent(workspaceSlug)}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-emerald-700 hover:bg-emerald-50"
                                                >
                                                    <Eye className="h-3.5 w-3.5" /> 현재 공개 페이지
                                                </a>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onViewRevision?.(revision.revisionNumber)
                                                    }
                                                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-black text-slate-700 hover:bg-slate-50"
                                                >
                                                    <Eye className="h-3.5 w-3.5" /> 이 버전 보기
                                                </button>
                                            )}
                                            <a
                                                href={`${API_BASE_URL}/api/workspaces/${encodeURIComponent(workspaceSlug)}/publication/manage/revisions/${revision.revisionNumber}/preview`}
                                                target="_blank"
                                                rel="noreferrer"
                                                title="원본 데이터(JSON) 보기 — 화면 렌더링 없이 확인합니다."
                                                aria-label="원본 데이터 보기"
                                                className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                            >
                                                <Braces className="h-3.5 w-3.5" />
                                            </a>
                                            {canPublish && (
                                                <button
                                                    type="button"
                                                    disabled={pinMutation.isPending}
                                                    title={
                                                        revision.pinned
                                                            ? '고정 해제'
                                                            : '고정 — 자동 삭제 대상에서 제외'
                                                    }
                                                    aria-label={
                                                        revision.pinned ? '고정 해제' : '고정'
                                                    }
                                                    onClick={() =>
                                                        pinMutation.mutate({
                                                            revisionNumber: revision.revisionNumber,
                                                            pinned: !revision.pinned,
                                                        })
                                                    }
                                                    className={`inline-flex items-center justify-center rounded-lg border p-1.5 disabled:opacity-50 ${
                                                        revision.pinned
                                                            ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                                                            : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                                    }`}
                                                >
                                                    {revision.pinned ? (
                                                        <PinOff className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <Pin className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            )}
                                            {canPublish && revision.rollbackAvailable && (
                                                <button
                                                    type="button"
                                                    disabled={pending}
                                                    onClick={() =>
                                                        rollback(revision.revisionNumber)
                                                    }
                                                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 px-2.5 py-1.5 text-[11px] font-black text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                                                >
                                                    {rollbackMutation.isPending ? (
                                                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                    )}
                                                    이 버전으로 복원
                                                </button>
                                            )}
                                            {canPublish &&
                                                published &&
                                                revision.currentRevision && (
                                                    <button
                                                        type="button"
                                                        disabled={pending}
                                                        onClick={() => unpublishMutation.mutate()}
                                                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-black text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                    >
                                                        {unpublishMutation.isPending ? (
                                                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <EyeOff className="h-3.5 w-3.5" />
                                                        )}
                                                        공개 중지
                                                    </button>
                                                )}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                ) : (
                    <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500">
                        아직 발행된 revision이 없습니다.
                    </p>
                )}
            </section>
        </div>
    );
}
