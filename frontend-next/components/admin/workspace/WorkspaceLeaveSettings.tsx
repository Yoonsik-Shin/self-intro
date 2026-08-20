'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { ApiError, workspaceApi, type WorkspaceRole } from '@/lib/api';
import { useRecentReauthentication } from '@/hooks/useRecentReauthentication';
import { useAuthStore } from '@/store/useAuthStore';

type Props = {
    workspaceSlug: string;
    role: WorkspaceRole;
};

export function WorkspaceLeaveSettings({ workspaceSlug, role }: Props) {
    const router = useRouter();
    const checkSession = useAuthStore((state) => state.checkSession);
    const { isReauthenticated: reauthenticated, clear: clearReauthentication } =
        useRecentReauthentication();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (role === 'OWNER') return null;

    async function leave() {
        if (!reauthenticated) {
            setError('먼저 비밀번호를 다시 확인해 주세요.');
            return;
        }
        if (!window.confirm('이 Workspace에서 탈퇴할까요? 다시 참여하려면 새 초대가 필요합니다.'))
            return;
        setPending(true);
        setError(null);
        try {
            await workspaceApi.leave(workspaceSlug);
            await checkSession();
            router.replace('/');
        } catch (cause) {
            if (cause instanceof ApiError && cause.status === 401) {
                clearReauthentication();
                setError('인증 시간이 만료되었습니다. 상단에서 중요 작업 인증을 다시 해 주세요.');
            } else {
                setError(cause instanceof Error ? cause.message : '탈퇴하지 못했습니다.');
            }
        } finally {
            setPending(false);
        }
    }

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-2 font-black text-slate-950">
                <LogOut className="h-4 w-4" /> Workspace 탈퇴
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                작성된 콘텐츠는 Workspace에 유지되며 내 Membership만 중지됩니다. 다시 참여하려면 새
                초대가 필요합니다.
            </p>

            {error && (
                <p role="alert" className="mt-4 text-sm font-bold text-red-600">
                    {error}
                </p>
            )}

            <button
                type="button"
                disabled={pending || !reauthenticated}
                onClick={() => void leave()}
                className="mt-5 rounded-xl border border-red-200 px-4 py-2 text-sm font-black text-red-700 disabled:opacity-40"
            >
                이 Workspace에서 탈퇴
            </button>
        </section>
    );
}
