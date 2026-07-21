'use client';

import { useRouter } from 'next/navigation';
import type { IntroductionResponse } from '@/lib/api/types';
import { PrintCanvas } from './PrintCanvas';

export function PrintPageClient({ introData }: { introData: IntroductionResponse }) {
    const router = useRouter();
    return <PrintCanvas introData={introData} onExit={() => router.push('/')} />;
}
