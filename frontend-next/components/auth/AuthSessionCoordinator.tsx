'use client';

import { useEffect, useRef, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { subscribeAuthSessionEvents } from '@/lib/auth/sessionEvents';
import { useAdminPreviewStore } from '@/store/useAdminPreviewStore';
import { useAuthStore } from '@/store/useAuthStore';

const NOTICE_KEY = 'self-intro-auth-session-notice';
const UNINITIALIZED = Symbol('uninitialized-auth-identity');

function clearAccountScopedClientState(queryClient: QueryClient) {
    queryClient.clear();
    const previewStore = useAdminPreviewStore.getState();
    previewStore.setProfileDraft(null);
    previewStore.setSkillDraft(null);
    previewStore.setExperienceDraft(null);
    window.sessionStorage.removeItem('admin-preview-intro-override');
    window.sessionStorage.removeItem('admin-preview-nav');
}

export function AuthSessionCoordinator({ queryClient }: { queryClient: QueryClient }) {
    const me = useAuthStore((state) => state.me);
    const isChecking = useAuthStore((state) => state.isChecking);
    const previousUserId = useRef<number | null | typeof UNINITIALIZED>(UNINITIALIZED);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        const savedNotice = window.sessionStorage.getItem(NOTICE_KEY);
        if (!savedNotice) return;
        window.sessionStorage.removeItem(NOTICE_KEY);
        queueMicrotask(() => setNotice(savedNotice));
    }, []);

    useEffect(() => {
        if (!notice) return;
        const timeoutId = window.setTimeout(() => setNotice(null), 6_000);
        return () => window.clearTimeout(timeoutId);
    }, [notice]);

    useEffect(() => {
        if (isChecking) return;
        const currentUserId = me?.userId ?? null;
        if (previousUserId.current === UNINITIALIZED) {
            previousUserId.current = currentUserId;
            return;
        }
        if (previousUserId.current !== currentUserId) {
            clearAccountScopedClientState(queryClient);
            previousUserId.current = currentUserId;
        }
    }, [isChecking, me?.userId, queryClient]);

    useEffect(
        () =>
            subscribeAuthSessionEvents((event) => {
                clearAccountScopedClientState(queryClient);
                const message =
                    event.type === 'AUTHENTICATED'
                        ? '다른 탭에서 로그인 계정이 변경되어 안전한 화면으로 이동했습니다.'
                        : '다른 탭에서 로그아웃되어 현재 세션을 다시 확인합니다.';
                window.sessionStorage.setItem(NOTICE_KEY, message);
                // 계정 A의 컴포넌트 로컬 폼 상태까지 제거하기 위해 전체 문서를 다시 연다.
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.assign('/');
            }),
        [queryClient]
    );

    if (!notice) return null;
    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed left-1/2 top-4 z-[200] flex w-[min(92vw,640px)] -translate-x-1/2 items-center gap-3 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-2xl"
        >
            <span className="min-w-0 flex-1">{notice}</span>
            <button
                type="button"
                aria-label="계정 변경 안내 닫기"
                onClick={() => setNotice(null)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
