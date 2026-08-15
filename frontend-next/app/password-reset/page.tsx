'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Check, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authApi } from '@/lib/api/auth';
import { PASSWORD_RULES } from '@/lib/passwordPolicy';

function readTokenFromHash(): string {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    return new URLSearchParams(hash).get('token')?.trim() ?? '';
}

export default function PasswordResetPage() {
    const [token, setToken] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmationVisible, setConfirmationVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [requested, setRequested] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => setToken(readTokenFromHash()), 0);
        return () => window.clearTimeout(timeoutId);
    }, []);

    const allRulesSatisfied = useMemo(
        () => PASSWORD_RULES.every((rule) => rule.test(newPassword)),
        [newPassword]
    );

    const requestReset = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await authApi.requestPasswordReset(email);
            setRequested(true);
            setEmail('');
        } catch (caught) {
            setError(
                caught instanceof ApiError && caught.status === 503
                    ? '현재 비밀번호 재설정 메일을 보낼 수 없습니다. 잠시 후 다시 시도해 주세요.'
                    : '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const confirmReset = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!token || !allRulesSatisfied || newPassword !== passwordConfirmation) return;
        setError(null);
        setSubmitting(true);
        try {
            await authApi.confirmPasswordReset(token, newPassword);
            window.history.replaceState(null, '', '/password-reset');
            setToken('');
            setNewPassword('');
            setPasswordConfirmation('');
            setCompleted(true);
        } catch (caught) {
            setError(
                caught instanceof ApiError && caught.message
                    ? caught.message
                    : '만료되었거나 유효하지 않은 재설정 링크입니다.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (token === null) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
                <p className="text-sm font-bold text-slate-400">재설정 링크 확인 중...</p>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
            <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)]">
                <div className="mb-6 flex items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-slate-950 text-white">
                        {completed ? (
                            <ShieldCheck className="h-5 w-5" />
                        ) : token ? (
                            <KeyRound className="h-5 w-5" />
                        ) : (
                            <Mail className="h-5 w-5" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-950">비밀번호 재설정</h1>
                        <p className="text-xs font-semibold text-slate-500">
                            {token
                                ? '새 비밀번호를 등록합니다.'
                                : '가입한 이메일로 전용 링크를 보냅니다.'}
                        </p>
                    </div>
                </div>

                {completed ? (
                    <div className="space-y-5">
                        <div className="rounded-md bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                            비밀번호가 변경됐고 기존 로그인 세션은 모두 종료됐습니다.
                        </div>
                        <Link
                            href="/login"
                            className="block w-full rounded-md bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white hover:bg-slate-800"
                        >
                            새 비밀번호로 로그인
                        </Link>
                    </div>
                ) : token ? (
                    <form className="space-y-4" onSubmit={confirmReset}>
                        <PasswordField
                            label="새 비밀번호"
                            value={newPassword}
                            visible={passwordVisible}
                            onChange={setNewPassword}
                            onToggle={() => setPasswordVisible((current) => !current)}
                            autoComplete="new-password"
                        />
                        <PasswordField
                            label="새 비밀번호 확인"
                            value={passwordConfirmation}
                            visible={confirmationVisible}
                            onChange={setPasswordConfirmation}
                            onToggle={() => setConfirmationVisible((current) => !current)}
                            autoComplete="new-password"
                        />
                        <ul className="grid gap-1.5 rounded-md bg-slate-50 p-4 text-xs font-semibold">
                            {PASSWORD_RULES.map((rule) => {
                                const satisfied = rule.test(newPassword);
                                return (
                                    <li
                                        key={rule.label}
                                        className={satisfied ? 'text-emerald-700' : 'text-red-600'}
                                    >
                                        <Check className="mr-1.5 inline h-3.5 w-3.5" />
                                        {rule.label}
                                    </li>
                                );
                            })}
                        </ul>
                        {passwordConfirmation && newPassword !== passwordConfirmation && (
                            <p className="text-xs font-bold text-red-600">
                                비밀번호 확인이 일치하지 않습니다.
                            </p>
                        )}
                        {error && <p className="text-xs font-bold text-red-600">{error}</p>}
                        <button
                            type="submit"
                            disabled={
                                submitting ||
                                !allRulesSatisfied ||
                                newPassword !== passwordConfirmation
                            }
                            className="w-full rounded-md bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {submitting ? '변경 중...' : '비밀번호 변경'}
                        </button>
                    </form>
                ) : requested ? (
                    <div className="space-y-5">
                        <div className="rounded-md bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                            계정이 존재하고 메일 전송이 가능하면 재설정 링크를 보냈습니다. 링크는
                            30분 동안 사용할 수 있습니다.
                        </div>
                        <button
                            type="button"
                            onClick={() => setRequested(false)}
                            className="w-full rounded-md border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                            다른 이메일로 다시 요청
                        </button>
                    </div>
                ) : (
                    <form className="space-y-4" onSubmit={requestReset}>
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                                가입 이메일
                            </label>
                            <input
                                type="email"
                                required
                                autoFocus
                                autoComplete="email"
                                maxLength={255}
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="w-full rounded-md border border-slate-200 px-4 py-3 text-sm focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <p className="text-xs leading-5 text-slate-500">
                            계정 존재 여부는 화면에 표시하지 않습니다. 요청하지 않은 메일은 무시해도
                            됩니다.
                        </p>
                        {error && <p className="text-xs font-bold text-red-600">{error}</p>}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-md bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-40"
                        >
                            {submitting ? '요청 중...' : '재설정 링크 받기'}
                        </button>
                    </form>
                )}

                {!completed && (
                    <Link
                        href="/login"
                        className="mt-6 block text-center text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                        로그인으로 돌아가기
                    </Link>
                )}
            </section>
        </main>
    );
}

function PasswordField({
    label,
    value,
    visible,
    onChange,
    onToggle,
    autoComplete,
}: {
    label: string;
    value: string;
    visible: boolean;
    onChange: (value: string) => void;
    onToggle: () => void;
    autoComplete: string;
}) {
    return (
        <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                {label}
            </label>
            <div className="relative">
                <input
                    type={visible ? 'text' : 'password'}
                    required
                    maxLength={32}
                    autoComplete={autoComplete}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="w-full rounded-md border border-slate-200 px-4 py-3 pr-11 text-sm focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
                <button
                    type="button"
                    onClick={onToggle}
                    aria-label={visible ? `${label} 숨기기` : `${label} 표시`}
                    className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-700"
                >
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
}
