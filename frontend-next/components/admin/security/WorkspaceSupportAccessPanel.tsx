'use client';

import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, RefreshCw, ShieldCheck, ShieldX } from 'lucide-react';
import { ApiError, authApi, supportAccessApi, type SupportAccessScope } from '@/lib/api';

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
    const [password, setPassword] = useState('');
    const [reauthenticated, setReauthenticated] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function reauthenticate(event: FormEvent) {
        event.preventDefault();
        setError(null);
        try {
            await authApi.reauthenticate(password);
            setReauthenticated(true);
            setPassword('');
        } catch {
            setReauthenticated(false);
            setError('비밀번호를 다시 확인해 주세요.');
        }
    }

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
                setReauthenticated(false);
            }
            setError(cause instanceof Error ? cause.message : '요청을 처리하지 못했습니다.');
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="space-y-6 text-slate-800">
            <header>
                <span className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
                    Workspace Security
                </span>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                    지원 접근 승인
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    플랫폼 지원 담당자의 제한된 진단 요청을 검토합니다. 승인해도 원문·연락처 값이나
                    일반 관리 권한은 제공되지 않습니다.
                </p>
            </header>
            <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-5 md:grid-cols-[1fr_360px] md:items-center">
                <div>
                    <strong className="flex items-center gap-2 text-white">
                        <ShieldCheck className="h-5 w-5" /> 소유자만 승인 가능
                    </strong>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                        사유·범위·시간을 확인하세요. 승인은 최대 60분이며 언제든 즉시 철회할 수
                        있습니다.
                    </p>
                </div>
                <form onSubmit={reauthenticate} className="flex gap-2">
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="소유자 비밀번호"
                        autoComplete="current-password"
                        required
                        className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-white px-3 py-2 text-sm text-slate-950"
                    />
                    <button className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950">
                        {reauthenticated ? <Check className="h-4 w-4" /> : '재확인'}
                    </button>
                </form>
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
                        <h2 className="font-black text-slate-950">요청 이력</h2>
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
