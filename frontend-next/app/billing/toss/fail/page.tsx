'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

export default function TossBillingFailPage() {
    return (
        <Suspense fallback={null}>
            <TossBillingFailContent />
        </Suspense>
    );
}

function TossBillingFailContent() {
    const searchParams = useSearchParams();
    const workspaceSlug = searchParams.get('workspaceSlug') ?? '';
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
            <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
                <h1 className="text-lg font-bold text-slate-950">
                    카드 등록을 완료하지 못했습니다
                </h1>
                <p className="mt-3 text-sm text-slate-600">
                    다시 시도해 주세요. 카드 정보는 저장되지 않았습니다.
                </p>
                <Link
                    href={`/workspace/${encodeURIComponent(workspaceSlug)}/manage?tab=BILLING`}
                    className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-slate-950 px-4 text-sm font-bold text-white"
                >
                    요금제 화면으로 돌아가기
                </Link>
            </section>
        </main>
    );
}
