'use client';

import { useEffect, useRef, useState } from 'react';
import {
    AlignJustify,
    Eye,
    EyeOff,
    FileEdit,
    FileText,
    FolderOpen,
    ListChecks,
    MessageSquare,
    Printer,
    Save,
    Redo2,
    SlidersHorizontal,
    Undo2,
    X,
} from 'lucide-react';

type PrintPreviewBarProps = {
    excludedCount: number;
    totalPages: number;
    navOpen: boolean;
    activeTemplateName?: string;
    /** 레거시 Portfolio 출력 호환. 현재 공통 툴바에서는 직접 사용하지 않는다. */
    onToggleAll?: () => void;
    onToggleNav: () => void;
    onSaveLocal?: () => void;
    onSaveServer?: () => void;
    onOpenTemplateModal?: () => void;
    onPrint: () => void;
    onCancel: () => void;
    zoom: number;
    onZoomChange: (zoom: number) => void;
    onZoomFit: () => void;
    lineHeight?: number;
    onLineHeightChange?: (value: number) => void;
    hideGuides?: boolean;
    onToggleHideGuides?: () => void;
    inlineEditMode?: boolean;
    onToggleInlineEditMode?: () => void;
    aiChatOpen?: boolean;
    onToggleAiChat?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    marginSettingsOpen?: boolean;
    onToggleMarginSettings?: () => void;
    /** 문서 설정 패널을 사용하는 새 통합 툴바. 미지정 시 레거시 버튼 구성을 유지한다. */
    integratedDocumentSettings?: boolean;
};

/** 단일 고정 상단 툴바 (양쪽 상단 둥글기 rounded-t-2xl 대칭 균형 완벽 적용) */
export function PrintPreviewBar({
    excludedCount,
    totalPages,
    navOpen,
    activeTemplateName,
    onToggleNav,
    onSaveLocal,
    onSaveServer,
    onOpenTemplateModal,
    onPrint,
    onCancel,
    zoom,
    onZoomChange,
    onZoomFit,
    lineHeight,
    onLineHeightChange,
    hideGuides = false,
    onToggleHideGuides,
    inlineEditMode = false,
    onToggleInlineEditMode,
    aiChatOpen = false,
    onToggleAiChat,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,
    marginSettingsOpen = false,
    onToggleMarginSettings,
    integratedDocumentSettings = false,
}: PrintPreviewBarProps) {
    const [saveMenuOpen, setSaveMenuOpen] = useState(false);
    const saveMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!saveMenuOpen) return;
        const closeSaveMenu = (event: MouseEvent) => {
            if (!saveMenuRef.current?.contains(event.target as Node)) setSaveMenuOpen(false);
        };
        document.addEventListener('mousedown', closeSaveMenu);
        return () => document.removeEventListener('mousedown', closeSaveMenu);
    }, [saveMenuOpen]);
    const zoomControl = (
        <div className="flex items-center gap-1 bg-slate-800 border border-slate-700/60 rounded-md px-1.5 py-1 text-white shrink-0">
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

    const lineHeightControl =
        lineHeight !== undefined && onLineHeightChange ? (
            <div
                className="flex items-center gap-1.5 bg-slate-800 border border-slate-700/60 rounded-md px-2 py-1 text-white shrink-0"
                title="본문 줄간격 조절"
            >
                <AlignJustify className="h-3.5 w-3.5 text-slate-400" />
                <input
                    type="range"
                    min={1.0}
                    max={2.2}
                    step={0.025}
                    value={lineHeight}
                    onChange={(e) => onLineHeightChange(Number(e.target.value))}
                    className="h-1 w-16 cursor-pointer accent-blue-500"
                />
                <span className="w-7 text-[10px] font-extrabold text-slate-300">
                    {lineHeight.toFixed(2)}
                </span>
            </div>
        ) : null;

    return (
        <div className="relative z-50 flex h-14 w-full shrink-0 items-center justify-between gap-4 bg-slate-900 px-4 shadow-xl print:hidden sm:px-6 border-b border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
                <Printer className="h-4.5 w-4.5 shrink-0 text-white" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2.5 min-w-0">
                    <span className="text-sm font-black text-white whitespace-nowrap">
                        인쇄 프리뷰
                    </span>
                    {activeTemplateName && (
                        <span
                            className="inline-flex items-center gap-1.5 rounded-md border border-blue-400/40 bg-blue-500/20 px-2.5 py-0.5 text-xs font-black text-blue-200 shadow-xs max-w-[200px] sm:max-w-[280px] truncate"
                            title={`현재 적용 중인 템플릿: ${activeTemplateName}`}
                        >
                            <FileText className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                            <span className="truncate">{activeTemplateName}</span>
                        </span>
                    )}
                    <span className="text-xs font-bold text-slate-400 whitespace-nowrap">
                        총 {totalPages}페이지
                    </span>
                    {excludedCount > 0 && (
                        <span className="text-xs font-semibold text-red-400 whitespace-nowrap">
                            ({excludedCount}개 제외)
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {(onUndo || onRedo) && (
                    <div className="flex items-center rounded-md border border-slate-700/60 bg-slate-800 p-1">
                        <button
                            type="button"
                            onClick={onUndo}
                            disabled={!canUndo}
                            className="grid h-7 w-7 place-items-center rounded-md text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent"
                            title="실행 취소 (Ctrl/⌘ + Z)"
                            aria-label="실행 취소"
                        >
                            <Undo2 className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onRedo}
                            disabled={!canRedo}
                            className="grid h-7 w-7 place-items-center rounded-md text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent"
                            title="다시 실행 (Ctrl/⌘ + Shift + Z)"
                            aria-label="다시 실행"
                        >
                            <Redo2 className="h-4 w-4" />
                        </button>
                    </div>
                )}
                {onToggleMarginSettings && (
                    <button
                        type="button"
                        onClick={onToggleMarginSettings}
                        aria-pressed={marginSettingsOpen}
                        className={`flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-[10px] font-black transition ${
                            marginSettingsOpen
                                ? 'border-blue-400 bg-blue-600 text-white'
                                : 'border-slate-700/60 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white'
                        }`}
                        title="용지, 타이포그래피, 구성, 보기, 템플릿 설정"
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        <span className="hidden xl:inline">문서 설정</span>
                    </button>
                )}
                {zoomControl}
                {!integratedDocumentSettings && lineHeightControl}
                {onToggleInlineEditMode && (
                    <button
                        onClick={onToggleInlineEditMode}
                        aria-pressed={inlineEditMode}
                        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-bold transition ${
                            inlineEditMode
                                ? 'border-blue-400 bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/40'
                                : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white'
                        }`}
                        title={
                            inlineEditMode
                                ? '인라인 문구 편집 끄기'
                                : 'A4 종이 위에서 텍스트 직접 클릭하여 편집하기'
                        }
                    >
                        <FileEdit className="h-3.5 w-3.5" />
                        <span className="hidden 2xl:inline">
                            {inlineEditMode ? '문구 편집 중' : '문구 인라인 편집'}
                        </span>
                    </button>
                )}
                {!integratedDocumentSettings && onToggleHideGuides && (
                    <button
                        onClick={onToggleHideGuides}
                        aria-pressed={hideGuides}
                        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-bold transition ${
                            hideGuides
                                ? 'border-indigo-400/80 bg-indigo-600 text-white shadow-sm'
                                : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white'
                        }`}
                        title={
                            hideGuides
                                ? '가이드 및 UI 표시하기'
                                : 'A4 순수 콘텐츠만 보기 (UI 가리기)'
                        }
                    >
                        {hideGuides ? (
                            <Eye className="h-3.5 w-3.5 text-white" />
                        ) : (
                            <EyeOff className="h-3.5 w-3.5" />
                        )}
                        <span>{hideGuides ? '가이드 표시' : '순수 A4만 보기'}</span>
                    </button>
                )}
                {!integratedDocumentSettings && (
                    <button
                        onClick={onToggleNav}
                        aria-pressed={navOpen}
                        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-bold transition ${
                            navOpen
                                ? 'border-slate-400 bg-slate-700 text-white'
                                : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white'
                        }`}
                    >
                        <ListChecks className="h-3.5 w-3.5" />
                        <span>구성 관리</span>
                    </button>
                )}
                {onToggleAiChat && (
                    <button
                        onClick={onToggleAiChat}
                        aria-pressed={aiChatOpen}
                        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-bold transition ${
                            aiChatOpen
                                ? 'border-indigo-400 bg-indigo-600 text-white shadow-sm'
                                : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white'
                        }`}
                        title="AI와 대화하며 초안을 계속 다듬기"
                    >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="hidden 2xl:inline">AI 대화</span>
                    </button>
                )}
                {!integratedDocumentSettings && onOpenTemplateModal && (
                    <button
                        onClick={onOpenTemplateModal}
                        className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-slate-500 hover:text-white"
                        title="다른 저장된 템플릿 불러오기 또는 변경"
                    >
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span>템플릿 불러오기</span>
                    </button>
                )}
                {!integratedDocumentSettings && onSaveServer && (
                    <button
                        onClick={onSaveServer}
                        className="flex items-center gap-1.5 rounded-md border border-blue-500/50 bg-blue-500/20 px-3 py-1.5 text-xs font-bold text-blue-200 transition hover:bg-blue-500/30 hover:text-white"
                        title="현재 인쇄 설정을 서버 템플릿으로 저장"
                    >
                        <Save className="h-3.5 w-3.5" />
                        <span>템플릿으로 저장</span>
                    </button>
                )}
                {!integratedDocumentSettings && onSaveLocal && (
                    <button
                        onClick={onSaveLocal}
                        className="flex items-center gap-1.5 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20 hover:text-white"
                        title="현재 설정을 내 브라우저에 저장"
                    >
                        <Save className="h-3.5 w-3.5" />
                        <span>내 로컬 저장</span>
                    </button>
                )}
                {integratedDocumentSettings && (onSaveServer || onSaveLocal) && (
                    <div ref={saveMenuRef} className="relative">
                        <button
                            type="button"
                            onClick={() => setSaveMenuOpen((open) => !open)}
                            aria-expanded={saveMenuOpen}
                            className="flex items-center gap-1.5 rounded-md border border-blue-500/50 bg-blue-500/20 px-3 py-1.5 text-xs font-bold text-blue-100 transition hover:bg-blue-500/30 hover:text-white"
                            title="현재 인쇄 설정 저장"
                        >
                            <Save className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">저장</span>
                        </button>
                        {saveMenuOpen && (
                            <div className="absolute right-0 top-full z-[80] mt-2 w-56 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 p-1.5 text-left shadow-2xl">
                                {onSaveServer && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSaveMenuOpen(false);
                                            onSaveServer();
                                        }}
                                        className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-slate-200 transition hover:bg-slate-800 hover:text-white"
                                    >
                                        <Save className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                                        <span>
                                            <strong className="block text-xs">
                                                템플릿으로 저장
                                            </strong>
                                            <span className="text-[10px] text-slate-400">
                                                Workspace에서 다시 사용
                                            </span>
                                        </span>
                                    </button>
                                )}
                                {onSaveLocal && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSaveMenuOpen(false);
                                            onSaveLocal();
                                        }}
                                        className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-slate-200 transition hover:bg-slate-800 hover:text-white"
                                    >
                                        <Save className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                                        <span>
                                            <strong className="block text-xs">
                                                브라우저에 임시 저장
                                            </strong>
                                            <span className="text-[10px] text-slate-400">
                                                현재 기기에만 보관
                                            </span>
                                        </span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
                <button
                    onClick={onPrint}
                    className="flex items-center gap-1.5 rounded-md bg-white px-3.5 py-1.5 text-xs font-black text-slate-900 shadow-sm transition hover:bg-slate-100"
                >
                    <Printer className="h-3.5 w-3.5" />
                    인쇄
                </button>
                <button
                    onClick={onCancel}
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-white"
                    aria-label="프리뷰 닫기"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
