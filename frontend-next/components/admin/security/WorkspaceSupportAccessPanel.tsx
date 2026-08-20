'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, ShieldCheck, ShieldX } from 'lucide-react';
import { ApiError, supportAccessApi, type SupportAccessScope } from '@/lib/api';
import { useRecentReauthentication } from '@/hooks/useRecentReauthentication';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';
import { RecentReauthenticationStatus } from '@/components/admin/security/RecentReauthenticationStatus';

const SCOPE_LABEL: Record<SupportAccessScope, string> = {
    PROFILE_READ: '프로필 설정 여부',
    EXPERIENCE_READ: '경험 개수',
    STUDY_READ: '학습 공개 수',
};

export function WorkspaceSupportAccessPanel({ workspaceSlug }: { workspaceSlug: string }) {
    const {
        data: requests = [],
        refetch,
        error: loadError,
    } = useQuery({
        queryKey: ['workspace', workspaceSlug, 'support-access'],
        queryFn: () => supportAccessApi.listForWorkspace(workspaceSlug),
    });
    const { isReauthenticated: reauthenticated, clear: clearReauthentication } =
        useRecentReauthentication();
    const [busyId, setBusyId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function decide(id: number, action: 'approve' | 'deny' | 'revoke') {
        if (!reauthenticated) return setError('처리 전에 비밀번호를 다시 확인해 주세요.');
        setBusyId(id);
        setError(null);
        try {
            if (action === 'approve') await supportAccessApi.approve(workspaceSlug, id);
            if (action === 'deny') await supportAccessApi.deny(workspaceSlug, id);
            if (action === 'revoke') await supportAccessApi.revokeAsOwner(workspaceSlug, id);
            await refetch();
        } catch (cause) {
            if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) {
                clearReauthentication();
            }
            setError(cause instanceof Error ? cause.message : '요청을 처리하지 못했습니다.');
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="space-y-4 text-slate-800">
            <AdminPageHeader
                headingAs="h1"
                eyebrow="Workspace Security"
                title="고객 지원 접근 동의"
                description="이 화면은 플랫폼 운영 기능이 아니라 내 Workspace 데이터에 대한 소유자의 동의 화면입니다. 승인해도 원문·연락처 값이나 일반 관리 권한은 제공되지 않습니다."
            />
            <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1fr_420px] md:items-center">
                <div>
                    <strong className="flex items-center gap-2 text-slate-950">
                        <ShieldCheck className="h-5 w-5" /> 소유자만 승인 가능
                    </strong>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        사유·범위·시간을 확인하세요. 승인은 최대 60분이며 언제든 즉시 철회할 수
                        있습니다.
                    </p>
                </div>
                <RecentReauthenticationStatus description="지원 접근 승인·거절·철회에는 최근 10분 안의 소유자 비밀번호 확인이 필요합니다." />
            </section>
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
                        <h2 className="font-black text-slate-950">내 Workspace 요청 이력</h2>
                        <p className="mt-1 text-xs text-slate-500">
                            지원 담당자 이름, 사유, 요청 범위만 표시합니다.
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
                {requests.length === 0 ? (
                    <p className="p-10 text-center text-sm text-slate-400">
                        지원 접근 요청이 없습니다.
                    </p>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {requests.map((item) => (
                            <article key={item.id} className="space-y-3 p-5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <strong>{item.operatorDisplayName}</strong>
                                    <Status value={item.status} />
                                    <span className="text-xs text-slate-500">
                                        {item.requestedDurationMinutes}분
                                    </span>
                                </div>
                                <p className="text-sm leading-6 text-slate-700">{item.reason}</p>
                                <div className="flex flex-wrap gap-2">
                                    {item.scopes.map((scope) => (
                                        <span
                                            key={scope}
                                            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600"
                                        >
                                            {SCOPE_LABEL[scope]}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {item.status === 'PENDING' && (
                                        <>
                                            <button
                                                disabled={busyId !== null}
                                                onClick={() => void decide(item.id, 'approve')}
                                                className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white"
                                            >
                                                범위대로 승인
                                            </button>
                                            <button
                                                disabled={busyId !== null}
                                                onClick={() => void decide(item.id, 'deny')}
                                                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-700"
                                            >
                                                <ShieldX className="mr-1 inline h-3.5 w-3.5" />
                                                거절
                                            </button>
                                        </>
                                    )}
                                    {item.status === 'APPROVED' && (
                                        <button
                                            disabled={busyId !== null}
                                            onClick={() => void decide(item.id, 'revoke')}
                                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-700"
                                        >
                                            즉시 철회
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

function Status({ value }: { value: string }) {
    const color =
        value === 'APPROVED'
            ? 'bg-emerald-50 text-emerald-700'
            : value === 'PENDING'
              ? 'bg-amber-50 text-amber-700'
              : 'bg-slate-100 text-slate-600';
    return (
        <span className={`rounded-full px-2 py-1 text-[10px] font-black ${color}`}>{value}</span>
    );
}
