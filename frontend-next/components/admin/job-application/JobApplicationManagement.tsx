'use client';

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type DragEvent,
    type FormEvent,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { adminDetailMarkdownComponents } from '@/lib/markdown';
import { parseJobplanetClipboard } from '@/lib/jobplanet';
import {
    AlertTriangle,
    Bookmark,
    BookmarkCheck,
    Briefcase,
    Calendar as CalendarIcon,
    Check,
    ChevronDown,
    Clipboard,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Eye,
    EyeOff,
    FileText,
    Info,
    LayoutGrid,
    List as ListIcon,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    Settings as SettingsIcon,
    Sparkles,
    Trash2,
    X,
} from 'lucide-react';
import { ApiError, imageApi, jobPostingApi, printTemplateApi } from '@/lib/api';
import { useSlideDrawer } from '@/lib/hooks/useSlideDrawer';
import { PostingMemoEditor } from './PostingMemoEditor';
import type {
    GapProjectDocument,
    JobPosting,
    JobPostingCoverLetterItemRequest,
    JobPostingPrintDraftResponse,
    JobPostingRequest,
    JobPostingSettingRequest,
    JobPostingStatus,
    JobPostingStatusEvent,
    JobplanetLookup,
} from '@/lib/api/types';

/** status가 이 중 하나면 아직 지원 전(수집 후보) 단계다 — 나머지는 전형 진행 단계. */
type PreApplicationStatus = 'NEW' | 'SAVED' | 'DISMISSED' | 'EXPIRED';
type ApplicationStatus = Exclude<JobPostingStatus, PreApplicationStatus>;

const PRE_APPLICATION_STATUSES: PreApplicationStatus[] = ['NEW', 'SAVED', 'DISMISSED', 'EXPIRED'];

function isPreApplication(status: JobPostingStatus): status is PreApplicationStatus {
    return (PRE_APPLICATION_STATUSES as JobPostingStatus[]).includes(status);
}

const CANDIDATE_STATUS_LABELS: Record<PreApplicationStatus, string> = {
    NEW: '수집됨',
    SAVED: '저장됨',
    DISMISSED: '제외됨',
    EXPIRED: '마감',
};

const STAGE_LABELS: Record<ApplicationStatus, string> = {
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

const STATUS_LABELS: Record<JobPostingStatus, string> = {
    ...CANDIDATE_STATUS_LABELS,
    ...STAGE_LABELS,
};

const STAGE_ORDER: ApplicationStatus[] = [
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

const STAGE_ACCENT: Record<ApplicationStatus, string> = {
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

function stageBadgeClass(status: ApplicationStatus): string {
    if (status === 'OFFER') return 'bg-emerald-50 text-emerald-600';
    if (status === 'REJECTED' || status === 'WITHDRAWN') return 'bg-rose-50 text-rose-600';
    return 'bg-slate-100 text-slate-600';
}

function statusEventBadgeClass(status: JobPostingStatus): string {
    if (!isPreApplication(status)) return stageBadgeClass(status);
    if (status === 'NEW') return 'bg-blue-50 text-blue-600';
    if (status === 'SAVED') return 'bg-amber-50 text-amber-700';
    if (status === 'DISMISSED') return 'bg-slate-100 text-slate-500';
    return 'bg-rose-50 text-rose-600';
}

function statusEventLabel(
    event: JobPostingStatusEvent,
    index: number,
    events: JobPostingStatusEvent[]
): string {
    if (event.status === 'NEW' && event.memo === '지원 취소') return '지원 취소';
    if (
        event.status === 'APPLIED' &&
        events
            .slice(0, index)
            .some((previous) => previous.status === 'NEW' && previous.memo === '지원 취소')
    ) {
        return '재지원 완료';
    }
    return STATUS_LABELS[event.status];
}

function statusEventMemo(event: JobPostingStatusEvent): string | null {
    if (event.status === 'NEW' && event.memo === '지원 취소') return '수집됨 복귀';
    if (event.status === 'APPLIED' && event.memo === '지원 전환') return null;
    return event.memo;
}

// candidates 목록에는 백엔드가 EXPIRED를 제외하고 내려주므로 실질적으로 NEW/SAVED/DISMISSED만 나온다.
const CANDIDATE_FILTERABLE_STATUSES: PreApplicationStatus[] = ['NEW', 'SAVED', 'DISMISSED'];

const DEADLINE_SOON_THRESHOLD_DAYS = 7;

function isDeadlineSoon(deadline: string | null): boolean {
    if (!deadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${deadline}T00:00:00`);
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
    return diffDays <= DEADLINE_SOON_THRESHOLD_DAYS;
}

/** AI가 담당업무/자격요건/우대사항/전형절차/지원방법/처우조건을 하나도 못 뽑아냈으면, 원본 URL이
 * 상세 페이지가 아니었거나 사이트가 자동 수집을 막았을 가능성이 높다 — 이럴 땐 수동 입력을 유도한다. */
function isCandidateDetailMissing(candidate: JobPosting): boolean {
    return (
        !candidate.jobDescription &&
        !candidate.requiredQualifications &&
        !candidate.preferredQualifications &&
        !candidate.hiringProcess &&
        !candidate.applicationMethod &&
        !candidate.compensationDetail
    );
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

function getDDayBadgeStyle(deadline: string | null): string {
    if (!deadline) return 'bg-slate-100 text-slate-500 border border-slate-200';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${deadline}T00:00:00`);
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

    if (diffDays < 0) {
        return 'bg-slate-100 text-slate-400 border border-slate-200';
    }
    if (diffDays <= 7) {
        return 'bg-rose-50 text-rose-600 border border-rose-200';
    }
    if (diffDays <= 14) {
        return 'bg-blue-50 text-blue-600 border border-blue-200';
    }
    return 'bg-slate-100 text-slate-600 border border-slate-200';
}

function sortByDeadlineAsc<T extends { deadline: string | null; id: number }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
        if (a.deadline && b.deadline) {
            const cmp = a.deadline.localeCompare(b.deadline);
            if (cmp !== 0) return cmp;
            return b.id - a.id;
        }
        if (a.deadline && !b.deadline) return -1;
        if (!a.deadline && b.deadline) return 1;
        return b.id - a.id;
    });
}

function AlwaysOpenBadge({ rounded = 'rounded' }: { rounded?: 'rounded' | 'rounded-full' }) {
    return (
        <span
            className={`${rounded} shrink-0 whitespace-nowrap px-1.5 py-0.5 text-[10px] font-extrabold bg-emerald-50 text-emerald-600`}
        >
            상시채용
        </span>
    );
}

function MatchScoreBadge({
    score,
    reason,
}: {
    score: number | null | undefined;
    reason?: string | null;
}) {
    if (score === null || score === undefined) {
        return <span className="text-slate-300">—</span>;
    }

    if (score >= 80) {
        return (
            <span className="font-extrabold text-emerald-600" title={reason ?? undefined}>
                {score}점
            </span>
        );
    }

    return (
        <span className="font-medium text-slate-500" title={reason ?? undefined}>
            {score}점
        </span>
    );
}

function JobplanetScoreBadge({
    rating,
    reviewCount,
    companyUrl,
}: {
    rating: number | null | undefined;
    reviewCount?: number | null;
    companyUrl?: string | null;
}) {
    if (rating === null || rating === undefined) {
        return <span className="text-slate-300">—</span>;
    }

    const badge = (
        <span className="inline-flex items-center gap-1 font-extrabold text-amber-500">
            <span aria-hidden>★</span>
            {rating.toFixed(1)}
            {reviewCount !== null && reviewCount !== undefined && (
                <span className="text-[10px] font-semibold text-slate-400">
                    ({reviewCount.toLocaleString()})
                </span>
            )}
        </span>
    );

    return companyUrl ? (
        <a
            href={companyUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            title="잡플래닛 기업 페이지 열기"
            className="hover:opacity-75"
        >
            {badge}
        </a>
    ) : (
        badge
    );
}

/** AI가 자격요건/우대사항 등을 줄바꿈으로 구분된 목록으로 저장해두므로(PARSE_PROMPT 계약),
 * 2줄 이상이면 불릿 리스트로, 1줄이면 기존처럼 문단으로 보여준다. */
function BulletText({ text }: { text: string }) {
    const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    if (lines.length <= 1) {
        return <p className="whitespace-pre-wrap text-slate-800">{text}</p>;
    }
    return (
        <ul className="list-disc space-y-1 pl-4 text-slate-800">
            {lines.map((line, index) => (
                <li key={index}>{line}</li>
            ))}
        </ul>
    );
}

type DetailFieldKey =
    | 'jobDescription'
    | 'requiredQualifications'
    | 'preferredQualifications'
    | 'hiringProcess'
    | 'applicationMethod'
    | 'compensationDetail';

const DETAIL_FIELD_ORDER: DetailFieldKey[] = [
    'jobDescription',
    'requiredQualifications',
    'preferredQualifications',
    'hiringProcess',
    'applicationMethod',
    'compensationDetail',
];

const DETAIL_FIELD_LABELS: Record<DetailFieldKey, string> = {
    jobDescription: '직무 상세',
    requiredQualifications: '지원자격',
    preferredQualifications: '우대사항',
    hiringProcess: '전형절차',
    applicationMethod: '지원방법',
    compensationDetail: '처우조건 상세',
};

/** "상세 정보"를 필드별로 접힌 박스에 쌓지 않고 탭으로 전환해 보여준다. 부모가 `key={item.id}`로
 * 렌더링해 대상이 바뀌면 이 컴포넌트가 리마운트되면서 선택된 탭이 자연스럽게 초기화된다. */
function DetailTabs({ fields }: { fields: Partial<Record<DetailFieldKey, string | null>> }) {
    const available = DETAIL_FIELD_ORDER.filter((key) => fields[key]);
    const [activeTab, setActiveTab] = useState<DetailFieldKey | null>(available[0] ?? null);
    if (available.length === 0) return null;
    const current = activeTab && available.includes(activeTab) ? activeTab : available[0];

    return (
        <div>
            <div className="flex gap-3 overflow-x-auto border-b border-slate-100">
                {available.map((key) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        className={`-mb-px shrink-0 border-b px-0.5 pb-1.5 text-[13px] font-semibold transition ${
                            current === key
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        {DETAIL_FIELD_LABELS[key]}
                    </button>
                ))}
            </div>
            <div className="pt-3 text-sm">{current && <BulletText text={fields[current]!} />}</div>
        </div>
    );
}

type SectionTab = { key: string; label: ReactNode; content: ReactNode };

const SECTION_TABS_SIZE = {
    lg: {
        gap: 'gap-6',
        border: 'border-b-[3px]',
        pad: 'pb-2.5',
        text: 'text-[15px] font-extrabold',
    },
    sm: { gap: 'gap-4', border: 'border-b-2', pad: 'pb-1.5', text: 'text-sm font-bold' },
} as const;

/** 상세 정보 탭(DetailTabs)과 나란히 있던 다른 섹션(전형 진행, 경력 매칭 분석 등)을 같은 층위의
 * 탭으로 묶어 이중 탭 구조를 만든다. 부모가 `key={item.id}`로 렌더링해야 대상이 바뀔 때 선택된
 * 탭이 자연스럽게 초기화된다. `bordered=false`를 주면 상단 구분선을 생략한다 — 이미 다른 탭의
 * 내용(content) 안에 중첩돼 그 자체로 구분되는 경우(예: 경력 매칭 분석 내부)에 쓴다. 중첩된 하단
 * 탭은 `size="sm"`으로 상위 탭보다 한 단계 작게 그려 계층을 눈으로 구분할 수 있게 한다. */
function SectionTabs({
    tabs,
    bordered = true,
    size = 'lg',
}: {
    tabs: SectionTab[];
    bordered?: boolean;
    size?: keyof typeof SECTION_TABS_SIZE;
}) {
    const [activeKey, setActiveKey] = useState(tabs[0]?.key);
    if (tabs.length === 0) return null;
    const current = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];
    const s = SECTION_TABS_SIZE[size];

    return (
        <div className={`min-w-0 ${bordered ? 'border-t border-slate-200 pt-5' : ''}`}>
            <div
                className={`flex ${s.gap} min-w-0 overflow-x-auto overflow-y-hidden border-b border-slate-200`}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveKey(tab.key)}
                        className={`-mb-px shrink-0 ${s.border} px-0.5 ${s.pad} ${s.text} transition ${
                            current.key === tab.key
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="pt-4">{current.content}</div>
        </div>
    );
}

/** 마우스를 올리면 짧은 설명을 보여주는 작은 정보 아이콘. 브라우저 기본 `title` 툴팁은 등장이
 * 느리고 스타일을 못 입혀서, hover 시 즉시 뜨는 커스텀 말풍선으로 대신한다. */
function InfoTooltip({
    text,
    iconClassName = 'text-slate-300',
}: {
    text: string;
    iconClassName?: string;
}) {
    return (
        <span className="group relative inline-flex">
            <Info className={`h-3.5 w-3.5 ${iconClassName}`} />
            <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 w-56 max-w-[70vw] rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-normal normal-case leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                {text}
            </span>
        </span>
    );
}

type CoverLetterDraft = JobPostingCoverLetterItemRequest & { clientId: string };

function newCoverLetterDraft(
    item: JobPostingCoverLetterItemRequest = {
        question: '',
        answer: '',
        characterLimit: null,
    }
): CoverLetterDraft {
    return {
        ...item,
        clientId: crypto.randomUUID(),
    };
}

/** 질문과 글자 수 제한은 "문항 관리"에서 구성하고, 답변은 평소 화면에서 언제든 바로 수정한다.
 * 답변이 비어 있어도 문항만 먼저 저장할 수 있으며 수정 이력은 만들지 않는다. */
function CoverLetterEditor({ jobPostingId }: { jobPostingId: number }) {
    const queryClient = useQueryClient();
    const queryKey = ['jobPostings', jobPostingId, 'coverLetterItems'] as const;
    const [isManaging, setIsManaging] = useState(false);
    const [drafts, setDrafts] = useState<CoverLetterDraft[]>([]);
    const [answerDrafts, setAnswerDrafts] = useState<Record<number, string>>({});
    const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(() => new Set());

    const {
        data: items = [],
        isLoading,
        isError,
    } = useQuery({
        queryKey,
        queryFn: () => jobPostingApi.coverLetterItems(jobPostingId),
    });

    const saveMutation = useMutation({
        mutationFn: (payload: JobPostingCoverLetterItemRequest[]) =>
            jobPostingApi.replaceCoverLetterItems(jobPostingId, payload),
        onSuccess: (savedItems) => {
            queryClient.setQueryData(queryKey, savedItems);
            setIsManaging(false);
            setAnswerDrafts({});
        },
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '자소서 저장에 실패했습니다.'),
    });

    function startManaging() {
        setDrafts(
            items.length > 0
                ? items.map((item) =>
                      newCoverLetterDraft({
                          question: item.question,
                          answer: answerDrafts[item.id] ?? item.answer,
                          characterLimit: item.characterLimit,
                      })
                  )
                : [newCoverLetterDraft()]
        );
        setIsManaging(true);
    }

    function saveQuestions() {
        const payload = drafts.map(({ question, answer, characterLimit }) => ({
            question: question.trim(),
            answer,
            characterLimit,
        }));
        if (payload.some((item) => !item.question)) {
            alert('각 자소서 문항의 질문을 입력해주세요.');
            return;
        }
        saveMutation.mutate(payload);
    }

    function saveAnswers() {
        saveMutation.mutate(
            items.map((item) => ({
                question: item.question,
                answer: answerDrafts[item.id] ?? item.answer,
                characterLimit: item.characterLimit,
            }))
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 py-6 text-sm font-semibold text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                자소서를 불러오는 중입니다.
            </div>
        );
    }

    if (isError) {
        return (
            <p className="py-6 text-sm font-semibold text-rose-500">
                자소서를 불러오지 못했습니다.
            </p>
        );
    }

    if (!isManaging) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-slate-400">
                        문항을 먼저 등록하고 답변은 필요할 때마다 바로 수정하세요.
                    </p>
                    <button
                        type="button"
                        onClick={startManaging}
                        className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                        {items.length > 0 ? (
                            <SettingsIcon className="h-3.5 w-3.5" />
                        ) : (
                            <Plus className="h-3.5 w-3.5" />
                        )}
                        {items.length > 0 ? '문항 관리' : '문항 추가'}
                    </button>
                </div>

                {items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                        <p className="text-sm font-bold text-slate-500">
                            저장된 자소서가 없습니다.
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            질문과 글자 수 제한을 먼저 등록해보세요.
                        </p>
                    </div>
                ) : (
                    <ol className="space-y-4">
                        {items.map((item, index) => (
                            <li
                                key={item.id}
                                className="overflow-hidden rounded-xl border border-slate-200"
                            >
                                <button
                                    type="button"
                                    aria-expanded={expandedIndexes.has(index)}
                                    aria-controls={`cover-letter-answer-${item.id}`}
                                    onClick={() =>
                                        setExpandedIndexes((current) => {
                                            const next = new Set(current);
                                            if (next.has(index)) next.delete(index);
                                            else next.add(index);
                                            return next;
                                        })
                                    }
                                    className="flex w-full items-start justify-between gap-3 p-4 text-left transition hover:bg-slate-50"
                                >
                                    <div className="min-w-0">
                                        <p className="text-xs font-extrabold text-slate-400">
                                            문항 {index + 1}
                                        </p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm font-extrabold text-slate-800">
                                            {item.question}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                                            {item.characterLimit
                                                ? `${item.characterLimit.toLocaleString()}자`
                                                : '제한 없음'}
                                        </span>
                                        <ChevronDown
                                            className={`mt-0.5 h-4 w-4 text-slate-400 transition-transform ${
                                                expandedIndexes.has(index) ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </div>
                                </button>
                                {expandedIndexes.has(index) && (
                                    <div
                                        id={`cover-letter-answer-${item.id}`}
                                        className="border-t border-slate-100 p-4"
                                    >
                                        <label className="block">
                                            <span className="mb-1 block text-xs font-bold text-slate-500">
                                                답변
                                            </span>
                                            <textarea
                                                rows={9}
                                                value={answerDrafts[item.id] ?? item.answer}
                                                onChange={(event) =>
                                                    setAnswerDrafts((current) => ({
                                                        ...current,
                                                        [item.id]: event.target.value,
                                                    }))
                                                }
                                                placeholder="답변을 작성하세요. 비워둔 상태로도 문항은 유지됩니다."
                                                className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6 focus:border-slate-400 focus:outline-none"
                                            />
                                        </label>
                                        <div className="mt-1 flex items-center justify-between gap-3">
                                            {(() => {
                                                const length = (
                                                    answerDrafts[item.id] ?? item.answer
                                                ).length;
                                                const overLimit =
                                                    item.characterLimit !== null &&
                                                    length > item.characterLimit;
                                                return (
                                                    <span
                                                        className={`text-[11px] font-semibold ${
                                                            overLimit
                                                                ? 'text-rose-500'
                                                                : 'text-slate-400'
                                                        }`}
                                                    >
                                                        {length.toLocaleString()}자
                                                        {item.characterLimit !== null &&
                                                            ` / ${item.characterLimit.toLocaleString()}자`}
                                                        {overLimit &&
                                                            ` · ${(length - item.characterLimit!).toLocaleString()}자 초과`}
                                                    </span>
                                                );
                                            })()}
                                            <button
                                                type="button"
                                                disabled={
                                                    saveMutation.isPending ||
                                                    (answerDrafts[item.id] ?? item.answer) ===
                                                        item.answer
                                                }
                                                onClick={saveAnswers}
                                                className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
                                            >
                                                {saveMutation.isPending ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Check className="h-3.5 w-3.5" />
                                                )}
                                                답변 저장
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {drafts.map((draft, index) => (
                <div key={draft.clientId} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-extrabold text-slate-500">문항 {index + 1}</p>
                        <button
                            type="button"
                            onClick={() =>
                                setDrafts((current) =>
                                    current.filter((item) => item.clientId !== draft.clientId)
                                )
                            }
                            aria-label={`${index + 1}번 문항 삭제`}
                            className="rounded-md p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <label className="block">
                        <span className="mb-1 block text-xs font-bold text-slate-500">질문</span>
                        <textarea
                            rows={2}
                            value={draft.question}
                            onChange={(event) =>
                                setDrafts((current) =>
                                    current.map((item) =>
                                        item.clientId === draft.clientId
                                            ? { ...item, question: event.target.value }
                                            : item
                                    )
                                )
                            }
                            placeholder="자기소개서 문항을 입력하세요."
                            className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                        />
                    </label>
                    <label className="mt-3 block">
                        <span className="mb-1 block text-xs font-bold text-slate-500">
                            글자 수 제한
                        </span>
                        <input
                            type="number"
                            min={1}
                            value={draft.characterLimit ?? ''}
                            onChange={(event) =>
                                setDrafts((current) =>
                                    current.map((item) =>
                                        item.clientId === draft.clientId
                                            ? {
                                                  ...item,
                                                  characterLimit: event.target.value
                                                      ? Number(event.target.value)
                                                      : null,
                                              }
                                            : item
                                    )
                                )
                            }
                            placeholder="제한이 없으면 비워두세요."
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                        />
                    </label>
                </div>
            ))}

            <button
                type="button"
                onClick={() => setDrafts((current) => [...current, newCoverLetterDraft()])}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2.5 text-sm font-bold text-slate-500 transition hover:border-slate-400 hover:bg-slate-50"
            >
                <Plus className="h-4 w-4" />
                문항 추가
            </button>

            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    disabled={saveMutation.isPending}
                    onClick={() => setIsManaging(false)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                >
                    취소
                </button>
                <button
                    type="button"
                    disabled={saveMutation.isPending}
                    onClick={saveQuestions}
                    className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                    {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    문항 저장
                </button>
            </div>
        </div>
    );
}

/** 이 지원 공고와 연동된 PDF 인쇄 템플릿 목록. 공고당 여러 초안을 만들 수 있고,
 * 그중 실제로 제출한 것 하나를 "최종 제출본"으로 표시해둘 수 있다. */
const MAX_FINAL_PDF_SIZE_BYTES = 20 * 1024 * 1024;

function PrintTemplatesPanel({
    jobPostingId,
    hasAppealAnalysis,
    appealAnalyzedAt,
}: {
    jobPostingId: number;
    hasAppealAnalysis: boolean;
    appealAnalyzedAt?: string | null;
}) {
    const queryClient = useQueryClient();
    const queryKey = ['jobPostings', jobPostingId, 'printTemplates'] as const;
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [pendingUploadId, setPendingUploadId] = useState<number | null>(null);
    const [uploadingId, setUploadingId] = useState<number | null>(null);
    const [latestDraft, setLatestDraft] = useState<JobPostingPrintDraftResponse | null>(null);

    const {
        data: templates = [],
        isLoading,
        isError,
    } = useQuery({
        queryKey,
        queryFn: () => printTemplateApi.listByJobPosting(jobPostingId),
    });

    const markFinalMutation = useMutation({
        mutationFn: (id: number) => printTemplateApi.markFinal(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '최종 제출본 지정에 실패했습니다.'),
    });

    const unmarkFinalMutation = useMutation({
        mutationFn: (id: number) => printTemplateApi.unmarkFinal(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '최종 제출본 해제에 실패했습니다.'),
    });

    const removeFinalPdfMutation = useMutation({
        mutationFn: (id: number) => printTemplateApi.removeFinalPdf(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : 'PDF 삭제에 실패했습니다.'),
    });

    const generatePrintDraftMutation = useMutation({
        mutationFn: () => jobPostingApi.generatePrintDraft(jobPostingId),
        onSuccess: (result) => {
            setLatestDraft(result);
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (error) =>
            alert(
                error instanceof ApiError
                    ? `PDF 초안을 만들지 못했습니다. ${error.message}`
                    : 'PDF 초안을 만들지 못했습니다.'
            ),
    });

    function requestUpload(templateId: number) {
        setPendingUploadId(templateId);
        fileInputRef.current?.click();
    }

    async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        const templateId = pendingUploadId;
        e.target.value = '';
        setPendingUploadId(null);
        if (!file || !templateId) return;

        if (file.type !== 'application/pdf') {
            alert('PDF 파일만 업로드할 수 있습니다.');
            return;
        }
        if (file.size > MAX_FINAL_PDF_SIZE_BYTES) {
            alert('파일이 너무 큽니다(최대 20MB).');
            return;
        }

        setUploadingId(templateId);
        try {
            const presigned = await imageApi.requestPresignedUpload(
                'PRINT_TEMPLATE_FINAL_PDF',
                file.name,
                file.type
            );
            await imageApi.uploadToPresignedUrl(presigned.uploadUrl, file);
            await printTemplateApi.attachFinalPdf(templateId, presigned.objectKey);
            queryClient.invalidateQueries({ queryKey });
        } catch (error) {
            alert(error instanceof ApiError ? error.message : 'PDF 업로드에 실패했습니다.');
        } finally {
            setUploadingId(null);
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 py-6 text-sm font-semibold text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                연동된 PDF 템플릿을 불러오는 중입니다.
            </div>
        );
    }

    if (isError) {
        return (
            <p className="py-6 text-sm font-semibold text-rose-500">
                PDF 템플릿 목록을 불러오지 못했습니다.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileSelected}
            />
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-extrabold text-indigo-900">AI 맞춤 초안</p>
                        <p className="mt-1 text-xs leading-5 text-indigo-700">
                            {hasAppealAnalysis
                                ? '현재 어필 포인트 분석을 기준으로 PDF에 넣을 내용과 뺄 내용을 구성합니다.'
                                : '먼저 경력 매칭 분석 탭에서 AI 어필 포인트 분석을 실행해 주세요.'}
                        </p>
                        {appealAnalyzedAt && (
                            <p className="mt-1 text-[11px] font-semibold text-indigo-400">
                                마지막 분석 · {appealAnalyzedAt.replace('T', ' ').slice(0, 16)}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        disabled={!hasAppealAnalysis || generatePrintDraftMutation.isPending}
                        onClick={() => generatePrintDraftMutation.mutate()}
                        className="flex shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {generatePrintDraftMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <FileText className="h-3.5 w-3.5" />
                        )}
                        {generatePrintDraftMutation.isPending
                            ? '초안 구성 중...'
                            : templates.length > 0
                              ? '새 AI 초안 생성'
                              : 'AI 초안 생성'}
                    </button>
                </div>
            </div>

            {latestDraft && (
                <div className="rounded-xl border border-indigo-200 bg-white p-3.5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm font-extrabold text-indigo-900">
                                AI PDF 초안이 만들어졌습니다
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-600">
                                {latestDraft.strategySummary}
                            </p>
                            <p className="mt-1 text-[11px] font-semibold text-slate-400">
                                포함 후보 {latestDraft.includedCount}개 · 제외 설정{' '}
                                {latestDraft.excludedCount}개 · 목표 직무 {latestDraft.targetRole}
                            </p>
                        </div>
                        <a
                            href={`/print?admin=1&templateId=${latestDraft.templateId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            초안 열기
                        </a>
                    </div>
                    {latestDraft.warnings.length > 0 && (
                        <ul className="mt-2 space-y-1 border-t border-indigo-100 pt-2">
                            {latestDraft.warnings.map((warning, index) => (
                                <li
                                    key={`${index}-${warning}`}
                                    className="text-[11px] text-amber-700"
                                >
                                    확인 필요 · {warning}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-400">
                    실제로 제출한 PDF 파일을 올려두면 그 자체가 최종 제출본이 됩니다(이후 이력서
                    내용이 바뀌어도 이 파일은 그대로 남습니다).
                </p>
                <a
                    href={`/print?admin=1&jobPostingId=${jobPostingId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                >
                    <Plus className="h-3.5 w-3.5" />새 템플릿 만들기
                </a>
            </div>

            {templates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                    <p className="text-sm font-bold text-slate-500">
                        아직 연동된 PDF 템플릿이 없습니다.
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        위 버튼으로 인쇄 화면을 열고 &ldquo;템플릿으로 저장&rdquo;할 때 이 공고를
                        선택하면 여기 나타납니다.
                    </p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {templates.map((t) => (
                        <li
                            key={t.id}
                            className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${
                                t.isFinalSubmission
                                    ? 'border-emerald-300 bg-emerald-50'
                                    : 'border-slate-200 bg-white'
                            }`}
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="truncate text-sm font-bold text-slate-900">
                                        {t.name}
                                    </span>
                                    {t.isFinalSubmission && (
                                        <span className="shrink-0 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-black text-white">
                                            최종 제출본
                                        </span>
                                    )}
                                    {t.source === 'AI' && (
                                        <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-black text-indigo-600">
                                            AI 초안
                                        </span>
                                    )}
                                    {t.finalPdfUrl && (
                                        <span className="shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                                            PDF 첨부됨
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                                <a
                                    href={`/print?admin=1&templateId=${t.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                >
                                    설정 열기
                                </a>
                                {t.finalPdfUrl && (
                                    <a
                                        href={t.finalPdfUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                    >
                                        PDF 보기
                                    </a>
                                )}
                                <button
                                    type="button"
                                    disabled={uploadingId === t.id}
                                    onClick={() => requestUpload(t.id)}
                                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    {uploadingId === t.id && (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    )}
                                    {t.finalPdfUrl ? 'PDF 교체' : 'PDF 업로드'}
                                </button>
                                {t.finalPdfUrl && (
                                    <button
                                        type="button"
                                        disabled={removeFinalPdfMutation.isPending}
                                        onClick={() => removeFinalPdfMutation.mutate(t.id)}
                                        className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                    >
                                        PDF 삭제
                                    </button>
                                )}
                                {!t.finalPdfUrl &&
                                    (t.isFinalSubmission ? (
                                        <button
                                            type="button"
                                            disabled={unmarkFinalMutation.isPending}
                                            onClick={() => unmarkFinalMutation.mutate(t.id)}
                                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            지정 해제
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={markFinalMutation.isPending}
                                            onClick={() => markFinalMutation.mutate(t.id)}
                                            className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            최종 제출본으로 지정
                                        </button>
                                    ))}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function JobplanetEditor({
    lookup,
    onCancel,
    onSaved,
}: {
    lookup: JobplanetLookup;
    onCancel: () => void;
    onSaved: () => void;
}) {
    const [companyName, setCompanyName] = useState(
        lookup.jobplanetCompanyName ?? lookup.companyName
    );
    const [rating, setRating] = useState(lookup.rating === null ? '' : String(lookup.rating));
    const [reviewCount, setReviewCount] = useState(
        lookup.reviewCount === null ? '' : String(lookup.reviewCount)
    );
    const [companyUrl, setCompanyUrl] = useState(lookup.companyUrl ?? '');
    const [importText, setImportText] = useState('');
    const [importNotice, setImportNotice] = useState<string | null>(null);
    const saveMutation = useMutation({
        mutationFn: () =>
            jobPostingApi.saveJobplanet(lookup.jobPostingId, {
                companyName: companyName.trim(),
                rating: Number(rating),
                reviewCount: reviewCount.trim() ? Number(reviewCount) : null,
                companyUrl: companyUrl.trim(),
            }),
        onSuccess: onSaved,
        onError: (error) =>
            alert(
                error instanceof ApiError ? error.message : '잡플래닛 정보를 저장하지 못했습니다.'
            ),
    });
    const canSave =
        companyName.trim().length > 0 &&
        companyUrl.trim().length > 0 &&
        rating.trim().length > 0 &&
        Number(rating) >= 0 &&
        Number(rating) <= 5;

    function applyClipboardText(text: string) {
        const parsed = parseJobplanetClipboard(text, companyName || lookup.companyName);
        if (parsed.found.length === 0) {
            setImportNotice(
                '평점·리뷰 수·잡플래닛 URL을 찾지 못했습니다. 복사 범위를 확인해주세요.'
            );
            return;
        }
        if (parsed.found.includes('companyName')) setCompanyName(parsed.companyName);
        if (parsed.rating !== null) setRating(String(parsed.rating));
        if (parsed.reviewCount !== null) setReviewCount(String(parsed.reviewCount));
        if (parsed.companyUrl) setCompanyUrl(parsed.companyUrl);

        const labels = parsed.found.map((field) => {
            if (field === 'rating') return '평점';
            if (field === 'reviewCount') return '리뷰 수';
            if (field === 'companyUrl') return 'URL';
            return '기업명';
        });
        setImportNotice(`${labels.join(' · ')} 항목을 자동으로 채웠습니다.`);
    }

    async function importFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            setImportText(text);
            applyClipboardText(text);
        } catch {
            setImportNotice('클립보드를 읽지 못했습니다. 아래 입력란에 직접 붙여넣어 주세요.');
        }
    }

    return (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <div className="rounded-lg border border-dashed border-amber-300 bg-white/80 p-2.5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-extrabold text-amber-700">
                            클립보드에서 자동 채우기
                        </p>
                        <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                            잡플래닛 기업 페이지의 회사명·평점·리뷰 수 영역이나 주소창 URL을 복사해
                            가져오세요. 여러 번 가져오면 찾은 항목만 덮어씁니다.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={importFromClipboard}
                        className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-amber-600"
                    >
                        <Clipboard className="h-3.5 w-3.5" />
                        클립보드 가져오기
                    </button>
                </div>
                <textarea
                    value={importText}
                    onChange={(event) => setImportText(event.target.value)}
                    onPaste={(event) => {
                        const pasted = event.clipboardData.getData('text/plain');
                        if (pasted) setTimeout(() => applyClipboardText(pasted), 0);
                    }}
                    placeholder="여기에 잡플래닛에서 복사한 내용이나 기업 페이지 URL을 붙여넣어도 됩니다."
                    className="mt-2 h-16 w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 outline-none focus:border-amber-400"
                />
                <div className="mt-1 flex items-center justify-between gap-2">
                    <p
                        className={`text-[10px] font-semibold ${importNotice?.includes('찾지 못') || importNotice?.includes('못했습니다') ? 'text-rose-500' : 'text-emerald-600'}`}
                    >
                        {importNotice}
                    </p>
                    <button
                        type="button"
                        disabled={!importText.trim()}
                        onClick={() => applyClipboardText(importText)}
                        className="shrink-0 rounded-md border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-bold text-amber-700 disabled:opacity-40"
                    >
                        붙여넣은 내용 분석
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <label className="col-span-2 text-[11px] font-bold text-slate-500">
                    잡플래닛 기업명
                    <input
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-400"
                    />
                </label>
                <label className="text-[11px] font-bold text-slate-500">
                    평점 (0~5)
                    <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={rating}
                        onChange={(event) => setRating(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-400"
                    />
                </label>
                <label className="text-[11px] font-bold text-slate-500">
                    리뷰 수
                    <input
                        type="number"
                        min="0"
                        value={reviewCount}
                        onChange={(event) => setReviewCount(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-400"
                    />
                </label>
                <label className="col-span-2 text-[11px] font-bold text-slate-500">
                    기업 페이지 URL
                    <input
                        type="url"
                        placeholder="https://www.jobplanet.co.kr/companies/..."
                        value={companyUrl}
                        onChange={(event) => setCompanyUrl(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-400"
                    />
                </label>
            </div>
            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-500"
                >
                    취소
                </button>
                <button
                    type="button"
                    disabled={!canSave || saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                    className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40"
                >
                    {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                    저장
                </button>
            </div>
        </div>
    );
}

function JobplanetReputationCard({ jobPostingId }: { jobPostingId: number }) {
    const queryClient = useQueryClient();
    const [editing, setEditing] = useState(false);
    const queryKey = ['jobPostings', jobPostingId, 'jobplanet'] as const;
    const { data: lookup, isLoading } = useQuery({
        queryKey,
        queryFn: () => jobPostingApi.getJobplanet(jobPostingId),
    });
    const clearMutation = useMutation({
        mutationFn: () => jobPostingApi.clearJobplanet(jobPostingId),
        onSuccess: () => {
            setEditing(false);
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({ queryKey: ['jobPostings'] });
        },
    });
    const refresh = () => {
        setEditing(false);
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: ['jobPostings'] });
    };

    if (isLoading || !lookup) {
        return <div className="h-16 animate-pulse rounded-xl bg-slate-100" />;
    }
    if (editing) {
        return (
            <JobplanetEditor
                key={`${lookup.checkedAt ?? 'new'}-${lookup.companyUrl ?? ''}`}
                lookup={lookup}
                onCancel={() => setEditing(false)}
                onSaved={refresh}
            />
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                        Jobplanet
                    </p>
                    {lookup.companyUrl ? (
                        <div className="mt-0.5 flex items-baseline gap-2">
                            <a
                                href={lookup.companyUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="truncate text-sm font-extrabold text-slate-800 hover:text-amber-600"
                            >
                                {lookup.jobplanetCompanyName}
                            </a>
                            {lookup.rating !== null && (
                                <span className="shrink-0 text-lg font-black text-amber-500">
                                    {lookup.rating.toFixed(1)}
                                </span>
                            )}
                            {lookup.reviewCount !== null && (
                                <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                                    리뷰 {lookup.reviewCount.toLocaleString()}개
                                </span>
                            )}
                        </div>
                    ) : (
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                            아직 확인된 기업 평점이 없습니다.
                        </p>
                    )}
                </div>
                <div className="flex shrink-0 gap-1.5">
                    <a
                        href={lookup.searchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2 py-1 text-[11px] font-bold text-amber-600"
                    >
                        <ExternalLink className="h-3 w-3" /> 검색
                    </a>
                    <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600"
                    >
                        {lookup.companyUrl ? '수정' : '가져오기'}
                    </button>
                    {lookup.companyUrl && (
                        <button
                            type="button"
                            disabled={clearMutation.isPending}
                            onClick={() => {
                                if (confirm('저장된 잡플래닛 정보를 삭제할까요?')) {
                                    clearMutation.mutate();
                                }
                            }}
                            className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-bold text-rose-500 disabled:opacity-40"
                        >
                            삭제
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function GapProjectDocumentsPanel({
    jobPostingId,
    hasAppealAnalysis,
}: {
    jobPostingId: number;
    hasAppealAnalysis: boolean;
}) {
    const queryClient = useQueryClient();
    const queryKey = ['jobPostings', jobPostingId, 'gapProjectDocuments'] as const;
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const { data: documents = [], isLoading } = useQuery({
        queryKey,
        queryFn: () => jobPostingApi.gapProjectDocuments(jobPostingId),
    });
    const selected = documents.find((document) => document.id === selectedId) ?? documents[0];
    const generateMutation = useMutation({
        mutationFn: () => jobPostingApi.generateGapProjectDocument(jobPostingId),
        onSuccess: (document: GapProjectDocument) => {
            setSelectedId(document.id);
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (error) =>
            alert(
                error instanceof ApiError
                    ? error.message
                    : '보완 프로젝트 추천 문서를 만들지 못했습니다.'
            ),
    });

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
                <p className="text-xs leading-5 text-violet-700">
                    부족한 경험을 실제로 증명할 수 있는 2~6주 프로젝트와 검증 산출물을 추천합니다.
                </p>
                <button
                    type="button"
                    disabled={!hasAppealAnalysis || generateMutation.isPending}
                    onClick={() => generateMutation.mutate()}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {generateMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {generateMutation.isPending
                        ? '문서 생성 중...'
                        : documents.length
                          ? '새 버전 만들기'
                          : '추천 문서 만들기'}
                </button>
            </div>
            {!hasAppealAnalysis && (
                <p className="text-xs font-semibold text-amber-600">
                    먼저 AI 어필 포인트 분석을 실행해주세요.
                </p>
            )}
            {isLoading ? (
                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
            ) : selected ? (
                <div className="space-y-3">
                    {documents.length > 1 && (
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {documents.map((document) => (
                                <button
                                    key={document.id}
                                    type="button"
                                    onClick={() => setSelectedId(document.id)}
                                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${selected.id === document.id ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                                >
                                    v{document.version}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="markdown-body rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={adminDetailMarkdownComponents}
                        >
                            {selected.renderedMarkdown}
                        </ReactMarkdown>
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center text-xs font-semibold text-slate-400">
                    아직 생성된 보완 프로젝트 문서가 없습니다.
                </div>
            )}
        </div>
    );
}

/** 어필 분석 결과는 항상 전체 내용으로 보여준다. 드로어 자체가 유일한 세로 스크롤 컨테이너가
 * 되도록 중첩 스크롤을 만들지 않는다 — 중첩 스크롤은 하단 고정 액션 영역 근처에서 본문이 잘린
 * 것처럼 보이게 하고 모바일 터치 스크롤도 불안정하게 만든다. */
function AppealAnalysisView({
    markdown: rawMarkdown,
    headerExtra,
}: {
    markdown: string;
    headerExtra?: ReactNode;
}) {
    // 일부 저장된 분석 결과는 실제 줄바꿈 대신 글자 그대로의 "\n"이 들어있다(백엔드에서 이미
    // 새로 생성되는 결과는 고쳤지만, 이전에 저장된 결과는 여기서도 방어적으로 풀어준다) —
    // 안 풀면 포인트 구분/줄바꿈이 다 뭉개진 채로 렌더링된다.
    const markdown = useMemo(() => rawMarkdown.replace(/\\n/g, '\n'), [rawMarkdown]);
    // 섹션을 나누는 용도 외엔 보여줄 내용이 없는 상위 표제는 반복하지 않는다.
    const fullMarkdown = useMemo(
        () =>
            markdown
                .replace(/^#{1,3}\s+어필하기\s+좋은\s+포인트\s*$/m, '')
                .replace(/\n{3,}/g, '\n\n')
                .trim(),
        [markdown]
    );

    return (
        <div>
            {headerExtra && <div className="mb-3">{headerExtra}</div>}
            <div className="markdown-body pr-2 text-sm text-slate-700">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={adminDetailMarkdownComponents}
                >
                    {fullMarkdown}
                </ReactMarkdown>
            </div>
        </div>
    );
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatBoardStatusDate(value: string): string {
    return value.slice(2, 10).replaceAll('-', '.');
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

const emptyForm: JobPostingRequest = {
    companyName: '',
    positionTitle: '',
    postingUrl: '',
    source: '',
    appliedAt: new Date().toISOString().slice(0, 10),
    deadline: '',
    alwaysOpen: false,
    salaryNote: '',
    location: '',
    employmentType: '',
    memo: '',
    jobDescription: '',
    requiredQualifications: '',
    preferredQualifications: '',
    hiringProcess: '',
    applicationMethod: '',
    compensationDetail: '',
};

type DrawerState = { type: 'create' } | { type: 'existing'; id: number };
type ViewMode = 'LIST' | 'BOARD' | 'CALENDAR';

export function JobApplicationManagement() {
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<ViewMode>('LIST');
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [drawerState, setDrawerState] = useState<DrawerState | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<JobPostingRequest>(emptyForm);
    const [search, setSearch] = useState('');
    const [listSection, setListSection] = useState<'CANDIDATES' | 'APPLICATIONS'>('CANDIDATES');
    const [candidateStatusFilter, setCandidateStatusFilter] = useState<
        'ALL' | PreApplicationStatus
    >('ALL');
    const [candidateDeadlineSoonOnly, setCandidateDeadlineSoonOnly] = useState(false);
    const [showDismissed, setShowDismissed] = useState(false);
    const [applicationStageFilter, setApplicationStageFilter] = useState<'ALL' | ApplicationStatus>(
        'ALL'
    );
    const [applicationDeadlineSoonOnly, setApplicationDeadlineSoonOnly] = useState(false);
    const [stageDraft, setStageDraft] = useState<ApplicationStatus | null>(null);
    const [stageMemo, setStageMemo] = useState('');
    const [dragOverStage, setDragOverStage] = useState<ApplicationStatus | null>(null);
    const [isDragOverCandidates, setIsDragOverCandidates] = useState(false);
    const [ingestMode, setIngestMode] = useState<'single' | 'bulk'>('single');
    const [singleUrl, setSingleUrl] = useState('');
    const [showManualForm, setShowManualForm] = useState(false);
    const [isSingleIngesting, setIsSingleIngesting] = useState(false);
    const [singleIngestElapsedSeconds, setSingleIngestElapsedSeconds] = useState(0);
    const [bulkUrls, setBulkUrls] = useState<string[]>(['', '', '', '', '']);
    const [isDropZoneOver, setIsDropZoneOver] = useState(false);
    const [bulkResults, setBulkResults] = useState<
        Array<{
            url: string;
            status: 'pending' | 'processing' | 'success' | 'error';
            message?: string;
            response?: JobPosting;
        }>
    >([]);
    const [isBulkIngesting, setIsBulkIngesting] = useState(false);
    const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
    const [settingsForm, setSettingsForm] = useState<JobPostingSettingRequest | null>(null);
    const detailDrawerAnim = useSlideDrawer(!!drawerState);
    const settingsDrawerAnim = useSlideDrawer(isSettingsDrawerOpen && !!settingsForm);

    const boardRef = useRef<HTMLDivElement>(null);
    const [boardHeightPx, setBoardHeightPx] = useState<number | null>(null);

    useLayoutEffect(() => {
        if (viewMode !== 'BOARD') return;
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        const calculateBoardHeight = () => {
            if (!boardRef.current) return;
            const rect = boardRef.current.getBoundingClientRect();
            const remaining = window.innerHeight - rect.top - 44;
            setBoardHeightPx(Math.max(360, remaining));
        };

        calculateBoardHeight();
        window.addEventListener('resize', calculateBoardHeight);
        return () => window.removeEventListener('resize', calculateBoardHeight);
    }, [viewMode]);

    const { data: postings = [], isLoading } = useQuery({
        queryKey: ['jobPostings'],
        queryFn: jobPostingApi.list,
    });

    const isApplicationItem = (item: JobPosting) =>
        item.appliedAt !== null ||
        ((item.status as string) !== 'DISMISSED' && !isPreApplication(item.status));

    const applications = useMemo(
        () => postings.filter((item) => isApplicationItem(item)),
        [postings]
    );
    const candidates = useMemo(
        () => postings.filter((item) => !isApplicationItem(item)),
        [postings]
    );

    const { data: settings } = useQuery({
        queryKey: ['jobPostingSettings'],
        queryFn: jobPostingApi.getSettings,
    });

    const isCreating = drawerState?.type === 'create';
    const drawerId = drawerState?.type === 'existing' ? drawerState.id : null;
    const drawerItem = postings.find((item) => item.id === drawerId) ?? null;
    const isPostApplicationItem = drawerItem !== null && !isPreApplication(drawerItem.status);
    const formIsPostApplication = isCreating || isPostApplicationItem;

    const { data: stageEvents = [], isLoading: isStageEventsLoading } = useQuery({
        queryKey: ['jobPostings', drawerId, 'statusEvents'],
        queryFn: () => jobPostingApi.statusEvents(drawerId!),
        enabled: drawerId !== null,
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['jobPostings'] });

    const createMutation = useMutation({
        mutationFn: (payload: JobPostingRequest) => jobPostingApi.create(payload),
        onSuccess: () => {
            invalidate();
            closeDrawer();
        },
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '등록에 실패했습니다.'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: JobPostingRequest }) =>
            jobPostingApi.update(id, payload),
        onSuccess: () => {
            invalidate();
            setIsEditing(false);
        },
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '수정에 실패했습니다.'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => jobPostingApi.remove(id),
        onSuccess: () => {
            invalidate();
            closeDrawer();
        },
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '삭제에 실패했습니다.'),
    });

    const statusMutation = useMutation({
        mutationFn: ({
            id,
            status,
            memo,
        }: {
            id: number;
            status: ApplicationStatus;
            memo?: string;
        }) => jobPostingApi.changeStatus(id, status, memo),
        onSuccess: (_, variables) => {
            invalidate();
            queryClient.invalidateQueries({
                queryKey: ['jobPostings', variables.id, 'statusEvents'],
            });
            setStageMemo('');
        },
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '전형 단계 변경에 실패했습니다.'),
    });

    const deleteStatusEventMutation = useMutation({
        mutationFn: ({ id, eventId }: { id: number; eventId: number }) =>
            jobPostingApi.deleteStatusEvent(id, eventId),
        onSuccess: (_, variables) => {
            invalidate();
            queryClient.invalidateQueries({
                queryKey: ['jobPostings', variables.id, 'statusEvents'],
            });
        },
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '상태 이력 삭제에 실패했습니다.'),
    });

    const analyzeAppealMutation = useMutation({
        mutationFn: (id: number) => jobPostingApi.analyzeAppeal(id),
        onSuccess: () => invalidate(),
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '경력 매칭 분석에 실패했습니다.'),
    });

    const rematchMutation = useMutation({
        mutationFn: (id: number) => jobPostingApi.rematch(id),
        onSuccess: () => invalidate(),
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '매칭 점수 재계산에 실패했습니다.'),
    });

    const refreshMutation = useMutation({
        mutationFn: (id: number) => jobPostingApi.refresh(id),
        onSuccess: () => invalidate(),
        onError: (error) =>
            alert(
                error instanceof ApiError ? error.message : '공고 정보를 다시 수집하지 못했습니다.'
            ),
    });

    async function requestIngestSingleUrl(url: string) {
        if (!url.trim()) return;
        setIsSingleIngesting(true);
        setSingleIngestElapsedSeconds(0);
        const startedAt = Date.now();
        const timer = window.setInterval(() => {
            setSingleIngestElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
        }, 1000);

        try {
            await jobPostingApi.ingestUrlStream(url.trim(), (event) => {
                if (event.type === 'error') {
                    alert(event.message);
                    return;
                }
                queryClient.setQueryData(['jobPostings'], (prev: JobPosting[] | undefined) => [
                    event.response,
                    ...(prev ?? []),
                ]);
                setSingleUrl('');
                closeDrawer();
                openDrawer(event.response);

                if (isCandidateDetailMissing(event.response)) {
                    alert(
                        '공고를 수집해 자동 등록했어요!\n' +
                            '상세 내용(담당업무, 자격요건 등) 일부가 부족할 수 있으니 열린 상세 화면에서 확인 후 필요 시 수정해 주세요.'
                    );
                }
            });
        } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
                const existing = candidates.find((item) => item.postingUrl === url.trim());
                if (existing) {
                    alert('이미 수집된 공고예요. 해당 공고의 상세 페이지를 열어드릴게요.');
                    closeDrawer();
                    openDrawer(existing);
                } else {
                    alert('이미 등록된 공고입니다.');
                }
            } else {
                alert(
                    error instanceof ApiError ? error.message : '공고 수집 및 등록에 실패했습니다.'
                );
            }
        } finally {
            window.clearInterval(timer);
            setIsSingleIngesting(false);
        }
    }

    function extractUrlsFromDataTransfer(dataTransfer: DataTransfer): string[] {
        const foundUrls: string[] = [];

        function addCandidate(raw: string) {
            if (!raw) return;
            const cleaned = raw
                .trim()
                .replace(/^["'<(\[]+|[)"'>;,\]\.]+$|&quot;/g, '')
                .trim();
            if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
                foundUrls.push(cleaned);
            }
        }

        const types = Array.from(dataTransfer.types || []);
        for (const type of types) {
            try {
                const data = dataTransfer.getData(type);
                if (!data) continue;

                if (type === 'text/x-moz-url') {
                    const firstLine = data.split('\n')[0].trim();
                    addCandidate(firstLine);
                }

                if (type.includes('html')) {
                    try {
                        const doc = new DOMParser().parseFromString(data, 'text/html');
                        const anchors = doc.querySelectorAll('a[href]');
                        anchors.forEach((a) => {
                            const href = a.getAttribute('href');
                            if (href) addCandidate(href);
                        });
                    } catch {
                        // ignore DOMParser fail
                    }
                }

                if (type === 'text/uri-list' || type === 'URL') {
                    data.split('\n').forEach((line) => {
                        const trimmed = line.trim();
                        if (trimmed && !trimmed.startsWith('#')) {
                            addCandidate(trimmed);
                        }
                    });
                }

                const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
                const matches = data.match(urlRegex);
                if (matches) {
                    matches.forEach((m) => addCandidate(m));
                }
            } catch {
                // ignore
            }
        }
        return Array.from(new Set(foundUrls));
    }

    const handleFillDroppedUrls = useCallback(
        (droppedUrls: string[]) => {
            if (droppedUrls.length === 0) return;

            if (ingestMode === 'single') {
                const targetUrl = droppedUrls[0];
                setSingleUrl(targetUrl);
                setForm((prev) => ({ ...prev, postingUrl: targetUrl }));
            } else {
                setBulkUrls((prev) => {
                    const next = [...prev];
                    const existingSet = new Set(next.filter(Boolean));
                    const newUrls = droppedUrls.filter((u) => !existingSet.has(u));

                    let urlIdx = 0;
                    for (let i = 0; i < 5 && urlIdx < newUrls.length; i++) {
                        if (!next[i].trim()) {
                            next[i] = newUrls[urlIdx++];
                        }
                    }
                    return next;
                });
            }
        },
        [ingestMode]
    );

    // 등록/수집 드로어가 열려있을 때(단일/다중 공통), 윈도우 전체 레벨에서 dragover/drop을 가로채어
    // 주소창 자물쇠 아이콘, 북마크, 링크 어디서 오든 Drop이 받아들여지도록 전역 리스너 등록
    useEffect(() => {
        if (!isCreating) return;

        const handleWindowDragOver = (e: globalThis.DragEvent) => {
            e.preventDefault();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'copy';
            }
            setIsDropZoneOver(true);
        };

        const handleWindowDrop = (e: globalThis.DragEvent) => {
            e.preventDefault();
            setIsDropZoneOver(false);
            if (!e.dataTransfer) return;
            const urls = extractUrlsFromDataTransfer(e.dataTransfer);
            if (urls.length > 0) {
                handleFillDroppedUrls(urls);
            }
        };

        window.addEventListener('dragover', handleWindowDragOver);
        window.addEventListener('drop', handleWindowDrop);

        return () => {
            window.removeEventListener('dragover', handleWindowDragOver);
            window.removeEventListener('drop', handleWindowDrop);
        };
    }, [isCreating, ingestMode, handleFillDroppedUrls]);

    // 전역 paste (Cmd+V / Ctrl+V) 이벤트로 클립보드 URL 자동 감지 및 채우기
    useEffect(() => {
        if (!isCreating) return;

        const handlePaste = (e: ClipboardEvent) => {
            const pastedText = e.clipboardData?.getData('text/plain');
            if (!pastedText) return;

            const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
            const matches = pastedText.match(urlRegex);
            if (matches && matches.length > 0) {
                const cleanedUrls = Array.from(
                    new Set(matches.map((m) => m.replace(/[)"'>;\.]+$|&quot;/g, '').trim()))
                );
                handleFillDroppedUrls(cleanedUrls);
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isCreating, ingestMode, handleFillDroppedUrls]);

    async function handlePasteClipboardUrls() {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) return;
            const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
            const matches = text.match(urlRegex);
            if (matches && matches.length > 0) {
                const cleanedUrls = Array.from(
                    new Set(matches.map((m) => m.replace(/[)"'>;\.]+$|&quot;/g, '').trim()))
                );
                handleFillDroppedUrls(cleanedUrls);
            }
        } catch {
            // ignore permission errors
        }
    }

    async function requestBulkIngestUrls(urlsToIngest: string[]) {
        const cleaned = urlsToIngest.map((u) => u.trim()).filter(Boolean);
        if (cleaned.length === 0) return;

        setIsBulkIngesting(true);
        setBulkResults(cleaned.map((url) => ({ url, status: 'pending' })));

        try {
            await jobPostingApi.ingestUrlsStream(cleaned, (event) => {
                if (event.type === 'progress') {
                    setBulkResults((prev) =>
                        prev.map((item) =>
                            item.url === event.url ? { ...item, status: 'processing' } : item
                        )
                    );
                } else if (event.type === 'item_success') {
                    setBulkResults((prev) =>
                        prev.map((item) =>
                            item.url === event.url
                                ? { ...item, status: 'success', response: event.response }
                                : item
                        )
                    );
                    queryClient.setQueryData(['jobPostings'], (prev: JobPosting[] | undefined) => [
                        event.response,
                        ...(prev ?? []),
                    ]);
                } else if (event.type === 'item_error') {
                    setBulkResults((prev) =>
                        prev.map((item) =>
                            item.url === event.url
                                ? { ...item, status: 'error', message: event.message }
                                : item
                        )
                    );
                } else if (event.type === 'complete') {
                    // 완료
                } else if (event.type === 'error') {
                    alert(event.message);
                }
            });
        } catch (error) {
            alert(
                error instanceof ApiError ? error.message : '다중 공고 수집 중 오류가 발생했습니다.'
            );
        } finally {
            setIsBulkIngesting(false);
        }
    }

    const dismissCandidateMutation = useMutation({
        mutationFn: (id: number) => jobPostingApi.dismiss(id),
        onSuccess: () => invalidate(),
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '제외 처리에 실패했습니다.'),
    });

    const undismissCandidateMutation = useMutation({
        mutationFn: (id: number) => jobPostingApi.undismiss(id),
        onSuccess: () => invalidate(),
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '제외 해제에 실패했습니다.'),
    });

    const applyMutation = useMutation({
        mutationFn: (id: number) => jobPostingApi.apply(id),
        onSuccess: () => invalidate(),
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '지원 전환에 실패했습니다.'),
    });

    const unapplyMutation = useMutation({
        mutationFn: (id: number) => jobPostingApi.unapply(id),
        onSuccess: () => invalidate(),
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '지원 취소에 실패했습니다.'),
    });

    const saveCandidateMutation = useMutation({
        mutationFn: (id: number) => jobPostingApi.save(id),
        onSuccess: () => invalidate(),
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '저장에 실패했습니다.'),
    });

    const unsaveCandidateMutation = useMutation({
        mutationFn: (id: number) => jobPostingApi.unsave(id),
        onSuccess: () => invalidate(),
        onError: (error) =>
            alert(error instanceof ApiError ? error.message : '저장 해제에 실패했습니다.'),
    });

    const collectMutation = useMutation({
        mutationFn: () => jobPostingApi.collect(),
        onSuccess: (result) => {
            invalidate();
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
            `${item.companyName} ${item.positionTitle} ${item.source}`
                .toLowerCase()
                .includes(keyword)
        );
    }, [candidates, search]);

    // 보드/캘린더에서는 제외(DISMISSED)된 후보를 숨긴다 — 리스트뷰에서는 계속 보여준다.
    const boardCandidates = useMemo(
        () => sortByDeadlineAsc(candidates.filter((item) => item.status !== 'DISMISSED')),
        [candidates]
    );

    // 리스트뷰의 수집함/지원 현황 두 섹션은 각자 독립된 상태/마감임박 필터를 갖는다.
    const listCandidates = useMemo(() => {
        // 제외됨은 숨김폴더처럼 기본적으로 안 보인다 — 체크박스를 켜거나, 상태 필터에서 직접 "제외됨"을 고르면 노출된다.
        const revealDismissed = showDismissed || candidateStatusFilter === 'DISMISSED';
        const filtered = filteredCandidates.filter((item) => {
            if (item.status === 'DISMISSED' && !revealDismissed) return false;
            if (candidateStatusFilter !== 'ALL' && candidateStatusFilter !== item.status)
                return false;
            if (candidateDeadlineSoonOnly && !isDeadlineSoon(item.deadline)) return false;
            return true;
        });
        return sortByDeadlineAsc(filtered);
    }, [filteredCandidates, candidateStatusFilter, candidateDeadlineSoonOnly, showDismissed]);

    const listApplications = useMemo(() => {
        const filtered = filteredApplications.filter((item) => {
            if (item.status === 'DISMISSED' && !showDismissed) return false;
            if (applicationStageFilter !== 'ALL' && applicationStageFilter !== item.status)
                return false;
            if (applicationDeadlineSoonOnly && !isDeadlineSoon(item.deadline)) return false;
            return true;
        });
        return sortByDeadlineAsc(filtered);
    }, [filteredApplications, applicationStageFilter, applicationDeadlineSoonOnly, showDismissed]);

    const isCandidateFilterActive =
        candidateStatusFilter !== 'ALL' || candidateDeadlineSoonOnly || showDismissed;

    function resetCandidateFilters() {
        setCandidateStatusFilter('ALL');
        setCandidateDeadlineSoonOnly(false);
        setShowDismissed(false);
    }

    const isApplicationFilterActive =
        applicationStageFilter !== 'ALL' || applicationDeadlineSoonOnly || showDismissed;

    function resetApplicationFilters() {
        setApplicationStageFilter('ALL');
        setApplicationDeadlineSoonOnly(false);
        setShowDismissed(false);
    }

    const byStage = useMemo(() => {
        const map = new Map<ApplicationStatus, JobPosting[]>();
        STAGE_ORDER.forEach((stage) => map.set(stage, []));
        filteredApplications.forEach((item) =>
            map.get(item.status as ApplicationStatus)?.push(item)
        );
        map.forEach((items, stage) => {
            map.set(stage, sortByDeadlineAsc(items));
        });
        return map;
    }, [filteredApplications]);

    const calendarCells = useMemo(() => buildCalendarCells(calendarMonth), [calendarMonth]);

    const deadlineEventsByDate = useMemo(() => {
        const map = new Map<string, { applications: JobPosting[]; candidates: JobPosting[] }>();
        applications.forEach((item) => {
            if (!item.deadline) return;
            if (!map.has(item.deadline))
                map.set(item.deadline, { applications: [], candidates: [] });
            map.get(item.deadline)!.applications.push(item);
        });
        candidates
            .filter((item) => item.status !== 'DISMISSED')
            .forEach((item) => {
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
        setStageDraft(null);
        setStageMemo('');
        setIsEditing(false);
        setSingleUrl('');
        setShowManualForm(false);
        // 다중 수집이 진행 중이면 URL 입력값/진행 현황을 그대로 두고 다중 탭으로 복귀시켜
        // 창을 닫았다 다시 열어도 진행 상황을 이어서 볼 수 있게 한다.
        if (isBulkIngesting) {
            setIngestMode('bulk');
        } else {
            setIngestMode('single');
            setBulkUrls(['', '', '', '', '']);
            setBulkResults([]);
        }
        setDrawerState({ type: 'create' });
    }

    function openDrawer(item: JobPosting) {
        setStageDraft(!isPreApplication(item.status) ? (item.status as ApplicationStatus) : null);
        setStageMemo('');
        setIsEditing(false);
        setDrawerState({ type: 'existing', id: item.id });
    }

    function closeDrawer() {
        setDrawerState(null);
        setForm(emptyForm);
        setStageDraft(null);
        setStageMemo('');
        setIsEditing(false);
        setSingleUrl('');
        setShowManualForm(false);
        // 다중 수집이 진행 중일 때 닫으면 URL 입력값/진행 현황은 남겨둔다 — 다시 열었을 때
        // openCreateDrawer가 이어서 보여준다.
        if (!isBulkIngesting) {
            setIngestMode('single');
            setBulkUrls(['', '', '', '', '']);
            setBulkResults([]);
        }
    }

    function startEditing(item: JobPosting) {
        setForm({
            companyName: item.companyName,
            positionTitle: item.positionTitle,
            postingUrl: item.postingUrl ?? '',
            source: item.source,
            appliedAt: item.appliedAt,
            deadline: item.deadline ?? '',
            alwaysOpen: item.alwaysOpen,
            salaryNote: item.salaryNote ?? '',
            location: item.location ?? '',
            employmentType: item.employmentType ?? '',
            memo: item.memo ?? '',
            jobDescription: item.jobDescription ?? '',
            requiredQualifications: item.requiredQualifications ?? '',
            preferredQualifications: item.preferredQualifications ?? '',
            hiringProcess: item.hiringProcess ?? '',
            applicationMethod: item.applicationMethod ?? '',
            compensationDetail: item.compensationDetail ?? '',
        });
        setIsEditing(true);
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        const payload: JobPostingRequest = {
            ...form,
            postingUrl: form.postingUrl?.trim() || null,
            deadline: form.alwaysOpen ? null : form.deadline?.trim() || null,
            salaryNote: form.salaryNote?.trim() || null,
            location: form.location?.trim() || null,
            employmentType: form.employmentType?.trim() || null,
            memo: form.memo?.trim() || null,
            jobDescription: form.jobDescription?.trim() || null,
            requiredQualifications: form.requiredQualifications?.trim() || null,
            preferredQualifications: form.preferredQualifications?.trim() || null,
            hiringProcess: form.hiringProcess?.trim() || null,
            applicationMethod: form.applicationMethod?.trim() || null,
            compensationDetail: form.compensationDetail?.trim() || null,
        };
        if (drawerId !== null) {
            updateMutation.mutate({ id: drawerId, payload });
        } else {
            createMutation.mutate(payload);
        }
    }

    function handleDragStart(event: DragEvent<HTMLDivElement>, id: number) {
        event.dataTransfer.setData('text/plain', String(id));
        event.dataTransfer.effectAllowed = 'move';
    }

    function handleColumnDragOver(event: DragEvent<HTMLDivElement>, stage: ApplicationStatus) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (dragOverStage !== stage) setDragOverStage(stage);
    }

    function handleColumnDrop(event: DragEvent<HTMLDivElement>, stage: ApplicationStatus) {
        event.preventDefault();
        setDragOverStage(null);
        const id = Number(event.dataTransfer.getData('text/plain'));
        if (Number.isNaN(id)) return;
        const target = postings.find((item) => item.id === id);
        if (!target) return;
        if (isPreApplication(target.status)) {
            applyMutation.mutate(id);
            return;
        }
        if (target.status === stage) return;
        statusMutation.mutate({ id, status: stage });
    }

    function handleCandidateColumnDragOver(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (!isDragOverCandidates) setIsDragOverCandidates(true);
    }

    /** 전형 진행 단계에 있는 카드를 실수로 옮겼을 때를 대비해, "수집됨" 칼럼에 놓으면 지원 전
     * 상태로 되돌릴 수 있게 한다 — 확인창을 거쳐야 실제로 되돌아간다. */
    function handleCandidateColumnDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setIsDragOverCandidates(false);
        const id = Number(event.dataTransfer.getData('text/plain'));
        if (Number.isNaN(id)) return;
        const target = postings.find((item) => item.id === id);
        if (!target || isPreApplication(target.status)) return;
        if (confirm('이 공고를 지원 전(수집됨) 상태로 되돌릴까요?')) {
            unapplyMutation.mutate(id);
        }
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
                        onClick={openCreateDrawer}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                        <Plus className="h-4 w-4" />새 공고 등록
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
                    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 px-5">
                        <div className="flex items-center gap-5 pt-4">
                            {(
                                [
                                    ['CANDIDATES', '수집함', listCandidates.length],
                                    ['APPLICATIONS', '지원 현황', listApplications.length],
                                ] as const
                            ).map(([value, label, count]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setListSection(value)}
                                    className={`-mb-px shrink-0 border-b-2 px-0.5 pb-3 text-sm font-bold transition ${
                                        listSection === value
                                            ? 'border-slate-900 text-slate-900'
                                            : 'border-transparent text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    {label}
                                    <span className="ml-1.5 text-xs font-bold text-slate-400">
                                        {count}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pb-3">
                            {listSection === 'CANDIDATES' ? (
                                <>
                                    <select
                                        value={candidateStatusFilter}
                                        onChange={(e) =>
                                            setCandidateStatusFilter(
                                                e.target.value as 'ALL' | PreApplicationStatus
                                            )
                                        }
                                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 focus:border-slate-400 focus:outline-none"
                                    >
                                        <option value="ALL">전체 상태</option>
                                        {CANDIDATE_FILTERABLE_STATUSES.map((status) => (
                                            <option key={status} value={status}>
                                                {CANDIDATE_STATUS_LABELS[status]}
                                            </option>
                                        ))}
                                    </select>
                                    <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-500 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showDismissed}
                                            onChange={(e) => setShowDismissed(e.target.checked)}
                                            className="h-3.5 w-3.5 rounded border-slate-300"
                                        />
                                        숨김 처리된 항목도 보기
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCandidateDeadlineSoonOnly((prev) => !prev)
                                        }
                                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                                            candidateDeadlineSoonOnly
                                                ? 'border-rose-200 bg-rose-50 text-rose-600'
                                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }`}
                                    >
                                        마감 임박(7일 이내)
                                    </button>
                                    {isCandidateFilterActive && (
                                        <button
                                            type="button"
                                            onClick={resetCandidateFilters}
                                            className="text-xs font-bold text-slate-400 hover:text-slate-600"
                                        >
                                            필터 초기화
                                        </button>
                                    )}
                                </>
                            ) : (
                                <>
                                    <select
                                        value={applicationStageFilter}
                                        onChange={(e) =>
                                            setApplicationStageFilter(
                                                e.target.value as 'ALL' | ApplicationStatus
                                            )
                                        }
                                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 focus:border-slate-400 focus:outline-none"
                                    >
                                        <option value="ALL">전체 상태</option>
                                        {STAGE_ORDER.map((stage) => (
                                            <option key={stage} value={stage}>
                                                {STAGE_LABELS[stage]}
                                            </option>
                                        ))}
                                    </select>
                                    <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-500 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showDismissed}
                                            onChange={(e) => setShowDismissed(e.target.checked)}
                                            className="h-3.5 w-3.5 rounded border-slate-300"
                                        />
                                        숨김 처리된 항목도 보기
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setApplicationDeadlineSoonOnly((prev) => !prev)
                                        }
                                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                                            applicationDeadlineSoonOnly
                                                ? 'border-rose-200 bg-rose-50 text-rose-600'
                                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }`}
                                    >
                                        마감 임박(7일 이내)
                                    </button>
                                    {isApplicationFilterActive && (
                                        <button
                                            type="button"
                                            onClick={resetApplicationFilters}
                                            className="text-xs font-bold text-slate-400 hover:text-slate-600"
                                        >
                                            필터 초기화
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    {listSection === 'CANDIDATES' ? (
                        <>
                            {listCandidates.length === 0 ? (
                                <div className="py-12 text-center">
                                    <p className="text-sm font-semibold text-slate-400">
                                        {candidates.length === 0
                                            ? '수집된 공고가 없습니다.'
                                            : '조건에 맞는 공고가 없습니다.'}
                                    </p>
                                    {isCandidateFilterActive && candidates.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={resetCandidateFilters}
                                            className="mt-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                                        >
                                            필터 초기화
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[720px] text-left text-sm">
                                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                                            <tr>
                                                <th className="px-5 py-3 font-bold">회사 / 직무</th>
                                                <th className="px-5 py-3 font-bold">AI 매칭</th>
                                                <th className="px-5 py-3 font-bold">잡플래닛</th>
                                                <th className="px-5 py-3 font-bold">마감일</th>
                                                <th className="px-5 py-3 font-bold text-right">
                                                    관리
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {listCandidates.map((candidate) => {
                                                const dDay = dDayLabel(candidate.deadline);
                                                return (
                                                    <tr
                                                        key={candidate.id}
                                                        onClick={() => openDrawer(candidate)}
                                                        className="cursor-pointer text-slate-500 transition hover:bg-slate-50"
                                                    >
                                                        <td className="min-w-48 px-5 py-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-slate-700">
                                                                    {candidate.companyName}
                                                                </span>
                                                                {candidate.status ===
                                                                    'DISMISSED' && (
                                                                    <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold text-slate-500">
                                                                        숨김됨
                                                                    </span>
                                                                )}
                                                                {isCandidateDetailMissing(
                                                                    candidate
                                                                ) && (
                                                                    <span title="상세 정보를 자동으로 가져오지 못했어요">
                                                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="mt-0.5 block text-xs text-slate-400">
                                                                {candidate.positionTitle}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3 whitespace-nowrap">
                                                            <MatchScoreBadge
                                                                score={candidate.matchScore}
                                                                reason={candidate.matchReason}
                                                            />
                                                        </td>
                                                        <td className="px-5 py-3 whitespace-nowrap">
                                                            <JobplanetScoreBadge
                                                                rating={candidate.jobplanetRating}
                                                                reviewCount={
                                                                    candidate.jobplanetReviewCount
                                                                }
                                                                companyUrl={
                                                                    candidate.jobplanetCompanyUrl
                                                                }
                                                            />
                                                        </td>
                                                        <td className="px-5 py-3 whitespace-nowrap">
                                                            {candidate.alwaysOpen ? (
                                                                <AlwaysOpenBadge />
                                                            ) : candidate.deadline ? (
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    {candidate.deadline}
                                                                    {dDay && (
                                                                        <span
                                                                            className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${getDDayBadgeStyle(
                                                                                candidate.deadline
                                                                            )}`}
                                                                        >
                                                                            {dDay}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300">
                                                                    —
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-1.5 xl:gap-3">
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        applyMutation.isPending
                                                                    }
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        applyMutation.mutate(
                                                                            candidate.id
                                                                        );
                                                                    }}
                                                                    title="지원하기"
                                                                    aria-label="지원하기"
                                                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 xl:h-auto xl:w-auto xl:rounded-none xl:text-xs xl:font-bold"
                                                                >
                                                                    <Check className="h-4 w-4 xl:hidden" />
                                                                    <span className="hidden xl:inline">
                                                                        지원하기
                                                                    </span>
                                                                </button>
                                                                {candidate.status ===
                                                                'DISMISSED' ? (
                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            undismissCandidateMutation.isPending
                                                                        }
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            undismissCandidateMutation.mutate(
                                                                                candidate.id
                                                                            );
                                                                        }}
                                                                        title="숨김 해제"
                                                                        aria-label="숨김 해제"
                                                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 xl:h-auto xl:w-auto xl:rounded-none xl:text-xs xl:font-bold"
                                                                    >
                                                                        <Eye className="h-4 w-4 xl:hidden" />
                                                                        <span className="hidden xl:inline">
                                                                            숨김 해제
                                                                        </span>
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            dismissCandidateMutation.isPending
                                                                        }
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (
                                                                                confirm(
                                                                                    '이 공고를 숨김 처리할까요?'
                                                                                )
                                                                            ) {
                                                                                dismissCandidateMutation.mutate(
                                                                                    candidate.id
                                                                                );
                                                                            }
                                                                        }}
                                                                        title="숨김"
                                                                        aria-label="숨김"
                                                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 xl:h-auto xl:w-auto xl:rounded-none xl:text-xs xl:font-bold"
                                                                    >
                                                                        <EyeOff className="h-4 w-4 xl:hidden" />
                                                                        <span className="hidden xl:inline">
                                                                            숨김
                                                                        </span>
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        deleteMutation.isPending
                                                                    }
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (
                                                                            confirm(
                                                                                '이 후보를 완전히 삭제할까요? 삭제하면 같은 URL을 다시 수집할 수 있어요.'
                                                                            )
                                                                        ) {
                                                                            deleteMutation.mutate(
                                                                                candidate.id
                                                                            );
                                                                        }
                                                                    }}
                                                                    title="완전히 삭제"
                                                                    aria-label="완전히 삭제"
                                                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 xl:h-auto xl:w-auto xl:rounded-none xl:text-xs xl:font-bold"
                                                                >
                                                                    <Trash2 className="h-4 w-4 xl:hidden" />
                                                                    <span className="hidden xl:inline">
                                                                        삭제
                                                                    </span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {listApplications.length === 0 ? (
                                <div className="py-12 text-center">
                                    <p className="text-sm font-semibold text-slate-400">
                                        {applications.length === 0
                                            ? '등록된 지원 공고가 없습니다.'
                                            : '조건에 맞는 공고가 없습니다.'}
                                    </p>
                                    {isApplicationFilterActive && applications.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={resetApplicationFilters}
                                            className="mt-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                                        >
                                            필터 초기화
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[820px] text-left text-sm">
                                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                                            <tr>
                                                <th className="px-5 py-3 font-bold">회사 / 직무</th>
                                                <th className="px-5 py-3 font-bold">AI 매칭</th>
                                                <th className="px-5 py-3 font-bold">잡플래닛</th>
                                                <th className="px-5 py-3 font-bold">지원일</th>
                                                <th className="px-5 py-3 font-bold">마감일</th>
                                                <th className="px-5 py-3 font-bold">현재 단계</th>
                                                <th className="px-5 py-3 font-bold text-right">
                                                    관리
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {listApplications.map((item) => (
                                                <tr
                                                    key={item.id}
                                                    onClick={() => openDrawer(item)}
                                                    className="cursor-pointer text-slate-600 transition hover:bg-slate-50"
                                                >
                                                    <td className="min-w-48 px-5 py-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-slate-800">
                                                                {item.companyName}
                                                            </span>
                                                            {item.status === 'DISMISSED' && (
                                                                <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold text-slate-500">
                                                                    숨김됨
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="mt-0.5 block text-xs text-slate-400">
                                                            {item.positionTitle}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 whitespace-nowrap">
                                                        <MatchScoreBadge
                                                            score={item.matchScore}
                                                            reason={item.matchReason}
                                                        />
                                                    </td>
                                                    <td className="px-5 py-3 whitespace-nowrap">
                                                        <JobplanetScoreBadge
                                                            rating={item.jobplanetRating}
                                                            reviewCount={item.jobplanetReviewCount}
                                                            companyUrl={item.jobplanetCompanyUrl}
                                                        />
                                                    </td>
                                                    <td className="px-5 py-3 whitespace-nowrap">
                                                        {item.appliedAt}
                                                    </td>
                                                    <td className="px-5 py-3 whitespace-nowrap">
                                                        {item.alwaysOpen ? (
                                                            <AlwaysOpenBadge />
                                                        ) : (
                                                            (item.deadline ?? (
                                                                <span className="text-slate-300">
                                                                    —
                                                                </span>
                                                            ))
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span
                                                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-extrabold ${STAGE_ACCENT[item.status as ApplicationStatus]}`}
                                                        >
                                                            {
                                                                STAGE_LABELS[
                                                                    item.status as ApplicationStatus
                                                                ]
                                                            }
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5 xl:gap-3">
                                                            {item.status === 'DISMISSED' ? (
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        undismissCandidateMutation.isPending
                                                                    }
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        undismissCandidateMutation.mutate(
                                                                            item.id
                                                                        );
                                                                    }}
                                                                    title="숨김 해제"
                                                                    aria-label="숨김 해제"
                                                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 xl:h-auto xl:w-auto xl:rounded-none xl:text-xs xl:font-bold"
                                                                >
                                                                    <Eye className="h-4 w-4 xl:hidden" />
                                                                    <span className="hidden xl:inline">
                                                                        숨김 해제
                                                                    </span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        dismissCandidateMutation.isPending
                                                                    }
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (
                                                                            confirm(
                                                                                '이 지원 공고를 숨김 처리할까요?'
                                                                            )
                                                                        ) {
                                                                            dismissCandidateMutation.mutate(
                                                                                item.id
                                                                            );
                                                                        }
                                                                    }}
                                                                    title="숨김"
                                                                    aria-label="숨김"
                                                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 xl:h-auto xl:w-auto xl:rounded-none xl:text-xs xl:font-bold"
                                                                >
                                                                    <EyeOff className="h-4 w-4 xl:hidden" />
                                                                    <span className="hidden xl:inline">
                                                                        숨김
                                                                    </span>
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                disabled={deleteMutation.isPending}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (
                                                                        confirm(
                                                                            '이 지원 공고를 완전히 삭제할까요?'
                                                                        )
                                                                    ) {
                                                                        deleteMutation.mutate(
                                                                            item.id
                                                                        );
                                                                    }
                                                                }}
                                                                title="완전히 삭제"
                                                                aria-label="완전히 삭제"
                                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 xl:h-auto xl:w-auto xl:rounded-none xl:text-xs xl:font-bold"
                                                            >
                                                                <Trash2 className="h-4 w-4 xl:hidden" />
                                                                <span className="hidden xl:inline">
                                                                    삭제
                                                                </span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : viewMode === 'BOARD' ? (
                <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden pb-3 custom-scrollbar">
                    <div
                        ref={boardRef}
                        className="grid gap-3"
                        style={{
                            gridAutoFlow: 'column',
                            gridAutoColumns: '270px',
                            height: boardHeightPx ? `${boardHeightPx}px` : 'calc(100vh - 280px)',
                            minHeight: '380px',
                        }}
                    >
                        <div
                            onDragOver={handleCandidateColumnDragOver}
                            onDragLeave={() => setIsDragOverCandidates(false)}
                            onDrop={handleCandidateColumnDrop}
                            className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-dashed p-2.5 transition ${
                                isDragOverCandidates
                                    ? 'border-slate-400 bg-slate-100'
                                    : 'border-slate-300 bg-white'
                            }`}
                        >
                            <div className="mb-2 flex shrink-0 items-center justify-between px-1.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-extrabold text-white">
                                    <Bookmark className="h-3 w-3" />
                                    수집됨
                                </span>
                                <span className="text-xs font-bold text-slate-400">
                                    {boardCandidates.length}
                                </span>
                            </div>
                            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain pr-1">
                                {boardCandidates.map((candidate) => {
                                    const dDay = dDayLabel(candidate.deadline);
                                    return (
                                        <div
                                            key={candidate.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, candidate.id)}
                                            onClick={() => openDrawer(candidate)}
                                            className="cursor-grab rounded-xl border border-slate-200 bg-slate-50 p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow active:cursor-grabbing"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span
                                                    className="truncate text-[11px] font-semibold text-slate-400"
                                                    title="공고 마감일"
                                                >
                                                    {candidate.alwaysOpen || !candidate.deadline
                                                        ? '-'
                                                        : formatBoardStatusDate(candidate.deadline)}
                                                </span>
                                                {candidate.alwaysOpen ? (
                                                    <AlwaysOpenBadge rounded="rounded-full" />
                                                ) : (
                                                    dDay && (
                                                        <span
                                                            className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold ${getDDayBadgeStyle(
                                                                candidate.deadline
                                                            )}`}
                                                        >
                                                            {dDay}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                            <div className="mt-1.5 flex min-w-0 items-center gap-2">
                                                <p className="min-w-0 flex-1 truncate text-sm font-extrabold text-slate-800">
                                                    {candidate.companyName}
                                                </p>
                                                {candidate.matchScore !== null && (
                                                    <span
                                                        className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-600"
                                                        title={candidate.matchReason ?? undefined}
                                                    >
                                                        매칭 {candidate.matchScore}점
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                                                <p className="min-w-0 flex-1 truncate text-xs text-slate-500">
                                                    {candidate.positionTitle}
                                                </p>
                                                {isCandidateDetailMissing(candidate) && (
                                                    <span
                                                        className="inline-flex shrink-0"
                                                        title="상세 정보를 자동으로 가져오지 못했어요"
                                                    >
                                                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={dismissCandidateMutation.isPending}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm('이 공고를 숨김 처리할까요?')) {
                                                            dismissCandidateMutation.mutate(
                                                                candidate.id
                                                            );
                                                        }
                                                    }}
                                                    title="공고 숨김 처리"
                                                    className="shrink-0 text-slate-400 transition hover:text-slate-600 disabled:opacity-50"
                                                >
                                                    <EyeOff className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={deleteMutation.isPending}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (
                                                            confirm(
                                                                '이 후보를 완전히 삭제할까요? 삭제하면 같은 URL을 다시 수집할 수 있어요.'
                                                            )
                                                        ) {
                                                            deleteMutation.mutate(candidate.id);
                                                        }
                                                    }}
                                                    title="완전히 삭제 (같은 URL 재수집 가능)"
                                                    className="shrink-0 text-slate-300 transition hover:text-rose-500 disabled:opacity-50"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {boardCandidates.length === 0 && (
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
                                    className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border p-2.5 transition ${
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
                                    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain pr-1">
                                        {items.map((item) => {
                                            const dDay = dDayLabel(item.deadline);
                                            return (
                                                <div
                                                    key={item.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, item.id)}
                                                    onClick={() => openDrawer(item)}
                                                    className="cursor-grab rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow active:cursor-grabbing"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span
                                                            className="truncate text-[11px] font-semibold text-slate-400"
                                                            title={`${STAGE_LABELS[stage]} 상태로 마지막 변경된 날짜`}
                                                        >
                                                            {formatBoardStatusDate(
                                                                item.statusChangedAt
                                                            )}
                                                        </span>
                                                        {item.alwaysOpen ? (
                                                            <AlwaysOpenBadge rounded="rounded-full" />
                                                        ) : dDay ? (
                                                            <span
                                                                className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold ${getDDayBadgeStyle(
                                                                    item.deadline
                                                                )}`}
                                                            >
                                                                {dDay}
                                                            </span>
                                                        ) : (
                                                            <span />
                                                        )}
                                                    </div>
                                                    <p className="mt-1.5 truncate text-sm font-extrabold text-slate-800">
                                                        {item.companyName}
                                                    </p>
                                                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                                                        <p className="min-w-0 flex-1 truncate text-xs text-slate-500">
                                                            {item.positionTitle}
                                                        </p>
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                dismissCandidateMutation.isPending
                                                            }
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (
                                                                    confirm(
                                                                        '이 지원 공고를 숨김 처리할까요?'
                                                                    )
                                                                ) {
                                                                    dismissCandidateMutation.mutate(
                                                                        item.id
                                                                    );
                                                                }
                                                            }}
                                                            title="공고 숨김 처리"
                                                            className="shrink-0 text-slate-400 transition hover:text-slate-600 disabled:opacity-50"
                                                        >
                                                            <EyeOff className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={deleteMutation.isPending}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (
                                                                    confirm(
                                                                        '이 지원 공고를 완전히 삭제할까요?'
                                                                    )
                                                                ) {
                                                                    deleteMutation.mutate(item.id);
                                                                }
                                                            }}
                                                            title="완전히 삭제"
                                                            className="shrink-0 text-slate-300 transition hover:text-rose-500 disabled:opacity-50"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
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
                                                onClick={() => openDrawer(item)}
                                                title={`${item.companyName} · 마감일`}
                                                className="block w-full truncate rounded bg-blue-50 px-1 py-0.5 text-left text-[10px] font-bold text-blue-700 transition hover:bg-blue-100"
                                            >
                                                {item.companyName}
                                            </button>
                                        ))}
                                        {events?.candidates.map((item) => (
                                            <div
                                                key={`cand-${item.id}`}
                                                title={`${item.companyName} · ${item.source} (수집됨)`}
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

            {detailDrawerAnim.shouldRender &&
                createPortal(
                    <div className="fixed inset-0 z-40 flex justify-end">
                        <div
                            className={`absolute inset-0 bg-slate-900/30 transition-opacity duration-300 ease-out ${detailDrawerAnim.isVisible ? 'opacity-100' : 'opacity-0'}`}
                            onClick={closeDrawer}
                            aria-hidden
                        />
                        <div
                            className={`relative flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl transition-transform duration-300 ease-out ${detailDrawerAnim.isVisible ? 'translate-x-0' : 'translate-x-full'}`}
                        >
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pb-8">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-lg font-black text-slate-950">
                                        {isCreating
                                            ? '새 지원 공고 등록'
                                            : drawerItem && isPreApplication(drawerItem.status)
                                              ? isEditing
                                                  ? '수집된 공고 수정'
                                                  : '수집된 공고 상세'
                                              : isEditing
                                                ? '지원 공고 수정'
                                                : '지원 공고 상세'}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={closeDrawer}
                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                {!isCreating && !isEditing ? (
                                    drawerItem && (
                                        <div className="space-y-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-lg font-black text-slate-900">
                                                        {drawerItem.companyName}
                                                    </p>
                                                    <p className="mt-0.5 text-sm text-slate-500">
                                                        {drawerItem.positionTitle}
                                                    </p>
                                                </div>
                                                {isPreApplication(drawerItem.status) ? (
                                                    <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-extrabold text-white">
                                                        {drawerItem.status === 'SAVED' ? (
                                                            <BookmarkCheck className="h-3 w-3" />
                                                        ) : (
                                                            <Bookmark className="h-3 w-3" />
                                                        )}
                                                        {CANDIDATE_STATUS_LABELS[drawerItem.status]}
                                                    </span>
                                                ) : (
                                                    <span
                                                        className={`inline-flex w-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${STAGE_ACCENT[drawerItem.status as ApplicationStatus]}`}
                                                    >
                                                        {
                                                            STAGE_LABELS[
                                                                drawerItem.status as ApplicationStatus
                                                            ]
                                                        }
                                                    </span>
                                                )}
                                            </div>

                                            <JobplanetReputationCard
                                                key={`jobplanet-${drawerItem.id}`}
                                                jobPostingId={drawerItem.id}
                                            />

                                            <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
                                                <div>
                                                    <dt className="font-bold text-slate-500">
                                                        출처
                                                    </dt>
                                                    <dd className="mt-0.5 text-slate-800">
                                                        {drawerItem.source}
                                                    </dd>
                                                </div>
                                                {!isPreApplication(drawerItem.status) && (
                                                    <div>
                                                        <dt className="font-bold text-slate-500">
                                                            지원일
                                                        </dt>
                                                        <dd className="mt-0.5 text-slate-800">
                                                            {drawerItem.appliedAt}
                                                        </dd>
                                                    </div>
                                                )}
                                                <div>
                                                    <dt className="font-bold text-slate-500">
                                                        마감일
                                                    </dt>
                                                    <dd className="mt-0.5 text-slate-800">
                                                        {drawerItem.alwaysOpen ? (
                                                            <AlwaysOpenBadge />
                                                        ) : drawerItem.deadline ? (
                                                            <span className="inline-flex items-center gap-1.5">
                                                                {drawerItem.deadline}
                                                                {dDayLabel(drawerItem.deadline) && (
                                                                    <span
                                                                        className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${getDDayBadgeStyle(
                                                                            drawerItem.deadline
                                                                        )}`}
                                                                    >
                                                                        {dDayLabel(
                                                                            drawerItem.deadline
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300">
                                                                —
                                                            </span>
                                                        )}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="font-bold text-slate-500">
                                                        연봉/근무조건 메모
                                                    </dt>
                                                    <dd className="mt-0.5 text-slate-800">
                                                        {drawerItem.salaryNote ?? (
                                                            <span className="text-slate-300">
                                                                —
                                                            </span>
                                                        )}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="font-bold text-slate-500">
                                                        근무지
                                                    </dt>
                                                    <dd className="mt-0.5 text-slate-800">
                                                        {drawerItem.location ?? (
                                                            <span className="text-slate-300">
                                                                —
                                                            </span>
                                                        )}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="font-bold text-slate-500">
                                                        고용형태
                                                    </dt>
                                                    <dd className="mt-0.5 text-slate-800">
                                                        {drawerItem.employmentType ?? (
                                                            <span className="text-slate-300">
                                                                —
                                                            </span>
                                                        )}
                                                    </dd>
                                                </div>
                                                {isPreApplication(drawerItem.status) && (
                                                    <div>
                                                        <dt className="font-bold text-slate-500">
                                                            수집 일시
                                                        </dt>
                                                        <dd className="mt-0.5 text-slate-800">
                                                            {drawerItem.createdAt
                                                                .replace('T', ' ')
                                                                .slice(0, 19)}
                                                        </dd>
                                                    </div>
                                                )}
                                                {!isPreApplication(drawerItem.status) &&
                                                    drawerItem.memo && (
                                                        <div className="col-span-2">
                                                            <dt className="font-bold text-slate-500">
                                                                메모
                                                            </dt>
                                                            <dd className="mt-0.5 whitespace-pre-wrap text-slate-800">
                                                                {drawerItem.memo}
                                                            </dd>
                                                        </div>
                                                    )}
                                            </dl>

                                            <SectionTabs
                                                key={`sections-${drawerItem.id}`}
                                                tabs={[
                                                    {
                                                        key: 'detail',
                                                        label: '상세 정보',
                                                        content: !isCandidateDetailMissing(
                                                            drawerItem
                                                        ) ? (
                                                            <DetailTabs
                                                                fields={{
                                                                    jobDescription:
                                                                        drawerItem.jobDescription,
                                                                    requiredQualifications:
                                                                        drawerItem.requiredQualifications,
                                                                    preferredQualifications:
                                                                        drawerItem.preferredQualifications,
                                                                    hiringProcess:
                                                                        drawerItem.hiringProcess,
                                                                    applicationMethod:
                                                                        drawerItem.applicationMethod,
                                                                    compensationDetail:
                                                                        drawerItem.compensationDetail,
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                                                <div className="flex items-start gap-2">
                                                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                                                    <div>
                                                                        <p className="text-sm font-bold text-amber-800">
                                                                            상세 정보를 자동으로
                                                                            가져오지 못했어요
                                                                        </p>
                                                                        <p className="mt-1 text-xs text-amber-700">
                                                                            원본 페이지가 채용공고
                                                                            상세가 아니었거나,
                                                                            사이트가 자동 수집을
                                                                            차단했을 수 있어요. 아래
                                                                            &ldquo;직접
                                                                            입력하기&rdquo;로
                                                                            담당업무·자격요건 등을
                                                                            채워주세요.
                                                                        </p>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                startEditing(
                                                                                    drawerItem
                                                                                )
                                                                            }
                                                                            className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-900"
                                                                        >
                                                                            <Pencil className="h-3 w-3" />
                                                                            직접 입력하기
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ),
                                                    },
                                                    {
                                                        key: 'cover-letter',
                                                        label: '자소서',
                                                        content: (
                                                            <CoverLetterEditor
                                                                jobPostingId={drawerItem.id}
                                                            />
                                                        ),
                                                    },
                                                    {
                                                        key: 'print-templates',
                                                        label: 'PDF 템플릿',
                                                        content: (
                                                            <PrintTemplatesPanel
                                                                jobPostingId={drawerItem.id}
                                                                hasAppealAnalysis={Boolean(
                                                                    drawerItem.appealAnalysis
                                                                )}
                                                                appealAnalyzedAt={
                                                                    drawerItem.appealAnalyzedAt
                                                                }
                                                            />
                                                        ),
                                                    },
                                                    {
                                                        key: 'memo',
                                                        label: '메모',
                                                        content: (
                                                            <PostingMemoEditor
                                                                jobPosting={drawerItem}
                                                            />
                                                        ),
                                                    },
                                                    {
                                                        key: 'stage',
                                                        label: '상태 이력',
                                                        content: (
                                                            <div>
                                                                {!isPreApplication(
                                                                    drawerItem.status
                                                                ) && (
                                                                    <>
                                                                        <p className="mb-2 text-sm font-bold text-slate-600">
                                                                            전형 단계 변경
                                                                        </p>
                                                                        <div className="mb-4 flex flex-wrap items-center gap-2">
                                                                            <select
                                                                                value={
                                                                                    stageDraft ??
                                                                                    (drawerItem.status as ApplicationStatus)
                                                                                }
                                                                                onChange={(e) =>
                                                                                    setStageDraft(
                                                                                        e.target
                                                                                            .value as ApplicationStatus
                                                                                    )
                                                                                }
                                                                                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none"
                                                                            >
                                                                                {STAGE_ORDER.map(
                                                                                    (stage) => (
                                                                                        <option
                                                                                            key={
                                                                                                stage
                                                                                            }
                                                                                            value={
                                                                                                stage
                                                                                            }
                                                                                        >
                                                                                            {
                                                                                                STAGE_LABELS[
                                                                                                    stage
                                                                                                ]
                                                                                            }
                                                                                        </option>
                                                                                    )
                                                                                )}
                                                                            </select>
                                                                            <input
                                                                                value={stageMemo}
                                                                                onChange={(e) =>
                                                                                    setStageMemo(
                                                                                        e.target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                                placeholder="메모(선택)"
                                                                                className="w-36 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                disabled={
                                                                                    statusMutation.isPending
                                                                                }
                                                                                onClick={() =>
                                                                                    statusMutation.mutate(
                                                                                        {
                                                                                            id: drawerItem.id,
                                                                                            status:
                                                                                                stageDraft ??
                                                                                                (drawerItem.status as ApplicationStatus),
                                                                                            memo:
                                                                                                stageMemo.trim() ||
                                                                                                undefined,
                                                                                        }
                                                                                    )
                                                                                }
                                                                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                                            >
                                                                                적용
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                )}

                                                                <p className="mb-2 text-sm font-bold text-slate-600">
                                                                    상태 변경 타임라인
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
                                                                        {stageEvents.map(
                                                                            (event, index) => {
                                                                                const memo =
                                                                                    statusEventMemo(
                                                                                        event
                                                                                    );
                                                                                return (
                                                                                    <li
                                                                                        key={
                                                                                            event.id
                                                                                        }
                                                                                        className="group flex items-center justify-between gap-2 text-sm"
                                                                                    >
                                                                                        <div className="flex items-baseline gap-2 overflow-hidden">
                                                                                            <span className="whitespace-nowrap font-mono text-xs text-slate-400">
                                                                                                {event.changedAt
                                                                                                    .replace(
                                                                                                        'T',
                                                                                                        ' '
                                                                                                    )
                                                                                                    .slice(
                                                                                                        0,
                                                                                                        19
                                                                                                    )}
                                                                                            </span>
                                                                                            <span
                                                                                                className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${statusEventBadgeClass(event.status)}`}
                                                                                            >
                                                                                                {statusEventLabel(
                                                                                                    event,
                                                                                                    index,
                                                                                                    stageEvents
                                                                                                )}
                                                                                            </span>
                                                                                            {memo && (
                                                                                                <span className="truncate text-xs text-slate-500">
                                                                                                    {
                                                                                                        memo
                                                                                                    }
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        {drawerItem && (
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    if (
                                                                                                        confirm(
                                                                                                            `'${statusEventLabel(event, index, stageEvents)}' 이력을 삭제하시겠습니까?`
                                                                                                        )
                                                                                                    ) {
                                                                                                        deleteStatusEventMutation.mutate(
                                                                                                            {
                                                                                                                id: drawerItem.id,
                                                                                                                eventId:
                                                                                                                    event.id,
                                                                                                            }
                                                                                                        );
                                                                                                    }
                                                                                                }}
                                                                                                disabled={
                                                                                                    deleteStatusEventMutation.isPending
                                                                                                }
                                                                                                className="p-1 text-slate-300 transition-colors hover:text-rose-500 disabled:opacity-50"
                                                                                                title="이력 삭제"
                                                                                            >
                                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                                            </button>
                                                                                        )}
                                                                                    </li>
                                                                                );
                                                                                return (
                                                                                    <li
                                                                                        key={
                                                                                            event.id
                                                                                        }
                                                                                        className="flex items-baseline gap-2 text-sm"
                                                                                    >
                                                                                        <span className="whitespace-nowrap font-mono text-xs text-slate-400">
                                                                                            {event.changedAt
                                                                                                .replace(
                                                                                                    'T',
                                                                                                    ' '
                                                                                                )
                                                                                                .slice(
                                                                                                    0,
                                                                                                    19
                                                                                                )}
                                                                                        </span>
                                                                                        <span
                                                                                            className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${statusEventBadgeClass(event.status)}`}
                                                                                        >
                                                                                            {statusEventLabel(
                                                                                                event,
                                                                                                index,
                                                                                                stageEvents
                                                                                            )}
                                                                                        </span>
                                                                                        {memo && (
                                                                                            <span className="truncate text-xs text-slate-500">
                                                                                                {
                                                                                                    memo
                                                                                                }
                                                                                            </span>
                                                                                        )}
                                                                                    </li>
                                                                                );
                                                                            }
                                                                        )}
                                                                    </ol>
                                                                )}
                                                            </div>
                                                        ),
                                                    },
                                                    {
                                                        key: 'appeal',
                                                        label: '경력 매칭 분석',
                                                        content: (() => {
                                                            const isAppealWorkflowPending =
                                                                analyzeAppealMutation.isPending;
                                                            const statusRow = (
                                                                <div
                                                                    className={`flex flex-1 items-center justify-between gap-3 rounded-lg transition-colors ${
                                                                        isAppealWorkflowPending
                                                                            ? 'bg-indigo-50/70 px-3 py-2'
                                                                            : ''
                                                                    }`}
                                                                >
                                                                    <p
                                                                        className={`text-xs font-semibold ${
                                                                            isAppealWorkflowPending
                                                                                ? 'animate-pulse text-indigo-600'
                                                                                : 'text-slate-500'
                                                                        }`}
                                                                    >
                                                                        {analyzeAppealMutation.isPending
                                                                            ? '경력·핵심역량 데이터를 모아 분석하고 있어요. 몇십 초 정도 걸릴 수 있어요.'
                                                                            : drawerItem.appealAnalyzedAt
                                                                              ? `마지막 분석 · ${drawerItem.appealAnalyzedAt.replace('T', ' ').slice(0, 16)}`
                                                                              : '아직 분석 전이에요. 내 경력과 대조해 어필 포인트를 확인해보세요.'}
                                                                    </p>
                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            isAppealWorkflowPending
                                                                        }
                                                                        onClick={() =>
                                                                            analyzeAppealMutation.mutate(
                                                                                drawerItem.id
                                                                            )
                                                                        }
                                                                        title="내 경력/핵심역량과 대조해 어필 포인트를 AI로 분석합니다"
                                                                        className={`flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-sm font-bold transition disabled:cursor-not-allowed ${
                                                                            isAppealWorkflowPending
                                                                                ? 'border-indigo-200 bg-white text-indigo-600'
                                                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40'
                                                                        }`}
                                                                    >
                                                                        {analyzeAppealMutation.isPending ? (
                                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                        ) : (
                                                                            <Sparkles className="h-3.5 w-3.5" />
                                                                        )}
                                                                        {analyzeAppealMutation.isPending
                                                                            ? '분석 중...'
                                                                            : drawerItem.appealAnalysis
                                                                              ? '다시 분석'
                                                                              : '분석하기'}
                                                                    </button>
                                                                </div>
                                                            );

                                                            const appealDetail =
                                                                drawerItem.appealAnalysis ? (
                                                                    <AppealAnalysisView
                                                                        key={
                                                                            drawerItem.appealAnalyzedAt ??
                                                                            'none'
                                                                        }
                                                                        markdown={
                                                                            drawerItem.appealAnalysis
                                                                        }
                                                                        headerExtra={statusRow}
                                                                    />
                                                                ) : (
                                                                    statusRow
                                                                );
                                                            return (
                                                                <SectionTabs
                                                                    bordered={false}
                                                                    size="sm"
                                                                    tabs={[
                                                                        {
                                                                            key: 'score',
                                                                            label: (
                                                                                <span className="inline-flex items-center gap-1">
                                                                                    자동 매칭 점수
                                                                                    <InfoTooltip
                                                                                        text="공고를 수집할 때 보유 기술 스택과 자동으로 비교해 계산돼요. 기술 스택을 수정했거나 점수가 오래됐다면 다시 계산 버튼으로 갱신할 수 있어요."
                                                                                        iconClassName="text-emerald-400"
                                                                                    />
                                                                                </span>
                                                                            ),
                                                                            content: (
                                                                                <div className="rounded-lg bg-emerald-50 p-3">
                                                                                    <div className="flex items-start justify-between gap-3">
                                                                                        <p
                                                                                            className={
                                                                                                drawerItem.matchScore !==
                                                                                                null
                                                                                                    ? 'text-lg font-extrabold text-emerald-700'
                                                                                                    : 'text-sm font-bold text-slate-500'
                                                                                            }
                                                                                        >
                                                                                            {drawerItem.matchScore !==
                                                                                            null
                                                                                                ? `AI 매칭 ${drawerItem.matchScore}점`
                                                                                                : '아직 계산되지 않았어요'}
                                                                                        </p>
                                                                                        <button
                                                                                            type="button"
                                                                                            disabled={
                                                                                                rematchMutation.isPending
                                                                                            }
                                                                                            onClick={() =>
                                                                                                rematchMutation.mutate(
                                                                                                    drawerItem.id
                                                                                                )
                                                                                            }
                                                                                            title="현재 보유 기술 스택 기준으로 매칭 점수를 다시 계산합니다"
                                                                                            className="flex shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                                                        >
                                                                                            {rematchMutation.isPending ? (
                                                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                                            ) : (
                                                                                                <Sparkles className="h-3.5 w-3.5" />
                                                                                            )}
                                                                                            {rematchMutation.isPending
                                                                                                ? '계산 중...'
                                                                                                : '다시 계산'}
                                                                                        </button>
                                                                                    </div>
                                                                                    {drawerItem.matchReason && (
                                                                                        <p className="mt-1 text-sm text-emerald-600">
                                                                                            {
                                                                                                drawerItem.matchReason
                                                                                            }
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            ),
                                                                        },
                                                                        {
                                                                            key: 'appeal-detail',
                                                                            label: (
                                                                                <span className="inline-flex items-center gap-1">
                                                                                    AI 어필 포인트
                                                                                    분석
                                                                                    <InfoTooltip text="위 자동 점수와 달리, 버튼을 눌러야 실행돼요. 경력·프로젝트 전체와 핵심역량을 이 공고와 대조해 어떤 경험을 어떻게 강조하면 좋을지 긴 글로 분석해줘요." />
                                                                                </span>
                                                                            ),
                                                                            content: appealDetail,
                                                                        },
                                                                        {
                                                                            key: 'gap-projects',
                                                                            label: (
                                                                                <span className="inline-flex items-center gap-1">
                                                                                    보완 프로젝트
                                                                                    <InfoTooltip text="AI 분석에서 부족하다고 판단한 경험을 실제 코드와 검증 산출물로 보완할 프로젝트 문서를 만듭니다." />
                                                                                </span>
                                                                            ),
                                                                            content: (
                                                                                <GapProjectDocumentsPanel
                                                                                    jobPostingId={
                                                                                        drawerItem.id
                                                                                    }
                                                                                    hasAppealAnalysis={Boolean(
                                                                                        drawerItem.appealAnalysis
                                                                                    )}
                                                                                />
                                                                            ),
                                                                        },
                                                                    ]}
                                                                />
                                                            );
                                                        })(),
                                                    },
                                                ]}
                                            />
                                        </div>
                                    )
                                ) : (
                                    <div className="space-y-4">
                                        {isCreating && (
                                            <div className="mb-4 flex border-b border-slate-200">
                                                <button
                                                    type="button"
                                                    onClick={() => setIngestMode('single')}
                                                    className={`flex-1 pb-2 text-sm font-bold border-b-2 transition ${
                                                        ingestMode === 'single'
                                                            ? 'border-slate-900 text-slate-900'
                                                            : 'border-transparent text-slate-400 hover:text-slate-600'
                                                    }`}
                                                >
                                                    단일 공고 등록
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIngestMode('bulk')}
                                                    className={`flex-1 pb-2 text-sm font-bold border-b-2 transition ${
                                                        ingestMode === 'bulk'
                                                            ? 'border-slate-900 text-slate-900'
                                                            : 'border-transparent text-slate-400 hover:text-slate-600'
                                                    }`}
                                                >
                                                    다중 일괄 수집 (Bulk)
                                                </button>
                                            </div>
                                        )}

                                        {isCreating && ingestMode === 'bulk' ? (
                                            <div>
                                                <div className="mb-3 space-y-1.5 rounded-lg bg-blue-50/80 p-3 text-xs text-blue-900 border border-blue-100">
                                                    <div className="flex items-center gap-1.5 font-bold text-blue-900">
                                                        <Sparkles className="h-4 w-4 text-blue-600" />
                                                        <span>다중 공고 수집 방법</span>
                                                    </div>
                                                    <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-blue-800">
                                                        <li>
                                                            Cmd+V로 여러 URL을 붙여넣거나 자물쇠
                                                            아이콘을 드래그하세요.
                                                        </li>
                                                        <li>
                                                            수집된 공고는 즉시 후보 공고 목록에 자동
                                                            생성됩니다.
                                                        </li>
                                                    </ul>
                                                </div>

                                                <div
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (e.dataTransfer)
                                                            e.dataTransfer.dropEffect = 'copy';
                                                        setIsDropZoneOver(true);
                                                    }}
                                                    onDragEnter={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (e.dataTransfer)
                                                            e.dataTransfer.dropEffect = 'copy';
                                                        setIsDropZoneOver(true);
                                                    }}
                                                    onDragLeave={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setIsDropZoneOver(false);
                                                    }}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setIsDropZoneOver(false);
                                                        const droppedUrls =
                                                            extractUrlsFromDataTransfer(
                                                                e.dataTransfer
                                                            );
                                                        if (droppedUrls.length > 0) {
                                                            handleFillDroppedUrls(droppedUrls);
                                                        }
                                                    }}
                                                    className={`mb-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition ${
                                                        isDropZoneOver
                                                            ? 'border-blue-500 bg-blue-50/90 text-blue-700'
                                                            : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <Sparkles className="mb-1 h-5 w-5 text-slate-400" />
                                                    <p className="text-xs font-semibold">
                                                        브라우저 탭, 링크, 북마크를 이 상자로{' '}
                                                        <b>드래그 앤 드롭</b>하세요
                                                    </p>
                                                </div>

                                                <div className="mb-4 space-y-2">
                                                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                                        <span>수집할 공고 URL (최대 5개)</span>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={handlePasteClipboardUrls}
                                                                className="flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-100"
                                                            >
                                                                <Clipboard className="h-3 w-3" />
                                                                클립보드에서 가져오기 (Cmd+V)
                                                            </button>
                                                            {bulkUrls.some(Boolean) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setBulkUrls([
                                                                            '',
                                                                            '',
                                                                            '',
                                                                            '',
                                                                            '',
                                                                        ]);
                                                                        setBulkResults([]);
                                                                    }}
                                                                    className="text-rose-500 hover:underline text-[11px] font-normal"
                                                                >
                                                                    전체 비우기
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {bulkUrls.map((url, index) => (
                                                        <div
                                                            key={index}
                                                            className="flex items-center gap-1.5"
                                                        >
                                                            <span className="shrink-0 text-xs font-semibold text-slate-400 w-4 text-right">
                                                                {index + 1}.
                                                            </span>
                                                            <input
                                                                type="url"
                                                                value={url}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setBulkUrls((prev) => {
                                                                        const next = [...prev];
                                                                        next[index] = val;
                                                                        return next;
                                                                    });
                                                                }}
                                                                placeholder={`채용 공고 URL ${index + 1}`}
                                                                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-slate-400 focus:outline-none"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={
                                                        isBulkIngesting ||
                                                        bulkUrls.filter((u) => u.trim()).length ===
                                                            0
                                                    }
                                                    onClick={() => requestBulkIngestUrls(bulkUrls)}
                                                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 mb-3"
                                                >
                                                    <Sparkles className="h-4 w-4" />
                                                    {isBulkIngesting
                                                        ? '다중 수집 진행 중...'
                                                        : '다중 수집 시작'}
                                                </button>

                                                {bulkResults.length > 0 && (
                                                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                                                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                                            <span>수집 진행 현황</span>
                                                            <span>
                                                                {
                                                                    bulkResults.filter(
                                                                        (r) =>
                                                                            r.status ===
                                                                                'success' ||
                                                                            r.status === 'error'
                                                                    ).length
                                                                }{' '}
                                                                / {bulkResults.length} 완료
                                                            </span>
                                                        </div>
                                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                            <div
                                                                className="h-full bg-slate-900 transition-all duration-300"
                                                                style={{
                                                                    width: `${(bulkResults.filter((r) => r.status === 'success' || r.status === 'error').length / bulkResults.length) * 100}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                                            {bulkResults.map((item, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-slate-50/70 p-2 text-xs"
                                                                >
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span
                                                                            className="truncate font-mono text-[11px] text-slate-600 max-w-[200px]"
                                                                            title={item.url}
                                                                        >
                                                                            {item.url}
                                                                        </span>
                                                                        {item.status ===
                                                                            'pending' && (
                                                                            <span className="shrink-0 text-[10px] text-slate-400">
                                                                                대기 중
                                                                            </span>
                                                                        )}
                                                                        {item.status ===
                                                                            'processing' && (
                                                                            <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-amber-600">
                                                                                <Loader2 className="h-3 w-3 animate-spin" />{' '}
                                                                                수집 중
                                                                            </span>
                                                                        )}
                                                                        {item.status ===
                                                                            'success' && (
                                                                            <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-emerald-600">
                                                                                <Check className="h-3 w-3" />{' '}
                                                                                성공
                                                                            </span>
                                                                        )}
                                                                        {item.status ===
                                                                            'error' && (
                                                                            <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-rose-600">
                                                                                <X className="h-3 w-3" />{' '}
                                                                                실패
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {item.status === 'success' &&
                                                                        item.response && (
                                                                            <div className="text-[11px] font-semibold text-slate-800 truncate">
                                                                                {
                                                                                    item.response
                                                                                        .companyName
                                                                                }{' '}
                                                                                -{' '}
                                                                                {
                                                                                    item.response
                                                                                        .positionTitle
                                                                                }
                                                                            </div>
                                                                        )}
                                                                    {item.status === 'error' &&
                                                                        item.message && (
                                                                            <div className="text-[11px] text-rose-500">
                                                                                {item.message}
                                                                            </div>
                                                                        )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                {isCreating && (
                                                    <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 mb-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                                                                <Sparkles className="h-4 w-4 text-blue-600" />
                                                                <span>
                                                                    AI 공고 수집 및 자동 등록
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={handlePasteClipboardUrls}
                                                                className="flex items-center gap-1 rounded bg-blue-100/80 px-2 py-0.5 text-[11px] font-bold text-blue-700 hover:bg-blue-200/80 transition"
                                                            >
                                                                <Clipboard className="h-3 w-3" />
                                                                클립보드 가져오기 (Cmd+V)
                                                            </button>
                                                        </div>

                                                        <div
                                                            onDragOver={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (e.dataTransfer)
                                                                    e.dataTransfer.dropEffect =
                                                                        'copy';
                                                                setIsDropZoneOver(true);
                                                            }}
                                                            onDragEnter={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (e.dataTransfer)
                                                                    e.dataTransfer.dropEffect =
                                                                        'copy';
                                                                setIsDropZoneOver(true);
                                                            }}
                                                            onDragLeave={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setIsDropZoneOver(false);
                                                            }}
                                                            onDrop={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setIsDropZoneOver(false);
                                                                if (!e.dataTransfer) return;
                                                                const dropped =
                                                                    extractUrlsFromDataTransfer(
                                                                        e.dataTransfer
                                                                    );
                                                                if (dropped.length > 0) {
                                                                    handleFillDroppedUrls(dropped);
                                                                }
                                                            }}
                                                            className={`flex items-center gap-2 rounded-lg border p-2.5 transition ${
                                                                isDropZoneOver
                                                                    ? 'border-blue-500 bg-blue-100 scale-[1.01]'
                                                                    : 'border-slate-200 bg-white'
                                                            }`}
                                                        >
                                                            <input
                                                                type="url"
                                                                value={singleUrl}
                                                                onChange={(e) =>
                                                                    setSingleUrl(e.target.value)
                                                                }
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        if (singleUrl.trim()) {
                                                                            requestIngestSingleUrl(
                                                                                singleUrl.trim()
                                                                            );
                                                                        }
                                                                    }
                                                                }}
                                                                placeholder="https://... 공고 주소 입력 또는 🔒자물쇠/링크 드래그"
                                                                className="w-full bg-transparent px-2 py-1 text-xs focus:outline-none"
                                                            />
                                                            {singleUrl && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSingleUrl('')}
                                                                    className="shrink-0 p-1 text-slate-400 hover:text-slate-600"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            disabled={
                                                                !singleUrl.trim() ||
                                                                isSingleIngesting
                                                            }
                                                            onClick={() =>
                                                                requestIngestSingleUrl(
                                                                    singleUrl.trim()
                                                                )
                                                            }
                                                            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <Sparkles className="h-4 w-4" />
                                                            {isSingleIngesting
                                                                ? `수집 및 등록 중... (${singleIngestElapsedSeconds}초)`
                                                                : '✨ AI로 수집 및 자동 등록'}
                                                        </button>
                                                    </div>
                                                )}

                                                {isCreating && !showManualForm ? (
                                                    <div className="relative my-5 flex items-center justify-center">
                                                        <div className="absolute inset-0 flex items-center">
                                                            <div className="w-full border-t border-slate-200" />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowManualForm(true)}
                                                            className="relative bg-white px-3.5 py-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
                                                        >
                                                            <span>
                                                                ✍️ 수동으로 공고 직접 작성하기
                                                            </span>
                                                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        {isCreating && showManualForm && (
                                                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                                                                <span className="text-xs font-bold text-slate-700">
                                                                    ✍️ 수동 작성 등록
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setShowManualForm(false)
                                                                    }
                                                                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition"
                                                                >
                                                                    접기 ▲
                                                                </button>
                                                            </div>
                                                        )}
                                                        <form
                                                            id="job-posting-edit-form"
                                                            onSubmit={handleSubmit}
                                                            className="space-y-4"
                                                        >
                                                            {!isCreating && (
                                                                <div>
                                                                    <span className="mb-1 block text-sm font-bold text-slate-600">
                                                                        공고 URL
                                                                    </span>
                                                                    <div className="flex gap-2">
                                                                        <input
                                                                            type="url"
                                                                            value={
                                                                                form.postingUrl ??
                                                                                ''
                                                                            }
                                                                            onChange={(e) =>
                                                                                setForm((prev) => ({
                                                                                    ...prev,
                                                                                    postingUrl:
                                                                                        e.target
                                                                                            .value,
                                                                                }))
                                                                            }
                                                                            placeholder="https://..."
                                                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <label className="block text-sm">
                                                                <span className="mb-1 block font-bold text-slate-600">
                                                                    회사명
                                                                </span>
                                                                <input
                                                                    required
                                                                    value={form.companyName}
                                                                    onChange={(e) =>
                                                                        setForm((prev) => ({
                                                                            ...prev,
                                                                            companyName:
                                                                                e.target.value,
                                                                        }))
                                                                    }
                                                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                                                />
                                                            </label>
                                                            <label className="block text-sm">
                                                                <span className="mb-1 block font-bold text-slate-600">
                                                                    직무명
                                                                </span>
                                                                <input
                                                                    required
                                                                    value={form.positionTitle}
                                                                    onChange={(e) =>
                                                                        setForm((prev) => ({
                                                                            ...prev,
                                                                            positionTitle:
                                                                                e.target.value,
                                                                        }))
                                                                    }
                                                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                                                />
                                                            </label>
                                                            <label className="block text-sm">
                                                                <span className="mb-1 block font-bold text-slate-600">
                                                                    출처
                                                                </span>
                                                                <input
                                                                    required
                                                                    placeholder="사람인 / 원티드 / 잡코리아 / 직접입력"
                                                                    value={form.source}
                                                                    onChange={(e) =>
                                                                        setForm((prev) => ({
                                                                            ...prev,
                                                                            source: e.target.value,
                                                                        }))
                                                                    }
                                                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                                                />
                                                            </label>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                {formIsPostApplication && (
                                                                    <label className="block text-sm">
                                                                        <span className="mb-1 block font-bold text-slate-600">
                                                                            지원일
                                                                        </span>
                                                                        <input
                                                                            required
                                                                            type="date"
                                                                            value={
                                                                                form.appliedAt ?? ''
                                                                            }
                                                                            onChange={(e) =>
                                                                                setForm((prev) => ({
                                                                                    ...prev,
                                                                                    appliedAt:
                                                                                        e.target
                                                                                            .value,
                                                                                }))
                                                                            }
                                                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                                                        />
                                                                    </label>
                                                                )}
                                                                <label
                                                                    className={`block text-sm ${formIsPostApplication ? '' : 'col-span-2'}`}
                                                                >
                                                                    <div className="mb-1 flex items-center justify-between">
                                                                        <span className="font-bold text-slate-600">
                                                                            마감일
                                                                        </span>
                                                                        <label className="flex items-center gap-1 text-xs font-bold text-slate-500">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={
                                                                                    form.alwaysOpen
                                                                                }
                                                                                onChange={(e) =>
                                                                                    setForm(
                                                                                        (prev) => ({
                                                                                            ...prev,
                                                                                            alwaysOpen:
                                                                                                e
                                                                                                    .target
                                                                                                    .checked,
                                                                                            deadline:
                                                                                                e
                                                                                                    .target
                                                                                                    .checked
                                                                                                    ? ''
                                                                                                    : prev.deadline,
                                                                                        })
                                                                                    )
                                                                                }
                                                                            />
                                                                            상시채용
                                                                        </label>
                                                                    </div>
                                                                    <input
                                                                        type="date"
                                                                        disabled={form.alwaysOpen}
                                                                        value={form.deadline ?? ''}
                                                                        onChange={(e) =>
                                                                            setForm((prev) => ({
                                                                                ...prev,
                                                                                deadline:
                                                                                    e.target.value,
                                                                            }))
                                                                        }
                                                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
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
                                                                            salaryNote:
                                                                                e.target.value,
                                                                        }))
                                                                    }
                                                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                                                />
                                                            </label>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <label className="block text-sm">
                                                                    <span className="mb-1 block font-bold text-slate-600">
                                                                        근무지
                                                                    </span>
                                                                    <input
                                                                        value={form.location ?? ''}
                                                                        onChange={(e) =>
                                                                            setForm((prev) => ({
                                                                                ...prev,
                                                                                location:
                                                                                    e.target.value,
                                                                            }))
                                                                        }
                                                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                                                    />
                                                                </label>
                                                                <label className="block text-sm">
                                                                    <span className="mb-1 block font-bold text-slate-600">
                                                                        고용형태
                                                                    </span>
                                                                    <input
                                                                        value={
                                                                            form.employmentType ??
                                                                            ''
                                                                        }
                                                                        onChange={(e) =>
                                                                            setForm((prev) => ({
                                                                                ...prev,
                                                                                employmentType:
                                                                                    e.target.value,
                                                                            }))
                                                                        }
                                                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                                                    />
                                                                </label>
                                                            </div>
                                                            {formIsPostApplication && (
                                                                <label className="block text-sm">
                                                                    <span className="mb-1 block font-bold text-slate-600">
                                                                        메모
                                                                    </span>
                                                                    <textarea
                                                                        rows={3}
                                                                        value={form.memo ?? ''}
                                                                        onChange={(e) =>
                                                                            setForm((prev) => ({
                                                                                ...prev,
                                                                                memo: e.target
                                                                                    .value,
                                                                            }))
                                                                        }
                                                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                                                    />
                                                                </label>
                                                            )}

                                                            <div>
                                                                <div className="space-y-3">
                                                                    {(
                                                                        [
                                                                            [
                                                                                'jobDescription',
                                                                                '직무 상세',
                                                                            ],
                                                                            [
                                                                                'requiredQualifications',
                                                                                '지원자격',
                                                                            ],
                                                                            [
                                                                                'preferredQualifications',
                                                                                '우대사항',
                                                                            ],
                                                                            [
                                                                                'hiringProcess',
                                                                                '전형절차',
                                                                            ],
                                                                            [
                                                                                'applicationMethod',
                                                                                '지원방법',
                                                                            ],
                                                                            [
                                                                                'compensationDetail',
                                                                                '처우조건 상세',
                                                                            ],
                                                                        ] as const
                                                                    ).map(([field, label]) => (
                                                                        <label
                                                                            key={field}
                                                                            className="block text-sm"
                                                                        >
                                                                            <span className="mb-1 block font-bold text-slate-600">
                                                                                {label}
                                                                            </span>
                                                                            <textarea
                                                                                rows={3}
                                                                                value={
                                                                                    form[field] ??
                                                                                    ''
                                                                                }
                                                                                onChange={(e) =>
                                                                                    setForm(
                                                                                        (prev) => ({
                                                                                            ...prev,
                                                                                            [field]:
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                        })
                                                                                    )
                                                                                }
                                                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                                                            />
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </form>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {isCreating && ingestMode === 'bulk' ? (
                                <div
                                    key="bulk-footer"
                                    className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 p-5"
                                >
                                    <button
                                        type="button"
                                        onClick={closeDrawer}
                                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                                    >
                                        닫기
                                    </button>
                                </div>
                            ) : isCreating || isEditing ? (
                                <div
                                    key="edit-footer"
                                    className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 p-5"
                                >
                                    {drawerId !== null ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const message =
                                                    drawerItem &&
                                                    isPreApplication(drawerItem.status)
                                                        ? '이 후보를 완전히 삭제할까요? 삭제하면 같은 URL을 다시 수집할 수 있어요.'
                                                        : '이 지원 공고를 삭제할까요?';
                                                if (confirm(message)) {
                                                    deleteMutation.mutate(drawerId);
                                                }
                                            }}
                                            className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3.5 py-2 text-sm font-bold text-rose-500 transition hover:bg-rose-50"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            삭제
                                        </button>
                                    ) : (
                                        <span />
                                    )}
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                drawerId !== null
                                                    ? setIsEditing(false)
                                                    : closeDrawer()
                                            }
                                            className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
                                        >
                                            취소
                                        </button>
                                        {(!isCreating || showManualForm) && (
                                            <button
                                                type="submit"
                                                form="job-posting-edit-form"
                                                disabled={isSaving}
                                                className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {drawerId !== null ? '수정 저장' : '등록'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : drawerItem && isPreApplication(drawerItem.status) ? (
                                <div
                                    key="view-footer-pre"
                                    className="shrink-0 space-y-2 border-t border-slate-200 p-4"
                                >
                                    <button
                                        type="button"
                                        disabled={applyMutation.isPending}
                                        onClick={() => {
                                            applyMutation.mutate(drawerItem.id);
                                            closeDrawer();
                                        }}
                                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Check className="h-4 w-4" />
                                        지원하기
                                    </button>
                                    <div
                                        className={`grid gap-2 ${
                                            drawerItem.postingUrl ? 'grid-cols-6' : 'grid-cols-4'
                                        }`}
                                    >
                                        {drawerItem.status === 'SAVED' ? (
                                            <button
                                                type="button"
                                                disabled={unsaveCandidateMutation.isPending}
                                                onClick={() =>
                                                    unsaveCandidateMutation.mutate(drawerItem.id)
                                                }
                                                title="관심 공고 저장을 해제합니다"
                                                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 px-1 py-2 text-emerald-500 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                                            >
                                                <BookmarkCheck className="h-4 w-4" />
                                                <span className="whitespace-nowrap text-[10px] font-bold">
                                                    저장 해제
                                                </span>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={saveCandidateMutation.isPending}
                                                onClick={() =>
                                                    saveCandidateMutation.mutate(drawerItem.id)
                                                }
                                                title="나중에 다시 볼 관심 공고로 저장합니다"
                                                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 px-1 py-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                                            >
                                                <Bookmark className="h-4 w-4" />
                                                <span className="whitespace-nowrap text-[10px] font-bold">
                                                    관심 저장
                                                </span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => startEditing(drawerItem)}
                                            title="회사명, 공고 내용 등 정보를 수정합니다"
                                            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 px-1 py-2 text-slate-500 transition hover:bg-slate-100"
                                        >
                                            <Pencil className="h-4 w-4" />
                                            <span className="whitespace-nowrap text-[10px] font-bold">
                                                정보 수정
                                            </span>
                                        </button>
                                        {drawerItem.postingUrl && (
                                            <a
                                                href={drawerItem.postingUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                title="채용 사이트의 원본 공고를 새 창에서 엽니다"
                                                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 px-1 py-2 text-slate-500 transition hover:bg-slate-100"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                <span className="whitespace-nowrap text-[10px] font-bold">
                                                    원본 보기
                                                </span>
                                            </a>
                                        )}
                                        {drawerItem.postingUrl && (
                                            <button
                                                type="button"
                                                disabled={refreshMutation.isPending}
                                                onClick={() =>
                                                    refreshMutation.mutate(drawerItem.id)
                                                }
                                                title="원본 URL에서 마감일 등 최신 정보를 다시 가져옵니다"
                                                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 px-1 py-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                                            >
                                                {refreshMutation.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="h-4 w-4" />
                                                )}
                                                <span className="whitespace-nowrap text-[10px] font-bold">
                                                    {refreshMutation.isPending
                                                        ? '수집 중...'
                                                        : '정보 새로고침'}
                                                </span>
                                            </button>
                                        )}
                                        {drawerItem.status === 'DISMISSED' ? (
                                            <button
                                                type="button"
                                                disabled={undismissCandidateMutation.isPending}
                                                onClick={() =>
                                                    undismissCandidateMutation.mutate(drawerItem.id)
                                                }
                                                title="제외한 공고를 수집 목록으로 되돌립니다"
                                                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 px-1 py-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                                            >
                                                <X className="h-4 w-4" />
                                                <span className="whitespace-nowrap text-[10px] font-bold">
                                                    제외 해제
                                                </span>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={dismissCandidateMutation.isPending}
                                                onClick={() => {
                                                    if (confirm('이 후보를 목록에서 제외할까요?')) {
                                                        dismissCandidateMutation.mutate(
                                                            drawerItem.id
                                                        );
                                                    }
                                                }}
                                                title="공고를 삭제하지 않고 수집 목록에서 제외합니다"
                                                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 px-1 py-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                                            >
                                                <X className="h-4 w-4" />
                                                <span className="whitespace-nowrap text-[10px] font-bold">
                                                    목록 제외
                                                </span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            disabled={deleteMutation.isPending}
                                            onClick={() => {
                                                if (
                                                    confirm(
                                                        '이 후보를 완전히 삭제할까요? 삭제하면 같은 URL을 다시 수집할 수 있어요.'
                                                    )
                                                ) {
                                                    deleteMutation.mutate(drawerItem.id);
                                                }
                                            }}
                                            title="공고 기록을 완전히 삭제합니다"
                                            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-rose-200 px-1 py-2 text-rose-500 transition hover:bg-rose-50 disabled:opacity-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="whitespace-nowrap text-[10px] font-bold">
                                                완전 삭제
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                drawerItem && (
                                    <div
                                        key="view-footer-post"
                                        className={`grid shrink-0 gap-2 border-t border-slate-200 p-4 ${
                                            drawerItem.postingUrl ? 'grid-cols-4' : 'grid-cols-2'
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => startEditing(drawerItem)}
                                            title="회사명, 공고 내용 등 정보를 수정합니다"
                                            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 px-1 py-2 text-slate-500 transition hover:bg-slate-100"
                                        >
                                            <Pencil className="h-4 w-4" />
                                            <span className="whitespace-nowrap text-[10px] font-bold">
                                                정보 수정
                                            </span>
                                        </button>
                                        {drawerItem.postingUrl && (
                                            <a
                                                href={drawerItem.postingUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                title="채용 사이트의 원본 공고를 새 창에서 엽니다"
                                                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 px-1 py-2 text-slate-500 transition hover:bg-slate-100"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                <span className="whitespace-nowrap text-[10px] font-bold">
                                                    원본 공고 보기
                                                </span>
                                            </a>
                                        )}
                                        {drawerItem.postingUrl && (
                                            <button
                                                type="button"
                                                disabled={refreshMutation.isPending}
                                                onClick={() =>
                                                    refreshMutation.mutate(drawerItem.id)
                                                }
                                                title="원본 URL에서 마감일 등 최신 정보를 다시 가져옵니다"
                                                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 px-1 py-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                                            >
                                                {refreshMutation.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="h-4 w-4" />
                                                )}
                                                <span className="whitespace-nowrap text-[10px] font-bold">
                                                    {refreshMutation.isPending
                                                        ? '수집 중...'
                                                        : '정보 새로고침'}
                                                </span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            disabled={deleteMutation.isPending}
                                            onClick={() => {
                                                if (confirm('이 지원 공고를 완전히 삭제할까요?')) {
                                                    deleteMutation.mutate(drawerItem.id);
                                                }
                                            }}
                                            title="지원 공고 기록을 완전히 삭제합니다"
                                            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-rose-200 px-1 py-2 text-rose-500 transition hover:bg-rose-50 disabled:opacity-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="whitespace-nowrap text-[10px] font-bold">
                                                완전 삭제
                                            </span>
                                        </button>
                                    </div>
                                )
                            )}
                        </div>
                    </div>,
                    document.body
                )}

            {settingsDrawerAnim.shouldRender &&
                settingsForm &&
                createPortal(
                    <div className="fixed inset-0 z-40 flex justify-end">
                        <div
                            className={`absolute inset-0 bg-slate-900/30 transition-opacity duration-300 ease-out ${settingsDrawerAnim.isVisible ? 'opacity-100' : 'opacity-0'}`}
                            onClick={() => setIsSettingsDrawerOpen(false)}
                            aria-hidden
                        />
                        <div
                            className={`relative flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-2xl transition-transform duration-300 ease-out ${settingsDrawerAnim.isVisible ? 'translate-x-0' : 'translate-x-full'}`}
                        >
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
                                                          collectorScheduledEnabled:
                                                              e.target.checked,
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
                                                prev
                                                    ? { ...prev, collectorCron: e.target.value }
                                                    : prev
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
                                                    prev
                                                        ? { ...prev, jobCode: e.target.value }
                                                        : prev
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
                                        보유 기술과 겹치는 키워드 수가 이 값 이상이어야 AI 매칭
                                        점수를 생성합니다.
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
                    </div>,
                    document.body
                )}
        </div>
    );
}
