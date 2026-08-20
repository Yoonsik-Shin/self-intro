'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, KeyRound, LoaderCircle, TimerOff, X } from 'lucide-react';
import { useRecentReauthentication } from '@/hooks/useRecentReauthentication';
import { ApiError } from '@/lib/api/client';

function formatRemaining(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function ReauthenticationControl() {
    const { isReauthenticated, remainingSeconds, confirm, expire } = useRecentReauthentication();
    const [isOpen, setIsOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const close = (event: MouseEvent) => {
            if (!panelRef.current?.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [isOpen]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
            await confirm(password);
            setPassword('');
            setIsOpen(false);
        } catch (caught) {
            if (caught instanceof ApiError) {
                if (caught.status === 401) {
                    setError('현재 로그인한 계정의 비밀번호와 일치하지 않습니다.');
                } else if (caught.status === 403) {
                    setError('보안 토큰이 만료되었습니다. 새로고침 후 다시 시도해 주세요.');
                } else if (caught.status === 429) {
                    setError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
                } else {
                    setError('서버에서 인증을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
                }
            } else {
                setError('재인증 요청을 완료하지 못했습니다.');
            }
        } finally {
            setPending(false);
        }
    }

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
        <div className="relative" ref={panelRef}>
            <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                aria-expanded={isOpen}
                title="중요 작업에 사용하는 10분 재인증 상태"
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${
                    isReauthenticated
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
            >
                {isReauthenticated ? (
                    <Check className="h-3.5 w-3.5" />
                ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                )}
                <span className="hidden xl:inline">
                    {isReauthenticated
                        ? `인증 ${formatRemaining(remainingSeconds)}`
                        : '중요 작업 인증'}
                </span>
                {isReauthenticated && (
                    <span className="xl:hidden">{formatRemaining(remainingSeconds)}</span>
                )}
            </button>

            {isOpen && (
                <section className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-white shadow-2xl shadow-slate-950/30">
                    <div className="flex items-start justify-between border-b border-slate-800 p-4">
                        <div>
                            <p className="text-sm font-semibold">중요 작업 인증</p>
                            <p className="mt-1 text-xs leading-5 text-slate-400">
                                한 번 확인하면 이 계정의 중요 작업에 10분 동안 함께 적용됩니다.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            title="닫기"
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    {isReauthenticated ? (
                        <div className="p-4">
                            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                                <Check className="h-4 w-4" /> 인증됨 ·{' '}
                                {formatRemaining(remainingSeconds)} 남음
                            </p>
                            <p className="mt-2 text-xs leading-5 text-slate-400">
                                시간이 끝나면 중요한 변경을 실행할 때 다시 인증해야 합니다.
                            </p>
                            {error && (
                                <p className="mt-2 text-xs font-bold text-red-400">{error}</p>
                            )}
                            <button
                                type="button"
                                onClick={() => void expireNow()}
                                disabled={pending}
                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:opacity-50"
                            >
                                {pending ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                    <TimerOff className="h-4 w-4" />
                                )}
                                지금 만료
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="space-y-3 p-4">
                            <label
                                htmlFor="global-reauth-password"
                                className="text-xs font-bold text-slate-300"
                            >
                                현재 비밀번호
                            </label>
                            <input
                                id="global-reauth-password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                autoComplete="current-password"
                                required
                                autoFocus
                                className="w-full rounded-xl border border-slate-700 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                            />
                            {error && <p className="text-xs font-bold text-red-400">{error}</p>}
                            <button
                                type="submit"
                                disabled={pending || !password}
                                className="flex w-full items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-50"
                            >
                                {pending ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                    '10분 인증'
                                )}
                            </button>
                        </form>
                    )}
                </section>
            )}
        </div>
    );
}
