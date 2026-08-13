'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    BriefcaseBusiness,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Database,
    ExternalLink,
    LayoutGrid,
    List as ListIcon,
    Plus,
    Search,
    Sparkles,
    Trash2,
    X,
} from 'lucide-react';
import { jobPostingApi } from '@/lib/api';
import { WorkspacePrivateJobImport } from './WorkspacePrivateJobImport';
import type {
    JobPosting,
    JobPostingCatalogItem,
    JobPostingCoverLetterItem,
    JobPostingCoverLetterItemRequest,
    JobPostingStatus,
    WorkspaceJobApplicationRequest,
} from '@/lib/api/types';

const STATUS_OPTIONS: Array<{ value: JobPostingStatus; label: string }> = [
    { value: 'NEW', label: '검토 전' },
    { value: 'SAVED', label: '관심 공고' },
    { value: 'APPLIED', label: '지원 완료' },
    { value: 'CODING_TEST', label: '코딩 테스트' },
    { value: 'ASSIGNMENT', label: '과제 전형' },
    { value: 'APTITUDE_TEST', label: '인적성 검사' },
    { value: 'INTERVIEW_1', label: '1차 면접' },
    { value: 'INTERVIEW_2', label: '2차 면접' },
    { value: 'FINAL_INTERVIEW', label: '최종 면접' },
    { value: 'OFFER', label: '합격' },
    { value: 'REJECTED', label: '불합격' },
    { value: 'WITHDRAWN', label: '지원 포기' },
    { value: 'DISMISSED', label: '제외' },
    { value: 'EXPIRED', label: '마감' },
];

type EditorState = {
    posting: JobPosting;
    status: JobPostingStatus;
    appliedAt: string;
    memo: string;
    interestLevel: number | '';
    matchScore: number | '';
    matchReason: string;
};

type WorkspaceViewMode = 'LIST' | 'BOARD' | 'CALENDAR';
type CatalogSourceMode = 'SHARED' | 'URL' | 'MANUAL' | 'SCREENSHOT';

const BOARD_COLUMNS: Array<{
    id: string;
    label: string;
    statuses: JobPostingStatus[];
}> = [
    { id: 'REVIEW', label: '검토·관심', statuses: ['NEW', 'SAVED'] },
    {
        id: 'PROCESS',
        label: '지원·전형',
        statuses: ['APPLIED', 'CODING_TEST', 'ASSIGNMENT', 'APTITUDE_TEST'],
    },
    {
        id: 'INTERVIEW',
        label: '면접',
        statuses: ['INTERVIEW_1', 'INTERVIEW_2', 'FINAL_INTERVIEW'],
    },
    {
        id: 'CLOSED',
        label: '결과·종료',
        statuses: ['OFFER', 'REJECTED', 'WITHDRAWN', 'DISMISSED', 'EXPIRED'],
    },
];

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const toPayload = (editor: EditorState): WorkspaceJobApplicationRequest => ({
    status: editor.status,
    appliedAt: editor.appliedAt || null,
    memo: editor.memo || null,
    interestLevel: editor.interestLevel === '' ? null : editor.interestLevel,
    matchScore: editor.matchScore === '' ? null : editor.matchScore,
    matchReason: editor.matchReason || null,
});

export function WorkspaceJobApplicationManagement({ workspaceSlug }: { workspaceSlug: string }) {
    const queryClient = useQueryClient();
    const [mode, setMode] = useState<'MINE' | 'CATALOG'>('MINE');
    const [catalogSourceMode, setCatalogSourceMode] = useState<CatalogSourceMode>('SHARED');
    const [viewMode, setViewMode] = useState<WorkspaceViewMode>('LIST');
    const [statusFilter, setStatusFilter] = useState<'ALL' | JobPostingStatus>('ALL');
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [search, setSearch] = useState('');
    const [editor, setEditor] = useState<EditorState | null>(null);
    const mineKey = ['job-applications', 'workspace', workspaceSlug];
    const catalogKey = ['job-applications', 'catalog', workspaceSlug];

    const { data: applications = [], isLoading: applicationsLoading } = useQuery({
        queryKey: mineKey,
        queryFn: () => jobPostingApi.workspaceList(workspaceSlug),
    });
    const { data: catalog = [], isLoading: catalogLoading } = useQuery({
        queryKey: catalogKey,
        queryFn: () => jobPostingApi.workspaceCatalog(workspaceSlug),
    });
    const { data: statusEvents = [] } = useQuery({
        queryKey: ['job-applications', workspaceSlug, editor?.posting.id, 'status-events'],
        queryFn: () => jobPostingApi.workspaceStatusEvents(workspaceSlug, editor!.posting.id),
        enabled: editor !== null,
    });
    const { data: coverLetterItems = [] } = useQuery({
        queryKey: ['job-applications', workspaceSlug, editor?.posting.id, 'cover-letter-items'],
        queryFn: () => jobPostingApi.workspaceCoverLetterItems(workspaceSlug, editor!.posting.id),
        enabled: editor !== null,
    });

    const invalidate = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: mineKey }),
            queryClient.invalidateQueries({ queryKey: catalogKey }),
        ]);
    };

    const saveMutation = useMutation({
        mutationFn: (posting: JobPostingCatalogItem) =>
            jobPostingApi.workspaceSave(workspaceSlug, posting.id, {
                status: 'NEW',
                appliedAt: null,
                memo: null,
                interestLevel: 3,
                matchScore: null,
                matchReason: null,
            }),
        onSuccess: async () => {
            await invalidate();
            setMode('MINE');
        },
    });
    const updateMutation = useMutation({
        mutationFn: (value: EditorState) =>
            jobPostingApi.workspaceUpdate(workspaceSlug, value.posting.id, toPayload(value)),
        onSuccess: async () => {
            await invalidate();
            setEditor(null);
        },
    });
    const removeMutation = useMutation({
        mutationFn: (id: number) => jobPostingApi.workspaceRemove(workspaceSlug, id),
        onSuccess: invalidate,
    });
    const rematchMutation = useMutation({
        mutationFn: (id: number) => jobPostingApi.workspaceRematch(workspaceSlug, id),
        onSuccess: async (posting) => {
            setEditor((current) =>
                current?.posting.id === posting.id
                    ? {
                          ...current,
                          posting,
                          matchScore: posting.matchScore ?? '',
                          matchReason: posting.matchReason ?? '',
                      }
                    : current
            );
            await invalidate();
        },
    });

    const normalized = search.trim().toLowerCase();
    const filteredApplications = useMemo(
        () =>
            applications.filter(
                (posting) =>
                    matches(posting, normalized) &&
                    (statusFilter === 'ALL' || posting.status === statusFilter)
            ),
        [applications, normalized, statusFilter]
    );
    const filteredCatalog = useMemo(
        () => catalog.filter((posting) => matches(posting, normalized)),
        [catalog, normalized]
    );
    const calendarCells = useMemo(() => buildCalendarCells(calendarMonth), [calendarMonth]);
    const deadlineApplicationsByDate = useMemo(() => {
        const result = new Map<string, JobPosting[]>();
        filteredApplications.forEach((posting) => {
            if (!posting.deadline || posting.alwaysOpen) return;
            const current = result.get(posting.deadline) ?? [];
            current.push(posting);
            result.set(posting.deadline, current);
        });
        return result;
    }, [filteredApplications]);

    const openEditor = (posting: JobPosting) =>
        setEditor({
            posting,
            status: posting.status,
            appliedAt: posting.appliedAt ?? '',
            memo: posting.memo ?? '',
            interestLevel: posting.interestLevel ?? '',
            matchScore: posting.matchScore ?? '',
            matchReason: posting.matchReason ?? '',
        });

    return (
        <div className="space-y-5">
            <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500">
                        Workspace Career Pipeline
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">지원 현황</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        공통 공고를 가져와 이 Workspace만의 지원 상태와 맞춤 자료를 관리합니다.
                    </p>
                </div>
                <div className="flex rounded-xl bg-slate-100 p-1" aria-label="지원 현황 보기">
                    <ModeButton active={mode === 'MINE'} onClick={() => setMode('MINE')}>
                        내 지원 {applications.length}
                    </ModeButton>
                    <ModeButton active={mode === 'CATALOG'} onClick={() => setMode('CATALOG')}>
                        공고 가져오기
                    </ModeButton>
                </div>
            </header>

            <section className="grid gap-3 lg:grid-cols-2">
                <ScopeCard
                    icon={<BriefcaseBusiness className="h-4 w-4" />}
                    title="내 Workspace 지원 기록"
                    description="상태·메모·관심도·자기소개서·이력서는 현재 Workspace에만 저장됩니다."
                    active={mode === 'MINE'}
                />
                <ScopeCard
                    icon={<Database className="h-4 w-4" />}
                    title="검증된 공통 공고에서 가져오기"
                    description="저장·재노출 권한이 확인된 공고만 검색됩니다. 가져오면 내 Workspace의 비공개 지원 기록이 됩니다."
                    active={mode === 'CATALOG'}
                />
            </section>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    {mode === 'MINE' && (
                        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                            <ViewModeButton
                                active={viewMode === 'LIST'}
                                onClick={() => setViewMode('LIST')}
                                icon={<ListIcon className="h-3.5 w-3.5" />}
                            >
                                리스트
                            </ViewModeButton>
                            <ViewModeButton
                                active={viewMode === 'BOARD'}
                                onClick={() => setViewMode('BOARD')}
                                icon={<LayoutGrid className="h-3.5 w-3.5" />}
                            >
                                보드
                            </ViewModeButton>
                            <ViewModeButton
                                active={viewMode === 'CALENDAR'}
                                onClick={() => setViewMode('CALENDAR')}
                                icon={<CalendarDays className="h-3.5 w-3.5" />}
                            >
                                캘린더
                            </ViewModeButton>
                        </div>
                    )}
                    {mode === 'MINE' && (
                        <select
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value as 'ALL' | JobPostingStatus)
                            }
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm outline-none focus:border-slate-400"
                            aria-label="지원 상태 필터"
                        >
                            <option value="ALL">전체 상태</option>
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                <label
                    className={`${mode === 'CATALOG' && catalogSourceMode !== 'SHARED' ? 'hidden' : 'flex'} min-w-0 flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm xl:max-w-md`}
                >
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="회사·직무·지역 검색"
                        className="w-full min-w-0 bg-transparent text-sm outline-none"
                    />
                </label>
            </div>

            {mode === 'CATALOG' && (
                <section
                    className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                    aria-label="공고 가져오기 방식"
                >
                    <SourceModeButton
                        active={catalogSourceMode === 'SHARED'}
                        onClick={() => setCatalogSourceMode('SHARED')}
                        title="검증된 공통 공고"
                        description="공개 권한이 확인된 공고만 검색"
                    />
                    <SourceModeButton
                        active={catalogSourceMode === 'URL'}
                        onClick={() => setCatalogSourceMode('URL')}
                        title="URL 가져오기"
                        description="AI가 읽은 뒤 검토하여 비공개 저장"
                    />
                    <SourceModeButton
                        active={catalogSourceMode === 'MANUAL'}
                        onClick={() => setCatalogSourceMode('MANUAL')}
                        title="직접 입력"
                        description="필요한 정보만 직접 기록"
                    />
                    <SourceModeButton
                        active={catalogSourceMode === 'SCREENSHOT'}
                        onClick={() => setCatalogSourceMode('SCREENSHOT')}
                        title="스크린샷"
                        description="이미지 분석 후 검토하여 비공개 저장"
                    />
                </section>
            )}

            {mode === 'MINE' ? (
                applicationsLoading ? (
                    <Empty label="지원 목록을 불러오는 중입니다." />
                ) : filteredApplications.length === 0 ? (
                    <Empty
                        label={
                            applications.length === 0
                                ? '저장한 공고가 없습니다.'
                                : '조건에 맞는 공고가 없습니다.'
                        }
                        action={
                            applications.length === 0
                                ? '공고 가져오기에서 추가해보세요.'
                                : '검색어나 상태 필터를 변경해보세요.'
                        }
                    />
                ) : viewMode === 'LIST' ? (
                    <WorkspaceApplicationList
                        postings={filteredApplications}
                        onOpen={openEditor}
                        onRemove={(posting) => {
                            if (window.confirm('이 Workspace의 지원 목록에서 제거할까요?')) {
                                removeMutation.mutate(posting.id);
                            }
                        }}
                    />
                ) : viewMode === 'BOARD' ? (
                    <WorkspaceApplicationBoard
                        postings={filteredApplications}
                        onOpen={openEditor}
                    />
                ) : (
                    <WorkspaceApplicationCalendar
                        month={calendarMonth}
                        cells={calendarCells}
                        postingsByDate={deadlineApplicationsByDate}
                        onPrevious={() =>
                            setCalendarMonth(
                                (current) =>
                                    new Date(current.getFullYear(), current.getMonth() - 1, 1)
                            )
                        }
                        onNext={() =>
                            setCalendarMonth(
                                (current) =>
                                    new Date(current.getFullYear(), current.getMonth() + 1, 1)
                            )
                        }
                        onOpen={openEditor}
                    />
                )
            ) : catalogSourceMode === 'URL' ||
              catalogSourceMode === 'MANUAL' ||
              catalogSourceMode === 'SCREENSHOT' ? (
                <WorkspacePrivateJobImport
                    key={catalogSourceMode}
                    workspaceSlug={workspaceSlug}
                    method={catalogSourceMode}
                    onCreated={async () => {
                        await invalidate();
                        setMode('MINE');
                    }}
                />
            ) : (
                <section className="grid gap-3 xl:grid-cols-2">
                    {catalogLoading ? (
                        <Empty label="공통 공고를 불러오는 중입니다." />
                    ) : filteredCatalog.length === 0 ? (
                        <Empty
                            label={
                                catalog.length === 0
                                    ? '공통 공고가 없습니다.'
                                    : '검색 결과가 없습니다.'
                            }
                            action="URL 가져오기 또는 직접 입력을 사용하면 현재 Workspace에만 비공개로 저장할 수 있습니다."
                        />
                    ) : (
                        filteredCatalog.map((posting) => (
                            <article
                                key={posting.id}
                                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div>
                                    <p className="text-xs font-bold text-slate-400">
                                        {posting.location || '지역 미정'} ·{' '}
                                        {posting.employmentType || '고용 형태 미정'}
                                    </p>
                                    <h3 className="mt-2 text-base font-black text-slate-900">
                                        {posting.companyName}
                                    </h3>
                                    <p className="mt-1 text-sm font-bold text-slate-600">
                                        {posting.positionTitle}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                                        <span>
                                            {posting.alwaysOpen
                                                ? '상시 채용'
                                                : `마감 ${posting.deadline || '미정'}`}
                                        </span>
                                        {posting.source && (
                                            <>
                                                <span aria-hidden="true">·</span>
                                                <span>{posting.source}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                    {posting.postingUrl ? (
                                        <a
                                            href={posting.postingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                            aria-label={`${posting.companyName} ${posting.positionTitle} 원본 공고 열기`}
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            원본 보기
                                        </a>
                                    ) : (
                                        <span className="flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-400">
                                            원본 링크 없음
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        disabled={posting.saved || saveMutation.isPending}
                                        onClick={() => saveMutation.mutate(posting)}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                    >
                                        <Plus className="h-4 w-4" />
                                        {posting.saved ? '이미 가져옴' : '내 지원으로 가져오기'}
                                    </button>
                                </div>
                            </article>
                        ))
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
                                    Workspace private application
                                </p>
                                <h3 className="mt-1 text-xl font-black text-slate-950">
                                    {editor.posting.companyName} · {editor.posting.positionTitle}
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
                            <Field label="지원 상태">
                                <select
                                    value={editor.status}
                                    onChange={(event) =>
                                        setEditor({
                                            ...editor,
                                            status: event.target.value as JobPostingStatus,
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
                            <Field label="지원일">
                                <input
                                    type="date"
                                    value={editor.appliedAt}
                                    onChange={(event) =>
                                        setEditor({ ...editor, appliedAt: event.target.value })
                                    }
                                    className="workspace-input"
                                />
                            </Field>
                            <Field label="관심도 (1~5)">
                                <input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={editor.interestLevel}
                                    onChange={(event) =>
                                        setEditor({
                                            ...editor,
                                            interestLevel:
                                                event.target.value === ''
                                                    ? ''
                                                    : Number(event.target.value),
                                        })
                                    }
                                    className="workspace-input"
                                />
                            </Field>
                            <Field label="매칭 점수 (0~100)">
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={editor.matchScore}
                                    onChange={(event) =>
                                        setEditor({
                                            ...editor,
                                            matchScore:
                                                event.target.value === ''
                                                    ? ''
                                                    : Number(event.target.value),
                                        })
                                    }
                                    className="workspace-input"
                                />
                            </Field>
                        </div>
                        <div className="mt-4 space-y-4">
                            <div className="flex flex-col gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-black text-slate-800">
                                        Workspace 기술 기반 자동 매칭
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        공용 기술 카탈로그가 아니라 현재 Workspace에 연결한 기술만
                                        사용하며 결과도 이 지원 건에만 저장됩니다.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    disabled={rematchMutation.isPending}
                                    onClick={() => rematchMutation.mutate(editor.posting.id)}
                                    className="shrink-0 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 disabled:text-slate-400"
                                >
                                    {rematchMutation.isPending ? '계산 중…' : '자동 매칭 다시 계산'}
                                </button>
                            </div>
                            <Field label="지원 메모">
                                <textarea
                                    rows={5}
                                    value={editor.memo}
                                    onChange={(event) =>
                                        setEditor({ ...editor, memo: event.target.value })
                                    }
                                    className="workspace-input resize-y"
                                />
                            </Field>
                            <Field label="매칭 근거">
                                <textarea
                                    rows={4}
                                    maxLength={500}
                                    value={editor.matchReason}
                                    onChange={(event) =>
                                        setEditor({ ...editor, matchReason: event.target.value })
                                    }
                                    className="workspace-input resize-y"
                                />
                            </Field>
                        </div>

                        <section className="mt-6 rounded-2xl bg-slate-50 p-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                                상태 이력
                            </h4>
                            <div className="mt-3 space-y-2">
                                {statusEvents.length === 0 ? (
                                    <p className="text-xs text-slate-400">
                                        아직 상태 변경 이력이 없습니다.
                                    </p>
                                ) : (
                                    statusEvents.map((event) => (
                                        <div
                                            key={event.id}
                                            className="flex items-start justify-between gap-3 text-xs"
                                        >
                                            <span className="font-bold text-slate-700">
                                                {STATUS_OPTIONS.find(
                                                    (option) => option.value === event.status
                                                )?.label || event.status}
                                            </span>
                                            <span className="text-right text-slate-400">
                                                {event.changedAt.slice(0, 16).replace('T', ' ')}
                                                {event.memo ? ` · ${event.memo}` : ''}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <WorkspaceCoverLetterEditor
                            workspaceSlug={workspaceSlug}
                            jobPostingId={editor.posting.id}
                            items={coverLetterItems}
                        />
                        <WorkspaceApplicationAiTools
                            workspaceSlug={workspaceSlug}
                            jobPostingId={editor.posting.id}
                            initialAppealAnalysis={editor.posting.appealAnalysis}
                        />

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

function WorkspaceApplicationAiTools({
    workspaceSlug,
    jobPostingId,
    initialAppealAnalysis,
}: {
    workspaceSlug: string;
    jobPostingId: number;
    initialAppealAnalysis: string | null;
}) {
    const queryClient = useQueryClient();
    const [appealAnalysis, setAppealAnalysis] = useState(initialAppealAnalysis);
    const gapKey = ['job-applications', workspaceSlug, jobPostingId, 'gap-project-documents'];
    const { data: documents = [] } = useQuery({
        queryKey: gapKey,
        queryFn: () => jobPostingApi.workspaceGapProjectDocuments(workspaceSlug, jobPostingId),
    });
    const appealMutation = useMutation({
        mutationFn: () => jobPostingApi.workspaceAnalyzeAppeal(workspaceSlug, jobPostingId),
        onSuccess: async (posting) => {
            setAppealAnalysis(posting.appealAnalysis);
            await queryClient.invalidateQueries({
                queryKey: ['job-applications', 'workspace', workspaceSlug],
            });
        },
    });
    const gapMutation = useMutation({
        mutationFn: () =>
            jobPostingApi.workspaceGenerateGapProjectDocument(workspaceSlug, jobPostingId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: gapKey });
        },
    });

    return (
        <section className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h4 className="flex items-center gap-2 text-sm font-black text-slate-800">
                        <Sparkles className="h-4 w-4 text-indigo-500" />
                        Workspace 지원 전략 AI
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                        이 Workspace의 경력 근거만 검색하며 분석 결과와 보완 프로젝트도 지원 건에
                        귀속됩니다.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        disabled={appealMutation.isPending}
                        onClick={() => appealMutation.mutate()}
                        className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 disabled:text-slate-400"
                    >
                        {appealMutation.isPending
                            ? '분석 중…'
                            : appealAnalysis
                              ? '어필 분석 다시 실행'
                              : '어필 포인트 분석'}
                    </button>
                    <button
                        type="button"
                        disabled={!appealAnalysis || gapMutation.isPending}
                        onClick={() => gapMutation.mutate()}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:bg-slate-200 disabled:text-slate-400"
                    >
                        {gapMutation.isPending ? '생성 중…' : '보완 프로젝트 생성'}
                    </button>
                </div>
            </div>
            {appealAnalysis && (
                <div className="mt-4 whitespace-pre-wrap rounded-xl bg-white p-4 text-xs leading-6 text-slate-600">
                    {appealAnalysis}
                </div>
            )}
            {documents.length > 0 && (
                <div className="mt-4 space-y-2">
                    {documents.map((document) => (
                        <details key={document.id} className="rounded-xl bg-white p-4">
                            <summary className="cursor-pointer text-sm font-bold text-slate-700">
                                v{document.version} · {document.title}
                            </summary>
                            <pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-6 text-slate-600">
                                {document.renderedMarkdown}
                            </pre>
                        </details>
                    ))}
                </div>
            )}
        </section>
    );
}

function WorkspaceCoverLetterEditor({
    workspaceSlug,
    jobPostingId,
    items,
}: {
    workspaceSlug: string;
    jobPostingId: number;
    items: JobPostingCoverLetterItem[];
}) {
    const queryClient = useQueryClient();
    const [drafts, setDrafts] = useState<Array<JobPostingCoverLetterItemRequest & { id?: number }>>(
        []
    );

    useEffect(() => {
        // 서버가 반환한 최신 문항을 저장 가능한 편집 초안으로 동기화한다.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDrafts(
            items.map((item) => ({
                id: item.id,
                question: item.question,
                answer: item.answer,
                characterLimit: item.characterLimit,
            }))
        );
    }, [items]);

    const mutation = useMutation({
        mutationFn: () =>
            jobPostingApi.workspaceReplaceCoverLetterItems(
                workspaceSlug,
                jobPostingId,
                drafts.map(({ question, answer, characterLimit }) => ({
                    question,
                    answer,
                    characterLimit,
                }))
            ),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ['job-applications', workspaceSlug, jobPostingId, 'cover-letter-items'],
            });
        },
    });
    const aiMutation = useMutation({
        mutationFn: ({
            index,
            item,
        }: {
            index: number;
            item: JobPostingCoverLetterItemRequest & { id?: number };
        }) =>
            jobPostingApi
                .workspaceGenerateCoverLetterDraft(workspaceSlug, jobPostingId, {
                    question: item.question,
                    characterLimit: item.characterLimit,
                    currentDraft: item.answer || null,
                    feedbackInstruction: null,
                    coverLetterItemId: item.id ?? null,
                    aiModel: null,
                    customModelName: null,
                })
                .then((response) => ({ index, response })),
        onSuccess: ({ index, response }) => {
            update(index, 'answer', response.draftAnswer);
        },
    });

    const update = (
        index: number,
        field: keyof JobPostingCoverLetterItemRequest,
        value: string | number | null
    ) =>
        setDrafts((current) =>
            current.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [field]: value } : item
            )
        );

    return (
        <section className="mt-6 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h4 className="text-sm font-black text-slate-800">지원별 자기소개서</h4>
                    <p className="mt-1 text-xs text-slate-400">
                        현재 Workspace의 경력 근거만 사용해 AI 초안을 만들며, 결과는 저장 버튼을
                        눌러야 반영됩니다.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() =>
                        setDrafts((current) => [
                            ...current,
                            { question: '', answer: '', characterLimit: null },
                        ])
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                >
                    문항 추가
                </button>
            </div>
            <div className="mt-4 space-y-4">
                {drafts.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">
                        저장된 자기소개서 문항이 없습니다.
                    </p>
                ) : (
                    drafts.map((item, index) => (
                        <div key={index} className="rounded-xl bg-slate-50 p-3">
                            <div className="flex gap-2">
                                <input
                                    value={item.question}
                                    onChange={(event) =>
                                        update(index, 'question', event.target.value)
                                    }
                                    placeholder="자기소개서 문항"
                                    className="workspace-input"
                                    required
                                />
                                <input
                                    type="number"
                                    min={1}
                                    value={item.characterLimit ?? ''}
                                    onChange={(event) =>
                                        update(
                                            index,
                                            'characterLimit',
                                            event.target.value === ''
                                                ? null
                                                : Number(event.target.value)
                                        )
                                    }
                                    placeholder="글자 수"
                                    className="workspace-input max-w-28"
                                />
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        disabled={aiMutation.isPending || !item.question.trim()}
                                        onClick={() => aiMutation.mutate({ index, item })}
                                        className="whitespace-nowrap rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-600 disabled:border-slate-200 disabled:text-slate-400"
                                    >
                                        {aiMutation.isPending &&
                                        aiMutation.variables?.index === index
                                            ? 'AI 작성 중…'
                                            : item.answer
                                              ? 'AI로 다듬기'
                                              : 'AI 초안'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDrafts((current) =>
                                                current.filter(
                                                    (_, itemIndex) => itemIndex !== index
                                                )
                                            )
                                        }
                                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                                        aria-label="자기소개서 문항 삭제"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <textarea
                                rows={6}
                                value={item.answer}
                                onChange={(event) => update(index, 'answer', event.target.value)}
                                placeholder="답변을 작성하세요."
                                className="workspace-input mt-2 resize-y"
                            />
                        </div>
                    ))
                )}
            </div>
            <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || drafts.some((item) => !item.question.trim())}
                className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-500"
            >
                {mutation.isPending ? '저장 중…' : '자기소개서 저장'}
            </button>
        </section>
    );
}

function ScopeCard({
    icon,
    title,
    description,
    active,
}: {
    icon: ReactNode;
    title: string;
    description: string;
    active: boolean;
}) {
    return (
        <article
            className={`rounded-xl border bg-white p-4 ${active ? 'border-slate-400 shadow-sm' : 'border-slate-200'}`}
        >
            <div className="flex items-center gap-2 text-slate-700">
                {icon}
                <h3 className="text-sm font-black">{title}</h3>
                <span
                    className={`ml-auto rounded-full px-2 py-1 text-[10px] font-black ${active ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500'}`}
                >
                    {active ? '현재 화면' : '연결됨'}
                </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
        </article>
    );
}

function ViewModeButton({
    active,
    onClick,
    icon,
    children,
}: {
    active: boolean;
    onClick: () => void;
    icon: ReactNode;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition ${active ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
        >
            {icon}
            {children}
        </button>
    );
}

function WorkspaceApplicationList({
    postings,
    onOpen,
    onRemove,
}: {
    postings: JobPosting[];
    onOpen: (posting: JobPosting) => void;
    onRemove: (posting: JobPosting) => void;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[minmax(0,2fr)_140px_130px_90px_116px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400 lg:grid">
                <span>회사·직무</span>
                <span>지원 상태</span>
                <span>마감</span>
                <span>매칭</span>
                <span className="text-right">관리</span>
            </div>
            {postings.map((posting) => (
                <article
                    key={posting.id}
                    className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 lg:grid-cols-[minmax(0,2fr)_140px_130px_90px_116px] lg:items-center lg:gap-4"
                >
                    <button
                        type="button"
                        onClick={() => onOpen(posting)}
                        className="min-w-0 text-left"
                    >
                        <p className="truncate text-sm font-black text-slate-900">
                            {posting.companyName}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                            {posting.positionTitle}
                        </p>
                        {posting.memo && (
                            <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                                {posting.memo}
                            </p>
                        )}
                    </button>
                    <StatusBadge status={posting.status} />
                    <span className="text-xs font-bold text-slate-500">
                        {posting.alwaysOpen ? '상시 채용' : posting.deadline || '미정'}
                    </span>
                    <span className="text-xs font-black text-slate-600">
                        {posting.matchScore == null ? '—' : `${posting.matchScore}점`}
                    </span>
                    <div className="flex justify-end gap-1.5">
                        {posting.postingUrl && (
                            <a
                                href={posting.postingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                                aria-label="원본 공고 열기"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={() => onOpen(posting)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                            편집
                        </button>
                        <button
                            type="button"
                            onClick={() => onRemove(posting)}
                            className="rounded-lg border border-red-100 p-2 text-red-500 hover:bg-red-50"
                            aria-label="지원 목록에서 제거"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </article>
            ))}
        </section>
    );
}

function WorkspaceApplicationBoard({
    postings,
    onOpen,
}: {
    postings: JobPosting[];
    onOpen: (posting: JobPosting) => void;
}) {
    return (
        <section className="grid gap-3 xl:grid-cols-4">
            {BOARD_COLUMNS.map((column) => {
                const columnPostings = postings.filter((posting) =>
                    column.statuses.includes(posting.status)
                );
                return (
                    <div
                        key={column.id}
                        className="min-h-48 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                        <div className="flex items-center justify-between px-1 py-1">
                            <h3 className="text-xs font-black text-slate-700">{column.label}</h3>
                            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">
                                {columnPostings.length}
                            </span>
                        </div>
                        <div className="mt-2 space-y-2">
                            {columnPostings.map((posting) => (
                                <button
                                    key={posting.id}
                                    type="button"
                                    onClick={() => onOpen(posting)}
                                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-400"
                                >
                                    <p className="truncate text-xs font-black text-slate-900">
                                        {posting.companyName}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                                        {posting.positionTitle}
                                    </p>
                                    <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-400">
                                        <span>
                                            {posting.alwaysOpen
                                                ? '상시'
                                                : posting.deadline || '마감 미정'}
                                        </span>
                                        <span>
                                            {posting.matchScore == null
                                                ? '매칭 전'
                                                : `${posting.matchScore}점`}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}
        </section>
    );
}

type CalendarCell = { date: Date | null; key: string };

function WorkspaceApplicationCalendar({
    month,
    cells,
    postingsByDate,
    onPrevious,
    onNext,
    onOpen,
}: {
    month: Date;
    cells: CalendarCell[];
    postingsByDate: Map<string, JobPosting[]>;
    onPrevious: () => void;
    onNext: () => void;
    onOpen: (posting: JobPosting) => void;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <button
                    type="button"
                    onClick={onPrevious}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    aria-label="이전 달"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <h3 className="text-sm font-black text-slate-900">
                    {month.getFullYear()}년 {month.getMonth() + 1}월 마감 일정
                </h3>
                <button
                    type="button"
                    onClick={onNext}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    aria-label="다음 달"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </header>
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {WEEKDAY_LABELS.map((weekday) => (
                    <div
                        key={weekday}
                        className="px-2 py-2 text-center text-[10px] font-black text-slate-400"
                    >
                        {weekday}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {cells.map((cell) => {
                    const dateKey = cell.date ? toDateKey(cell.date) : '';
                    const dayPostings = dateKey ? (postingsByDate.get(dateKey) ?? []) : [];
                    return (
                        <div
                            key={cell.key}
                            className="min-h-28 border-b border-r border-slate-100 p-2 last:border-r-0"
                        >
                            {cell.date && (
                                <>
                                    <span className="text-[11px] font-black text-slate-500">
                                        {cell.date.getDate()}
                                    </span>
                                    <div className="mt-1 space-y-1">
                                        {dayPostings.slice(0, 3).map((posting) => (
                                            <button
                                                key={posting.id}
                                                type="button"
                                                onClick={() => onOpen(posting)}
                                                className="block w-full truncate rounded-md bg-slate-100 px-2 py-1 text-left text-[10px] font-bold text-slate-700 hover:bg-slate-200"
                                            >
                                                {posting.companyName}
                                            </button>
                                        ))}
                                        {dayPostings.length > 3 && (
                                            <p className="px-1 text-[10px] font-bold text-slate-400">
                                                +{dayPostings.length - 3}개
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function StatusBadge({ status }: { status: JobPostingStatus }) {
    const label = STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
    return (
        <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
            {label}
        </span>
    );
}

function buildCalendarCells(month: Date): CalendarCell[] {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstWeekday = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
        const day = index - firstWeekday + 1;
        return {
            date: day >= 1 && day <= daysInMonth ? new Date(year, monthIndex, day) : null,
            key: `${year}-${monthIndex}-${index}`,
        };
    });
}

function toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function ModeButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
        >
            {children}
        </button>
    );
}

function SourceModeButton({
    active,
    onClick,
    title,
    description,
}: {
    active: boolean;
    onClick: () => void;
    title: string;
    description: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-2xl border p-4 text-left transition ${
                active
                    ? 'border-slate-950 bg-slate-950 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400'
            }`}
        >
            <span className="block text-sm font-black">{title}</span>
            <span className={`mt-1 block text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                {description}
            </span>
        </button>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-400">
                {label}
            </span>
            {children}
        </label>
    );
}

function Empty({ label, action }: { label: string; action?: string }) {
    return (
        <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <BriefcaseBusiness className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-3 text-sm font-black text-slate-600">{label}</p>
            {action && <p className="mt-1 text-xs text-slate-400">{action}</p>}
        </div>
    );
}

function matches(
    posting: Pick<JobPosting, 'companyName' | 'positionTitle' | 'location'>,
    normalized: string
): boolean {
    return (
        !normalized ||
        posting.companyName.toLowerCase().includes(normalized) ||
        posting.positionTitle.toLowerCase().includes(normalized) ||
        (posting.location ?? '').toLowerCase().includes(normalized)
    );
}
