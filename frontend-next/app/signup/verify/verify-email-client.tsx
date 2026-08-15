'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api/auth';

export function VerifyEmailClient() {
    const [state, setState] = useState<'checking' | 'success' | 'error'>('checking');

    useEffect(() => {
        const token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token');
        window.history.replaceState({}, '', '/signup/verify');
        if (!token) {
            queueMicrotask(() => setState('error'));
            return;
        }
        authApi
            .verifyEmail(token)
            .then(() => setState('success'))
            .catch(() => setState('error'));
    }, []);

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
                <h1 className="text-2xl font-black text-slate-950">
                    {state === 'checking'
                        ? '이메일 확인 중'
                        : state === 'success'
                          ? '이메일 확인 완료'
                          : '확인 링크를 사용할 수 없습니다'}
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                    {state === 'checking'
                        ? '잠시만 기다려 주세요.'
                        : state === 'success'
                          ? '이제 로그인하고 첫 Workspace를 만들 수 있습니다.'
                          : '링크가 만료되었거나 이미 사용됐습니다.'}
                </p>
                {state !== 'checking' && (
                    <Link
                        href="/login"
                        className="mt-6 inline-flex rounded-md bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
                    >
                        로그인으로 이동
                    </Link>
                )}
            </section>
        </main>
    );
}
