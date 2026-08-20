'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer, Check, X } from 'lucide-react';
import { jobPostingApi, printTemplateApi } from '@/lib/api';
import type {
    PrintTemplate,
    PrintTemplateContentOverrides,
    PrintTemplateRequest,
} from '@/lib/api/types';
import { serializeStoredPrintLayout, type OutputLayout } from '@/lib/printLayoutModel';

type SaveServerTemplateModalProps = {
    workspaceSlug: string;
    open: boolean;
    onClose: () => void;
    currentSettings: {
        excludedIds: string[];
        sectionOrder: string[];
        sectionGaps: Record<string, number>;
        forcedPageOverrides?: Record<string, number>;
        outputLayout: OutputLayout;
        itemOrderOverrides?: Record<string, string[]>;
        targetRole: string;
        contentOverrides: PrintTemplateContentOverrides;
        baseContentFingerprint: string;
        lineHeight: number;
    };
    editingTemplate?: PrintTemplate | null;
    /** 지원 공고를 통해 PDF를 내보낸 경우 그 공고 id로 미리 채워둔다(직접 바꿀 수 있음). */
    defaultJobPostingId?: number | null;
    onSaved?: (template: PrintTemplate) => void;
};

/** 인쇄 프리뷰 화면에서 현재 조정한 설정을 서버 DB 템플릿으로 저장하는 모달 */
export function SaveServerTemplateModal({
    workspaceSlug,
    open,
    onClose,
    currentSettings,
    editingTemplate,
    defaultJobPostingId = null,
    onSaved,
}: SaveServerTemplateModalProps) {
    const queryClient = useQueryClient();
    const [name, setName] = useState(editingTemplate?.name || '');
    const [visible, setVisible] = useState(editingTemplate?.visible ?? true);
    const [jobPostingId, setJobPostingId] = useState<number | null>(
        editingTemplate?.jobPostingId ?? defaultJobPostingId
    );

    const { data: jobPostings = [] } = useQuery({
        queryKey: ['jobPostings', workspaceSlug, 'for-print-template-link'],
        queryFn: () => jobPostingApi.workspaceList(workspaceSlug),
        enabled: open,
    });

    // 새 템플릿이고 지원 공고가 선택돼 있으면 회사명을 이름 제안으로 사용한다.
    // 실제 입력값(name)이 비어 있을 때만 제출 시점에 이 값을 대신 쓴다.
    const selectedJobPosting = jobPostings.find((p) => p.id === jobPostingId);
    const suggestedName =
        !editingTemplate && selectedJobPosting
            ? `${selectedJobPosting.companyName} · ${selectedJobPosting.positionTitle}`
            : '';

    const createMutation = useMutation({
        mutationFn: (payload: PrintTemplateRequest) =>
            printTemplateApi.workspaceCreate(workspaceSlug, payload),
        onSuccess: (saved) => {
            queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
            alert('템플릿이 저장되었습니다.');
            onSaved?.(saved);
            onClose();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: PrintTemplateRequest }) =>
            printTemplateApi.workspaceUpdate(workspaceSlug, id, payload),
        onSuccess: (saved) => {
            queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
            alert('템플릿이 수정되었습니다.');
            onSaved?.(saved);
            onClose();
        },
    });

    if (!open) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalName = name.trim() || suggestedName;
        if (!finalName) {
            alert('템플릿 이름을 입력해 주세요.');
            return;
        }

        const payload: PrintTemplateRequest = {
            name: finalName,
            excludedIds: JSON.stringify(currentSettings.excludedIds),
            sectionOrder: JSON.stringify(currentSettings.sectionOrder),
            sectionGaps: JSON.stringify(
                serializeStoredPrintLayout({
                    sectionGaps: currentSettings.sectionGaps,
                    forcedPageOverrides: currentSettings.forcedPageOverrides ?? {},
                    itemOrderOverrides: currentSettings.itemOrderOverrides ?? {},
                    outputLayout: currentSettings.outputLayout,
                })
            ),
            targetRole: currentSettings.targetRole,
            contentOverrides: JSON.stringify(currentSettings.contentOverrides),
            baseContentFingerprint: currentSettings.baseContentFingerprint,
            schemaVersion: 3,
            visible,
            displayOrder: editingTemplate?.displayOrder ?? 1,
            jobPostingId,
            lineHeight: currentSettings.lineHeight,
        };

        if (editingTemplate?.id) {
            updateMutation.mutate({ id: editingTemplate.id, payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[75] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-md rounded-lg bg-white shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 place-items-center rounded-md bg-slate-900 text-white">
                            <Printer className="h-4 w-4" />
                        </div>
                        <h2 className="text-lg font-black text-slate-900">
                            {editingTemplate ? '템플릿 수정 저장' : '새 템플릿으로 저장'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X className="h-4.5 w-4.5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                            템플릿 이름 *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={suggestedName || '예: Backend 이력서용, 핵심 요약본 등'}
                            className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-slate-900"
                            autoFocus
                        />
                        {suggestedName && !name.trim() && (
                            <p className="mt-1.5 text-xs font-medium text-slate-500">
                                비워두면 &ldquo;{suggestedName}&rdquo;로 저장됩니다.
                            </p>
                        )}
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer rounded-md border border-slate-200 p-3.5 bg-slate-50/50 hover:bg-slate-50">
                        <input
                            type="checkbox"
                            checked={visible}
                            onChange={(e) => setVisible(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <div>
                            <span className="block text-sm font-bold text-slate-900">
                                공개로 설정
                            </span>
                            <span className="block text-xs font-medium text-slate-500">
                                방문자 인쇄 모달 템플릿 목록에 노출됩니다
                            </span>
                        </div>
                    </label>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                            연동할 지원 공고
                        </label>
                        <select
                            value={jobPostingId ?? ''}
                            onChange={(e) =>
                                setJobPostingId(e.target.value ? Number(e.target.value) : null)
                            }
                            className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-slate-900"
                        >
                            <option value="">연동 안 함</option>
                            {jobPostings.map((jp) => (
                                <option key={jp.id} value={jp.id}>
                                    {jp.companyName} · {jp.positionTitle}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1.5 text-xs font-medium text-slate-500">
                            연동하면 해당 공고 상세의 &ldquo;PDF 템플릿&rdquo; 탭에서 이 템플릿을
                            확인·최종 제출본 지정할 수 있습니다.
                        </p>
                    </div>

                    <div className="rounded-md border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-600 space-y-1">
                        <div className="font-bold text-slate-700">저장될 현재 프리뷰 상태:</div>
                        <div>• 제외 항목: {currentSettings.excludedIds.length}개 선택됨</div>
                        <div>
                            • 섹션 간격 조정: {Object.keys(currentSettings.sectionGaps).length}개
                            설정됨
                        </div>
                        <div>
                            • 페이지 배치: {currentSettings.outputLayout.pages.length}개 페이지 ·{' '}
                            {currentSettings.outputLayout.placements.length}개 고정 항목
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
                        >
                            <Check className="h-4 w-4" />
                            저장하기
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
