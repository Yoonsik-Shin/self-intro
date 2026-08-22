'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function AdminRedirectPage() {
    const router = useRouter();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isChecking = useAuthStore((state) => state.isChecking);
    const checkSession = useAuthStore((state) => state.checkSession);
    const me = useAuthStore((state) => state.me);

    useEffect(() => {
        if (isChecking) {
            void checkSession();
            return;
        }

        if (!isAuthenticated) {
            router.replace('/login?next=/admin');
            return;
        }

        const workspace = me?.workspaces?.[0];
        if (workspace?.slug) {
            router.replace(
                `/workspace/${encodeURIComponent(workspace.slug)}/manage?tab=WORKSPACE_HOME`
            );
        } else if (me?.platformRoles?.length) {
            router.replace('/ops');
        } else {
            router.replace('/onboarding/workspace');
        }
    }, [checkSession, isAuthenticated, isChecking, me, router]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
            <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
                <p className="text-sm font-bold">내 Workspace로 이동 중…</p>
            </div>
        </main>
    );
}
