import Link from 'next/link';
import { Home, LayoutDashboard, Compass } from 'lucide-react';

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 text-slate-800">
            <div className="w-full max-w-md text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 shadow-xs ring-8 ring-indigo-50/50">
                    <Compass className="h-10 w-10 animate-pulse" />
                </div>

                <span className="inline-block rounded-full bg-slate-200/70 px-3 py-1 text-xs font-black tracking-wider text-slate-600 uppercase">
                    404 Not Found
                </span>

                <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                    페이지를 찾을 수 없습니다
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                    요청하신 주소가 잘못되었거나, 비공개 상태 또는 삭제된 페이지일 수 있습니다.
                    입력하신 주소를 다시 확인해 주세요.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                    >
                        <Home className="h-4 w-4" />
                        홈으로 이동
                    </Link>
                    <Link
                        href="/admin"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900"
                    >
                        <LayoutDashboard className="h-4 w-4" />내 워크스페이스 관리
                    </Link>
                </div>
            </div>
        </main>
    );
}
