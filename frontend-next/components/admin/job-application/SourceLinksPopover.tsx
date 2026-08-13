'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { JobPostingPlatform, JobPostingSourceUrl } from '@/lib/api/types';

const PLATFORM_LABELS: Record<JobPostingPlatform, string> = {
    WANTED: '원티드',
    JOBKOREA: '잡코리아',
    SARAMIN: '사람인',
    GREETINGHR: '그리팅',
    OTHER: '기타',
};

type SourceLinksPopoverProps = {
    sourceUrls: JobPostingSourceUrl[];
    label: string;
    className?: string;
};

/** 같은 공고에 여러 플랫폼 URL이 등록된 경우, 클릭하면 항상 전체 목록을 보여주고 그중 하나를 선택해 이동하게 한다. */
export function SourceLinksPopover({ sourceUrls, label, className }: SourceLinksPopoverProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handlePointerDown(event: MouseEvent) {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    if (sourceUrls.length === 0) {
        return null;
    }

    const sorted = [...sourceUrls].sort((a, b) => Number(b.primary) - Number(a.primary));

    return (
        <div ref={containerRef} className="relative min-w-0">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                title="이 공고에 등록된 원본 링크 목록을 봅니다"
                className={
                    className ??
                    'flex w-full min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 px-1 py-2 text-slate-500 transition hover:bg-slate-100'
                }
            >
                <ExternalLink className="h-4 w-4" />
                <span className="whitespace-nowrap text-[10px] font-bold">{label}</span>
            </button>
            {open && (
                // 이 컴포넌트는 화면 하단에 고정된(overflow-hidden) 드로어 푸터의, 여러 칸짜리 grid 안
                // 좁은 셀 하나에 들어간다. right-0으로 이 좁은 셀 기준 오른쪽 정렬하면 팝오버(w-64)가
                // 드로어 왼쪽 경계 밖으로 밀려나 overflow-hidden에 잘린다(2026-08-04) — 셀 중앙 기준으로
                // 펼쳐서 어느 칸에 있어도 드로어 폭 안에 들어오게 한다.
                <div className="absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-950 p-1.5 text-white shadow-2xl shadow-slate-950/30 ring-1 ring-black/5">
                    {sorted.map((entry) => (
                        <a
                            key={entry.id}
                            href={entry.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => setOpen(false)}
                            className="flex flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-800"
                        >
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                                {PLATFORM_LABELS[entry.platform]}
                                {entry.primary && (
                                    <span className="rounded bg-slate-800 px-1 py-0.5 text-[9px] font-bold text-slate-300">
                                        대표
                                    </span>
                                )}
                            </span>
                            <span className="truncate text-[11px] text-slate-400">{entry.url}</span>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
