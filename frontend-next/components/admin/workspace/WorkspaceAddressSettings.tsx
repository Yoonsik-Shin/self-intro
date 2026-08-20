'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Link2 } from 'lucide-react';
import { ApiError, workspaceApi, type WorkspaceRole } from '@/lib/api';
import { useRecentReauthentication } from '@/hooks/useRecentReauthentication';
import { useAuthStore } from '@/store/useAuthStore';

type Props = {
    workspaceSlug: string;
    role: WorkspaceRole;
};

export function WorkspaceAddressSettings({ workspaceSlug, role }: Props) {
    const router = useRouter();
    const checkSession = useAuthStore((state) => state.checkSession);
    const { isReauthenticated: reauthenticated, clear: clearReauthentication } =
        useRecentReauthentication();
    const canChange = role === 'OWNER' || role === 'ADMIN';
    const settingsQuery = useQuery({
        queryKey: ['workspace-slug-settings', workspaceSlug],
        queryFn: () => workspaceApi.slugSettings(workspaceSlug),
        enabled: canChange,
    });
    const [slug, setSlug] = useState(workspaceSlug);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function changeSlug(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!reauthenticated) {
            setError('먼저 비밀번호를 다시 확인해 주세요.');
            return;
        }
        if (
            !window.confirm(
                '기본 공개 주소를 변경할까요? 이전 주소도 같은 Workspace로 계속 연결됩니다.'
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
                clearReauthentication();
                setError('인증 시간이 만료되었습니다. 상단에서 중요 작업 인증을 다시 해 주세요.');
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
            <div className="flex items-start gap-2.5">
                <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
                <div>
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
                        Public URL
                    </span>
                    <h2 className="mt-1 text-xl font-black text-slate-950">공개 주소 관리</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        공개 페이지 URL의 마지막 부분을 관리합니다. 주소를 변경해도 이전 주소는 같은
                        Workspace로 계속 연결되며, 주소를 알아도 관리 권한이 생기지는 않습니다.
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

            <form onSubmit={changeSlug} className="mt-6">
                <label
                    htmlFor="workspace-public-slug"
                    className="text-sm font-black text-slate-900"
                >
                    기본 공개 주소
                </label>
                <div className="mt-3 flex max-w-lg gap-2">
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
                        disabled={pending || !reauthenticated || slug === settings?.canonicalSlug}
                        className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
                    >
                        변경
                    </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                    공개 페이지 URL의 마지막 부분입니다. 영문 소문자·숫자·하이픈, 3~60자를 사용할 수
                    있으며 시작과 끝에는 하이픈을 사용할 수 없습니다.
                </p>
            </form>

            {settings?.activeAliases.length ? (
                <div className="mt-5 border-t border-slate-200 pt-4">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                        이전 공개 주소
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
