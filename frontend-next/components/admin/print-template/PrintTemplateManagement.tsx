'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Printer,
    Plus,
    Trash2,
    Eye,
    EyeOff,
    ArrowUp,
    ArrowDown,
    Edit2,
    AlertTriangle,
    RefreshCw,
} from 'lucide-react';
import { bffApi, printTemplateApi } from '@/lib/api';
import type { PrintTemplate } from '@/lib/api/types';
import {
    countContentOverrides,
    getPrintContentFingerprint,
    sanitizePrintTemplate,
} from '@/lib/printTemplateContent';

/**
 * 목록에서는 공개 여부와 순서를 관리한다.
 * 템플릿 문구 편집 및 레이아웃 조정은 /print 관리자 미리보기에서 WYSIWYG으로 통합 관리한다.
 */
export function PrintTemplateManagement() {
    const queryClient = useQueryClient();

    const { data: templates = [], isLoading } = useQuery({
        queryKey: ['printTemplates', 'admin'],
        queryFn: printTemplateApi.adminList,
    });
    const { data: introData } = useQuery({
        queryKey: ['introduction', 'print-template-editor'],
        queryFn: bffApi.getIntroduction,
    });
    const currentFingerprint = introData ? getPrintContentFingerprint(introData) : null;

    const toPayload = (template: PrintTemplate) => ({
        name: template.name,
        excludedIds: JSON.stringify(template.excludedIds),
        sectionOrder: JSON.stringify(template.sectionOrder),
        sectionGaps: JSON.stringify(template.sectionGaps),
        targetRole: template.targetRole,
        contentOverrides: JSON.stringify(template.contentOverrides),
        baseContentFingerprint: template.baseContentFingerprint,
        schemaVersion: template.schemaVersion || 2,
        visible: template.visible,
        displayOrder: template.displayOrder,
    });

    const updateMutation = useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id: number;
            payload: Parameters<typeof printTemplateApi.update>[1];
        }) => printTemplateApi.update(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['printTemplates'] }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => printTemplateApi.remove(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['printTemplates'] }),
    });

    const handleDelete = (t: PrintTemplate) => {
        if (confirm(`'${t.name}' 템플릿을 삭제하시겠습니까?`)) {
            deleteMutation.mutate(t.id);
        }
    };

    const handleSyncTemplate = (t: PrintTemplate) => {
        if (!introData || !currentFingerprint) return;
        const sanitized = sanitizePrintTemplate(t, introData);
        updateMutation.mutate(
            {
                id: t.id,
                payload: {
                    ...toPayload(sanitized),
                    baseContentFingerprint: currentFingerprint,
                },
            },
            {
                onSuccess: () =>
                    alert(`'${t.name}' 템플릿이 최신 DB 원본 데이터와 동기화되었습니다.`),
            }
        );
    };

    const handleToggleVisible = (t: PrintTemplate) => {
        updateMutation.mutate({
            id: t.id,
            payload: {
                ...toPayload(t),
                visible: !t.visible,
            },
        });
    };

    const handleMoveDisplayOrder = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= templates.length) return;

        const current = templates[index];
        const target = templates[targetIndex];

        updateMutation.mutate({
            id: current.id,
            payload: {
                ...toPayload(current),
                displayOrder: target.displayOrder,
            },
        });
        updateMutation.mutate({
            id: target.id,
            payload: {
                ...toPayload(target),
                displayOrder: current.displayOrder,
            },
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                    <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900">
                        <Printer className="h-5 w-5 text-slate-700" />
                        PDF 인쇄 템플릿 관리
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                        방문자가 선택할 수 있는 PDF 인쇄 템플릿 목록입니다. 템플릿
                        편집(문구/레이아웃)은 인쇄 미리보기에서 실시간 WYSIWYG으로 직접 수정할 수
                        있습니다.
                    </p>
                </div>
                <a
                    href="/print?admin=1"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                >
                    <Plus className="h-4 w-4" /> 새 인쇄 템플릿 만들기
                </a>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-sm font-bold text-slate-400">
                        템플릿 목록 로딩 중...
                    </div>
                ) : templates.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                        <p className="text-base font-bold text-slate-700">
                            등록된 인쇄 템플릿이 없습니다.
                        </p>
                        <p className="text-xs text-slate-500">
                            위의 버튼으로 인쇄 미리보기를 열어 템플릿을 생성해보세요.
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                                <th className="py-3.5 px-6">순서</th>
                                <th className="py-3.5 px-6">템플릿 이름</th>
                                <th className="py-3.5 px-6">제외 설정 항목</th>
                                <th className="py-3.5 px-6">공개 여부</th>
                                <th className="py-3.5 px-6 text-right font-bold">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-sm">
                            {templates.map((t, index) => {
                                const hasMismatch = Boolean(
                                    t.baseContentFingerprint &&
                                    currentFingerprint &&
                                    t.baseContentFingerprint !== currentFingerprint
                                );
                                return (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition">
                                        <td className="py-4 px-6 font-bold text-slate-400">
                                            <div className="flex items-center gap-1">
                                                <span>{t.displayOrder}</span>
                                                <div className="flex flex-col gap-0.5 ml-2">
                                                    <button
                                                        disabled={index === 0}
                                                        onClick={() =>
                                                            handleMoveDisplayOrder(index, 'up')
                                                        }
                                                        className="grid h-5 w-5 place-items-center rounded hover:bg-slate-200 text-slate-500 disabled:opacity-20"
                                                        title="위로"
                                                    >
                                                        <ArrowUp className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                        disabled={index === templates.length - 1}
                                                        onClick={() =>
                                                            handleMoveDisplayOrder(index, 'down')
                                                        }
                                                        className="grid h-5 w-5 place-items-center rounded hover:bg-slate-200 text-slate-500 disabled:opacity-20"
                                                        title="아래로"
                                                    >
                                                        <ArrowDown className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-slate-900">{t.name}</div>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">
                                                    {t.targetRole || 'GENERAL'}
                                                </span>
                                                {countContentOverrides(t.contentOverrides) > 0 && (
                                                    <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">
                                                        맞춤 문구{' '}
                                                        {countContentOverrides(t.contentOverrides)}
                                                        개 수정됨
                                                    </span>
                                                )}
                                                {hasMismatch && (
                                                    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        원본 변경됨
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 font-medium text-slate-600">
                                            {t.excludedIds.length > 0
                                                ? `${t.excludedIds.length}개 항목 제외됨`
                                                : '모든 섹션 포함'}
                                        </td>
                                        <td className="py-4 px-6">
                                            <button
                                                onClick={() => handleToggleVisible(t)}
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${
                                                    t.visible
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                        : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                }`}
                                            >
                                                {t.visible ? (
                                                    <Eye className="h-3.5 w-3.5" />
                                                ) : (
                                                    <EyeOff className="h-3.5 w-3.5" />
                                                )}
                                                {t.visible ? '공개' : '비공개'}
                                            </button>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                {hasMismatch && (
                                                    <button
                                                        onClick={() => handleSyncTemplate(t)}
                                                        disabled={updateMutation.isPending}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800 hover:bg-amber-100 transition shadow-xs"
                                                        title="최신 DB 원본 내용과 동기화 및 유령 데이터 정화"
                                                    >
                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                        최신 원본 동기화
                                                    </button>
                                                )}
                                                <a
                                                    href={`/print?admin=1&templateId=${t.id}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition shadow-xs"
                                                    title="A4 종이 실시간 미리보기에서 템플릿 문구 및 레이아웃 편집"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                                                    템플릿 편집 & 미리보기
                                                </a>
                                                <button
                                                    onClick={() => handleDelete(t)}
                                                    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition"
                                                    title="템플릿 삭제"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
