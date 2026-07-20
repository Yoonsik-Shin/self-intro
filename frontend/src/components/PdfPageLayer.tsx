import React from 'react';

type PdfPageLayerProps = {
  pageIndex: number;
  totalPages: number;
  children: React.ReactNode;
};

/**
 * 1:1 Matched PDF Page Layer Component.
 * 
 * Provides a Figma-style frame in screen preview mode,
 * and exact 1:1 physical A4 page rendering when exported to PDF or printed.
 */
export function PdfPageLayer({ pageIndex, totalPages, children }: PdfPageLayerProps) {
  return (
    <div
      data-pdf-page-layer
      data-page-index={pageIndex}
      className="pdf-page-layer relative w-[210mm] h-[297mm] shrink-0 rounded-md bg-white border border-slate-300/90 shadow-[0_12px_40px_rgba(0,0,0,0.15)] box-border p-[12mm_14mm] print:w-[210mm] print:h-[297mm] print:max-h-[297mm] print:m-0 print:p-[12mm_14mm] print:shadow-none print:rounded-none print:border-none print:bg-white print:overflow-hidden print:box-border"
      style={{
        breakAfter: 'page',
        pageBreakAfter: 'always',
      }}
    >
      {/* 피그마 프레임 라벨 (화면 프리뷰 전용) */}
      <div
        data-print-preview-ui
        aria-hidden="true"
        className="pointer-events-none absolute -top-7 left-0 flex items-center gap-1.5 rounded-t-md bg-slate-900/90 px-3 py-1 text-[11px] font-extrabold text-white shadow-md backdrop-blur-md print:hidden"
      >
        <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
        <span>{pageIndex + 1}페이지 (A4)</span>
      </div>

      {/* 상단 12mm 가이드라인 (화면 프리뷰 전용) */}
      <div
        data-print-preview-ui
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[12mm] border-b border-dashed border-blue-400/50 print:hidden"
      >
        <span className="absolute -top-2.5 left-4 bg-blue-500 text-white px-1.5 py-0.5 text-[8px] font-bold rounded shadow-sm opacity-75">
          TOP (12mm)
        </span>
      </div>

      {/* 하단 285mm 가이드라인 (화면 프리뷰 전용) */}
      <div
        data-print-preview-ui
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[285mm] border-b-2 border-dashed border-rose-500/70 print:hidden"
      >
        <span className="absolute -top-2.5 right-16 bg-rose-500 text-white px-2 py-0.5 text-[9px] font-extrabold rounded shadow-md opacity-85">
          BOTTOM BOUNDARY (285mm / 하단 12mm)
        </span>
      </div>

      {/* 우하단 페이지 번호 (화면 프리뷰 전용) */}
      <span
        data-print-preview-ui
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 right-4 text-[10px] font-black tracking-wide text-slate-400 print:hidden"
      >
        {pageIndex + 1} / {totalPages}
      </span>

      {/* 페이지 내부 콘텐츠 레이어 (100% 균일 좌우 정렬 컨테이너) */}
      <div className="pdf-page-content w-full h-full flex flex-col justify-start items-stretch space-y-0 text-slate-900 box-border overflow-visible print:overflow-hidden">
        {children}
      </div>
    </div>
  );
}
