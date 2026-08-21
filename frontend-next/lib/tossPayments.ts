'use client';

declare global {
    interface Window {
        TossPayments?: (clientKey: string) => {
            payment: (options: { customerKey: string }) => {
                requestBillingAuth: (options: {
                    method: 'CARD';
                    successUrl: string;
                    failUrl: string;
                    customerEmail?: string;
                    customerName?: string;
                }) => Promise<void>;
            };
        };
    }
}

let scriptPromise: Promise<void> | null = null;

export function loadTossPayments() {
    if (typeof window === 'undefined')
        return Promise.reject(new Error('브라우저에서만 실행할 수 있습니다.'));
    if (window.TossPayments) return Promise.resolve();
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://js.tosspayments.com/v2/standard';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('결제창을 불러오지 못했습니다.'));
        document.head.appendChild(script);
    });
    return scriptPromise;
}
