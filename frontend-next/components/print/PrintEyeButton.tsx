'use client';

import { Pin, PinOff } from 'lucide-react';

/** 호버 시 요소 왼편에 나타나는 핀 고정/제외 토글 버튼 */
export function PrintEyeButton({ id, excluded, onToggle }: { id: string; excluded: boolean; onToggle: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(id);
      }}
      title={excluded ? '핀 고정하여 인쇄 포함' : '핀 해제하여 인쇄 제외'}
      className={`grid h-7 w-7 place-items-center rounded-full shadow-xl transition-all duration-200 ${
        excluded ? 'bg-slate-700/90 text-white hover:bg-slate-800 hover:scale-110' : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-110'
      }`}
    >
      {excluded ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
    </button>
  );
}
