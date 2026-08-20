'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';
import { PaginationControls } from '@/components/common/PaginationControls';
import { BookOpenCheck, Library, Plus, Search, Trash2, X } from 'lucide-react';
import { learningResourceApi } from '@/lib/api';
import type {
    LearningResource,
    LearningResourceCatalogItem,
    LearningResourcePriorityTier,
    LearningResourceStatus,
    WorkspaceLearningResourceRequest,
} from '@/lib/api/types';
import { formatDuration } from '@/lib/format';

const STATUS_OPTIONS: Array<{ value: LearningResourceStatus; label: string }> = [
    { value: 'WISHLIST', label: '위시리스트' },
    { value: 'OWNED', label: '보유' },
    { value: 'IN_PROGRESS', label: '학습 중' },
    { value: 'COMPLETED', label: '완료' },
];

const PRIORITY_OPTIONS: Array<{
    value: LearningResourcePriorityTier | '';
    label: string;
}> = [
    { value: '', label: '우선순위 없음' },
    { value: 'P0', label: 'P0 · 바로 학습' },
    { value: 'P1', label: 'P1 · 우선 학습' },
    { value: 'P2', label: 'P2 · 참고' },
    { value: 'P3', label: 'P3 · 보류' },
];

type EditorState = {
    resource: LearningResource;
    status: LearningResourceStatus;
    priorityTier: LearningResourcePriorityTier | '';
    displayOrder: number;
    summary: string;
    detailMarkdown: string;
    tags: string;
};

const overlayPayload = (editor: EditorState): WorkspaceLearningResourceRequest => ({
    status: editor.status,
    priorityTier: editor.priorityTier || null,
    displayOrder: editor.displayOrder,
    summary: editor.summary,
    detailMarkdown: editor.detailMarkdown,
    tagNames: editor.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
});

export function WorkspaceLearningResourceManagement({ workspaceSlug }: { workspaceSlug: string }) {
    const queryClient = useQueryClient();
    const [mode, setMode] = useState<'MINE' | 'CATALOG'>('MINE');
    const [search, setSearch] = useState('');
    const [catalogPage, setCatalogPage] = useState(0);
    const [editor, setEditor] = useState<EditorState | null>(null);

    const workspaceQueryKey = ['learning-resources', 'workspace', workspaceSlug];
    const catalogQueryKey = [
        'learning-resources',
        'catalog',
        workspaceSlug,
        { q: search.trim(), page: catalogPage },
    ];
    const { data: workspacePage, isLoading: workspaceLoading } = useQuery({
        queryKey: workspaceQueryKey,
        queryFn: () => learningResourceApi.workspaceList(workspaceSlug),
    });
    const { data: catalogPageData, isLoading: catalogLoading } = useQuery({
        queryKey: catalogQueryKey,
        queryFn: () =>
            learningResourceApi.workspaceCatalog(workspaceSlug, {
                q: search.trim() || undefined,
                page: catalogPage,
                size: 20,
            }),
        enabled: mode === 'CATALOG',
    });
    const catalog = catalogPageData?.content ?? [];

    const invalidate = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: workspaceQueryKey }),
            queryClient.invalidateQueries({ queryKey: catalogQueryKey }),
        ]);
    };

    const addMutation = useMutation({
        mutationFn: (resource: LearningResourceCatalogItem) =>
            learningResourceApi.workspaceAdd(workspaceSlug, resource.id, {
                status: 'WISHLIST',
                priorityTier: null,
                displayOrder: workspacePage?.content.length ?? 0,
                summary: '',
                detailMarkdown: '',
                tagNames: [],
            }),
        onSuccess: async () => {
            await invalidate();
            setMode('MINE');
        },
    });

    const updateMutation = useMutation({
        mutationFn: (value: EditorState) =>
            learningResourceApi.workspaceUpdate(
                workspaceSlug,
                value.resource.id,
                overlayPayload(value)
            ),
        onSuccess: async () => {
            await invalidate();
            setEditor(null);
        },
    });

    const removeMutation = useMutation({
        mutationFn: (id: number) => learningResourceApi.workspaceRemove(workspaceSlug, id),
        onSuccess: invalidate,
    });

    const mine = useMemo(() => {
        const normalized = search.trim().toLowerCase();
        return (workspacePage?.content ?? []).filter(
            (resource) =>
                !normalized ||
                resource.title.toLowerCase().includes(normalized) ||
                (resource.provider ?? '').toLowerCase().includes(normalized) ||
                (resource.summary ?? '').toLowerCase().includes(normalized) ||
                resource.tags.some((tag) => tag.name.toLowerCase().includes(normalized))
        );
    }, [search, workspacePage]);

    const openEditor = (resource: LearningResource) =>
        setEditor({
            resource,
            status: resource.status,
            priorityTier: resource.priorityTier ?? '',
            displayOrder: resource.displayOrder,
            summary: resource.summary ?? '',
            detailMarkdown: resource.detailMarkdown ?? '',
            tags: resource.tags.map((tag) => tag.name).join(', '),
        });

    return (
        <div className="space-y-4">
            <AdminPageHeader
                title="학습 자료"
                description="자료 정보는 공통 카탈로그에서 선택하고, 진행 상태와 개인 메모는 이 Workspace에만 저장합니다."
                actions={
                    <div className="flex rounded-xl bg-slate-100 p-1">
                        <button
                            type="button"
                            onClick={() => setMode('MINE')}
                            className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === 'MINE' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
                        >
                            내 학습 자료 {workspacePage?.totalElements ?? 0}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('CATALOG')}
                            className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === 'CATALOG' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
                        >
                            공통 카탈로그
                        </button>
                    </div>
                }
            />

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setCatalogPage(0);
                    }}
                    placeholder={mode === 'MINE' ? '내 자료와 메모 검색' : '카탈로그 검색'}
                    className="w-full bg-transparent text-sm outline-none"
                />
            </label>

            {mode === 'MINE' ? (
                <section className="space-y-3">
                    {workspaceLoading ? (
                        <EmptyState label="내 학습 자료를 불러오는 중입니다." />
                    ) : mine.length === 0 ? (
                        <EmptyState
                            label="저장한 학습 자료가 없습니다."
                            action="공통 카탈로그에서 첫 자료를 추가해보세요."
                        />
                    ) : (
                        mine.map((resource) => (
                            <article
                                key={resource.id}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <button
                                        type="button"
                                        onClick={() => openEditor(resource)}
                                        className="min-w-0 flex-1 text-left"
                                    >
                                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">
                                                {
                                                    STATUS_OPTIONS.find(
                                                        (item) => item.value === resource.status
                                                    )?.label
                                                }
                                            </span>
                                            {resource.priorityTier && (
                                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                                                    {resource.priorityTier}
                                                </span>
                                            )}
                                            <span className="text-slate-400">
                                                {resource.provider || '제공처 미정'} ·{' '}
                                                {formatDuration(resource.durationMinutes)}
                                            </span>
                                        </div>
                                        <h3 className="mt-2 truncate text-base font-black text-slate-900">
                                            {resource.title}
                                        </h3>
                                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                                            {resource.summary || '아직 개인 요약이 없습니다.'}
                                        </p>
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openEditor(resource)}
                                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                        >
                                            상태·메모 편집
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        '이 Workspace의 학습 목록에서 제거할까요?'
                                                    )
                                                ) {
                                                    removeMutation.mutate(resource.id);
                                                }
                                            }}
                                            className="rounded-lg border border-red-100 p-2 text-red-500 hover:bg-red-50"
                                            aria-label="Workspace 학습 목록에서 제거"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </section>
            ) : (
                <section className="space-y-3">
                    <div className="grid gap-3 xl:grid-cols-2">
                        {catalogLoading ? (
                            <EmptyState label="공통 카탈로그를 불러오는 중입니다." />
                        ) : (
                            catalog.map((resource) => (
                                <article
                                    key={resource.id}
                                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                                >
                                    <div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                            <Library className="h-4 w-4" />
                                            {resource.provider || '제공처 미정'} ·{' '}
                                            {formatDuration(resource.durationMinutes)}
                                        </div>
                                        <h3 className="mt-2 text-base font-black text-slate-900">
                                            {resource.title}
                                        </h3>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {resource.instructorOrAuthor || '저자·강사 정보 없음'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={resource.saved || addMutation.isPending}
                                        onClick={() => addMutation.mutate(resource)}
                                        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                    >
                                        {resource.saved ? (
                                            <>
                                                <BookOpenCheck className="h-4 w-4" /> 이미 저장됨
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4" /> 내 Workspace에 추가
                                            </>
                                        )}
                                    </button>
                                </article>
                            ))
                        )}
                    </div>
                    {catalogPageData && catalogPageData.totalPages > 1 && (
                        <PaginationControls
                            page={catalogPage}
                            totalPages={catalogPageData.totalPages}
                            totalElements={catalogPageData.totalElements}
                            onPageChange={setCatalogPage}
                        />
                    )}
                </section>
            )}

            {editor && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35">
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            updateMutation.mutate(editor);
                        }}
                        className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wider text-indigo-500">
                                    Workspace private state
                                </p>
                                <h3 className="mt-1 text-xl font-black text-slate-950">
                                    {editor.resource.title}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditor(null)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            <Field label="학습 상태">
                                <select
                                    value={editor.status}
                                    onChange={(event) =>
                                        setEditor({
                                            ...editor,
                                            status: event.target.value as LearningResourceStatus,
                                        })
                                    }
                                    className="workspace-input"
                                >
                                    {STATUS_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="우선순위">
                                <select
                                    value={editor.priorityTier}
                                    onChange={(event) =>
                                        setEditor({
                                            ...editor,
                                            priorityTier: event.target.value as
                                                LearningResourcePriorityTier | '',
                                        })
                                    }
                                    className="workspace-input"
                                >
                                    {PRIORITY_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>

                        <div className="mt-4 space-y-4">
                            <Field label="개인 요약">
                                <textarea
                                    value={editor.summary}
                                    onChange={(event) =>
                                        setEditor({ ...editor, summary: event.target.value })
                                    }
                                    rows={3}
                                    className="workspace-input resize-y"
                                    placeholder="왜 이 자료를 선택했는지 짧게 적어두세요."
                                />
                            </Field>
                            <Field label="개인 학습 노트">
                                <textarea
                                    value={editor.detailMarkdown}
                                    onChange={(event) =>
                                        setEditor({
                                            ...editor,
                                            detailMarkdown: event.target.value,
                                        })
                                    }
                                    rows={12}
                                    className="workspace-input resize-y font-mono"
                                    placeholder="Markdown으로 학습 메모를 기록할 수 있습니다."
                                />
                            </Field>
                            <Field label="Workspace 태그">
                                <input
                                    value={editor.tags}
                                    onChange={(event) =>
                                        setEditor({ ...editor, tags: event.target.value })
                                    }
                                    className="workspace-input"
                                    placeholder="Java, 성능, 면접 (쉼표로 구분)"
                                />
                            </Field>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setEditor(null)}
                                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600"
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="flex-1 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                            >
                                Workspace에 저장
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
                {label}
            </span>
            {children}
        </label>
    );
}

function EmptyState({ label, action }: { label: string; action?: string }) {
    return (
        <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <p className="text-sm font-black text-slate-600">{label}</p>
            {action && <p className="mt-1 text-xs text-slate-400">{action}</p>}
        </div>
    );
}
