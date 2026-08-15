'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, MailCheck } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authApi } from '@/lib/api/auth';
import { publishAuthSessionEvent } from '@/lib/auth/sessionEvents';
import { useAuthStore } from '@/store/useAuthStore';

function readTokenFromHash(): string {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    return new URLSearchParams(hash).get('token')?.trim() ?? '';
}

export default function EmailChangeConfirmationPage() {
    const setUnauthenticated = useAuthStore((state) => state.setUnauthenticated);
    const [status, setStatus] = useState<'checking' | 'completed' | 'error'>('checking');
    const [changedEmail, setChangedEmail] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            const token = readTokenFromHash();
            if (!token) {
                setError('이메일 변경 토큰이 없는 링크입니다.');
                setStatus('error');
                return;
            }
            window.history.replaceState(null, '', '/account/email-change');
            void authApi
                .confirmEmailChange(token)
                .then((result) => {
                    setUnauthenticated();
                    publishAuthSessionEvent('UNAUTHENTICATED');
                    setChangedEmail(result.email);
                    setStatus('completed');
                })
                .catch((caught) => {
                    setError(
                        caught instanceof ApiError && caught.message
                            ? caught.message
                            : '만료되었거나 유효하지 않은 이메일 변경 링크입니다.'
                    );
                    setStatus('error');
                });
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [setUnauthenticated]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
            <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-md bg-slate-950 text-white">
                        {status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5" />
                        ) : (
                            <MailCheck className="h-5 w-5" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-950">로그인 이메일 확인</h1>
                        <p className="text-xs font-semibold text-slate-500">
                            새 로그인 주소의 소유권을 확인합니다.
                        </p>
                    </div>
                </div>

                {status === 'checking' && (
                    <p className="rounded-md bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                        변경 링크를 확인하고 있습니다...
                    </p>
                )}
                {status === 'completed' && (
                    <div className="space-y-5">
                        <p className="rounded-md bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                            로그인 이메일이 <strong>{changedEmail}</strong>(으)로 변경됐고 기존
                            로그인 세션은 모두 종료됐습니다.
                        </p>
                        <Link
                            href="/login?changed=email"
                            className="block rounded-md bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white"
                        >
                            새 이메일로 로그인
                        </Link>
                    </div>
                )}
                {status === 'error' && (
                    <div className="space-y-5">
                        <p className="rounded-md bg-red-50 p-4 text-sm font-semibold text-red-700">
                            {error}
                        </p>
                        <Link
                            href="/account"
                            className="block rounded-md border border-slate-200 px-5 py-3 text-center text-sm font-bold text-slate-700"
                        >
                            계정 설정으로 돌아가기
                        </Link>
                    </div>
                )}
            </section>
        </main>
    );
}
