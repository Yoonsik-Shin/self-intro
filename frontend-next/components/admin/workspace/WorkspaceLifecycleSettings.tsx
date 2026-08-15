'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Pencil, Trash2 } from 'lucide-react';
import { ApiError, workspaceApi, type WorkspaceRole } from '@/lib/api';
import { useRecentReauthentication } from '@/hooks/useRecentReauthentication';
import { useAuthStore } from '@/store/useAuthStore';
import { RecentReauthenticationStatus } from '@/components/admin/security/RecentReauthenticationStatus';

type Props = {
    workspaceSlug: string;
    workspaceName: string;
    role: WorkspaceRole;
};

export function WorkspaceLifecycleSettings({ workspaceSlug, workspaceName, role }: Props) {
    const router = useRouter();
    const checkSession = useAuthStore((state) => state.checkSession);
    const updateWorkspaceName = useAuthStore((state) => state.updateWorkspaceName);
    const { isReauthenticated: reauthenticated, clear: clearReauthentication } =
        useRecentReauthentication();
    const [name, setName] = useState(workspaceName);
    const [confirmationName, setConfirmationName] = useState('');
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const canRename = role === 'OWNER' || role === 'ADMIN';

    async function run<T>(operation: () => Promise<T>, success: (result: T) => Promise<void>) {
        if (!reauthenticated) {
            setError('먼저 비밀번호를 다시 확인해 주세요.');
            return;
        }
        setPending(true);
        setError(null);
        setMessage(null);
        try {
            const result = await operation();
            await success(result);
        } catch (cause) {
            if (cause instanceof ApiError && cause.status === 401) {
                clearReauthentication();
                setError('인증 시간이 만료되었습니다. 상단에서 중요 작업 인증을 다시 해 주세요.');
            } else {
                setError(cause instanceof Error ? cause.message : 'Workspace 작업에 실패했습니다.');
            }
        } finally {
            setPending(false);
        }
    }

    async function rename(event: FormEvent) {
        event.preventDefault();
        await run(
            () => workspaceApi.rename(workspaceSlug, name),
            async (renamedWorkspace) => {
                setName(renamedWorkspace.name);
                await checkSession();
                // /me 응답 캐시가 갱신되기 전이어도 현재 화면에는 이름 변경 결과를 즉시 반영한다.
                updateWorkspaceName(workspaceSlug, renamedWorkspace.name);
                setMessage('Workspace 이름을 변경했습니다.');
            }
        );
    }

    async function leave() {
        if (!window.confirm('이 Workspace에서 탈퇴할까요? 다시 참여하려면 새 초대가 필요합니다.'))
            return;
        await run(
            () => workspaceApi.leave(workspaceSlug),
            async () => {
                await checkSession();
                router.replace('/');
            }
        );
    }

    async function close() {
        if (confirmationName.trim() !== workspaceName) {
            setError('현재 Workspace 이름을 정확히 입력해 주세요.');
            return;
        }
        if (
            !window.confirm(
                'Workspace를 폐쇄할까요? 즉시 모든 멤버와 공개 페이지의 접근이 차단됩니다.'
            )
        )
            return;
        await run(
            () => workspaceApi.close(workspaceSlug, confirmationName),
            async () => {
                await checkSession();
                router.replace('/');
            }
        );
    }

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div>
                <span className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
                    Workspace Lifecycle
                </span>
                <h2 className="mt-2 text-2xl font-black text-slate-950">이름·탈퇴·폐쇄</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    Workspace 이름은 공개 slug와 독립적입니다. 탈퇴하면 새 초대 전까지 접근할 수
                    없고, OWNER는 소유권을 이전하지 않은 채 탈퇴할 수 없습니다.
                </p>
            </div>

            {error && (
                <p role="alert" className="mt-5 text-sm font-bold text-red-600">
                    {error}
                </p>
            )}
            {message && <p className="mt-5 text-sm font-bold text-emerald-700">{message}</p>}

            <div className="mt-6">
                <RecentReauthenticationStatus description="이름 변경·탈퇴·폐쇄는 최근 10분 안에 현재 비밀번호를 확인해야 합니다." />
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
                {canRename && (
                    <form onSubmit={rename} className="rounded-2xl bg-slate-50 p-5">
                        <div className="flex items-center gap-2 font-black text-slate-950">
                            <Pencil className="h-4 w-4" /> Workspace 이름 변경
                        </div>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            minLength={2}
                            maxLength={120}
                            required
                            className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                        />
                        <button
                            disabled={pending || !reauthenticated || name.trim() === workspaceName}
                            className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
                        >
                            이름 변경
                        </button>
                    </form>
                )}

                {role !== 'OWNER' && (
                    <div className="rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-center gap-2 font-black text-slate-950">
                            <LogOut className="h-4 w-4" /> Workspace 탈퇴
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                            작성된 콘텐츠는 Workspace에 유지되며 내 Membership만 중지됩니다.
                        </p>
                        <button
                            type="button"
                            disabled={pending || !reauthenticated}
                            onClick={leave}
                            className="mt-4 w-full rounded-xl border border-red-200 px-4 py-2 text-sm font-black text-red-700 disabled:opacity-40"
                        >
                            이 Workspace에서 탈퇴
                        </button>
                    </div>
                )}
            </div>

            {role === 'OWNER' && (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
                    <div className="flex items-center gap-2 font-black text-red-950">
                        <Trash2 className="h-4 w-4" /> Workspace 폐쇄
                    </div>
                    <p className="mt-2 text-xs leading-5 text-red-900/80">
                        즉시 비공개·폐쇄 상태로 전환하고 모든 멤버와 초대의 접근을 차단합니다.
                        데이터는 안전한 삭제 전파를 위해 유예기간 동안 보관되며, 현재 비공개
                        베타에서는 물리 삭제 전 운영 검증을 거칩니다.
                    </p>
                    <input
                        value={confirmationName}
                        onChange={(event) => setConfirmationName(event.target.value)}
                        placeholder={`확인을 위해 “${workspaceName}” 입력`}
                        className="mt-4 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-500"
                    />
                    <button
                        type="button"
                        disabled={
                            pending || !reauthenticated || confirmationName.trim() !== workspaceName
                        }
                        onClick={close}
                        className="mt-3 w-full rounded-xl bg-red-900 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
                    >
                        Workspace 폐쇄
                    </button>
                </div>
            )}
        </section>
    );
}
