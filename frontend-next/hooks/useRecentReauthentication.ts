'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export function useRecentReauthentication() {
    const expiresAt = useAuthStore((state) => state.reauthenticationExpiresAt);
    const explicitExpiresAt = useAuthStore((state) => state.explicitReauthenticationExpiresAt);
    const confirm = useAuthStore((state) => state.confirmReauthentication);
    const expire = useAuthStore((state) => state.expireReauthentication);
    const clear = useAuthStore((state) => state.clearReauthentication);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const latestExpiry = Math.max(expiresAt ?? 0, explicitExpiresAt ?? 0);
        if (latestExpiry <= Date.now()) return;
        const timer = window.setInterval(() => setNow(Date.now()), 1_000);
        return () => window.clearInterval(timer);
    }, [expiresAt, explicitExpiresAt]);

    const remainingSeconds = Math.max(0, Math.ceil(((expiresAt ?? 0) - now) / 1_000));
    const explicitRemainingSeconds = Math.max(
        0,
        Math.ceil(((explicitExpiresAt ?? 0) - now) / 1_000)
    );

    return {
        isReauthenticated: remainingSeconds > 0,
        remainingSeconds,
        expiresAt,
        isExplicitlyReauthenticated: explicitRemainingSeconds > 0,
        explicitRemainingSeconds,
        explicitExpiresAt,
        confirm,
        expire,
        clear,
    };
}
