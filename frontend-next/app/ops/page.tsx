'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Ban, Check, Clipboard, Clock3, KeyRound, Mail, RefreshCw, UserPlus } from 'lucide-react';
import { ApiError, invitationApi, type Invitation, type IssuedInvitation } from '@/lib/api';
import { useRecentReauthentication } from '@/hooks/useRecentReauthentication';
import { useAuthStore } from '@/store/useAuthStore';
import { RecentReauthenticationStatus } from '@/components/admin/security/RecentReauthenticationStatus';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';

const statusStyle: Record<Invitation['status'], string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700',
    USED: 'bg-blue-50 text-blue-700',
    EXPIRED: 'bg-amber-50 text-amber-700',
    REVOKED: 'bg-slate-100 text-slate-500',
};

const statusLabel: Record<Invitation['status'], string> = {
    ACTIVE: '사용 가능',
    USED: '사용 완료',
    EXPIRED: '만료',
    REVOKED: '폐기',
};

export default function OpsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const embedded = pathname?.startsWith('/workspace/');
    const isChecking = useAuthStore((state) => state.isChecking);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const me = useAuthStore((state) => state.me);
    const checkSession = useAuthStore((state) => state.checkSession);

    useEffect(() => {
        if (embedded) return;
        void checkSession();
    }, [checkSession, embedded]);

    useEffect(() => {
        if (embedded) return;
        if (isChecking) return;
        if (!isAuthenticated) {
            router.replace('/login?next=/ops');
            return;
        }
        const workspace = me?.workspaces[0];
        router.replace(
            workspace
                ? `/workspace/${encodeURIComponent(workspace.slug)}/manage?tab=INVITATIONS`
                : '/'
        );
    }, [embedded, isAuthenticated, isChecking, me, router]);

    if (embedded) return <InvitationOperationsPanel />;

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
            <p className="text-sm font-bold text-slate-400">운영 Workspace로 이동 중...</p>
        </main>
    );
}

function InvitationOperationsPanel() {
    const {
        data: invitations = [],
        error: loadError,
        refetch,
    } = useQuery({
        queryKey: ['ops', 'invitations'],
        queryFn: invitationApi.list,
    });
    const [issued, setIssued] = useState<IssuedInvitation | null>(null);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [sendEmail, setSendEmail] = useState(true);
    const { isReauthenticated: reauthenticated, clear: clearReauthentication } =
        useRecentReauthentication();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function issue(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!reauthenticated) {
            setError('상단에서 중요 작업 인증을 먼저 완료해 주세요.');
            return;
        }
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        setPending(true);
        setError(null);
        setIssued(null);
        try {
            const result = await invitationApi.issue({
                label: String(form.get('label') ?? ''),
                recipientEmail,
                maxUses: recipientEmail ? 1 : Number(form.get('maxUses')),
                validForHours: Number(form.get('validForHours')),
                sendEmail: Boolean(recipientEmail) && sendEmail,
            });
            setIssued(result);
            await refetch();
            formElement.reset();
            setRecipientEmail('');
            setSendEmail(true);
        } catch (cause) {
            handleMutationError(cause);
        } finally {
            setPending(false);
        }
    }

    async function revoke(invitationId: number) {
        if (!reauthenticated) {
            setError('상단에서 중요 작업 인증을 먼저 완료해 주세요.');
            return;
        }
        if (!window.confirm('이 초대를 즉시 폐기할까요? 기존 링크는 더 이상 사용할 수 없습니다.')) {
            return;
        }
        setPending(true);
        setError(null);
        try {
            await invitationApi.revoke(invitationId);
            await refetch();
        } catch (cause) {
            handleMutationError(cause);
        } finally {
            setPending(false);
        }
    }

    async function replaceAndSend(invitationId: number) {
        if (!reauthenticated) {
            setError('상단에서 중요 작업 인증을 먼저 완료해 주세요.');
            return;
        }
        setPending(true);
        setError(null);
        setIssued(null);
        try {
            const result = await invitationApi.replaceAndSend(invitationId);
            setIssued(result);
            await refetch();
        } catch (cause) {
            handleMutationError(cause);
        } finally {
            setPending(false);
        }
    }

    function handleMutationError(cause: unknown) {
        if (cause instanceof ApiError && cause.status === 401) {
            clearReauthentication();
            setError('보안을 위해 비밀번호를 다시 확인해 주세요.');
            return;
        }
        setError(messageOf(cause));
    }

    return (
        <div className="text-slate-800">
            <div className="space-y-4">
                <AdminPageHeader
                    headingAs="h1"
                    title="비공개 베타 초대 관리"
                    description="Workspace 사용자가 아니라 플랫폼 운영자 권한으로 관리하는 화면입니다."
                />

                <RecentReauthenticationStatus description="초대 목록은 이메일을 마스킹합니다. 상단에서 인증하면 발급·폐기·교체 발송에 같은 최근 인증 상태가 10분 동안 적용됩니다." />

                {(error || loadError) && (
                    <p
                        role="alert"
                        className="rounded-md bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
                    >
                        {error ?? messageOf(loadError)}
                    </p>
                )}

                {issued && (
                    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                        <h2 className="font-black text-emerald-950">초대가 발급되었습니다</h2>
                        <p className="mt-1 text-xs leading-5 text-emerald-800">
                            {issued.code
                                ? '원문은 다시 조회할 수 없습니다. 지금 필요한 곳에 안전하게 전달하세요.'
                                : '이메일로만 전달했습니다. 운영 화면에는 원문을 노출하지 않습니다.'}
                        </p>
                        {issued.code && <SecretRow label="초대 코드" value={issued.code} />}
                        {issued.invitationUrl && (
                            <SecretRow label="초대 링크" value={issued.invitationUrl} />
                        )}
                    </section>
                )}

                <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
                    <form
                        onSubmit={issue}
                        className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <div className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-lg font-black text-slate-950">새 초대 발급</h2>
                        </div>
                        <div className="mt-5 space-y-4">
                            <OpsField
                                label="초대 이름"
                                name="label"
                                placeholder="예: 8월 비공개 베타 1차"
                                required
                            />
                            <OpsField
                                label="초대 이메일 (선택)"
                                name="recipientEmail"
                                type="email"
                                value={recipientEmail}
                                onChange={(event) => setRecipientEmail(event.target.value)}
                                placeholder="개인 초대일 때 입력"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <OpsField
                                    label="사용 가능 횟수"
                                    name="maxUses"
                                    type="number"
                                    min={1}
                                    max={100}
                                    defaultValue={5}
                                    disabled={Boolean(recipientEmail)}
                                />
                                <OpsField
                                    label="유효시간"
                                    name="validForHours"
                                    type="number"
                                    min={1}
                                    max={720}
                                    defaultValue={72}
                                    required
                                />
                            </div>
                            <label className="flex items-start gap-2 text-sm text-slate-600">
                                <input
                                    className="mt-1"
                                    type="checkbox"
                                    checked={sendEmail}
                                    disabled={!recipientEmail}
                                    onChange={(event) => setSendEmail(event.target.checked)}
                                />
                                <span>지정한 이메일로 초대 링크를 바로 발송합니다.</span>
                            </label>
                            <button
                                disabled={pending || !reauthenticated}
                                title={
                                    reauthenticated
                                        ? undefined
                                        : '상단에서 중요 작업 인증을 먼저 완료해 주세요.'
                                }
                                className="w-full rounded-md bg-indigo-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                            >
                                초대 발급
                            </button>
                        </div>
                    </form>

                    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <div>
                                <h2 className="font-black text-slate-950">발급 현황</h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    수신 이메일은 목록에서 마스킹됩니다.
                                </p>
                            </div>
                            <button
                                onClick={() => void refetch()}
                                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                                aria-label="새로고침"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {invitations.length === 0 ? (
                                <p className="p-8 text-center text-sm text-slate-400">
                                    발급된 초대가 없습니다.
                                </p>
                            ) : (
                                invitations.map((invitation) => (
                                    <article key={invitation.id} className="p-5">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-black text-slate-900">
                                                        {invitation.label}
                                                    </h3>
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-[11px] font-black ${statusStyle[invitation.status]}`}
                                                    >
                                                        {statusLabel[invitation.status]}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Mail className="h-3.5 w-3.5" />
                                                        {invitation.recipientEmailMasked ??
                                                            '공용 코드'}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <KeyRound className="h-3.5 w-3.5" />
                                                        {invitation.usedCount}/{invitation.maxUses}
                                                        회 사용
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <Clock3 className="h-3.5 w-3.5" />
                                                        {formatDate(invitation.expiresAt)} 만료
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {invitation.recipientEmailMasked && (
                                                    <button
                                                        type="button"
                                                        disabled={pending || !reauthenticated}
                                                        title={
                                                            reauthenticated
                                                                ? undefined
                                                                : '상단에서 중요 작업 인증을 먼저 완료해 주세요.'
                                                        }
                                                        onClick={() =>
                                                            void replaceAndSend(invitation.id)
                                                        }
                                                        className="rounded-md border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-50"
                                                    >
                                                        교체 발송
                                                    </button>
                                                )}
                                                {invitation.status === 'ACTIVE' && (
                                                    <button
                                                        type="button"
                                                        disabled={pending || !reauthenticated}
                                                        title={
                                                            reauthenticated
                                                                ? undefined
                                                                : '상단에서 중요 작업 인증을 먼저 완료해 주세요.'
                                                        }
                                                        onClick={() => void revoke(invitation.id)}
                                                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-xs font-black text-red-600 disabled:opacity-50"
                                                    >
                                                        <Ban className="h-3.5 w-3.5" /> 폐기
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                ))
                            )}
                        </div>
                    </section>
                </section>
            </div>
        </div>
    );
}

function SecretRow({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <div className="mt-3 grid gap-2 sm:grid-cols-[90px_minmax(0,1fr)_auto] sm:items-center">
            <span className="text-xs font-black text-emerald-900">{label}</span>
            <code className="overflow-x-auto rounded-md bg-white/80 px-3 py-2 text-xs text-slate-700">
                {value}
            </code>
            <button
                type="button"
                onClick={async () => {
                    await navigator.clipboard.writeText(value);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex items-center justify-center gap-1 rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800"
            >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                {copied ? '복사됨' : '복사'}
            </button>
        </div>
    );
}

type OpsFieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string };
function OpsField({ label, ...props }: OpsFieldProps) {
    return (
        <label className="block text-xs font-black text-slate-600">
            {label}
            <input
                {...props}
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500 disabled:bg-slate-100"
            />
        </label>
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function messageOf(cause: unknown) {
    return cause instanceof Error ? cause.message : '요청을 처리하지 못했습니다.';
}
