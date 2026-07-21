'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Printer,
    Settings,
    FileText,
    Trash2,
    X,
    Save,
    ChevronRight,
    ArrowLeft,
    Pencil,
} from 'lucide-react';
import { printTemplateApi } from '@/lib/api';
import type { PrintTemplate } from '@/lib/api/types';
import {
    getLocalSaves,
    removeLocal,
    renameLocal,
    type LocalPrintSave,
} from '@/lib/printTemplateLocal';

type PrintSettings = {
    excludedIds: string[];
    sectionOrder: string[];
    sectionGaps: Record<string, number>;
    forcedPageOverrides?: Record<string, number>;
};

type PrintModeModalProps = {
    open: boolean;
    onClose: () => void;
    onManual: () => void;
    onApplyTemplate: (settings: PrintSettings) => void;
};

/** PDF 인쇄 버튼 클릭 시 나타나는 모드 선택 모달.
 *  Step 1 (MAIN): "직접 조정하기" vs "저장된 템플릿 선택하기" 선택
 *  Step 2 (TEMPLATE_LIST): 저장된 템플릿 목록 (서버 템플릿 + 내 브라우저 로컬 저장) */
export function PrintModeModal({ open, onClose, onManual, onApplyTemplate }: PrintModeModalProps) {
    const [step, setStep] = useState<'MAIN' | 'TEMPLATE_LIST'>('MAIN');

    const { data: serverTemplates = [] } = useQuery({
        queryKey: ['printTemplates'],
        queryFn: printTemplateApi.list,
        staleTime: 5 * 60 * 1000,
    });

    const [localSaves, setLocalSaves] = useState<LocalPrintSave[]>([]);

    useEffect(() => {
        if (open) {
            setStep('MAIN');
            setLocalSaves(getLocalSaves());
        }
    }, [open]);

    const handleRemoveLocal = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        removeLocal(id);
        setLocalSaves(getLocalSaves());
    };

    const handleRenameLocal = (s: LocalPrintSave, e: React.MouseEvent) => {
        e.stopPropagation();
        const newName = window.prompt('새로운 인쇄 설정 이름을 입력하세요:', s.memo);
        if (newName === null || !newName.trim() || newName.trim() === s.memo) return;
        renameLocal(s.id, newName.trim());
        setLocalSaves(getLocalSaves());
    };

    const handleSelectServer = (t: PrintTemplate) => {
        const rawGaps = (t.sectionGaps || {}) as Record<string, unknown>;
        const { __forcedPageOverrides, ...pureGaps } = rawGaps as Record<string, number> & {
            __forcedPageOverrides?: unknown;
        };
        onApplyTemplate({
            excludedIds: t.excludedIds || [],
            sectionOrder: t.sectionOrder || [],
            sectionGaps: pureGaps || {},
            forcedPageOverrides:
                __forcedPageOverrides && typeof __forcedPageOverrides === 'object'
                    ? (__forcedPageOverrides as Record<string, number>)
                    : {},
        });
    };

    const handleSelectLocal = (s: LocalPrintSave) => {
        onApplyTemplate({
            excludedIds: s.excludedIds || [],
            sectionOrder: s.sectionOrder || [],
            sectionGaps: s.sectionGaps || {},
            forcedPageOverrides: s.forcedPageOverrides || {},
        });
    };

    const formatDate = (iso: string) => {
        try {
            const d = new Date(iso);
            const m = d.getMonth() + 1;
            const day = d.getDate();
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            return `${m}/${day} ${hh}:${mm}`;
        } catch {
            return iso;
        }
    };

    if (!open) return null;

    const totalTemplateCount = serverTemplates.length + localSaves.length;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            <div
                className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-6 pt-6 pb-4.5">
                    <div className="flex items-center gap-3">
                        {step === 'TEMPLATE_LIST' ? (
                            <button
                                onClick={() => setStep('MAIN')}
                                className="grid h-8.5 w-8.5 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                title="이전 단계로"
                            >
                                <ArrowLeft className="h-4.5 w-4.5" />
                            </button>
                        ) : (
                            <div className="grid h-8.5 w-8.5 place-items-center rounded-xl bg-slate-900 text-white">
                                <Printer className="h-4.5 w-4.5" />
                            </div>
                        )}
                        <h2 className="text-lg font-black text-slate-900">
                            {step === 'MAIN' ? 'PDF 인쇄' : '템플릿 선택'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="grid h-8.5 w-8.5 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="닫기"
                    >
                        <X className="h-4.5 w-4.5" />
                    </button>
                </div>

                {step === 'MAIN' && (
                    <div className="px-6 pt-5 pb-4 space-y-3.5">
                        <button
                            onClick={onManual}
                            className="group flex w-full items-center justify-between gap-4 rounded-2xl border-2 border-slate-200/90 bg-slate-50/50 p-4.5 text-left transition hover:border-slate-900 hover:bg-slate-50 hover:shadow-md"
                        >
                            <div className="flex items-center gap-4">
                                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-900 text-white shadow-sm transition group-hover:scale-105">
                                    <Settings className="h-6 w-6" />
                                </div>
                                <div>
                                    <span className="block text-base font-black text-slate-900">
                                        직접 조정하기
                                    </span>
                                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                                        섹션 순서, 포함/제외를 직접 설정합니다
                                    </span>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => setStep('TEMPLATE_LIST')}
                            className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4.5 text-left transition hover:border-blue-500 hover:bg-blue-50/30 hover:shadow-md"
                        >
                            <div className="flex items-center gap-4">
                                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-100 group-hover:scale-105">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="block text-base font-black text-slate-900 group-hover:text-blue-700">
                                            저장된 템플릿 선택하기
                                        </span>
                                        {totalTemplateCount > 0 && (
                                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-700">
                                                {totalTemplateCount}
                                            </span>
                                        )}
                                    </div>
                                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                                        {totalTemplateCount > 0
                                            ? '미리 준비된 설정으로 빠르게 인쇄합니다'
                                            : '저장된 인쇄 템플릿이 있습니다'}
                                    </span>
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
                        </button>
                    </div>
                )}

                {step === 'TEMPLATE_LIST' && (
                    <div className="max-h-[55vh] overflow-y-auto px-6 pt-5 pb-4 space-y-5">
                        {totalTemplateCount === 0 ? (
                            <div className="py-8 text-center text-sm font-semibold text-slate-400">
                                저장된 템플릿이나 로컬 설정이 없습니다.
                            </div>
                        ) : (
                            <>
                                {serverTemplates.length > 0 && (
                                    <div>
                                        <div className="mb-2.5 flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                저장된 템플릿
                                            </span>
                                            <div className="h-px flex-1 bg-slate-200" />
                                        </div>
                                        <div className="space-y-2">
                                            {serverTemplates.map((t) => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => handleSelectServer(t)}
                                                    className="group flex w-full items-center justify-between gap-3.5 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-sm"
                                                >
                                                    <div className="flex items-center gap-3.5 min-w-0">
                                                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
                                                            <FileText className="h-4.5 w-4.5" />
                                                        </div>
                                                        <span className="truncate text-sm font-bold text-slate-800 group-hover:text-blue-700">
                                                            {t.name}
                                                        </span>
                                                    </div>
                                                    <ChevronRight className="h-4.5 w-4.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {localSaves.length > 0 && (
                                    <div>
                                        <div className="mb-2.5 flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                내 브라우저 저장 설정
                                            </span>
                                            <div className="h-px flex-1 bg-slate-200" />
                                        </div>
                                        <div className="space-y-2">
                                            {localSaves.map((s) => (
                                                <div
                                                    key={s.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => handleSelectLocal(s)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            handleSelectLocal(s);
                                                        }
                                                    }}
                                                    className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-amber-400 hover:bg-amber-50/40 hover:shadow-sm cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 transition group-hover:bg-amber-100">
                                                            <Save className="h-4.5 w-4.5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className="block truncate text-sm font-bold text-slate-800 group-hover:text-amber-800">
                                                                {s.memo || '(설명 없음)'}
                                                            </span>
                                                            <span className="text-[11px] font-semibold text-slate-400">
                                                                {formatDate(s.savedAt)} 저장
                                                                {s.excludedIds &&
                                                                    s.excludedIds.length > 0 &&
                                                                    ` · ${s.excludedIds.length}개 숨김`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            onClick={(e) => handleRenameLocal(s, e)}
                                                            className="grid h-8 w-8 place-items-center rounded-xl text-slate-300 transition hover:bg-amber-100 hover:text-amber-700"
                                                            title="이름 변경"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) =>
                                                                handleRemoveLocal(s.id, e)
                                                            }
                                                            className="grid h-8 w-8 place-items-center rounded-xl text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                                                            title="삭제"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-2.5 border-t border-slate-100 px-6 pt-3.5 pb-5">
                    {step === 'TEMPLATE_LIST' && (
                        <button
                            onClick={() => setStep('MAIN')}
                            className="flex-1 rounded-2xl border border-slate-200/90 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                        >
                            이전
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-2xl border border-slate-200/90 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                        취소
                    </button>
                </div>
            </div>
        </div>
    );
}
