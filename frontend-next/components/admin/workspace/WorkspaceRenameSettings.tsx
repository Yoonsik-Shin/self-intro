'use client';

import { useState, type FormEvent } from 'react';
import { Pencil } from 'lucide-react';
import { ApiError, workspaceApi, type WorkspaceRole } from '@/lib/api';
import { useRecentReauthentication } from '@/hooks/useRecentReauthentication';
import { useAuthStore } from '@/store/useAuthStore';

type Props = {
    workspaceSlug: string;
    workspaceName: string;
    role: WorkspaceRole;
};

export function WorkspaceRenameSettings({ workspaceSlug, workspaceName, role }: Props) {
    const checkSession = useAuthStore((state) => state.checkSession);
    const updateWorkspaceName = useAuthStore((state) => state.updateWorkspaceName);
    const { isReauthenticated: reauthenticated, clear: clearReauthentication } =
        useRecentReauthentication();
    const [name, setName] = useState(workspaceName);
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (role !== 'OWNER' && role !== 'ADMIN') return null;

    async function rename(event: FormEvent) {
        event.preventDefault();
        if (!reauthenticated) {
            setError('먼저 비밀번호를 다시 확인해 주세요.');
            return;
        }
        setPending(true);
        setError(null);
        setMessage(null);
        try {
            const renamedWorkspace = await workspaceApi.rename(workspaceSlug, name);
            setName(renamedWorkspace.name);
            await checkSession();
            // /me 응답 캐시가 갱신되기 전이어도 현재 화면에는 이름 변경 결과를 즉시 반영한다.
            updateWorkspaceName(workspaceSlug, renamedWorkspace.name);
            setMessage('Workspace 이름을 변경했습니다.');
        } catch (cause) {
            if (cause instanceof ApiError && cause.status === 401) {
                clearReauthentication();
                setError('인증 시간이 만료되었습니다. 상단에서 중요 작업 인증을 다시 해 주세요.');
            } else {
                setError(cause instanceof Error ? cause.message : '이름을 변경하지 못했습니다.');
            }
        } finally {
            setPending(false);
        }
    }

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-2 font-black text-slate-950">
                <Pencil className="h-4 w-4" /> Workspace 이름 변경
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Workspace 이름은 공개 slug와 독립적입니다. 멤버 목록과 관리 화면 곳곳에 표시됩니다.
            </p>

            {error && (
                <p role="alert" className="mt-4 text-sm font-bold text-red-600">
                    {error}
                </p>
            )}
            {message && <p className="mt-4 text-sm font-bold text-emerald-700">{message}</p>}

            <form onSubmit={rename} className="mt-5 flex max-w-lg gap-2">
                <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    minLength={2}
                    maxLength={120}
                    required
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
                <button
                    disabled={pending || !reauthenticated || name.trim() === workspaceName}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
                >
                    이름 변경
                </button>
            </form>
        </section>
    );
}
