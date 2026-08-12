'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MfaEnrollment } from '@/components/admin/security/MfaEnrollment';
import { useAuthStore } from '@/store/useAuthStore';

export default function OpsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isChecking = useAuthStore((state) => state.isChecking);
    const checkSession = useAuthStore((state) => state.checkSession);
    const me = useAuthStore((state) => state.me);

    useEffect(() => {
        if (isChecking) void checkSession();
    }, [checkSession, isChecking]);

    useEffect(() => {
        if (!isChecking && !isAuthenticated) {
            router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
    }, [isAuthenticated, isChecking, pathname, router]);

    if (isChecking || !isAuthenticated) {
        return (
            <main className="grid min-h-screen place-items-center bg-slate-50">
                <p className="text-sm font-bold text-slate-400">운영자 권한 확인 중...</p>
            </main>
        );
    }

    if (me?.mfaEnrollmentRequired) return <MfaEnrollment />;

    if (me?.mfaRecoveryReenrollmentAllowed) return <MfaEnrollment mode="recovery" />;

    const canOperate =
        me?.platformRoles.includes('PLATFORM_OWNER') ||
        me?.platformRoles.includes('PLATFORM_OPERATOR');
    if (!canOperate) {
        return (
            <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
                <section className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <h1 className="text-xl font-black text-slate-950">플랫폼 운영자 전용</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        Workspace 역할과 플랫폼 운영 권한은 분리되어 있습니다.
                    </p>
                    <Link className="mt-6 inline-flex text-sm font-black text-indigo-700" href="/">
                        플랫폼 메인으로 이동
                    </Link>
                </section>
            </main>
        );
    }

    return <>{children}</>;
}
