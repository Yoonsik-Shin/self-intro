'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LogOut } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/errors';
import { useAuthStore } from '@/store/useAuthStore';

export default function WorkspaceOnboardingPage() {
    const router = useRouter();
    const me = useAuthStore((state) => state.me);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isChecking = useAuthStore((state) => state.isChecking);
    const checkSession = useAuthStore((state) => state.checkSession);
    const setUnauthenticated = useAuthStore((state) => state.setUnauthenticated);
    const logout = useAuthStore((state) => state.logout);
    const [name, setName] = useState('나의 Career Workspace');
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        checkSession();
    }, [checkSession]);
    useEffect(() => {
        if (!isChecking && !isAuthenticated)
            router.replace('/login?next=%2Fonboarding%2Fworkspace');
        const existing = me?.workspaces?.[0];
        if (existing) router.replace(`/workspace/${encodeURIComponent(existing.slug)}/manage`);
    }, [isAuthenticated, isChecking, me, router]);

    async function submit(event: FormEvent) {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
            const workspace = await authApi.createFirstWorkspace(name);
            await checkSession();
            router.replace(`/workspace/${encodeURIComponent(workspace.slug)}/manage`);
        } catch (cause) {
            if (cause instanceof ApiError && cause.status === 401) {
                setUnauthenticated();
                router.replace('/login?next=%2Fonboarding%2Fworkspace');
                return;
            }
            setError(cause instanceof Error ? cause.message : 'Workspace를 만들지 못했습니다.');
        } finally {
            setPending(false);
        }
    }

    if (isChecking || !isAuthenticated)
        return <main className="p-10 text-center">계정 확인 중...</main>;
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <Link
                    href="/"
                    className="mb-5 inline-flex items-center gap-1.5 text-xs font-black text-slate-600 hover:text-slate-950"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    메인으로 돌아가기
                </Link>
                <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">
                            {me?.nickname || me?.username}
                        </p>
                        <p className="truncate text-xs text-slate-500">{me?.username}</p>
                    </div>
                    <button
                        type="button"
                        onClick={async () => {
                            await logout();
                            router.replace('/login');
                        }}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-2 text-xs font-black text-red-700 hover:bg-red-50"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        로그아웃
                    </button>
                </div>
                <span className="text-xs font-black text-indigo-600">FIRST WORKSPACE</span>
                <h1 className="mt-2 text-2xl font-black text-slate-950">첫 Workspace 만들기</h1>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                    처음에는 비공개로 생성됩니다. 공개 URL은 발행할 때 선택할 수 있습니다.
                </p>
                <form onSubmit={submit} className="mt-6 space-y-4">
                    <label className="block text-sm font-bold text-slate-700">
                        Workspace 이름
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            minLength={2}
                            maxLength={120}
                            required
                            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-indigo-500"
                        />
                    </label>
                    {error && (
                        <p role="alert" className="text-sm font-bold text-red-600">
                            {error}
                        </p>
                    )}
                    <button
                        disabled={pending}
                        className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                    >
                        {pending ? '생성 중...' : '비공개 Workspace 생성'}
                    </button>
                </form>
            </section>
        </main>
    );
}
