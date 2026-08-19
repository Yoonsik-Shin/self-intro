import Link from 'next/link';
import { Lock, Home, LayoutDashboard } from 'lucide-react';

export default function WorkspaceNotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 text-slate-800">
            <div className="w-full max-w-lg text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 shadow-xs ring-8 ring-amber-50/50">
                    <Lock className="h-10 w-10" />
                </div>

                <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-black tracking-wider text-amber-800 uppercase">
                    비공개 또는 미발행 상태
                </span>

                <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                    공개되지 않은 Workspace입니다
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                    해당 Workspace가 아직 발행되지 않았거나, 비공개로 설정되어 외부 방문자가 열람할
                    수 없습니다.
                    <br />
                    Workspace의 소유자 또는 멤버이신 경우 로그인 후 관리 화면에서 확인할 수
                    있습니다.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900"
                    >
                        <Home className="h-4 w-4" />
                        플랫폼 홈으로 이동
                    </Link>
                    <Link
                        href="/admin"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                    >
                        <LayoutDashboard className="h-4 w-4" />내 Workspace 관리 화면으로 이동
                    </Link>
                </div>
            </div>
        </main>
    );
}
