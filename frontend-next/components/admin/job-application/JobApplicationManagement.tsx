'use client';

import { useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Bookmark,
    BookmarkCheck,
    Briefcase,
    Calendar as CalendarIcon,
    Check,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    Link2,
    List as ListIcon,
    Plus,
    RefreshCw,
    Settings as SettingsIcon,
    Sparkles,
    Trash2,
    X,
} from 'lucide-react';
import { ApiError, jobApplicationApi, jobPostingApi } from '@/lib/api';
import type {
    JobApplication,
    JobApplicationRequest,
    JobApplicationStage,
    JobPostingCandidate,
    JobPostingSettingRequest,
    JobPostingSource,
} from '@/lib/api/types';

const POSTING_SOURCE_LABELS: Record<JobPostingSource, string> = {
    URL_INGEST: 'URL 수집',
    SARAMIN: '사람인',
};

const STAGE_LABELS: Record<JobApplicationStage, string> = {
    APPLIED: '지원완료',
    CODING_TEST: '코딩테스트',
    ASSIGNMENT: '과제전형',
    APTITUDE_TEST: '인적성검사',
    INTERVIEW_1: '1차면접',
    INTERVIEW_2: '2차면접',
    FINAL_INTERVIEW: '최종면접',
    OFFER: '합격',
    REJECTED: '불합격',
    WITHDRAWN: '지원포기',
};

const STAGE_ORDER: JobApplicationStage[] = [
    'APPLIED',
    'CODING_TEST',
    'ASSIGNMENT',
    'APTITUDE_TEST',
    'INTERVIEW_1',
    'INTERVIEW_2',
    'FINAL_INTERVIEW',
    'OFFER',
    'REJECTED',
    'WITHDRAWN',
];

const STAGE_ACCENT: Record<JobApplicationStage, string> = {
    APPLIED: 'text-blue-600 bg-blue-50',
    CODING_TEST: 'text-amber-600 bg-amber-50',
    ASSIGNMENT: 'text-teal-600 bg-teal-50',
    APTITUDE_TEST: 'text-cyan-600 bg-cyan-50',
    INTERVIEW_1: 'text-purple-600 bg-purple-50',
    INTERVIEW_2: 'text-purple-600 bg-purple-50',
    FINAL_INTERVIEW: 'text-fuchsia-600 bg-fuchsia-50',
    OFFER: 'text-emerald-600 bg-emerald-50',
    REJECTED: 'text-rose-600 bg-rose-50',
    WITHDRAWN: 'text-slate-500 bg-slate-100',
};

function stageBadgeClass(stage: JobApplicationStage): string {
    if (stage === 'OFFER') return 'bg-emerald-50 text-emerald-600';
    if (stage === 'REJECTED' || stage === 'WITHDRAWN') return 'bg-rose-50 text-rose-600';
    return 'bg-slate-100 text-slate-600';
}

function dDayLabel(deadline: string | null): string | null {
    if (!deadline) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${deadline}T00:00:00`);
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
    if (diffDays < 0) return '마감';
    if (diffDays === 0) return 'D-day';
    return `D-${diffDays}`;
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

type CalendarCell = { date: Date | null };

function buildCalendarCells(monthStart: Date): CalendarCell[] {
    const startWeekday = monthStart.getDay();
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const cells: CalendarCell[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null });
    for (let day = 1; day <= daysInMonth; day++) {
        cells.push({ date: new Date(monthStart.getFullYear(), monthStart.getMonth(), day) });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null });
    return cells;
}

const emptyForm: JobApplicationRequest = {
    companyName: '',
    positionTitle: '',
    postingUrl: '',
    source: '',
    appliedAt: new Date().toISOString().slice(0, 10),
    deadline: '',
    salaryNote: '',
    memo: '',
    jobDescription: '',
    requiredQualifications: '',
    preferredQualifications: '',
    hiringProcess: '',
    applicationMethod: '',
    compensationDetail: '',
};

type Drawer = { mode: 'create' } | { mode: 'edit'; id: number } | null;
type ViewMode = 'LIST' | 'BOARD' | 'CALENDAR';

export function JobApplicationManagement() {
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<ViewMode>('LIST');
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [drawer, setDrawer] = useState<Drawer>(null);
    const [form, setForm] = useState<JobApplicationRequest>(emptyForm);
    const [search, setSearch] = useState('');
    const [stageDraft, setStageDraft] = useState<JobApplicationStage | null>(null);
    const [stageMemo, setStageMemo] = useState('');
    const [dragOverStage, setDragOverStage] = useState<JobApplicationStage | null>(null);
    const [isIngestDrawerOpen, setIsIngestDrawerOpen] = useState(false);
    const [ingestUrl, setIngestUrl] = useState('');
    const [isIngesting, setIsIngesting] = useState(false);
    const [ingestElapsedSeconds, setIngestElapsedSeconds] = useState(0);
    const [isParsingUrl, setIsParsingUrl] = useState(false);
    const [parseElapsedSeconds, setParseElapsedSeconds] = useState(0);
    const parseUrlAbortRef = useRef<AbortController | null>(null);
    const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
    const [settingsForm, setSettingsForm] = useState<JobPostingSettingRequest | null>(null);

    const { data: applications = [], isLoading } = useQuery({
        queryKey: ['jobApplications'],
        queryFn: jobApplicationApi.list,
    });

    const { data: candidates = [] } = useQuery({
        queryKey: ['jobPostingCandidates'],
        queryFn: jobPostingApi.list,
    });

    const { data: settings } = useQuery({
        queryKey: ['jobPostingSettings'],
        queryFn: jobPostingApi.getSettings,
    });

    const editingId = drawer?.mode === 'edit' ? drawer.id : null;
    const editingApplication = applications.find((item) => item.id === editingId) ?? null;

    const { data: stageEvents = [], isLoading: isStageEventsLoading } = useQuery({
        queryKey: ['jobApplications', editingId, 'stageEvents'],
        queryFn: () => jobApplicationApi.stageEvents(editingId!),
        enabled: editingId !== null,
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['jobApplications'] });

    const createMutation = useMutation({
        mutationFn: (payload: JobApplicationRequest) => jobApplicationApi.create(payload),
        onSuccess: () => {
            invalidate();
            closeDrawer();
        },
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '등록에 실패했습니다.'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: JobApplicationRequest }) =>
            jobApplicationApi.update(id, payload),
        onSuccess: () => {
            invalidate();
            closeDrawer();
        },
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '수정에 실패했습니다.'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => jobApplicationApi.remove(id),
        onSuccess: () => {
            invalidate();
            closeDrawer();
        },
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '삭제에 실패했습니다.'),
    });

    const stageMutation = useMutation({
        mutationFn: ({
            id,
            stage,
            memo,
        }: {
            id: number;
            stage: JobApplicationStage;
            memo?: string;
        }) => jobApplicationApi.changeStage(id, stage, memo),
        onSuccess: (_, variables) => {
            invalidate();
            queryClient.invalidateQueries({
                queryKey: ['jobApplications', variables.id, 'stageEvents'],
            });
            setStageMemo('');
        },
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '전형 단계 변경에 실패했습니다.'),
    });

    async function requestParseUrl(url: string) {
        setIsParsingUrl(true);
        setParseElapsedSeconds(0);
        const startedAt = Date.now();
        const timer = window.setInterval(() => {
            setParseElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
        }, 1000);
        const controller = new AbortController();
        parseUrlAbortRef.current = controller;
        try {
            await jobApplicationApi.parseUrlStream(
                url,
                (event) => {
                    if (event.type === 'error') {
                        alert(event.message);
                        return;
                    }
                    const data = event.response;
                    setForm((prev) => ({
                        ...prev,
                        companyName: data.companyName || prev.companyName,
                        positionTitle: data.positionTitle || prev.positionTitle,
                        source: data.source || prev.source,
                        deadline: data.deadline || prev.deadline,
                        salaryNote: data.salaryNote || prev.salaryNote,
                        jobDescription: data.jobDescription || prev.jobDescription,
                        requiredQualifications:
                            data.requiredQualifications || prev.requiredQualifications,
                        preferredQualifications:
                            data.preferredQualifications || prev.preferredQualifications,
                        hiringProcess: data.hiringProcess || prev.hiringProcess,
                        applicationMethod: data.applicationMethod || prev.applicationMethod,
                        compensationDetail: data.compensationDetail || prev.compensationDetail,
                        postingUrl: data.postingUrl,
                    }));
                },
                controller.signal
            );
        } catch (error) {
            if (!controller.signal.aborted) {
                alert(error instanceof ApiError ? error.message : 'URL 자동분석에 실패했습니다.');
            }
        } finally {
            window.clearInterval(timer);
            if (parseUrlAbortRef.current === controller) {
                parseUrlAbortRef.current = null;
                setIsParsingUrl(false);
            }
        }
    }

    const invalidateCandidates = () =>
        queryClient.invalidateQueries({ queryKey: ['jobPostingCandidates'] });

    // 모달을 닫아도 수집 자체는 백그라운드에서 계속 진행되도록 AbortController를 두지 않는다 —
    // 완료되면 complete 이벤트로 캐시에 바로 반영된다.
    async function requestIngestUrl(url: string) {
        setIsIngesting(true);
        setIngestElapsedSeconds(0);
        const startedAt = Date.now();
        const timer = window.setInterval(() => {
            setIngestElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
        }, 1000);
        try {
            await jobPostingApi.ingestUrlStream(url, (event) => {
                if (event.type === 'error') {
                    alert(event.message);
                    return;
                }
                queryClient.setQueryData(
                    ['jobPostingCandidates'],
                    (prev: JobPostingCandidate[] | undefined) => [event.response, ...(prev ?? [])]
                );
                setIngestUrl('');
                setIsIngestDrawerOpen(false);
            });
        } catch (error) {
            alert(error instanceof ApiError ? error.message : '공고 수집에 실패했습니다.');
        } finally {
            window.clearInterval(timer);
            setIsIngesting(false);
        }
    }

    const dismissCandidateMutation = useMutation({
        mutationFn: (id: number) => jobPostingApi.dismiss(id),
        onSuccess: () => invalidateCandidates(),
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '무시 처리에 실패했습니다.'),
    });

    const convertCandidateMutation = useMutation({
        mutationFn: (id: number) => jobPostingApi.convertToApplication(id),
        onSuccess: () => {
            invalidateCandidates();
            invalidate();
        },
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '지원 전환에 실패했습니다.'),
    });

    const saveCandidateMutation = useMutation({
        mutationFn: (id: number) => jobPostingApi.save(id),
        onSuccess: () => invalidateCandidates(),
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '저장에 실패했습니다.'),
    });

    const collectMutation = useMutation({
        mutationFn: () => jobPostingApi.collect(),
        onSuccess: (result) => {
            invalidateCandidates();
            const parts = [`만료 처리 ${result.expiredCount}건`];
            parts.push(
                result.saraminEnabled ? `사람인 ${result.saraminCollected}건` : '사람인 비활성화'
            );
            alert(`수집 결과 — ${parts.join(' · ')}`);
        },
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '공고 수집에 실패했습니다.'),
    });

    const updateSettingsMutation = useMutation({
        mutationFn: (payload: JobPostingSettingRequest) => jobPostingApi.updateSettings(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobPostingSettings'] });
            setIsSettingsDrawerOpen(false);
        },
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '설정 저장에 실패했습니다.'),
    });

    function openSettingsDrawer() {
        if (settings) {
            setSettingsForm({
                saraminEnabled: settings.saraminEnabled,
                searchKeywords: settings.searchKeywords ?? '',
                searchCount: settings.searchCount,
                searchSort: settings.searchSort,
                locationCode: settings.locationCode ?? '',
                jobCode: settings.jobCode ?? '',
                industryCode: settings.industryCode ?? '',
                collectorScheduledEnabled: settings.collectorScheduledEnabled,
                matchingKeywordThreshold: settings.matchingKeywordThreshold,
                collectorCron: settings.collectorCron,
            });
        }
        setIsSettingsDrawerOpen(true);
    }

    const filteredApplications = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return applications;
        return applications.filter((item) =>
            `${item.companyName} ${item.positionTitle} ${item.source}`
                .toLowerCase()
                .includes(keyword)
        );
    }, [applications, search]);

    const filteredCandidates = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return candidates;
        return candidates.filter((item) =>
            `${item.companyName} ${item.title} ${POSTING_SOURCE_LABELS[item.source]}`
                .toLowerCase()
                .includes(keyword)
        );
    }, [candidates, search]);

    const byStage = useMemo(() => {
        const map = new Map<JobApplicationStage, JobApplication[]>();
        STAGE_ORDER.forEach((stage) => map.set(stage, []));
        filteredApplications.forEach((item) => map.get(item.currentStage)?.push(item));
        return map;
    }, [filteredApplications]);

    const calendarCells = useMemo(() => buildCalendarCells(calendarMonth), [calendarMonth]);

    const deadlineEventsByDate = useMemo(() => {
        const map = new Map<
            string,
            { applications: JobApplication[]; candidates: JobPostingCandidate[] }
        >();
        applications.forEach((item) => {
            if (!item.deadline) return;
            if (!map.has(item.deadline))
                map.set(item.deadline, { applications: [], candidates: [] });
            map.get(item.deadline)!.applications.push(item);
        });
        candidates.forEach((item) => {
            if (!item.deadline) return;
            if (!map.has(item.deadline))
                map.set(item.deadline, { applications: [], candidates: [] });
            map.get(item.deadline)!.candidates.push(item);
        });
        return map;
    }, [applications, candidates]);

    function shiftCalendarMonth(delta: number) {
        setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    }

    function openCreateDrawer() {
        setForm(emptyForm);
        setDrawer({ mode: 'create' });
    }

    function openEditDrawer(item: JobApplication) {
        setForm({
            companyName: item.companyName,
            positionTitle: item.positionTitle,
            postingUrl: item.postingUrl ?? '',
            source: item.source,
            appliedAt: item.appliedAt,
            deadline: item.deadline ?? '',
            salaryNote: item.salaryNote ?? '',
            memo: item.memo ?? '',
            jobDescription: item.jobDescription ?? '',
            requiredQualifications: item.requiredQualifications ?? '',
            preferredQualifications: item.preferredQualifications ?? '',
            hiringProcess: item.hiringProcess ?? '',
            applicationMethod: item.applicationMethod ?? '',
            compensationDetail: item.compensationDetail ?? '',
        });
        setStageDraft(item.currentStage);
        setStageMemo('');
        setDrawer({ mode: 'edit', id: item.id });
    }

    function closeDrawer() {
        parseUrlAbortRef.current?.abort();
        parseUrlAbortRef.current = null;
        setIsParsingUrl(false);
        setDrawer(null);
        setForm(emptyForm);
        setStageDraft(null);
        setStageMemo('');
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        const payload: JobApplicationRequest = {
            ...form,
            postingUrl: form.postingUrl?.trim() || null,
            deadline: form.deadline?.trim() || null,
            salaryNote: form.salaryNote?.trim() || null,
            memo: form.memo?.trim() || null,
            jobDescription: form.jobDescription?.trim() || null,
            requiredQualifications: form.requiredQualifications?.trim() || null,
            preferredQualifications: form.preferredQualifications?.trim() || null,
            hiringProcess: form.hiringProcess?.trim() || null,
            applicationMethod: form.applicationMethod?.trim() || null,
            compensationDetail: form.compensationDetail?.trim() || null,
        };
        if (editingId !== null) {
            updateMutation.mutate({ id: editingId, payload });
        } else {
            createMutation.mutate(payload);
        }
    }

    function handleDragStart(event: DragEvent<HTMLDivElement>, id: number) {
        event.dataTransfer.setData('text/plain', String(id));
        event.dataTransfer.effectAllowed = 'move';
    }

    function handleColumnDragOver(event: DragEvent<HTMLDivElement>, stage: JobApplicationStage) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (dragOverStage !== stage) setDragOverStage(stage);
    }

    function handleColumnDrop(event: DragEvent<HTMLDivElement>, stage: JobApplicationStage) {
        event.preventDefault();
        setDragOverStage(null);
        const id = Number(event.dataTransfer.getData('text/plain'));
        const target = applications.find((item) => item.id === id);
        if (!target || Number.isNaN(id) || target.currentStage === stage) return;
        stageMutation.mutate({ id, stage });
    }

    const isSaving = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                    <h2 className="text-xl font-black text-slate-950">지원 공고 관리</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        지원한 채용 공고를 리스트로 관리하고, 보드에서 카드를 드래그해 전형 단계를
                        빠르게 옮길 수 있습니다.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={openSettingsDrawer}
                        title="사람인 수집 사용여부/검색 조건/자동 스케줄 설정"
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                        <SettingsIcon className="h-4 w-4" />
                        수집 설정
                    </button>
                    <button
                        type="button"
                        disabled={collectMutation.isPending}
                        onClick={() => collectMutation.mutate()}
                        title="사람인 자동 수집(설정된 경우) 실행 및 마감 지난 공고 정리"
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <RefreshCw className="h-4 w-4" />
                        {collectMutation.isPending ? '수집 중...' : '지금 수집'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsIngestDrawerOpen(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                        <Link2 className="h-4 w-4" />
                        공고 수집
                    </button>
                    <button
                        type="button"
                        onClick={openCreateDrawer}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                        <Plus className="h-4 w-4" />새 지원 공고 등록
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                        onClick={() => setViewMode('BOARD')}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                            viewMode === 'BOARD'
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        보드
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('CALENDAR')}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                            viewMode === 'CALENDAR'
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                        <CalendarIcon className="h-3.5 w-3.5" />
                        캘린더
                    </button>
                </div>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="회사명/직무/출처 검색"
                    className="w-64 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
                />
            </div>

            {isLoading ? (
                <p className="py-10 text-center text-sm font-semibold text-slate-400">
                    불러오는 중입니다.
                </p>
            ) : applications.length === 0 && candidates.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
                    <Briefcase className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-400">
                        등록된 지원 공고가 없습니다.
                    </p>
                </div>
            ) : viewMode === 'LIST' ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                                <tr>
                                    <th className="px-5 py-3 font-bold">회사 / 직무</th>
                                    <th className="px-5 py-3 font-bold">출처</th>
                                    <th className="px-5 py-3 font-bold">지원일</th>
                                    <th className="px-5 py-3 font-bold">마감일</th>
                                    <th className="px-5 py-3 font-bold">현재 단계</th>
                                    <th className="px-5 py-3 font-bold text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCandidates.map((candidate) => (
                                    <tr
                                        key={`candidate-${candidate.id}`}
                                        className="bg-slate-50/70 text-slate-500"
                                    >
                                        <td className="px-5 py-3">
                                            <span className="font-bold text-slate-700">
                                                {candidate.companyName}
                                            </span>
                                            <span className="ml-2 text-slate-400">
                                                {candidate.title}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            {POSTING_SOURCE_LABELS[candidate.source]}
                                        </td>
                                        <td className="px-5 py-3 whitespace-nowrap text-slate-300">
                                            —
                                        </td>
                                        <td className="px-5 py-3 whitespace-nowrap">
                                            {candidate.deadline ?? (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-extrabold text-white">
                                                <Bookmark className="h-3 w-3" />
                                                수집됨
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    type="button"
                                                    disabled={convertCandidateMutation.isPending}
                                                    onClick={() =>
                                                        convertCandidateMutation.mutate(
                                                            candidate.id
                                                        )
                                                    }
                                                    className="text-xs font-bold text-slate-700 hover:text-slate-900"
                                                >
                                                    지원하기
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={dismissCandidateMutation.isPending}
                                                    onClick={() => {
                                                        if (confirm('이 후보를 무시할까요?')) {
                                                            dismissCandidateMutation.mutate(
                                                                candidate.id
                                                            );
                                                        }
                                                    }}
                                                    className="text-xs font-bold text-slate-400 hover:text-rose-600"
                                                >
                                                    무시
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredApplications.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => openEditDrawer(item)}
                                        className="cursor-pointer text-slate-600 transition hover:bg-slate-50"
                                    >
                                        <td className="px-5 py-3">
                                            <span className="font-bold text-slate-800">
                                                {item.companyName}
                                            </span>
                                            <span className="ml-2 text-slate-400">
                                                {item.positionTitle}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">{item.source}</td>
                                        <td className="px-5 py-3 whitespace-nowrap">
                                            {item.appliedAt}
                                        </td>
                                        <td className="px-5 py-3 whitespace-nowrap">
                                            {item.deadline ?? (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-extrabold ${STAGE_ACCENT[item.currentStage]}`}
                                            >
                                                {STAGE_LABELS[item.currentStage]}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm('이 지원 공고를 삭제할까요?')) {
                                                        deleteMutation.mutate(item.id);
                                                    }
                                                }}
                                                className="text-rose-500 hover:text-rose-700"
                                                title="삭제"
                                            >
                                                <Trash2 className="inline h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : viewMode === 'BOARD' ? (
                <div className="overflow-x-auto pb-2">
                    <div
                        className="grid h-[calc(100vh-320px)] min-h-[420px] gap-3"
                        style={{
                            gridAutoFlow: 'column',
                            gridAutoColumns: 'minmax(220px, 1fr)',
                        }}
                    >
                        <div className="flex h-full min-w-0 flex-col rounded-2xl border border-dashed border-slate-300 bg-white p-2.5">
                            <div className="mb-2 flex shrink-0 items-center justify-between px-1.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-extrabold text-white">
                                    <Bookmark className="h-3 w-3" />
                                    수집됨
                                </span>
                                <span className="text-xs font-bold text-slate-400">
                                    {candidates.length}
                                </span>
                            </div>
                            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                                {candidates.map((candidate) => {
                                    const dDay = dDayLabel(candidate.deadline);
                                    return (
                                        <div
                                            key={candidate.id}
                                            className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left shadow-sm"
                                        >
                                            <p className="truncate text-sm font-extrabold text-slate-800">
                                                {candidate.companyName}
                                            </p>
                                            <p className="mt-0.5 truncate text-xs text-slate-500">
                                                {candidate.title}
                                            </p>
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                                    {POSTING_SOURCE_LABELS[candidate.source]}
                                                </span>
                                                {dDay && (
                                                    <span
                                                        className={`text-[10px] font-extrabold ${
                                                            dDay === '마감'
                                                                ? 'text-slate-300'
                                                                : 'text-rose-500'
                                                        }`}
                                                    >
                                                        {dDay}
                                                    </span>
                                                )}
                                            </div>
                                            {candidate.matchScore !== null && (
                                                <div
                                                    className="mt-1.5 flex items-center gap-1"
                                                    title={candidate.matchReason ?? undefined}
                                                >
                                                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-600">
                                                        매칭 {candidate.matchScore}점
                                                    </span>
                                                </div>
                                            )}
                                            <div className="mt-2 flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    disabled={convertCandidateMutation.isPending}
                                                    onClick={() =>
                                                        convertCandidateMutation.mutate(
                                                            candidate.id
                                                        )
                                                    }
                                                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <Check className="h-3 w-3" />
                                                    지원하기
                                                </button>
                                                {candidate.status === 'NEW' && (
                                                    <button
                                                        type="button"
                                                        disabled={saveCandidateMutation.isPending}
                                                        onClick={() =>
                                                            saveCandidateMutation.mutate(
                                                                candidate.id
                                                            )
                                                        }
                                                        title="저장"
                                                        className="rounded-lg border border-slate-200 px-2 py-1 text-slate-500 transition hover:bg-slate-100"
                                                    >
                                                        <Bookmark className="h-3 w-3" />
                                                    </button>
                                                )}
                                                {candidate.status === 'SAVED' && (
                                                    <span
                                                        title="저장됨"
                                                        className="rounded-lg border border-slate-200 px-2 py-1 text-emerald-500"
                                                    >
                                                        <BookmarkCheck className="h-3 w-3" />
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={dismissCandidateMutation.isPending}
                                                    onClick={() => {
                                                        if (confirm('이 후보를 무시할까요?')) {
                                                            dismissCandidateMutation.mutate(
                                                                candidate.id
                                                            );
                                                        }
                                                    }}
                                                    className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-500 transition hover:bg-slate-100"
                                                >
                                                    무시
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {candidates.length === 0 && (
                                    <p className="px-1 text-xs text-slate-400">
                                        수집된 공고가 없습니다.
                                    </p>
                                )}
                            </div>
                        </div>
                        {STAGE_ORDER.map((stage) => {
                            const items = byStage.get(stage) ?? [];
                            return (
                                <div
                                    key={stage}
                                    onDragOver={(e) => handleColumnDragOver(e, stage)}
                                    onDragLeave={() =>
                                        setDragOverStage((prev) => (prev === stage ? null : prev))
                                    }
                                    onDrop={(e) => handleColumnDrop(e, stage)}
                                    className={`flex h-full min-w-0 flex-col rounded-2xl border p-2.5 transition ${
                                        dragOverStage === stage
                                            ? 'border-slate-400 bg-slate-100'
                                            : 'border-slate-200 bg-slate-50'
                                    }`}
                                >
                                    <div className="mb-2 flex shrink-0 items-center justify-between px-1.5">
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-extrabold ${STAGE_ACCENT[stage]}`}
                                        >
                                            {STAGE_LABELS[stage]}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400">
                                            {items.length}
                                        </span>
                                    </div>
                                    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                                        {items.map((item) => {
                                            const dDay = dDayLabel(item.deadline);
                                            return (
                                                <div
                                                    key={item.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, item.id)}
                                                    onClick={() => openEditDrawer(item)}
                                                    className="cursor-grab rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow active:cursor-grabbing"
                                                >
                                                    <p className="truncate text-sm font-extrabold text-slate-800">
                                                        {item.companyName}
                                                    </p>
                                                    <p className="mt-0.5 truncate text-xs text-slate-500">
                                                        {item.positionTitle}
                                                    </p>
                                                    <div className="mt-2 flex items-center justify-between">
                                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                                                            {item.source}
                                                        </span>
                                                        {dDay && (
                                                            <span
                                                                className={`text-[10px] font-extrabold ${
                                                                    dDay === '마감'
                                                                        ? 'text-slate-300'
                                                                        : 'text-rose-500'
                                                                }`}
                                                            >
                                                                {dDay}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => shiftCalendarMonth(-1)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-black text-slate-900">
                            {calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월
                        </span>
                        <button
                            type="button"
                            onClick={() => shiftCalendarMonth(1)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400">
                        {WEEKDAY_LABELS.map((label) => (
                            <div key={label}>{label}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {calendarCells.map((cell, index) => {
                            if (!cell.date) {
                                return (
                                    <div
                                        key={`blank-${index}`}
                                        className="min-h-[92px] rounded-lg bg-slate-50"
                                    />
                                );
                            }
                            const dateKey = toDateKey(cell.date);
                            const events = deadlineEventsByDate.get(dateKey);
                            const isToday = dateKey === toDateKey(new Date());
                            return (
                                <div
                                    key={dateKey}
                                    className={`min-h-[92px] rounded-lg border p-1.5 ${
                                        isToday
                                            ? 'border-slate-900'
                                            : 'border-slate-100 bg-slate-50/50'
                                    }`}
                                >
                                    <p
                                        className={`mb-1 text-[11px] font-bold ${
                                            isToday ? 'text-slate-900' : 'text-slate-400'
                                        }`}
                                    >
                                        {cell.date.getDate()}
                                    </p>
                                    <div className="space-y-1">
                                        {events?.applications.map((item) => (
                                            <button
                                                key={`app-${item.id}`}
                                                type="button"
                                                onClick={() => openEditDrawer(item)}
                                                title={`${item.companyName} · 마감일`}
                                                className="block w-full truncate rounded bg-blue-50 px-1 py-0.5 text-left text-[10px] font-bold text-blue-700 transition hover:bg-blue-100"
                                            >
                                                {item.companyName}
                                            </button>
                                        ))}
                                        {events?.candidates.map((item) => (
                                            <div
                                                key={`cand-${item.id}`}
                                                title={`${item.companyName} · ${POSTING_SOURCE_LABELS[item.source]} (수집됨)`}
                                                className="truncate rounded border border-dashed border-slate-300 px-1 py-0.5 text-[10px] font-bold text-slate-500"
                                            >
                                                {item.companyName}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[11px] font-semibold text-slate-400">
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-sm bg-blue-100" /> 지원 공고 마감일
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-sm border border-dashed border-slate-300" />{' '}
                            수집된 공고 마감일
                        </span>
                    </div>
                </div>
            )}

            {drawer && (
                <div className="fixed inset-0 z-40 flex justify-end">
                    <div
                        className="absolute inset-0 bg-slate-900/30"
                        onClick={closeDrawer}
                        aria-hidden
                    />
                    <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-950">
                                {editingId !== null ? '지원 공고 수정' : '새 지원 공고 등록'}
                            </h3>
                            <button
                                type="button"
                                onClick={closeDrawer}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <span className="mb-1 block text-sm font-bold text-slate-600">
                                    공고 URL
                                </span>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={form.postingUrl ?? ''}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                postingUrl: e.target.value,
                                            }))
                                        }
                                        placeholder="https://..."
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        disabled={!form.postingUrl?.trim() || isParsingUrl}
                                        onClick={() => requestParseUrl(form.postingUrl!.trim())}
                                        title="URL 내용을 AI로 분석해 아래 항목을 채웁니다"
                                        className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <Sparkles className="h-3.5 w-3.5" />
                                        {isParsingUrl
                                            ? `분석 중... (${parseElapsedSeconds}초)`
                                            : 'AI 자동분석'}
                                    </button>
                                </div>
                                {isParsingUrl && (
                                    <p className="mt-1 text-xs text-slate-400">
                                        이미지 분석까지 필요하면 최대 1~2분 정도 걸릴 수 있어요.
                                        멈춘 게 아니니 잠시만 기다려주세요.
                                    </p>
                                )}
                            </div>

                            <label className="block text-sm">
                                <span className="mb-1 block font-bold text-slate-600">회사명</span>
                                <input
                                    required
                                    value={form.companyName}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            companyName: e.target.value,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                />
                            </label>
                            <label className="block text-sm">
                                <span className="mb-1 block font-bold text-slate-600">직무명</span>
                                <input
                                    required
                                    value={form.positionTitle}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            positionTitle: e.target.value,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                />
                            </label>
                            <label className="block text-sm">
                                <span className="mb-1 block font-bold text-slate-600">출처</span>
                                <input
                                    required
                                    placeholder="사람인 / 원티드 / 잡코리아 / 직접입력"
                                    value={form.source}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, source: e.target.value }))
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                />
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="block text-sm">
                                    <span className="mb-1 block font-bold text-slate-600">
                                        지원일
                                    </span>
                                    <input
                                        required
                                        type="date"
                                        value={form.appliedAt}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                appliedAt: e.target.value,
                                            }))
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                    />
                                </label>
                                <label className="block text-sm">
                                    <span className="mb-1 block font-bold text-slate-600">
                                        마감일
                                    </span>
                                    <input
                                        type="date"
                                        value={form.deadline ?? ''}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                deadline: e.target.value,
                                            }))
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                    />
                                </label>
                            </div>
                            <label className="block text-sm">
                                <span className="mb-1 block font-bold text-slate-600">
                                    연봉/근무조건 메모
                                </span>
                                <input
                                    value={form.salaryNote ?? ''}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            salaryNote: e.target.value,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                />
                            </label>
                            <label className="block text-sm">
                                <span className="mb-1 block font-bold text-slate-600">메모</span>
                                <textarea
                                    rows={3}
                                    value={form.memo ?? ''}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, memo: e.target.value }))
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                />
                            </label>

                            <details className="rounded-lg border border-slate-200">
                                <summary className="cursor-pointer select-none px-3 py-2 text-sm font-bold text-slate-600">
                                    상세 정보 (AI 자동분석으로 채워짐)
                                </summary>
                                <div className="space-y-3 px-3 pb-3 pt-1">
                                    {(
                                        [
                                            ['jobDescription', '직무 상세'],
                                            ['requiredQualifications', '지원자격'],
                                            ['preferredQualifications', '우대사항'],
                                            ['hiringProcess', '전형절차'],
                                            ['applicationMethod', '지원방법'],
                                            ['compensationDetail', '처우조건 상세'],
                                        ] as const
                                    ).map(([field, label]) => (
                                        <label key={field} className="block text-sm">
                                            <span className="mb-1 block font-bold text-slate-600">
                                                {label}
                                            </span>
                                            <textarea
                                                rows={3}
                                                value={form[field] ?? ''}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        [field]: e.target.value,
                                                    }))
                                                }
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </details>

                            <div className="flex items-center justify-between gap-2 pt-1">
                                {editingId !== null ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (confirm('이 지원 공고를 삭제할까요?')) {
                                                deleteMutation.mutate(editingId);
                                            }
                                        }}
                                        className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-700"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        삭제
                                    </button>
                                ) : (
                                    <span />
                                )}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={closeDrawer}
                                        className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {editingId !== null ? '수정 저장' : '등록'}
                                    </button>
                                </div>
                            </div>
                        </form>

                        {editingId !== null && editingApplication && (
                            <div className="mt-6 border-t border-slate-200 pt-5">
                                <p className="mb-2 text-sm font-bold text-slate-600">
                                    전형 단계 변경
                                </p>
                                <div className="mb-4 flex flex-wrap items-center gap-2">
                                    <select
                                        value={stageDraft ?? editingApplication.currentStage}
                                        onChange={(e) =>
                                            setStageDraft(e.target.value as JobApplicationStage)
                                        }
                                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none"
                                    >
                                        {STAGE_ORDER.map((stage) => (
                                            <option key={stage} value={stage}>
                                                {STAGE_LABELS[stage]}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        value={stageMemo}
                                        onChange={(e) => setStageMemo(e.target.value)}
                                        placeholder="메모(선택)"
                                        className="w-36 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        disabled={stageMutation.isPending}
                                        onClick={() =>
                                            stageMutation.mutate({
                                                id: editingId,
                                                stage:
                                                    stageDraft ?? editingApplication.currentStage,
                                                memo: stageMemo.trim() || undefined,
                                            })
                                        }
                                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        적용
                                    </button>
                                </div>

                                <p className="mb-2 text-sm font-bold text-slate-600">
                                    전형 진행 타임라인
                                </p>
                                {isStageEventsLoading ? (
                                    <p className="text-sm font-semibold text-slate-400">
                                        불러오는 중입니다.
                                    </p>
                                ) : stageEvents.length === 0 ? (
                                    <p className="text-sm font-semibold text-slate-400">
                                        기록된 이력이 없습니다.
                                    </p>
                                ) : (
                                    <ol className="space-y-2">
                                        {stageEvents.map((event) => (
                                            <li
                                                key={event.id}
                                                className="flex items-baseline gap-2 text-sm"
                                            >
                                                <span className="whitespace-nowrap font-mono text-xs text-slate-400">
                                                    {event.changedAt.replace('T', ' ').slice(0, 19)}
                                                </span>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${stageBadgeClass(event.stage)}`}
                                                >
                                                    {STAGE_LABELS[event.stage]}
                                                </span>
                                                {event.memo && (
                                                    <span className="truncate text-xs text-slate-500">
                                                        {event.memo}
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isIngestDrawerOpen && (
                <div className="fixed inset-0 z-40 flex justify-end">
                    <div
                        className="absolute inset-0 bg-slate-900/30"
                        onClick={() => setIsIngestDrawerOpen(false)}
                        aria-hidden
                    />
                    <div className="relative flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-950">공고 수집</h3>
                            <button
                                type="button"
                                onClick={() => setIsIngestDrawerOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="mb-4 text-sm text-slate-500">
                            아직 지원하지 않은 채용 공고 URL을 붙여넣으면 AI가
                            회사명·직무명·마감일을 분석해 수집됨 목록에 저장합니다. 나중에 보드에서
                            지원하기 버튼을 누르면 실제 지원 공고로 전환됩니다.
                        </p>
                        <div className="space-y-3">
                            <input
                                type="url"
                                autoFocus
                                value={ingestUrl}
                                onChange={(e) => setIngestUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                            />
                            <button
                                type="button"
                                disabled={!ingestUrl.trim() || isIngesting}
                                onClick={() => requestIngestUrl(ingestUrl.trim())}
                                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Sparkles className="h-4 w-4" />
                                {isIngesting
                                    ? `수집 중... (${ingestElapsedSeconds}초, 닫아도 계속 진행돼요)`
                                    : 'AI로 수집'}
                            </button>
                            {isIngesting && (
                                <p className="text-xs text-slate-400">
                                    이미지 분석까지 필요하면 최대 1~2분 정도 걸릴 수 있어요. 이 창을
                                    닫으셔도 수집은 계속 진행되고, 끝나면 목록에 자동으로 나타나요.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isSettingsDrawerOpen && settingsForm && (
                <div className="fixed inset-0 z-40 flex justify-end">
                    <div
                        className="absolute inset-0 bg-slate-900/30"
                        onClick={() => setIsSettingsDrawerOpen(false)}
                        aria-hidden
                    />
                    <div className="relative flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-950">수집 설정</h3>
                            <button
                                type="button"
                                onClick={() => setIsSettingsDrawerOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="mb-4 text-sm text-slate-500">
                            access-key 같은 비밀값은 서버 환경변수로만 관리하고, 여기 값들은
                            저장하면 재배포 없이 바로 적용됩니다.
                        </p>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                updateSettingsMutation.mutate(settingsForm);
                            }}
                            className="space-y-4"
                        >
                            <label className="flex items-center justify-between text-sm">
                                <span className="font-bold text-slate-600">
                                    사람인 자동 수집 사용
                                </span>
                                <input
                                    type="checkbox"
                                    checked={settingsForm.saraminEnabled}
                                    onChange={(e) =>
                                        setSettingsForm((prev) =>
                                            prev
                                                ? { ...prev, saraminEnabled: e.target.checked }
                                                : prev
                                        )
                                    }
                                    className="h-4 w-4"
                                />
                            </label>
                            <label className="flex items-center justify-between text-sm">
                                <span className="font-bold text-slate-600">
                                    자동 수집 스케줄 사용
                                </span>
                                <input
                                    type="checkbox"
                                    checked={settingsForm.collectorScheduledEnabled}
                                    onChange={(e) =>
                                        setSettingsForm((prev) =>
                                            prev
                                                ? {
                                                      ...prev,
                                                      collectorScheduledEnabled: e.target.checked,
                                                  }
                                                : prev
                                        )
                                    }
                                    className="h-4 w-4"
                                />
                            </label>
                            <label className="block text-sm">
                                <span className="mb-1 block font-bold text-slate-600">
                                    수집 스케줄 (cron)
                                </span>
                                <input
                                    value={settingsForm.collectorCron}
                                    onChange={(e) =>
                                        setSettingsForm((prev) =>
                                            prev ? { ...prev, collectorCron: e.target.value } : prev
                                        )
                                    }
                                    placeholder="0 0 8 * * *"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                />
                            </label>
                            <label className="block text-sm">
                                <span className="mb-1 block font-bold text-slate-600">
                                    검색 키워드
                                </span>
                                <input
                                    value={settingsForm.searchKeywords ?? ''}
                                    onChange={(e) =>
                                        setSettingsForm((prev) =>
                                            prev
                                                ? { ...prev, searchKeywords: e.target.value }
                                                : prev
                                        )
                                    }
                                    placeholder="비우면 보유 기술 상위 5개로 자동 검색"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                />
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="block text-sm">
                                    <span className="mb-1 block font-bold text-slate-600">
                                        결과 수 (최대 110)
                                    </span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={110}
                                        value={settingsForm.searchCount}
                                        onChange={(e) =>
                                            setSettingsForm((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          searchCount: Number(e.target.value),
                                                      }
                                                    : prev
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                    />
                                </label>
                                <label className="block text-sm">
                                    <span className="mb-1 block font-bold text-slate-600">
                                        정렬
                                    </span>
                                    <select
                                        value={settingsForm.searchSort}
                                        onChange={(e) =>
                                            setSettingsForm((prev) =>
                                                prev
                                                    ? { ...prev, searchSort: e.target.value }
                                                    : prev
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                    >
                                        <option value="pd">게시일 역순</option>
                                        <option value="pa">게시일순</option>
                                        <option value="ud">최근수정순</option>
                                        <option value="rc">조회수 역순</option>
                                        <option value="ac">지원자수 역순</option>
                                        <option value="da">마감일 정순</option>
                                        <option value="dd">마감일 역순</option>
                                    </select>
                                </label>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <label className="block text-sm">
                                    <span className="mb-1 block font-bold text-slate-600">
                                        지역코드
                                    </span>
                                    <input
                                        value={settingsForm.locationCode ?? ''}
                                        onChange={(e) =>
                                            setSettingsForm((prev) =>
                                                prev
                                                    ? { ...prev, locationCode: e.target.value }
                                                    : prev
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                    />
                                </label>
                                <label className="block text-sm">
                                    <span className="mb-1 block font-bold text-slate-600">
                                        직무코드
                                    </span>
                                    <input
                                        value={settingsForm.jobCode ?? ''}
                                        onChange={(e) =>
                                            setSettingsForm((prev) =>
                                                prev ? { ...prev, jobCode: e.target.value } : prev
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                    />
                                </label>
                                <label className="block text-sm">
                                    <span className="mb-1 block font-bold text-slate-600">
                                        업종코드
                                    </span>
                                    <input
                                        value={settingsForm.industryCode ?? ''}
                                        onChange={(e) =>
                                            setSettingsForm((prev) =>
                                                prev
                                                    ? { ...prev, industryCode: e.target.value }
                                                    : prev
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                    />
                                </label>
                            </div>
                            <label className="block text-sm">
                                <span className="mb-1 block font-bold text-slate-600">
                                    매칭 키워드 임계치
                                </span>
                                <input
                                    type="number"
                                    min={0}
                                    value={settingsForm.matchingKeywordThreshold}
                                    onChange={(e) =>
                                        setSettingsForm((prev) =>
                                            prev
                                                ? {
                                                      ...prev,
                                                      matchingKeywordThreshold: Number(
                                                          e.target.value
                                                      ),
                                                  }
                                                : prev
                                        )
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                />
                                <span className="mt-1 block text-xs text-slate-400">
                                    보유 기술과 겹치는 키워드 수가 이 값 이상이어야 AI 매칭 점수를
                                    생성합니다.
                                </span>
                            </label>
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setIsSettingsDrawerOpen(false)}
                                    className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={updateSettingsMutation.isPending}
                                    className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    저장
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
