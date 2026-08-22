'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { MfaEnrollment } from '@/components/admin/security/MfaEnrollment';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isChecking = useAuthStore((s) => s.isChecking);
    const checkSession = useAuthStore((s) => s.checkSession);
    const me = useAuthStore((s) => s.me);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    useEffect(() => {
        if (isChecking) return;
        if (!isAuthenticated) {
            router.replace('/login');
        } else if (isAuthenticated && pathname === '/admin') {
            const workspace = me?.workspaces?.[0];
            if (workspace) {
                const requestedNext = new URLSearchParams(window.location.search).get('next');
                router.replace(
                    requestedNext?.startsWith('/') && !requestedNext.startsWith('//')
                        ? requestedNext
                        : `/workspace/${encodeURIComponent(workspace.slug)}/manage?tab=WORKSPACE_HOME`
                );
            } else if (me) {
                router.replace(me.platformRoles.length > 0 ? '/ops' : '/onboarding/workspace');
            }
        }
    }, [isChecking, isAuthenticated, me, pathname, router]);

    if (isChecking) {
        return (
            <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
                <p className="text-sm font-bold text-slate-400">확인 중...</p>
            </main>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    if (isAuthenticated && pathname === '/admin') {
        return null;
    }

    if (isAuthenticated && me?.mfaEnrollmentRequired) {
        return <MfaEnrollment />;
    }

    if (isAuthenticated && me?.mfaRecoveryReenrollmentAllowed) {
        return <MfaEnrollment mode="recovery" />;
    }

    return <>{children}</>;
}
