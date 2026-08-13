'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Eye, EyeOff, ShieldCheck, UserRoundX } from 'lucide-react';
import { authApi, type AccountWithdrawalReadiness } from '@/lib/api/auth';
import { useAuthStore } from '@/store/useAuthStore';

export default function AccountSettingsPage() {
    const router = useRouter();
    const checkSession = useAuthStore((state) => state.checkSession);
    const me = useAuthStore((state) => state.me);
    const isChecking = useAuthStore((state) => state.isChecking);
    const withdrawAccount = useAuthStore((state) => state.withdrawAccount);
    const [readiness, setReadiness] = useState<AccountWithdrawalReadiness | null>(null);
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [reauthenticated, setReauthenticated] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        void checkSession();
    }, [checkSession]);

    useEffect(() => {
        if (!isChecking && !me) {
            router.replace('/login?next=%2Faccount');
            return;
        }
        if (me) {
            void authApi
                .withdrawalReadiness()
                .then(setReadiness)
                .catch(() => setError('탈퇴 가능 상태를 확인하지 못했습니다.'));
        }
    }, [isChecking, me, router]);

    const reauthenticate = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await authApi.reauthenticate(password);
            setPassword('');
            setReauthenticated(true);
        } catch {
            setError('비밀번호를 다시 확인해 주세요.');
        } finally {
            setBusy(false);
        }
    };

    const withdraw = async () => {
        if (!readiness || confirmation !== readiness.confirmationPhrase) return;
        setBusy(true);
        setError(null);
        try {
            await withdrawAccount(confirmation);
            router.replace('/');
            router.refresh();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '계정 탈퇴에 실패했습니다.');
        } finally {
            setBusy(false);
        }
    };

    if (isChecking || !me || !readiness) {
        return (
            <main className="grid min-h-screen place-items-center bg-slate-50 text-sm font-bold text-slate-500">
                계정 확인 중...
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-10">
            <div className="mx-auto max-w-2xl space-y-6">
                <Link
                    href={
                        me.workspaces[0]
                            ? `/workspace/${encodeURIComponent(me.workspaces[0].slug)}/manage`
                            : '/'
                    }
                    className="inline-flex items-center gap-2 text-sm font-black text-slate-600 hover:text-slate-950"
                >
                    <ArrowLeft className="h-4 w-4" /> 돌아가기
                </Link>
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
                        Account
                    </p>
                    <h1 className="mt-2 text-2xl font-black text-slate-950">계정 설정</h1>
                    <dl className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="font-bold text-slate-400">닉네임</dt>
                            <dd className="mt-1 font-black text-slate-900">{me.nickname}</dd>
                        </div>
                        <div>
                            <dt className="font-bold text-slate-400">로그인 식별자</dt>
                            <dd className="mt-1 break-all font-black text-slate-900">
                                {me.username}
                            </dd>
                        </div>
                    </dl>
                </section>

                <section className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                        <UserRoundX className="mt-1 h-6 w-6 text-red-600" />
                        <div>
                            <h2 className="text-xl font-black text-slate-950">계정 탈퇴</h2>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                                개인 식별 정보와 인증 수단을 제거하고 모든 활성 멤버십에서 나갑니다.
                                감사 및 폐쇄 대기 Workspace의 purge 이력은 익명 상태로 보존됩니다.
                            </p>
                        </div>
                    </div>

                    {!readiness.eligible && (
                        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                            <p className="flex items-center gap-2 font-black">
                                <AlertTriangle className="h-4 w-4" /> 먼저 정리해야 할 항목
                            </p>
                            {readiness.ownedWorkspaceBlockers.map((workspace) => (
                                <p key={workspace.workspaceId} className="mt-2">
                                    Workspace 소유권: {workspace.name}
                                </p>
                            ))}
                            {readiness.platformRoleBlockers.map((role) => (
                                <p key={role} className="mt-2">
                                    플랫폼 역할: {role}
                                </p>
                            ))}
                        </div>
                    )}

                    {readiness.eligible && !reauthenticated && (
                        <form onSubmit={reauthenticate} className="mt-5 space-y-3">
                            <label className="block text-sm font-black text-slate-700">
                                중요 작업 재인증
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-sm outline-none focus:border-slate-900"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((value) => !value)}
                                    className="absolute inset-y-0 right-0 px-4 text-slate-400"
                                    aria-label="비밀번호 표시 전환"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            <button
                                disabled={busy}
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                            >
                                <ShieldCheck className="h-4 w-4" /> 비밀번호 재확인
                            </button>
                        </form>
                    )}

                    {readiness.eligible && reauthenticated && (
                        <div className="mt-5 space-y-3">
                            <label className="block text-sm font-black text-slate-700">
                                확인을 위해 <strong>{readiness.confirmationPhrase}</strong>를
                                입력하세요.
                            </label>
                            <input
                                value={confirmation}
                                onChange={(event) => setConfirmation(event.target.value)}
                                className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm outline-none focus:border-red-500"
                            />
                            <button
                                type="button"
                                onClick={() => void withdraw()}
                                disabled={busy || confirmation !== readiness.confirmationPhrase}
                                className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white disabled:bg-red-200"
                            >
                                계정 탈퇴 확정
                            </button>
                        </div>
                    )}
                    {error && <p className="mt-4 text-sm font-bold text-red-600">{error}</p>}
                </section>
            </div>
        </main>
    );
}
