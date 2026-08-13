'use client';

import {
    Fragment,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type DragEvent,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import ReactMarkdown from 'react-markdown';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowDown,
    ArrowUp,
    Briefcase,
    Cpu,
    FolderGit2,
    GraduationCap,
    GripVertical,
    MessageSquareText,
    MoveVertical,
    Pin,
    PinOff,
    Sparkles,
    Settings,
    Plus,
    RotateCcw,
    Trash2,
    X,
} from 'lucide-react';
import { jobPostingApi, printTemplateApi, skillApi } from '@/lib/api';
import type {
    IntroductionResponse,
    JobPostingCoverLetterItem,
    PrintTemplate,
    PrintTemplateContentOverrides,
    Skill,
} from '@/lib/api/types';
import { AiRevisionChat } from '@/components/shared/AiRevisionChat';
import {
    buildCareerCards,
    buildMilestones,
    buildOrderedCredentials,
    groupCoreSkills,
    groupSkillsByUsage,
    type SkillOutputGroup,
} from '@/lib/introDerivations';
import { credentialKindLabel, formatCredentialPeriod, graduationStatusLabel } from '@/lib/format';
import { resumeMarkdownComponents } from '@/lib/markdown';
import {
    A4_HEIGHT_MM,
    MM_TO_PX,
    partitionAtomsIntoPages,
    type PrintAtomItem,
} from '@/lib/pdfLayoutEngine';
import {
    printableSections,
    LOCKED_PRINT_SECTION_ID,
    reorderablePrintSections,
} from '@/lib/printSections';
import { generateUniqueLocalName, getLocalSaves, saveLocal } from '@/lib/printTemplateLocal';
import {
    getOutputPageAt,
    ensureOutputLayoutPageCount,
    parseStoredPrintLayout,
    type OutputRegion,
} from '@/lib/printLayoutModel';
import {
    applyPrintTemplateContent,
    getPrintContentFingerprint,
    sanitizePrintTemplate,
} from '@/lib/printTemplateContent';
import { usePrintStore } from '@/store/usePrintStore';
import { PdfPageLayer } from './PdfPageLayer';
import { PrintPreviewBar } from './PrintPreviewBar';
import { PrintPreviewNav } from './PrintPreviewNav';
import { PrintEyeButton } from './PrintEyeButton';
import { PrintModeModal } from './PrintModeModal';
import { SaveServerTemplateModal } from './SaveServerTemplateModal';
import { PrintSkillSelectorModal } from './PrintSkillSelectorModal';

const PRINT_HISTORY_LIMIT = 100;
type DocumentSettingsTab = 'paper' | 'typography' | 'composition' | 'view' | 'template';
type CustomPrintSection = NonNullable<PrintTemplateContentOverrides['customSections']>[number];

type PrintEditorSnapshot = {
    excludedIds: string[];
    sectionOrder: string[];
    sectionGaps: Record<string, number>;
    lineHeight: number;
    forcedPageOverrides: Record<string, number>;
    outputLayout: ReturnType<typeof usePrintStore.getState>['outputLayout'];
    itemOrderOverrides: Record<string, string[]>;
    contentOverrides: PrintTemplateContentOverrides;
    coverLetterOverrides: Record<number, { question?: string; answer?: string }>;
    coverLetterSectionTitle: string;
    addedCoverLetterItems: JobPostingCoverLetterItem[];
};

function clonePrintEditorSnapshot(snapshot: PrintEditorSnapshot): PrintEditorSnapshot {
    return JSON.parse(JSON.stringify(snapshot)) as PrintEditorSnapshot;
}

function getFirstChangedPath(previous: unknown, next: unknown, prefix = ''): string | null {
    if (Object.is(previous, next)) return null;
    if (
        previous === null ||
        next === null ||
        typeof previous !== 'object' ||
        typeof next !== 'object'
    ) {
        return prefix || 'value';
    }
    const previousRecord = previous as Record<string, unknown>;
    const nextRecord = next as Record<string, unknown>;
    const keys = new Set([...Object.keys(previousRecord), ...Object.keys(nextRecord)]);
    for (const key of keys) {
        const changedPath = getFirstChangedPath(
            previousRecord[key],
            nextRecord[key],
            prefix ? `${prefix}.${key}` : key
        );
        if (changedPath) return changedPath;
    }
    return null;
}

function getHistoryMergeKey(
    previous: PrintEditorSnapshot,
    next: PrintEditorSnapshot
): string | null {
    const changedKeys = (Object.keys(next) as Array<keyof PrintEditorSnapshot>).filter(
        (key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key])
    );
    if (changedKeys.length !== 1) return null;
    const [changedKey] = changedKeys;
    if (changedKey === 'outputLayout') {
        const previousWithoutMargins = {
            ...previous.outputLayout,
            pageMargins: next.outputLayout.pageMargins,
        };
        if (JSON.stringify(previousWithoutMargins) === JSON.stringify(next.outputLayout)) {
            return 'pageMargins';
        }
    }
    if (changedKey === 'lineHeight' || changedKey === 'coverLetterSectionTitle') {
        return changedKey;
    }
    if (
        changedKey === 'outputLayout' ||
        changedKey === 'contentOverrides' ||
        changedKey === 'coverLetterOverrides'
    ) {
        const path = getFirstChangedPath(previous[changedKey], next[changedKey]);
        return path ? `${changedKey}:${path}` : null;
    }
    return null;
}

function InlineEditableText({
    value,
    onChange,
    placeholder,
    multiline,
    className = '',
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    multiline: boolean;
    className?: string;
}) {
    const editorRef = useRef<HTMLSpanElement | null>(null);

    useLayoutEffect(() => {
        const editor = editorRef.current;
        if (!editor || document.activeElement === editor) return;
        if (editor.innerText !== value) editor.innerText = value;
    }, [value]);

    return (
        <span
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline={multiline}
            aria-label={placeholder || '문구 편집'}
            data-placeholder={placeholder}
            onInput={(e) => onChange(e.currentTarget.innerText.replace(/\r/g, ''))}
            onKeyDown={(e) => {
                if (!multiline && e.key === 'Enter') e.preventDefault();
            }}
            className={`inline-editable-text ${className}`}
        />
    );
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
    FULL_TIME: '정규직',
    PART_TIME: '파트타임',
    CONTRACT: '계약직',
    INTERN: '인턴',
    FREELANCE: '프리랜서',
};

function getEmploymentTypeLabel(employmentType: string) {
    return EMPLOYMENT_TYPE_LABELS[employmentType] ?? employmentType;
}

type Props = {
    workspaceSlug: string;
    introData: IntroductionResponse;
    onExit: () => void;
    adminMode?: boolean;
    initialTemplate?: PrintTemplate | null;
    coverLetterItems?: JobPostingCoverLetterItem[];
    jobPostingId?: number | null;
};

function renderDetailFields(
    detail: {
        id?: number;
        narrative?: string;
        situation?: string;
        actionDetail?: string;
        outcome?: string;
    },
    inlineEditMode: boolean,
    origNarrative: string,
    onNarrativeChange: (val: string | undefined) => void,
    renderInlineTextHelper: (opts: {
        value: string;
        baseValue: string;
        multiline?: boolean;
        textClassName?: string;
        placeholder?: string;
        onChange: (newValue: string | undefined) => void;
    }) => React.ReactNode
) {
    const merged =
        detail.narrative ||
        [detail.situation, detail.actionDetail, detail.outcome].filter(Boolean).join('\n\n');
    // 편집 모드라는 이유만으로 비어 있던 상세 입력란을 추가하면 atom 높이가 달라져
    // 일반 미리보기와 페이지 구성이 달라진다. 기존 문구가 있는 필드만 인라인 편집한다.
    if (!merged) return null;

    if (inlineEditMode) {
        return (
            <div className="resume-detail-text relative mt-1 text-[12px] pdf-body-text text-slate-600">
                {/* 마크다운을 원래 렌더링한 결과가 레이아웃 높이를 계속 담당한다.
                    원문 textarea는 위에 겹쳐져 편집 모드 전환만으로 높이가 바뀌지 않는다. */}
                <div aria-hidden="true" className="invisible">
                    <ReactMarkdown components={resumeMarkdownComponents}>{merged}</ReactMarkdown>
                </div>
                <div className="absolute inset-0">
                    {renderInlineTextHelper({
                        value: detail.narrative ?? merged ?? '',
                        baseValue: origNarrative,
                        multiline: true,
                        textClassName: 'h-full text-[12px] pdf-body-text text-slate-600',
                        placeholder: '상세 성과 및 기술적 설명을 입력하세요',
                        onChange: onNarrativeChange,
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="resume-detail-text mt-1 text-[12px] pdf-body-text text-slate-600">
            <ReactMarkdown components={resumeMarkdownComponents}>{merged}</ReactMarkdown>
        </div>
    );
}

/** 저장된 순서(override)를 기준으로 자연 순서 배열을 재정렬한다. override에 없는 새 항목은 뒤에 붙는다. */
function applyOrder<T>(
    items: T[],
    scopeId: string,
    idOf: (item: T) => string,
    overrides: Record<string, string[]>
): T[] {
    const order = overrides[scopeId];
    if (!order || order.length === 0) return items;
    const byId = new Map(items.map((item) => [idOf(item), item]));
    const ordered: T[] = [];
    order.forEach((id) => {
        const item = byId.get(id);
        if (item) {
            ordered.push(item);
            byId.delete(id);
        }
    });
    byId.forEach((item) => ordered.push(item));
    return ordered;
}

export function PrintCanvas({
    workspaceSlug,
    introData,
    onExit,
    adminMode = false,
    initialTemplate = null,
    coverLetterItems = [],
    jobPostingId = null,
}: Props) {
    const store = usePrintStore();
    const queryClient = useQueryClient();
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const printLayoutFrozenRef = useRef(false);
    const [inlineEditMode, setInlineEditMode] = useState(false);
    const [modeModalOpen, setModeModalOpen] = useState(
        () => !store.printModeResolved && !initialTemplate
    );
    const [activeTemplate, setActiveTemplate] = useState<PrintTemplate | null>(initialTemplate);
    const [activeTemplateName, setActiveTemplateName] = useState<string>(() => {
        if (initialTemplate) return initialTemplate.name;
        return '기본 이력서';
    });
    const [aiChatOpen, setAiChatOpen] = useState(false);
    const [isRevising, setIsRevising] = useState(false);
    const [draggedCanvasAtomId, setDraggedCanvasAtomId] = useState<string | null>(null);
    const [dragOverRegion, setDragOverRegion] = useState<{
        pageIndex: number;
        regionId: string;
    } | null>(null);
    const [dragOverAtom, setDragOverAtom] = useState<{
        pageIndex: number;
        atomId: string;
        side: 'left' | 'right';
    } | null>(null);
    const [marginSettingsOpen, setMarginSettingsOpen] = useState(false);
    const [documentSettingsTab, setDocumentSettingsTab] = useState<DocumentSettingsTab>('paper');
    const [documentSettingsWidth, setDocumentSettingsWidth] = useState(288);
    const documentSettingsResizeRef = useRef<{
        pointerId: number;
        startX: number;
        width: number;
    } | null>(null);
    const [overflowRegionKeys, setOverflowRegionKeys] = useState<string[]>([]);
    const reviseAbortControllerRef = useRef<AbortController | null>(null);

    // jobPostingId prop은 /print?jobPostingId=로 직접 열었을 때만 채워진다 — 공고 상세
    // "템플릿 편집 & 미리보기"나 관리자 템플릿 목록은 templateId만 넘기므로, 이미 로드된
    // activeTemplate 자신의 jobPostingId를 폴백으로 써야 대화형 재생성 버튼이 뜬다.
    const effectiveJobPostingId = jobPostingId ?? activeTemplate?.jobPostingId ?? null;
    const canRevise = Boolean(effectiveJobPostingId && activeTemplate?.id);
    const { data: revisions = [], isLoading: isRevisionsLoading } = useQuery({
        queryKey: ['printTemplateRevisions', workspaceSlug, activeTemplate?.id],
        queryFn: () => printTemplateApi.workspaceRevisions(workspaceSlug, activeTemplate!.id),
        enabled: aiChatOpen && canRevise,
    });

    const handleCancelRevise = () => {
        if (reviseAbortControllerRef.current) {
            reviseAbortControllerRef.current.abort();
            reviseAbortControllerRef.current = null;
        }
        setIsRevising(false);
    };

    const handleReviseGenerate = async (
        feedbackInstruction: string | undefined,
        aiModel: string,
        customModelName?: string
    ) => {
        if (isRevising || !effectiveJobPostingId || !activeTemplate?.id) return;
        setIsRevising(true);
        const controller = new AbortController();
        reviseAbortControllerRef.current = controller;
        try {
            await jobPostingApi.workspaceReviseAiPrintDraftStream(
                workspaceSlug,
                effectiveJobPostingId,
                activeTemplate.id,
                feedbackInstruction ?? '',
                async (event) => {
                    if (event.type === 'error') {
                        alert(`AI 재생성에 실패했습니다. ${event.message}`);
                        return;
                    }
                    queryClient.invalidateQueries({
                        queryKey: ['printTemplateRevisions', activeTemplate.id],
                    });
                    const refreshed = await printTemplateApi.workspaceAdminList(workspaceSlug);
                    const updated = refreshed.find((t) => t.id === event.response.templateId);
                    if (updated) {
                        setActiveTemplate(updated);
                        const layoutSettings = parseStoredPrintLayout(updated.sectionGaps);
                        store.applyTemplate({
                            excludedIds: updated.excludedIds,
                            sectionOrder: updated.sectionOrder,
                            ...layoutSettings,
                            lineHeight: updated.lineHeight,
                        });
                        setContentOverrides(updated.contentOverrides ?? {});
                    }
                },
                controller.signal,
                aiModel,
                customModelName
            );
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') return;
            alert('AI 재생성 중 오류가 발생했습니다. 다시 시도해 주세요.');
        } finally {
            setIsRevising(false);
            reviseAbortControllerRef.current = null;
        }
    };

    const updateUrlParams = (tmplId: number | null) => {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        if (tmplId != null) {
            url.searchParams.set('templateId', String(tmplId));
        } else {
            url.searchParams.delete('templateId');
        }
        window.history.replaceState(null, '', url.toString());
    };
    const sanitizedInitialTemplate = useMemo(
        () => (initialTemplate ? sanitizePrintTemplate(initialTemplate, introData) : null),
        [initialTemplate, introData]
    );
    const [contentOverrides, setContentOverrides] = useState<PrintTemplateContentOverrides>(
        () => sanitizedInitialTemplate?.contentOverrides ?? {}
    );
    const resolvedIntroData = useMemo(
        () => applyPrintTemplateContent(introData, contentOverrides),
        [introData, contentOverrides]
    );

    const renderInlineText = ({
        value,
        baseValue,
        multiline = false,
        fullWidth = true,
        textClassName = '',
        placeholder = '',
        onChange,
    }: {
        value: string;
        baseValue: string;
        multiline?: boolean;
        fullWidth?: boolean;
        textClassName?: string;
        placeholder?: string;
        onChange: (newValue: string | undefined) => void;
    }) => {
        const isOverridden = value !== baseValue;

        if (!inlineEditMode) {
            return (
                <span
                    className={`inline-block max-w-full ${fullWidth ? 'w-full' : 'w-auto'} ${textClassName}`}
                >
                    {value}
                </span>
            );
        }

        return (
            <span
                className={`group/edit relative inline-block max-w-full ${fullWidth ? 'w-full' : 'w-auto'} ${textClassName}`}
            >
                {/* 편집기 자체가 높이를 만들면 textarea의 UA line box/scrollHeight 때문에
                    일반 문구와 atom 높이가 달라져 페이지 재배치가 발생한다. 동일 문구의
                    숨은 미러가 원래 레이아웃을 유지하고 textarea는 그 위에 겹친다. */}
                <span
                    aria-hidden="true"
                    className={`invisible block w-full max-w-full ${
                        multiline ? 'whitespace-pre-line' : ''
                    }`}
                >
                    {value || '\u00a0'}
                </span>
                <InlineEditableText
                    value={value}
                    onChange={(newValue) => onChange(newValue)}
                    placeholder={placeholder}
                    multiline={multiline}
                    className={`absolute inset-0 block min-h-full w-full overflow-visible box-border rounded-none border-0 outline-2 outline-blue-400 -outline-offset-1 bg-blue-50/30 p-0 m-0 font-[inherit] text-[inherit] leading-[inherit] tracking-[inherit] text-inherit [white-space:inherit] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                        multiline ? 'whitespace-pre-line' : ''
                    }`}
                />
                {isOverridden && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onChange(undefined);
                        }}
                        className="absolute -top-3.5 right-1 z-30 inline-flex items-center gap-1 rounded bg-amber-500 px-1.5 py-0.2 text-[9px] font-black text-white shadow-xs hover:bg-amber-600 transition print:hidden"
                        title={`최신 DB 원본 문구로 복원: "${baseValue}"`}
                    >
                        <RotateCcw className="h-2.5 w-2.5" />
                        <span>원본 복원</span>
                    </button>
                )}
            </span>
        );
    };

    const setProfileOverride = (
        field: 'jobTitle' | 'bio' | 'coreStackSummary',
        val: string | undefined
    ) => {
        setContentOverrides((current) => {
            const next = JSON.parse(JSON.stringify(current)) as PrintTemplateContentOverrides;
            const prof = { ...(next.profile ?? {}) };
            const baseVal = introData.profile?.[field] ?? '';
            if (val === undefined || (val !== '' && val.trim() === baseVal.trim())) {
                delete prof[field];
            } else {
                prof[field] = val;
            }
            next.profile = Object.keys(prof).length > 0 ? prof : undefined;
            return next;
        });
    };

    const setExperienceOverride = (
        expId: number,
        field: 'title' | 'summary' | 'role' | 'takeaway',
        val: string | undefined,
        baseVal: string
    ) => {
        setContentOverrides((current) => {
            const next = JSON.parse(JSON.stringify(current)) as PrintTemplateContentOverrides;
            const expMap = { ...(next.experiences ?? {}) };
            const fields = { ...(expMap[String(expId)] ?? {}) };
            if (val === undefined || val.trim() === baseVal.trim()) delete fields[field];
            else fields[field] = val;
            if (Object.keys(fields).length > 0) expMap[String(expId)] = fields;
            else delete expMap[String(expId)];
            next.experiences = Object.keys(expMap).length > 0 ? expMap : undefined;
            return next;
        });
    };

    // 사전질문(자소서) 답변 인라인 수정 — 공통 contentOverrides와 달리 job posting별로
    // 휘발성 있는 데이터라 별도 로컬 상태로 두고, 서버/로컬 템플릿 저장 대상에서는 제외한다.
    const [coverLetterOverrides, setCoverLetterOverrides] = useState<
        Record<number, { question?: string; answer?: string }>
    >({});
    // 지원 공고에서 불러온 문항을 위한 레거시 제목. 새로 만드는 내용은
    // contentOverrides.customSections에 독립된 사용자 정의 섹션으로 저장한다.
    const [coverLetterSectionTitle, setCoverLetterSectionTitle] = useState<string>('지원 문항');

    // 인쇄 캔버스에서만 즉석으로 추가한 지원 문항. 음수 id로 서버 항목과 구분하며,
    // "자소서" 탭의 실제 데이터에는 저장되지 않는다(인쇄 결과에만 반영).
    const [addedCoverLetterItems, setAddedCoverLetterItems] = useState<JobPostingCoverLetterItem[]>(
        []
    );
    const historyPastRef = useRef<PrintEditorSnapshot[]>([]);
    const historyFutureRef = useRef<PrintEditorSnapshot[]>([]);
    const historyCurrentRef = useRef<PrintEditorSnapshot | null>(null);
    const historyCurrentSignatureRef = useRef('');
    const historyMergeRef = useRef<{ key: string | null }>({ key: null });
    const historyMergeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [historyAvailability, setHistoryAvailability] = useState({
        canUndo: false,
        canRedo: false,
    });

    const refreshHistoryAvailability = () =>
        setHistoryAvailability({
            canUndo: historyPastRef.current.length > 0,
            canRedo: historyFutureRef.current.length > 0,
        });

    const applyHistorySnapshot = (snapshot: PrintEditorSnapshot) => {
        const restored = clonePrintEditorSnapshot(snapshot);
        historyCurrentRef.current = restored;
        historyCurrentSignatureRef.current = JSON.stringify(restored);
        store.applyTemplate(restored);
        setContentOverrides(restored.contentOverrides);
        setCoverLetterOverrides(restored.coverLetterOverrides);
        setCoverLetterSectionTitle(restored.coverLetterSectionTitle);
        setAddedCoverLetterItems(restored.addedCoverLetterItems);
    };

    const handleUndo = () => {
        const previous = historyPastRef.current.pop();
        const current = historyCurrentRef.current;
        if (!previous || !current) return;
        historyFutureRef.current.push(clonePrintEditorSnapshot(current));
        applyHistorySnapshot(previous);
        historyMergeRef.current = { key: null };
        if (historyMergeTimerRef.current) clearTimeout(historyMergeTimerRef.current);
        refreshHistoryAvailability();
    };

    const handleRedo = () => {
        const next = historyFutureRef.current.pop();
        const current = historyCurrentRef.current;
        if (!next || !current) return;
        historyPastRef.current.push(clonePrintEditorSnapshot(current));
        applyHistorySnapshot(next);
        historyMergeRef.current = { key: null };
        if (historyMergeTimerRef.current) clearTimeout(historyMergeTimerRef.current);
        refreshHistoryAvailability();
    };

    useEffect(() => {
        const snapshot = clonePrintEditorSnapshot({
            excludedIds: store.printExcludedIds,
            sectionOrder: store.printSectionOrder,
            sectionGaps: store.sectionGaps,
            lineHeight: store.lineHeight,
            forcedPageOverrides: store.forcedPageOverrides,
            outputLayout: store.outputLayout,
            itemOrderOverrides: store.itemOrderOverrides,
            contentOverrides,
            coverLetterOverrides,
            coverLetterSectionTitle,
            addedCoverLetterItems,
        });
        const signature = JSON.stringify(snapshot);
        if (signature === historyCurrentSignatureRef.current) return;

        const current = historyCurrentRef.current;
        if (current) {
            const mergeKey = getHistoryMergeKey(current, snapshot);
            const shouldMerge = mergeKey !== null && historyMergeRef.current.key === mergeKey;
            if (!shouldMerge) {
                historyPastRef.current.push(clonePrintEditorSnapshot(current));
                if (historyPastRef.current.length > PRINT_HISTORY_LIMIT) {
                    historyPastRef.current.shift();
                }
            }
            historyMergeRef.current = { key: mergeKey };
            if (historyMergeTimerRef.current) clearTimeout(historyMergeTimerRef.current);
            if (mergeKey) {
                historyMergeTimerRef.current = setTimeout(() => {
                    historyMergeRef.current = { key: null };
                    historyMergeTimerRef.current = null;
                }, 700);
            }
            historyFutureRef.current = [];
        }
        historyCurrentRef.current = snapshot;
        historyCurrentSignatureRef.current = signature;
        refreshHistoryAvailability();
    }, [
        store.printExcludedIds,
        store.printSectionOrder,
        store.sectionGaps,
        store.lineHeight,
        store.forcedPageOverrides,
        store.outputLayout,
        store.itemOrderOverrides,
        contentOverrides,
        coverLetterOverrides,
        coverLetterSectionTitle,
        addedCoverLetterItems,
    ]);

    useEffect(
        () => () => {
            if (historyMergeTimerRef.current) clearTimeout(historyMergeTimerRef.current);
        },
        []
    );

    useEffect(() => {
        const handleHistoryShortcut = (event: KeyboardEvent) => {
            if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
            const target = event.target;
            if (
                target instanceof HTMLElement &&
                (target.isContentEditable ||
                    target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT')
            ) {
                return;
            }
            const key = event.key.toLowerCase();
            if (key === 'z' && event.shiftKey) {
                event.preventDefault();
                handleRedo();
            } else if (key === 'z') {
                event.preventDefault();
                handleUndo();
            } else if (key === 'y' && event.ctrlKey) {
                event.preventDefault();
                handleRedo();
            }
        };
        window.addEventListener('keydown', handleHistoryShortcut);
        return () => window.removeEventListener('keydown', handleHistoryShortcut);
    });

    const handleDocumentSettingsResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        documentSettingsResizeRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            width: documentSettingsWidth,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handleDocumentSettingsResizeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const drag = documentSettingsResizeRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        setDocumentSettingsWidth(
            Math.min(420, Math.max(240, drag.width + event.clientX - drag.startX))
        );
    };

    const handleDocumentSettingsResizeEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (documentSettingsResizeRef.current?.pointerId !== event.pointerId) return;
        documentSettingsResizeRef.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
    };
    const addCoverLetterItem = () => {
        const newId = -Date.now();
        setAddedCoverLetterItems((current) => [
            ...current,
            {
                id: newId,
                question: '',
                answer: '',
                characterLimit: null,
                displayOrder: coverLetterItems.length + current.length,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ]);
    };
    const updateAddedCoverLetterItem = (
        itemId: number,
        field: 'question' | 'answer',
        val: string | undefined
    ) => {
        setAddedCoverLetterItems((current) =>
            current.map((i) => (i.id === itemId ? { ...i, [field]: val ?? '' } : i))
        );
    };
    const removeAddedCoverLetterItem = (itemId: number) => {
        setAddedCoverLetterItems((current) => current.filter((i) => i.id !== itemId));
    };

    const addCustomSection = () => {
        const sectionId = crypto.randomUUID();
        const itemId = crypto.randomUUID();
        setInlineEditMode(true);
        setContentOverrides((current) => ({
            ...current,
            customSections: [
                ...(current.customSections ?? []),
                {
                    id: sectionId,
                    title: `추가 섹션 ${(current.customSections?.length ?? 0) + 1}`,
                    items: [{ id: itemId, title: '', content: '' }],
                },
            ],
        }));
        store.setSectionOrder([...store.printSectionOrder, `custom-section:${sectionId}`]);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document
                    .getElementById(`custom-section:${sectionId}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        });
    };

    const updateCustomSection = (
        sectionId: string,
        updater: (section: CustomPrintSection) => CustomPrintSection
    ) => {
        setContentOverrides((current) => ({
            ...current,
            customSections: (current.customSections ?? []).map((section) =>
                section.id === sectionId ? updater(section) : section
            ),
        }));
    };

    const removeCustomSection = (sectionId: string) => {
        setContentOverrides((current) => ({
            ...current,
            customSections: (current.customSections ?? []).filter(
                (section) => section.id !== sectionId
            ),
        }));
        const printSectionId = `custom-section:${sectionId}`;
        store.setSectionOrder(store.printSectionOrder.filter((id) => id !== printSectionId));
        store.setExcludedIds(
            store.printExcludedIds.filter(
                (id) => id !== printSectionId && !id.startsWith(`${printSectionId}:`)
            )
        );
    };

    const addCustomSectionItem = (sectionId: string) => {
        updateCustomSection(sectionId, (section) => ({
            ...section,
            items: [...section.items, { id: crypto.randomUUID(), title: '', content: '' }],
        }));
    };

    const updateCustomSectionItem = (
        sectionId: string,
        itemId: string,
        field: 'title' | 'content',
        value: string | undefined
    ) => {
        updateCustomSection(sectionId, (section) => ({
            ...section,
            items: section.items.map((item) =>
                item.id === itemId ? { ...item, [field]: value ?? '' } : item
            ),
        }));
    };

    const removeCustomSectionItem = (sectionId: string, itemId: string) => {
        updateCustomSection(sectionId, (section) => ({
            ...section,
            items: section.items.filter((item) => item.id !== itemId),
        }));
    };

    const setCoverLetterOverride = (
        itemId: number,
        field: 'question' | 'answer',
        val: string | undefined,
        baseVal: string
    ) => {
        setCoverLetterOverrides((current) => {
            const next = { ...current };
            const fields = { ...(next[itemId] ?? {}) };
            if (val === undefined || val.trim() === baseVal.trim()) delete fields[field];
            else fields[field] = val;
            if (Object.keys(fields).length > 0) next[itemId] = fields;
            else delete next[itemId];
            return next;
        });
    };

    const setDetailOverride = (
        detailId: number,
        field: 'content' | 'narrative',
        val: string | undefined,
        baseVal: string
    ) => {
        setContentOverrides((current) => {
            const next = JSON.parse(JSON.stringify(current)) as PrintTemplateContentOverrides;
            const detailMap = { ...(next.details ?? {}) };
            const fields = { ...(detailMap[String(detailId)] ?? {}) };
            if (val === undefined || val.trim() === baseVal.trim()) delete fields[field];
            else fields[field] = val;
            if (Object.keys(fields).length > 0) detailMap[String(detailId)] = fields;
            else delete detailMap[String(detailId)];
            next.details = Object.keys(detailMap).length > 0 ? detailMap : undefined;
            return next;
        });
    };

    const setCompetencyOverride = (
        compId: number,
        field: 'title' | 'summary',
        val: string | undefined,
        baseVal: string
    ) => {
        setContentOverrides((current) => {
            const next = JSON.parse(JSON.stringify(current)) as PrintTemplateContentOverrides;
            const compMap = { ...(next.competencies ?? {}) };
            const fields = { ...(compMap[String(compId)] ?? {}) };
            if (val === undefined || val.trim() === baseVal.trim()) delete fields[field];
            else fields[field] = val;
            if (Object.keys(fields).length > 0) compMap[String(compId)] = fields;
            else delete compMap[String(compId)];
            next.competencies = Object.keys(compMap).length > 0 ? compMap : undefined;
            return next;
        });
    };

    const [skillSelectorModalOpen, setSkillSelectorModalOpen] = useState(false);
    const [addingCatalogSkillId, setAddingCatalogSkillId] = useState<number | null>(null);
    const { data: catalogSkills = [] } = useQuery({
        queryKey: ['skill-catalog'],
        queryFn: skillApi.catalog,
        enabled: adminMode && skillSelectorModalOpen,
    });

    const toggleSkillSelection = (skillId: number) => {
        setContentOverrides((current) => {
            const defaultCoreSkillIds = introData.skills.filter((s) => s.isCore).map((s) => s.id);
            const currentSelected = current.selectedSkillIds ?? defaultCoreSkillIds;

            let nextSelected: number[];
            if (currentSelected.includes(skillId)) {
                nextSelected = currentSelected.filter((id) => id !== skillId);
            } else {
                nextSelected = [...currentSelected, skillId];
            }

            const isDefaultState =
                defaultCoreSkillIds.length === nextSelected.length &&
                defaultCoreSkillIds.every((id) => nextSelected.includes(id));

            return {
                ...current,
                selectedSkillIds: isDefaultState ? undefined : nextSelected,
            };
        });
    };

    const moveSkillToGroup = (skillId: number, group: SkillOutputGroup) => {
        setContentOverrides((current) => {
            return {
                ...current,
                skillGroupOverrides: {
                    ...(current.skillGroupOverrides ?? {}),
                    [String(skillId)]: group,
                },
            };
        });
    };

    const addCatalogSkillToWorkspace = async (skill: Skill, group: SkillOutputGroup) => {
        setAddingCatalogSkillId(skill.id);
        try {
            await skillApi.workspaceCreate(workspaceSlug, {
                name: skill.name,
                category: skill.category,
                skillLevel: '',
                skillVersion: '',
                comment: '',
                usageType: group === 'CORE' ? 'WORK_EXPERIENCE' : 'PROJECT_USE',
                badgeKey: skill.badgeKey,
                badgeColor: skill.badgeColor,
                isCore: group === 'CORE',
                displayOrder:
                    Math.max(
                        0,
                        ...introData.skills.map((workspaceSkill) => workspaceSkill.displayOrder)
                    ) + 1,
            });
            setContentOverrides((current) => {
                const defaultCoreSkillIds = introData.skills
                    .filter((workspaceSkill) => workspaceSkill.isCore)
                    .map((workspaceSkill) => workspaceSkill.id);
                const selected = new Set(current.selectedSkillIds ?? defaultCoreSkillIds);
                selected.add(skill.id);
                return {
                    ...current,
                    selectedSkillIds: Array.from(selected),
                    skillGroupOverrides: {
                        ...(current.skillGroupOverrides ?? {}),
                        [String(skill.id)]: group,
                    },
                };
            });
            await queryClient.invalidateQueries({
                queryKey: ['workspace', workspaceSlug, 'output-source'],
            });
            await queryClient.refetchQueries({
                queryKey: ['workspace', workspaceSlug, 'output-source'],
            });
            await queryClient.invalidateQueries({ queryKey: ['skills', workspaceSlug] });
        } catch (error) {
            alert(
                error instanceof Error
                    ? error.message
                    : 'Workspace 원본에 기술을 추가하지 못했습니다.'
            );
        } finally {
            setAddingCatalogSkillId(null);
        }
    };

    const resetSkillsToDefault = () => {
        setContentOverrides((current) => ({
            ...current,
            selectedSkillIds: undefined,
            skillGroupOverrides: undefined,
        }));
    };

    const profile = resolvedIntroData.profile;
    const careerSummary = resolvedIntroData.careerSummary;
    const groupedCoreSkills = useMemo(() => {
        const defaultCoreSkillIds = resolvedIntroData.skills
            .filter((s) => s.isCore)
            .map((s) => s.id);
        const selectedIds = new Set(contentOverrides.selectedSkillIds ?? defaultCoreSkillIds);
        return groupSkillsByUsage(resolvedIntroData.skills.filter((s) => selectedIds.has(s.id)));
    }, [resolvedIntroData, contentOverrides.selectedSkillIds]);
    const orderedSkillGroups = useMemo(
        () =>
            applyOrder(
                groupedCoreSkills,
                'group:skills',
                (group) => `skills-group:${group.value}`,
                store.itemOrderOverrides
            ),
        [groupedCoreSkills, store.itemOrderOverrides]
    );
    const orderedCareerCards = useMemo(() => {
        const companies = applyOrder(
            buildCareerCards(resolvedIntroData.experiences),
            'group:career-company',
            (c) => `career-company:${c.id}`,
            store.itemOrderOverrides
        );
        return companies.map((company) => {
            const projects = applyOrder(
                company.projects,
                `career-company:${company.id}`,
                (p) => `career-project:${p.id}`,
                store.itemOrderOverrides
            ).map((project) => ({
                ...project,
                details: applyOrder(
                    project.details,
                    `career-project:${project.id}`,
                    (d) => `career-detail:${d.id}`,
                    store.itemOrderOverrides
                ),
            }));
            return { ...company, projects };
        });
    }, [resolvedIntroData, store.itemOrderOverrides]);
    const orderedCompetencies = useMemo(
        () =>
            applyOrder(
                resolvedIntroData.competencies,
                'group:competencies',
                (c) => `competency:${c.id}`,
                store.itemOrderOverrides
            ),
        [resolvedIntroData, store.itemOrderOverrides]
    );
    const orderedMilestones = useMemo(() => {
        const milestones = applyOrder(
            buildMilestones(resolvedIntroData),
            'group:projects',
            (m) => `project:${m.id}`,
            store.itemOrderOverrides
        );
        return milestones.map((m) => ({
            ...m,
            details: applyOrder(
                m.details,
                `project:${m.id}`,
                (d) => `project-detail:${d.id}`,
                store.itemOrderOverrides
            ),
        }));
    }, [resolvedIntroData, store.itemOrderOverrides]);
    const orderedCredentialExperiences = useMemo(
        () =>
            applyOrder(
                buildOrderedCredentials(resolvedIntroData.experiences),
                'group:credentials',
                (c) => `credential:${c.id}`,
                store.itemOrderOverrides
            ),
        [resolvedIntroData, store.itemOrderOverrides]
    );
    const orderedCoverLetterItems = useMemo(() => {
        const merged = [...coverLetterItems, ...addedCoverLetterItems].map((item) => {
            const override = coverLetterOverrides[item.id];
            return override ? { ...item, ...override } : item;
        });
        return applyOrder(
            merged.sort((a, b) => a.displayOrder - b.displayOrder),
            'group:cover-letter',
            (c) => `cover-letter-item:${c.id}`,
            store.itemOrderOverrides
        );
    }, [coverLetterItems, addedCoverLetterItems, coverLetterOverrides, store.itemOrderOverrides]);
    const orderedCustomSections = useMemo(
        () =>
            applyOrder(
                contentOverrides.customSections ?? [],
                'group:custom-sections',
                (section) => `custom-section:${section.id}`,
                store.itemOrderOverrides
            ).map((section) => ({
                ...section,
                items: applyOrder(
                    section.items,
                    `custom-section:${section.id}`,
                    (item) => `custom-section-item:${section.id}:${item.id}`,
                    store.itemOrderOverrides
                ),
            })),
        [contentOverrides.customSections, store.itemOrderOverrides]
    );

    useEffect(() => {
        if (!sanitizedInitialTemplate) return;
        const layoutSettings = parseStoredPrintLayout(sanitizedInitialTemplate.sectionGaps);
        store.applyTemplate({
            excludedIds: sanitizedInitialTemplate.excludedIds,
            sectionOrder: sanitizedInitialTemplate.sectionOrder,
            ...layoutSettings,
        });
        // 초기 템플릿은 이 컴포넌트가 마운트될 때 한 번만 적용한다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sanitizedInitialTemplate?.id]);

    // 캔버스 마우스 휠 + Ctrl/Cmd로 줌 조절
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = -e.deltaY;
                store.setZoom(store.zoom + (delta > 0 ? 0.05 : -0.05));
            }
        };
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.zoom]);

    const handleZoomFit = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const canvasWidth = canvas.clientWidth;
        const padding = 64;
        const fitZoom = (canvasWidth - padding) / 794;
        store.setZoom(fitZoom);
    };

    useEffect(() => {
        const clearPrintTitle = () => {
            printLayoutFrozenRef.current = true;
        };
        const restorePrintTitle = () => {
            printLayoutFrozenRef.current = false;
            store.setPrintPending(false);
        };
        window.addEventListener('beforeprint', clearPrintTitle);
        window.addEventListener('afterprint', restorePrintTitle);
        return () => {
            window.removeEventListener('beforeprint', clearPrintTitle);
            window.removeEventListener('afterprint', restorePrintTitle);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const customPrintableSections = useMemo(
        () =>
            orderedCustomSections.map((section) => ({
                id: `custom-section:${section.id}`,
                label: section.title || '제목 없는 사용자 정의 섹션',
                icon: MessageSquareText,
            })),
        [orderedCustomSections]
    );
    const allReorderableSections = useMemo(
        () => [...reorderablePrintSections, ...customPrintableSections],
        [customPrintableSections]
    );
    const orderedReorderableSections = [
        ...store.printSectionOrder
            .map((id) => allReorderableSections.find((section) => section.id === id))
            .filter((section): section is (typeof allReorderableSections)[number] =>
                Boolean(section)
            ),
        ...allReorderableSections.filter(
            (section) => !store.printSectionOrder.includes(section.id)
        ),
    ];
    const lockedPrintSection = printableSections.find((s) => s.id === LOCKED_PRINT_SECTION_ID)!;
    const orderedPrintableSections = [lockedPrintSection, ...orderedReorderableSections];
    const orderedSectionIdsKey = orderedPrintableSections.map((s) => s.id).join(',');

    const printableAtoms = useMemo(() => {
        const atoms: PrintAtomItem[] = [];
        orderedPrintableSections.forEach((section) => {
            if (store.printExcludedIds.includes(section.id)) return;

            if (section.id === 'intro-profile') {
                atoms.push({
                    id: 'intro-profile',
                    type: 'intro-profile',
                    sectionId: 'intro-profile',
                });
            } else if (section.id === 'skills') {
                atoms.push({
                    id: 'skills-header',
                    type: 'skills',
                    sectionId: 'skills',
                    isHeader: true,
                });
                orderedSkillGroups.forEach((group) => {
                    const groupId = `skills-group:${group.value}`;
                    if (!store.printExcludedIds.includes(groupId)) {
                        atoms.push({
                            id: groupId,
                            type: 'skills-group',
                            sectionId: 'skills',
                            dataId: group.value,
                        });
                    }
                });
            } else if (section.id === 'competencies') {
                atoms.push({
                    id: 'competencies-header',
                    type: 'competency-header',
                    sectionId: 'competencies',
                    isHeader: true,
                });
                orderedCompetencies.forEach((c) => {
                    const id = `competency:${c.id}`;
                    if (!store.printExcludedIds.includes(id)) {
                        atoms.push({
                            id,
                            type: 'competency-item',
                            sectionId: 'competencies',
                            dataId: c.id,
                        });
                    }
                });
            } else if (section.id === 'career') {
                atoms.push({
                    id: 'career-header',
                    type: 'career-header',
                    sectionId: 'career',
                    isHeader: true,
                });
                orderedCareerCards.forEach((career) => {
                    const companyId = `career-company:${career.id}`;
                    if (store.printExcludedIds.includes(companyId)) return;
                    atoms.push({
                        id: companyId,
                        type: 'career-company',
                        sectionId: 'career',
                        dataId: career.id,
                    });
                    career.projects.forEach((p) => {
                        const headerId = `career-project:${p.id}`;
                        if (!store.printExcludedIds.includes(headerId)) {
                            atoms.push({
                                id: headerId,
                                type: 'career-item',
                                sectionId: 'career',
                                dataId: p.id,
                            });
                            p.details?.forEach((detail) => {
                                const detailId = `career-detail:${detail.id}`;
                                if (!store.printExcludedIds.includes(detailId)) {
                                    atoms.push({
                                        id: detailId,
                                        type: 'career-detail-item',
                                        sectionId: 'career',
                                        dataId: detail.id,
                                        title: detail.content,
                                    });
                                }
                            });
                        }
                    });
                });
            } else if (section.id === 'credentials') {
                atoms.push({
                    id: 'credentials-header',
                    type: 'credentials-header',
                    sectionId: 'credentials',
                    isHeader: true,
                });
                orderedCredentialExperiences.forEach((cred) => {
                    const id = `credential:${cred.id}`;
                    if (!store.printExcludedIds.includes(id)) {
                        atoms.push({
                            id,
                            type: 'credential-item',
                            sectionId: 'credentials',
                            dataId: cred.id,
                        });
                    }
                });
            } else if (section.id === 'projects') {
                atoms.push({
                    id: 'projects-header',
                    type: 'projects-header',
                    sectionId: 'projects',
                    isHeader: true,
                });
                orderedMilestones.forEach((m) => {
                    const headerId = `project:${m.id}`;
                    if (!store.printExcludedIds.includes(headerId)) {
                        atoms.push({
                            id: headerId,
                            type: 'project-item',
                            sectionId: 'projects',
                            dataId: m.id,
                        });
                        m.details?.forEach((detail) => {
                            const detailId = `project-detail:${detail.id}`;
                            if (!store.printExcludedIds.includes(detailId)) {
                                atoms.push({
                                    id: detailId,
                                    type: 'project-detail-item',
                                    sectionId: 'projects',
                                    dataId: detail.id,
                                    title: detail.content,
                                });
                            }
                        });
                    }
                });
            } else if (section.id === 'cover-letter') {
                if (orderedCoverLetterItems.length > 0) {
                    atoms.push({
                        id: 'cover-letter-header',
                        type: 'cover-letter-header',
                        sectionId: 'cover-letter',
                        isHeader: true,
                    });
                    orderedCoverLetterItems.forEach((item) => {
                        const id = `cover-letter-item:${item.id}`;
                        if (!store.printExcludedIds.includes(id)) {
                            atoms.push({
                                id,
                                type: 'cover-letter-item',
                                sectionId: 'cover-letter',
                                dataId: item.id,
                                title: item.question,
                            });
                        }
                    });
                }
            } else if (section.id.startsWith('custom-section:')) {
                const customSectionId = section.id.replace('custom-section:', '');
                const customSection = orderedCustomSections.find(
                    (entry) => entry.id === customSectionId
                );
                if (!customSection) return;
                atoms.push({
                    id: section.id,
                    type: 'custom-section-header',
                    sectionId: section.id,
                    dataId: customSection.id,
                    title: customSection.title,
                    isHeader: true,
                });
                customSection.items.forEach((item) => {
                    const itemId = `custom-section-item:${customSection.id}:${item.id}`;
                    if (!store.printExcludedIds.includes(itemId)) {
                        atoms.push({
                            id: itemId,
                            type: 'custom-section-item',
                            sectionId: section.id,
                            dataId: `${customSection.id}:${item.id}`,
                            title: item.title,
                        });
                    }
                });
            }
        });
        return atoms;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        store.printExcludedIds,
        orderedSectionIdsKey,
        orderedSkillGroups,
        orderedCompetencies,
        orderedCareerCards,
        orderedCredentialExperiences,
        orderedMilestones,
        orderedCoverLetterItems,
        orderedCustomSections,
    ]);

    const pageContentHeightPx = useMemo(
        () =>
            Math.round(
                (A4_HEIGHT_MM -
                    store.outputLayout.pageMargins.top -
                    store.outputLayout.pageMargins.bottom) *
                    MM_TO_PX
            ),
        [store.outputLayout.pageMargins.bottom, store.outputLayout.pageMargins.top]
    );

    const pageLayers = useMemo(
        () =>
            partitionAtomsIntoPages(
                printableAtoms,
                store.atomHeights,
                store.sectionGaps,
                store.forcedPageOverrides,
                pageContentHeightPx,
                store.outputLayout.pages.map((page) => page.id)
            ),
        [
            printableAtoms,
            store.atomHeights,
            store.sectionGaps,
            store.forcedPageOverrides,
            store.outputLayout.pages,
            pageContentHeightPx,
        ]
    );

    useEffect(() => {
        if (store.outputLayout.pages.length >= pageLayers.length) return;
        store.setOutputLayout(ensureOutputLayoutPageCount(store.outputLayout, pageLayers.length));
    }, [pageLayers.length, store]);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || printLayoutFrozenRef.current) return;

        let frame = 0;
        let disposed = false;
        let observedTargets: HTMLElement[] = [];

        const measure = () => {
            frame = 0;
            if (disposed || printLayoutFrozenRef.current) return;

            const elements = Array.from(canvas.querySelectorAll<HTMLElement>('[data-atom-id]'));
            const newHeights = new Map<string, number>();
            const previousHeights = usePrintStore.getState().atomHeights;
            elements.forEach((el) => {
                const atomId = el.dataset.atomId;
                if (!atomId) return;

                // 2열은 1열 paginator가 이미 정한 페이지 안에서만 배치한다. 좁아진 열에서
                // 다시 잰 높이를 1열 합계에 넣으면 페이지 수가 왕복하는 순환이 생기므로,
                // 2열 페이지의 atom은 전환 직전 1열 실측값을 페이지 분할 기준으로 유지한다.
                const pageLayoutMode =
                    el.closest<HTMLElement>('[data-layout-mode]')?.dataset.layoutMode;
                const previousHeight = previousHeights.get(atomId);
                if (pageLayoutMode !== 'SINGLE_COLUMN' && previousHeight !== undefined) {
                    newHeights.set(atomId, previousHeight);
                    return;
                }

                const target =
                    el.querySelector<HTMLElement>('[data-print-el]') ||
                    (el.firstElementChild as HTMLElement | null) ||
                    el;
                const computedStyle = window.getComputedStyle(target);
                const marginTop = Number.parseFloat(computedStyle.marginTop) || 0;
                const marginBottom = Number.parseFloat(computedStyle.marginBottom) || 0;
                // offsetHeight는 콘텐츠·padding·border까지만 포함하고 바깥 margin은
                // 제외한다. 섹션 헤더의 mt-6, mb-2 등이 누적되면 엔진의 합계는 A4
                // 안이라고 판단하지만 실제 DOM은 하단 경계를 넘어간다. flex page
                // 안에서 각 atom이 차지하는 외부 여백까지 실측 높이에 포함한다.
                const renderedHeight =
                    target.offsetHeight ||
                    Math.round(target.getBoundingClientRect().height / (store.zoom || 1));
                const height = renderedHeight + marginTop + marginBottom;
                // 내용이 없는 조건부 atom의 0px도 레이아웃 엔진에 전달한다. 생략하면
                // 엔진이 큰 추정 높이로 되돌아가 빈 페이지 공간을 만들 수 있다.
                newHeights.set(atomId, Math.max(0, height));
            });

            const previous = previousHeights;
            const changed =
                previous.size !== newHeights.size ||
                Array.from(newHeights).some(([id, height]) => {
                    const previousHeight = previous.get(id);
                    return previousHeight === undefined || Math.abs(previousHeight - height) > 1;
                });

            if (changed) store.setAtomHeights(newHeights);
        };

        const scheduleMeasure = () => {
            if (frame || disposed) return;
            frame = window.requestAnimationFrame(measure);
        };

        const observer = new ResizeObserver(scheduleMeasure);
        observedTargets = Array.from(
            canvas.querySelectorAll<HTMLElement>('[data-atom-id] [data-print-el]')
        );
        observedTargets.forEach((target) => observer.observe(target));

        // 레이아웃 이펙트에서 첫 측정을 수행해 추정 높이가 보이는 시간을 줄이고,
        // 웹폰트 적용이나 이미지 디코딩으로 뒤늦게 높이가 변하는 경우도 다시 측정한다.
        measure();
        void document.fonts.ready.then(scheduleMeasure);

        return () => {
            disposed = true;
            if (frame) window.cancelAnimationFrame(frame);
            observedTargets.forEach((target) => observer.unobserve(target));
            observer.disconnect();
        };
        // pageLayers가 바뀌면 새 페이지 부모 아래에 마운트된 atom들을 다시 관찰한다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageLayers, printableAtoms, store.sectionGaps, store.zoom, contentOverrides]);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let frame = window.requestAnimationFrame(() => {
            frame = 0;
            const next = Array.from(
                canvas.querySelectorAll<HTMLElement>('[data-output-region-key]')
            )
                .filter((region) => region.scrollHeight > region.clientHeight + 2)
                .map((region) => region.dataset.outputRegionKey)
                .filter((key): key is string => Boolean(key))
                .sort();
            setOverflowRegionKeys((current) =>
                current.length === next.length && current.every((key, index) => key === next[index])
                    ? current
                    : next
            );
        });
        return () => {
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, [pageLayers, store.outputLayout, store.atomHeights, store.zoom, contentOverrides]);

    const atomPageMap = useMemo(() => {
        const map = new Map<string, number>();
        pageLayers.forEach((page) =>
            page.items.forEach((item) => map.set(item.id, page.pageIndex))
        );
        return map;
    }, [pageLayers]);

    const pageBreakBoundaryAtomIds = useMemo(() => {
        const set = new Set<string>();
        for (let p = 1; p < pageLayers.length; p++) {
            const prevPageItems = pageLayers[p - 1].items;
            const currentPageItems = pageLayers[p].items;
            if (currentPageItems.length > 0) {
                const firstAtomOnNewPage = currentPageItems[0];
                const sectionId = firstAtomOnNewPage.sectionId;
                const hasPrevItemsInSameSection = prevPageItems.some(
                    (it) => it.sectionId === sectionId
                );
                if (hasPrevItemsInSameSection) set.add(firstAtomOnNewPage.id);
            }
        }
        return set;
    }, [pageLayers]);

    const getAssociatedAtomIds = (id: string): string[] => {
        if (id.startsWith('project-details-header:')) {
            const milestoneId = id.replace('project-details-header:', '');
            const m = orderedMilestones.find((item) => String(item.id) === milestoneId);
            if (m) return [id, ...m.details.map((d) => `project-detail:${d.id}`)];
        }
        if (id.startsWith('career-details-header:')) {
            const projectId = id.replace('career-details-header:', '');
            const p = orderedCareerCards
                .flatMap((c) => c.projects)
                .find((item) => String(item.id) === projectId);
            if (p) return [id, ...p.details.map((d) => `career-detail:${d.id}`)];
        }
        return [id];
    };

    const startGapDrag = (id: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startY = e.clientY;
        const startGap = Math.max(0, store.sectionGaps[id] ?? 0);
        const onMove = (me: MouseEvent) => {
            const next = Math.max(0, Math.round(startGap + (me.clientY - startY)));
            store.setGap(id, next);
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const getAtomDisplayTitle = (atomId: string): string => {
        if (atomId === 'intro-profile') return '소개 / 프로필';
        if (atomId === 'skills' || atomId === 'skills-group') return '기술 스택';
        if (atomId === 'competency-header' || atomId === 'competencies') return '핵심 역량';
        if (atomId === 'career-header' || atomId === 'career') return '경력 사항';
        if (atomId === 'credentials-header' || atomId === 'credentials') return '학력 / 자격증';
        if (atomId === 'projects-header' || atomId === 'projects') return '프로젝트 목록';
        if (atomId === 'cover-letter-header' || atomId === 'cover-letter') return '지원 문항';

        if (atomId.startsWith('custom-section:')) {
            const sectionId = atomId.replace('custom-section:', '');
            return (
                contentOverrides.customSections?.find((section) => section.id === sectionId)
                    ?.title || '사용자 정의 섹션'
            );
        }
        if (atomId.startsWith('custom-section-item:')) {
            const [, sectionId, itemId] = atomId.split(':');
            const item = contentOverrides.customSections
                ?.find((section) => section.id === sectionId)
                ?.items.find((entry) => entry.id === itemId);
            return item?.title || '사용자 정의 항목';
        }

        if (atomId.startsWith('cover-letter-item:')) {
            const itemId = atomId.replace('cover-letter-item:', '');
            const item = orderedCoverLetterItems.find((c) => String(c.id) === itemId);
            if (item?.question) return `'${item.question}'`;
            return '지원 문항 항목';
        }
        if (atomId.startsWith('competency:')) {
            const compId = atomId.replace('competency:', '');
            const c = (resolvedIntroData.competencies || []).find(
                (item) => String(item.id) === compId
            );
            if (c?.title) return `'${c.title}'`;
            return '핵심 역량 항목';
        }
        if (atomId.startsWith('career-company:')) {
            const compId = atomId.replace('career-company:', '');
            const card = orderedCareerCards.find((c) => String(c.id) === compId);
            if (card?.companyName) return `'${card.companyName}'`;
            return '경력 회사';
        }
        if (atomId.startsWith('career-project:')) {
            const projId = atomId.replace('career-project:', '');
            const p = orderedCareerCards
                .flatMap((c) => c.projects)
                .find((item) => String(item.id) === projId);
            if (p?.title) return `'${p.title}'`;
            return '경력 프로젝트';
        }
        if (atomId.startsWith('career-details-header:')) {
            const projId = atomId.replace('career-details-header:', '');
            const p = orderedCareerCards
                .flatMap((c) => c.projects)
                .find((item) => String(item.id) === projId);
            if (p?.title) return `'${p.title}' 세부 내용`;
            return '경력 프로젝트 세부 내용';
        }
        if (atomId.startsWith('project:')) {
            const mId = atomId.replace('project:', '');
            const m = orderedMilestones.find((item) => String(item.id) === mId);
            if (m?.title) return `'${m.title}'`;
            return '프로젝트';
        }
        if (atomId.startsWith('project-details-header:')) {
            const mId = atomId.replace('project-details-header:', '');
            const m = orderedMilestones.find((item) => String(item.id) === mId);
            if (m?.title) return `'${m.title}' 세부 내용`;
            return '프로젝트 세부 내용';
        }
        if (atomId.startsWith('credential:')) {
            const credId = atomId.replace('credential:', '');
            const cred = orderedCredentialExperiences.find((item) => String(item.id) === credId);
            const title = cred?.title || cred?.companyName;
            if (title) return `'${title}'`;
            return '학력/자격증';
        }

        const atom = printableAtoms.find((a) => a.id === atomId);
        if (atom?.title) return `'${atom.title}'`;
        return '해당 항목';
    };

    // 배지(강제배치/분할지점) 안에서 이미 핀·여백조절을 제공하는지 판별.
    // 호버 시 뜨는 .pp-controls 알약과 좌표가 겹치므로, 배지가 보이는 항목은
    // 알약을 아예 띄우지 않고 배지 하나로 컨트롤을 통일한다.
    const isPageBreakBannerVisible = (id: string): boolean => {
        if (store.hidePrintGuides) return false;
        if (id === 'intro-profile') return false;
        const forcedPage = store.forcedPageOverrides[id];
        if (forcedPage !== undefined) {
            const isChildDetail =
                id.startsWith('project-detail:') || id.startsWith('career-detail:');
            if (isChildDetail) {
                let parentHeaderId: string | null = null;
                if (id.startsWith('project-detail:')) {
                    const detailId = id.replace('project-detail:', '');
                    const m = orderedMilestones.find((item) =>
                        item.details.some((d) => String(d.id) === detailId)
                    );
                    if (m) parentHeaderId = `project-details-header:${m.id}`;
                } else if (id.startsWith('career-detail:')) {
                    const detailId = id.replace('career-detail:', '');
                    const p = orderedCareerCards
                        .flatMap((c) => c.projects)
                        .find((proj) => proj.details.some((d) => String(d.id) === detailId));
                    if (p) parentHeaderId = `career-details-header:${p.id}`;
                }
                if (parentHeaderId && store.forcedPageOverrides[parentHeaderId] !== undefined)
                    return false;
            }
            return true;
        }
        const isBoundary = pageBreakBoundaryAtomIds.has(id);
        const currentGap = store.sectionGaps[id] ?? 0;
        return isBoundary || currentGap > 0;
    };

    const renderPageBreakControl = (id: string, sectionId: string) => {
        if (!isPageBreakBannerVisible(id)) return null;
        void sectionId;

        const isBoundary = pageBreakBoundaryAtomIds.has(id);
        const forcedPage = store.forcedPageOverrides[id];
        const currentPage = atomPageMap.get(id);
        const itemTitle = getAtomDisplayTitle(id);
        const isExcluded = store.printExcludedIds.includes(id);

        const shortItemTitle = itemTitle.length > 8 ? `${itemTitle.slice(0, 8)}...` : itemTitle;

        const pinAndGapButtons = (
            <>
                <div
                    onMouseDown={startGapDrag(id)}
                    title="위치/여백 조절 (마우스로 위아래를 끌어서 간격 세밀 조절)"
                    className="flex h-6 w-6 cursor-ns-resize items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 transition shadow-sm shrink-0"
                >
                    <MoveVertical className="h-3 w-3 text-white" />
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        store.toggleExcluded(id);
                    }}
                    title={isExcluded ? '핀 고정하여 인쇄 포함' : '핀 해제하여 인쇄 제외'}
                    className={`flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition cursor-pointer shrink-0 ${
                        isExcluded
                            ? 'bg-slate-700 hover:bg-slate-600'
                            : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                >
                    {isExcluded ? (
                        <PinOff className="h-3 w-3 text-white" />
                    ) : (
                        <Pin className="h-3 w-3 text-white" />
                    )}
                </button>
            </>
        );

        if (forcedPage !== undefined) {
            const labelText = `${shortItemTitle} 항목이 ${forcedPage + 1}페이지로 강제 배치되었습니다.`;

            return (
                <div className="absolute -top-7 left-[112px] right-0 z-30 flex items-center justify-between rounded-md border border-indigo-400/50 bg-slate-900/90 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-md print:hidden pointer-events-auto">
                    <div className="flex items-center gap-2 min-w-0 shrink">
                        <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-black text-white shrink-0">
                            강제 위치 배치됨
                        </span>
                        <span
                            className="text-[11px] text-indigo-100 font-semibold truncate max-w-[220px]"
                            title={`${itemTitle} 항목이 ${forcedPage + 1}페이지로 강제 배치되었습니다.`}
                        >
                            {labelText}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {forcedPage > 0 && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    store.forcePage(getAssociatedAtomIds(id), forcedPage - 1);
                                }}
                                className="flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-indigo-500 active:scale-95 transition shadow-sm cursor-pointer shrink-0"
                                title={`'${itemTitle}' 항목을 ${forcedPage}페이지로 한 단계 더 끌어올립니다.`}
                            >
                                <ArrowUp className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate max-w-[150px]">
                                    {forcedPage}페이지로 더 올리기
                                </span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                store.clearForcedPage(getAssociatedAtomIds(id));
                            }}
                            className="flex items-center gap-1 rounded bg-rose-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-rose-700 active:scale-95 transition shadow-sm cursor-pointer shrink-0"
                            title="강제 위치 배제를 해제하고 원래 자동 배치 상태로 복원합니다."
                        >
                            <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate max-w-[160px]">
                                강제 배치 해제 (원래 위치로)
                            </span>
                        </button>
                        {pinAndGapButtons}
                    </div>
                </div>
            );
        }

        const targetPrevPage = (currentPage ?? 1) - 1;

        return (
            <div
                className={`absolute -top-7 ${isBoundary ? 'left-[112px]' : 'left-0'} right-0 z-30 flex items-center justify-between rounded-md border border-blue-400/50 bg-slate-900/90 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-md print:hidden pointer-events-auto`}
            >
                <div className="flex items-center gap-2 min-w-0 shrink">
                    <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-black text-white shrink-0">
                        페이지 분할 지점
                    </span>
                    <span
                        className="text-[11px] text-slate-200 font-semibold truncate max-w-[220px]"
                        title={
                            isBoundary
                                ? `${itemTitle} 항목부터 다음 페이지로 분할되었습니다.`
                                : `${itemTitle} 여백 세밀 조절 중`
                        }
                    >
                        {isBoundary
                            ? `${shortItemTitle} 항목부터 다음 페이지로 분할`
                            : `${shortItemTitle} 여백 세밀 조절 중`}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isBoundary && targetPrevPage >= 0 && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                store.forcePage(getAssociatedAtomIds(id), targetPrevPage);
                            }}
                            title={`'${itemTitle}' 항목을 ${targetPrevPage + 1}페이지로 강제 올립니다.`}
                            className="flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-indigo-500 active:scale-95 transition shadow-sm cursor-pointer shrink-0"
                        >
                            <ArrowUp className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate max-w-[160px]">
                                &apos;{shortItemTitle}&apos; {targetPrevPage + 1}페이지로 강제
                                올리기
                            </span>
                        </button>
                    )}
                    {pinAndGapButtons}
                </div>
            </div>
        );
    };

    const renderSectionControls = (id: string) => {
        if (store.hidePrintGuides) return null;
        return (
            <div className="pp-controls print:hidden">
                <PrintEyeButton
                    id={id}
                    excluded={store.printExcludedIds.includes(id)}
                    onToggle={store.toggleExcluded}
                />
                <div
                    onMouseDown={startGapDrag(id)}
                    title="위쪽 간격 조절 (아래로 끌면 넓어짐)"
                    className="grid h-7 w-7 cursor-ns-resize place-items-center rounded-full bg-slate-900/90 text-white shadow-lg transition hover:bg-slate-900"
                >
                    <MoveVertical className="h-3.5 w-3.5" />
                </div>
            </div>
        );
    };

    const renderItemControls = (id: string) => {
        // 배지(강제배치/분할지점)가 이미 핀·여백조절을 제공하는 항목은
        // 좌표가 겹치는 호버 알약을 띄우지 않는다.
        if (isPageBreakBannerVisible(id)) return null;

        const isForced = store.forcedPageOverrides[id] !== undefined;
        const forcedPage = store.forcedPageOverrides[id];
        const nextPageNum = (forcedPage ?? 0) + 2;

        return (
            <div className="pp-controls print:hidden flex items-center gap-1 bg-slate-900/90 p-1 rounded-full shadow-lg backdrop-blur-md z-40">
                <PrintEyeButton
                    id={id}
                    excluded={store.printExcludedIds.includes(id)}
                    onToggle={store.toggleExcluded}
                />
                {isForced && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            store.clearForcedPage(getAssociatedAtomIds(id));
                        }}
                        title={`원래 위치(${nextPageNum}페이지)로 다시 내리기`}
                        className="flex h-6 items-center gap-1 rounded-full bg-rose-600 px-2.5 text-[10px] font-black text-white hover:bg-rose-700 transition cursor-pointer shadow-sm"
                    >
                        <ArrowDown className="h-3 w-3" />
                        <span>{nextPageNum}p로 내리기</span>
                    </button>
                )}
                <div
                    onMouseDown={startGapDrag(id)}
                    title="마우스를 위아래로 끌어서 간격 세밀 조절"
                    className="grid h-6 w-6 cursor-ns-resize place-items-center rounded-full bg-slate-700/90 text-white transition hover:bg-blue-600 hover:scale-110"
                >
                    <MoveVertical className="h-3 w-3" />
                </div>
            </div>
        );
    };

    const renderSectionGap = (id: string) => {
        const h = Math.max(0, store.sectionGaps[id] ?? 0);
        if (h === 0 || store.printExcludedIds.includes(id)) return null;
        return (
            <div
                aria-hidden
                data-print-gap
                className="print-gap-spacer shrink-0 w-full"
                style={{ height: `${h}px` }}
            />
        );
    };

    const renderItemGap = (id: string, sectionId?: string) => {
        const h = Math.max(0, store.sectionGaps[id] ?? 0);
        return (
            <Fragment key={`gap:${id}`}>
                {sectionId && renderPageBreakControl(id, sectionId)}
                {h > 0 && (
                    <div
                        aria-hidden
                        data-print-gap
                        className="print-gap-spacer shrink-0 w-full"
                        style={{ height: `${h}px` }}
                    />
                )}
            </Fragment>
        );
    };

    const renderAtomContent = (atom: PrintAtomItem) => {
        switch (atom.type) {
            case 'intro-profile':
                if (!profile) return null;
                const origProfile = introData.profile;
                return (
                    <div
                        id="intro-profile"
                        data-print-el
                        className="resume-profile-card relative p-0 pb-3 border-b border-slate-200 shadow-none rounded-none bg-transparent"
                    >
                        {renderSectionGap('intro-profile')}
                        {renderSectionControls('intro-profile')}
                        <div className="relative z-10 space-y-4">
                            <div className="resume-profile-toprow flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-100 pb-3">
                                <div className="space-y-1 shrink-0 min-w-0 flex-1">
                                    <h2 className="resume-profile-role font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-950 whitespace-nowrap text-sm">
                                        {renderInlineText({
                                            value: profile.jobTitle,
                                            baseValue: origProfile?.jobTitle ?? '',
                                            textClassName:
                                                'font-black tracking-tight text-slate-900 text-sm',
                                            placeholder: '직무명을 입력하세요',
                                            onChange: (val) => setProfileOverride('jobTitle', val),
                                        })}
                                    </h2>
                                    <div className="flex items-baseline gap-2 whitespace-nowrap">
                                        <h1 className="resume-profile-name font-black text-slate-900 whitespace-nowrap text-lg sm:text-xl">
                                            {profile.name}
                                        </h1>
                                        <span className="resume-profile-name-en font-bold text-slate-400 font-mono whitespace-nowrap text-xs">
                                            {profile.nameEn}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="resume-print-contact flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-200 pb-2 text-slate-600 text-xs font-mono">
                                <span>{profile.email}</span>
                                <span>{profile.phone}</span>
                                <span>{profile.githubUrl.replace(/^https?:\/\//, '')}</span>
                                <span>unbrdn.me</span>
                            </div>
                            <div>
                                <div className="resume-body mt-1 max-w-4xl whitespace-pre-line break-words text-slate-600 text-xs pdf-body-text">
                                    {renderInlineText({
                                        value: profile.bio,
                                        baseValue: origProfile?.bio ?? '',
                                        multiline: true,
                                        textClassName: 'text-slate-600 text-xs pdf-body-text',
                                        placeholder: '자기소개 및 소개 문구를 입력하세요',
                                        onChange: (val) => setProfileOverride('bio', val),
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'skills':
                return (
                    <div
                        data-print-el
                        className="flex flex-col font-black text-slate-900 w-full mt-6 pt-2 relative"
                    >
                        {renderSectionGap('skills')}
                        {renderSectionControls('skills')}
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2 w-full">
                            <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                                <Cpu className="h-4 w-4 text-slate-900" />
                                기술 스택
                            </h2>
                            {inlineEditMode && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSkillSelectorModalOpen(true);
                                    }}
                                    className="absolute bottom-1 right-0 z-10 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1 text-xs font-black text-white shadow-xs hover:bg-blue-700 transition cursor-pointer print:hidden"
                                    title="DB 전체 기술 스택 선택 및 관리 모달 열기"
                                >
                                    <Settings className="h-3.5 w-3.5" />
                                    <span>⚙ DB 기술스택 선택/관리</span>
                                </button>
                            )}
                        </div>
                    </div>
                );

            case 'skills-group': {
                const fullGroup = groupCoreSkills(introData.skills).find(
                    (g) => g.value === atom.dataId
                );
                const activeGroup = groupedCoreSkills.find((g) => g.value === atom.dataId);
                // 편집 모드에서도 현재 선택된 기술만 렌더링해야 A4 높이와 줄바꿈이
                // 일반 미리보기와 동일하다. 추가 선택은 상단 기술 선택 모달에서 처리한다.
                const displaySkills = activeGroup?.skills ?? [];

                if (displaySkills.length === 0) return null;
                const itemId = `skills-group:${atom.dataId}`;
                const groupLabel = fullGroup?.label ?? activeGroup?.label ?? '';

                return (
                    <Fragment key={atom.id}>
                        {renderItemGap(itemId, 'skills')}
                        <div
                            data-print-el
                            className="py-3.5 border-b border-slate-100 last:border-b-0 w-full relative"
                        >
                            {renderItemControls(itemId)}
                            <div className="resume-skill-group space-y-1.5">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-0.5">
                                    <h4 className="resume-skill-group-title resume-subtitle flex items-center gap-2 font-black text-slate-500 text-xs">
                                        <span
                                            className="resume-skill-group-bar h-3 w-1 shrink-0 rounded-full bg-slate-900"
                                            aria-hidden
                                        />
                                        {groupLabel}
                                    </h4>
                                </div>
                                <div className="resume-skill-badges flex flex-wrap items-center gap-x-0.5 gap-y-1 border-l-2 border-slate-100 pl-2 pt-0.5">
                                    {displaySkills.map((skill, idx) => {
                                        const isSelected =
                                            !contentOverrides.selectedSkillIds ||
                                            contentOverrides.selectedSkillIds.includes(skill.id);
                                        const separator = idx > 0 && (
                                            <span
                                                aria-hidden
                                                className="mx-1.5 text-slate-300 font-normal"
                                            >
                                                ·
                                            </span>
                                        );

                                        if (!inlineEditMode) {
                                            return (
                                                <span
                                                    key={skill.id}
                                                    className="inline-flex items-center"
                                                >
                                                    {separator}
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-800">
                                                        {skill.name}
                                                        {skill.skillVersion && (
                                                            <span className="text-[8px] font-bold text-slate-400">
                                                                v{skill.skillVersion}
                                                            </span>
                                                        )}
                                                    </span>
                                                </span>
                                            );
                                        }

                                        return (
                                            <Fragment key={skill.id}>
                                                <span className="inline-flex items-center print:hidden">
                                                    {separator}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            toggleSkillSelection(skill.id);
                                                        }}
                                                        className={`inline-flex items-center gap-0.5 text-[10px] font-bold transition cursor-pointer ${
                                                            isSelected
                                                                ? 'text-slate-900 hover:text-rose-600'
                                                                : 'text-slate-400 line-through opacity-70 hover:text-blue-600'
                                                        }`}
                                                        title={
                                                            isSelected
                                                                ? `'${skill.name}' 템플릿에서 제외하기 (클릭)`
                                                                : `'${skill.name}' 템플릿에 포함하기 (클릭)`
                                                        }
                                                    >
                                                        <span>{skill.name}</span>
                                                        {skill.skillVersion && (
                                                            <span
                                                                className={
                                                                    isSelected
                                                                        ? 'text-[8px] font-bold text-slate-400'
                                                                        : 'text-[8px] font-bold text-slate-300'
                                                                }
                                                            >
                                                                v{skill.skillVersion}
                                                            </span>
                                                        )}
                                                    </button>
                                                </span>
                                                <span className="hidden items-center print:inline-flex">
                                                    {idx > 0 && (
                                                        <span
                                                            aria-hidden
                                                            className="mx-1.5 text-slate-300 font-normal"
                                                        >
                                                            ·
                                                        </span>
                                                    )}
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-800">
                                                        {skill.name}
                                                        {skill.skillVersion && (
                                                            <span className="text-[8px] font-bold text-slate-400">
                                                                v{skill.skillVersion}
                                                            </span>
                                                        )}
                                                    </span>
                                                </span>
                                            </Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </Fragment>
                );
            }

            case 'competency-header':
                return (
                    <div
                        data-print-el
                        className="resume-competency-header flex flex-col w-full mt-6 pt-2 relative"
                    >
                        {renderSectionGap('competencies')}
                        {renderSectionControls('competencies')}
                        <div className="flex items-center justify-start gap-2 border-b border-slate-200 pb-2 w-full">
                            <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                                <Sparkles className="h-4 w-4 text-slate-900" />
                                핵심 역량
                            </h2>
                        </div>
                    </div>
                );

            case 'competency-item': {
                const competency = orderedCompetencies.find((c) => c.id === atom.dataId);
                if (!competency) return null;
                const index = orderedCompetencies.indexOf(competency);
                const itemId = `competency:${competency.id}`;

                const origComp = introData.competencies.find((c) => c.id === competency.id);
                const origTitle = origComp?.title ?? competency.title;
                const origSummary = origComp?.summary ?? competency.summary;

                return (
                    <Fragment key={atom.id}>
                        {renderItemGap(itemId, 'competencies')}
                        <div data-print-el className="relative w-full">
                            {renderItemControls(itemId)}
                            <article className="print-competency-row grid gap-3 py-3.5 sm:grid-cols-[minmax(0,0.32fr)_minmax(0,0.68fr)] sm:gap-6 print:grid-cols-[minmax(0,0.31fr)_minmax(0,0.69fr)] print:gap-4 print:py-3.5 border-b border-slate-100 last:border-b-0 w-full">
                                <div className="min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="resume-label inline-block w-7 shrink-0 font-black tabular-nums tracking-[0.14em] text-slate-400 text-xs">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <h3 className="resume-item-title font-black text-slate-900 text-xs min-w-0 flex-1">
                                            {renderInlineText({
                                                value: competency.title,
                                                baseValue: origTitle,
                                                textClassName: 'font-black text-slate-900 text-xs',
                                                placeholder: '핵심 역량 제목을 입력하세요',
                                                onChange: (val) =>
                                                    setCompetencyOverride(
                                                        competency.id,
                                                        'title',
                                                        val,
                                                        origTitle
                                                    ),
                                            })}
                                        </h3>
                                    </div>
                                    {competency.skills.length > 0 && (
                                        <p className="resume-meta mt-1 pl-9 font-bold text-slate-500 text-[10px]">
                                            {competency.skills
                                                .slice(0, 6)
                                                .map((skill) => skill.name)
                                                .join(' · ')}
                                        </p>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="resume-body font-semibold text-slate-700 text-xs pdf-body-text">
                                        {renderInlineText({
                                            value: competency.summary,
                                            baseValue: origSummary,
                                            multiline: true,
                                            textClassName:
                                                'font-semibold text-slate-700 text-xs pdf-body-text',
                                            placeholder: '핵심 역량 요약 및 설명을 입력하세요',
                                            onChange: (val) =>
                                                setCompetencyOverride(
                                                    competency.id,
                                                    'summary',
                                                    val,
                                                    origSummary
                                                ),
                                        })}
                                    </div>
                                </div>
                            </article>
                        </div>
                    </Fragment>
                );
            }

            case 'career-header':
                return (
                    <div
                        data-print-el
                        className="mb-2 flex flex-col font-black text-slate-900 w-full mt-6 pt-2 relative"
                    >
                        {renderSectionGap('career')}
                        {renderSectionControls('career')}
                        <div className="flex items-center justify-start gap-2 border-b border-slate-200 pb-2 w-full">
                            <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                                <Briefcase className="h-4 w-4 text-slate-900" />
                                {careerSummary.trim()
                                    ? `직장 경력 (총 ${careerSummary})`
                                    : '직장 경력'}
                            </h2>
                        </div>
                    </div>
                );

            case 'career-company': {
                const career = orderedCareerCards.find((c) => c.id === atom.dataId);
                if (!career) return null;
                const itemId = `career-company:${career.id}`;
                const origExp = introData.experiences.find((e) => e.id === career.id);
                const origCompanyName = origExp?.companyName ?? career.companyName;
                const origSummary = origExp?.summary ?? career.summary ?? '';

                return (
                    <Fragment key={atom.id}>
                        {renderItemGap(itemId, 'career')}
                        <div
                            data-print-el
                            className="resume-career-company border-b border-slate-100 py-2.5 w-full relative"
                        >
                            {renderItemControls(itemId)}
                            <div className="resume-career-company-header flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <div className="resume-item-title flex min-w-0 flex-1 items-baseline gap-1.5 font-black text-slate-800 text-sm">
                                    {renderInlineText({
                                        value: career.companyName,
                                        baseValue: origCompanyName,
                                        fullWidth: false,
                                        textClassName: 'min-w-0 font-black text-slate-800 text-sm',
                                        placeholder: '회사명을 입력하세요',
                                        onChange: (val) =>
                                            setExperienceOverride(
                                                career.id,
                                                'title',
                                                val,
                                                origCompanyName
                                            ),
                                    })}
                                    {career.employmentType && (
                                        <span className="resume-meta shrink-0 whitespace-nowrap text-[10px] font-bold text-slate-500">
                                            {getEmploymentTypeLabel(career.employmentType)}
                                        </span>
                                    )}
                                </div>
                                <span className="resume-career-period resume-print-plain resume-meta shrink-0 whitespace-nowrap text-[10px] font-bold text-slate-500">
                                    {career.period}
                                </span>
                            </div>
                            {(career.department || career.role) && (
                                <p className="resume-meta mt-0.5 font-semibold text-slate-500 text-xs">
                                    {[career.department, career.role].filter(Boolean).join(' · ')}
                                </p>
                            )}
                            {career.summary && (
                                <div className="resume-body mt-1 text-xs pdf-body-text text-slate-600">
                                    {renderInlineText({
                                        value: career.summary ?? '',
                                        baseValue: origSummary,
                                        multiline: true,
                                        textClassName: 'text-xs text-slate-600',
                                        placeholder: '회사 및 담당업무 개요를 입력하세요',
                                        onChange: (val) =>
                                            setExperienceOverride(
                                                career.id,
                                                'summary',
                                                val,
                                                origSummary
                                            ),
                                    })}
                                </div>
                            )}
                        </div>
                    </Fragment>
                );
            }

            case 'career-item': {
                const career = orderedCareerCards.find((c) =>
                    c.projects.some((p) => p.id === atom.dataId)
                );
                const project = career?.projects.find((p) => p.id === atom.dataId);
                if (!project || !career) return null;
                const itemId = `career-project:${project.id}`;
                const hasDetails = project.details && project.details.length > 0;

                const origExp = introData.experiences
                    .flatMap((e) => (e.details ? [e] : []))
                    .find((e) => e.id === project.id);
                const origTitle = origExp?.title ?? project.title;
                const origSummary = origExp?.summary ?? project.summary ?? '';

                return (
                    <Fragment key={atom.id}>
                        {renderItemGap(itemId, 'career')}
                        <div
                            data-print-el
                            className={`w-full relative ${hasDetails ? 'pt-3.5 pb-2' : 'py-3.5 border-b border-slate-100 last:border-b-0'}`}
                        >
                            {renderItemControls(itemId)}
                            <div className="flex w-full items-start gap-2.5 text-left">
                                <span className="min-w-0 flex-1">
                                    <span className="resume-body block font-bold text-slate-900 text-[13px]">
                                        {renderInlineText({
                                            value: project.title,
                                            baseValue: origTitle,
                                            textClassName: 'font-bold text-slate-900 text-[13px]',
                                            placeholder: '프로젝트 제목을 입력하세요',
                                            onChange: (val) =>
                                                setExperienceOverride(
                                                    project.id,
                                                    'title',
                                                    val,
                                                    origTitle
                                                ),
                                        })}
                                    </span>
                                    <span className="resume-meta mt-0.5 block text-slate-400 text-[10px]">
                                        {project.periodStart.replace(/-/g, '.').substring(0, 7)} -{' '}
                                        {project.periodEnd
                                            ? project.periodEnd.replace(/-/g, '.').substring(0, 7)
                                            : '진행 중'}
                                        {project.contributionRate != null
                                            ? ` · 기여도 ${project.contributionRate}%`
                                            : ''}
                                    </span>
                                </span>
                            </div>
                            {project.summary && (
                                <div className="mt-1.5">
                                    <h4 className="resume-label font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                                        프로젝트 설명 및 역할
                                    </h4>
                                    <div className="resume-body mt-0.5 text-xs pdf-body-text text-slate-600">
                                        {renderInlineText({
                                            value: project.summary ?? '',
                                            baseValue: origSummary,
                                            multiline: true,
                                            textClassName: 'text-xs text-slate-600',
                                            placeholder: '프로젝트 설명 및 역할을 입력하세요',
                                            onChange: (val) =>
                                                setExperienceOverride(
                                                    project.id,
                                                    'summary',
                                                    val,
                                                    origSummary
                                                ),
                                        })}
                                    </div>
                                </div>
                            )}
                            {project.skills && project.skills.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {project.skills.map((s) => (
                                        <span
                                            key={s.id}
                                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 border border-slate-200/60"
                                        >
                                            {s.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Fragment>
                );
            }

            case 'career-detail-item': {
                const allProjects = orderedCareerCards.flatMap((c) => c.projects);
                const p = allProjects.find((proj) =>
                    proj.details?.some((d) => d.id === atom.dataId)
                );
                const detail = p?.details?.find((d) => d.id === atom.dataId);
                if (!detail || !p) return null;
                const itemId = `career-detail:${detail.id}`;

                const origDetail = introData.experiences
                    .flatMap((e) => e.details)
                    .find((d) => d?.id === detail.id);
                const origContent = origDetail?.content ?? detail.content;
                const origNarrative =
                    origDetail?.narrative ||
                    [origDetail?.situation, origDetail?.actionDetail, origDetail?.outcome]
                        .filter(Boolean)
                        .join('\n\n') ||
                    '';

                return (
                    <Fragment key={atom.id}>
                        {renderItemGap(itemId, 'career')}
                        <div
                            data-print-el
                            className="py-1.5 pl-0 border-b border-slate-100/60 last:border-b-0 w-full relative"
                        >
                            {renderItemControls(itemId)}
                            <div className="flex items-start gap-1 font-semibold text-slate-700 text-xs">
                                <span className="shrink-0">•</span>
                                {renderInlineText({
                                    value: detail.content,
                                    baseValue: origContent,
                                    textClassName: 'font-semibold text-slate-700 text-xs',
                                    placeholder: '상세 성과 제목을 입력하세요',
                                    onChange: (val) =>
                                        setDetailOverride(detail.id, 'content', val, origContent),
                                })}
                            </div>
                            {renderDetailFields(
                                detail,
                                inlineEditMode,
                                origNarrative,
                                (val) =>
                                    setDetailOverride(detail.id, 'narrative', val, origNarrative),
                                renderInlineText
                            )}
                        </div>
                    </Fragment>
                );
            }

            case 'credentials-header':
                return (
                    <div
                        data-print-el
                        className="flex flex-col font-black text-slate-900 w-full mt-6 pt-2 relative"
                    >
                        {renderSectionGap('credentials')}
                        {renderSectionControls('credentials')}
                        <div className="flex items-center justify-start gap-2 border-b border-slate-200 pb-2 w-full">
                            <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                                <GraduationCap className="h-4 w-4 text-slate-900" />
                                학력·교육 및 자격증
                            </h2>
                        </div>
                    </div>
                );

            case 'credential-item': {
                const cred = orderedCredentialExperiences.find((c) => c.id === atom.dataId);
                if (!cred) return null;
                const itemId = `credential:${cred.id}`;
                const kind = credentialKindLabel(cred);
                const academicMeta =
                    kind === '학력'
                        ? [
                              cred.institutionName,
                              cred.degree,
                              cred.major,
                              cred.gpa ? `학점 ${cred.gpa}` : undefined,
                              cred.graduationStatus
                                  ? graduationStatusLabel(cred.graduationStatus)
                                  : undefined,
                          ]
                              .filter(Boolean)
                              .join(' · ')
                        : undefined;

                return (
                    <Fragment key={atom.id}>
                        {renderItemGap(itemId, 'credentials')}
                        <article
                            data-print-el
                            className="py-2.5 border-b border-slate-100 last:border-b-0 w-full relative flex flex-col"
                        >
                            {renderItemControls(itemId)}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="resume-label rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 shrink-0">
                                        {kind}
                                    </span>
                                    <h3 className="font-bold text-slate-900 text-xs truncate">
                                        {cred.title}
                                    </h3>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                    {formatCredentialPeriod(cred)}
                                </span>
                            </div>
                            {academicMeta && (
                                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                                    {academicMeta}
                                </p>
                            )}
                            {kind === '교육' && cred.summary && (
                                <p className="mt-1 text-xs text-slate-600 pdf-body-text">
                                    {cred.summary}
                                </p>
                            )}
                        </article>
                    </Fragment>
                );
            }

            case 'projects-header':
                return (
                    <div
                        data-print-el
                        className="flex flex-col font-black text-slate-900 w-full mt-6 pt-2 relative"
                    >
                        {renderSectionGap('projects')}
                        {renderSectionControls('projects')}
                        <div className="flex items-center justify-start gap-2 border-b border-slate-200 pb-2 w-full">
                            <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                                <FolderGit2 className="h-4 w-4 text-slate-900" />
                                핵심 프로젝트 포트폴리오
                            </h2>
                        </div>
                    </div>
                );

            case 'project-item': {
                const m = orderedMilestones.find((item) => item.id === atom.dataId);
                if (!m) return null;
                const itemId = `project:${m.id}`;
                const hasDetails = m.details && m.details.length > 0;

                return (
                    <Fragment key={atom.id}>
                        {renderItemGap(itemId, 'projects')}
                        <article
                            data-print-el
                            className={`w-full relative flex flex-col ${hasDetails ? 'pt-3.5 pb-2' : 'py-3.5 border-b border-slate-100 last:border-b-0'}`}
                        >
                            {renderItemControls(itemId)}
                            <div className="resume-project-heading flex items-baseline justify-between gap-2">
                                <h3 className="font-black text-slate-900 text-xs">{m.title}</h3>
                                <span className="resume-project-period text-[10px] text-slate-400 font-mono shrink-0">
                                    {m.period}
                                </span>
                            </div>
                            {m.role && (
                                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                    {m.role}
                                </p>
                            )}
                            {m.description && (
                                <p className="mt-1 text-xs text-slate-600">{m.description}</p>
                            )}
                            {m.skills && m.skills.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {m.skills.map((s) => (
                                        <span
                                            key={s}
                                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 border border-slate-200/60"
                                        >
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </article>
                    </Fragment>
                );
            }

            case 'project-detail-item': {
                const m = orderedMilestones.find((item) =>
                    item.details?.some((d) => d.id === atom.dataId)
                );
                const detail = m?.details?.find((d) => d.id === atom.dataId);
                if (!detail || !m) return null;
                const itemId = `project-detail:${detail.id}`;

                const origDetail = introData.experiences
                    .flatMap((e) => e.details)
                    .find((d) => d?.id === detail.id);
                const origContent = origDetail?.content ?? detail.content;
                const origNarrative =
                    origDetail?.narrative ||
                    [origDetail?.situation, origDetail?.actionDetail, origDetail?.outcome]
                        .filter(Boolean)
                        .join('\n\n') ||
                    '';

                return (
                    <Fragment key={atom.id}>
                        {renderItemGap(itemId, 'projects')}
                        <div
                            data-print-el
                            className="py-1.5 pl-0 border-b border-slate-100/60 last:border-b-0 w-full relative"
                        >
                            {renderItemControls(itemId)}
                            <div className="flex items-start gap-1 font-bold text-slate-900 text-xs">
                                <span className="shrink-0">•</span>
                                {renderInlineText({
                                    value: detail.content,
                                    baseValue: origContent,
                                    textClassName: 'font-bold text-slate-900 text-xs',
                                    placeholder: '상세 성과 제목을 입력하세요',
                                    onChange: (val) =>
                                        setDetailOverride(detail.id, 'content', val, origContent),
                                })}
                            </div>
                            {renderDetailFields(
                                detail,
                                inlineEditMode,
                                origNarrative,
                                (val) =>
                                    setDetailOverride(detail.id, 'narrative', val, origNarrative),
                                renderInlineText
                            )}
                        </div>
                    </Fragment>
                );
            }

            case 'cover-letter-header':
                return (
                    <div
                        data-print-el
                        className="flex flex-col font-black text-slate-900 w-full mt-6 pt-2 relative"
                    >
                        {renderSectionGap('cover-letter')}
                        {renderSectionControls('cover-letter')}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 w-full">
                            <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                                <MessageSquareText className="h-4 w-4 text-slate-900" />
                                {inlineEditMode ? (
                                    renderInlineText({
                                        value: coverLetterSectionTitle,
                                        baseValue: '지원 문항',
                                        textClassName:
                                            'font-black text-slate-900 text-sm sm:text-base',
                                        placeholder: '섹션 제목 입력 (예: 사전질문, 추가 항목)',
                                        onChange: (val) =>
                                            setCoverLetterSectionTitle(val ?? '지원 문항'),
                                    })
                                ) : (
                                    <span>{coverLetterSectionTitle || '지원 문항'}</span>
                                )}
                            </h2>
                            {inlineEditMode && (
                                <button
                                    type="button"
                                    onClick={addCoverLetterItem}
                                    className="absolute bottom-1 right-0 z-10 print:hidden flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-blue-700"
                                >
                                    <Plus className="h-3 w-3" />
                                    항목 추가
                                </button>
                            )}
                        </div>
                    </div>
                );

            case 'cover-letter-item': {
                const item = orderedCoverLetterItems.find((c) => c.id === atom.dataId);
                if (!item) return null;
                const itemId = `cover-letter-item:${item.id}`;
                const isAdded = item.id < 0;
                const origItem = coverLetterItems.find((c) => c.id === item.id);
                const origQuestion = isAdded
                    ? item.question
                    : (origItem?.question ?? item.question);
                const origAnswer = isAdded ? item.answer : (origItem?.answer ?? item.answer);
                const onQuestionChange = isAdded
                    ? (val: string | undefined) =>
                          updateAddedCoverLetterItem(item.id, 'question', val)
                    : (val: string | undefined) =>
                          setCoverLetterOverride(item.id, 'question', val, origQuestion);
                const onAnswerChange = isAdded
                    ? (val: string | undefined) =>
                          updateAddedCoverLetterItem(item.id, 'answer', val)
                    : (val: string | undefined) =>
                          setCoverLetterOverride(item.id, 'answer', val, origAnswer);

                return (
                    <Fragment key={atom.id}>
                        {renderItemGap(itemId, 'cover-letter')}
                        <div
                            data-print-el
                            className="py-2.5 border-b border-slate-100 last:border-b-0 w-full relative"
                        >
                            {renderItemControls(itemId)}
                            {inlineEditMode && isAdded && (
                                <button
                                    type="button"
                                    onClick={() => removeAddedCoverLetterItem(item.id)}
                                    title="추가한 질문 삭제"
                                    className="print:hidden absolute right-8 top-2 z-20 rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white hover:bg-rose-600"
                                >
                                    삭제
                                </button>
                            )}
                            <div className="flex items-start gap-1 font-bold text-slate-900 text-xs">
                                <span className="shrink-0">Q.</span>
                                {renderInlineText({
                                    value: item.question,
                                    baseValue: origQuestion,
                                    textClassName: 'font-bold text-slate-900 text-xs',
                                    placeholder: '질문을 입력하세요',
                                    onChange: onQuestionChange,
                                })}
                            </div>
                            {inlineEditMode ? (
                                <div className="resume-detail-text relative mt-1 text-[12px] pdf-body-text text-slate-600">
                                    <div aria-hidden="true" className="invisible">
                                        <ReactMarkdown components={resumeMarkdownComponents}>
                                            {item.answer}
                                        </ReactMarkdown>
                                    </div>
                                    <div className="absolute inset-0">
                                        {renderInlineText({
                                            value: item.answer,
                                            baseValue: origAnswer,
                                            multiline: true,
                                            textClassName:
                                                'h-full text-[12px] pdf-body-text text-slate-600',
                                            placeholder: '답변을 입력하세요',
                                            onChange: onAnswerChange,
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="resume-detail-text mt-1 text-[12px] pdf-body-text text-slate-600">
                                    <ReactMarkdown components={resumeMarkdownComponents}>
                                        {item.answer}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </Fragment>
                );
            }

            case 'custom-section-header': {
                const section = contentOverrides.customSections?.find(
                    (entry) => entry.id === atom.dataId
                );
                if (!section) return null;
                const sectionId = `custom-section:${section.id}`;
                return (
                    <div
                        id={sectionId}
                        data-print-el
                        className="mt-6 flex w-full flex-col pt-2 font-black text-slate-900 relative"
                    >
                        {renderSectionGap(sectionId)}
                        {renderSectionControls(sectionId)}
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                            <MessageSquareText className="h-4 w-4 shrink-0 text-slate-900" />
                            <div className="min-w-0 flex-1">
                                {renderInlineText({
                                    value: section.title,
                                    baseValue: section.title,
                                    textClassName: 'font-black text-slate-900 text-sm sm:text-base',
                                    placeholder: '섹션 제목을 입력하세요',
                                    onChange: (value) =>
                                        updateCustomSection(section.id, (current) => ({
                                            ...current,
                                            title: value ?? '',
                                        })),
                                })}
                            </div>
                            {inlineEditMode && (
                                <div className="print:hidden flex shrink-0 items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => addCustomSectionItem(section.id)}
                                        className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-blue-700"
                                    >
                                        <Plus className="h-3 w-3" /> 항목 추가
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeCustomSection(section.id)}
                                        className="rounded bg-rose-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-rose-600"
                                    >
                                        섹션 삭제
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            }

            case 'custom-section-item': {
                const [sectionId, itemId] = String(atom.dataId).split(':');
                const section = contentOverrides.customSections?.find(
                    (entry) => entry.id === sectionId
                );
                const item = section?.items.find((entry) => entry.id === itemId);
                if (!section || !item) return null;
                const atomId = `custom-section-item:${sectionId}:${itemId}`;
                return (
                    <div
                        data-print-el
                        className="relative w-full border-b border-slate-100 py-2.5 last:border-b-0"
                    >
                        {renderItemGap(atomId, 'cover-letter')}
                        {renderItemControls(atomId)}
                        {inlineEditMode && (
                            <button
                                type="button"
                                onClick={() => removeCustomSectionItem(sectionId, itemId)}
                                className="print:hidden absolute right-8 top-2 z-20 rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white hover:bg-rose-600"
                            >
                                삭제
                            </button>
                        )}
                        {renderInlineText({
                            value: item.title,
                            baseValue: item.title,
                            textClassName: 'font-bold text-slate-900 text-xs',
                            placeholder: '항목 제목을 입력하세요',
                            onChange: (value) =>
                                updateCustomSectionItem(sectionId, itemId, 'title', value),
                        })}
                        <div className="mt-1 text-[12px] text-slate-600">
                            {renderInlineText({
                                value: item.content,
                                baseValue: item.content,
                                multiline: true,
                                textClassName: 'text-[12px] pdf-body-text text-slate-600',
                                placeholder: '항목 내용을 입력하세요',
                                onChange: (value) =>
                                    updateCustomSectionItem(sectionId, itemId, 'content', value),
                            })}
                        </div>
                    </div>
                );
            }

            default:
                return null;
        }
    };

    const handlePrintConfirm = () => {
        printLayoutFrozenRef.current = false;
        store.setPrintPending(true);
    };

    useEffect(() => {
        if (!store.printPending) return;
        let cancelled = false;
        const nextFrame = () =>
            new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const waitAtMost = async (promise: Promise<unknown>, timeoutMs = 5000) => {
            let timer = 0;
            await Promise.race([
                promise.catch(() => undefined),
                new Promise<void>((resolve) => {
                    timer = window.setTimeout(resolve, timeoutMs);
                }),
            ]);
            window.clearTimeout(timer);
        };
        const printWhenLayoutIsStable = async () => {
            await waitAtMost(document.fonts.ready);
            if (cancelled) return;
            await Promise.all(
                Array.from(document.querySelectorAll<HTMLImageElement>('.pdf-page-layer img')).map(
                    async (image) => {
                        if (!image.complete) {
                            await new Promise<void>((resolve) => {
                                let timer = 0;
                                const finish = () => {
                                    window.clearTimeout(timer);
                                    image.removeEventListener('load', finish);
                                    image.removeEventListener('error', finish);
                                    resolve();
                                };
                                image.addEventListener('load', finish);
                                image.addEventListener('error', finish);
                                timer = window.setTimeout(finish, 5000);
                                if (image.complete) finish();
                            });
                        }
                        await waitAtMost(image.decode());
                    }
                )
            );
            await nextFrame();
            await nextFrame();
            if (cancelled) return;

            printLayoutFrozenRef.current = true;
            try {
                window.print();
            } catch {
                printLayoutFrozenRef.current = false;
            } finally {
                if (!cancelled) store.setPrintPending(false);
            }
        };
        void printWhenLayoutIsStable();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.printPending]);

    const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);

    const handleSaveLocalTemplate = () => {
        const defaultName = generateUniqueLocalName('내 맞춤 인쇄 설정');
        const memo = window.prompt('현재 인쇄 설정에 대한 설명/메모를 입력하세요:', defaultName);
        if (memo === null) return;
        const trimmed = memo.trim() || defaultName;
        const existingSaves = getLocalSaves();
        if (existingSaves.some((save) => save.memo.trim() === trimmed)) {
            const confirmed = window.confirm(
                `'${trimmed}' 이름의 인쇄 설정이 이미 존재합니다.\n\n기존 설정을 덮어쓰시겠습니까?`
            );
            if (!confirmed) return;
        }
        saveLocal({
            memo: trimmed,
            excludedIds: store.printExcludedIds,
            sectionOrder: store.printSectionOrder,
            sectionGaps: store.sectionGaps,
            forcedPageOverrides: store.forcedPageOverrides,
            outputLayout: store.outputLayout,
            itemOrderOverrides: store.itemOrderOverrides,
            contentOverrides,
        });
        alert(`'${trimmed}' 인쇄 설정이 성공적으로 저장되었습니다.`);
    };

    const navItemGroups = useMemo(
        () => [
            {
                sectionId: 'skills',
                scopeId: 'group:skills',
                items: orderedSkillGroups.map((group) => ({
                    id: `skills-group:${group.value}`,
                    label: group.label,
                })),
            },
            {
                sectionId: 'competencies',
                scopeId: 'group:competencies',
                items: orderedCompetencies.map((c) => ({
                    id: `competency:${c.id}`,
                    label: c.title,
                })),
            },
            {
                sectionId: 'career',
                scopeId: 'group:career-company',
                items: orderedCareerCards.map((career) => ({
                    id: `career-company:${career.id}`,
                    label: career.companyName,
                    scopeId: `career-company:${career.id}`,
                    children: career.projects.map((p) => ({
                        id: `career-project:${p.id}`,
                        label: p.title,
                        scopeId: `career-project:${p.id}`,
                        children: p.details.map((d) => ({
                            id: `career-detail:${d.id}`,
                            label: d.content,
                        })),
                    })),
                })),
            },
            {
                sectionId: 'credentials',
                scopeId: 'group:credentials',
                items: orderedCredentialExperiences.map((c) => ({
                    id: `credential:${c.id}`,
                    label: c.title,
                })),
            },
            {
                sectionId: 'projects',
                scopeId: 'group:projects',
                items: orderedMilestones.map((m) => ({
                    id: `project:${m.id}`,
                    label: m.title,
                    scopeId: `project:${m.id}`,
                    children: m.details.map((d) => ({
                        id: `project-detail:${d.id}`,
                        label: d.content,
                    })),
                })),
            },
            {
                sectionId: 'cover-letter',
                scopeId: 'group:cover-letter',
                items: orderedCoverLetterItems.map((item) => ({
                    id: `cover-letter-item:${item.id}`,
                    label: item.question || '제목 없는 지원 문항',
                })),
            },
            ...orderedCustomSections.map((section) => ({
                sectionId: `custom-section:${section.id}`,
                scopeId: `custom-section:${section.id}`,
                items: section.items.map((item) => ({
                    id: `custom-section-item:${section.id}:${item.id}`,
                    label: item.title || '제목 없는 항목',
                })),
            })),
        ],
        [
            orderedSkillGroups,
            orderedCompetencies,
            orderedCareerCards,
            orderedCredentialExperiences,
            orderedMilestones,
            orderedCoverLetterItems,
            orderedCustomSections,
        ]
    );

    const placementByAtomId = useMemo(
        () =>
            new Map(
                store.outputLayout.placements.map((placement) => [placement.atomId, placement])
            ),
        [store.outputLayout.placements]
    );
    const placeAtomBeside = (
        pageIndex: number,
        draggedAtomId: string,
        targetAtomId: string,
        side: 'left' | 'right'
    ) => {
        if (draggedAtomId === targetAtomId) return;
        const pageLayer = pageLayers[pageIndex];
        if (!pageLayer) return;
        const { rows } = getOutputPageAt(store.outputLayout, pageIndex);
        const validAtomIds = new Set(pageLayer.items.map((atom) => atom.id));
        const firstRegionId = rows[0]?.regions[0]?.id;
        const atomsByRegionId = new Map<string, string[]>();
        pageLayer.items.forEach((atom) => {
            const placement = placementByAtomId.get(atom.id);
            const regionId =
                placement &&
                rows.some(({ regions }) => regions.some((r) => r.id === placement.regionId))
                    ? placement.regionId
                    : firstRegionId;
            if (!regionId) return;
            atomsByRegionId.set(regionId, [...(atomsByRegionId.get(regionId) ?? []), atom.id]);
        });
        atomsByRegionId.forEach((atomIds) =>
            atomIds.sort((left, right) => {
                const leftOrder = placementByAtomId.get(left)?.order;
                const rightOrder = placementByAtomId.get(right)?.order;
                if (leftOrder === undefined || rightOrder === undefined) return 0;
                return leftOrder - rightOrder;
            })
        );

        const draggedIds = getAssociatedAtomIds(draggedAtomId).filter((id) => validAtomIds.has(id));
        const draggedSet = new Set(draggedIds);
        const targetIds = new Set(
            getAssociatedAtomIds(targetAtomId).filter(
                (id) => validAtomIds.has(id) && !draggedSet.has(id)
            )
        );
        if (draggedIds.length === 0 || targetIds.size === 0) return;

        const composition = rows
            .map(({ regions }) =>
                regions
                    .map((region) =>
                        (atomsByRegionId.get(region.id) ?? []).filter((id) => !draggedSet.has(id))
                    )
                    .filter((column) => column.length > 0)
            )
            .filter((row) => row.length > 0);
        const rowIndex = composition.findIndex((row) =>
            row.some((column) => column.some((id) => targetIds.has(id)))
        );
        if (rowIndex < 0) return;
        const columnIndex = composition[rowIndex].findIndex((column) =>
            column.some((id) => targetIds.has(id))
        );
        if (columnIndex < 0) return;

        const targetRow = composition[rowIndex];
        if (targetRow.length === 1) {
            const targetColumn = targetRow[0];
            const targetIndexes = targetColumn.flatMap((id, index) =>
                targetIds.has(id) ? [index] : []
            );
            const start = Math.min(...targetIndexes);
            const end = Math.max(...targetIndexes);
            const before = targetColumn.slice(0, start);
            const targetUnit = targetColumn.slice(start, end + 1);
            const after = targetColumn.slice(end + 1);
            const replacement = [
                ...(before.length > 0 ? [[before]] : []),
                [
                    side === 'left' ? draggedIds : targetUnit,
                    side === 'left' ? targetUnit : draggedIds,
                ],
                ...(after.length > 0 ? [[after]] : []),
            ];
            composition.splice(rowIndex, 1, ...replacement);
        } else if (targetRow.length < 3) {
            targetRow.splice(side === 'left' ? columnIndex : columnIndex + 1, 0, draggedIds);
        } else {
            return;
        }
        store.replacePageComposition(pageIndex, composition);
    };

    const renderCanvasAtom = (atom: PrintAtomItem, draggable: boolean, pageIndex: number) => (
        <div
            key={atom.id}
            data-atom-id={atom.id}
            draggable={draggable && atom.id !== 'intro-profile' && !inlineEditMode}
            onDragStart={(event: DragEvent<HTMLDivElement>) => {
                if (!draggable || atom.id === 'intro-profile' || inlineEditMode) {
                    event.preventDefault();
                    return;
                }
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', atom.id);
                const dragPreview = document.createElement('canvas');
                dragPreview.width = 220;
                dragPreview.height = 40;
                const context = dragPreview.getContext('2d');
                if (context) {
                    context.fillStyle = '#0f172a';
                    context.beginPath();
                    context.roundRect(0, 0, 220, 40, 10);
                    context.fill();
                    context.fillStyle = '#ffffff';
                    context.font = '700 13px sans-serif';
                    context.fillText('블록 이동 중', 16, 25);
                }
                event.dataTransfer.setDragImage(dragPreview, 18, 20);
                setDraggedCanvasAtomId(atom.id);
            }}
            onDragEnd={() => {
                setDraggedCanvasAtomId(null);
                setDragOverRegion(null);
                setDragOverAtom(null);
            }}
            className={`group/atom relative w-full min-w-0 ${
                draggable && atom.id !== 'intro-profile' && !inlineEditMode
                    ? 'cursor-grab active:cursor-grabbing'
                    : ''
            }`}
            title={
                draggable && atom.id !== 'intro-profile' && !inlineEditMode
                    ? '항목을 끌어 왼쪽 또는 오른쪽 열로 옮길 수 있습니다.'
                    : undefined
            }
        >
            {draggable &&
                atom.id !== 'intro-profile' &&
                !inlineEditMode &&
                !store.hidePrintGuides && (
                    <span className="pointer-events-none absolute -left-4 top-1 z-20 hidden h-5 w-4 items-center justify-center rounded bg-slate-900/85 text-white shadow-sm group-hover/atom:flex print:hidden">
                        <GripVertical className="h-3 w-3" />
                    </span>
                )}
            {draggable &&
                atom.id !== 'intro-profile' &&
                !inlineEditMode &&
                draggedCanvasAtomId &&
                draggedCanvasAtomId !== atom.id && (
                    <>
                        {(['left', 'right'] as const).map((side) => {
                            const active =
                                dragOverAtom?.pageIndex === pageIndex &&
                                dragOverAtom.atomId === atom.id &&
                                dragOverAtom.side === side;
                            return (
                                <div
                                    key={side}
                                    className={`absolute inset-y-0 z-40 w-[22%] min-w-10 max-w-20 print:hidden ${side === 'left' ? '-left-2' : '-right-2'}`}
                                    onDragEnter={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        setDragOverAtom({ pageIndex, atomId: atom.id, side });
                                    }}
                                    onDragOver={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        event.dataTransfer.dropEffect = 'move';
                                        setDragOverAtom({ pageIndex, atomId: atom.id, side });
                                    }}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        const draggedId =
                                            draggedCanvasAtomId ||
                                            event.dataTransfer.getData('text/plain');
                                        if (draggedId)
                                            placeAtomBeside(pageIndex, draggedId, atom.id, side);
                                        setDraggedCanvasAtomId(null);
                                        setDragOverRegion(null);
                                        setDragOverAtom(null);
                                    }}
                                >
                                    {active && (
                                        <span
                                            className={`pointer-events-none absolute inset-y-1 flex w-1 items-center rounded-full bg-blue-600 shadow-[0_0_0_4px_rgba(59,130,246,0.18)] ${side === 'left' ? 'left-0' : 'right-0'}`}
                                        >
                                            <span
                                                className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-blue-600 px-2 py-1 text-[9px] font-black text-white shadow-lg ${side === 'left' ? 'left-2' : 'right-2'}`}
                                            >
                                                {side === 'left' ? '왼쪽에 배치' : '오른쪽에 배치'}
                                            </span>
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}
            {renderAtomContent(atom)}
        </div>
    );

    const renderOutputRegion = (
        pageIndex: number,
        region: OutputRegion,
        columnIndex: number,
        atoms: PrintAtomItem[]
    ) => {
        const isOver =
            dragOverRegion?.pageIndex === pageIndex && dragOverRegion.regionId === region.id;
        const regionKey = `${pageIndex}:${region.id}`;
        const isOverflowing = overflowRegionKeys.includes(regionKey);
        const label = `${columnIndex + 1}번째 열`;

        return (
            <div
                key={region.id}
                data-output-region-key={regionKey}
                className={`relative h-full min-w-0 ${!store.hidePrintGuides ? 'min-h-[24mm]' : ''}`}
                onDragEnter={(event) => {
                    if (!draggedCanvasAtomId) return;
                    event.preventDefault();
                    setDragOverRegion({ pageIndex, regionId: region.id });
                }}
                onDragOver={(event) => {
                    if (!draggedCanvasAtomId) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDragOverRegion({ pageIndex, regionId: region.id });
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    const atomId = draggedCanvasAtomId || event.dataTransfer.getData('text/plain');
                    if (atomId) {
                        store.placeAtomsInRegionById(getAssociatedAtomIds(atomId), region.id);
                    }
                    setDraggedCanvasAtomId(null);
                    setDragOverRegion(null);
                }}
            >
                {!store.hidePrintGuides && (
                    <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute inset-0 z-10 rounded-md border-2 border-dashed transition print:hidden ${
                            isOverflowing
                                ? 'border-rose-500 bg-rose-50/20'
                                : isOver
                                  ? 'border-blue-500 bg-blue-100/35 shadow-[inset_0_0_0_2px_rgba(59,130,246,0.16)]'
                                  : 'border-slate-300/70'
                        }`}
                    >
                        {isOver && (
                            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black text-white shadow-xl">
                                {label}에 배치
                            </span>
                        )}
                        {isOverflowing && (
                            <span className="absolute bottom-1 right-1 rounded bg-rose-600 px-2 py-1 text-[9px] font-black text-white shadow">
                                열 높이 초과
                            </span>
                        )}
                    </div>
                )}
                <div className="relative z-0 flex min-w-0 flex-col">
                    {atoms.map((atom) => renderCanvasAtom(atom, true, pageIndex))}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="h-screen overflow-hidden flex flex-col bg-slate-900 print:h-auto print:overflow-visible print:bg-white">
                <PrintPreviewBar
                    excludedCount={store.printExcludedIds.length}
                    totalPages={pageLayers.length}
                    navOpen={store.navPanelOpen}
                    activeTemplateName={activeTemplateName}
                    onToggleNav={() => store.setNavPanelOpen(!store.navPanelOpen)}
                    onSaveLocal={handleSaveLocalTemplate}
                    onSaveServer={adminMode ? () => setSaveTemplateModalOpen(true) : undefined}
                    onOpenTemplateModal={() => setModeModalOpen(true)}
                    onPrint={handlePrintConfirm}
                    onCancel={onExit}
                    zoom={store.zoom}
                    onZoomChange={store.setZoom}
                    onZoomFit={handleZoomFit}
                    lineHeight={store.lineHeight}
                    onLineHeightChange={store.setLineHeight}
                    hideGuides={store.hidePrintGuides}
                    onToggleHideGuides={store.toggleHidePrintGuides}
                    inlineEditMode={inlineEditMode}
                    onToggleInlineEditMode={() => setInlineEditMode(!inlineEditMode)}
                    aiChatOpen={aiChatOpen}
                    onToggleAiChat={canRevise ? () => setAiChatOpen((v) => !v) : undefined}
                    canUndo={historyAvailability.canUndo}
                    canRedo={historyAvailability.canRedo}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    marginSettingsOpen={marginSettingsOpen}
                    onToggleMarginSettings={() => setMarginSettingsOpen((open) => !open)}
                    integratedDocumentSettings
                />

                {inlineEditMode && (
                    <div className="bg-slate-950 border-b border-blue-500/40 px-4 py-2 text-xs font-bold text-blue-200 flex items-center justify-center gap-3 shadow-md print:hidden shrink-0 z-40">
                        <div className="flex min-w-0 items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
                            <span>
                                ✍️ 인라인 문구 편집 모드 활성화: A4 종이 위의 파란색 테두리 텍스트를
                                클릭하여 맞춤 문구를 직접 수정하세요. 상단 &apos;템플릿으로
                                저장&apos; 클릭 시 함께 저장됩니다.
                            </span>
                        </div>
                    </div>
                )}

                <div className="flex-1 min-h-0 flex">
                    {marginSettingsOpen && (
                        <aside
                            className="relative shrink-0 overflow-y-auto border-r border-slate-700 bg-slate-950 text-white shadow-2xl print:hidden"
                            style={{ width: documentSettingsWidth }}
                            aria-label="문서 설정"
                        >
                            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
                                <div>
                                    <p className="text-sm font-black">문서 설정</p>
                                    <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                                        현재 템플릿의 모든 페이지에 적용
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setMarginSettingsOpen(false)}
                                    className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                                    aria-label="문서 설정 닫기"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <nav
                                className="grid grid-cols-3 gap-1 border-b border-slate-800 p-2"
                                aria-label="문서 설정 분류"
                            >
                                {(
                                    [
                                        ['paper', '용지'],
                                        ['typography', '글꼴·간격'],
                                        ['composition', '구성'],
                                        ['view', '보기'],
                                        ['template', '템플릿'],
                                    ] as const
                                ).map(([tab, label]) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setDocumentSettingsTab(tab)}
                                        aria-pressed={documentSettingsTab === tab}
                                        className={`h-8 rounded-md px-2 text-[10px] font-black transition ${
                                            documentSettingsTab === tab
                                                ? 'bg-blue-600 text-white'
                                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </nav>
                            <div className="space-y-5 p-4">
                                {documentSettingsTab === 'paper' && (
                                    <section>
                                        <div className="mb-3 flex items-center justify-between">
                                            <div>
                                                <h2 className="text-xs font-black">페이지 여백</h2>
                                                <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                                                    위·오른쪽·아래·왼쪽 순서로 A4 공통 여백을
                                                    설정합니다.
                                                </p>
                                            </div>
                                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-black text-slate-300">
                                                mm
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(
                                                [
                                                    ['top', '위'],
                                                    ['right', '오른쪽'],
                                                    ['bottom', '아래'],
                                                    ['left', '왼쪽'],
                                                ] as const
                                            ).map(([side, label]) => (
                                                <label
                                                    key={side}
                                                    className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-[10px] font-bold text-slate-300"
                                                >
                                                    {label}
                                                    <input
                                                        type="number"
                                                        min={5}
                                                        max={30}
                                                        step={1}
                                                        value={store.outputLayout.pageMargins[side]}
                                                        onChange={(event) =>
                                                            store.setPageMargins({
                                                                [side]: Number(event.target.value),
                                                            })
                                                        }
                                                        className="mt-1 block h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-sm font-black text-white outline-none focus:border-blue-400"
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                store.setPageMargins({
                                                    top: 12,
                                                    right: 14,
                                                    bottom: 12,
                                                    left: 14,
                                                })
                                            }
                                            className="mt-3 h-9 w-full rounded-lg border border-slate-700 text-[10px] font-black text-slate-200 transition hover:bg-slate-800"
                                        >
                                            기본 여백으로 초기화
                                        </button>
                                    </section>
                                )}
                                {documentSettingsTab === 'paper' && (
                                    <section className="border-t border-slate-800 pt-4">
                                        <h2 className="text-xs font-black">페이지 구성</h2>
                                        <dl className="mt-3 space-y-2 text-[10px]">
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-slate-400">용지</dt>
                                                <dd className="font-black text-slate-200">A4</dd>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-slate-400">현재 페이지</dt>
                                                <dd className="font-black text-slate-200">
                                                    {pageLayers.length}페이지
                                                </dd>
                                            </div>
                                        </dl>
                                    </section>
                                )}
                                {documentSettingsTab === 'typography' && (
                                    <section>
                                        <h2 className="text-xs font-black">타이포그래피</h2>
                                        <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                                            모든 페이지 본문에 적용되는 읽기 간격입니다.
                                        </p>
                                        <label className="mt-4 block rounded-xl border border-slate-800 bg-slate-900 p-3">
                                            <span className="flex items-center justify-between text-[10px] font-black text-slate-300">
                                                본문 줄 간격
                                                <strong className="text-blue-300">
                                                    {store.lineHeight.toFixed(2)}
                                                </strong>
                                            </span>
                                            <input
                                                type="range"
                                                min={1}
                                                max={2.2}
                                                step={0.025}
                                                value={store.lineHeight}
                                                onChange={(event) =>
                                                    store.setLineHeight(Number(event.target.value))
                                                }
                                                className="mt-3 h-1 w-full cursor-pointer accent-blue-500"
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => store.setLineHeight(1.625)}
                                            className="mt-3 h-9 w-full rounded-lg border border-slate-700 text-[10px] font-black text-slate-200 transition hover:bg-slate-800"
                                        >
                                            기본 줄 간격으로 초기화
                                        </button>
                                    </section>
                                )}
                                {documentSettingsTab === 'composition' && (
                                    <section>
                                        <h2 className="text-xs font-black">문서 구성</h2>
                                        <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                                            섹션 노출, 순서와 세부 항목 배치를 관리합니다.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                store.setNavPanelOpen(!store.navPanelOpen)
                                            }
                                            aria-pressed={store.navPanelOpen}
                                            className={`mt-4 flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                                                store.navPanelOpen
                                                    ? 'border-blue-400 bg-blue-600/20 text-white'
                                                    : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-600'
                                            }`}
                                        >
                                            <span>
                                                <strong className="block text-xs">
                                                    구성 관리 패널
                                                </strong>
                                                <span className="mt-1 block text-[10px] text-slate-400">
                                                    {store.printExcludedIds.length}개 제외 · 드래그
                                                    순서 편집
                                                </span>
                                            </span>
                                            <Settings className="h-4 w-4 shrink-0" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={store.toggleAllExcluded}
                                            className="mt-2 h-9 w-full rounded-lg border border-slate-700 text-[10px] font-black text-slate-200 transition hover:bg-slate-800"
                                        >
                                            {store.printExcludedIds.length > 0
                                                ? '모든 섹션 다시 포함'
                                                : '편집 가능한 섹션 모두 제외'}
                                        </button>
                                    </section>
                                )}
                                {documentSettingsTab === 'view' && (
                                    <section>
                                        <h2 className="text-xs font-black">편집 화면 보기</h2>
                                        <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                                            화면에서만 바뀌며 실제 인쇄 결과에는 영향을 주지
                                            않습니다.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={store.toggleHidePrintGuides}
                                            aria-pressed={!store.hidePrintGuides}
                                            className="mt-4 flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-3 text-left text-slate-200 transition hover:border-slate-600"
                                        >
                                            <span>
                                                <strong className="block text-xs">
                                                    편집 가이드
                                                </strong>
                                                <span className="mt-1 block text-[10px] text-slate-400">
                                                    여백선·열 경계·배치 도구
                                                </span>
                                            </span>
                                            <span
                                                className={`rounded-full px-2 py-1 text-[9px] font-black ${
                                                    store.hidePrintGuides
                                                        ? 'bg-slate-800 text-slate-400'
                                                        : 'bg-emerald-500/20 text-emerald-300'
                                                }`}
                                            >
                                                {store.hidePrintGuides ? '숨김' : '표시'}
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleZoomFit}
                                            className="mt-2 h-9 w-full rounded-lg border border-slate-700 text-[10px] font-black text-slate-200 transition hover:bg-slate-800"
                                        >
                                            화면에 페이지 맞춤
                                        </button>
                                    </section>
                                )}
                                {documentSettingsTab === 'template' && (
                                    <section>
                                        <h2 className="text-xs font-black">템플릿</h2>
                                        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
                                            <span className="text-[9px] font-black text-slate-500">
                                                현재 적용 중
                                            </span>
                                            <strong className="mt-1 block truncate text-xs text-white">
                                                {activeTemplateName || '기본 이력서'}
                                            </strong>
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            <button
                                                type="button"
                                                onClick={() => setModeModalOpen(true)}
                                                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 text-[10px] font-black text-slate-100 transition hover:border-blue-400"
                                            >
                                                다른 템플릿 불러오기
                                            </button>
                                            {adminMode && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSaveTemplateModalOpen(true)}
                                                    className="h-10 w-full rounded-lg bg-blue-600 text-[10px] font-black text-white transition hover:bg-blue-500"
                                                >
                                                    Workspace 템플릿으로 저장
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={handleSaveLocalTemplate}
                                                className="h-10 w-full rounded-lg border border-amber-500/50 bg-amber-500/10 text-[10px] font-black text-amber-300 transition hover:bg-amber-500/20"
                                            >
                                                브라우저에 임시 저장
                                            </button>
                                        </div>
                                    </section>
                                )}
                            </div>
                            <div
                                role="separator"
                                aria-orientation="vertical"
                                aria-label="문서 설정 패널 너비 조절"
                                onPointerDown={handleDocumentSettingsResizeStart}
                                onPointerMove={handleDocumentSettingsResizeMove}
                                onPointerUp={handleDocumentSettingsResizeEnd}
                                onPointerCancel={handleDocumentSettingsResizeEnd}
                                className="absolute inset-y-0 right-0 w-1.5 cursor-col-resize touch-none bg-transparent transition hover:bg-blue-500/70"
                            />
                        </aside>
                    )}
                    <div
                        ref={canvasRef}
                        className="pdf-canvas flex-1 min-h-0 overflow-y-auto bg-[#cbd5e1] flex flex-col items-center pt-10 pb-4 relative print:block print:h-auto print:w-full print:bg-transparent print:p-0 print:m-0"
                    >
                        <div
                            className="resume-page resume-print-shell transition-all duration-300 flex flex-col items-center gap-10 print:gap-0 print:w-full print:max-w-none print:m-0 print:p-0 print:bg-transparent"
                            style={
                                {
                                    zoom: store.zoom,
                                    '--print-line-height': store.lineHeight,
                                } as CSSProperties
                            }
                        >
                            {pageLayers.map((page, pageIdx) => {
                                const { page: outputPage, rows } = getOutputPageAt(
                                    store.outputLayout,
                                    pageIdx
                                );
                                const pageRegionIds = new Set(
                                    rows.flatMap(({ regions }) =>
                                        regions.map((region) => region.id)
                                    )
                                );
                                const firstRegionId = rows[0]?.regions[0]?.id;
                                const atomsByRegionId = new Map<string, PrintAtomItem[]>();
                                page.items.forEach((atom) => {
                                    const placement = placementByAtomId.get(atom.id);
                                    const regionId =
                                        placement && pageRegionIds.has(placement.regionId)
                                            ? placement.regionId
                                            : firstRegionId;
                                    if (!regionId) return;
                                    atomsByRegionId.set(regionId, [
                                        ...(atomsByRegionId.get(regionId) ?? []),
                                        atom,
                                    ]);
                                });
                                atomsByRegionId.forEach((atoms) =>
                                    atoms.sort((left, right) => {
                                        const leftOrder = placementByAtomId.get(left.id)?.order;
                                        const rightOrder = placementByAtomId.get(right.id)?.order;
                                        if (leftOrder === undefined || rightOrder === undefined)
                                            return 0;
                                        return leftOrder - rightOrder;
                                    })
                                );
                                const populatedRows = rows.filter(({ regions }) =>
                                    regions.some(
                                        (region) =>
                                            (atomsByRegionId.get(region.id)?.length ?? 0) > 0
                                    )
                                );
                                const renderedRows =
                                    populatedRows.length > 0 ? populatedRows : rows.slice(0, 1);

                                return (
                                    <PdfPageLayer
                                        key={page.pageId}
                                        pageId={page.pageId}
                                        pageIndex={pageIdx}
                                        totalPages={pageLayers.length}
                                        hideGuides={store.hidePrintGuides}
                                        showFrameLabel={false}
                                        orientation={outputPage.orientation}
                                        margins={store.outputLayout.pageMargins}
                                    >
                                        {!store.hidePrintGuides && (
                                            <div className="pointer-events-none absolute -top-7 left-0 z-40 flex h-7 items-center gap-2 rounded-t-md bg-slate-950 px-3 shadow-md print:hidden">
                                                <span className="h-2 w-2 shrink-0 rounded-full bg-rose-400" />
                                                <span className="whitespace-nowrap text-[10px] font-black text-white">
                                                    {pageIdx + 1}페이지 · A4{' '}
                                                    {outputPage.orientation === 'landscape'
                                                        ? '가로'
                                                        : '세로'}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex w-full min-w-0 flex-col">
                                            {renderedRows.map(({ row, regions }) => (
                                                <div
                                                    key={row.id}
                                                    data-output-row={row.id}
                                                    data-layout-mode={row.layoutMode}
                                                    className="group/output-row relative grid min-w-0 items-start"
                                                    style={{
                                                        gridTemplateColumns: regions
                                                            .map(
                                                                (region) =>
                                                                    `${region.widthFraction}fr`
                                                            )
                                                            .join(' '),
                                                        columnGap: `${row.gapMm}mm`,
                                                    }}
                                                >
                                                    {!store.hidePrintGuides && (
                                                        <div className="absolute right-0 top-0 z-30 hidden -translate-y-full items-center gap-1 rounded-t-md bg-slate-950 px-1.5 py-1 shadow-xl group-hover/output-row:flex print:hidden">
                                                            {regions.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        store.setRowColumnCount(
                                                                            row.id,
                                                                            1
                                                                        )
                                                                    }
                                                                    className="h-5 rounded px-1.5 text-[9px] font-black text-slate-300 hover:bg-slate-800 hover:text-white"
                                                                    title="이 행의 블록을 다시 세로 한 줄로 합칩니다."
                                                                >
                                                                    한 줄로 합치기
                                                                </button>
                                                            )}
                                                            {regions.length === 2 && (
                                                                <label className="flex items-center gap-1 px-1 text-[8px] font-bold text-slate-300">
                                                                    폭
                                                                    <input
                                                                        type="range"
                                                                        min={20}
                                                                        max={80}
                                                                        value={Math.round(
                                                                            (regions[0]
                                                                                .widthFraction /
                                                                                (regions[0]
                                                                                    .widthFraction +
                                                                                    regions[1]
                                                                                        .widthFraction)) *
                                                                                100
                                                                        )}
                                                                        onChange={(event) =>
                                                                            store.resizeRegionPair(
                                                                                regions[0].id,
                                                                                regions[1].id,
                                                                                Number(
                                                                                    event.target
                                                                                        .value
                                                                                ) / 100
                                                                            )
                                                                        }
                                                                        className="w-16 accent-blue-500"
                                                                    />
                                                                </label>
                                                            )}
                                                            <label className="flex items-center gap-1 px-1 text-[8px] font-bold text-slate-300">
                                                                간격
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={20}
                                                                    value={row.gapMm}
                                                                    onChange={(event) =>
                                                                        store.setRowGap(
                                                                            row.id,
                                                                            Number(
                                                                                event.target.value
                                                                            )
                                                                        )
                                                                    }
                                                                    className="h-5 w-10 rounded border border-slate-600 bg-slate-900 px-1 text-white"
                                                                />
                                                            </label>
                                                            {renderedRows.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        store.removeRow(row.id)
                                                                    }
                                                                    className="inline-flex h-5 w-5 items-center justify-center rounded text-rose-300 hover:bg-rose-500/20"
                                                                    title="행 삭제 — 항목은 첫 행으로 이동"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {regions.map((region, columnIndex) =>
                                                        renderOutputRegion(
                                                            pageIdx,
                                                            region,
                                                            columnIndex,
                                                            atomsByRegionId.get(region.id) ?? []
                                                        )
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </PdfPageLayer>
                                );
                            })}
                        </div>
                    </div>

                    <div
                        className="print:hidden shrink-0 transition-all duration-300"
                        style={{ width: store.navPanelOpen ? 256 : 56 }}
                    >
                        <PrintPreviewNav
                            sections={orderedPrintableSections}
                            excludedIds={store.printExcludedIds}
                            itemGroups={navItemGroups}
                            lockedSectionIds={[LOCKED_PRINT_SECTION_ID]}
                            open={store.navPanelOpen}
                            onRequestToggle={() => store.setNavPanelOpen(!store.navPanelOpen)}
                            onToggle={store.toggleExcluded}
                            onReorderItem={store.reorderItemInScope}
                            onReorder={store.reorderSections}
                            onNavigate={(id) => {
                                const el =
                                    document.getElementById(id) ??
                                    document.querySelector<HTMLElement>(
                                        `[data-print-id="${CSS.escape(id)}"]`
                                    );
                                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            onToggleAll={store.toggleAllExcluded}
                            excludedCount={store.printExcludedIds.length}
                            onAddCustomSection={addCustomSection}
                        />
                    </div>

                    {aiChatOpen && canRevise && (
                        <div className="print:hidden shrink-0 w-[360px] border-l border-slate-800 bg-white relative">
                            <button
                                type="button"
                                onClick={() => setAiChatOpen(false)}
                                className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                aria-label="AI 대화 패널 닫기"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            <AiRevisionChat
                                revisions={revisions}
                                isRevisionsLoading={isRevisionsLoading}
                                isGenerating={isRevising}
                                onGenerate={handleReviseGenerate}
                                onCancelGenerate={handleCancelRevise}
                                title="AI 이력서 초안 다듬기"
                                subtitle="지적사항을 입력하면 현재 초안을 다시 구성합니다."
                                generateButtonLabel="피드백 없이 재구성"
                                emptyTitle="아직 대화 이력이 없습니다."
                                emptyDescription="지적사항을 입력해 현재 이력서 초안을 계속 다듬어 보세요."
                                inputPlaceholder="지적사항이나 보완 요청을 입력하세요 (전송 시 현재 초안에 반영)"
                            />
                        </div>
                    )}
                </div>
            </div>

            <PrintModeModal
                workspaceSlug={workspaceSlug}
                open={modeModalOpen}
                onClose={() => setModeModalOpen(false)}
                onManual={() => {
                    store.resetManual();
                    setActiveTemplate(null);
                    setActiveTemplateName('기본 이력서');
                    setContentOverrides({});
                    setModeModalOpen(false);
                    updateUrlParams(null);
                }}
                onApplyTemplate={(settings) => {
                    store.applyTemplate(settings);
                    const tmpl = settings.selectedTemplate ?? null;
                    setActiveTemplate(tmpl);
                    setActiveTemplateName(tmpl ? tmpl.name : '맞춤 인쇄 템플릿');
                    setContentOverrides(settings.contentOverrides ?? {});
                    setModeModalOpen(false);
                    updateUrlParams(tmpl?.id ?? null);
                }}
            />

            <SaveServerTemplateModal
                workspaceSlug={workspaceSlug}
                key={`${activeTemplate?.id ?? 'new'}-${saveTemplateModalOpen ? 'open' : 'closed'}`}
                open={saveTemplateModalOpen}
                onClose={() => setSaveTemplateModalOpen(false)}
                currentSettings={{
                    excludedIds: store.printExcludedIds,
                    sectionOrder: store.printSectionOrder,
                    sectionGaps: store.sectionGaps,
                    forcedPageOverrides: store.forcedPageOverrides,
                    outputLayout: store.outputLayout,
                    itemOrderOverrides: store.itemOrderOverrides,
                    targetRole: activeTemplate?.targetRole ?? 'GENERAL',
                    contentOverrides,
                    baseContentFingerprint: getPrintContentFingerprint(introData),
                    lineHeight: store.lineHeight,
                }}
                editingTemplate={activeTemplate}
                defaultJobPostingId={jobPostingId}
            />

            {skillSelectorModalOpen && (
                <PrintSkillSelectorModal
                    workspaceSkills={introData.skills}
                    catalogSkills={catalogSkills}
                    selectedSkillIds={contentOverrides.selectedSkillIds}
                    skillGroupOverrides={contentOverrides.skillGroupOverrides}
                    addingCatalogSkillId={addingCatalogSkillId}
                    onToggleSkill={toggleSkillSelection}
                    onMoveSkill={moveSkillToGroup}
                    onAddCatalogSkill={addCatalogSkillToWorkspace}
                    onResetToDefault={resetSkillsToDefault}
                    onClose={() => setSkillSelectorModalOpen(false)}
                />
            )}
        </>
    );
}
