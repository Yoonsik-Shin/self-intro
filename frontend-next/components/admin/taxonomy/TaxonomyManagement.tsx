'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ApiError, taxonomyApi } from '@/lib/api';
import type { TaxonomyNode, TaxonomyNodeRequest } from '@/lib/api/types';
import { useAuthStore } from '@/store/useAuthStore';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';

const emptyForm: TaxonomyNodeRequest = {
    name: '',
    slug: '',
    displayOrder: 0,
    parentId: null,
};

export function TaxonomyManagement() {
    const queryClient = useQueryClient();
    const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
    const handleMutationError = (error: unknown) => {
        if (error instanceof ApiError && error.status === 401) setUnauthenticated();
    };

    const { data: nodes, isLoading } = useQuery({
        queryKey: ['taxonomyNodes'],
        queryFn: taxonomyApi.list,
    });

    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<TaxonomyNodeRequest>(emptyForm);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['taxonomyNodes'] });
        queryClient.invalidateQueries({ queryKey: ['studyTaxonomyCuration'] });
        queryClient.invalidateQueries({ queryKey: ['studies'] });
        queryClient.invalidateQueries({ queryKey: ['learning-resources'] });
    };

    const createMutation = useMutation({
        mutationFn: (payload: TaxonomyNodeRequest) => taxonomyApi.create(payload),
        onSuccess: () => {
            invalidate();
            setIsFormOpen(false);
            setForm(emptyForm);
        },
        onError: (err) => {
            handleMutationError(err);
            setError(err instanceof ApiError ? err.message : '카테고리 생성에 실패했습니다.');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: TaxonomyNodeRequest }) =>
            taxonomyApi.update(id, payload),
        onSuccess: () => {
            invalidate();
            setIsFormOpen(false);
            setEditingId(null);
            setForm(emptyForm);
        },
        onError: (err) => {
            handleMutationError(err);
            setError(err instanceof ApiError ? err.message : '카테고리 수정에 실패했습니다.');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => taxonomyApi.remove(id),
        onSuccess: () => invalidate(),
        onError: (err) => {
            handleMutationError(err);
            setError(err instanceof ApiError ? err.message : '카테고리 삭제에 실패했습니다.');
        },
    });

    const openCreateForm = (parentId: number | null = null) => {
        setEditingId(null);
        setForm({ ...emptyForm, parentId, displayOrder: (nodes?.length ?? 0) + 1 });
        setError(null);
        setIsFormOpen(true);
    };

    const openEditForm = (node: TaxonomyNode) => {
        setEditingId(node.id);
        setForm({
            name: node.name,
            slug: node.slug,
            displayOrder: node.displayOrder,
            parentId: node.parentId,
        });
        setError(null);
        setIsFormOpen(true);
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        if (editingId !== null) {
            updateMutation.mutate({ id: editingId, payload: form });
        } else {
            createMutation.mutate(form);
        }
    };

    const handleDelete = (node: TaxonomyNode) => {
        if (!window.confirm(`"${node.name}" 카테고리를 삭제할까요?`)) return;
        deleteMutation.mutate(node.id);
    };

    const topLevel = (nodes ?? []).filter((n) => n.parentId === null);
    const childrenOf = (id: number) => (nodes ?? []).filter((n) => n.parentId === id);
    const eligibleParents = (nodes ?? []).filter((n) => n.id !== editingId);

    const renderRow = (node: TaxonomyNode, depth: number) => (
        <div key={node.id}>
            <div
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                style={{ paddingLeft: `${8 + depth * 16}px` }}
            >
                <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-bold text-slate-800">{node.name}</span>
                    <span className="text-xs text-slate-400">/{node.slug}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        onClick={() => openCreateForm(node.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                        title="하위 카테고리 추가"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => openEditForm(node)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                        title="수정"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDelete(node)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="삭제"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
            {childrenOf(node.id).map((child) => renderRow(child, depth + 1))}
        </div>
    );

    return (
        <div className="space-y-4">
            <AdminPageHeader
                eyebrow="Platform Catalog"
                title="카테고리 체계 관리"
                description="학습 기록과 학습 자료가 함께 쓰는 계층형 카테고리를 관리합니다. 어느 레벨에든 하위 카테고리를 만들 수 있고, 하나의 기록을 여러 카테고리에 연결할 수 있습니다."
                actions={
                    <button
                        type="button"
                        onClick={() => openCreateForm(null)}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                    >
                        <Plus className="h-4 w-4" />
                        최상위 카테고리 추가
                    </button>
                }
            />

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {isFormOpen && (
                    <form
                        onSubmit={handleSubmit}
                        className="mb-4 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                    >
                        {error && <p className="text-xs font-bold text-red-600">{error}</p>}
                        <div className="grid grid-cols-2 gap-2.5">
                            <label className="block">
                                <span className="text-xs font-bold text-slate-500">이름</span>
                                <input
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-slate-800 focus:outline-none"
                                />
                            </label>
                            <label className="block">
                                <span className="text-xs font-bold text-slate-500">슬러그</span>
                                <input
                                    required
                                    value={form.slug}
                                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-slate-800 focus:outline-none"
                                />
                            </label>
                            <label className="block">
                                <span className="text-xs font-bold text-slate-500">노출 순서</span>
                                <input
                                    required
                                    type="number"
                                    value={form.displayOrder}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            displayOrder: Number(e.target.value),
                                        })
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-slate-800 focus:outline-none"
                                />
                            </label>
                            <label className="block">
                                <span className="text-xs font-bold text-slate-500">
                                    상위 카테고리
                                </span>
                                <select
                                    value={form.parentId ?? ''}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            parentId: e.target.value
                                                ? Number(e.target.value)
                                                : null,
                                        })
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-slate-800 focus:outline-none"
                                >
                                    <option value="">없음 (최상위)</option>
                                    {eligibleParents.map((node) => (
                                        <option key={node.id} value={node.id}>
                                            {node.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100"
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                            >
                                {editingId !== null ? '수정 저장' : '생성'}
                            </button>
                        </div>
                    </form>
                )}

                <div className="space-y-0.5">
                    {isLoading && <p className="text-xs text-slate-400">불러오는 중...</p>}
                    {!isLoading && topLevel.length === 0 && (
                        <p className="text-xs text-slate-400">등록된 카테고리가 없습니다.</p>
                    )}
                    {topLevel.map((node) => renderRow(node, 0))}
                </div>
            </div>
        </div>
    );
}
