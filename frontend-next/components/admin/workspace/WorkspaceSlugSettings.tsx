'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Check, KeyRound, Link2, LoaderCircle } from 'lucide-react';
import { ApiError, authApi, workspaceApi } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

type Props = {
    workspaceSlug: string;
    role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
};

export function WorkspaceSlugSettings({ workspaceSlug, role }: Props) {
    const router = useRouter();
    const checkSession = useAuthStore((state) => state.checkSession);
    const canChange = role === 'OWNER' || role === 'ADMIN';
    const settingsQuery = useQuery({
        queryKey: ['workspace-slug-settings', workspaceSlug],
        queryFn: () => workspaceApi.slugSettings(workspaceSlug),
        enabled: canChange,
    });
    const [slug, setSlug] = useState(workspaceSlug);
    const [password, setPassword] = useState('');
    const [reauthenticated, setReauthenticated] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function reauthenticate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
            await authApi.reauthenticate(password);
            setPassword('');
            setReauthenticated(true);
        } catch {
            setReauthenticated(false);
            setError('비밀번호를 다시 확인해 주세요.');
        } finally {
            setPending(false);
        }
    }

    async function changeSlug(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!reauthenticated) {
            setError('먼저 비밀번호를 다시 확인해 주세요.');
            return;
        }
        if (
            !window.confirm(
                '공개 주소를 변경할까요? 기존 주소는 같은 Workspace로 계속 연결되며 새 주소가 canonical URL이 됩니다.'
            )
        ) {
            return;
        }
        setPending(true);
        setError(null);
        try {
            const result = await workspaceApi.changeSlug(workspaceSlug, slug);
            await checkSession();
            router.replace(`/workspace/${encodeURIComponent(result.canonicalSlug)}/manage`);
        } catch (cause) {
            if (cause instanceof ApiError && cause.status === 401) {
                setReauthenticated(false);
                setError('재인증 시간이 만료되었습니다. 비밀번호를 다시 확인해 주세요.');
            } else {
                setError(
                    cause instanceof Error ? cause.message : '공개 주소를 변경하지 못했습니다.'
                );
            }
        } finally {
            setPending(false);
        }
    }

    if (!canChange) return null;

    const settings = settingsQuery.data;
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-3">
                <span className="rounded-xl bg-indigo-50 p-3 text-indigo-700">
                    <Link2 className="h-5 w-5" />
                </span>
                <div>
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
                        Public URL
                    </span>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">공개 주소 관리</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        canonical slug를 변경해도 기존 주소는 alias로 보존되어 같은 Workspace로
                        이동합니다. slug는 권한을 대신하지 않으며 모든 관리 API는 Membership을 계속
                        확인합니다.
                    </p>
                </div>
            </div>

            {(error || settingsQuery.error) && (
                <p role="alert" className="mt-5 text-sm font-bold text-red-600">
                    {error ??
                        (settingsQuery.error instanceof Error
                            ? settingsQuery.error.message
                            : '주소 설정을 불러오지 못했습니다.')}
                </p>
            )}

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <form onSubmit={reauthenticate} className="rounded-2xl bg-slate-950 p-5 shadow-sm">
                    <div className="flex items-center gap-2 font-black text-white">
                        <KeyRound className="h-4 w-4" /> 중요 작업 재인증
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-300">
                        주소 변경은 최근 10분 안에 비밀번호를 다시 확인한 OWNER 또는 ADMIN만 수행할
                        수 있습니다.
                    </p>
                    <div className="mt-4 flex gap-2">
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="현재 비밀번호"
                            autoComplete="current-password"
                            required
                            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <button
                            disabled={pending}
                            className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-slate-100 disabled:opacity-50"
                        >
                            {pending ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : reauthenticated ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                '재확인'
                            )}
                        </button>
                    </div>
                </form>

                <form onSubmit={changeSlug} className="rounded-2xl bg-slate-50 p-5">
                    <label
                        htmlFor="workspace-public-slug"
                        className="text-sm font-black text-slate-900"
                    >
                        canonical slug
                    </label>
                    <div className="mt-3 flex gap-2">
                        <input
                            id="workspace-public-slug"
                            value={slug}
                            minLength={settings?.minimumLength ?? 3}
                            maxLength={settings?.maximumLength ?? 60}
                            pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])"
                            onChange={(event) => setSlug(event.target.value.toLowerCase())}
                            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500"
                            required
                        />
                        <button
                            disabled={
                                pending || !reauthenticated || slug === settings?.canonicalSlug
                            }
                            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
                        >
                            변경
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        영문 소문자·숫자·하이픈, 3~60자. 시작과 끝에는 하이픈을 사용할 수 없습니다.
                    </p>
                </form>
            </div>

            {settings?.activeAliases.length ? (
                <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                        기존 주소 alias
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {settings.activeAliases.map((alias) => (
                            <code
                                key={alias}
                                className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs"
                            >
                                /workspace/{alias}
                            </code>
                        ))}
                    </div>
                </div>
            ) : null}
        </section>
    );
}
