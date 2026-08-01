'use client';

import { useState } from 'react';
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
    User,
    Building2,
    HardDrive,
    Pencil,
} from 'lucide-react';
import { bffApi, printTemplateApi, jobPostingApi } from '@/lib/api';
import type { PrintTemplate } from '@/lib/api/types';
import {
    countContentOverrides,
    getPrintContentFingerprint,
    sanitizePrintTemplate,
} from '@/lib/printTemplateContent';
import {
    removeLocal,
    renameLocal,
    useLocalPrintSaves,
    type LocalPrintSave,
} from '@/lib/printTemplateLocal';

const PUBLIC_TEMPLATE_LIMIT = 5;

type PrivateTab = 'general' | 'company' | 'local';

const PRIVATE_TABS: { key: PrivateTab; label: string; icon: typeof User }[] = [
    { key: 'general', label: '일반', icon: User },
    { key: 'company', label: '회사와 연결된 템플릿', icon: Building2 },
    { key: 'local', label: '로컬에 저장된 템플릿', icon: HardDrive },
];

/**
 * 목록에서는 공개 여부와 순서를 관리한다.
 * 템플릿 문구 편집 및 레이아웃 조정은 /print 관리자 미리보기에서 WYSIWYG으로 통합 관리한다.
 */
export function PrintTemplateManagement() {
    const queryClient = useQueryClient();
    const [privateTab, setPrivateTab] = useState<PrivateTab>('general');
    const localSaves = useLocalPrintSaves();

    const { data: templates = [], isLoading } = useQuery({
        queryKey: ['printTemplates', 'admin'],
        queryFn: printTemplateApi.adminList,
    });
    const { data: introData } = useQuery({
        queryKey: ['introduction', 'print-template-editor'],
        queryFn: bffApi.getIntroduction,
    });
    const { data: jobPostings = [] } = useQuery({
        queryKey: ['jobPostings', 'admin', 'print-template-editor'],
        queryFn: jobPostingApi.list,
    });
    const currentFingerprint = introData ? getPrintContentFingerprint(introData) : null;
    const jobPostingLabelById = new Map(
        jobPostings.map((j) => [j.id, `${j.companyName} · ${j.positionTitle}`])
    );

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
        jobPostingId: template.jobPostingId,
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

    const handleMoveInList = (list: PrintTemplate[], index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= list.length) return;

        const current = list[index];
        const target = list[targetIndex];

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

    const handleRenameLocal = (s: LocalPrintSave) => {
        const newName = window.prompt('새로운 인쇄 설정 이름을 입력하세요:', s.memo);
        if (newName === null || !newName.trim() || newName.trim() === s.memo) return;
        renameLocal(s.id, newName.trim());
    };

    const handleRemoveLocal = (s: LocalPrintSave) => {
        if (!confirm(`'${s.memo || '(설명 없음)'}' 로컬 저장 설정을 삭제하시겠습니까?`)) return;
        removeLocal(s.id);
    };

    const publicTemplates = templates.filter((t) => t.visible);
    const privateTemplates = templates.filter((t) => !t.visible);
    const privateGeneral = privateTemplates.filter((t) => !t.jobPostingId);
    const privateCompany = privateTemplates.filter((t) => t.jobPostingId);

    const renderTemplateTable = (list: PrintTemplate[], emptyMessage: string) => {
        if (isLoading) {
            return (
                <div className="p-6 text-center text-sm font-bold text-slate-400">
                    템플릿 목록 로딩 중...
                </div>
            );
        }
        if (list.length === 0) {
            return (
                <div className="p-6 text-center text-sm font-medium text-slate-400">
                    {emptyMessage}
                </div>
            );
        }
        return (
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-2 px-5">순서</th>
                        <th className="py-2 px-5">템플릿 이름</th>
                        <th className="py-2 px-5">제외 설정 항목</th>
                        <th className="py-2 px-5 text-right font-bold">관리</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {list.map((t, index) => {
                        const hasMismatch = Boolean(
                            t.baseContentFingerprint &&
                            currentFingerprint &&
                            t.baseContentFingerprint !== currentFingerprint
                        );
                        return (
                            <tr key={t.id} className="hover:bg-slate-50/50 transition">
                                <td className="py-2 px-5 font-bold text-slate-400">
                                    <div className="flex items-center gap-1">
                                        <span>{t.displayOrder}</span>
                                        <div className="flex flex-col gap-0 ml-1.5">
                                            <button
                                                disabled={index === 0}
                                                onClick={() => handleMoveInList(list, index, 'up')}
                                                className="grid h-4 w-4 place-items-center rounded hover:bg-slate-200 text-slate-500 disabled:opacity-20"
                                                title="위로"
                                            >
                                                <ArrowUp className="h-3 w-3" />
                                            </button>
                                            <button
                                                disabled={index === list.length - 1}
                                                onClick={() =>
                                                    handleMoveInList(list, index, 'down')
                                                }
                                                className="grid h-4 w-4 place-items-center rounded hover:bg-slate-200 text-slate-500 disabled:opacity-20"
                                                title="아래로"
                                            >
                                                <ArrowDown className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-2 px-5">
                                    <div className="font-bold text-slate-900">{t.name}</div>
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                        {t.jobPostingId &&
                                            jobPostingLabelById.has(t.jobPostingId) && (
                                                <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-black text-indigo-700">
                                                    <Building2 className="h-2.5 w-2.5" />
                                                    {jobPostingLabelById.get(t.jobPostingId)}
                                                </span>
                                            )}
                                        {countContentOverrides(t.contentOverrides) > 0 && (
                                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-black text-blue-700">
                                                맞춤 문구{' '}
                                                {countContentOverrides(t.contentOverrides)}개 수정됨
                                            </span>
                                        )}
                                        {hasMismatch && (
                                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-black text-amber-700">
                                                <AlertTriangle className="h-3 w-3" />
                                                원본 변경됨
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="py-2 px-5 font-medium text-slate-600">
                                    {t.excludedIds.length > 0
                                        ? `${t.excludedIds.length}개 항목 제외됨`
                                        : '모든 섹션 포함'}
                                </td>
                                <td className="py-2 px-5 text-right">
                                    <div className="inline-flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleToggleVisible(t)}
                                            role="switch"
                                            aria-checked={t.visible}
                                            title={
                                                t.visible
                                                    ? '공개 중 (클릭 시 비공개 전환)'
                                                    : '비공개 중 (클릭 시 공개 전환)'
                                            }
                                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
                                                t.visible ? 'bg-slate-900' : 'bg-slate-200'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${
                                                    t.visible
                                                        ? 'translate-x-[18px]'
                                                        : 'translate-x-0.5'
                                                }`}
                                            />
                                        </button>
                                        {hasMismatch && (
                                            <button
                                                onClick={() => handleSyncTemplate(t)}
                                                disabled={updateMutation.isPending}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-800 hover:bg-amber-100 transition shadow-xs"
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
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition"
                                            title="A4 종이 실시간 미리보기에서 템플릿 문구 및 레이아웃 편집"
                                        >
                                            <Edit2 className="h-3.5 w-3.5 text-blue-400" />
                                            템플릿 편집 & 미리보기
                                        </a>
                                        <button
                                            onClick={() => handleDelete(t)}
                                            className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition"
                                            title="템플릿 삭제"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    };

    const renderLocalTable = () => {
        if (localSaves.length === 0) {
            return (
                <div className="p-6 text-center text-sm font-medium text-slate-400">
                    이 브라우저에 로컬로 저장된 인쇄 설정이 없습니다.
                </div>
            );
        }
        return (
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-2 px-5">이름</th>
                        <th className="py-2 px-5">저장 정보</th>
                        <th className="py-2 px-5 text-right font-bold">관리</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {localSaves.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-2 px-5 font-bold text-slate-900">
                                {s.memo || '(설명 없음)'}
                            </td>
                            <td className="py-2 px-5 font-medium text-slate-600">
                                {new Date(s.savedAt).toLocaleString('ko-KR')}
                                {s.excludedIds.length > 0 &&
                                    ` · ${s.excludedIds.length}개 항목 제외됨`}
                            </td>
                            <td className="py-2 px-5 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                    <button
                                        onClick={() => handleRenameLocal(s)}
                                        className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                                        title="이름 변경"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleRemoveLocal(s)}
                                        className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition"
                                        title="삭제"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
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
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
                    <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-emerald-600" />
                        <h3 className="text-sm font-black text-slate-800">
                            공개 템플릿{' '}
                            <span className="text-slate-400">({publicTemplates.length})</span>
                        </h3>
                    </div>
                    {publicTemplates.length > PUBLIC_TEMPLATE_LIMIT && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-black text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            권장 {PUBLIC_TEMPLATE_LIMIT}개를 초과했습니다
                        </span>
                    )}
                </div>
                {renderTemplateTable(publicTemplates, '공개된 템플릿이 없습니다.')}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
                    <div className="flex items-center gap-2">
                        <EyeOff className="h-4 w-4 text-slate-400" />
                        <h3 className="text-sm font-black text-slate-800">비공개 템플릿</h3>
                    </div>
                    <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                        {PRIVATE_TABS.map(({ key, label, icon: Icon }) => {
                            const count =
                                key === 'general'
                                    ? privateGeneral.length
                                    : key === 'company'
                                      ? privateCompany.length
                                      : localSaves.length;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setPrivateTab(key)}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                        privateTab === key
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {label}
                                    <span className="text-slate-400">({count})</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                {privateTab === 'general' &&
                    renderTemplateTable(privateGeneral, '비공개(일반) 템플릿이 없습니다.')}
                {privateTab === 'company' &&
                    renderTemplateTable(privateCompany, '회사와 연결된 비공개 템플릿이 없습니다.')}
                {privateTab === 'local' && renderLocalTable()}
            </div>
        </div>
    );
}
