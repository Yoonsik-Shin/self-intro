import { Check, ListChecks, Printer, Save, X } from 'lucide-react';

type PrintPreviewBarProps = {
  excludedCount: number;
  totalPages: number;
  navOpen: boolean;
  onToggleAll: () => void;
  onToggleNav: () => void;
  onSaveLocal?: () => void;
  onSaveServer?: () => void;
  onPrint: () => void;
  onCancel: () => void;
  // 줌 제어 Props
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onZoomFit: () => void;
  // 관리자 대시보드 템플릿 편집 전용 Props
  isAdminEditMode?: boolean;
  adminTemplateName?: string;
  onAdminTemplateNameChange?: (name: string) => void;
  adminTemplateVisible?: boolean;
  onAdminTemplateVisibleChange?: (visible: boolean) => void;
  onAdminSaveTemplate?: () => void;
};

/** 단일 고정 상단 툴바 (양쪽 상단 둥글기 rounded-t-2xl 대칭 균형 완벽 적용) */
export function PrintPreviewBar({
  excludedCount,
  totalPages,
  navOpen,
  onToggleAll,
  onToggleNav,
  onSaveLocal,
  onSaveServer,
  onPrint,
  onCancel,
  zoom,
  onZoomChange,
  onZoomFit,
  isAdminEditMode = false,
  adminTemplateName = '',
  onAdminTemplateNameChange,
  adminTemplateVisible = true,
  onAdminTemplateVisibleChange,
  onAdminSaveTemplate,
}: PrintPreviewBarProps) {
  // ── 줌 컨트롤 UI 템플릿 ──
  const zoomControl = (
    <div className="flex items-center gap-1 bg-slate-800 border border-slate-700/60 rounded-xl px-1.5 py-1 text-white shrink-0">
      <button
        onClick={() => onZoomChange(Math.max(zoom - 0.1, 0.3))}
        className="w-5 h-5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 font-black text-xs flex items-center justify-center transition"
        title="축소 (Ctrl + Wheel Down)"
      >
        -
      </button>
      <button
        onClick={onZoomFit}
        className="px-1.5 py-0.5 text-[10px] font-extrabold text-slate-300 hover:text-white hover:bg-slate-700 rounded transition"
        title="화면에 맞춤"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={() => onZoomChange(Math.min(zoom + 0.1, 2.0))}
        className="w-5 h-5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 font-black text-xs flex items-center justify-center transition"
        title="확대 (Ctrl + Wheel Up)"
      >
        +
      </button>
    </div>
  );

  // ── 1. 관리자 템플릿 편집 모드 ──
  if (isAdminEditMode) {
    return (
      <div
        data-print-preview-ui
        className="relative z-50 flex h-14 w-full shrink-0 items-center justify-between gap-4 bg-slate-900 px-4 shadow-xl print:hidden sm:px-6 border-b border-slate-800"
      >
        {/* Left: icon + label + page count */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white shrink-0">
            <Printer className="h-4.5 w-4.5" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-black text-white whitespace-nowrap">PDF 템플릿 수정</span>
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap hidden sm:inline">
              총 {totalPages}페이지
            </span>
            {excludedCount > 0 && (
              <span className="text-xs font-semibold text-red-400 whitespace-nowrap hidden md:inline">
                ({excludedCount}개 제외)
              </span>
            )}
          </div>
        </div>

        {/* Center: Template Name Input & Visible Checkbox */}
        <div className="flex flex-1 items-center justify-center gap-3 max-w-lg min-w-[180px] mx-2">
          <input
            type="text"
            value={adminTemplateName}
            onChange={(e) => onAdminTemplateNameChange?.(e.target.value)}
            placeholder="템플릿 이름 입력 (예: test, Backend용)"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-1.5 text-xs font-bold text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <label className="flex shrink-0 items-center gap-1.5 cursor-pointer rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800">
            <input
              type="checkbox"
              checked={adminTemplateVisible}
              onChange={(e) => onAdminTemplateVisibleChange?.(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
            />
            <span>공개</span>
          </label>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {zoomControl}
          <button
            onClick={onToggleNav}
            aria-pressed={navOpen}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              navOpen
                ? 'border-blue-400 bg-blue-600 text-white'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white'
            }`}
          >
            <ListChecks className="h-3.5 w-3.5" />
            <span>구성 관리</span>
          </button>
          <button
            onClick={onAdminSaveTemplate}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-500"
          >
            <Check className="h-3.5 w-3.5" />
            템플릿으로 저장
          </button>
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-black text-slate-900 shadow-sm transition hover:bg-slate-100"
          >
            <Printer className="h-3.5 w-3.5" />
            인쇄
          </button>
          <button
            onClick={onCancel}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white ml-1"
            aria-label="편집 취소"
            title="편집 취소"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── 2. 방문자 일반 프리뷰 모드 ──
  return (
    <div
      data-print-preview-ui
      className="relative z-50 flex h-14 w-full shrink-0 items-center justify-between gap-4 bg-slate-900 px-4 shadow-xl print:hidden sm:px-6 border-b border-slate-800"
    >
      {/* Left: label + count */}
      <div className="flex items-center gap-3 min-w-0">
        <Printer className="h-4.5 w-4.5 shrink-0 text-white" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0">
          <span className="text-sm font-black text-white whitespace-nowrap">인쇄 프리뷰</span>
          <span className="text-xs font-bold text-slate-400 whitespace-nowrap">총 {totalPages}페이지</span>
          {excludedCount > 0 && (
            <span className="text-xs font-semibold text-red-400 whitespace-nowrap">
              ({excludedCount}개 제외)
            </span>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0">
        {zoomControl}
        <button
          onClick={onToggleNav}
          aria-pressed={navOpen}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
            navOpen
              ? 'border-slate-400 bg-slate-700 text-white'
              : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white'
          }`}
        >
          <ListChecks className="h-3.5 w-3.5" />
          <span>구성 관리</span>
        </button>
        {onSaveServer && (
          <button
            onClick={onSaveServer}
            className="flex items-center gap-1.5 rounded-lg border border-blue-500/50 bg-blue-500/20 px-3 py-1.5 text-xs font-bold text-blue-200 transition hover:bg-blue-500/30 hover:text-white"
            title="현재 인쇄 설정을 서버 템플릿으로 저장"
          >
            <Save className="h-3.5 w-3.5" />
            <span>템플릿으로 저장</span>
          </button>
        )}
        {onSaveLocal && (
          <button
            onClick={onSaveLocal}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20 hover:text-white"
            title="현재 설정을 내 브라우저에 저장"
          >
            <Save className="h-3.5 w-3.5" />
            <span>내 로컬 저장</span>
          </button>
        )}
        <button
          onClick={onPrint}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-black text-slate-900 shadow-sm transition hover:bg-slate-100"
        >
          <Printer className="h-3.5 w-3.5" />
          인쇄
        </button>
        <button
          onClick={onCancel}
          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
          aria-label="프리뷰 닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
