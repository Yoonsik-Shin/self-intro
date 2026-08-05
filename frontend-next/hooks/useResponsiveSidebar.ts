'use client';

import { useEffect, useState } from 'react';

const BREAKPOINT_WIDTH = 1100;

export function useResponsiveSidebar(initialCollapsed = false) {
    const [isNavCollapsed, setIsNavCollapsed] = useState(initialCollapsed);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            if (window.innerWidth < BREAKPOINT_WIDTH) {
                setIsNavCollapsed(true);
            } else {
                setIsNavCollapsed(false);
            }
        };

        // 초기 렌더링 시 브라우저 창 너비에 맞춰 자동 조절
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return [isNavCollapsed, setIsNavCollapsed] as const;
}
