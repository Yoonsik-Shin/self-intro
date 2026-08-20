'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { ApiError, workspaceApi, type WorkspaceRole } from '@/lib/api';
import { useRecentReauthentication } from '@/hooks/useRecentReauthentication';
import { useAuthStore } from '@/store/useAuthStore';

type Props = {
    workspaceSlug: string;
    workspaceName: string;
    role: WorkspaceRole;
};

export function WorkspaceCloseSettings({ workspaceSlug, workspaceName, role }: Props) {
    const router = useRouter();
    const checkSession = useAuthStore((state) => state.checkSession);
    const { isReauthenticated: reauthenticated, clear: clearReauthentication } =
        useRecentReauthentication();
    const [confirmationName, setConfirmationName] = useState('');
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (role !== 'OWNER') return null;

    async function close() {
        if (!reauthenticated) {
            setError('먼저 비밀번호를 다시 확인해 주세요.');
            return;
        }
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
        setPending(true);
        setError(null);
        try {
            await workspaceApi.close(workspaceSlug, confirmationName);
            await checkSession();
            router.replace('/');
        } catch (cause) {
            if (cause instanceof ApiError && cause.status === 401) {
                clearReauthentication();
                setError('인증 시간이 만료되었습니다. 상단에서 중요 작업 인증을 다시 해 주세요.');
            } else {
                setError(
                    cause instanceof Error ? cause.message : 'Workspace를 폐쇄하지 못했습니다.'
                );
            }
        } finally {
            setPending(false);
        }
    }

    return (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-8">
            <div className="flex items-center gap-2 font-black text-red-950">
                <Trash2 className="h-4 w-4" /> Workspace 폐쇄
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-red-900/80">
                즉시 비공개·폐쇄 상태로 전환하고 모든 멤버와 초대의 접근을 차단합니다. 데이터는
                안전한 삭제 전파를 위해 유예기간 동안 보관되며, 현재 비공개 베타에서는 물리 삭제 전
                운영 검증을 거칩니다.
            </p>

            {error && (
                <p role="alert" className="mt-4 text-sm font-bold text-red-700">
                    {error}
                </p>
            )}

            <div className="mt-5 flex max-w-lg flex-wrap gap-2">
                <input
                    value={confirmationName}
                    onChange={(event) => setConfirmationName(event.target.value)}
                    placeholder={`확인을 위해 “${workspaceName}” 입력`}
                    className="min-w-0 flex-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-500"
                />
                <button
                    type="button"
                    disabled={
                        pending || !reauthenticated || confirmationName.trim() !== workspaceName
                    }
                    onClick={() => void close()}
                    className="rounded-xl bg-red-900 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
                >
                    Workspace 폐쇄
                </button>
            </div>
        </section>
    );
}
