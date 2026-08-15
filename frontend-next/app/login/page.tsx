'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Home, Lock, ShieldCheck } from 'lucide-react';
import type { MeResponse } from '@/lib/api/auth';
import { useAuthStore } from '@/store/useAuthStore';

function postLoginDestination(me: MeResponse, requestedNext: string | null): string {
    const safeNext =
        requestedNext?.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : null;
    const workspaceRoute = safeNext?.match(/^\/workspace\/([^/]+)(?:\/|$)/);
    let requestedWorkspaceSlug: string | null = null;
    if (workspaceRoute?.[1]) {
        try {
            requestedWorkspaceSlug = decodeURIComponent(workspaceRoute[1]);
        } catch {
            requestedWorkspaceSlug = '__invalid_workspace_slug__';
        }
    }
    const canUseRequestedRoute =
        safeNext &&
        (!safeNext.startsWith('/ops') || me.platformRoles.length > 0) &&
        (!requestedWorkspaceSlug ||
            me.workspaces.some((workspace) => workspace.slug === requestedWorkspaceSlug));

    if (canUseRequestedRoute) return safeNext;
    if (me.platformRoles.length > 0) return '/ops';
    const firstWorkspace = me.workspaces[0];
    return firstWorkspace
        ? `/workspace/${encodeURIComponent(firstWorkspace.slug)}/manage`
        : '/onboarding/workspace';
}

export default function LoginPage() {
    const router = useRouter();
    const login = useAuthStore((s) => s.login);
    const checkSession = useAuthStore((s) => s.checkSession);
    const isChecking = useAuthStore((s) => s.isChecking);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const currentUser = useAuthStore((s) => s.me);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');

    const moveAfterLogin = (me: MeResponse) => {
        const requestedNext = new URLSearchParams(window.location.search).get('next');
        setPassword('');
        setTotpCode('');
        router.replace(postLoginDestination(me, requestedNext));
    };

    useEffect(() => {
        void checkSession();
    }, [checkSession]);

    useEffect(() => {
        if (!isChecking && isAuthenticated && currentUser) {
            const requestedNext = new URLSearchParams(window.location.search).get('next');
            router.replace(postLoginDestination(currentUser, requestedNext));
        }
    }, [currentUser, isAuthenticated, isChecking, router]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            const result = await login(username, password, step === 'mfa' ? totpCode : undefined);
            if (result.mfaRequired) {
                setStep('mfa');
                setTotpCode('');
                return;
            }
            moveAfterLogin(result.me);
        } catch {
            setError(
                step === 'mfa'
                    ? '인증코드가 올바르지 않거나 만료됐습니다.'
                    : '이메일 또는 비밀번호가 올바르지 않습니다.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isChecking || isAuthenticated) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
                <p className="text-sm font-bold text-slate-400">계정 확인 중...</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
            <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]">
                <div className="mb-6 flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-gradient-to-tr from-slate-900 to-slate-950 text-white shadow-md shadow-slate-800/20">
                        {step === 'credentials' ? (
                            <Lock className="h-5 w-5" />
                        ) : (
                            <ShieldCheck className="h-5 w-5" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-900">
                            {step === 'credentials' ? '계정 로그인' : '2단계 인증'}
                        </h1>
                        <p className="text-xs text-slate-400 font-semibold">
                            {step === 'credentials'
                                ? '내 Workspace와 공개 페이지를 관리합니다'
                                : '인증 앱에 표시된 코드를 입력하세요'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {step === 'credentials' ? (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    이메일 또는 아이디
                                </label>
                                <input
                                    type="text"
                                    autoComplete="username"
                                    required
                                    autoFocus
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full rounded-md border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                                />
                            </div>
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                                        비밀번호
                                    </label>
                                    <Link
                                        href="/password-reset"
                                        className="text-xs font-bold text-indigo-700 hover:text-indigo-900"
                                    >
                                        비밀번호를 잊으셨나요?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <input
                                        type={isPasswordVisible ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full rounded-md border border-slate-200 px-4 py-2.5 pr-11 text-sm focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsPasswordVisible((prev) => !prev)}
                                        aria-label={
                                            isPasswordVisible ? '비밀번호 숨기기' : '비밀번호 표시'
                                        }
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700"
                                    >
                                        {isPasswordVisible ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>
                            <div className="mb-4 rounded-md bg-slate-50 px-4 py-3 text-xs text-slate-500">
                                <span className="block font-bold text-slate-700">{username}</span>
                                비밀번호 확인이 완료됐습니다. MFA 완료 전에는 Workspace 권한이
                                부여되지 않습니다.
                            </div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                인증 앱 코드 또는 복구 코드
                            </label>
                            <input
                                type="text"
                                inputMode="text"
                                autoComplete="one-time-code"
                                maxLength={20}
                                required
                                autoFocus
                                value={totpCode}
                                onChange={(event) =>
                                    setTotpCode(event.target.value.toUpperCase().slice(0, 20))
                                }
                                placeholder="000000 또는 XXXX-XXXX-XXXX"
                                className="w-full rounded-md border border-slate-200 px-4 py-2.5 text-center text-lg font-black tracking-[0.35em] transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                    )}

                    {error && <p className="text-xs font-bold text-red-500">{error}</p>}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-md bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-md shadow-slate-800/20"
                    >
                        {isSubmitting
                            ? step === 'credentials'
                                ? '계정 확인 중...'
                                : '인증 중...'
                            : step === 'credentials'
                              ? '로그인'
                              : '인증 완료'}
                    </button>

                    {step === 'mfa' && (
                        <button
                            type="button"
                            onClick={() => {
                                setStep('credentials');
                                setTotpCode('');
                                setError(null);
                            }}
                            className="flex w-full items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            다른 계정으로 로그인
                        </button>
                    )}
                </form>

                <div className="mt-5 border-t border-slate-100 pt-5 text-center">
                    <span className="text-xs text-slate-400">초대 코드를 받으셨나요? </span>
                    <Link
                        href="/signup"
                        className="text-xs font-black text-indigo-700 hover:text-indigo-900"
                    >
                        가입하기
                    </Link>
                </div>

                <Link
                    href="/"
                    className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition"
                >
                    <Home className="h-3.5 w-3.5" />
                    메인페이지로 돌아가기
                </Link>
            </div>
        </main>
    );
}
