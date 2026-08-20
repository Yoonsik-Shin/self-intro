'use client';

import { useState } from 'react';
import { Check, KeyRound, LoaderCircle, TimerOff } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { useRecentReauthentication } from '@/hooks/useRecentReauthentication';

function formatRemaining(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function RecentReauthenticationStatus({ description }: { description: string }) {
    const { isReauthenticated, remainingSeconds, expire } = useRecentReauthentication();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function expireNow() {
        setPending(true);
        setError(null);
        try {
            await expire();
        } catch (caught) {
            setError(
                caught instanceof ApiError && caught.status === 403
                    ? '보안 토큰이 만료되었습니다. 새로고침 후 다시 시도해 주세요.'
                    : '인증을 만료하지 못했습니다. 잠시 후 다시 시도해 주세요.'
            );
        } finally {
            setPending(false);
        }
    }

    return (
        <div className="rounded-xl bg-slate-900 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-black text-white">
                    {isReauthenticated ? (
                        <Check className="h-4 w-4 text-emerald-300" />
                    ) : (
                        <KeyRound className="h-4 w-4 text-slate-300" />
                    )}
                    {isReauthenticated
                        ? `중요 작업 인증됨 · ${formatRemaining(remainingSeconds)} 남음`
                        : '중요 작업 인증 필요'}
                </div>
                {isReauthenticated && (
                    <button
                        type="button"
                        onClick={() => void expireNow()}
                        disabled={pending}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:opacity-50"
                    >
                        {pending ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <TimerOff className="h-3.5 w-3.5" />
                        )}
                        지금 만료
                    </button>
                )}
            </div>
            <p className="mt-1.5 text-xs leading-5 text-slate-400">{description}</p>
            {error && <p className="mt-1.5 text-xs font-bold text-red-400">{error}</p>}
        </div>
    );
}
