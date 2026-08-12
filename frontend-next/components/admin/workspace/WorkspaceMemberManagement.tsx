'use client';

import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, KeyRound, LoaderCircle, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { ApiError, authApi, workspaceApi, type WorkspaceRole } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

type Props = {
    workspaceSlug: string;
    role: WorkspaceRole;
};

export function WorkspaceMemberManagement({ workspaceSlug, role }: Props) {
    const queryClient = useQueryClient();
    const checkSession = useAuthStore((state) => state.checkSession);
    const management = useQuery({
        queryKey: ['workspace-membership', workspaceSlug],
        queryFn: () => workspaceApi.membership(workspaceSlug),
    });
    const [email, setEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('EDITOR');
    const [password, setPassword] = useState('');
    const [reauthenticated, setReauthenticated] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = () =>
        queryClient.invalidateQueries({ queryKey: ['workspace-membership', workspaceSlug] });

    async function reauthenticate(event: FormEvent) {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
            await authApi.reauthenticate(password);
            setPassword('');
            setReauthenticated(true);
        } catch {
            setReauthenticated(false);
            setError('비밀번호를 다시 확인해 주세요.');
        } finally {
            setPending(false);
        }
    }

    async function mutate(operation: () => Promise<unknown>, success?: () => void) {
        if (!reauthenticated) {
            setError('먼저 비밀번호를 다시 확인해 주세요.');
            return;
        }
        setPending(true);
        setError(null);
        try {
            await operation();
            success?.();
            await Promise.all([refresh(), checkSession()]);
        } catch (cause) {
            if (cause instanceof ApiError && cause.status === 401) setReauthenticated(false);
            setError(cause instanceof Error ? cause.message : '멤버 작업을 완료하지 못했습니다.');
        } finally {
            setPending(false);
        }
    }

    async function invite(event: FormEvent) {
        event.preventDefault();
        await mutate(
            () =>
                workspaceApi.inviteMember(workspaceSlug, {
                    email,
                    role: inviteRole,
                    validForHours: 72,
                }),
            () => setEmail('')
        );
    }

    const assignableRoles: Array<'ADMIN' | 'EDITOR' | 'VIEWER'> =
        role === 'OWNER' ? ['ADMIN', 'EDITOR', 'VIEWER'] : ['EDITOR', 'VIEWER'];

    return (
        <section className="space-y-6">
            <header className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-start gap-3">
                    <span className="rounded-xl bg-indigo-50 p-3 text-indigo-700">
                        <Users className="h-5 w-5" />
                    </span>
                    <div>
                        <span className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
                            Workspace Access
                        </span>
                        <h2 className="mt-2 text-2xl font-black text-slate-950">멤버·역할 관리</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                            플랫폼 가입 초대와 별개인 Workspace 참여 초대입니다. 초대받은 활성
                            계정이 메일 링크를 직접 수락해야 권한이 생깁니다. OWNER 이전은 기존
                            OWNER를 ADMIN으로 변경합니다.
                        </p>
                    </div>
                </div>
                {(error || management.error) && (
                    <p role="alert" className="mt-5 text-sm font-bold text-red-600">
                        {error ??
                            (management.error instanceof Error
                                ? management.error.message
                                : '멤버 정보를 불러오지 못했습니다.')}
                    </p>
                )}
            </header>

            <div className="grid gap-6 xl:grid-cols-2">
                <form onSubmit={reauthenticate} className="rounded-3xl bg-slate-950 p-6 shadow-sm">
                    <div className="flex items-center gap-2 font-black text-white">
                        <KeyRound className="h-4 w-4" /> 중요 작업 재인증
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-300">
                        초대·역할·제거·소유권 변경에는 최근 10분 안의 비밀번호 재확인이 필요합니다.
                    </p>
                    <div className="mt-4 flex gap-2">
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="현재 비밀번호"
                            autoComplete="current-password"
                            required
                            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <button
                            disabled={pending}
                            className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-slate-100 disabled:opacity-50"
                        >
                            {pending ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : reauthenticated ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                '재확인'
                            )}
                        </button>
                    </div>
                </form>

                <form
                    onSubmit={invite}
                    className="rounded-3xl border border-slate-200 bg-white p-6"
                >
                    <div className="flex items-center gap-2 font-black text-slate-950">
                        <UserPlus className="h-4 w-4" /> 활성 계정 초대
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px_auto]">
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="가입이 완료된 이메일"
                            required
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                        />
                        <select
                            value={inviteRole}
                            onChange={(event) =>
                                setInviteRole(event.target.value as 'ADMIN' | 'EDITOR' | 'VIEWER')
                            }
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        >
                            {assignableRoles.map((candidate) => (
                                <option key={candidate}>{candidate}</option>
                            ))}
                        </select>
                        <button
                            disabled={pending || !reauthenticated}
                            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
                        >
                            초대
                        </button>
                    </div>
                </form>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-black text-slate-950">현재 멤버</h3>
                <div className="mt-4 divide-y divide-slate-100">
                    {management.data?.members.map((member) => {
                        const canManageMember =
                            member.role !== 'OWNER' &&
                            (role === 'OWNER' ||
                                (role === 'ADMIN' &&
                                    (member.role === 'EDITOR' || member.role === 'VIEWER')));
                        return (
                            <div key={member.id} className="flex flex-wrap items-center gap-3 py-4">
                                <div className="min-w-48 flex-1">
                                    <p className="font-bold text-slate-900">{member.displayName}</p>
                                    <p className="text-xs text-slate-500">{member.emailMasked}</p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                                    {member.role}
                                </span>
                                {canManageMember && (
                                    <>
                                        <select
                                            value={member.role}
                                            disabled={pending || !reauthenticated}
                                            onChange={(event) =>
                                                mutate(() =>
                                                    workspaceApi.changeMemberRole(
                                                        workspaceSlug,
                                                        member.id,
                                                        event.target.value as
                                                            'ADMIN' | 'EDITOR' | 'VIEWER'
                                                    )
                                                )
                                            }
                                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs disabled:opacity-40"
                                        >
                                            {(role === 'OWNER'
                                                ? ['ADMIN', 'EDITOR', 'VIEWER']
                                                : ['EDITOR', 'VIEWER']
                                            ).map((candidate) => (
                                                <option key={candidate}>{candidate}</option>
                                            ))}
                                        </select>
                                        {role === 'OWNER' && (
                                            <button
                                                type="button"
                                                disabled={pending || !reauthenticated}
                                                onClick={() => {
                                                    if (
                                                        window.confirm(
                                                            `${member.displayName} 님에게 소유권을 이전할까요? 현재 OWNER는 ADMIN이 됩니다.`
                                                        )
                                                    )
                                                        mutate(() =>
                                                            workspaceApi.transferOwnership(
                                                                workspaceSlug,
                                                                member.id
                                                            )
                                                        );
                                                }}
                                                className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 disabled:opacity-40"
                                            >
                                                소유권 이전
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            disabled={pending || !reauthenticated}
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        `${member.displayName} 님을 제거할까요?`
                                                    )
                                                )
                                                    mutate(() =>
                                                        workspaceApi.removeMember(
                                                            workspaceSlug,
                                                            member.id
                                                        )
                                                    );
                                            }}
                                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 disabled:opacity-40"
                                        >
                                            제거
                                        </button>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-black text-slate-950">초대 현황</h3>
                <div className="mt-4 space-y-3">
                    {management.data?.invitations.length ? (
                        management.data.invitations.map((invitation) => (
                            <div
                                key={invitation.id}
                                className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm"
                            >
                                <ShieldCheck className="h-4 w-4 text-slate-500" />
                                <span className="flex-1 font-bold text-slate-800">
                                    {invitation.recipientEmailMasked} · {invitation.role}
                                </span>
                                <span className="text-xs font-black text-slate-500">
                                    {invitation.status}
                                </span>
                                {invitation.status === 'PENDING' && (
                                    <button
                                        type="button"
                                        disabled={pending || !reauthenticated}
                                        onClick={() =>
                                            mutate(() =>
                                                workspaceApi.revokeMemberInvitation(
                                                    workspaceSlug,
                                                    invitation.id
                                                )
                                            )
                                        }
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold disabled:opacity-40"
                                    >
                                        취소
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-slate-500">발급한 Workspace 초대가 없습니다.</p>
                    )}
                </div>
            </section>
        </section>
    );
}
