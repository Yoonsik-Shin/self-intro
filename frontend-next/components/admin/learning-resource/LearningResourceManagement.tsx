'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, List as ListIcon, Network, Pencil, Plus, Trash2 } from 'lucide-react';
import { ApiError, learningResourceApi, skillApi } from '@/lib/api';
import type {
    LearningResource,
    LearningResourcePriorityTier,
    LearningResourceRelationType,
    LearningResourceRequest,
    LearningResourceStatus,
    LearningResourceType,
} from '@/lib/api/types';
import { useAuthStore } from '@/store/useAuthStore';
import { MarkdownEditor } from '../shared/MarkdownEditor';
import { SkillPicker } from '../shared/SkillPicker';
import { TagInput } from '../shared/TagInput';
import { LearningResourceDetailPanel } from './LearningResourceDetailPanel';
import { LearningResourceMindmap } from './LearningResourceMindmap';

type LearningResourceViewMode = 'LIST' | 'MINDMAP';

type LearningResourceForm = Omit<LearningResourceRequest, 'tagNames'> & { tagNames: string };

const emptyLearningResourceForm: LearningResourceForm = {
    slug: '',
    title: '',
    resourceType: 'ONLINE_COURSE',
    provider: '',
    url: '',
    instructorOrAuthor: '',
    durationMinutes: undefined,
    status: 'WISHLIST',
    priorityTier: undefined,
    displayOrder: 0,
    categoryId: 1,
    summary: '',
    detailMarkdown: '',
    tagNames: '',
    skillIds: [],
    relatedResources: [],
};

const toLearningResourceRequest = (form: LearningResourceForm): LearningResourceRequest => ({
    ...form,
    tagNames: form.tagNames
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
});

const resourceTypeOptions: Array<{ value: LearningResourceType; label: string }> = [
    { value: 'ONLINE_COURSE', label: '온라인 강의' },
    { value: 'BOOK', label: '책' },
    { value: 'OFFLINE', label: '오프라인' },
];

const statusOptions: Array<{ value: LearningResourceStatus; label: string }> = [
    { value: 'WISHLIST', label: '위시리스트' },
    { value: 'OWNED', label: '보유' },
    { value: 'IN_PROGRESS', label: '진행중' },
    { value: 'COMPLETED', label: '완료' },
];

const priorityOptions: Array<{ value: LearningResourcePriorityTier; label: string }> = [
    { value: 'P0', label: 'P0 · 즉시 수강' },
    { value: 'P1', label: 'P1 · 권장' },
    { value: 'P2', label: 'P2 · 참고' },
    { value: 'P3', label: 'P3 · 보류' },
];

const relationTypeOptions: Array<{ value: LearningResourceRelationType; label: string }> = [
    { value: 'PREREQUISITE', label: '선수 학습' },
    { value: 'RELATED', label: '관련 자료' },
    { value: 'FOLLOW_UP', label: '후속 학습' },
    { value: 'OVERLAPS', label: '내용 중복' },
];

const statusStyles: Record<string, string> = {
    WISHLIST: 'bg-slate-100 text-slate-600',
    OWNED: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
};

const priorityStyles: Record<string, string> = {
    P0: 'bg-red-100 text-red-700',
    P1: 'bg-orange-100 text-orange-700',
    P2: 'bg-yellow-100 text-yellow-700',
    P3: 'bg-slate-100 text-slate-500',
};

export function LearningResourceManagement() {
    const queryClient = useQueryClient();
    const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
    const handleMutationError = (error: unknown) => {
        if (error instanceof ApiError && error.status === 401) setUnauthenticated();
    };

    const {
        data: resourcePage,
        isLoading: isResourceListLoading,
        isError: isResourceListError,
        refetch: refetchResources,
    } = useQuery({
        queryKey: ['learning-resources', 'admin'],
        queryFn: () => learningResourceApi.adminList(),
    });
    const resources = resourcePage?.content;

    const { data: categories } = useQuery({
        queryKey: ['learningResourceCategories'],
        queryFn: learningResourceApi.categories,
    });
    const { data: skillsList } = useQuery({ queryKey: ['skills'], queryFn: () => skillApi.list() });

    const [viewMode, setViewMode] = useState<LearningResourceViewMode>('LIST');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<LearningResourceForm>(emptyLearningResourceForm);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [previousId, setPreviousId] = useState<number | null>(null);

    const syncUrlState = useCallback(
        (
            id: number | null,
            action?: 'edit' | 'new',
            options?: { history?: 'push' | 'replace'; fromId?: number | null }
        ) => {
            if (id !== null) {
                setSelectedId(id);
                if (action === 'edit') {
                    setIsFormOpen(true);
                    setEditingId(id);
                } else {
                    setIsFormOpen(false);
                    setEditingId(null);
                }
            } else if (action === 'new') {
                setSelectedId(null);
                setIsFormOpen(true);
                setEditingId(null);
            } else {
                setSelectedId(null);
                setIsFormOpen(false);
                setEditingId(null);
            }

            const fromId = options?.fromId ?? null;
            setPreviousId(fromId);

            if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.set('tab', 'LEARNING_RESOURCES');
                if (id) {
                    url.searchParams.set('resourceId', id.toString());
                } else {
                    url.searchParams.delete('resourceId');
                }
                if (action) {
                    url.searchParams.set('action', action);
                } else {
                    url.searchParams.delete('action');
                }
                if (fromId !== null) {
                    url.searchParams.set('fromResourceId', fromId.toString());
                } else {
                    url.searchParams.delete('fromResourceId');
                }

                const nextUrl = url.pathname + url.search;
                if (options?.history === 'push') {
                    window.history.pushState(null, '', nextUrl);
                } else {
                    window.history.replaceState(null, '', nextUrl);
                }
            }
        },
        []
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncFromUrl = () => {
            const params = new URLSearchParams(window.location.search);
            const idParam = params.get('resourceId');
            const actionParam = params.get('action');
            const fromIdParam = params.get('fromResourceId');
            const parsedFromId = fromIdParam ? Number(fromIdParam) : NaN;

            setPreviousId(Number.isFinite(parsedFromId) ? parsedFromId : null);

            if (idParam) {
                const parsedId = Number(idParam);
                if (!Number.isNaN(parsedId)) {
                    setSelectedId(parsedId);
                    if (actionParam === 'edit') {
                        setIsFormOpen(true);
                        setEditingId(parsedId);
                    } else {
                        setIsFormOpen(false);
                        setEditingId(null);
                    }
                    return;
                }
            }

            if (actionParam === 'new') {
                setIsFormOpen(true);
                setEditingId(null);
                setSelectedId(null);
                return;
            }

            setSelectedId(null);
            setIsFormOpen(false);
            setEditingId(null);
        };

        syncFromUrl();
        window.addEventListener('popstate', syncFromUrl);
        return () => window.removeEventListener('popstate', syncFromUrl);
    }, []);

    const [relatedResourceSearch, setRelatedResourceSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | LearningResourceStatus>('ALL');
    const [priorityFilter, setPriorityFilter] = useState<'ALL' | LearningResourcePriorityTier>(
        'ALL'
    );
    const [search, setSearch] = useState('');

    const counts = useMemo(() => {
        const total = resources?.length ?? 0;
        const byStatus = statusOptions.reduce<Record<string, number>>((acc, option) => {
            acc[option.value] = resources?.filter((r) => r.status === option.value).length ?? 0;
            return acc;
        }, {});
        return { total, byStatus };
    }, [resources]);

    const filteredResources = useMemo(() => {
        return resources?.filter((resource) => {
            const matchesCategory =
                categoryFilter === 'ALL' || resource.category.slug === categoryFilter;
            const matchesStatus = statusFilter === 'ALL' || resource.status === statusFilter;
            const matchesPriority =
                priorityFilter === 'ALL' || resource.priorityTier === priorityFilter;
            const matchesSearch =
                !search ||
                resource.title.toLowerCase().includes(search.toLowerCase()) ||
                (resource.provider ?? '').toLowerCase().includes(search.toLowerCase()) ||
                (resource.instructorOrAuthor ?? '').toLowerCase().includes(search.toLowerCase()) ||
                resource.tags.some((tag) => tag.name.toLowerCase().includes(search.toLowerCase()));
            return matchesCategory && matchesStatus && matchesPriority && matchesSearch;
        });
    }, [resources, categoryFilter, statusFilter, priorityFilter, search]);

    const selectableRelatedResources = (resources ?? []).filter(
        (resource) =>
            resource.id !== editingId &&
            (!relatedResourceSearch ||
                resource.title.toLowerCase().includes(relatedResourceSearch.toLowerCase()))
    );

    const createMutation = useMutation({
        mutationFn: (payload: LearningResourceRequest) => learningResourceApi.create(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['learning-resources'] });
            setForm(emptyLearningResourceForm);
            syncUrlState(null);
        },
        onError: handleMutationError,
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: LearningResourceRequest }) =>
            learningResourceApi.update(id, payload),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ['learning-resources'] });
            setForm(emptyLearningResourceForm);
            syncUrlState(updated.id);
        },
        onError: handleMutationError,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => learningResourceApi.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['learning-resources'] });
            syncUrlState(null);
        },
        onError: handleMutationError,
    });

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const payload = toLearningResourceRequest(form);
        if (editingId !== null) {
            updateMutation.mutate({ id: editingId, payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const openNewForm = () => {
        setForm({
            ...emptyLearningResourceForm,
            categoryId: categories?.[0]?.id ?? 1,
        });
        syncUrlState(null, 'new', { history: 'push' });
    };

    const openEditForm = (resource: LearningResource) => {
        setForm({
            slug: resource.slug,
            title: resource.title,
            resourceType: resource.resourceType,
            provider: resource.provider ?? '',
            url: resource.url ?? '',
            instructorOrAuthor: resource.instructorOrAuthor ?? '',
            durationMinutes: resource.durationMinutes,
            status: resource.status,
            priorityTier: resource.priorityTier,
            displayOrder: resource.displayOrder,
            categoryId: resource.category.id,
            summary: resource.summary ?? '',
            detailMarkdown: resource.detailMarkdown ?? '',
            tagNames: resource.tags.map((tag) => tag.name).join(', '),
            skillIds: resource.skills.map((skill) => skill.id),
            relatedResources: resource.relatedResources.map((related) => ({
                resourceId: related.id,
                type: related.type,
            })),
        });
        syncUrlState(resource.id, 'edit', { history: 'push' });
    };

    const handleOpenResourceFromMindmap = (id: number) => {
        const resource = resources?.find((r) => r.id === id);
        if (resource) openEditForm(resource);
    };

    const handleDelete = (id: number) => {
        if (window.confirm('정말 이 학습 자료를 삭제하시겠습니까?')) {
            deleteMutation.mutate(id);
        }
    };

    const selectedResource = resources?.find((r) => r.id === selectedId);
    const previousResource = resources?.find((r) => r.id === previousId);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                    <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
                        <GraduationCap className="h-5 w-5" />
                        학습 자료 관리
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        보유 강의·책·오프라인 학습자료의 카탈로그를 관리합니다.
                    </p>
                </div>
                {!isFormOpen && (
                    <button
                        onClick={openNewForm}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                    >
                        <Plus className="h-4 w-4" />새 학습 자료
                    </button>
                )}
            </div>

            {isFormOpen ? (
                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                    <h3 className="text-base font-black text-slate-800">
                        {editingId !== null ? '학습 자료 수정' : '새 학습 자료 추가'}
                    </h3>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                제목
                            </label>
                            <input
                                type="text"
                                required
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                유형
                            </label>
                            <select
                                value={form.resourceType}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        resourceType: e.target.value as LearningResourceType,
                                    })
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            >
                                {resourceTypeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                카테고리
                            </label>
                            <select
                                value={form.categoryId}
                                onChange={(e) =>
                                    setForm({ ...form, categoryId: Number(e.target.value) })
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            >
                                {(categories ?? []).map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                제공처
                            </label>
                            <input
                                type="text"
                                placeholder="예: 인프런"
                                value={form.provider ?? ''}
                                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                강사/저자
                            </label>
                            <input
                                type="text"
                                value={form.instructorOrAuthor ?? ''}
                                onChange={(e) =>
                                    setForm({ ...form, instructorOrAuthor: e.target.value })
                                }
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                러닝타임(분)
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={form.durationMinutes ?? ''}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        durationMinutes: e.target.value
                                            ? Number(e.target.value)
                                            : undefined,
                                    })
                                }
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            URL
                        </label>
                        <input
                            type="url"
                            placeholder="https://..."
                            value={form.url ?? ''}
                            onChange={(e) => setForm({ ...form, url: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                진행 상태
                            </label>
                            <select
                                value={form.status}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        status: e.target.value as LearningResourceStatus,
                                    })
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            >
                                {statusOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                우선순위
                            </label>
                            <select
                                value={form.priorityTier ?? ''}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        priorityTier: e.target.value
                                            ? (e.target.value as LearningResourcePriorityTier)
                                            : undefined,
                                    })
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            >
                                <option value="">미지정</option>
                                {priorityOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                정렬 순서
                            </label>
                            <input
                                type="number"
                                value={form.displayOrder}
                                onChange={(e) =>
                                    setForm({ ...form, displayOrder: Number(e.target.value) })
                                }
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            요약
                        </label>
                        <textarea
                            rows={2}
                            value={form.summary ?? ''}
                            onChange={(e) => setForm({ ...form, summary: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            상세 내용 (마크다운)
                        </label>
                        <MarkdownEditor
                            value={form.detailMarkdown ?? ''}
                            onChange={(value) => setForm({ ...form, detailMarkdown: value })}
                        />
                    </div>

                    <TagInput
                        value={form.tagNames}
                        onChange={(value) => setForm({ ...form, tagNames: value })}
                        placeholder="예: Redis, 캐시전략"
                    />

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                            <SkillPicker
                                skills={skillsList ?? []}
                                selectedIds={form.skillIds}
                                onChange={(ids) => setForm({ ...form, skillIds: ids })}
                                label="관련 기술 스택"
                                searchPlaceholder="기술명 검색"
                                variant="boxed"
                            />
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                관련 학습 자료 · {form.relatedResources.length}개
                            </label>
                            <input
                                type="search"
                                value={relatedResourceSearch}
                                onChange={(e) => setRelatedResourceSearch(e.target.value)}
                                placeholder="제목 검색"
                                className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-800"
                            />
                            <div className="max-h-48 space-y-1.5 overflow-auto">
                                {selectableRelatedResources.map((resource) => {
                                    const existing = form.relatedResources.find(
                                        (r) => r.resourceId === resource.id
                                    );
                                    return (
                                        <div
                                            key={resource.id}
                                            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={Boolean(existing)}
                                                onChange={() =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        relatedResources: existing
                                                            ? current.relatedResources.filter(
                                                                  (r) =>
                                                                      r.resourceId !== resource.id
                                                              )
                                                            : [
                                                                  ...current.relatedResources,
                                                                  {
                                                                      resourceId: resource.id,
                                                                      type: 'RELATED',
                                                                  },
                                                              ],
                                                    }))
                                                }
                                                className="mt-0.5"
                                            />
                                            <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">
                                                {resource.title}
                                            </span>
                                            {existing && (
                                                <select
                                                    value={existing.type}
                                                    onChange={(e) =>
                                                        setForm((current) => ({
                                                            ...current,
                                                            relatedResources:
                                                                current.relatedResources.map((r) =>
                                                                    r.resourceId === resource.id
                                                                        ? {
                                                                              ...r,
                                                                              type: e.target
                                                                                  .value as LearningResourceRelationType,
                                                                          }
                                                                        : r
                                                                ),
                                                        }))
                                                    }
                                                    className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px]"
                                                >
                                                    {relationTypeOptions.map((option) => (
                                                        <option
                                                            key={option.value}
                                                            value={option.value}
                                                        >
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => syncUrlState(selectedId, undefined, { history: 'push' })}
                            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
                        >
                            {editingId !== null ? '수정 완료' : '추가 완료'}
                        </button>
                    </div>
                </form>
            ) : selectedResource ? (
                <LearningResourceDetailPanel
                    resource={selectedResource}
                    backLabel={
                        previousResource ? `${previousResource.title}로 돌아가기` : '목록으로'
                    }
                    onBack={() =>
                        previousResource
                            ? syncUrlState(previousResource.id, undefined, { history: 'push' })
                            : syncUrlState(null, undefined, { history: 'push' })
                    }
                    onEdit={openEditForm}
                    onDelete={handleDelete}
                    onSelectResource={(id) =>
                        syncUrlState(id, undefined, {
                            history: 'push',
                            fromId: selectedResource.id,
                        })
                    }
                />
            ) : (
                <>
                    <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                        <button
                            type="button"
                            onClick={() => setViewMode('LIST')}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                                viewMode === 'LIST'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <ListIcon className="h-3.5 w-3.5" />
                            리스트
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('MINDMAP')}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                                viewMode === 'MINDMAP'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <Network className="h-3.5 w-3.5" />
                            마인드맵
                        </button>
                    </div>

                    {viewMode === 'MINDMAP' ? (
                        <LearningResourceMindmap onOpenResource={handleOpenResourceFromMindmap} />
                    ) : (
                        <>
                            <div className="sticky top-14 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        onClick={() => setCategoryFilter('ALL')}
                                        className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${categoryFilter === 'ALL' ? 'bg-slate-900 text-white shadow-sm' : 'border border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                                    >
                                        전체 카테고리
                                    </button>
                                    {(categories ?? []).map((category) => (
                                        <button
                                            key={category.id}
                                            onClick={() => setCategoryFilter(category.slug)}
                                            className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${categoryFilter === category.slug ? 'bg-slate-900 text-white shadow-sm' : 'border border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                                        >
                                            {category.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="w-full sm:w-64">
                                    <input
                                        type="text"
                                        placeholder="제목/제공처/강사/태그 검색..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm transition focus:border-slate-800 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-sm">
                                <span className="font-black text-slate-400">현재 결과</span>
                                <span className="rounded bg-slate-900 px-2 py-1 font-black text-white">
                                    전체 {counts.total}
                                </span>
                                {statusOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() =>
                                            setStatusFilter((current) =>
                                                current === option.value ? 'ALL' : option.value
                                            )
                                        }
                                        className={`border-l border-slate-200 pl-3 font-bold transition ${statusFilter === option.value ? 'text-slate-950' : 'text-slate-500 hover:text-slate-800'}`}
                                    >
                                        {option.label}{' '}
                                        <b className="text-slate-900">
                                            {counts.byStatus[option.value] ?? 0}
                                        </b>
                                    </button>
                                ))}
                                <span className="ml-auto flex items-center gap-1.5">
                                    {priorityOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() =>
                                                setPriorityFilter((current) =>
                                                    current === option.value ? 'ALL' : option.value
                                                )
                                            }
                                            className={`rounded px-2 py-1 text-[11px] font-black transition ${priorityFilter === option.value ? priorityStyles[option.value] : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                        >
                                            {option.value}
                                        </button>
                                    ))}
                                </span>
                            </div>

                            {isResourceListLoading ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-400">
                                    불러오는 중...
                                </div>
                            ) : isResourceListError ? (
                                <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-14 text-center">
                                    <p className="text-sm font-bold text-red-600">
                                        목록을 불러오지 못했습니다.
                                    </p>
                                    <button
                                        onClick={() => refetchResources()}
                                        className="mt-2 text-xs font-bold text-red-500 underline"
                                    >
                                        다시 시도
                                    </button>
                                </div>
                            ) : filteredResources && filteredResources.length > 0 ? (
                                <div className="space-y-2">
                                    {filteredResources.map((resource) => (
                                        <div
                                            key={resource.id}
                                            className="flex cursor-pointer items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
                                            onClick={() =>
                                                syncUrlState(resource.id, undefined, {
                                                    history: 'push',
                                                })
                                            }
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    <span>{resource.category.name}</span>
                                                    <span
                                                        className={`rounded px-1.5 py-0.5 ${statusStyles[resource.status] ?? 'bg-slate-100 text-slate-600'}`}
                                                    >
                                                        {statusOptions.find(
                                                            (o) => o.value === resource.status
                                                        )?.label ?? resource.status}
                                                    </span>
                                                    {resource.priorityTier && (
                                                        <span
                                                            className={`rounded px-1.5 py-0.5 ${priorityStyles[resource.priorityTier]}`}
                                                        >
                                                            {resource.priorityTier}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 truncate text-sm font-bold text-slate-800">
                                                    {resource.title}
                                                </p>
                                                {resource.provider && (
                                                    <p className="mt-0.5 truncate text-xs text-slate-400">
                                                        {resource.provider}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditForm(resource);
                                                    }}
                                                    className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-950"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(resource.id);
                                                    }}
                                                    className="rounded-lg border border-red-100 bg-white p-2 text-red-500 transition hover:border-red-200 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                                    <p className="text-sm font-black text-slate-600">
                                        조건에 맞는 학습 자료가 없습니다.
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        필터나 검색어를 변경하거나 새 자료를 추가해보세요.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}
