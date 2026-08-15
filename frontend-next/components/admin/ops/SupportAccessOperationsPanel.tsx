'use client';

import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock3, Eye, RefreshCw } from 'lucide-react';
import {
    ApiError,
    supportAccessApi,
    type SupportAccessScope,
    type SupportSnapshot,
} from '@/lib/api';
import { useRecentReauthentication } from '@/hooks/useRecentReauthentication';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';
import { RecentReauthenticationStatus } from '@/components/admin/security/RecentReauthenticationStatus';

const SCOPE_LABEL: Record<SupportAccessScope, string> = {
    PROFILE_READ: '프로필 설정 진단',
    EXPERIENCE_READ: '경험 개수 진단',
    STUDY_READ: '학습 공개 상태 진단',
};
const ALL_SCOPES = Object.keys(SCOPE_LABEL) as SupportAccessScope[];

export function SupportAccessOperationsPanel() {
    const {
        data: requests = [],
        refetch,
        error: loadError,
    } = useQuery({
        queryKey: ['ops', 'support-access'],
        queryFn: supportAccessApi.listForOperator,
    });
    const [workspaceSlug, setWorkspaceSlug] = useState('');
    const [reason, setReason] = useState('');
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [scopes, setScopes] = useState<SupportAccessScope[]>(['PROFILE_READ']);
    const { isReauthenticated: reauthenticated, clear: clearReauthentication } =
        useRecentReauthentication();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [snapshot, setSnapshot] = useState<SupportSnapshot | null>(null);

    async function createRequest(event: FormEvent) {
        event.preventDefault();
        if (!reauthenticated) {
            setError('요청 전에 비밀번호를 다시 확인해 주세요.');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await supportAccessApi.create({ workspaceSlug, reason, scopes, durationMinutes });
            setReason('');
            await refetch();
        } catch (cause) {
            handleError(cause);
        } finally {
            setBusy(false);
        }
    }

    function handleError(cause: unknown) {
        if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) {
            clearReauthentication();
        }
        setError(cause instanceof Error ? cause.message : '지원 접근 작업을 완료하지 못했습니다.');
    }

    async function revoke(requestId: number) {
        if (!reauthenticated) return setError('철회 전에 비밀번호를 다시 확인해 주세요.');
        setBusy(true);
        setError(null);
        try {
            await supportAccessApi.revokeAsOperator(requestId);
            setSnapshot(null);
            await refetch();
        } catch (cause) {
            handleError(cause);
        } finally {
            setBusy(false);
        }
    }

    async function inspect(slug: string, scope: SupportAccessScope) {
        setBusy(true);
        setError(null);
        try {
            setSnapshot(await supportAccessApi.snapshot(slug, scope));
        } catch (cause) {
            handleError(cause);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-6 text-slate-800">
            <AdminPageHeader
                headingAs="h1"
                eyebrow="Platform Operations"
                title="지원 접근 요청·최소 진단"
                description="Workspace 소유자의 명시적 승인을 받은 범위만 최대 60분 동안 진단합니다. 원문·연락처 값은 표시하지 않으며 일반 관리 화면으로 가장하지 않습니다."
            />

            <RecentReauthenticationStatus description="요청·철회와 모든 성공/거절 진단은 보안 감사 이벤트로 남습니다. 상단에서 인증하면 남은 시간 동안 지원 접근 작업에 공통으로 적용됩니다." />

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

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-black text-slate-950">새 접근 요청</h2>
                <form onSubmit={createRequest} className="mt-4 grid gap-4 lg:grid-cols-2">
                    <label className="text-sm font-bold">
                        Workspace slug
                        <input
                            value={workspaceSlug}
                            onChange={(event) => setWorkspaceSlug(event.target.value)}
                            required
                            maxLength={120}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono font-normal"
                        />
                    </label>
                    <label className="text-sm font-bold">
                        승인 후 접근 시간
                        <select
                            value={durationMinutes}
                            onChange={(event) => setDurationMinutes(Number(event.target.value))}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal"
                        >
                            <option value={15}>15분</option>
                            <option value={30}>30분</option>
                            <option value={60}>60분</option>
                        </select>
                    </label>
                    <label className="text-sm font-bold lg:col-span-2">
                        구체적인 지원 사유
                        <textarea
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            required
                            maxLength={500}
                            rows={3}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal"
                        />
                    </label>
                    <fieldset className="lg:col-span-2">
                        <legend className="text-sm font-bold">진단 범위</legend>
                        <div className="mt-2 flex flex-wrap gap-3">
                            {ALL_SCOPES.map((scope) => (
                                <label
                                    key={scope}
                                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        checked={scopes.includes(scope)}
                                        onChange={() =>
                                            setScopes((current) =>
                                                current.includes(scope)
                                                    ? current.filter((item) => item !== scope)
                                                    : [...current, scope]
                                            )
                                        }
                                    />
                                    {SCOPE_LABEL[scope]}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <button
                        disabled={busy || scopes.length === 0}
                        className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-40 lg:col-span-2"
                    >
                        소유자 승인 요청
                    </button>
                </form>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="font-black text-slate-950">내 요청과 활성 승인</h2>
                        <p className="mt-1 text-xs text-slate-500">
                            만료는 서버 시간 기준으로 자동 판정됩니다.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void refetch()}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                        aria-label="새로고침"
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
                                <div className="flex flex-wrap justify-between gap-3">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <strong>{item.workspaceName}</strong>
                                            <code className="text-xs text-slate-500">
                                                {item.workspaceSlug}
                                            </code>
                                            <Status value={item.status} />
                                        </div>
                                        <p className="mt-2 text-sm text-slate-600">{item.reason}</p>
                                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                            <Clock3 className="h-3.5 w-3.5" /> 요청{' '}
                                            {formatDate(item.requestedAt)} ·{' '}
                                            {item.requestedDurationMinutes}분
                                        </p>
                                    </div>
                                    {item.status === 'APPROVED' && (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => void revoke(item.id)}
                                            className="h-fit rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-700"
                                        >
                                            접근 철회
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {item.scopes.map((scope) =>
                                        item.status === 'APPROVED' ? (
                                            <button
                                                key={scope}
                                                type="button"
                                                disabled={busy}
                                                onClick={() =>
                                                    void inspect(item.workspaceSlug, scope)
                                                }
                                                className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                {SCOPE_LABEL[scope]}
                                            </button>
                                        ) : (
                                            <span
                                                key={scope}
                                                className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600"
                                            >
                                                {SCOPE_LABEL[scope]}
                                            </span>
                                        )
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {snapshot && (
                <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
                    <h2 className="font-black text-indigo-950">
                        최소 진단 결과 · {SCOPE_LABEL[snapshot.scope]}
                    </h2>
                    <p className="mt-1 text-xs text-indigo-700">
                        접근 만료 {formatDate(snapshot.accessExpiresAt)}
                    </p>
                    <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                        {Object.entries(snapshot.data).map(([key, value]) => (
                            <div
                                key={key}
                                className="flex justify-between rounded-lg bg-white px-3 py-2 text-sm"
                            >
                                <dt className="font-bold text-slate-600">{key}</dt>
                                <dd className="font-mono text-slate-900">{String(value ?? '-')}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
            )}
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
function formatDate(value: string) {
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value)
    );
}
