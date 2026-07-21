'use client';

import { useEffect } from 'react';
import { scrollToSection } from '@/lib/scroll';

// 관리자 라이브 프리뷰(iframe, `?preview=1`)가 sessionStorage(admin-preview-nav)에 기록한
// 목표 섹션으로 스크롤 이동시킨다. 데이터 오버라이드가 필요 없는 정적 페이지(architecture, study
// 목록)에서 사용 — 초안 데이터 반영이 필요한 홈페이지는 IntroPageClient가 자체적으로 처리한다.
export function PreviewScrollListener() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('preview') !== '1') return;

    const goToSection = () => {
      try {
        const raw = sessionStorage.getItem('admin-preview-nav');
        const nav = raw ? (JSON.parse(raw) as { section?: string }) : null;
        if (nav?.section) requestAnimationFrame(() => requestAnimationFrame(() => scrollToSection(nav.section!)));
      } catch {
        // 잘못된 payload는 무시
      }
    };
    goToSection();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'admin-preview-nav') goToSection();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return null;
}
