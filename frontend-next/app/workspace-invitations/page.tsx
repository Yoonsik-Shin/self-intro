'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, LogIn, ShieldCheck, XCircle } from 'lucide-react';
import { workspaceApi } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

const STORAGE_KEY = 'self-intro:workspace-invitation-token';

export default function WorkspaceInvitationPage() {
    const router = useRouter();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isChecking = useAuthStore((state) => state.isChecking);
    const checkSession = useAuthStore((state) => state.checkSession);
    const [token, setToken] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        const fragment = new URLSearchParams(window.location.hash.slice(1)).get('invite');
        return fragment || window.sessionStorage.getItem(STORAGE_KEY);
    });
    const [pending, setPending] = useState(false);
    const [acceptedSlug, setAcceptedSlug] = useState<string | null>(null);
    const [declined, setDeclined] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fragment = new URLSearchParams(window.location.hash.slice(1)).get('invite');
        if (fragment) {
            window.sessionStorage.setItem(STORAGE_KEY, fragment);
            window.history.replaceState(null, '', window.location.pathname);
        }
        checkSession();
    }, [checkSession]);

    async function accept() {
        if (!token) return;
        setPending(true);
        setError(null);
        try {
            const result = await workspaceApi.acceptMembershipInvitation(token);
            window.sessionStorage.removeItem(STORAGE_KEY);
            setAcceptedSlug(result.workspaceSlug);
            await checkSession();
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : '초대를 수락하지 못했습니다. 만료되었거나 다른 이메일의 초대일 수 있습니다.'
            );
        } finally {
            setPending(false);
        }
    }

    async function decline() {
        if (!token || !window.confirm('이 Workspace 참여 초대를 거절할까요?')) return;
        setPending(true);
        setError(null);
        try {
            await workspaceApi.declineMembershipInvitation(token);
            window.sessionStorage.removeItem(STORAGE_KEY);
            setToken(null);
            setDeclined(true);
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : '초대를 거절하지 못했습니다. 만료되었거나 다른 이메일의 초대일 수 있습니다.'
            );
        } finally {
            setPending(false);
        }
    }

    if (isChecking) {
        return <main className="p-10 text-center text-sm text-slate-500">계정 확인 중...</main>;
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <span className="inline-flex rounded-2xl bg-indigo-50 p-3 text-indigo-700">
                    <ShieldCheck className="h-6 w-6" />
                </span>
                <h1 className="mt-5 text-2xl font-black text-slate-950">Workspace 참여 초대</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                    초대 메일과 동일한 이메일의 플랫폼 계정으로 로그인한 뒤 직접 수락해야 합니다.
                    수락 전에는 Workspace 데이터에 접근할 수 없습니다.
                </p>

                {!token && !declined && (
                    <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                        초대 토큰이 없습니다. 받은 메일의 링크를 다시 열어 주세요.
                    </p>
                )}
                {error && (
                    <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </p>
                )}

                {declined ? (
                    <div className="mt-6 rounded-2xl bg-slate-100 p-5">
                        <div className="flex items-center gap-2 font-black text-slate-900">
                            <XCircle className="h-5 w-5" /> 초대를 거절했습니다
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Workspace 권한은 부여되지 않았습니다. 다시 참여하려면 관리자에게 새
                            초대를 요청해 주세요.
                        </p>
                    </div>
                ) : acceptedSlug ? (
                    <div className="mt-6 rounded-2xl bg-emerald-50 p-5">
                        <div className="flex items-center gap-2 font-black text-emerald-900">
                            <CheckCircle2 className="h-5 w-5" /> 참여가 완료되었습니다
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                router.replace(
                                    `/workspace/${encodeURIComponent(acceptedSlug)}/manage`
                                )
                            }
                            className="mt-4 w-full rounded-xl bg-emerald-900 px-4 py-3 text-sm font-black text-white"
                        >
                            Workspace 관리 화면으로 이동
                        </button>
                    </div>
                ) : isAuthenticated ? (
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            disabled={!token || pending}
                            onClick={accept}
                            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-40"
                        >
                            {pending ? '처리 중...' : '이 계정으로 수락'}
                        </button>
                        <button
                            type="button"
                            disabled={!token || pending}
                            onClick={decline}
                            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-40"
                        >
                            초대 거절
                        </button>
                    </div>
                ) : (
                    <Link
                        href="/login?next=%2Fworkspace-invitations"
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
                    >
                        <LogIn className="h-4 w-4" /> 로그인하고 계속
                    </Link>
                )}
            </section>
        </main>
    );
}
