'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminDashboardShell } from './AdminDashboardShell';
import { MfaEnrollment } from './security/MfaEnrollment';
import { useAuthStore } from '@/store/useAuthStore';
import { workspaceApi } from '@/lib/api';

export function WorkspaceAdminGate({ workspaceSlug }: { workspaceSlug: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isChecking = useAuthStore((state) => state.isChecking);
    const me = useAuthStore((state) => state.me);
    const checkSession = useAuthStore((state) => state.checkSession);
    const [aliasResolution, setAliasResolution] = useState<'idle' | 'checking' | 'failed'>('idle');

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    useEffect(() => {
        const checkActiveSession = () => void checkSession();
        const checkVisibleSession = () => {
            if (document.visibilityState === 'visible') checkActiveSession();
        };
        window.addEventListener('focus', checkActiveSession);
        document.addEventListener('visibilitychange', checkVisibleSession);
        return () => {
            window.removeEventListener('focus', checkActiveSession);
            document.removeEventListener('visibilitychange', checkVisibleSession);
        };
    }, [checkSession]);

    useEffect(() => {
        if (!isChecking && !isAuthenticated) {
            const query = searchParams.toString();
            const next = `/workspace/${workspaceSlug}/manage${query ? `?${query}` : ''}`;
            router.replace(`/login?next=${encodeURIComponent(next)}`);
        }
    }, [isAuthenticated, isChecking, router, searchParams, workspaceSlug]);

    const membership = me?.workspaces.find((workspace) => workspace.slug === workspaceSlug);

    useEffect(() => {
        if (isChecking || !isAuthenticated || !me || membership || aliasResolution !== 'idle') {
            return;
        }
        if (me.workspaces.length === 0 && me.platformRoles.length === 0) {
            router.replace('/onboarding/workspace');
            return;
        }
        let active = true;
        queueMicrotask(() => {
            if (active) setAliasResolution('checking');
        });
        void workspaceApi
            .resolveSlug(workspaceSlug)
            .then((resolution) => {
                if (!active) return;
                const query = searchParams.toString();
                router.replace(
                    `/workspace/${encodeURIComponent(resolution.canonicalSlug)}/manage${query ? `?${query}` : ''}`
                );
            })
            .catch(() => {
                if (active) setAliasResolution('failed');
            });
        return () => {
            active = false;
        };
    }, [
        aliasResolution,
        isAuthenticated,
        isChecking,
        me,
        membership,
        router,
        searchParams,
        workspaceSlug,
    ]);

    if (
        isChecking ||
        !isAuthenticated ||
        aliasResolution === 'checking' ||
        Boolean(me && me.workspaces.length === 0 && me.platformRoles.length === 0)
    ) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50">
                <p className="text-sm font-bold text-slate-400">Workspace 확인 중...</p>
            </main>
        );
    }

    if (me?.mfaEnrollmentRequired) {
        return <MfaEnrollment />;
    }

    if (me?.mfaRecoveryReenrollmentAllowed) {
        return <MfaEnrollment mode="recovery" />;
    }

    const canManageWorkspace = membership && ['OWNER', 'ADMIN', 'EDITOR'].includes(membership.role);
    if (!canManageWorkspace) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
                <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <h1 className="text-lg font-black text-slate-900">
                        접근할 수 없는 Workspace입니다
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        관리 권한이 있는 활성 Membership이 없거나 Workspace 주소가 올바르지
                        않습니다.
                    </p>
                    <Link
                        href="/"
                        className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                    >
                        플랫폼 메인으로 이동
                    </Link>
                </section>
            </main>
        );
    }

    return <AdminDashboardShell workspaceSlug={workspaceSlug} />;
}
