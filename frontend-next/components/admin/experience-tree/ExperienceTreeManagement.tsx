'use client';

import { useDeferredValue, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Columns3, ExternalLink, Link2, Pencil, Search, Trash2, X } from 'lucide-react';
import { experienceTreeApi, studyApi } from '@/lib/api';
import type {
    DecisionDomain,
    DecisionStudyLinkRequest,
    DecisionStudyRelationType,
    ExperienceTreeSituationSummary,
    StudySection,
} from '@/lib/api/types';
import { ExperienceTreeCatalogDetail } from './ExperienceTreeCatalogDetail';
import { categoryBreadcrumb } from '@/lib/experienceTreeTaxonomy';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';

const DOMAINS: Array<{ value: DecisionDomain | 'ALL'; label: string }> = [
    { value: 'ALL', label: '전체' },
    { value: 'BACKEND', label: 'Backend' },
    { value: 'INFRASTRUCTURE', label: 'Infrastructure' },
    { value: 'ARCHITECTURE', label: 'Architecture' },
    { value: 'FRONTEND', label: 'Frontend' },
];

const RELATIONS: Array<{ value: DecisionStudyRelationType; label: string }> = [
    { value: 'EXPLAINS', label: '개념 설명' },
    { value: 'DEEP_DIVES', label: '심화 학습' },
    { value: 'APPLIED', label: '실제 적용' },
    { value: 'VALIDATED', label: '유효성 확인' },
    { value: 'FAILED', label: '적용 실패' },
    { value: 'REPLACED', label: '다른 선택지로 교체' },
    { value: 'RETROSPECT', label: '경험 회고' },
    { value: 'COUNTER_EXAMPLE', label: '반례' },
];

export function ExperienceTreeManagement({ workspaceSlug }: { workspaceSlug: string }) {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [domain, setDomain] = useState<DecisionDomain | 'ALL'>('ALL');
    const [workspaceMode, setWorkspaceMode] = useState<'CATALOG' | 'BOARD' | 'LINKS'>('CATALOG');
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [studySearch, setStudySearch] = useState('');
    const deferredStudySearch = useDeferredValue(studySearch);
    const [editingLinkId, setEditingLinkId] = useState<number | null>(null);
    const [form, setForm] = useState<DecisionStudyLinkRequest>({
        situationKey: '',
        optionKey: null,
        studyId: 0,
        relationType: 'RETROSPECT',
        note: '',
        displayOrder: 0,
    });

    const { data: index } = useQuery({
        queryKey: ['experience-tree', workspaceSlug, 'manage-index'],
        queryFn: () => experienceTreeApi.workspaceManageIndex(workspaceSlug),
        staleTime: 60 * 60 * 1000,
    });
    const activeKey = selectedKey ?? index?.situations[0]?.stableKey ?? null;
    const { data: detail } = useQuery({
        queryKey: ['experience-tree', workspaceSlug, 'manage-detail', activeKey],
        queryFn: () => experienceTreeApi.workspaceManageDetail(workspaceSlug, activeKey!),
        enabled: Boolean(activeKey),
    });
    const { data: studyPage } = useQuery({
        queryKey: ['studies', workspaceSlug, 'experience-tree-links', deferredStudySearch],
        queryFn: () =>
            studyApi.workspaceAdminList(workspaceSlug, {
                q: deferredStudySearch || undefined,
            }),
    });

    const situations = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return (index?.situations ?? []).filter(
            (item) =>
                (domain === 'ALL' || item.domain === domain) &&
                (!keyword ||
                    item.title.toLowerCase().includes(keyword) ||
                    item.summary.toLowerCase().includes(keyword) ||
                    item.topic.toLowerCase().includes(keyword))
        );
    }, [domain, index, search]);
    const domainCounts = useMemo(
        () =>
            Object.fromEntries(
                DOMAINS.map(({ value }) => [
                    value,
                    value === 'ALL'
                        ? (index?.situations.length ?? 0)
                        : (index?.situations.filter((item) => item.domain === value).length ?? 0),
                ])
            ) as Record<DecisionDomain | 'ALL', number>,
        [index]
    );
    const studies = useMemo(() => {
        return studyPage?.content ?? [];
    }, [studyPage]);
    const qualityStats = useMemo(() => {
        const items = index?.situations ?? [];
        const today = new Date().toISOString().slice(0, 10);
        return {
            total: items.length,
            noStudy: items.filter((item) => item.studyCount === 0).length,
            reviewDue: items.filter((item) => item.nextReviewAt && item.nextReviewAt <= today)
                .length,
            warnings: items.reduce((sum, item) => sum + item.warningCount, 0),
        };
    }, [index]);

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['experience-tree', workspaceSlug] });
    };
    const createMutation = useMutation({
        mutationFn: (payload: DecisionStudyLinkRequest) =>
            experienceTreeApi.workspaceCreateStudyLink(workspaceSlug, payload),
        onSuccess: invalidate,
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: DecisionStudyLinkRequest }) =>
            experienceTreeApi.workspaceUpdateStudyLink(workspaceSlug, id, payload),
        onSuccess: () => {
            invalidate();
            setEditingLinkId(null);
        },
    });
    const deleteMutation = useMutation({
        mutationFn: (id: number) => experienceTreeApi.workspaceRemoveStudyLink(workspaceSlug, id),
        onSuccess: invalidate,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!activeKey || !form.studyId) return;
        const payload = { ...form, situationKey: activeKey };
        if (editingLinkId) updateMutation.mutate({ id: editingLinkId, payload });
        else createMutation.mutate(payload);
    };

    return (
        <div className="space-y-5">
            <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <AdminPageHeader
                    headingAs="h1"
                    eyebrow="원본 기록"
                    title="개발자 온톨로지 관리"
                    description="정적 기술 상황에 Fundamental·Advanced·Retrospect 학습 기록을 연결합니다."
                    actions={
                        <Link
                            href={`/workspace/${encodeURIComponent(workspaceSlug)}/ontology`}
                            target="_blank"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        >
                            공개 시각화 열기 <ExternalLink className="h-4 w-4" />
                        </Link>
                    }
                />
                <div className="mt-5 flex w-fit rounded-xl bg-slate-100 p-1">
                    {(
                        [
                            ['CATALOG', '카탈로그 탐색'],
                            ['BOARD', '관리 보드'],
                            ['LINKS', 'Study 연결'],
                        ] as const
                    ).map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setWorkspaceMode(value)}
                            className={`rounded-lg px-4 py-2 text-sm font-bold ${workspaceMode === value ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {(
                        [
                            ['전체 상황', qualityStats.total, 'text-slate-950'],
                            ['Study 미연결', qualityStats.noStudy, 'text-amber-700'],
                            ['재검토 기한 경과', qualityStats.reviewDue, 'text-rose-700'],
                            ['오답·경고', qualityStats.warnings, 'text-rose-700'],
                        ] as const
                    ).map(([label, value, tone]) => (
                        <div
                            key={label}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                        >
                            <p className="text-[10px] font-black uppercase text-slate-400">
                                {label}
                            </p>
                            <p className={`mt-1 text-xl font-black ${tone}`}>{value}</p>
                        </div>
                    ))}
                </div>
            </header>
            <div className="grid min-h-[680px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <label className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="상황 검색"
                            className="min-w-0 flex-1 text-sm outline-none"
                        />
                    </label>
                    <div className="mb-4 grid grid-cols-2 gap-1.5">
                        {DOMAINS.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => setDomain(item.value)}
                                className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-[11px] font-bold ${domain === item.value ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                            >
                                <span>{item.label}</span>
                                <span className="opacity-70">{domainCounts[item.value]}</span>
                            </button>
                        ))}
                    </div>
                    <p className="mb-2 text-[11px] font-bold text-slate-400">
                        검색 결과 {situations.length}개
                    </p>
                    <div className="space-y-1">
                        {situations.map((item) => (
                            <button
                                key={item.stableKey}
                                type="button"
                                onClick={() => {
                                    setSelectedKey(item.stableKey);
                                    setForm((current) => ({ ...current, optionKey: null }));
                                }}
                                className={`w-full rounded-xl px-3 py-3 text-left ${activeKey === item.stableKey ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                            >
                                <p className="text-[10px] font-black uppercase opacity-60">
                                    {categoryBreadcrumb(item).join(' › ')} ·{' '}
                                    {item.verificationStatus}
                                </p>
                                <p className="mt-1 text-sm font-bold">{item.title}</p>
                            </button>
                        ))}
                    </div>
                </aside>
                <main className="space-y-4">
                    {workspaceMode === 'BOARD' ? (
                        <AdminCurationBoard
                            situations={situations}
                            onSelect={(key) => {
                                setSelectedKey(key);
                                setWorkspaceMode('CATALOG');
                            }}
                        />
                    ) : !detail ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
                            상황을 선택해주세요.
                        </div>
                    ) : (
                        <>
                            {workspaceMode === 'CATALOG' ? (
                                <ExperienceTreeCatalogDetail detail={detail} />
                            ) : (
                                <>
                                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                        <p className="text-xs font-black uppercase text-blue-600">
                                            {detail.domain} · {detail.topic}
                                        </p>
                                        <h2 className="mt-2 text-xl font-black text-slate-950">
                                            {detail.title}
                                        </h2>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">
                                            {detail.summary}
                                        </p>
                                    </section>
                                    <form
                                        onSubmit={submit}
                                        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                                    >
                                        <h3 className="mb-4 flex items-center gap-2 font-black text-slate-900">
                                            <Link2 className="h-4 w-4" />
                                            {editingLinkId ? 'Study 연결 수정' : 'Study 연결 추가'}
                                        </h3>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <label className="text-xs font-bold text-slate-500">
                                                선택지
                                                <select
                                                    value={form.optionKey ?? ''}
                                                    onChange={(event) =>
                                                        setForm({
                                                            ...form,
                                                            optionKey: event.target.value || null,
                                                        })
                                                    }
                                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                                >
                                                    <option value="">상황 전체</option>
                                                    {detail.options.map((option) => (
                                                        <option
                                                            key={option.stableKey}
                                                            value={option.stableKey}
                                                        >
                                                            {option.title}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="text-xs font-bold text-slate-500">
                                                관계
                                                <select
                                                    value={form.relationType}
                                                    onChange={(event) =>
                                                        setForm({
                                                            ...form,
                                                            relationType: event.target
                                                                .value as DecisionStudyRelationType,
                                                        })
                                                    }
                                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                                >
                                                    {RELATIONS.map((item) => (
                                                        <option key={item.value} value={item.value}>
                                                            {item.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                        </div>
                                        <label className="mt-3 block text-xs font-bold text-slate-500">
                                            Study 검색
                                            <input
                                                value={studySearch}
                                                onChange={(event) =>
                                                    setStudySearch(event.target.value)
                                                }
                                                placeholder="제목 또는 요약"
                                                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none"
                                            />
                                        </label>
                                        <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-2">
                                            {studies.map((study) => (
                                                <label
                                                    key={study.id}
                                                    className={`flex cursor-pointer items-start gap-3 rounded-lg p-2.5 ${form.studyId === study.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="study"
                                                        checked={form.studyId === study.id}
                                                        onChange={() =>
                                                            setForm({ ...form, studyId: study.id })
                                                        }
                                                        className="mt-1"
                                                    />
                                                    <span>
                                                        <span
                                                            className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-black ${sectionStyle(study.section)}`}
                                                        >
                                                            {study.section}
                                                        </span>
                                                        <span className="text-sm font-bold text-slate-900">
                                                            {study.title}
                                                        </span>
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                        <label className="mt-3 block text-xs font-bold text-slate-500">
                                            연결 메모
                                            <textarea
                                                value={form.note ?? ''}
                                                onChange={(event) =>
                                                    setForm({ ...form, note: event.target.value })
                                                }
                                                rows={2}
                                                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                                            />
                                        </label>
                                        {createMutation.isError && (
                                            <p className="mt-2 text-xs font-bold text-rose-600">
                                                연결할 수 없습니다. 회고 관계는 RETROSPECT Study만
                                                사용할 수 있습니다.
                                            </p>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={
                                                !form.studyId ||
                                                createMutation.isPending ||
                                                updateMutation.isPending
                                            }
                                            className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                                        >
                                            {createMutation.isPending || updateMutation.isPending
                                                ? '저장 중...'
                                                : editingLinkId
                                                  ? '연결 수정'
                                                  : 'Study 연결'}
                                        </button>
                                        {editingLinkId && (
                                            <button
                                                type="button"
                                                onClick={() => setEditingLinkId(null)}
                                                className="ml-2 inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600"
                                            >
                                                <X className="h-4 w-4" /> 취소
                                            </button>
                                        )}
                                    </form>
                                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                        <h3 className="mb-4 flex items-center gap-2 font-black text-slate-900">
                                            <BookOpen className="h-4 w-4" />
                                            연결된 Study
                                        </h3>
                                        {detail.studies.length === 0 ? (
                                            <p className="text-sm text-slate-400">
                                                연결된 Study가 없습니다.
                                            </p>
                                        ) : (
                                            <div className="space-y-2">
                                                {detail.studies.map((link) => (
                                                    <div
                                                        key={link.linkId}
                                                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                                                    >
                                                        <div>
                                                            <p className="text-xs font-black text-blue-600">
                                                                {link.section} · {link.relationType}
                                                                {link.managedByCatalog &&
                                                                    ' · 정적 카탈로그'}
                                                            </p>
                                                            <p className="mt-1 text-sm font-bold text-slate-900">
                                                                {link.title}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {link.optionKey
                                                                    ? detail.options.find(
                                                                          (option) =>
                                                                              option.stableKey ===
                                                                              link.optionKey
                                                                      )?.title
                                                                    : '상황 전체'}
                                                            </p>
                                                        </div>
                                                        {!link.managedByCatalog && (
                                                            <div className="flex gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingLinkId(
                                                                            link.linkId
                                                                        );
                                                                        setForm({
                                                                            situationKey:
                                                                                activeKey ?? '',
                                                                            optionKey:
                                                                                link.optionKey ??
                                                                                null,
                                                                            studyId: link.studyId,
                                                                            relationType:
                                                                                link.relationType,
                                                                            note: link.note,
                                                                            displayOrder: 0,
                                                                        });
                                                                    }}
                                                                    className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                                                                    title="연결 수정"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        deleteMutation.mutate(
                                                                            link.linkId
                                                                        )
                                                                    }
                                                                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                                                    title="연결 삭제"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                </>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

function AdminCurationBoard({
    situations,
    onSelect,
}: {
    situations: ExperienceTreeSituationSummary[];
    onSelect: (key: string) => void;
}) {
    const columns = [
        {
            key: 'UNLINKED',
            title: 'Study 미연결',
            description: '실제 학습·경험 근거를 연결해야 합니다.',
            tone: 'border-amber-200 bg-amber-50/60',
            items: situations.filter((item) => item.studyCount === 0),
        },
        {
            key: 'STARTED',
            title: '근거 축적 중',
            description: 'Study 1개가 연결된 상태입니다.',
            tone: 'border-blue-200 bg-blue-50/60',
            items: situations.filter((item) => item.studyCount === 1),
        },
        {
            key: 'VALIDATED',
            title: '다중 검증',
            description: '두 개 이상의 Study·회고로 검증된 상태입니다.',
            tone: 'border-emerald-200 bg-emerald-50/60',
            items: situations.filter((item) => item.studyCount >= 2),
        },
    ];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
                <Columns3 className="h-5 w-5 text-slate-700" />
                <div>
                    <h2 className="font-black text-slate-950">온톨로지 큐레이션 보드</h2>
                    <p className="text-xs text-slate-500">
                        공개용 탐색 방식이 아니라 Study 근거 연결 상태를 관리하는 작업 화면입니다.
                    </p>
                </div>
            </div>
            <div className="grid gap-3 2xl:grid-cols-3">
                {columns.map((column) => (
                    <div key={column.key} className={`rounded-xl border p-3 ${column.tone}`}>
                        <div className="mb-3">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="text-sm font-black text-slate-900">
                                    {column.title}
                                </h3>
                                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-600">
                                    {column.items.length}
                                </span>
                            </div>
                            <p className="mt-1 text-[11px] leading-5 text-slate-600">
                                {column.description}
                            </p>
                        </div>
                        <div className="max-h-[560px] space-y-2 overflow-y-auto">
                            {column.items.map((item) => (
                                <button
                                    key={item.stableKey}
                                    type="button"
                                    onClick={() => onSelect(item.stableKey)}
                                    className="w-full rounded-xl border border-white bg-white p-3 text-left shadow-sm transition hover:border-blue-300"
                                >
                                    <p className="text-[9px] font-black uppercase text-slate-400">
                                        {categoryBreadcrumb(item).join(' › ')}
                                    </p>
                                    <p className="mt-1 text-xs font-bold leading-5 text-slate-900">
                                        {item.title}
                                    </p>
                                    <p className="mt-2 text-[10px] font-bold text-slate-400">
                                        Study {item.studyCount} · 경고 {item.warningCount}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function sectionStyle(section: StudySection) {
    if (section === 'RETROSPECT') return 'bg-amber-100 text-amber-800';
    if (section === 'ADVANCED') return 'bg-purple-100 text-purple-800';
    if (section === 'FUNDAMENTAL') return 'bg-blue-100 text-blue-800';
    return 'bg-slate-100 text-slate-700';
}
