'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isChecking = useAuthStore((s) => s.isChecking);
  const checkSession = useAuthStore((s) => s.checkSession);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (isChecking) return;
    if (!isAuthenticated && pathname !== '/admin/login') {
      router.replace('/admin/login');
    } else if (isAuthenticated && pathname === '/admin/login') {
      router.replace('/admin');
    }
  }, [isChecking, isAuthenticated, pathname, router]);

  if (isChecking) {
    return (
      <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <p className="text-sm font-bold text-slate-400">확인 중...</p>
      </main>
    );
  }

  if (!isAuthenticated && pathname !== '/admin/login') {
    return null;
  }

  if (isAuthenticated && pathname === '/admin/login') {
    return null;
  }

  return <>{children}</>;
}
