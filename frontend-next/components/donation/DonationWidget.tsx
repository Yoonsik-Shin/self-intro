'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { donationApi } from '@/lib/api';
import { DonationModal } from './DonationModal';

export function DonationWidget() {
    const [isDonationOpen, setDonationOpen] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    useEffect(() => {
        setIsPreviewMode(new URLSearchParams(window.location.search).get('preview') === '1');
    }, []);

    const { data: donationConfig } = useQuery({
        queryKey: ['donationConfig'],
        queryFn: donationApi.config,
        enabled: !isPreviewMode,
    });
    const isDonationEnabled = donationConfig?.enabled === true;

    if (!isDonationEnabled) return null;

    return (
        <>
            <button
                onClick={() => setDonationOpen(true)}
                className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700 hover:shadow-xl print:hidden"
                title="후원하기"
            >
                <Heart className="h-4 w-4" />
                <span>후원하기</span>
            </button>
            {isDonationOpen && <DonationModal onClose={() => setDonationOpen(false)} />}
        </>
    );
}
