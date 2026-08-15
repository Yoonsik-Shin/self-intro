'use client';

import type { ReactNode } from 'react';
import { Eye, LoaderCircle } from 'lucide-react';

export function PublicDraftPreviewLoading({ label }: { label: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center gap-2 bg-slate-50 text-sm font-bold text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin" /> {label} 초안을 불러오는 중입니다.
        </div>
    );
}

export function PublicDraftPreviewError({ label }: { label: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center text-sm font-bold text-red-600">
            {label} 초안을 불러올 수 없습니다. Workspace 접근 권한과 저장 상태를 확인해 주세요.
        </div>
    );
}

export function PublicDraftPreviewFrame({ children }: { children: ReactNode }) {
    return (
        <main className="min-h-screen bg-slate-50">
            <div className="sticky top-0 z-[70] flex items-center justify-center gap-2 border-b border-indigo-200 bg-indigo-950 px-4 py-2 text-xs font-bold text-white shadow-sm">
                <Eye className="h-3.5 w-3.5" /> 저장된 공개 초안 미리보기 · 방문자에게 공개되지
                않습니다.
            </div>
            {children}
        </main>
    );
}
