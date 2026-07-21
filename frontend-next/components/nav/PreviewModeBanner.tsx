'use client';

import { useEffect, useState } from 'react';

export function PreviewModeBanner() {
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    setIsPreviewMode(new URLSearchParams(window.location.search).get('preview') === '1');
  }, []);

  if (!isPreviewMode) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-1.5 text-xs font-black text-amber-950 print:hidden">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-900" />
      미리보기 모드 · 저장되지 않은 변경사항을 표시하고 있습니다
    </div>
  );
}
