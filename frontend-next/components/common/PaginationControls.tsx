'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export type PaginationControlsProps = {
    /** 0-indexed current page */
    page: number;
    /** Total number of pages */
    totalPages: number;
    /** Total number of items across all pages */
    totalElements?: number;
    /** Page change callback with 0-indexed new page */
    onPageChange: (page: number) => void;
    /** Custom class name */
    className?: string;
    /** Hide total count badge */
    hideCount?: boolean;
};

export function PaginationControls({
    page,
    totalPages,
    totalElements,
    onPageChange,
    className = '',
    hideCount = false,
}: PaginationControlsProps) {
    if (totalPages <= 1 && totalElements === undefined) {
        return null;
    }

    const currentPage = page; // 0-indexed
    const hasPrevious = currentPage > 0;
    const hasNext = currentPage < totalPages - 1;

    // Smart pagination algorithm to generate visible page numbers (0-indexed)
    const getPageNumbers = (): (number | 'ellipsis')[] => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i);
        }

        const pages: (number | 'ellipsis')[] = [];
        const leftBoundary = Math.max(0, currentPage - 2);
        const rightBoundary = Math.min(totalPages - 1, currentPage + 2);

        pages.push(0);

        if (leftBoundary > 1) {
            pages.push('ellipsis');
        }

        for (let i = Math.max(1, leftBoundary); i <= Math.min(totalPages - 2, rightBoundary); i++) {
            pages.push(i);
        }

        if (rightBoundary < totalPages - 2) {
            pages.push('ellipsis');
        }

        if (totalPages > 1) {
            pages.push(totalPages - 1);
        }

        return pages;
    };

    const pages = getPageNumbers();

    return (
        <div
            className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 ${className}`}
            role="navigation"
            aria-label="Pagination"
        >
            {!hideCount && totalElements !== undefined && (
                <div className="text-xs font-semibold text-slate-500">
                    전체{' '}
                    <span className="font-bold text-slate-800">
                        {totalElements.toLocaleString()}
                    </span>
                    건
                    {totalPages > 0 && (
                        <span className="ml-1 text-slate-400">
                            (페이지 {currentPage + 1} / {totalPages})
                        </span>
                    )}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onPageChange(0)}
                        disabled={!hasPrevious}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600"
                        title="첫 페이지"
                        aria-label="첫 페이지로 이동"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={!hasPrevious}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600"
                        title="이전 페이지"
                        aria-label="이전 페이지로 이동"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-1 mx-1">
                        {pages.map((p, idx) => {
                            if (p === 'ellipsis') {
                                return (
                                    <span
                                        key={`ellipsis-${idx}`}
                                        className="grid h-8 w-8 place-items-center text-xs text-slate-400 select-none"
                                    >
                                        …
                                    </span>
                                );
                            }

                            const isActive = p === currentPage;
                            return (
                                <button
                                    key={`page-${p}`}
                                    type="button"
                                    onClick={() => onPageChange(p)}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`grid h-8 min-w-[2rem] px-2 place-items-center rounded-lg text-xs font-bold transition ${
                                        isActive
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                                    }`}
                                >
                                    {p + 1}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={!hasNext}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600"
                        title="다음 페이지"
                        aria-label="다음 페이지로 이동"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onPageChange(totalPages - 1)}
                        disabled={!hasNext}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600"
                        title="마지막 페이지"
                        aria-label="마지막 페이지로 이동"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
