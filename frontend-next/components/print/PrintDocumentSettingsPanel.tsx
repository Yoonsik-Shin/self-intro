'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Settings, X, Trash2 } from 'lucide-react';
import { usePrintStore } from '@/store/usePrintStore';
import {
    type CustomFontMeta,
    listCustomFonts,
    loadAllCustomFontsIntoDocument,
    removeCustomFont,
    saveCustomFont,
} from '@/lib/customFontStorage';
import {
    PRINT_FONT_FAMILIES,
    PRINT_FONT_FAMILY_LABELS,
    PRINT_FONT_STACKS,
    PRINT_ADDITIONAL_GOOGLE_FONTS,
    isPresetPrintFontFamily,
} from '@/lib/printLayoutModel';

type DocumentSettingsTab = 'paper' | 'typography' | 'composition' | 'view' | 'template';

function PageMarginInput({
    label,
    value,
    onCommit,
}: {
    label: string;
    value: number;
    onCommit: (value: number) => void;
}) {
    const [draft, setDraft] = useState(String(value));

    const commit = () => {
        const parsed = Number(draft);
        if (!Number.isFinite(parsed)) {
            setDraft(String(value));
            return;
        }
        onCommit(parsed);
    };

    return (
        <label className="rounded-md border border-slate-800 bg-slate-900 p-2 text-[10px] font-bold text-slate-300">
            {label}
            <input
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.currentTarget.blur();
                }}
                className="mt-1 block h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-sm font-black text-white outline-none focus:border-blue-400"
            />
        </label>
    );
}

export function PrintDocumentSettingsPanel({
    onClose,
    pageCount,
    onZoomFit,
    activeTemplateName,
    adminMode,
    onOpenTemplateModal,
    onSaveServerTemplate,
    onSaveLocalTemplate,
}: {
    onClose: () => void;
    pageCount: number;
    onZoomFit: () => void;
    activeTemplateName: string;
    adminMode: boolean;
    onOpenTemplateModal: () => void;
    onSaveServerTemplate?: () => void;
    onSaveLocalTemplate: () => void;
}) {
    const store = usePrintStore();
    const [documentSettingsTab, setDocumentSettingsTab] = useState<DocumentSettingsTab>('paper');
    const [fontUploadError, setFontUploadError] = useState<string | null>(null);
    const [savedCustomFonts, setSavedCustomFonts] = useState<CustomFontMeta[]>([]);

    const refreshSavedCustomFonts = () => {
        void listCustomFonts().then(setSavedCustomFonts);
    };

    // 이전에 업로드해 IndexedDB에 저장해 둔 폰트를 매번 다시 올릴 필요 없이
    // 패널을 열 때 document.fonts에 다시 등록해 둔다.
    useEffect(() => {
        void loadAllCustomFontsIntoDocument().then(refreshSavedCustomFonts);
    }, []);

    const handleFontFileUpload = async (file: File) => {
        setFontUploadError(null);
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const familyName = `Uploaded-${baseName.replace(/[^a-zA-Z0-9가-힣_-]/g, '') || 'font'}`;
        try {
            const buffer = await file.arrayBuffer();
            const fontFace = new FontFace(familyName, buffer);
            await fontFace.load();
            document.fonts.add(fontFace);
            store.setFontFamily(familyName);
            await saveCustomFont(familyName, file.name, buffer);
            refreshSavedCustomFonts();
        } catch {
            setFontUploadError(
                '폰트 파일을 불러오지 못했습니다. ttf/otf/woff 파일이 맞는지 확인해주세요.'
            );
        }
    };

    const handleRemoveSavedFont = async (name: string) => {
        await removeCustomFont(name);
        refreshSavedCustomFonts();
    };
    const [documentSettingsWidth, setDocumentSettingsWidth] = useState(288);
    const documentSettingsResizeRef = useRef<{
        pointerId: number;
        startX: number;
        width: number;
    } | null>(null);

    const handleDocumentSettingsResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        documentSettingsResizeRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            width: documentSettingsWidth,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handleDocumentSettingsResizeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const drag = documentSettingsResizeRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        setDocumentSettingsWidth(
            Math.min(420, Math.max(240, drag.width + event.clientX - drag.startX))
        );
    };

    const handleDocumentSettingsResizeEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (documentSettingsResizeRef.current?.pointerId !== event.pointerId) return;
        documentSettingsResizeRef.current = null;
    };

    return (
        <aside
            className="relative shrink-0 overflow-y-auto border-r border-slate-700 bg-slate-950 text-white shadow-2xl print:hidden"
            style={{ width: documentSettingsWidth }}
            aria-label="문서 설정"
        >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
                <div>
                    <p className="text-sm font-black">문서 설정</p>
                    <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                        현재 템플릿의 모든 페이지에 적용
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
                    aria-label="문서 설정 닫기"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <nav
                className="grid grid-cols-3 gap-1 border-b border-slate-800 p-2"
                aria-label="문서 설정 분류"
            >
                {(
                    [
                        ['paper', '용지'],
                        ['typography', '글꼴·간격'],
                        ['composition', '구성'],
                        ['view', '보기'],
                        ['template', '템플릿'],
                    ] as const
                ).map(([tab, label]) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setDocumentSettingsTab(tab)}
                        aria-pressed={documentSettingsTab === tab}
                        className={`h-8 rounded-md px-2 text-[10px] font-black transition ${
                            documentSettingsTab === tab
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </nav>
            <div className="space-y-5 p-4">
                {documentSettingsTab === 'paper' && (
                    <section>
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <h2 className="text-xs font-black">페이지 여백</h2>
                                <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                                    위·오른쪽·아래·왼쪽 순서로 A4 공통 여백을 설정합니다.
                                </p>
                            </div>
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-black text-slate-300">
                                mm
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {(
                                [
                                    ['top', '위'],
                                    ['right', '오른쪽'],
                                    ['bottom', '아래'],
                                    ['left', '왼쪽'],
                                ] as const
                            ).map(([side, label]) => (
                                <PageMarginInput
                                    key={`${side}:${store.outputLayout.pageMargins[side]}`}
                                    label={label}
                                    value={store.outputLayout.pageMargins[side]}
                                    onCommit={(value) => store.setPageMargins({ [side]: value })}
                                />
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                store.setPageMargins({
                                    top: 12,
                                    right: 14,
                                    bottom: 12,
                                    left: 14,
                                })
                            }
                            className="mt-3 h-9 w-full rounded-md border border-slate-700 text-[10px] font-black text-slate-200 transition hover:bg-slate-800"
                        >
                            기본 여백으로 초기화
                        </button>
                    </section>
                )}
                {documentSettingsTab === 'paper' && (
                    <section className="border-t border-slate-800 pt-4">
                        <h2 className="text-xs font-black">페이지 구성</h2>
                        <dl className="mt-3 space-y-2 text-[10px]">
                            <div className="flex justify-between gap-3">
                                <dt className="text-slate-400">용지</dt>
                                <dd className="font-black text-slate-200">A4</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-slate-400">현재 페이지</dt>
                                <dd className="font-black text-slate-200">{pageCount}페이지</dd>
                            </div>
                        </dl>
                    </section>
                )}
                {documentSettingsTab === 'typography' && (
                    <section>
                        <h2 className="text-xs font-black">타이포그래피</h2>
                        <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                            문서 전체 톤과 모든 페이지 본문에 적용되는 읽기 간격입니다.
                        </p>
                        <div className="mt-4 rounded-md border border-slate-800 bg-slate-900 p-3">
                            <span className="text-[10px] font-black text-slate-300">
                                전체 폰트 톤
                            </span>
                            <div className="mt-3 grid grid-cols-3 gap-1.5">
                                {PRINT_FONT_FAMILIES.map((family) => (
                                    <button
                                        key={family}
                                        type="button"
                                        onClick={() => store.setFontFamily(family)}
                                        aria-pressed={store.outputLayout.fontFamily === family}
                                        style={{ fontFamily: PRINT_FONT_STACKS[family] }}
                                        className={`rounded-md border px-2 py-2.5 text-sm font-bold transition ${
                                            store.outputLayout.fontFamily === family
                                                ? 'border-blue-400 bg-blue-600 text-white'
                                                : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white'
                                        }`}
                                    >
                                        {PRINT_FONT_FAMILY_LABELS[family]}
                                    </button>
                                ))}
                            </div>
                            <select
                                value={
                                    PRINT_ADDITIONAL_GOOGLE_FONTS.includes(
                                        store.outputLayout.fontFamily
                                    )
                                        ? store.outputLayout.fontFamily
                                        : ''
                                }
                                onChange={(event) => {
                                    if (event.target.value) store.setFontFamily(event.target.value);
                                }}
                                className="mt-2.5 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-[10px] font-bold text-slate-200 focus:border-blue-400 focus:outline-none"
                            >
                                <option value="" disabled>
                                    더 많은 구글 폰트에서 고르기
                                </option>
                                {PRINT_ADDITIONAL_GOOGLE_FONTS.map((name) => (
                                    <option key={name} value={name}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                            {!isPresetPrintFontFamily(store.outputLayout.fontFamily) && (
                                <p className="mt-1.5 text-[9px] font-bold text-blue-300">
                                    현재 적용: {store.outputLayout.fontFamily}
                                </p>
                            )}
                        </div>
                        <div className="mt-3 rounded-md border border-slate-800 bg-slate-900 p-3">
                            <span className="text-[10px] font-black text-slate-300">
                                내 컴퓨터에서 폰트 파일 업로드
                            </span>
                            <input
                                type="file"
                                accept=".ttf,.otf,.woff,.woff2"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) void handleFontFileUpload(file);
                                    event.target.value = '';
                                }}
                                className="mt-2 block w-full text-[10px] text-slate-300 file:mr-2 file:rounded-md file:border-0 file:bg-slate-700 file:px-2.5 file:py-1.5 file:text-[10px] file:font-black file:text-white file:transition hover:file:bg-slate-600"
                            />
                            {fontUploadError && (
                                <p className="mt-1.5 text-[9px] font-bold text-rose-400">
                                    {fontUploadError}
                                </p>
                            )}
                            {savedCustomFonts.length > 0 && (
                                <div className="mt-2.5 space-y-1">
                                    {savedCustomFonts.map((font) => (
                                        <div
                                            key={font.name}
                                            className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => store.setFontFamily(font.name)}
                                                aria-pressed={
                                                    store.outputLayout.fontFamily === font.name
                                                }
                                                className={`min-w-0 flex-1 truncate text-left text-[10px] font-bold ${
                                                    store.outputLayout.fontFamily === font.name
                                                        ? 'text-blue-300'
                                                        : 'text-slate-300 hover:text-white'
                                                }`}
                                                title={font.fileName}
                                            >
                                                {font.fileName}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void handleRemoveSavedFont(font.name)
                                                }
                                                className="shrink-0 grid h-6 w-6 place-items-center rounded-md text-slate-400 transition hover:bg-red-950/50 hover:text-red-400"
                                                title="삭제"
                                                aria-label="삭제"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="mt-1.5 text-[9px] leading-relaxed text-slate-500">
                                업로드한 폰트는 이 브라우저에 저장되어 새로고침해도 다시 올릴 필요
                                없이 위 목록에서 다시 고를 수 있습니다. 다른 기기·브라우저에서는
                                다시 업로드해야 합니다.
                            </p>
                        </div>
                        <label className="mt-3 block rounded-md border border-slate-800 bg-slate-900 p-3">
                            <span className="flex items-center justify-between text-[10px] font-black text-slate-300">
                                전체 글자 크기
                                <strong className="text-blue-300">
                                    {Math.round(store.outputLayout.fontScale * 100)}%
                                </strong>
                            </span>
                            <input
                                type="range"
                                min={0.8}
                                max={1.3}
                                step={0.025}
                                value={store.outputLayout.fontScale}
                                onChange={(event) => store.setFontScale(Number(event.target.value))}
                                className="mt-3 h-1 w-full cursor-pointer accent-blue-500"
                            />
                        </label>
                        <label className="mt-3 block rounded-md border border-slate-800 bg-slate-900 p-3">
                            <span className="flex items-center justify-between text-[10px] font-black text-slate-300">
                                본문 줄 간격
                                <strong className="text-blue-300">
                                    {store.lineHeight.toFixed(2)}
                                </strong>
                            </span>
                            <input
                                type="range"
                                min={1}
                                max={2.2}
                                step={0.025}
                                value={store.lineHeight}
                                onChange={(event) =>
                                    store.setLineHeight(Number(event.target.value))
                                }
                                className="mt-3 h-1 w-full cursor-pointer accent-blue-500"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                store.setFontFamily('PRETENDARD');
                                store.setFontScale(1);
                                store.setLineHeight(1.625);
                            }}
                            className="mt-3 h-9 w-full rounded-md border border-slate-700 text-[10px] font-black text-slate-200 transition hover:bg-slate-800"
                        >
                            기본 폰트·글자·줄 간격으로 초기화
                        </button>
                    </section>
                )}
                {documentSettingsTab === 'composition' && (
                    <section>
                        <h2 className="text-xs font-black">문서 구성</h2>
                        <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                            섹션 노출, 순서와 세부 항목 배치를 관리합니다.
                        </p>
                        <button
                            type="button"
                            onClick={() => store.setNavPanelOpen(!store.navPanelOpen)}
                            aria-pressed={store.navPanelOpen}
                            className={`mt-4 flex w-full items-center justify-between rounded-md border p-3 text-left transition ${
                                store.navPanelOpen
                                    ? 'border-blue-400 bg-blue-600/20 text-white'
                                    : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-600'
                            }`}
                        >
                            <span>
                                <strong className="block text-xs">구성 관리 패널</strong>
                                <span className="mt-1 block text-[10px] text-slate-400">
                                    {store.printExcludedIds.length}개 제외 · 드래그 순서 편집
                                </span>
                            </span>
                            <Settings className="h-4 w-4 shrink-0" />
                        </button>
                        <button
                            type="button"
                            onClick={store.toggleAllExcluded}
                            className="mt-2 h-9 w-full rounded-md border border-slate-700 text-[10px] font-black text-slate-200 transition hover:bg-slate-800"
                        >
                            {store.printExcludedIds.length > 0
                                ? '모든 섹션 다시 포함'
                                : '편집 가능한 섹션 모두 제외'}
                        </button>
                    </section>
                )}
                {documentSettingsTab === 'view' && (
                    <section>
                        <h2 className="text-xs font-black">편집 화면 보기</h2>
                        <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                            화면에서만 바뀌며 실제 인쇄 결과에는 영향을 주지 않습니다.
                        </p>
                        <button
                            type="button"
                            onClick={store.toggleHidePrintGuides}
                            aria-pressed={!store.hidePrintGuides}
                            className="mt-4 flex w-full items-center justify-between rounded-md border border-slate-800 bg-slate-900 p-3 text-left text-slate-200 transition hover:border-slate-600"
                        >
                            <span>
                                <strong className="block text-xs">편집 가이드</strong>
                                <span className="mt-1 block text-[10px] text-slate-400">
                                    여백선·열 경계·배치 도구
                                </span>
                            </span>
                            <span
                                className={`rounded-full px-2 py-1 text-[9px] font-black ${
                                    store.hidePrintGuides
                                        ? 'bg-slate-800 text-slate-400'
                                        : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                            >
                                {store.hidePrintGuides ? '숨김' : '표시'}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={onZoomFit}
                            className="mt-2 h-9 w-full rounded-md border border-slate-700 text-[10px] font-black text-slate-200 transition hover:bg-slate-800"
                        >
                            화면에 페이지 맞춤
                        </button>
                    </section>
                )}
                {documentSettingsTab === 'template' && (
                    <section>
                        <h2 className="text-xs font-black">템플릿</h2>
                        <div className="mt-3 rounded-md border border-slate-800 bg-slate-900 p-3">
                            <span className="text-[9px] font-black text-slate-500">
                                현재 적용 중
                            </span>
                            <strong className="mt-1 block truncate text-xs text-white">
                                {activeTemplateName || '기본 이력서'}
                            </strong>
                        </div>
                        <div className="mt-3 space-y-2">
                            <button
                                type="button"
                                onClick={onOpenTemplateModal}
                                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 text-[10px] font-black text-slate-100 transition hover:border-blue-400"
                            >
                                다른 템플릿 불러오기
                            </button>
                            {adminMode && onSaveServerTemplate && (
                                <button
                                    type="button"
                                    onClick={onSaveServerTemplate}
                                    className="h-10 w-full rounded-md bg-blue-600 text-[10px] font-black text-white transition hover:bg-blue-500"
                                >
                                    Workspace 템플릿으로 저장
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onSaveLocalTemplate}
                                className="h-10 w-full rounded-md border border-amber-500/50 bg-amber-500/10 text-[10px] font-black text-amber-300 transition hover:bg-amber-500/20"
                            >
                                브라우저에 임시 저장
                            </button>
                        </div>
                    </section>
                )}
            </div>
            <div
                role="separator"
                aria-orientation="vertical"
                aria-label="문서 설정 패널 너비 조절"
                onPointerDown={handleDocumentSettingsResizeStart}
                onPointerMove={handleDocumentSettingsResizeMove}
                onPointerUp={handleDocumentSettingsResizeEnd}
                onPointerCancel={handleDocumentSettingsResizeEnd}
                className="absolute inset-y-0 right-0 w-1.5 cursor-col-resize touch-none bg-transparent transition hover:bg-blue-500/70"
            />
        </aside>
    );
}
