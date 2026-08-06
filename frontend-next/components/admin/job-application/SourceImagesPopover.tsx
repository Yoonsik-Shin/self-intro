'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import type { JobPostingSourceImage } from '@/lib/api/types';

type SourceImagesPopoverProps = {
    sourceImages: JobPostingSourceImage[];
    label: string;
    className?: string;
};

/**
 * JD 스크린샷으로 등록된 공고의 원본 이미지를 다시 볼 수 있게 한다. URL 수집 공고의
 * "원본 보기"(SourceLinksPopover)에 대응하는 이미지 버전 — 파싱이 정확했는지 사람이
 * 눈으로 재확인할 수 있어야 한다는 요구사항 때문에 존재한다.
 */
export function SourceImagesPopover({ sourceImages, label, className }: SourceImagesPopoverProps) {
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

    if (sourceImages.length === 0) {
        return null;
    }

    const sorted = [...sourceImages].sort((a, b) => a.displayOrder - b.displayOrder);

    return (
        <div ref={containerRef} className="relative min-w-0">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                title="이 공고를 등록할 때 쓴 원본 스크린샷을 봅니다"
                className={
                    className ??
                    'flex w-full min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 px-1 py-2 text-slate-500 transition hover:bg-slate-100'
                }
            >
                <ImageIcon className="h-4 w-4" />
                <span className="whitespace-nowrap text-[10px] font-bold">{label}</span>
            </button>
            {open && (
                <div className="absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                    <div className="grid grid-cols-3 gap-1.5">
                        {sorted.map((image, index) => (
                            <a
                                key={image.id}
                                href={image.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block aspect-square overflow-hidden rounded-md border border-slate-200"
                                title={`스크린샷 ${index + 1}`}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={image.url}
                                    alt={`원본 스크린샷 ${index + 1}`}
                                    className="h-full w-full object-cover"
                                />
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
