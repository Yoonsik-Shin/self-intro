'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    GripVertical,
    History,
    Plus,
    Save,
    Search,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import {
    publicationApi,
    publicPageApi,
    taxonomySchemeApi,
    type IntroductionResponse,
    type PublicExperienceDraft,
    type PublicExperiencePreview,
    type PublicProfileDraft,
    type PublicProfileItemSelection,
    type PublicStudyDraft,
    type PublicStudyPreview,
    type TaxonomyScheme,
} from '@/lib/api';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';
import { SkillBadgeIcon } from '@/lib/SkillBadgeIcon';
import { WorkspacePublicationPanel } from './WorkspacePublicationPanel';

export type PublicCompositionSection = 'profile' | 'experience' | 'study';
type PublicDraft = PublicProfileDraft | PublicExperienceDraft | PublicStudyDraft;

const SECTION_ORDER: PublicCompositionSection[] = ['profile', 'experience', 'study'];

const SECTION_COPY: Record<
    PublicCompositionSection,
    { eyebrow: string; title: string; description: string }
> = {
    profile: {
        eyebrow: 'PUBLIC PROFILE DRAFT',
        title: '프로필 구성',
        description: '원본 프로필을 바꾸지 않고 공개할 필드·기술·역량만 선택합니다.',
    },
    experience: {
        eyebrow: 'PUBLIC EXPERIENCE DRAFT',
        title: '경험 구성',
        description:
            '경험과 세부 성과, 타임라인, 대표 배치와 포트폴리오 노출을 한곳에서 구성합니다.',
    },
    study: {
        eyebrow: 'PUBLIC STUDY DRAFT',
        title: '학습 구성',
        description: '공개할 학습 기록과 방문자 탐색에 사용할 카테고리를 선택합니다.',
    },
};

type PreviewTarget = { kind: 'live' } | { kind: 'revision'; revisionNumber: number };
type DragSide = 'left' | 'right' | null;

const MIN_LEFT_WIDTH = 320;
const MAX_LEFT_WIDTH = 720;
const MIN_RIGHT_WIDTH = 320;
const MAX_RIGHT_WIDTH = 560;

export function PublicPageCompositionManagement({
    workspaceSlug,
    role,
    section,
    onSectionChange,
}: {
    workspaceSlug: string;
    role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
    section: PublicCompositionSection;
    onSectionChange: (section: PublicCompositionSection) => void;
}) {
    const [previewTarget, setPreviewTarget] = useState<PreviewTarget>({ kind: 'live' });
    const [liveDraft, setLiveDraft] = useState<PublicDraft | null>(null);
    const [leftWidth, setLeftWidth] = useState(MIN_LEFT_WIDTH);
    const [rightWidth, setRightWidth] = useState(MIN_RIGHT_WIDTH);
    const [dragSide, setDragSide] = useState<DragSide>(null);
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
    const [isRightCollapsed, setIsRightCollapsed] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!dragSide) return;
        const previousUserSelect = document.body.style.userSelect;
        document.body.style.userSelect = 'none';
        const handleMove = (event: MouseEvent) => {
            event.preventDefault();
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            if (dragSide === 'left') {
                setLeftWidth(
                    Math.min(MAX_LEFT_WIDTH, Math.max(MIN_LEFT_WIDTH, event.clientX - rect.left))
                );
            } else {
                setRightWidth(
                    Math.min(MAX_RIGHT_WIDTH, Math.max(MIN_RIGHT_WIDTH, rect.right - event.clientX))
                );
            }
        };
        const handleUp = () => setDragSide(null);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => {
            document.body.style.userSelect = previousUserSelect;
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [dragSide]);

    const saveCurrentDraft = async () => {
        if (!liveDraft) return;
        if (section === 'profile') {
            await publicPageApi.updateProfile(workspaceSlug, liveDraft as PublicProfileDraft);
        } else if (section === 'experience') {
            await publicPageApi.updateExperience(workspaceSlug, liveDraft as PublicExperienceDraft);
        } else {
            await publicPageApi.updateStudy(workspaceSlug, liveDraft as PublicStudyDraft);
        }
        void queryClient.invalidateQueries({
            queryKey: ['workspace', workspaceSlug, 'public-page-draft', section],
        });
    };

    return (
        <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto xl:overflow-hidden">
            <div className="shrink-0">
                <AdminPageHeader
                    eyebrow="PUBLIC PAGE"
                    title="공개 페이지 구성·발행"
                    description="왼쪽에서 공개할 항목을 선택하면 가운데 미리보기에 바로 반영됩니다. 오른쪽에서 발행 이력을 확인하고 새 버전을 발행합니다."
                />
            </div>
            <div
                ref={containerRef}
                className="flex min-h-0 flex-1 flex-col items-stretch gap-6 xl:flex-row xl:gap-2"
            >
                {isLeftCollapsed ? (
                    <CollapsedRail
                        label="구성"
                        icon={<SlidersHorizontal size={16} />}
                        expandIcon={<ChevronRight size={14} />}
                        onExpand={() => setIsLeftCollapsed(false)}
                    />
                ) : (
                    <>
                        <div
                            style={{ width: leftWidth }}
                            className="flex min-w-0 shrink-0 flex-col gap-4 xl:h-full xl:min-h-0 xl:max-w-full xl:overflow-y-auto xl:overscroll-contain"
                        >
                            <div className="sticky top-0 z-10 flex shrink-0 items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                                <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                                    {SECTION_ORDER.map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => onSectionChange(value)}
                                            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-black transition ${
                                                section === value
                                                    ? 'bg-slate-950 text-white'
                                                    : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            {SECTION_COPY[value].title}
                                        </button>
                                    ))}
                                </div>
                                <div className="h-6 w-px shrink-0 bg-slate-200" />
                                <button
                                    type="button"
                                    onClick={() => setIsLeftCollapsed(true)}
                                    aria-label="구성 패널 접기"
                                    title="구성 패널 접기"
                                    className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                            </div>
                            <div className="min-h-0 flex-1">
                                <CompositionSectionEditor
                                    key={section}
                                    workspaceSlug={workspaceSlug}
                                    section={section}
                                    onDraftChange={setLiveDraft}
                                />
                            </div>
                        </div>
                        <ResizeHandle
                            active={dragSide === 'left'}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                setDragSide('left');
                            }}
                        />
                    </>
                )}

                <CompositionPreviewPane
                    workspaceSlug={workspaceSlug}
                    section={section}
                    target={previewTarget}
                    draft={liveDraft}
                    onReturnToLive={() => setPreviewTarget({ kind: 'live' })}
                />

                {isRightCollapsed ? (
                    <CollapsedRail
                        label="발행·이력"
                        icon={<History size={16} />}
                        expandIcon={<ChevronLeft size={14} />}
                        onExpand={() => setIsRightCollapsed(false)}
                    />
                ) : (
                    <>
                        <ResizeHandle
                            active={dragSide === 'right'}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                setDragSide('right');
                            }}
                        />
                        <div
                            style={{ width: rightWidth }}
                            className="flex min-w-0 shrink-0 flex-col gap-2 xl:h-full xl:min-h-0 xl:max-w-full xl:overflow-y-auto xl:overscroll-contain"
                        >
                            <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                                <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-black text-slate-700">
                                    <History size={15} /> 발행·이력
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsRightCollapsed(true)}
                                    aria-label="발행 이력 패널 접기"
                                    title="발행 이력 패널 접기"
                                    className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                            <div className="min-h-0 flex-1">
                                <WorkspacePublicationPanel
                                    workspaceSlug={workspaceSlug}
                                    role={role}
                                    beforePublish={saveCurrentDraft}
                                    onViewRevision={(revisionNumber) =>
                                        setPreviewTarget({ kind: 'revision', revisionNumber })
                                    }
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function ResizeHandle({
    active,
    onMouseDown,
}: {
    active: boolean;
    onMouseDown: (event: React.MouseEvent) => void;
}) {
    return (
        <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={onMouseDown}
            className={`group relative hidden w-8 shrink-0 cursor-col-resize items-center justify-center self-stretch xl:flex ${
                active ? 'select-none' : ''
            }`}
        >
            <div
                className={`h-full w-1 rounded-full transition-colors ${
                    active ? 'bg-indigo-500' : 'bg-slate-300 group-hover:bg-indigo-400'
                }`}
            />
            <GripVertical
                className={`absolute h-6 w-4 rounded border bg-white transition-colors ${
                    active
                        ? 'border-indigo-400 text-indigo-500'
                        : 'border-slate-300 text-slate-400 group-hover:border-indigo-400 group-hover:text-indigo-500'
                }`}
            />
        </div>
    );
}

function CollapsedRail({
    label,
    icon,
    expandIcon,
    onExpand,
}: {
    label: string;
    icon: ReactNode;
    expandIcon: ReactNode;
    onExpand: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onExpand}
            title={`${label} 펼치기`}
            className="group flex shrink-0 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-400 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 xl:w-10 xl:flex-col xl:gap-4 xl:self-stretch xl:py-4"
        >
            {icon}
            <span className="h-px w-4 bg-slate-200 transition-colors group-hover:bg-indigo-300 xl:h-4 xl:w-px" />
            {expandIcon}
        </button>
    );
}

function CompositionPreviewPane({
    workspaceSlug,
    section,
    target,
    draft,
    onReturnToLive,
}: {
    workspaceSlug: string;
    section: PublicCompositionSection;
    target: PreviewTarget;
    draft: PublicDraft | null;
    onReturnToLive: () => void;
}) {
    const isLive = target.kind === 'live';
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [iframeReady, setIframeReady] = useState(false);

    const [debouncedDraft, setDebouncedDraft] = useState(draft);
    useEffect(() => {
        if (!isLive) return;
        const timer = setTimeout(() => setDebouncedDraft(draft), 500);
        return () => clearTimeout(timer);
    }, [draft, isLive]);

    const previewQuery = useQuery<
        IntroductionResponse | PublicExperiencePreview | PublicStudyPreview
    >({
        queryKey: isLive
            ? ['workspace', workspaceSlug, 'composition-live-preview', section, debouncedDraft]
            : [
                  'workspace',
                  workspaceSlug,
                  'composition-revision-preview',
                  section,
                  target.kind === 'revision' ? target.revisionNumber : null,
              ],
        queryFn: () => {
            if (target.kind === 'revision') {
                if (section === 'study') {
                    return publicationApi.previewRevisionStudy(
                        workspaceSlug,
                        target.revisionNumber
                    );
                }
                return publicationApi.previewRevision(workspaceSlug, target.revisionNumber);
            }
            if (section === 'profile') {
                return publicPageApi.previewIntroductionLive(workspaceSlug, {
                    profile: debouncedDraft as PublicProfileDraft,
                });
            }
            if (section === 'experience') {
                return publicPageApi.previewExperienceLive(workspaceSlug, {
                    experience: debouncedDraft as PublicExperienceDraft,
                });
            }
            return publicPageApi.previewStudyLive(workspaceSlug, {
                study: debouncedDraft as PublicStudyDraft,
            });
        },
        enabled: target.kind === 'revision' || debouncedDraft !== null,
    });

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            const data = event.data as { type?: string; height?: number } | null;
            if (data?.type === 'live-preview-ready') {
                setIframeReady(true);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const bannerMessage = isLive
        ? '실시간 미리보기 · 방문자에게 공개되지 않습니다.'
        : `v${target.kind === 'revision' ? target.revisionNumber : ''} 미리보기 · 방문자에게 공개되지 않습니다.`;

    useEffect(() => {
        if (!iframeReady || !previewQuery.data) return;
        iframeRef.current?.contentWindow?.postMessage(
            {
                type: 'live-preview-data',
                section,
                workspaceSlug,
                message: bannerMessage,
                data: previewQuery.data,
            },
            window.location.origin
        );
    }, [iframeReady, previewQuery.data, section, workspaceSlug, bannerMessage]);

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-3 xl:h-full xl:min-h-0 xl:overflow-hidden">
            {!isLive && (
                <div className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-black text-indigo-900">
                        <Eye size={16} /> v{target.kind === 'revision' ? target.revisionNumber : ''}{' '}
                        미리보기 · {SECTION_COPY[section].title}
                    </span>
                    <button
                        type="button"
                        onClick={onReturnToLive}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-100"
                    >
                        <X size={14} /> 실시간 미리보기로 돌아가기
                    </button>
                </div>
            )}
            <div className="min-h-0 flex-1 overflow-hidden overscroll-contain">
                <iframe
                    ref={iframeRef}
                    src={`/workspace/${encodeURIComponent(workspaceSlug)}/preview/live`}
                    title="실시간 미리보기"
                    className="h-full min-h-[400px] w-full border-0"
                />
            </div>
        </div>
    );
}

function CompositionSectionEditor({
    workspaceSlug,
    section,
    onDraftChange,
}: {
    workspaceSlug: string;
    section: PublicCompositionSection;
    onDraftChange?: (draft: PublicDraft | null) => void;
}) {
    const queryClient = useQueryClient();
    const queryKey = ['workspace', workspaceSlug, 'public-page-draft', section];
    const query = useQuery<PublicDraft>({
        queryKey,
        queryFn: async (): Promise<PublicDraft> => {
            if (section === 'profile') return publicPageApi.profile(workspaceSlug);
            if (section === 'experience') return publicPageApi.experience(workspaceSlug);
            return publicPageApi.study(workspaceSlug);
        },
    });
    const [localDraft, setLocalDraft] = useState<PublicDraft | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const draft = localDraft ?? query.data ?? null;

    useEffect(() => {
        onDraftChange?.(draft);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft]);

    const mutation = useMutation({
        mutationFn: async () => {
            if (!draft) throw new Error('저장할 공개 구성이 없습니다.');
            if (section === 'profile') {
                return publicPageApi.updateProfile(workspaceSlug, draft as PublicProfileDraft);
            }
            if (section === 'experience') {
                return publicPageApi.updateExperience(
                    workspaceSlug,
                    draft as PublicExperienceDraft
                );
            }
            return publicPageApi.updateStudy(workspaceSlug, draft as PublicStudyDraft);
        },
        onSuccess: (saved) => {
            queryClient.setQueryData(queryKey, saved);
            setLocalDraft(saved);
        },
    });

    const copy = SECTION_COPY[section];
    if (query.isError) {
        return (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
                공개 구성을 불러오지 못했습니다.
            </div>
        );
    }
    if (query.isLoading || !draft) {
        return (
            <div className="rounded-3xl border border-slate-200 bg-white p-8">
                구성 불러오는 중…
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-xs leading-5 text-slate-500">{copy.description}</p>
                <button
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate()}
                    title="지금 선택 상태를 서버에 저장합니다. 새로고침해도 유지되고, '발행'을 눌러도 자동으로 먼저 저장됩니다."
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-black text-white disabled:opacity-50"
                >
                    <Save className="h-3.5 w-3.5" /> {mutation.isPending ? '저장 중…' : '초안 저장'}
                </button>
            </div>

            <p className="rounded-xl bg-indigo-50 px-3.5 py-2.5 text-xs leading-5 text-indigo-900">
                오른쪽 미리보기에는 저장 전이라도 바로 반영됩니다. 다만 새로고침하면 저장 안 한
                내용은 사라지니, 계속 작업할 땐 ‘초안 저장’으로 남겨두세요. ‘발행’을 누르면 지금
                선택 상태가 자동으로 저장된 뒤 방문자 화면에 반영됩니다.
            </p>

            <CompositionSearch section={section} value={searchQuery} onChange={setSearchQuery} />

            {section === 'profile' && (
                <ProfileEditor
                    draft={draft as PublicProfileDraft}
                    searchQuery={searchQuery}
                    onChange={(next) => setLocalDraft(next)}
                />
            )}
            {section === 'experience' && (
                <ExperienceEditor
                    draft={draft as PublicExperienceDraft}
                    searchQuery={searchQuery}
                    onChange={(next) => setLocalDraft(next)}
                />
            )}
            {section === 'study' && (
                <StudyEditor
                    workspaceSlug={workspaceSlug}
                    draft={draft as PublicStudyDraft}
                    searchQuery={searchQuery}
                    onChange={(next) => setLocalDraft(next)}
                />
            )}

            {mutation.isSuccess && (
                <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <Check size={14} /> 공개 구성 초안을 저장했습니다.
                </p>
            )}
            {mutation.isError && (
                <p className="text-xs font-bold text-red-700">초안을 저장하지 못했습니다.</p>
            )}
        </div>
    );
}

function CompositionSearch({
    section,
    value,
    onChange,
}: {
    section: PublicCompositionSection;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="relative block">
            <span className="sr-only">{SECTION_COPY[section].title} 항목 검색</span>
            <Search
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={`${SECTION_COPY[section].title} 항목 검색`}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-xs font-semibold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    aria-label="검색어 지우기"
                    className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                    <X size={14} aria-hidden="true" />
                </button>
            )}
        </label>
    );
}

function matchesSearch(searchQuery: string, ...values: Array<string | null | undefined>) {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('ko-KR');
    if (!normalizedQuery) return true;
    return values.some((value) => value?.toLocaleLowerCase('ko-KR').includes(normalizedQuery));
}

function EmptySearchResult() {
    return <p className="py-5 text-sm font-medium text-slate-400">일치하는 항목이 없습니다.</p>;
}

function SectionCard({
    title,
    children,
    defaultOpen = true,
    forceOpen = false,
    badge,
}: {
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
    forceOpen?: boolean;
    badge?: ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const isOpen = open || forceOpen;
    return (
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
            >
                <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-black text-slate-900">{title}</span>
                    {badge}
                </span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            {isOpen && (
                <div className="min-w-0 divide-y divide-slate-100 border-t border-slate-100 px-4 pb-3">
                    {children}
                </div>
            )}
        </section>
    );
}

function SelectionList({
    items,
    onToggle,
    addLabel,
    emptyLabel,
    showIcon = false,
}: {
    items: PublicProfileItemSelection[];
    onToggle: (id: number, enabled: boolean) => void;
    addLabel: string;
    emptyLabel: string;
    showIcon?: boolean;
}) {
    const [isAdding, setIsAdding] = useState(false);
    const [addQuery, setAddQuery] = useState('');
    const selected = items.filter((item) => item.enabled);
    const available = items.filter((item) => !item.enabled && matchesSearch(addQuery, item.label));

    return (
        <div className="space-y-1 py-1">
            {selected.length === 0 && (
                <p className="py-2 text-xs font-medium text-slate-400">{emptyLabel}</p>
            )}
            {selected.map((item) => (
                <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1.5 hover:bg-slate-50"
                >
                    <span className="flex min-w-0 items-center gap-2">
                        {showIcon && <SkillBadgeIcon name={item.label} className="h-5 w-5" />}
                        <span className="truncate text-xs font-bold text-slate-800">
                            {item.label}
                        </span>
                    </span>
                    <button
                        type="button"
                        aria-label={`${item.label} 제외`}
                        onClick={() => onToggle(item.id, false)}
                        className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                    >
                        <X size={13} />
                    </button>
                </div>
            ))}
            <button
                type="button"
                onClick={() => setIsAdding((value) => !value)}
                className={`flex w-full items-center gap-1.5 rounded-lg border border-dashed px-2 py-1.5 text-xs font-bold transition ${
                    isAdding
                        ? 'border-indigo-300 text-indigo-600'
                        : 'border-slate-300 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                }`}
            >
                <Plus size={13} /> {addLabel}
            </button>
            {isAdding && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <input
                        type="search"
                        value={addQuery}
                        onChange={(event) => setAddQuery(event.target.value)}
                        placeholder="검색해서 추가"
                        autoFocus
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                    <div className="mt-2 max-h-48 space-y-0.5 overflow-auto">
                        {available.length === 0 && (
                            <p className="py-1 text-xs text-slate-400">추가할 항목이 없습니다.</p>
                        )}
                        {available.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onToggle(item.id, true)}
                                className="flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-1.5 text-left hover:bg-white"
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    {showIcon && (
                                        <SkillBadgeIcon name={item.label} className="h-5 w-5" />
                                    )}
                                    <span className="truncate text-xs font-bold text-slate-600">
                                        {item.label}
                                    </span>
                                </span>
                                <Plus size={13} className="shrink-0 text-slate-400" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function ToggleRow({
    label,
    checked,
    onChange,
    detail,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    detail?: string;
}) {
    return (
        <label className="flex min-w-0 cursor-pointer items-center justify-between gap-3 py-2">
            <span className="block min-w-0">
                <span className="block truncate text-xs font-bold text-slate-800">{label}</span>
                {detail && (
                    <span className="mt-0.5 block text-[11px] text-slate-500">{detail}</span>
                )}
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-slate-500">
                {checked ? <Eye size={14} /> : <EyeOff size={14} />}
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => onChange(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-slate-950"
                />
            </span>
        </label>
    );
}

function ProfileEditor({
    draft,
    searchQuery,
    onChange,
}: {
    draft: PublicProfileDraft;
    searchQuery: string;
    onChange: (draft: PublicProfileDraft) => void;
}) {
    const fields: Array<[keyof PublicProfileDraft, string]> = [
        ['showName', '이름'],
        ['showNameEn', '영문 이름'],
        ['showJobTitle', '직무 제목'],
        ['showBio', '소개'],
        ['showCoreStackSummary', '핵심 기술 요약'],
        ['showStatusBadge', '현재 상태 배지'],
        ['showGithub', 'GitHub'],
        ['showEmail', '이메일'],
        ['showPhone', '전화번호'],
    ];
    const visibleFields = fields.filter(([, label]) => matchesSearch(searchQuery, label));
    const searchActive = searchQuery.trim().length > 0;
    const enabledFieldCount = fields.filter(([key]) => draft[key] as boolean).length;
    const countBadge = (count: number, label: string) => (
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
            {count}
            {label}
        </span>
    );

    return (
        <div className="grid gap-4">
            <SectionCard
                title="프로필 필드"
                defaultOpen={false}
                forceOpen={searchActive}
                badge={countBadge(enabledFieldCount, `/${fields.length} 표시`)}
            >
                {visibleFields.length === 0 && <EmptySearchResult />}
                {visibleFields.map(([key, label]) => (
                    <ToggleRow
                        key={key}
                        label={label}
                        checked={draft[key] as boolean}
                        onChange={(checked) => onChange({ ...draft, [key]: checked })}
                    />
                ))}
            </SectionCard>
            <div className="space-y-4">
                <SectionCard
                    title="공개 기술"
                    defaultOpen={false}
                    forceOpen={searchActive}
                    badge={countBadge(
                        draft.skills.filter((item) => item.enabled).length,
                        '개 선택'
                    )}
                >
                    <SelectionList
                        items={draft.skills}
                        addLabel="기술 추가"
                        emptyLabel="공개할 기술을 추가해 주세요."
                        showIcon
                        onToggle={(id, enabled) =>
                            onChange({
                                ...draft,
                                skills: draft.skills.map((value) =>
                                    value.id === id ? { ...value, enabled } : value
                                ),
                            })
                        }
                    />
                </SectionCard>
                <SectionCard
                    title="대표 역량"
                    defaultOpen={false}
                    forceOpen={searchActive}
                    badge={countBadge(
                        draft.competencies.filter((item) => item.enabled).length,
                        '개 선택'
                    )}
                >
                    <SelectionList
                        items={draft.competencies}
                        addLabel="역량 추가"
                        emptyLabel="공개할 역량을 추가해 주세요."
                        onToggle={(id, enabled) =>
                            onChange({
                                ...draft,
                                competencies: draft.competencies.map((value) =>
                                    value.id === id ? { ...value, enabled } : value
                                ),
                            })
                        }
                    />
                </SectionCard>
            </div>
        </div>
    );
}

function ExperienceEditor({
    draft,
    searchQuery,
    onChange,
}: {
    draft: PublicExperienceDraft;
    searchQuery: string;
    onChange: (draft: PublicExperienceDraft) => void;
}) {
    const visibleExperiences = draft.experiences.filter((item) =>
        matchesSearch(searchQuery, item.title)
    );
    const visibleDetails = draft.details.filter((item) => matchesSearch(searchQuery, item.label));
    const visiblePortfolios = draft.portfolios.filter((item) =>
        matchesSearch(searchQuery, item.title)
    );
    const visiblePlacements = draft.placements.filter((item) => {
        const experience = draft.experiences.find(
            (candidate) => candidate.id === item.experienceId
        );
        return matchesSearch(searchQuery, experience?.title, `경험 ${item.experienceId}`);
    });
    const updateExperienceVisibility = (experienceId: number, enabled: boolean) => {
        onChange({
            ...draft,
            experiences: draft.experiences.map((value) =>
                value.id === experienceId
                    ? {
                          ...value,
                          enabled,
                          showOnTimeline: enabled ? value.showOnTimeline : false,
                      }
                    : value
            ),
            placements: enabled
                ? draft.placements
                : draft.placements.map((value) =>
                      value.experienceId === experienceId ? { ...value, enabled: false } : value
                  ),
        });
    };

    return (
        <div className="space-y-4">
            <SectionCard title="공개 경험·타임라인">
                <p className="pb-4 text-sm font-medium leading-6 text-slate-500">
                    타임라인이나 대표 프로젝트 노출을 켜면 해당 경험도 함께 공개됩니다. 경험 공개를
                    끄면 연결된 하위 노출도 함께 해제됩니다.
                </p>
                {visibleExperiences.length === 0 && <EmptySearchResult />}
                {visibleExperiences.map((item) => (
                    <div key={item.id} className="py-4">
                        <ToggleRow
                            label={item.title}
                            checked={item.enabled}
                            detail={
                                !item.enabled
                                    ? '공개 제외'
                                    : item.showOnTimeline
                                      ? '공개 · 타임라인 노출'
                                      : '공개 · 타임라인 숨김'
                            }
                            onChange={(enabled) => updateExperienceVisibility(item.id, enabled)}
                        />
                        <label className="ml-4 flex items-center gap-2 text-xs font-bold text-slate-600">
                            <input
                                type="checkbox"
                                checked={item.showOnTimeline}
                                onChange={(event) => {
                                    const showOnTimeline = event.target.checked;
                                    onChange({
                                        ...draft,
                                        experiences: draft.experiences.map((value) =>
                                            value.id === item.id
                                                ? {
                                                      ...value,
                                                      enabled: showOnTimeline || value.enabled,
                                                      showOnTimeline,
                                                  }
                                                : value
                                        ),
                                    });
                                }}
                            />
                            공개 타임라인에 표시
                        </label>
                    </div>
                ))}
            </SectionCard>
            <div className="grid gap-4">
                <SectionCard title="세부 성과">
                    {visibleDetails.length === 0 && <EmptySearchResult />}
                    {visibleDetails.map((item) => (
                        <ToggleRow
                            key={item.id}
                            label={item.label}
                            checked={item.enabled}
                            onChange={(enabled) =>
                                onChange({
                                    ...draft,
                                    details: draft.details.map((value) =>
                                        value.id === item.id ? { ...value, enabled } : value
                                    ),
                                })
                            }
                        />
                    ))}
                </SectionCard>
                <SectionCard title="포트폴리오 사례">
                    {visiblePortfolios.length === 0 && (
                        <p className="py-4 text-sm text-slate-500">
                            {draft.portfolios.length === 0
                                ? '작성된 포트폴리오 사례가 없습니다.'
                                : '일치하는 항목이 없습니다.'}
                        </p>
                    )}
                    {visiblePortfolios.map((item) => (
                        <ToggleRow
                            key={item.id}
                            label={item.title}
                            checked={item.enabled}
                            onChange={(enabled) =>
                                onChange({
                                    ...draft,
                                    portfolios: draft.portfolios.map((value) =>
                                        value.id === item.id ? { ...value, enabled } : value
                                    ),
                                })
                            }
                        />
                    ))}
                </SectionCard>
            </div>
            <SectionCard title="대표 프로젝트">
                {visiblePlacements.length === 0 && <EmptySearchResult />}
                {visiblePlacements.map((item) => {
                    const experience = draft.experiences.find(
                        (candidate) => candidate.id === item.experienceId
                    );
                    return (
                        <ToggleRow
                            key={`${item.experienceId}-${item.placementType}`}
                            label={experience?.title ?? `경험 #${item.experienceId}`}
                            checked={item.enabled}
                            detail="공개 페이지 대표 프로젝트 영역"
                            onChange={(enabled) =>
                                onChange({
                                    ...draft,
                                    experiences: enabled
                                        ? draft.experiences.map((value) =>
                                              value.id === item.experienceId
                                                  ? { ...value, enabled: true }
                                                  : value
                                          )
                                        : draft.experiences,
                                    placements: draft.placements.map((value) =>
                                        value.experienceId === item.experienceId &&
                                        value.placementType === item.placementType
                                            ? { ...value, enabled }
                                            : value
                                    ),
                                })
                            }
                        />
                    );
                })}
            </SectionCard>
        </div>
    );
}

function StudyEditor({
    workspaceSlug,
    draft,
    searchQuery,
    onChange,
}: {
    workspaceSlug: string;
    draft: PublicStudyDraft;
    searchQuery: string;
    onChange: (draft: PublicStudyDraft) => void;
}) {
    const queryClient = useQueryClient();
    const catalog = useQuery({
        queryKey: ['workspace', workspaceSlug, 'taxonomy-schemes', 'catalog'],
        queryFn: () => taxonomySchemeApi.catalog(workspaceSlug),
    });
    const subscriptions = useQuery({
        queryKey: ['workspace', workspaceSlug, 'taxonomy-schemes', 'subscriptions'],
        queryFn: () => taxonomySchemeApi.subscriptions(workspaceSlug),
    });
    const [selectedSchemeIds, setSelectedSchemeIds] = useState<number[] | null>(null);
    const [primarySchemeId, setPrimarySchemeId] = useState<number | null>(null);
    const effectiveSchemeIds =
        selectedSchemeIds ?? subscriptions.data?.map((scheme) => scheme.id) ?? [];
    const effectivePrimarySchemeId =
        primarySchemeId ??
        subscriptions.data?.find((scheme) => scheme.primaryScheme)?.id ??
        effectiveSchemeIds[0] ??
        null;
    const visibleSchemes = (catalog.data ?? []).filter((scheme) =>
        matchesSearch(searchQuery, scheme.name, scheme.description, `v${scheme.version}`)
    );
    const visibleStudies = draft.studies.filter((item) => matchesSearch(searchQuery, item.title));
    const visibleTaxonomy = draft.taxonomy.filter((item) =>
        matchesSearch(searchQuery, item.displayLabel, item.label, `분류 체계 ${item.schemeId}`)
    );
    const schemeMutation = useMutation({
        mutationFn: () => {
            if (effectiveSchemeIds.length === 0 || effectivePrimarySchemeId === null) {
                throw new Error('분류 체계를 하나 이상 선택해 주세요.');
            }
            return taxonomySchemeApi.replace(
                workspaceSlug,
                effectiveSchemeIds,
                effectivePrimarySchemeId
            );
        },
        onSuccess: async () => {
            setSelectedSchemeIds(null);
            setPrimarySchemeId(null);
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ['workspace', workspaceSlug, 'taxonomy-schemes'],
                }),
                queryClient.invalidateQueries({
                    queryKey: ['workspace', workspaceSlug, 'public-page-draft', 'study'],
                }),
            ]);
        },
    });

    const toggleScheme = (scheme: TaxonomyScheme) => {
        const next = effectiveSchemeIds.includes(scheme.id)
            ? effectiveSchemeIds.filter((id) => id !== scheme.id)
            : [...effectiveSchemeIds, scheme.id];
        if (next.length === 0) return;
        setSelectedSchemeIds(next);
        if (!next.includes(effectivePrimarySchemeId ?? -1)) setPrimarySchemeId(next[0]);
    };

    return (
        <div className="space-y-4">
            <SectionCard title="학습 분류 체계">
                <p className="py-3 text-sm text-slate-500">
                    직군에 맞는 분류 체계를 선택합니다. 여러 체계를 함께 쓸 수 있으며 대표 체계는
                    공개 학습 탐색의 기본 분류가 됩니다.
                </p>
                {visibleSchemes.length === 0 && <EmptySearchResult />}
                {visibleSchemes.map((scheme) => {
                    const selected = effectiveSchemeIds.includes(scheme.id);
                    return (
                        <div
                            key={scheme.id}
                            className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                        >
                            <label className="flex min-w-0 cursor-pointer items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleScheme(scheme)}
                                    className="mt-1 h-5 w-5 rounded border-slate-300 accent-slate-950"
                                />
                                <span>
                                    <span className="block text-sm font-black text-slate-800">
                                        {scheme.name}{' '}
                                        <span className="text-slate-400">v{scheme.version}</span>
                                    </span>
                                    <span className="mt-1 block text-xs text-slate-500">
                                        {scheme.description}
                                    </span>
                                </span>
                            </label>
                            {selected && (
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <input
                                        type="radio"
                                        name="primary-taxonomy-scheme"
                                        checked={effectivePrimarySchemeId === scheme.id}
                                        onChange={() => setPrimarySchemeId(scheme.id)}
                                    />
                                    대표 체계
                                </label>
                            )}
                        </div>
                    );
                })}
                <div className="flex items-center justify-end gap-3 py-3">
                    {schemeMutation.isError && (
                        <span className="text-xs font-bold text-red-700">
                            분류 체계를 저장하지 못했습니다.
                        </span>
                    )}
                    <button
                        type="button"
                        disabled={selectedSchemeIds === null || schemeMutation.isPending}
                        onClick={() => schemeMutation.mutate()}
                        className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-40"
                    >
                        분류 체계 적용
                    </button>
                </div>
            </SectionCard>
            <div className="grid gap-4">
                <SectionCard title="공개 학습 기록">
                    {visibleStudies.length === 0 && <EmptySearchResult />}
                    {visibleStudies.map((item) => (
                        <ToggleRow
                            key={item.id}
                            label={item.title}
                            checked={item.enabled}
                            onChange={(enabled) =>
                                onChange({
                                    ...draft,
                                    studies: draft.studies.map((value) =>
                                        value.id === item.id ? { ...value, enabled } : value
                                    ),
                                })
                            }
                        />
                    ))}
                </SectionCard>
                <SectionCard title="공개 탐색 카테고리">
                    {visibleTaxonomy.length === 0 && <EmptySearchResult />}
                    {visibleTaxonomy.map((item) => (
                        <ToggleRow
                            key={item.id}
                            label={item.displayLabel || item.label}
                            checked={item.enabled}
                            detail={`분류 체계 #${item.schemeId}`}
                            onChange={(enabled) =>
                                onChange({
                                    ...draft,
                                    taxonomy: draft.taxonomy.map((value) =>
                                        value.id === item.id ? { ...value, enabled } : value
                                    ),
                                })
                            }
                        />
                    ))}
                </SectionCard>
            </div>
        </div>
    );
}
