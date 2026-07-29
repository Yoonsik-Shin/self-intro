'use client';

import { useEffect, useState } from 'react';

/**
 * 오른쪽에서 슬라이드 인/아웃되는 드로어의 마운트/트랜지션 타이밍을 관리한다.
 * `shouldRender`는 닫힘 애니메이션(300ms)이 끝날 때까지 true를 유지해 DOM이
 * 바로 사라지지 않게 하고, `isVisible`은 실제 translate/opacity 클래스를 트리거한다.
 */
export function useSlideDrawer(open: boolean) {
    const [shouldRender, setShouldRender] = useState(open);
    const [enterCompleted, setEnterCompleted] = useState(false);

    if (open && !shouldRender) {
        setShouldRender(true);
        setEnterCompleted(false);
    }

    useEffect(() => {
        if (!open) {
            const timeout = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(timeout);
        }
        const raf = requestAnimationFrame(() => setEnterCompleted(true));
        return () => cancelAnimationFrame(raf);
    }, [open]);

    return { shouldRender, isVisible: open && enterCompleted };
}
