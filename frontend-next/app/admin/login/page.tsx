'use client';

import { useState, type FormEvent } from 'react';
import { Home, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export default function AdminLoginPage() {
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-slate-900 to-slate-950 text-white shadow-md shadow-slate-800/20">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">관리자 로그인</h1>
            <p className="text-xs text-slate-400 font-semibold">콘텐츠 관리 화면입니다</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">아이디</label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">비밀번호</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
            />
          </div>

          {error && <p className="text-xs font-bold text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-md shadow-slate-800/20"
          >
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <a href="/" className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition">
          <Home className="h-3.5 w-3.5" />
          메인페이지로 돌아가기
        </a>
      </div>
    </main>
  );
}
