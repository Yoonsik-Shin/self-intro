'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock3, Database, RefreshCw } from 'lucide-react';
import { ApiError, workspacePurgeApi, type WorkspacePurgeCheckpoint } from '@/lib/api';
import { useRecentReauthentication } from '@/hooks/useRecentReauthentication';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';
import { RecentReauthenticationStatus } from '@/components/admin/security/RecentReauthenticationStatus';

const STORE_LABEL: Record<WorkspacePurgeCheckpoint['store'], string> = {
    MYSQL_PRIMARY: 'MySQL 원본',
    OBJECT_STORAGE: 'Object Storage',
    ORACLE_VECTOR: 'Vector 파생 데이터',
    ORACLE_NOSQL: 'NoSQL Read Model',
    REDIS_CACHE: 'Redis Cache',
};

export function WorkspacePurgeOperationsPanel() {
    const {
        data: jobs = [],
        error: loadError,
        refetch,
    } = useQuery({
        queryKey: ['ops', 'workspace-purge-jobs'],
        queryFn: workspacePurgeApi.list,
    });
    const { isReauthenticated: reauthenticated, clear: clearReauthentication } =
        useRecentReauthentication();
    const [pendingJobId, setPendingJobId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function dryRun(jobId: number) {
        if (!reauthenticated) {
            setError('dry-run 전에 운영자 비밀번호를 다시 확인해 주세요.');
            return;
        }
        setPendingJobId(jobId);
        setError(null);
        try {
            await workspacePurgeApi.dryRun(jobId);
            await refetch();
        } catch (cause) {
            if (cause instanceof ApiError && cause.status === 401) {
                clearReauthentication();
                setError('재인증 시간이 만료되었습니다. 비밀번호를 다시 확인해 주세요.');
            } else {
                setError(cause instanceof Error ? cause.message : 'dry-run을 완료하지 못했습니다.');
            }
        } finally {
            setPendingJobId(null);
        }
    }

    return (
        <div className="space-y-4 text-slate-800">
            <AdminPageHeader
                headingAs="h1"
                title="Workspace 삭제 점검"
                description="폐쇄된 Workspace의 저장소별 삭제 후보와 차단 사유를 점검합니다. 이 화면의 dry-run은 데이터를 삭제하지 않으며, 실제 물리 삭제 실행기는 비활성화되어 있습니다."
            />

            <RecentReauthenticationStatus description="Workspace 이름·이메일·본문은 표시하지 않습니다. 상단에서 인증한 뒤에만 삭제 dry-run을 실행하며, 미분류 저장소가 하나라도 있으면 차단됩니다." />

            {(error || loadError) && (
                <p
                    role="alert"
                    className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
                >
                    {error ??
                        (loadError instanceof Error
                            ? loadError.message
                            : '목록을 불러오지 못했습니다.')}
                </p>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="font-black text-slate-950">폐쇄 Workspace 점검 대기열</h2>
                        <p className="mt-1 text-xs text-slate-500">
                            불투명 식별자와 삭제 메타데이터만 표시합니다.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void refetch()}
                        aria-label="새로고침"
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>

                {jobs.length === 0 ? (
                    <p className="p-10 text-center text-sm text-slate-400">
                        폐쇄된 Workspace가 없습니다.
                    </p>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {jobs.map((job) => (
                            <article key={job.id} className="space-y-4 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-mono text-sm font-black text-slate-900">
                                                {job.workspacePublicKey}
                                            </h3>
                                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">
                                                {job.status}
                                            </span>
                                            {job.blockerCount > 0 && (
                                                <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-black text-red-700">
                                                    blocker {job.blockerCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                            <span className="inline-flex items-center gap-1">
                                                <Clock3 className="h-3.5 w-3.5" /> 유예 종료{' '}
                                                {formatDate(job.eligibleAt)}
                                            </span>
                                            <span>{job.inventoryVersion}</span>
                                            <span>
                                                최근 점검{' '}
                                                {job.lastInspectedAt
                                                    ? formatDate(job.lastInspectedAt)
                                                    : '없음'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={pendingJobId !== null || !reauthenticated}
                                        onClick={() => void dryRun(job.id)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-40"
                                    >
                                        <Database className="h-4 w-4" />
                                        {pendingJobId === job.id
                                            ? '점검 중...'
                                            : '삭제 없이 dry-run'}
                                    </button>
                                </div>

                                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                                    {job.checkpoints.map((checkpoint) => (
                                        <div
                                            key={checkpoint.store}
                                            className="rounded-xl border border-slate-200 p-3"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-black text-slate-800">
                                                    {STORE_LABEL[checkpoint.store]}
                                                </span>
                                                <span
                                                    className={checkpointStyle(checkpoint.status)}
                                                >
                                                    {checkpoint.status}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-xs text-slate-500">
                                                후보 {checkpoint.candidateCount.toLocaleString()}건
                                            </p>
                                            {checkpoint.blockerCode && (
                                                <p className="mt-2 break-words font-mono text-[10px] font-bold text-red-600">
                                                    {checkpoint.blockerCode}
                                                </p>
                                            )}
                                            {checkpoint.summary && (
                                                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                                                    {checkpoint.summary}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

function checkpointStyle(status: WorkspacePurgeCheckpoint['status']) {
    const color =
        status === 'READY' || status === 'COMPLETED'
            ? 'bg-emerald-50 text-emerald-700'
            : status === 'BLOCKED' || status === 'FAILED'
              ? 'bg-red-50 text-red-700'
              : 'bg-amber-50 text-amber-700';
    return `rounded-full px-2 py-1 text-[10px] font-black ${color}`;
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}
