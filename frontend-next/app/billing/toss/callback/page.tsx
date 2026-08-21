'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { billingApi } from '@/lib/api';

export default function TossBillingCallbackPage() {
    return (
        <Suspense fallback={<BillingMessage message="결제수단 인증 결과를 확인하고 있습니다…" />}>
            <TossBillingCallbackContent />
        </Suspense>
    );
}

function TossBillingCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestStarted = useRef(false);
    const [message, setMessage] = useState('결제수단을 안전하게 등록하고 있습니다…');
    const workspaceSlug = searchParams.get('workspaceSlug');
    const authKey = searchParams.get('authKey');
    const customerKey = searchParams.get('customerKey');
    const validCallback = Boolean(workspaceSlug && authKey && customerKey);

    useEffect(() => {
        if (!workspaceSlug || !authKey || !customerKey) {
            return;
        }
        if (requestStarted.current) return;
        requestStarted.current = true;
        void billingApi
            .confirmPaymentMethod(workspaceSlug, authKey, customerKey)
            .then(() => {
                router.replace(
                    `/workspace/${encodeURIComponent(workspaceSlug)}/manage?tab=BILLING&billingMethod=registered`
                );
            })
            .catch((error: unknown) => {
                setMessage(
                    error instanceof Error ? error.message : '결제수단을 등록하지 못했습니다.'
                );
            });
    }, [authKey, customerKey, router, workspaceSlug]);

    return (
        <BillingMessage
            message={validCallback ? message : '결제수단 인증 결과가 올바르지 않습니다.'}
        />
    );
}

function BillingMessage({ message }: { message: string }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
            <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
                <h1 className="text-lg font-bold text-slate-950">결제수단 등록</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
            </section>
        </main>
    );
}
