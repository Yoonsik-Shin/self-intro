'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import {
    Check,
    Clipboard,
    Download,
    Eye,
    EyeOff,
    KeyRound,
    LogOut,
    RefreshCw,
    ShieldCheck,
} from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { publishAuthSessionEvent } from '@/lib/auth/sessionEvents';
import { useAuthStore } from '@/store/useAuthStore';

type Enrollment = { secret: string; otpauthUri: string };

export function MfaEnrollment({ mode = 'initial' }: { mode?: 'initial' | 'recovery' }) {
    const router = useRouter();
    const isRecovery = mode === 'recovery';
    const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
    const [recoveryCodesSaved, setRecoveryCodesSaved] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [reauthenticated, setReauthenticated] = useState(!isRecovery);
    const setUnauthenticated = useAuthStore((state) => state.setUnauthenticated);

    const begin = async () => {
        setBusy(true);
        setError(null);
        setCopied(false);
        try {
            const nextEnrollment = isRecovery
                ? await authApi.beginMfaRecoveryEnrollment()
                : await authApi.beginMfaEnrollment();
            const nextQrCode = await QRCode.toDataURL(nextEnrollment.otpauthUri, {
                width: 220,
                margin: 1,
                errorCorrectionLevel: 'M',
            });
            setEnrollment(nextEnrollment);
            setQrCode(nextQrCode);
        } catch {
            setError(
                isRecovery
                    ? '복구 세션이 만료되었거나 새 MFA 등록을 시작하지 못했습니다. 다시 로그인해 주세요.'
                    : 'MFA 등록을 시작하지 못했습니다. 운영 암호화 키 설정을 확인해 주세요.'
            );
        } finally {
            setBusy(false);
        }
    };

    const reauthenticate = async () => {
        setBusy(true);
        setError(null);
        try {
            await authApi.reauthenticate(password);
            setReauthenticated(true);
            setPassword('');
        } catch {
            setError('현재 계정의 비밀번호를 다시 확인해 주세요.');
        } finally {
            setBusy(false);
        }
    };

    const copySecret = async () => {
        if (!enrollment) return;
        await navigator.clipboard.writeText(enrollment.secret);
        setCopied(true);
    };

    const confirm = async () => {
        setBusy(true);
        setError(null);
        try {
            const result = isRecovery
                ? await authApi.confirmMfaRecoveryEnrollment(code)
                : await authApi.confirmMfaEnrollment(code);
            setRecoveryCodes(result.codes);
        } catch {
            setError('인증코드가 올바르지 않거나 만료되었습니다.');
        } finally {
            setBusy(false);
        }
    };

    const downloadRecoveryCodes = () => {
        if (!recoveryCodes) return;
        const blob = new Blob(
            [
                `Self-Intro MFA 복구 코드\n\n${recoveryCodes.join('\n')}\n\n각 코드는 한 번만 사용할 수 있습니다.\n`,
            ],
            { type: 'text/plain;charset=utf-8' }
        );
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'self-intro-mfa-recovery-codes.txt';
        anchor.click();
        URL.revokeObjectURL(url);
        setRecoveryCodesSaved(true);
    };

    const finish = () => {
        setUnauthenticated();
        publishAuthSessionEvent('UNAUTHENTICATED');
        router.replace('/login?next=/ops');
        router.refresh();
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } finally {
            finish();
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-white">
                        <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div>
                        <h1 className="text-lg font-black text-slate-900">
                            {isRecovery ? '운영자 MFA 복구' : '운영자 MFA 등록'}
                        </h1>
                        <p className="text-sm text-slate-500">
                            {isRecovery
                                ? '복구 코드로 로그인했습니다. 새 인증 앱을 연결해야 계속할 수 있습니다.'
                                : '플랫폼 기능을 열기 전에 인증 앱을 연결해야 합니다.'}
                        </p>
                    </div>
                </div>

                {recoveryCodes ? (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                            <h2 className="font-black text-red-900">복구 코드를 지금 저장하세요</h2>
                            <p className="mt-1 text-xs leading-5 text-red-700">
                                이 화면을 닫으면 다시 볼 수 없습니다. 각 코드는 인증 앱을 사용할 수
                                없을 때 한 번만 사용할 수 있습니다.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-950 p-4 font-mono text-sm font-bold text-white">
                            {recoveryCodes.map((recoveryCode) => (
                                <code key={recoveryCode}>{recoveryCode}</code>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={downloadRecoveryCodes}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800"
                        >
                            <Download className="h-4 w-4" /> 텍스트 파일로 저장
                        </button>
                        <label className="flex items-start gap-2 text-sm font-bold text-slate-700">
                            <input
                                type="checkbox"
                                checked={recoveryCodesSaved}
                                onChange={(event) => setRecoveryCodesSaved(event.target.checked)}
                                className="mt-1"
                            />
                            복구 코드를 안전한 장소에 저장했습니다.
                        </label>
                        <button
                            type="button"
                            disabled={!recoveryCodesSaved}
                            onClick={finish}
                            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
                        >
                            등록 완료하고 다시 로그인
                        </button>
                    </div>
                ) : !reauthenticated ? (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <h2 className="font-black text-slate-900">1. 비밀번호 재확인</h2>
                            <p className="mt-1 text-xs leading-5 text-slate-600">
                                복구 코드만 탈취한 사람의 MFA 교체를 막기 위해 현재 비밀번호를 다시
                                확인합니다. 기존 인증 키는 새 코드 검증이 끝날 때까지 유지됩니다.
                            </p>
                        </div>
                        <div className="relative">
                            <input
                                aria-label="현재 비밀번호"
                                type={passwordVisible ? 'text' : 'password'}
                                autoComplete="current-password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && password) void reauthenticate();
                                }}
                                placeholder="현재 비밀번호"
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none focus:border-slate-900"
                            />
                            <button
                                type="button"
                                onClick={() => setPasswordVisible((visible) => !visible)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                                aria-label={passwordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
                            >
                                {passwordVisible ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        <button
                            type="button"
                            disabled={busy || !password}
                            onClick={reauthenticate}
                            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                        >
                            {busy ? '확인 중...' : '비밀번호 확인'}
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={logout}
                            className="flex w-full items-center justify-center gap-2 text-sm font-bold text-red-600"
                        >
                            <LogOut className="h-4 w-4" /> 로그아웃
                        </button>
                    </div>
                ) : !enrollment ? (
                    <div>
                        <ol className="mb-5 space-y-2 text-sm leading-6 text-slate-600">
                            <li>
                                <strong className="text-slate-900">
                                    {isRecovery ? '2.' : '1.'}
                                </strong>{' '}
                                휴대폰에 인증 앱을 준비합니다.
                            </li>
                            <li>
                                <strong className="text-slate-900">
                                    {isRecovery ? '3.' : '2.'}
                                </strong>{' '}
                                아래 버튼을 누르고 QR 코드를 스캔합니다.
                            </li>
                            <li>
                                <strong className="text-slate-900">
                                    {isRecovery ? '4.' : '3.'}
                                </strong>{' '}
                                앱에 표시된 6자리 코드를 입력합니다.
                            </li>
                        </ol>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={begin}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                        >
                            <KeyRound className="h-4 w-4" />
                            {busy ? '설정 준비 중...' : 'QR 코드 만들기'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                            <p className="mb-3 text-sm font-black text-slate-900">
                                {isRecovery ? '3.' : '1.'} 인증 앱으로 QR 코드를 스캔하세요
                            </p>
                            {qrCode && (
                                <Image
                                    src={qrCode}
                                    alt="Self-Intro 운영자 MFA 등록 QR 코드"
                                    width={220}
                                    height={220}
                                    unoptimized
                                    className="mx-auto rounded-xl bg-white p-2"
                                />
                            )}
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="mb-2 text-xs font-bold text-slate-500">
                                QR 스캔이 어렵다면 설정 키를 수동 입력하세요.
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="min-w-0 flex-1 break-all text-sm font-black text-slate-900">
                                    {enrollment.secret}
                                </code>
                                <button
                                    type="button"
                                    onClick={copySecret}
                                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600"
                                    aria-label="MFA 설정 키 복사"
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <Clipboard className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <p className="text-sm font-black text-slate-900">
                            {isRecovery ? '4.' : '2.'} 인증 앱의 6자리 코드를 입력하세요
                        </p>
                        <input
                            aria-label="6자리 MFA 인증코드"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={code}
                            onChange={(event) =>
                                setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                            }
                            placeholder="인증 앱의 6자리 코드"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
                        />
                        <button
                            type="button"
                            disabled={busy || code.length !== 6}
                            onClick={confirm}
                            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                        >
                            {isRecovery ? '5.' : '3.'} 등록 완료하고 다시 로그인
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={begin}
                            className="flex w-full items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-50"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            노출되거나 잘못 등록한 설정 키 새로 만들기
                        </button>
                        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                            설정 키와 QR 코드는 비밀번호와 같습니다. 화면 캡처나 메시지로 공유하지
                            마세요.
                        </p>
                    </div>
                )}
                {error && <p className="mt-4 text-sm font-bold text-red-600">{error}</p>}
            </section>
        </main>
    );
}
