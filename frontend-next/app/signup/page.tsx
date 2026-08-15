'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, X } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { PASSWORD_RULES } from '@/lib/passwordPolicy';

export default function SignupPage() {
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    const invitationCodeRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const invite = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('invite');
        if (!invite) return;
        if (invitationCodeRef.current) invitationCodeRef.current.value = invite;
        window.history.replaceState({}, '', '/signup');
    }, []);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        if (!PASSWORD_RULES.every((rule) => rule.test(password))) {
            setError('충족하지 않은 비밀번호 조건을 확인해 주세요.');
            return;
        }
        if (password !== passwordConfirmation) {
            setError('비밀번호 확인이 일치하지 않습니다.');
            return;
        }

        setPending(true);
        const data = new FormData(event.currentTarget);
        try {
            await authApi.register({
                invitationCode: String(data.get('invitationCode') ?? ''),
                email: String(data.get('email') ?? ''),
                password,
                nickname: String(data.get('nickname') ?? ''),
                termsAccepted: data.get('termsAccepted') === 'on',
                privacyAccepted: data.get('privacyAccepted') === 'on',
                marketingAccepted: data.get('marketingAccepted') === 'on',
            });
            setSubmitted(true);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : '가입 요청을 처리하지 못했습니다.');
        } finally {
            setPending(false);
        }
    }

    if (submitted) {
        return (
            <AuthCard title="이메일을 확인해 주세요">
                <p className="text-sm leading-6 text-slate-600">
                    계정 존재 여부와 관계없이 가입 가능한 주소라면 확인 메일을 보냈습니다. 메일의
                    링크를 열어 가입을 완료해 주세요.
                </p>
                <Link className="mt-6 inline-flex text-sm font-bold text-indigo-700" href="/login">
                    로그인으로 이동
                </Link>
            </AuthCard>
        );
    }

    return (
        <AuthCard title="비공개 베타 계정 만들기">
            <p className="mt-3 text-sm leading-6 text-slate-500">
                플랫폼 초대 코드로 계정을 만든 뒤 이메일을 확인합니다. 로그인하면 첫 비공개
                Workspace를 만들 수 있습니다.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
                <Field
                    label="초대 코드"
                    name="invitationCode"
                    autoComplete="off"
                    inputRef={invitationCodeRef}
                    required
                />
                <Field label="이메일" name="email" type="email" autoComplete="email" required />
                <Field
                    label="닉네임"
                    name="nickname"
                    autoComplete="nickname"
                    minLength={2}
                    maxLength={40}
                    required
                />
                <PasswordField
                    label="비밀번호"
                    name="password"
                    value={password}
                    onChange={setPassword}
                    visible={showPassword}
                    onToggle={() => setShowPassword((value) => !value)}
                />
                <ul className="grid grid-cols-1 gap-1.5 rounded-md bg-slate-50 p-3 text-xs sm:grid-cols-2">
                    {PASSWORD_RULES.map((rule) => {
                        const passed = rule.test(password);
                        return (
                            <li
                                key={rule.label}
                                className={`flex items-center gap-1.5 font-bold ${passed ? 'text-emerald-700' : 'text-red-600'}`}
                            >
                                {passed ? (
                                    <Check className="h-3.5 w-3.5" />
                                ) : (
                                    <X className="h-3.5 w-3.5" />
                                )}
                                {rule.label}
                            </li>
                        );
                    })}
                </ul>
                <PasswordField
                    label="비밀번호 확인"
                    name="passwordConfirmation"
                    value={passwordConfirmation}
                    onChange={setPasswordConfirmation}
                    visible={showPasswordConfirmation}
                    onToggle={() => setShowPasswordConfirmation((value) => !value)}
                />
                {passwordConfirmation.length > 0 && password !== passwordConfirmation && (
                    <p className="text-xs font-bold text-red-600">비밀번호가 일치하지 않습니다.</p>
                )}
                <Consent
                    name="termsAccepted"
                    label="이용약관에 동의합니다. (필수)"
                    detailHref="/policies/terms"
                    required
                />
                <Consent
                    name="privacyAccepted"
                    label="개인정보 수집·이용에 동의합니다. (필수)"
                    detailHref="/policies/privacy"
                    required
                />
                <Consent
                    name="marketingAccepted"
                    label="마케팅 정보 수신에 동의합니다. (선택)"
                    detailHref="/policies/marketing"
                />
                {error && (
                    <p role="alert" className="text-sm font-bold text-red-600">
                        {error}
                    </p>
                )}
                <button
                    disabled={pending}
                    className="w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                    {pending ? '가입 요청 중...' : '확인 메일 받기'}
                </button>
            </form>
        </AuthCard>
    );
}

function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
            <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-xs font-black text-slate-600 hover:text-slate-950"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    메인으로 돌아가기
                </Link>
                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{title}</h1>
                {children}
            </section>
        </main>
    );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    inputRef?: React.Ref<HTMLInputElement>;
};
function Field({ label, inputRef, ...props }: FieldProps) {
    return (
        <label className="block text-sm font-bold text-slate-700">
            {label}
            <input
                ref={inputRef}
                {...props}
                className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
        </label>
    );
}

function PasswordField({
    label,
    name,
    value,
    visible,
    onChange,
    onToggle,
}: {
    label: string;
    name: string;
    value: string;
    visible: boolean;
    onChange: (value: string) => void;
    onToggle: () => void;
}) {
    return (
        <label className="block text-sm font-bold text-slate-700">
            {label}
            <span className="relative mt-2 block">
                <input
                    type={visible ? 'text' : 'password'}
                    name={name}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    autoComplete="new-password"
                    minLength={10}
                    maxLength={32}
                    required
                    className="w-full rounded-md border border-slate-200 px-4 py-3 pr-12 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                    type="button"
                    onClick={onToggle}
                    aria-label={visible ? `${label} 숨기기` : `${label} 표시`}
                    className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400 hover:text-slate-800"
                >
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </span>
        </label>
    );
}

function Consent({
    name,
    label,
    detailHref,
    required = false,
}: {
    name: string;
    label: string;
    detailHref: string;
    required?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-3 rounded-md border border-slate-200 px-3 py-2.5">
            <label className="flex min-w-0 items-start gap-2 text-sm text-slate-700">
                <input className="mt-1" type="checkbox" name={name} required={required} />
                <span>{label}</span>
            </label>
            <Link
                href={detailHref}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs font-black text-indigo-700 underline underline-offset-2"
            >
                자세히 보기
            </Link>
        </div>
    );
}
