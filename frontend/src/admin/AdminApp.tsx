import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { AdminLoginPage } from './AdminLoginPage';
import { AdminDashboard } from './AdminDashboard';

export function AdminApp() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isChecking = useAuthStore((s) => s.isChecking);
  const checkSession = useAuthStore((s) => s.checkSession);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (isChecking) {
    return (
      <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <p className="text-sm font-bold text-slate-400">확인 중...</p>
      </main>
    );
  }

  return isAuthenticated ? <AdminDashboard /> : <AdminLoginPage />;
}
