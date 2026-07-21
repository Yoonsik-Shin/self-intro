'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowDown,
    ArrowUp,
    Eye,
    EyeOff,
    Pencil,
    Plus,
    Save,
    Terminal,
    Trash2,
} from 'lucide-react';
import { architectureApi } from '@/lib/api';
import type {
    ArchitectureLayer,
    ArchitectureLayerRequest,
    ArchitectureOverview,
    ArchitectureOverviewRequest,
} from '@/lib/api/types';

const emptyOverviewForm: ArchitectureOverviewRequest = {
    heading: '',
    subheading: '',
    diagramHeading: '',
    diagramText: '',
};

const emptyLayerForm: ArchitectureLayerRequest = {
    icon: '',
    title: '',
    displayOrder: 0,
    visible: true,
    items: [],
};

export function ArchitectureManagement() {
    const queryClient = useQueryClient();

    const { data: overview } = useQuery({
        queryKey: ['architecture-overview', 'admin'],
        queryFn: architectureApi.getOverview,
    });
    const { data: layers = [], isLoading: isLayersLoading } = useQuery({
        queryKey: ['architecture-layers', 'admin'],
        queryFn: architectureApi.adminListLayers,
    });

    const refresh = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['architecture-overview'] }),
            queryClient.invalidateQueries({ queryKey: ['architecture-layers'] }),
        ]);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                    <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
                        <Terminal className="h-5 w-5" /> 시스템 아키텍처 관리
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        공개 아키텍처 페이지에 표시할 개요, 구성 요소, 배포 흐름도를 관리합니다.
                    </p>
                </div>
            </div>

            <OverviewForm overview={overview} onSaved={refresh} />
            <LayerManagement layers={layers} isLoading={isLayersLoading} onSaved={refresh} />
        </div>
    );
}

function OverviewForm({
    overview,
    onSaved,
}: {
    overview?: ArchitectureOverview;
    onSaved: () => Promise<void>;
}) {
    const [form, setForm] = useState<ArchitectureOverviewRequest>(emptyOverviewForm);

    useEffect(() => {
        if (overview) {
            setForm({
                heading: overview.heading,
                subheading: overview.subheading,
                diagramHeading: overview.diagramHeading,
                diagramText: overview.diagramText,
            });
        }
    }, [overview]);

    const updateMutation = useMutation({
        mutationFn: architectureApi.updateOverview,
        onSuccess: onSaved,
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        updateMutation.mutate(form);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
            <h3 className="font-black text-slate-900">페이지 개요 & 배포 흐름도</h3>

            <FormField label="페이지 제목">
                <input
                    required
                    maxLength={200}
                    value={form.heading}
                    onChange={(event) => setForm({ ...form, heading: event.target.value })}
                    className={inputClassName}
                />
            </FormField>
            <FormField label="페이지 설명">
                <textarea
                    required
                    maxLength={500}
                    rows={2}
                    value={form.subheading}
                    onChange={(event) => setForm({ ...form, subheading: event.target.value })}
                    className={inputClassName}
                />
            </FormField>
            <FormField label="배포 흐름도 제목">
                <input
                    required
                    maxLength={200}
                    value={form.diagramHeading}
                    onChange={(event) => setForm({ ...form, diagramHeading: event.target.value })}
                    className={inputClassName}
                />
            </FormField>
            <FormField label="배포 흐름도 (ASCII 다이어그램)">
                <textarea
                    required
                    rows={16}
                    value={form.diagramText}
                    onChange={(event) => setForm({ ...form, diagramText: event.target.value })}
                    className={`${inputClassName} font-mono text-xs whitespace-pre`}
                />
            </FormField>

            {updateMutation.error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {updateMutation.error instanceof Error
                        ? updateMutation.error.message
                        : '저장 중 오류가 발생했습니다.'}
                </p>
            )}

            <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                    <Save className="h-4 w-4" />{' '}
                    {updateMutation.isPending ? '저장 중...' : '개요 저장'}
                </button>
            </div>
        </form>
    );
}

function LayerManagement({
    layers,
    isLoading,
    onSaved,
}: {
    layers: ArchitectureLayer[];
    isLoading: boolean;
    onSaved: () => Promise<void>;
}) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<ArchitectureLayerRequest>(emptyLayerForm);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const finishSave = async () => {
        await onSaved();
        setEditingId(null);
        setForm(emptyLayerForm);
        setIsFormOpen(false);
    };

    const createMutation = useMutation({
        mutationFn: architectureApi.createLayer,
        onSuccess: finishSave,
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: ArchitectureLayerRequest }) =>
            architectureApi.updateLayer(id, payload),
        onSuccess: finishSave,
    });
    const deleteMutation = useMutation({
        mutationFn: architectureApi.removeLayer,
        onSuccess: onSaved,
    });

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...emptyLayerForm, displayOrder: layers.length + 1 });
        setIsFormOpen(true);
    };

    const openEdit = (layer: ArchitectureLayer) => {
        setEditingId(layer.id);
        setForm({
            icon: layer.icon,
            title: layer.title,
            displayOrder: layer.displayOrder,
            visible: layer.visible,
            items: layer.items.map((item) => ({
                strongText: item.strongText ?? '',
                bodyText: item.bodyText,
            })),
        });
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setEditingId(null);
        setForm(emptyLayerForm);
        setIsFormOpen(false);
    };

    const handleDelete = (id: number) => {
        if (window.confirm('이 아키텍처 레이어를 삭제하시겠습니까?')) deleteMutation.mutate(id);
    };

    const addItem = () =>
        setForm((current) => ({
            ...current,
            items: [...current.items, { strongText: '', bodyText: '' }],
        }));
    const removeItem = (index: number) =>
        setForm((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }));
    const moveItem = (index: number, direction: -1 | 1) =>
        setForm((current) => {
            const target = index + direction;
            if (target < 0 || target >= current.items.length) return current;
            const items = [...current.items];
            [items[index], items[target]] = [items[target], items[index]];
            return { ...current, items };
        });
    const updateItem = (index: number, field: 'strongText' | 'bodyText', value: string) =>
        setForm((current) => ({
            ...current,
            items: current.items.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            ),
        }));

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (editingId === null) createMutation.mutate(form);
        else updateMutation.mutate({ id: editingId, payload: form });
    };

    const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error;
    const isSaving = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900">구성 요소 카드</h3>
                <button
                    type="button"
                    onClick={openCreate}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                >
                    <Plus className="h-4 w-4" /> 새 카드 추가
                </button>
            </div>

            {mutationError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {mutationError instanceof Error
                        ? mutationError.message
                        : '저장 중 오류가 발생했습니다.'}
                </p>
            )}

            {!isFormOpen && (
                <div className="space-y-3">
                    {isLoading && <p className="text-sm text-slate-400">불러오는 중...</p>}
                    {!isLoading && layers.length === 0 && (
                        <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                            등록된 카드가 없습니다.
                        </p>
                    )}
                    {layers.map((layer) => (
                        <article
                            key={layer.id}
                            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${layer.visible ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                                    >
                                        {layer.visible ? (
                                            <Eye className="h-3 w-3" />
                                        ) : (
                                            <EyeOff className="h-3 w-3" />
                                        )}
                                        {layer.visible ? '공개' : '숨김'}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">
                                        정렬 {layer.displayOrder}
                                    </span>
                                </div>
                                <h4 className="mt-2 flex items-center gap-1.5 font-black text-slate-900">
                                    <span>{layer.icon}</span> {layer.title}
                                </h4>
                                <p className="mt-2 text-xs font-semibold text-slate-400">
                                    항목 {layer.items.length}개
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                                <button
                                    type="button"
                                    onClick={() => openEdit(layer)}
                                    aria-label={`${layer.title} 수정`}
                                    className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(layer.id)}
                                    aria-label={`${layer.title} 삭제`}
                                    className="grid h-9 w-9 place-items-center rounded-lg border border-red-100 text-red-500 transition hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {isFormOpen && (
                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-5"
                >
                    <h4 className="font-black text-slate-900">
                        {editingId === null ? '새 카드 작성' : '카드 수정'}
                    </h4>

                    <div className="grid gap-4 sm:grid-cols-[80px_1fr_120px]">
                        <FormField label="아이콘">
                            <input
                                required
                                maxLength={16}
                                value={form.icon}
                                onChange={(event) => setForm({ ...form, icon: event.target.value })}
                                placeholder="💻"
                                className={inputClassName}
                            />
                        </FormField>
                        <FormField label="카드 제목">
                            <input
                                required
                                maxLength={120}
                                value={form.title}
                                onChange={(event) =>
                                    setForm({ ...form, title: event.target.value })
                                }
                                placeholder="예: Backend Layer"
                                className={inputClassName}
                            />
                        </FormField>
                        <FormField label="정렬 순서">
                            <input
                                type="number"
                                value={form.displayOrder}
                                onChange={(event) =>
                                    setForm({ ...form, displayOrder: Number(event.target.value) })
                                }
                                className={inputClassName}
                            />
                        </FormField>
                    </div>
                    <FormField label="공개 상태">
                        <select
                            value={form.visible ? 'VISIBLE' : 'HIDDEN'}
                            onChange={(event) =>
                                setForm({ ...form, visible: event.target.value === 'VISIBLE' })
                            }
                            className={inputClassName}
                        >
                            <option value="VISIBLE">공개</option>
                            <option value="HIDDEN">숨김</option>
                        </select>
                    </FormField>

                    <section>
                        <div className="mb-1.5 flex items-center justify-between">
                            <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">
                                불릿 항목 ({form.items.length})
                            </h5>
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 hover:border-slate-300 hover:text-slate-900"
                            >
                                <Plus className="h-3.5 w-3.5" /> 항목 추가
                            </button>
                        </div>
                        <div className="space-y-2">
                            {form.items.length === 0 && (
                                <p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">
                                    불릿 항목을 추가하세요.
                                </p>
                            )}
                            {form.items.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3"
                                >
                                    <div className="flex shrink-0 flex-col gap-1 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => moveItem(index, -1)}
                                            disabled={index === 0}
                                            aria-label="위로 이동"
                                            className="grid h-6 w-6 place-items-center rounded border border-slate-200 text-slate-400 hover:text-slate-900 disabled:opacity-30"
                                        >
                                            <ArrowUp className="h-3 w-3" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveItem(index, 1)}
                                            disabled={index === form.items.length - 1}
                                            aria-label="아래로 이동"
                                            className="grid h-6 w-6 place-items-center rounded border border-slate-200 text-slate-400 hover:text-slate-900 disabled:opacity-30"
                                        >
                                            <ArrowDown className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <input
                                            value={item.strongText ?? ''}
                                            onChange={(event) =>
                                                updateItem(index, 'strongText', event.target.value)
                                            }
                                            placeholder="굵게 표시할 앞부분 (선택)"
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                        />
                                        <input
                                            required
                                            value={item.bodyText}
                                            onChange={(event) =>
                                                updateItem(index, 'bodyText', event.target.value)
                                            }
                                            placeholder="설명 문장 (앞부분에 붙여서 이어집니다)"
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        aria-label="항목 삭제"
                                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <button
                            type="button"
                            onClick={closeForm}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />{' '}
                            {isSaving ? '저장 중...' : editingId === null ? '등록' : '수정 저장'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

const inputClassName =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100';

function FormField({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
                {label}
            </span>
            {children}
        </label>
    );
}
