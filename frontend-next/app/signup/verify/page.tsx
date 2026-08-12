import { Suspense } from 'react';
import { VerifyEmailClient } from './verify-email-client';

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<main className="p-10 text-center">확인 중...</main>}>
            <VerifyEmailClient />
        </Suspense>
    );
}
