'use client';

import {
    Fragment,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareText, X } from 'lucide-react';
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
    groupSkillsByUsage,
    type SkillOutputGroup,
} from '@/lib/introDerivations';
import {
    A4_HEIGHT_MM,
    MM_TO_PX,
    computeAtomHeightWithGap,
    partitionAtomsIntoPages,
    type AtomRowGroup,
    type PrintAtomItem,
} from '@/lib/pdfLayoutEngine';
import {
    printableSections,
    LOCKED_PRINT_SECTION_ID,
    reorderablePrintSections,
} from '@/lib/printSections';
import { generateUniqueLocalName, getLocalSaves, saveLocal } from '@/lib/printTemplateLocal';
import { useTouchDrag } from '@/hooks/useTouchDrag';
import { randomId } from '@/lib/uuid';
import {
    getOutputPageAt,
    deduplicateRowIds,
    ensureOutputLayoutPageCount,
    mergeAdjacentSingleColumnRows,
    moveSectionRows,
    parseStoredPrintLayout,
    pruneEmptyOutputRows,
    rebalancePageOverflow,
    replaceOutputPageComposition,
    type OutputLayout,
    type OutputRow,
} from '@/lib/printLayoutModel';
import {
    applyPrintTemplateContent,
    getPrintContentFingerprint,
    sanitizePrintTemplate,
} from '@/lib/printTemplateContent';
import { usePrintStore } from '@/store/usePrintStore';
import { PdfPageLayer } from './PdfPageLayer';
import { PrintPreviewBar } from './PrintPreviewBar';
import { PrintDocumentSettingsPanel } from './PrintDocumentSettingsPanel';
import {
    PrintDragContext,
    positionFromOrder,
    type PrintDragContextValue,
    type RegionScopeRun,
} from './PrintDragContext';
import { RowRenderer } from './PrintRegionRenderer';
import { PrintAtomRenderContext, type PrintAtomRenderContextValue } from './PrintAtomRenderContext';

import { PrintPreviewNav } from './PrintPreviewNav';
import { PrintModeModal } from './PrintModeModal';
import { SaveServerTemplateModal } from './SaveServerTemplateModal';
import { PrintSkillSelectorModal } from './PrintSkillSelectorModal';

const PRINT_HISTORY_LIMIT = 100;
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

type Props = {
    workspaceSlug: string;
    introData: IntroductionResponse;
    onExit: () => void;
    adminMode?: boolean;
    initialTemplate?: PrintTemplate | null;
    coverLetterItems?: JobPostingCoverLetterItem[];
    jobPostingId?: number | null;
    /** 페이지 이동 없이 현재 화면 위에 잠깐 떠서 인쇄 대화상자만 띄우고 사라지는
     *  용도로 마운트된 인스턴스인지 — true면 인쇄가 끝나는 즉시 onExit()으로
     *  스스로를 정리한다(편집 캔버스를 남에게 보여줄 필요가 없으므로). */
    quickPrintMode?: boolean;
};

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
    quickPrintMode = false,
}: Props) {
    const store = usePrintStore();
    const queryClient = useQueryClient();
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const printLayoutFrozenRef = useRef(false);
    // Figma처럼: 스페이스바를 누른 채(또는 마우스 가운데 버튼으로) 회색 배경을
    // 드래그하면 화면을 이동(pan)한다. 실제 카드 드래그(재정렬)와 충돌하지 않게
    // 왼쪽 버튼 드래그는 스페이스가 눌려 있을 때만 pan으로 취급한다.
    const [isSpacePanMode, setIsSpacePanMode] = useState(false);
    const panStateRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        scrollLeft: number;
        scrollTop: number;
        moved: boolean;
    } | null>(null);
    // pointerup 시점에 panStateRef는 이미 비워지므로, 뒤이어 발생하는 click
    // 이벤트에서 "방금 pan 드래그였는지"를 판별하려면 별도로 남겨둬야 한다.
    const suppressNextCanvasClickRef = useRef(false);
    // 간격 드래그 중엔 pointermove마다 sectionGaps가 바뀌고, 그때마다
    // rebalancePageOverflow가 그 순간의(아직 확정 안 된) 간격값으로 오버플로우
    // 여부를 다시 판단해 페이지 사이로 콘텐츠를 밀었다 당겼다 반복한다 — 드래그
    // 중 화면이 뒤죽박죽 흔들리는 원인이었다(실제 발생 확인됨). 드래그가 끝난
    // 뒤 확정된 값 한 번만 재배치를 반영하면 되므로, 드래그 중엔 자동 재배치를
    // 건너뛴다.
    const gapDragActiveRef = useRef(false);
    // 공개 워크스페이스 방문자가 템플릿을 고르면 편집 화면을 보여주지 않고 곧장
    // 인쇄 대화상자로 넘어간다 — autoPrintRequested가 켜지는 순간 이 화면을
    // 가리고, 인쇄가 끝나면(printPending이 다시 꺼지면) onExit으로 빠져나간다.
    const [autoPrintActive, setAutoPrintActive] = useState(false);
    const autoPrintStartedRef = useRef(false);
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
    // 완전히 빈 region(runs.length === 0)에 드롭할 때만 쓰는 상태 — 여기엔 어떤
    // 항목이든 들어가 새 컬럼을 만들 수 있다.
    const [dragOverEmptyRegion, setDragOverEmptyRegion] = useState<{
        pageIndex: number;
        regionId: string;
    } | null>(null);
    // run(같은 섹션·항목 범위) 안의 특정 atom 앞/뒤에 끼워넣을 때 쓰는 상태.
    const [dragOverRun, setDragOverRun] = useState<{
        pageIndex: number;
        regionId: string;
        runIndex: number;
        anchorAtomId: string;
        position: 'before' | 'after';
    } | null>(null);
    const [dragOverAtom, setDragOverAtom] = useState<{
        pageIndex: number;
        atomId: string;
        side: 'left' | 'right';
    } | null>(null);
    // 2/3열 행 자체를 위/아래로 재정렬할 때 쓰는 상태 — atom 드래그와는 별개 소스다.
    const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
    const [dragOverRow, setDragOverRow] = useState<{
        rowId: string;
        position: 'before' | 'after';
    } | null>(null);
    // 2/3열 행을 flow 영역의 특정 atom 옆으로 끌 때 — 그 atom 기준 위/아래 표시.
    const [dragOverRowTarget, setDragOverRowTarget] = useState<{
        atomId: string;
        position: 'before' | 'after';
    } | null>(null);
    // 그립(행/atom 왼쪽 손잡이)에 마우스를 올렸을 때 그 손잡이가 어떤 대상을
    // 움직이는지 박스로 보여주기 위한 정적 hover 상태 — 실제 드래그 상태와는 별개.
    const [hoveredGripRowId, setHoveredGripRowId] = useState<string | null>(null);
    const [hoveredGripAtomId, setHoveredGripAtomId] = useState<string | null>(null);
    const [marginSettingsOpen, setMarginSettingsOpen] = useState(false);
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
            if (error instanceof Error && error.name === 'AbortError') {
                setIsRevising(false);
                reviseAbortControllerRef.current = null;
                return;
            }
            alert('AI 재생성 중 오류가 발생했습니다. 다시 시도해 주세요.');
        }
        setIsRevising(false);
        reviseAbortControllerRef.current = null;
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
    // introData 전체를 JSON.stringify+해시 — 매 렌더마다 새로 돌리면 드래그 중
    // 프레임마다 재계산돼 비용이 큼(프로파일 실측 163ms). introData 안 바뀌면 재사용.
    const baseContentFingerprint = useMemo(
        () => getPrintContentFingerprint(introData),
        [introData]
    );

    const setProfileOverride = useCallback(
        (field: 'jobTitle' | 'bio' | 'coreStackSummary', val: string | undefined) => {
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
        },
        [introData]
    );

    const setExperienceOverride = useCallback(
        (
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
        },
        []
    );

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
    const selfHealBurstRef = useRef<{ count: number; last: number }>({ count: 0, last: 0 });
    const historyPastRef = useRef<PrintEditorSnapshot[]>([]);
    const historyFutureRef = useRef<PrintEditorSnapshot[]>([]);
    const historyCurrentRef = useRef<PrintEditorSnapshot | null>(null);
    const historyCurrentSignatureRef = useRef('');
    const historyMergeRef = useRef<{ key: string | null }>({ key: null });
    const historyMergeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // self-heal(자동 재배치 effect)이 setOutputLayout을 부르기 직전에 true로 세워둔다.
    // 히스토리 effect는 이걸 보고 그 변화를 "사용자 액션"으로 기록하지 않는다 —
    // 안 그러면 사용자가 되돌리기를 눌러도 self-heal이 outputLayout 변화를 감지하고
    // 바로 다시 같은 결과로 재배치해버려 되돌리기가 안 먹히는 것처럼 보인다
    // (실제 발생 확인됨).
    const skipHistoryForOutputLayoutRef = useRef(false);
    // forceMoveToPage처럼 atom 하나당 store를 여러 번 나눠 커밋하는 작업 도중엔
    // 이걸 true로 켜서 히스토리 effect가 아예 아무것도 안 하게(스냅샷도 안 갱신)
    // 막는다 — 그래야 함수가 끝난 뒤 딱 한 번, 작업 시작 전 상태 대비 최종 상태로
    // 히스토리 항목이 정확히 하나만 쌓인다. 중간에 갱신해버리면(스킵만 하고
    // historyCurrentRef는 계속 따라가면) "현재" 기준점이 작업 도중의 중간 상태로
    // 밀려서, 되돌리기를 눌러도 전체 작업이 아니라 마지막 한 조각만 되돌아간다
    // (실제 발생 확인됨 — 섹션 전체를 다음 페이지로 내렸는데 되돌리기를 여러 번
    // 눌러야 겨우 원상복구됨).
    const historyBatchActiveRef = useRef(false);
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
        store.applyTemplate(restored);
        setContentOverrides(restored.contentOverrides);
        setCoverLetterOverrides(restored.coverLetterOverrides);
        setCoverLetterSectionTitle(restored.coverLetterSectionTitle);
        setAddedCoverLetterItems(restored.addedCoverLetterItems);
        // historyCurrentRef는 반드시 store에 "실제로 커밋된" 값을 기준으로 잡아야 한다.
        // applyTemplate 내부의 normalizeOutputLayout이 rows 배열 순서 등을 정규화하면서
        // 넘겨준 restored와 미묘하게 달라질 수 있는데(실제 발생 확인됨 — 페이지 순서와
        // 안 맞게 뒤섞여 있던 예전 rows 배열이 정규화 과정에서 올바른 순서로 바로잡히면서
        // restored 원본과 값이 달라짐), historyCurrentRef를 restored(정규화 전 원본)로
        // 잡아두면 다음 렌더에서 "실제 store 값과 다르다"는 가짜 변경으로 잡혀 되돌리기
        // 직후 매번 유령 히스토리 항목이 쌓이고 다시하기 스택도 그때마다 지워졌다.
        const committed = usePrintStore.getState();
        const settled = clonePrintEditorSnapshot({
            excludedIds: committed.printExcludedIds,
            sectionOrder: committed.printSectionOrder,
            sectionGaps: committed.sectionGaps,
            lineHeight: committed.lineHeight,
            forcedPageOverrides: committed.forcedPageOverrides,
            outputLayout: committed.outputLayout,
            itemOrderOverrides: committed.itemOrderOverrides,
            contentOverrides: restored.contentOverrides,
            coverLetterOverrides: restored.coverLetterOverrides,
            coverLetterSectionTitle: restored.coverLetterSectionTitle,
            addedCoverLetterItems: restored.addedCoverLetterItems,
        });
        historyCurrentRef.current = settled;
        historyCurrentSignatureRef.current = JSON.stringify(settled);
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
        if (historyBatchActiveRef.current) return;
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

        if (skipHistoryForOutputLayoutRef.current) {
            skipHistoryForOutputLayoutRef.current = false;
            historyCurrentRef.current = snapshot;
            historyCurrentSignatureRef.current = signature;
            return;
        }

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

    const addCoverLetterItem = useCallback(() => {
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
    }, [coverLetterItems]);
    const updateAddedCoverLetterItem = useCallback(
        (itemId: number, field: 'question' | 'answer', val: string | undefined) => {
            setAddedCoverLetterItems((current) =>
                current.map((i) => (i.id === itemId ? { ...i, [field]: val ?? '' } : i))
            );
        },
        []
    );
    const removeAddedCoverLetterItem = useCallback((itemId: number) => {
        setAddedCoverLetterItems((current) => current.filter((i) => i.id !== itemId));
    }, []);

    const addCustomSection = () => {
        const sectionId = randomId();
        const itemId = randomId();
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

    const updateCustomSection = useCallback(
        (sectionId: string, updater: (section: CustomPrintSection) => CustomPrintSection) => {
            setContentOverrides((current) => ({
                ...current,
                customSections: (current.customSections ?? []).map((section) =>
                    section.id === sectionId ? updater(section) : section
                ),
            }));
        },
        []
    );

    const removeCustomSection = useCallback(
        (sectionId: string) => {
            setContentOverrides((current) => ({
                ...current,
                customSections: (current.customSections ?? []).filter(
                    (section) => section.id !== sectionId
                ),
            }));
            const printSectionId = `custom-section:${sectionId}`;
            usePrintStore
                .getState()
                .setSectionOrder(store.printSectionOrder.filter((id) => id !== printSectionId));
            usePrintStore
                .getState()
                .setExcludedIds(
                    store.printExcludedIds.filter(
                        (id) => id !== printSectionId && !id.startsWith(`${printSectionId}:`)
                    )
                );
        },
        [store.printSectionOrder, store.printExcludedIds]
    );

    const addCustomSectionItem = useCallback(
        (sectionId: string) => {
            updateCustomSection(sectionId, (section) => ({
                ...section,
                items: [...section.items, { id: randomId(), title: '', content: '' }],
            }));
        },
        [updateCustomSection]
    );

    const updateCustomSectionItem = useCallback(
        (
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
        },
        [updateCustomSection]
    );

    const removeCustomSectionItem = useCallback(
        (sectionId: string, itemId: string) => {
            updateCustomSection(sectionId, (section) => ({
                ...section,
                items: section.items.filter((item) => item.id !== itemId),
            }));
        },
        [updateCustomSection]
    );

    const setCoverLetterOverride = useCallback(
        (
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
        },
        []
    );

    const setDetailOverride = useCallback(
        (
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
        },
        []
    );

    const setCompetencyOverride = useCallback(
        (compId: number, field: 'title' | 'summary', val: string | undefined, baseVal: string) => {
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
        },
        []
    );

    const [skillSelectorModalOpen, setSkillSelectorModalOpen] = useState(false);
    const [addingCatalogSkillId, setAddingCatalogSkillId] = useState<number | null>(null);
    const { data: catalogSkills = [] } = useQuery({
        queryKey: ['skill-catalog'],
        queryFn: skillApi.catalog,
        enabled: adminMode && skillSelectorModalOpen,
    });

    const toggleSkillSelection = useCallback(
        (skillId: number) => {
            setContentOverrides((current) => {
                const defaultCoreSkillIds = introData.skills
                    .filter((s) => s.isCore)
                    .map((s) => s.id);
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
        },
        [introData]
    );

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
                catalogSkillId: skill.id,
                skillLevel: '',
                skillVersion: '',
                comment: '',
                usageType: group === 'CORE' ? 'WORK_EXPERIENCE' : 'PROJECT_USE',
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
        }
        setAddingCatalogSkillId(null);
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
    const visibleCompetencies = useMemo(
        () =>
            orderedCompetencies.filter(
                (competency) => !store.printExcludedIds.includes(`competency:${competency.id}`)
            ),
        [orderedCompetencies, store.printExcludedIds]
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

    // sanitizedInitialTemplate은 매 렌더 새 객체라 그대로 deps에 넣으면 "마운트 시
    // 한 번만 적용" 의도가 깨진다. ref에 최신값만 계속 반영해두고, 실제 트리거는
    // id(원시값)로만 잡아 재적용 없이 최신 내용을 읽는다.
    const sanitizedInitialTemplateRef = useRef(sanitizedInitialTemplate);
    useEffect(() => {
        sanitizedInitialTemplateRef.current = sanitizedInitialTemplate;
    });
    useEffect(() => {
        const template = sanitizedInitialTemplateRef.current;
        if (!template) return;
        const layoutSettings = parseStoredPrintLayout(template.sectionGaps);
        usePrintStore.getState().applyTemplate({
            excludedIds: template.excludedIds,
            sectionOrder: template.sectionOrder,
            ...layoutSettings,
        });
    }, [sanitizedInitialTemplate?.id]);

    // 캔버스 마우스 휠 + Ctrl/Cmd로 줌 조절
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = -e.deltaY;
                const currentZoom = usePrintStore.getState().zoom;
                usePrintStore.getState().setZoom(currentZoom + (delta > 0 ? 0.05 : -0.05));
            }
        };
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, []);

    // 스페이스바를 누르고 있는 동안만 왼쪽 버튼 드래그를 pan으로 취급한다. 텍스트
    // 입력 중(인라인 편집, 검색창 등)에는 스페이스가 실제 공백 입력이어야 하므로
    // 편집 가능한 요소에 포커스가 있을 땐 무시한다.
    useEffect(() => {
        const isEditableTarget = (target: EventTarget | null) => {
            const el = target as HTMLElement | null;
            if (!el) return false;
            const tag = el.tagName;
            return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code !== 'Space' || isEditableTarget(e.target)) return;
            // 키를 누르고 있는 동안 브라우저가 계속 keydown을 반복 발생시키는데(auto-repeat),
            // 매번 preventDefault를 걸어줘야 한다 — 첫 이벤트에서만 막으면 그 뒤 반복
            // 이벤트에서 스페이스바 기본 동작(페이지 아래로 스크롤)이 그대로 실행된다
            // (실제 발생 확인됨: 스페이스를 누르고 있으면 화면이 계속 내려감).
            e.preventDefault();
            if (e.repeat) return;
            setIsSpacePanMode(true);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code !== 'Space') return;
            setIsSpacePanMode(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const handleCanvasPanPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (e.button === 1 || (e.button === 0 && isSpacePanMode)) {
            e.preventDefault();
            canvas.setPointerCapture(e.pointerId);
            panStateRef.current = {
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                scrollLeft: canvas.scrollLeft,
                scrollTop: canvas.scrollTop,
                moved: false,
            };
        }
    };
    const handleCanvasPanPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        const canvas = canvasRef.current;
        const pan = panStateRef.current;
        if (!canvas || !pan || pan.pointerId !== e.pointerId) return;
        const dx = e.clientX - pan.startX;
        const dy = e.clientY - pan.startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) pan.moved = true;
        canvas.scrollLeft = pan.scrollLeft - dx;
        canvas.scrollTop = pan.scrollTop - dy;
    };
    const handleCanvasPanPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
        const canvas = canvasRef.current;
        const pan = panStateRef.current;
        if (!pan || pan.pointerId !== e.pointerId) return;
        suppressNextCanvasClickRef.current = pan.moved;
        canvas?.releasePointerCapture(e.pointerId);
        panStateRef.current = null;
    };

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
            usePrintStore.getState().setPrintPending(false);
        };
        window.addEventListener('beforeprint', clearPrintTitle);
        window.addEventListener('afterprint', restorePrintTitle);
        return () => {
            window.removeEventListener('beforeprint', clearPrintTitle);
            window.removeEventListener('afterprint', restorePrintTitle);
        };
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
    const orderedReorderableSections = useMemo(
        () => [
            ...store.printSectionOrder
                .map((id) => allReorderableSections.find((section) => section.id === id))
                .filter((section): section is (typeof allReorderableSections)[number] =>
                    Boolean(section)
                ),
            ...allReorderableSections.filter(
                (section) => !store.printSectionOrder.includes(section.id)
            ),
        ],
        [store.printSectionOrder, allReorderableSections]
    );
    const lockedPrintSection = printableSections.find((s) => s.id === LOCKED_PRINT_SECTION_ID)!;
    const orderedPrintableSections = useMemo(
        () => [lockedPrintSection, ...orderedReorderableSections],
        [lockedPrintSection, orderedReorderableSections]
    );

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
    }, [
        store.printExcludedIds,
        orderedPrintableSections,
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

    // 나란히 배치된 2-3열 행이 페이지 경계에서 컬럼끼리 찢어지지 않도록, 각 atom을
    // 자신이 속한 행 그룹과 매핑한다. store.outputLayout만으로 계산하므로 pageLayers가
    // 현재 뭘 어디에 뒀다고 생각하는지와 무관하게 항상 정확하다. 단일 열 행(대부분의
    // 콘텐츠)은 매핑에서 아예 제외된다.
    const rowGroupsByAtomId = useMemo(() => {
        const printableIds = new Set(printableAtoms.map((a) => a.id));
        const map = new Map<string, AtomRowGroup>();

        for (const row of store.outputLayout.rows) {
            if (row.regionIds.length <= 1) continue;

            const columns = row.regionIds.map((regionId) =>
                store.outputLayout.placements
                    .filter((p) => p.regionId === regionId && printableIds.has(p.atomId))
                    .sort((a, b) => a.order - b.order)
                    .map((p) => p.atomId)
            );
            const memberCount = columns.reduce((n, col) => n + col.length, 0);
            if (memberCount <= 1) continue;

            const group: AtomRowGroup = {
                rowId: row.id,
                columns,
                measuredHeight: store.atomHeights.get(`row:${row.id}`),
            };
            columns.flat().forEach((atomId) => map.set(atomId, group));
        }
        return map;
    }, [store.outputLayout.rows, store.outputLayout.placements, printableAtoms, store.atomHeights]);

    // 강제 배치로 옮겨간 큰 섹션(항목이 수십 개인 경우)의 원래 자리를 높이 그대로
    // 빈 공간으로 예약해봤지만, 그 섹션 자체가 페이지 하나보다 커지면 예약된
    // 빈 공간도 페이지 하나 이상을 통째로 잡아먹어 완전히 빈 페이지가 나타났다
    // (실제 발생 확인됨). 큰 섹션을 옮길 때는 빈 공간을 남기지 않고 뒤따르는
    // 내용이 자연스럽게 당겨져 다시 채워지는 쪽이 통짜 빈 페이지보다 낫다 —
    // 그래서 예약 공간 없이 순수 자연 재계산으로 되돌린다.
    const pageLayers = useMemo(
        () =>
            partitionAtomsIntoPages(
                printableAtoms,
                store.atomHeights,
                store.sectionGaps,
                store.forcedPageOverrides,
                pageContentHeightPx,
                store.outputLayout.pages.map((page) => page.id),
                rowGroupsByAtomId
            ),
        [
            printableAtoms,
            store.atomHeights,
            store.sectionGaps,
            store.forcedPageOverrides,
            store.outputLayout.pages,
            pageContentHeightPx,
            rowGroupsByAtomId,
        ]
    );

    useEffect(() => {
        if (store.outputLayout.pages.length >= pageLayers.length) return;
        skipHistoryForOutputLayoutRef.current = true;
        store.setOutputLayout(ensureOutputLayoutPageCount(store.outputLayout, pageLayers.length));
    }, [pageLayers.length, store]);

    // pageLayers(자연 계산)는 push/pull 리밸런스를 모르는 단순 순차 패킹이라,
    // 실제로 rebalance가 콘텐츠를 더 촘촘히 눌러 담으면 자연 계산이 예상한
    // 마지막 페이지가 실제로는 완전히 빈 채로 남을 수 있다(실제 발생 확인됨 —
    // store.outputLayout의 마지막 페이지 rowIds가 0개인데도 pageLayers.length가
    // 그 페이지를 포함해 총 페이지 수를 그대로 보고해서 진짜 빈 페이지가
    // 화면/출력에 그대로 나타났다). 렌더링에 쓰는 목록에서만 "실제로 행이 하나도
    // 없는" 꼬리 페이지를 잘라낸다 — self-heal/maxPageCount 등 내부 계산용
    // pageLayers 자체는 안 건드린다(그쪽까지 건드리면 이번 세션 내내 잡은
    // 수렴 안정성이 다시 흔들릴 위험이 있다).
    const visiblePageLayers = useMemo(() => {
        let end = pageLayers.length;
        while (end > 1 && getOutputPageAt(store.outputLayout, end - 1).rows.length === 0) {
            end -= 1;
        }
        return end === pageLayers.length ? pageLayers : pageLayers.slice(0, end);
    }, [pageLayers, store.outputLayout]);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || printLayoutFrozenRef.current) return;

        let frame = 0;
        let disposed = false;
        let observedTargets: HTMLElement[] = [];

        const measure = () => {
            frame = 0;
            if (disposed || printLayoutFrozenRef.current) return;
            const debugStart = process.env.NODE_ENV !== 'production' ? performance.now() : 0;

            const elements = Array.from(canvas.querySelectorAll<HTMLElement>('[data-atom-id]'));
            const previousHeights = usePrintStore.getState().atomHeights;
            // 지금 이 순간 화면에 안 그려진 atom(강제 배치 등으로 대량 재배치 중,
            // 어느 페이지에도 잠깐 안 걸리는 경우)의 높이를 통째로 지우면 안 된다 —
            // 그러면 자연 페이지네이터가 그 atom을 추정치로 다시 계산하고, 추정치가
            // 실측과 다르면 페이지 배치가 바뀌어 다시 화면에 나타났다 사라졌다를
            // 반복하는 순환이 생긴다(실제 발생 확인됨). 마지막으로 잰 값을 기본으로
            // 깔고, 지금 화면에 있는 것만 덮어쓴다.
            const newHeights = new Map<string, number>(previousHeights);
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

            // 2-3열 행은 컬럼 폭이 좁아 개별 atom의 (1열 기준으로 동결된) 높이 합으로는
            // 실제 줄바꿈을 반영 못 한다. 행 컨테이너 자체의 실측 높이를 별도로 재서
            // `row:<rowId>` 키로 저장해두면, 페이지 분할 엔진이 정확한 행 높이를 쓸 수
            // 있다. 열 폭은 행이 어느 페이지에 있든 동일(페이지 너비 비율)하므로, 개별
            // atom 동결과 달리 이 값은 페이지 이동에 따라 흔들리지 않는다.
            const rowElements = Array.from(
                canvas.querySelectorAll<HTMLElement>('[data-output-row]')
            );
            rowElements.forEach((rowEl) => {
                const rowId = rowEl.dataset.outputRow;
                if (!rowId) return;
                if (rowEl.dataset.layoutMode === 'SINGLE_COLUMN') return;
                const computedStyle = window.getComputedStyle(rowEl);
                const marginTop = Number.parseFloat(computedStyle.marginTop) || 0;
                const marginBottom = Number.parseFloat(computedStyle.marginBottom) || 0;
                const renderedHeight =
                    rowEl.offsetHeight ||
                    Math.round(rowEl.getBoundingClientRect().height / (store.zoom || 1));
                newHeights.set(
                    `row:${rowId}`,
                    Math.max(0, renderedHeight + marginTop + marginBottom)
                );
            });

            const previous = previousHeights;
            const changed =
                previous.size !== newHeights.size ||
                Array.from(newHeights).some(([id, height]) => {
                    const previousHeight = previous.get(id);
                    return previousHeight === undefined || Math.abs(previousHeight - height) > 1;
                });

            if (process.env.NODE_ENV !== 'production') {
                const elapsed = performance.now() - debugStart;
                if (elapsed > 4) {
                    console.log(
                        `[measure] ${elapsed.toFixed(1)}ms, atoms=${elements.length}, rows=${rowElements.length}, changed=${changed}`
                    );
                }
            }
            if (changed) usePrintStore.getState().setAtomHeights(newHeights);
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

    const placementByAtomId = useMemo(
        () =>
            new Map(
                store.outputLayout.placements.map((placement) => [placement.atomId, placement])
            ),
        [store.outputLayout.placements]
    );

    const pageIndexByPageId = useMemo(() => {
        const map = new Map<string, number>();
        store.outputLayout.pages.forEach((page, idx) => map.set(page.id, idx));
        return map;
    }, [store.outputLayout.pages]);

    // "이 atom이 지금 몇 페이지에 있나"의 진짜 답 — placement가 있으면(한 번이라도
    // 명시적으로 배치됨) 그 실제 페이지를, 없으면 자연 흐름(atomPageMap) 페이지를
    // 쓴다. "N페이지로 강제 올리기" 버튼의 목표 페이지 계산이 atomPageMap(자연
    // 페이지)만 썼더니, 크로스페이지 드래그로 실제로는 뒤쪽 페이지에 있는 atom도
    // 자연 계산상 앞쪽 페이지로 나와서 "한 페이지 더 올리기" 목표가 음수가 되어
    // 버튼 자체가 안 뜨는 버그가 있었다(실제 발생 확인됨).
    const effectivePageMap = useMemo(() => {
        const map = new Map<string, number>();
        printableAtoms.forEach((atom) => {
            const placement = placementByAtomId.get(atom.id);
            const actualPageIdx = placement ? pageIndexByPageId.get(placement.pageId) : undefined;
            const pageIdx = actualPageIdx ?? atomPageMap.get(atom.id);
            if (pageIdx !== undefined) map.set(atom.id, pageIdx);
        });
        return map;
    }, [printableAtoms, placementByAtomId, pageIndexByPageId, atomPageMap]);

    // 페이지 분할 지점(어느 atom 앞에 "여기서 페이지가 갈립니다" 배너를 띄울지)은
    // 원래 순수 자연 흐름(pageLayers)만 보고 계산했다 — 그래서 사용자가 드래그로
    // 페이지를 재배치하면 실제로는 페이지 중간에 있는 atom이 배너를 못 받고, 실제
    // 페이지 맨 위로 옮겨온 atom은 자연 계산이 몰라서 배너를 못 받는 불일치가 났다
    // (실제 발생 확인됨 — 크로스페이지 드래그로 옮긴 competency가 실제로 페이지
    // 맨 위인데도 배너가 안 뜸). materialize된 페이지(명시적 row/placement가 있는
    // 페이지)는 실제 레이아웃 기준으로, 아직 한 번도 안 건드린(자연 흐름 그대로인)
    // 페이지는 자연 계산으로 폴백한다.
    const pageBreakBoundaryAtomIds = useMemo(() => {
        const set = new Set<string>();

        const rowsForPage = (pageId: string) =>
            store.outputLayout.rows
                .filter((r) => r.pageId === pageId)
                .sort((a, b) => a.order - b.order);

        const firstAtomOfActualPage = (pageId: string) => {
            const firstRow = rowsForPage(pageId)[0];
            const regionId = firstRow?.regionIds[0];
            const placement = regionId
                ? store.outputLayout.placements
                      .filter((p) => p.regionId === regionId)
                      .sort((a, b) => a.order - b.order)[0]
                : undefined;
            return placement ? printableAtoms.find((a) => a.id === placement.atomId) : undefined;
        };

        const lastAtomOfActualPage = (pageId: string) => {
            const rows = rowsForPage(pageId);
            const lastRow = rows[rows.length - 1];
            const regionId = lastRow?.regionIds[lastRow.regionIds.length - 1];
            const placement = regionId
                ? store.outputLayout.placements
                      .filter((p) => p.regionId === regionId)
                      .sort((a, b) => b.order - a.order)[0]
                : undefined;
            return placement ? printableAtoms.find((a) => a.id === placement.atomId) : undefined;
        };

        for (let p = 1; p < pageLayers.length; p++) {
            const currentPage = store.outputLayout.pages[p];
            const prevPage = store.outputLayout.pages[p - 1];
            const actualFirst = currentPage ? firstAtomOfActualPage(currentPage.id) : undefined;
            const actualPrevLast = prevPage ? lastAtomOfActualPage(prevPage.id) : undefined;

            if (actualFirst && actualPrevLast) {
                if (actualFirst.sectionId === actualPrevLast.sectionId || actualFirst.isHeader) {
                    set.add(actualFirst.id);
                }
                continue;
            }

            const prevPageItems = pageLayers[p - 1].items;
            const currentPageItems = pageLayers[p].items;
            if (currentPageItems.length > 0) {
                const firstAtomOnNewPage = currentPageItems[0];
                const hasPrevItemsInSameSection = prevPageItems.some(
                    (it) => it.sectionId === firstAtomOnNewPage.sectionId
                );
                // 섹션이 이어지는 경우뿐 아니라, 새 페이지 맨 위가 새 섹션의 헤더로
                // 시작하는 경우도 분할 지점으로 취급한다 — 그래야 이전 페이지에
                // 여유 공간이 있을 때 그 헤더(와 섹션 전체)를 앞으로 강제 당겨올
                // 수단(배너의 "N페이지로 강제 올리기")이 생긴다.
                if (hasPrevItemsInSameSection || firstAtomOnNewPage.isHeader) {
                    set.add(firstAtomOnNewPage.id);
                }
            }
        }
        return set;
    }, [
        pageLayers,
        store.outputLayout.pages,
        store.outputLayout.rows,
        store.outputLayout.placements,
        printableAtoms,
    ]);

    // 각 페이지의 "맨 마지막 행"도 강제 배치 컨트롤이 있어야 한다 — 다음
    // 페이지로 자연스럽게 넘어가는 진짜 경계 행이기 때문이다(실사용 요청 —
    // "각 페이지의 마지막 행들은 노출되고 하단배치가 가능했으면"). 위
    // pageBreakBoundaryAtomIds는 "다음 페이지의 첫 행"만 다루므로(같은 섹션이
    // 이어지거나 헤더로 시작할 때만), 여기서는 섹션 연속 여부와 무관하게
    // 모든 실제 페이지의 마지막 행을 그대로 모은다.
    const pageBreakBottomBoundaryAtomIds = useMemo(() => {
        const set = new Set<string>();
        store.outputLayout.pages.forEach((page) => {
            const rows = store.outputLayout.rows
                .filter((r) => r.pageId === page.id)
                .sort((a, b) => a.order - b.order);
            const lastRow = rows[rows.length - 1];
            const regionId = lastRow?.regionIds[lastRow.regionIds.length - 1];
            if (!regionId) return;
            const placement = store.outputLayout.placements
                .filter((p) => p.regionId === regionId)
                .sort((a, b) => b.order - a.order)[0];
            if (placement) set.add(placement.atomId);
        });
        return set;
    }, [store.outputLayout.pages, store.outputLayout.rows, store.outputLayout.placements]);

    const getAssociatedAtomIds = useCallback(
        (id: string): string[] => {
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
            if (id.startsWith('career-company:')) {
                // 회사 카드 자체는 isHeader가 아니라서 아래 헤더 분기를 안 타지만,
                // 그 회사에 속한 프로젝트/상세와 항상 하나의 단위로 움직여야 한다
                // — 그렇지 않으면 강제 배치 시 회사 타이틀만 옮겨지고 소속
                // 프로젝트/상세는 원래 페이지에 남아 내용이 찢어진다.
                const companyId = id.replace('career-company:', '');
                const card = orderedCareerCards.find((c) => String(c.id) === companyId);
                if (card) {
                    return [
                        id,
                        ...card.projects.map((p) => `career-project:${p.id}`),
                        ...card.projects.flatMap((p) =>
                            p.details.map((d) => `career-detail:${d.id}`)
                        ),
                    ];
                }
            }
            // 섹션 헤더를 끌면 그 섹션에 속한 모든 요소가 함께 이동한다 — 구성 단위
            // 통째로 재정렬하기 위함.
            const atom = printableAtoms.find((a) => a.id === id);
            if (atom?.isHeader) {
                return printableAtoms
                    .filter((a) => a.sectionId === atom.sectionId)
                    .map((a) => a.id);
            }
            return [id];
        },
        [orderedMilestones, orderedCareerCards, printableAtoms]
    );

    // 헤더(섹션 전체) 또는 career-company(회사+소속 프로젝트/상세)를 통째로
    // 강제 배치하면, 그 그룹에 속한 모든 하위 atom도 각자 pageLocked/
    // forcedPageOverrides를 갖게 된다. 그러면 하위 atom 하나하나가 자기도
    // "강제 배치됨" 배너를 독립적으로 띄워서, 회사 카드 하나만 내렸는데도
    // 그 안의 모든 프로젝트·상세 항목에 배너가 중복으로 뜨는 문제가 났다
    // (실제 발생 확인됨). 이 atom이 속할 수 있는 "그룹 소유자" 후보들
    // (섹션 헤더, 또는 career-company/career-details-header/
    // project-details-header)을 찾아, 그 소유자가 강제 배치돼 있으면 자기
    // 배너는 숨기고 소유자의 배너만 보이게 한다.
    const getPossibleGroupOwnerIds = useCallback(
        (id: string): string[] => {
            const owners: string[] = [];
            const atom = printableAtoms.find((a) => a.id === id);
            if (atom && !atom.isHeader) {
                const header = printableAtoms.find(
                    (a) => a.isHeader && a.sectionId === atom.sectionId
                );
                if (header) owners.push(header.id);
            }
            if (id.startsWith('career-project:')) {
                const projectId = id.replace('career-project:', '');
                const company = orderedCareerCards.find((c) =>
                    c.projects.some((p) => String(p.id) === projectId)
                );
                if (company) owners.push(`career-company:${company.id}`);
            }
            if (id.startsWith('career-detail:')) {
                const detailId = id.replace('career-detail:', '');
                const company = orderedCareerCards.find((c) =>
                    c.projects.some((p) => p.details.some((d) => String(d.id) === detailId))
                );
                if (company) owners.push(`career-company:${company.id}`);
                const project = orderedCareerCards
                    .flatMap((c) => c.projects)
                    .find((p) => p.details.some((d) => String(d.id) === detailId));
                if (project) owners.push(`career-details-header:${project.id}`);
            }
            if (id.startsWith('project-detail:')) {
                const detailId = id.replace('project-detail:', '');
                const m = orderedMilestones.find((item) =>
                    item.details.some((d) => String(d.id) === detailId)
                );
                if (m) owners.push(`project-details-header:${m.id}`);
            }
            return owners;
        },
        [printableAtoms, orderedCareerCards, orderedMilestones]
    );

    // 그룹 소유자(회사 카드/섹션 헤더)가 강제 배치돼 있으면 나(그 그룹
    // 하위 항목)는 항상 배너를 숨긴다. 한때 소유자와 다른 페이지로 밀려난
    // 항목만 예외로 개별 배너를 보여줬는데, 그러면 그룹이 여러 페이지에
    // 걸쳐 자연 분할될 때(atom-per-row라 흔함) 그 안의 수십 개 항목이 전부
    // 자기 배너를 띄워버렸다(실제 발생 확인됨 — 페이지 4~6 모든 항목에
    // 배너). 그룹 안에서 세밀한 위치 조정이 필요하면 배너 대신 드래그로
    // 옮기고, 배너는 그룹 소유자 하나만 보여준다.
    const isForcedViaGroupOwner = useCallback(
        (id: string): boolean =>
            getPossibleGroupOwnerIds(id).some(
                (ownerId) => ownerId !== id && store.forcedPageOverrides[ownerId] !== undefined
            ),
        [getPossibleGroupOwnerIds, store.forcedPageOverrides]
    );

    // 강제 페이지 이동/해제 전용. 2-3열로 나란히 배치된 행에서 한 컬럼만 옮기면
    // 나머지 컬럼이 이전/다음 페이지에 남아 레이아웃이 찢어지므로, 여기서는 같은 행의
    // 다른 컬럼 atom까지 모두 묶어서 반환한다. 드래그앤드롭(placeAtomBeside 등)은 이
    // 확장을 타지 않고 기존 getAssociatedAtomIds만 써서 컬럼 하나만 떼어내는 동작을
    // 그대로 유지한다.
    const getForcePageAssociatedAtomIds = useCallback(
        (id: string): string[] => {
            const visited = new Set<string>([id]);
            const queue: string[] = [id];

            // 섹션 헤더를 강제 배치하면 getAssociatedAtomIds의 "헤더면 섹션
            // 전체" 규칙을 그대로 따라 섹션 전체가 함께 옮겨진다 — 하위 항목이
            // 위에 남아 찢어지는 걸 원치 않는다는 실사용 요청에 따른 것이다.
            while (queue.length > 0) {
                const current = queue.shift()!;

                for (const childId of getAssociatedAtomIds(current)) {
                    if (!visited.has(childId)) {
                        visited.add(childId);
                        queue.push(childId);
                    }
                }

                const placement = store.outputLayout.placements.find((p) => p.atomId === current);
                if (!placement) continue;
                const region = store.outputLayout.regions.find((r) => r.id === placement.regionId);
                if (!region) continue;
                const row = store.outputLayout.rows.find((r) => r.id === region.rowId);
                if (!row || row.regionIds.length <= 1) continue;

                const siblingRegionIds = new Set(row.regionIds);
                const siblingAtomIds = store.outputLayout.placements
                    .filter((p) => siblingRegionIds.has(p.regionId))
                    .map((p) => p.atomId);
                for (const siblingId of siblingAtomIds) {
                    if (!visited.has(siblingId)) {
                        visited.add(siblingId);
                        queue.push(siblingId);
                    }
                }
            }

            return Array.from(visited);
        },
        [getAssociatedAtomIds, store.outputLayout]
    );

    // 드래그로 나란히 배치 가능한 "항목" 단위 키. 같은 헤더/디테일끼리는 같은 키가
    // 나오고, 서로 다른 회사/프로젝트/섹션의 항목은 다른 키가 나온다. career-detail-item/
    // project-detail-item만 부모 항목까지 역추적하고, 그 외 타입은 자기 id 자체가 이미
    // 고유한 항목 단위라 별도 조회 없이 그대로 쓴다.
    const getRowPairingKey = useCallback(
        (atomId: string): string => {
            const atom = printableAtoms.find((a) => a.id === atomId);
            if (!atom) return atomId;
            // 직장경력/프로젝트는 회사·프로젝트 하위에 상세 항목이 딸린 계층 구조라, 그
            // 경계(회사·프로젝트 단위)를 넘어 섞이면 안 된다 — 원래 문제였던 케이스.
            if (atom.type === 'career-detail-item') {
                const project = orderedCareerCards
                    .flatMap((c) => c.projects)
                    .find((p) => p.details?.some((d) => `career-detail:${d.id}` === atomId));
                return project ? `career-project:${project.id}` : atom.sectionId;
            }
            if (atom.type === 'project-detail-item') {
                const milestone = orderedMilestones.find((m) =>
                    m.details?.some((d) => `project-detail:${d.id}` === atomId)
                );
                return milestone ? `project:${milestone.id}` : atom.sectionId;
            }
            if (atom.type === 'career-item' || atom.type === 'career-company') {
                return atomId;
            }
            if (atom.type === 'project-item') {
                return atomId;
            }
            // 그 외(핵심역량/자격증/스킬그룹/자기소개 문항/커스텀 섹션 등 하위 계층 없는
            // 평평한 목록과 각종 헤더)는 같은 섹션 안에서는 자유롭게 나란히 배치·재배치
            // 가능해야 하므로 섹션 단위로만 구분한다.
            return atom.sectionId;
        },
        [printableAtoms, orderedCareerCards, orderedMilestones]
    );

    // getRowPairingKey가 같은 값끼리 묶은 연속 구간. printableAtoms가 이미 섹션별
    // 순서대로 쌓이므로, 연속 구간 단위로만 나누면 "명시적 순서 없으면 문서 순서 유지"
    // 라는 기존 규칙을 절대 어기지 않는다(전역 Map으로 묶으면 순서가 흐트러질 위험).
    const computeRegionScopeRuns = useCallback(
        (regionId: string, atoms: PrintAtomItem[]): RegionScopeRun[] => {
            const runs: RegionScopeRun[] = [];
            for (const atom of atoms) {
                const scopeKey = getRowPairingKey(atom.id);
                const last = runs[runs.length - 1];
                if (last && last.scopeKey === scopeKey) {
                    last.atoms.push(atom);
                } else {
                    runs.push({ regionId, runIndex: runs.length, scopeKey, atoms: [atom] });
                }
            }
            return runs;
        },
        [getRowPairingKey]
    );

    // 어떤 항목도 자기 섹션의 헤더보다 앞(위)으로 갈 수 없다. 헤더 atom을 anchor로
    // 'before' 위치에 끼워넣으려는 시도만 'after'로 강제 클램프한다 — 헤더가 아닌
    // anchor는 원래도 헤더보다 뒤에 있으므로 건드릴 필요 없다.
    const clampAtomPositionPastHeader = useCallback(
        (
            movingAtomIds: string[],
            anchorAtomId: string,
            position: 'before' | 'after'
        ): 'before' | 'after' => {
            if (position === 'after') return position;
            const anchorAtom = printableAtoms.find((a) => a.id === anchorAtomId);
            if (!anchorAtom?.isHeader) return position;
            const blocked = movingAtomIds.some(
                (id) => printableAtoms.find((a) => a.id === id)?.sectionId === anchorAtom.sectionId
            );
            return blocked ? 'after' : position;
        },
        [printableAtoms]
    );

    const getRowAtomIds = useCallback((rowId: string, layout: OutputLayout): string[] => {
        const regionIds = layout.regions
            .filter((region) => region.rowId === rowId)
            .map((region) => region.id);
        return layout.placements
            .filter((placement) => regionIds.includes(placement.regionId))
            .map((placement) => placement.atomId);
    }, []);

    // 행 단위 이동(행↔행, atom↔행)용 버전 — 대상 행 안에 이동 대상과 같은 섹션의
    // 헤더가 있으면 그 행의 앞쪽에 끼워넣는 걸 막는다.
    const clampRowPositionPastHeader = useCallback(
        (
            movingAtomIds: string[],
            targetRowId: string,
            position: 'before' | 'after'
        ): 'before' | 'after' => {
            if (position === 'after') return position;
            const targetAtomIds = new Set(getRowAtomIds(targetRowId, store.outputLayout));
            const movingSectionIds = new Set(
                movingAtomIds
                    .map((id) => printableAtoms.find((a) => a.id === id)?.sectionId)
                    .filter((v): v is string => v !== undefined)
            );
            const blocked = printableAtoms.some(
                (atom) =>
                    atom.isHeader &&
                    targetAtomIds.has(atom.id) &&
                    movingSectionIds.has(atom.sectionId)
            );
            return blocked ? 'after' : position;
        },
        [getRowAtomIds, store.outputLayout, printableAtoms]
    );

    const isHeaderAtom = useCallback(
        (atomId: string): boolean => printableAtoms.find((a) => a.id === atomId)?.isHeader === true,
        [printableAtoms]
    );

    const getRowIdForAtom = useCallback(
        (atomId: string, layout: OutputLayout): string | undefined => {
            const placement = layout.placements.find((p) => p.atomId === atomId);
            if (!placement) return undefined;
            const region = layout.regions.find((r) => r.id === placement.regionId);
            return region?.rowId;
        },
        []
    );

    // atom 하나의 실제 렌더 높이(px) 추정(자기 앞의 gap 포함) — rebalancePageOverflow가
    // 페이지 콘텐츠 총 높이를 계산하고, 넘치는 행을 atom 단위로 쪼갤 때 쓴다.
    const getOutputAtomHeightPx = useCallback(
        (atomId: string): number => {
            const atom = printableAtoms.find((a) => a.id === atomId);
            if (!atom) return 0;
            return computeAtomHeightWithGap(atom, store.atomHeights, store.sectionGaps);
        },
        [printableAtoms, store.atomHeights, store.sectionGaps]
    );

    // 아직 한 번도 수동 배치된 적 없는 atom은 layout.placements에 아예 항목이
    // 없다(자연 문서 순서 fallback으로만 렌더링됨) — 그래서 행 기반 로직이 "이
    // atom이 속한 행"을 못 찾아 조용히 아무 일도 안 하거나(헤더 드래그 무반응),
    // 섹션의 placement 있는 일부만 옮기고 나머지는 그대로 둬서 열 구조가 깨지는
    // 버그가 났다. 이 페이지의 현재 자연 순서를 명시적 row로 확정해, 이후 행
    // 기반 로직이 확실히 모든 atom을 찾을 수 있게 한다 — 이미 명시적 배치된
    // 행은 그대로 두고 자연 순서 구간만 새 단일열 행으로 감싼다(비파괴적).
    // 순수 함수 — layout을 받아 새 layout을 반환할 뿐 store를 직접 건드리지
    // 않는다. 자동 정리(자동 병합 useEffect)가 이 함수를 여러 페이지에 걸쳐
    // 반복 호출한 뒤 결과를 한 번에만 커밋해야, 실행마다 undo 히스토리에 자동
    // 정리 스냅샷이 따로따로 쌓이는 걸 막을 수 있다.
    const materializePageIntoRows = useCallback(
        (layout: OutputLayout, pageIndex: number): OutputLayout => {
            const { rows } = getOutputPageAt(layout, pageIndex);
            const rowIdByAtomId = new Map<string, string>();
            rows.forEach(({ row, regions }) => {
                regions.forEach((region) => {
                    layout.placements
                        .filter((p) => p.regionId === region.id)
                        .forEach((p) => rowIdByAtomId.set(p.atomId, row.id));
                });
            });

            // 단일열 행에 서로 다른 섹션의 atom이 섞여 있으면(과거 버그로 이미 오염된
            // 상태) 그 행을 명시적 행으로 그대로 보존하면 오염이 계속 이어진다 — 실제로
            // intro-profile/skills/competencies가 region 하나에 다 섞인 채로 발견됐다.
            // 그런 행은 rowIdByAtomId에서 지워 "자연 순서" 취급으로 되돌리면, 아래
            // 버킷팅(섹션 경계에서 새 행으로 끊기)이 섹션별로 다시 갈라준다.
            rows.forEach(({ regions }) => {
                if (regions.length !== 1) return;
                const atomIds = layout.placements
                    .filter((p) => p.regionId === regions[0].id)
                    .map((p) => p.atomId);
                const sectionIds = new Set(
                    atomIds
                        .map((id) => printableAtoms.find((a) => a.id === id)?.sectionId)
                        .filter((v): v is string => v !== undefined)
                );
                if (sectionIds.size > 1) {
                    atomIds.forEach((id) => rowIdByAtomId.delete(id));
                }
            });

            // 어디에도(다른 페이지 포함) 아직 placement가 없는 atom만 "새로 추가해야
            // 할 atom"이다. 이미 다른 페이지에 있는 atom(사용자가 드래그로 옮긴 것)은
            // 자연 목록(pageAtoms)에 남아있어도 여기서 되찾아오면 안 된다 — 그러면
            // cross-page 드래그가 self-heal에 의해 되돌아간다.
            const placedAnywhereAtomIds = new Set(layout.placements.map((p) => p.atomId));
            const pageAtoms = pageLayers[pageIndex]?.items ?? [];
            const hasNewAtom = pageAtoms.some(
                (atom) => !rowIdByAtomId.has(atom.id) && !placedAnywhereAtomIds.has(atom.id)
            );
            if (!hasNewAtom) {
                return layout;
            }

            const composition: string[][][] = [];
            const pushedRowIds = new Set<string>();
            for (const atom of pageAtoms) {
                if (!rowIdByAtomId.has(atom.id) && placedAnywhereAtomIds.has(atom.id)) {
                    // 다른 페이지에 이미 있는 atom(사용자가 옮김) — 자연 목록에 있어도
                    // 이 페이지로 되돌리지 않는다.
                    continue;
                }
                const rowId = rowIdByAtomId.get(atom.id);
                if (rowId) {
                    if (pushedRowIds.has(rowId)) continue;
                    pushedRowIds.add(rowId);
                    const rowEntry = rows.find(({ row }) => row.id === rowId);
                    if (!rowEntry) continue;
                    composition.push(
                        rowEntry.regions.map((region) =>
                            layout.placements
                                .filter((p) => p.regionId === region.id)
                                .sort((a, b) => a.order - b.order)
                                .map((p) => p.atomId)
                        )
                    );
                } else {
                    // atom마다 독립된 단일열 행 하나씩 만든다 — 여러 atom을 한 행에
                    // 묶으면(예전 방식) 오버플로우 재배치·페이지 분할 지점 배너 등
                    // 행 단위로 동작하는 로직이 "행 안 몇 번째 atom인지"를 몰라 페이지
                    // 중간에 있는 atom도 행의 첫 자리로 착각하는 등 오동작했다. 섹션
                    // 경계 처리도 필요 없다 — 애초에 행마다 atom이 하나뿐이라 섞일 일이
                    // 없다.
                    composition.push([[atom.id]]);
                }
            }

            // pageAtoms(자연 목록)에 없는데 이 페이지에 이미 있는 행(다른 페이지에서
            // 드래그로 들어온 행 등)은 위 루프에서 전혀 방문되지 않는다.
            // replaceOutputPageComposition은 넘겨준 composition에 없는 placement를
            // 이 페이지에서 지워버리므로(printLayoutModel.ts), 보존해 주지 않으면
            // 사용자가 옮긴 행이 통째로 사라진다 — 기존 순서(row.order) 그대로
            // 끝에 이어붙인다.
            const leftoverRows = rows
                .filter(({ row }) => !pushedRowIds.has(row.id))
                .sort((a, b) => a.row.order - b.row.order);
            leftoverRows.forEach(({ regions }) => {
                composition.push(
                    regions.map((region) =>
                        layout.placements
                            .filter((p) => p.regionId === region.id)
                            .sort((a, b) => a.order - b.order)
                            .map((p) => p.atomId)
                    )
                );
            });

            return composition.length > 0
                ? replaceOutputPageComposition(layout, pageIndex, composition)
                : layout;
        },
        [printableAtoms, pageLayers]
    );

    // atom 카드를 끌든(어느 atom이든) 행 그립을 끌든, 대상이 다른 섹션의 헤더면
    // 그 섹션 전체(헤더 + 소속된 모든 행, 2/3/4열 구조 포함)를 통째로 그 섹션의
    // 앞/뒤로 옮긴다 — 오른쪽 "구성 관리" 패널과 동일하게 구성끼리만 상하 순서를
    // 바꾸는 동작.
    const moveWholeSectionOnto = useCallback(
        (movingMemberAtomId: string, targetHeaderId: string, position: 'before' | 'after') => {
            const movingAtom = printableAtoms.find((a) => a.id === movingMemberAtomId);
            const targetAtom = printableAtoms.find((a) => a.id === targetHeaderId);
            if (!movingAtom || !targetAtom?.isHeader) return;
            if (movingAtom.sectionId === targetAtom.sectionId) return;

            // 이동/대상 섹션 atom이 걸쳐있는 모든 페이지를 먼저 명시적 row로 확정.
            // materialize 결과를 로컬 변수에만 누적하고 store엔 아직 안 쓴다 —
            // 페이지마다 store.replacePageComposition을 따로 부르면 undo 히스토리에
            // 자동 정리 스냅샷이 여러 개 쌓이고, 다음 페이지 계산도 이 함수 안의
            // store.outputLayout(이 렌더 시점 스냅샷)에 반영이 안 돼 있어 꼬인다.
            const touchedPageIndexes = new Set<number>();
            printableAtoms.forEach((atom) => {
                if (
                    atom.sectionId === movingAtom.sectionId ||
                    atom.sectionId === targetAtom.sectionId
                ) {
                    const p = atomPageMap.get(atom.id);
                    if (p !== undefined) touchedPageIndexes.add(p);
                }
            });
            let workingLayout = store.outputLayout;
            touchedPageIndexes.forEach((pageIndex) => {
                workingLayout = materializePageIntoRows(workingLayout, pageIndex);
            });

            const rowIdsOfSection = (sectionId: string): string[] =>
                Array.from(
                    new Set(
                        printableAtoms
                            .filter((a) => a.sectionId === sectionId)
                            .map((a) => getRowIdForAtom(a.id, workingLayout))
                            .filter((id): id is string => id !== undefined)
                    )
                );

            const movingRowIds = rowIdsOfSection(movingAtom.sectionId);
            const targetRowIds = rowIdsOfSection(targetAtom.sectionId);
            if (movingRowIds.length === 0 || targetRowIds.length === 0) return;

            // row.order는 같은 페이지 안에서만 의미 있는 값이라, 섹션이 여러 페이지에
            // 걸쳐 있으면(예: projects가 5개 페이지에 걸침) 페이지 인덱스로 먼저
            // 정렬해야 진짜 "첫 행"/"마지막 행"을 고를 수 있다.
            const pageIndexById = new Map(
                workingLayout.pages.map((page, index) => [page.id, index])
            );
            const orderedTargetRows = targetRowIds
                .map((id) => workingLayout.rows.find((row) => row.id === id))
                .filter((row): row is OutputRow => !!row)
                .sort((a, b) => {
                    const pageA = pageIndexById.get(a.pageId) ?? 0;
                    const pageB = pageIndexById.get(b.pageId) ?? 0;
                    return pageA !== pageB ? pageA - pageB : a.order - b.order;
                });
            if (orderedTargetRows.length === 0) return;
            const anchorRowId =
                position === 'before'
                    ? orderedTargetRows[0].id
                    : orderedTargetRows[orderedTargetRows.length - 1].id;

            const finalLayout = moveSectionRows(workingLayout, movingRowIds, {
                rowId: anchorRowId,
                position,
            });
            usePrintStore.getState().setOutputLayout(finalLayout);
        },
        [printableAtoms, atomPageMap, store.outputLayout, materializePageIntoRows, getRowIdForAtom]
    );

    // 오른쪽 "구성 관리" 패널은 printSectionOrder라는 별도의 자연 순서 배열만
    // 바꾼다 — 이미 명시적으로 배치된(캔버스에서 손댄) 섹션엔 아무 영향이 없어서,
    // 패널 목록 순서와 실제 캔버스 렌더 순서가 서로 어긋나는 버그가 났다.
    // printSectionOrder도 그대로 갱신하되, 캔버스 쪽 실제 행 순서도 같이
    // moveWholeSectionOnto로 맞춰서 두 표현이 항상 일치하게 한다.
    const reorderSectionsAndSync = (
        draggedSectionId: string,
        targetSectionId: string,
        position: 'before' | 'after' = 'before'
    ) => {
        store.reorderSections(draggedSectionId, targetSectionId, position);
        const draggedHeaderAtom = printableAtoms.find(
            (a) => a.isHeader && a.sectionId === draggedSectionId
        );
        const targetHeaderAtom = printableAtoms.find(
            (a) => a.isHeader && a.sectionId === targetSectionId
        );
        if (draggedHeaderAtom && targetHeaderAtom) {
            moveWholeSectionOnto(draggedHeaderAtom.id, targetHeaderAtom.id, position);
        }
    };

    const getRowSectionId = useCallback(
        (rowId: string, layout: OutputLayout): string | undefined =>
            getRowAtomIds(rowId, layout)
                .map((id) => printableAtoms.find((a) => a.id === id)?.sectionId)
                .find((v): v is string => v !== undefined),
        [getRowAtomIds, printableAtoms]
    );

    // 행 대 행 재정렬은 섹션 경계를 전혀 모르는 단순 순서 교환이면, 다른 섹션의
    // 행 사이에 끼워넣으면 그 섹션 내용이 섞여버린다(실제 리포트된 버그). 여기서
    // 먼저 두 행이 같은 섹션인지 확인해 안전할 때만 이동하고, 다른 섹션이면 그
    // 섹션의 헤더 행일 때만 "섹션 전체 이동"으로 처리하며, 그 외(다른 섹션의
    // 중간 행)는 아예 무시한다.
    //
    // moveOutputRow(구 store.moveRow)는 같은 페이지 안에서만 order를 다시 매겨서
    // 타겟 행이 다른 페이지에 있으면 조용히 무시됐다(실제 리포트된 버그 —
    // 핵심역량 3열 행을 다음 페이지 행 사이로 끌어도 순서가 안 바뀜). 행 하나만
    // 옮기더라도 페이지를 넘나들 수 있어야 하므로, moveWholeSectionOnto와 같은
    // moveSectionRows(페이지 간 이동을 정식으로 지원하는 함수)를 [movingRowId]
    // 하나짜리 배열로 재사용한다.
    const resolveRowToRowMove = useCallback(
        (movingRowId: string, targetRowId: string, position: 'before' | 'after') => {
            const movingSectionId = getRowSectionId(movingRowId, store.outputLayout);
            const targetSectionId = getRowSectionId(targetRowId, store.outputLayout);
            // 둘 중 하나라도 섹션을 확실히 못 구하면(예: 그 행의 유일한 atom이 인쇄
            // 제외됨) 안전하게 아무 것도 하지 않는다 — 예전엔 이 경우 아래 같은-섹션
            // 분기로 빠져 가드 없이 store.moveRow가 실행됐다.
            if (!movingSectionId || !targetSectionId) {
                return;
            }
            if (movingSectionId !== targetSectionId) {
                const targetHeaderAtom = getRowAtomIds(targetRowId, store.outputLayout)
                    .map((id) => printableAtoms.find((a) => a.id === id))
                    .find((a) => a?.isHeader);
                if (targetHeaderAtom) {
                    const anyMovingAtomId = getRowAtomIds(movingRowId, store.outputLayout)[0];
                    if (anyMovingAtomId)
                        moveWholeSectionOnto(anyMovingAtomId, targetHeaderAtom.id, position);
                }
                return;
            }
            const clampedPosition = clampRowPositionPastHeader(
                getRowAtomIds(movingRowId, store.outputLayout),
                targetRowId,
                position
            );
            usePrintStore
                .getState()
                .moveSectionRows([movingRowId], { rowId: targetRowId, position: clampedPosition });
        },
        [
            getRowSectionId,
            store.outputLayout,
            getRowAtomIds,
            printableAtoms,
            moveWholeSectionOnto,
            clampRowPositionPastHeader,
        ]
    );

    const startGapDrag = useCallback(
        (id: string) => (e: ReactPointerEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            const startY = e.clientY;
            const startGap = Math.max(0, store.sectionGaps[id] ?? 0);
            let lastValue = startGap;
            gapDragActiveRef.current = true;
            const onMove = (me: PointerEvent) => {
                const next = Math.max(0, Math.round(startGap + (me.clientY - startY)));
                lastValue = next;
                usePrintStore.getState().setGap(id, next);
            };
            const onUp = () => {
                gapDragActiveRef.current = false;
                // 드래그 중 건너뛴 자동 재배치를 확정된 최종 간격값으로 한 번 더
                // 반영해야 하므로, 같은 값이라도 다시 dispatch해 self-heal을
                // 한 번 더 깨운다(ref만 바꾸는 건 렌더를 안 일으켜서 부족하다).
                usePrintStore.getState().setGap(id, lastValue);
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
        },
        [store.sectionGaps]
    );

    const getAtomDisplayTitle = useCallback(
        (atomId: string): string => {
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
                const cred = orderedCredentialExperiences.find(
                    (item) => String(item.id) === credId
                );
                const title = cred?.title || cred?.companyName;
                if (title) return `'${title}'`;
                return '학력/자격증';
            }

            const atom = printableAtoms.find((a) => a.id === atomId);
            if (atom?.title) return `'${atom.title}'`;
            return '해당 항목';
        },
        [
            contentOverrides,
            orderedCoverLetterItems,
            resolvedIntroData,
            orderedCareerCards,
            orderedMilestones,
            orderedCredentialExperiences,
            printableAtoms,
        ]
    );

    // 배지(강제배치/분할지점) 안에서 이미 핀·여백조절을 제공하는지 판별.
    // 호버 시 뜨는 .pp-controls 알약과 좌표가 겹치므로, 배지가 보이는 항목은
    // 알약을 아예 띄우지 않고 배지 하나로 컨트롤을 통일한다.
    const isPageBreakBannerVisible = useCallback(
        (id: string): boolean => {
            if (store.hidePrintGuides) return false;
            if (id === 'intro-profile') return false;
            // placement가 있는(=한 번이라도 명시적으로 배치된) atom은 실제
            // row.order/placement.order가 0인지(그 페이지의 진짜 첫 행·첫 항목인지)
            // 로 "지금 실제로 페이지 맨 위인지"를 검증한다. placement가 아직
            // 없는(순수 자연 흐름 그대로인) atom은 자기 자리를 아직 모르니
            // true로 둔다(아래 자연 흐름 pageBreakBoundaryAtomIds 판단에 맡김).
            const placement = placementByAtomId.get(id);
            let isCurrentlyTopOfPage = true;
            if (placement) {
                const region = store.outputLayout.regions.find((r) => r.id === placement.regionId);
                const row = region
                    ? store.outputLayout.rows.find((r) => r.id === region.rowId)
                    : undefined;
                isCurrentlyTopOfPage = row?.order === 0 && placement.order === 0;
            }
            const forcedPage = store.forcedPageOverrides[id];
            if (forcedPage !== undefined) {
                // 이 atom이 강제 배치돼 있어도, 그게 자기 의지가 아니라 소속된
                // 그룹(섹션 헤더 전체, 또는 career-company/career-details-header/
                // project-details-header)이 통째로 강제 배치되면서 같이 딸려온
                // 것이면 배너를 또 띄우지 않는다 — 그룹 소유자 쪽 배너 하나로
                // 충분하다(실제 발생 확인됨 — 회사 카드 하나 내렸는데 그 안의
                // 모든 프로젝트·상세에마다 배너가 중복으로 뜸). 단, 그 그룹이
                // 한 페이지에 다 안 들어가 오버플로로 넘어간 부분의 맨 위
                // 항목(진짜 페이지 경계)은 예외다 — 그건 소유자 배너로는 손댈
                // 수 없는 진짜 새 분할 지점이라 자기 배너가 있어야 한다(실사용
                // 요청 — "밀려난 맨 위 항목엔 강제배치 컨트롤이 있어야 한다").
                if (
                    isForcedViaGroupOwner(id) &&
                    !isCurrentlyTopOfPage &&
                    !pageBreakBottomBoundaryAtomIds.has(id)
                )
                    return false;
                return true;
            }
            // pageBreakBoundaryAtomIds는 순수 자연 흐름(pageLayers)만 보고 계산된
            // "여기가 자연스러운 페이지 분할 지점" 집합이라, 드래그로 이 atom
            // 자체가 다른 페이지로 옮겨졌거나, 이 atom 앞에 다른 게 끼어들어서
            // 더 이상 "그 페이지 맨 위"가 아니게 됐으면 더 이상 안 맞는 얘기다 —
            // 페이지 중간에 떠 있는데 "여기서 분할됨" 배너가 뜨면 혼란만 준다.
            const isBoundary = isCurrentlyTopOfPage && pageBreakBoundaryAtomIds.has(id);
            // 페이지 맨 마지막 행도 배너 대상이다 — 다음 페이지로 넘어가기 직전인
            // 진짜 경계 행이라 강제 배치 컨트롤이 있어야 한다(실사용 요청).
            const isBottomBoundary = pageBreakBottomBoundaryAtomIds.has(id);
            const currentGap = store.sectionGaps[id] ?? 0;
            return isBoundary || isBottomBoundary || currentGap > 0;
        },
        [
            store.hidePrintGuides,
            store.forcedPageOverrides,
            pageBreakBoundaryAtomIds,
            pageBreakBottomBoundaryAtomIds,
            store.sectionGaps,
            placementByAtomId,
            store.outputLayout.regions,
            store.outputLayout.rows,
            isForcedViaGroupOwner,
        ]
    );

    const handlePrintConfirm = () => {
        printLayoutFrozenRef.current = false;
        store.setPrintPending(true);
    };

    useEffect(() => {
        if (!store.autoPrintRequested || autoPrintStartedRef.current) return;
        autoPrintStartedRef.current = true;
        setAutoPrintActive(true);
        printLayoutFrozenRef.current = false;
        store.setPrintPending(true);
        store.setAutoPrintRequested(false);
    }, [store, store.autoPrintRequested]);

    // window.print()가 대화상자를 닫을 때까지 스크립트를 막아준다는 보장이 없다
    // (브라우저에 따라 즉시 반환됨) — printPending이 꺼졌다고 router.push 같은
    // 실제 페이지 이동을 시키면 방금 뜬 인쇄 대화상자가 그 내비게이션에 휘말려
    // 끊길 수 있다(실제 발생 확인됨: 대화상자가 뜨자마자 홈으로 튕김).
    // quickPrintMode(현재 페이지 이동 없이 화면 위에 잠깐 떠서 인쇄만 하고 사라지는
    // 용도)에서는 onExit이 실제 내비게이션이 아니라 이 인스턴스를 그냥
    // 언마운트하는 로컬 상태 변경이라 안전하므로, 인쇄가 끝나면 곧장 정리한다.
    // 그 외(직접 /print URL로 들어온 경우 등)에는 오버레이만 걷고 편집 화면을
    // 그대로 드러낸다.
    const showAutoPrintOverlay = autoPrintActive && store.printPending;

    useEffect(() => {
        if (!quickPrintMode || !autoPrintActive || store.printPending) return;
        onExit();
    }, [quickPrintMode, autoPrintActive, store.printPending, onExit]);

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
            }
            if (!cancelled) usePrintStore.getState().setPrintPending(false);
        };
        void printWhenLayoutIsStable();
        return () => {
            cancelled = true;
        };
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

    // 강제 페이지 배치 시, 목표 페이지에 이미 같은 섹션/항목 콘텐츠가 있으면 그 옆에
    // 정확히 끼워넣고(insertAtomsIntoOutputRegion 재사용), 없으면(그 페이지에 처음
    // 등장하는 섹션) 기존처럼 그 페이지의 기본 영역 맨 끝에 둔다 — 완전히 다른
    // 섹션끼리 같은 공용 영역에서 뒤섞이는 걸 막는다.
    const forceMoveToPage = useCallback(
        (ids: string[], pageIndex: number) => {
            if (ids.length === 0) return;
            const scopeKey = getRowPairingKey(ids[0]);
            const movingSet = new Set(ids);
            // 자기 섹션 헤더보다 앞 페이지로는 강제 배치할 수 없다 — 헤더가 이미 놓인
            // 페이지보다 이른 페이지가 요청되면 헤더의 페이지로 끌어올린다. 여기서
            // "헤더가 이미 놓인 페이지"는 반드시 effectivePageMap(실제 현재 위치)을
            // 써야 한다 — atomPageMap(순수 자연 계산)을 쓰면 헤더가 실제로는
            // 이미 다른 페이지로 옮겨져 있어도 그걸 모르고 예전 자연 위치로
            // 계산해서, 실제로는 갈 수 있는 페이지인데도 못 가게 잘못 막았다
            // (실제 발생 확인됨 — 헤더가 실제로는 2페이지에 있는데 자연 계산은
            // 3페이지라고 착각해서 프로젝트를 2페이지로 못 올리게 막음).
            const sectionIds = new Set(
                ids
                    .map((id) => printableAtoms.find((a) => a.id === id)?.sectionId)
                    .filter((v): v is string => v !== undefined)
            );
            const headerPages = printableAtoms
                .filter(
                    (atom) =>
                        atom.isHeader && sectionIds.has(atom.sectionId) && !movingSet.has(atom.id)
                )
                .map((atom) => effectivePageMap.get(atom.id))
                .filter((p): p is number => p !== undefined);
            const minAllowedPage = headerPages.length > 0 ? Math.max(...headerPages) : 0;
            const targetPageIndex = Math.max(pageIndex, minAllowedPage);
            // 자기 섹션 헤더의 자연 위치가 이미 요청한 목표 페이지보다 뒤라서
            // minAllowedPage에 걸리면, targetPageIndex가 지금 있는 페이지
            // 그대로로 클램프된다. 이때도 아래 로직을 그대로 진행하면 "같은
            // 페이지 안에서 앵커 뒤에 다시 끼워넣기"가 실행돼 항목이 아무
            // 예고 없이 그 페이지 맨 아래로 옮겨진다(실제 발생 확인됨 — "2페이지로
            // 올리기"를 눌렀는데 페이지는 안 바뀌고 3페이지 맨 아래로 이동).
            // 실제로 페이지가 바뀌지 않는다면 아무것도 하지 않는다.
            const currentActualPage = effectivePageMap.get(ids[0]);
            if (currentActualPage === targetPageIndex) return;
            historyBatchActiveRef.current = true;
            // 아래로 내리는 경우(현재 페이지보다 뒤로)와 위로 올리는 경우(현재
            // 페이지보다 앞으로)는 문서 순서상 붙어야 할 위치가 정반대다.
            // 아래로 내릴 땐 대상 페이지의 자연 컨텐츠보다 문서상 먼저 오므로
            // 그 페이지 "맨 위"(첫 행 앞)에 붙어야 하고, 위로 끌어올릴 땐 대상
            // 페이지의 자연 컨텐츠보다 문서상 나중이므로 그 페이지 "맨 아래"
            // (마지막 행 뒤)에 붙어야 한다(실제 발생 확인됨 — 아래로 내렸는데
            // 다음 페이지 맨 아래에 붙어서 순서가 뒤바뀜).
            const isMovingDown =
                currentActualPage === undefined || targetPageIndex > currentActualPage;
            // "다음 페이지로 내리기"는 자연 흐름이 아직 만들지 않은 페이지를
            // 목표로 삼을 수 있다(문서 맨 끝 근처 항목을 그 다음 페이지로 밀 때
            // 등). getOutputPageAt은 store에 없는 페이지를 요청받으면 반환값
            // 안에서만 임시로 만들어 돌려주므로, 그 임시 페이지의 행을 앵커로
            // 잡아도 실제 store에는 없는 행이라 이후 forceNextToRow가 조용히
            // 아무 일도 안 하고 끝난다(실제 발생 확인됨). 목표 페이지가 아직
            // 없으면 먼저 실제로 store를 키우고, 이후 전부 그 커밋된 최신
            // 상태를 기준으로 진행한다.
            const outputLayoutForAnchor =
                targetPageIndex >= store.outputLayout.pages.length
                    ? (() => {
                          const grown = ensureOutputLayoutPageCount(
                              store.outputLayout,
                              targetPageIndex + 1
                          );
                          usePrintStore.getState().setOutputLayout(grown);
                          return usePrintStore.getState().outputLayout;
                      })()
                    : store.outputLayout;
            // 앵커(강제 배치 항목을 바로 뒤에 붙일 기준 행)는 자연 계산
            // (pageLayers)이 아니라 실제로 저장된(materialize된) 행을 기준으로
            // 찾는다. pageLayers는 이전에 남아있는 forcedPageOverrides 등의
            // 영향으로 실제 배치와 어긋날 수 있는데(실제 발생 확인됨 — 자연
            // 계산상 "요구 정의부터..."가 페이지의 마지막인 줄 알고 앵커로
            // 골랐지만, 실제로는 "문제가 터지기 전에..."가 그 뒤에 진짜
            // 마지막으로 있었다), 그러면 강제 배치가 진짜 마지막 항목이 아니라
            // 중간 항목 뒤에 끼어들어간다. store.outputLayout(실제 상태)에서
            // 뒤에서부터 찾으면 항상 진짜 마지막에 붙는다.
            const { rows: targetPageRows } = getOutputPageAt(
                outputLayoutForAnchor,
                targetPageIndex
            );
            let anchorRow: OutputRow | undefined;
            const rowIndices = isMovingDown
                ? targetPageRows.map((_, i) => i)
                : targetPageRows.map((_, i) => targetPageRows.length - 1 - i);
            for (const i of rowIndices) {
                const { row, regions } = targetPageRows[i];
                const hasMatchingAtom = regions.some((region) =>
                    outputLayoutForAnchor.placements.some(
                        (p) =>
                            p.regionId === region.id &&
                            !movingSet.has(p.atomId) &&
                            getRowPairingKey(p.atomId) === scopeKey
                    )
                );
                if (hasMatchingAtom) {
                    anchorRow = row;
                    break;
                }
            }

            // ids를 통째로 forceNextToRow(ids, ...)에 한 번에 넘기면
            // insertAtomsNextToRow가 전부를 컬럼 하나짜리 행 '하나'로 뭉쳐버린다
            // (실제 발생 확인됨 — 회사 카드+프로젝트+상세 약 20개 atom이 행 1개로
            // 뭉쳐서 페이지 하나에 다 안 들어가는데도, 오버플로 스캔이 "행이
            // 페이지의 첫 행이면 넘침으로 안 본다"는 규칙 때문에 그 거대한 행
            // 하나를 절대 못 쪼개고 페이지 경계를 그냥 뚫고 넘쳤다). atom을
            // 하나씩 순서대로 별도 행으로 끼워넣어 atom-per-row 구조를 유지해야
            // push가 넘치는 부분을 정상적으로 다음 페이지로 쪼갤 수 있다.
            let anchorRowId =
                anchorRow?.id ??
                (isMovingDown
                    ? targetPageRows[0]?.row.id
                    : targetPageRows[targetPageRows.length - 1]?.row.id);
            let insertPosition: 'before' | 'after' = isMovingDown ? 'before' : 'after';
            ids.forEach((atomId, index) => {
                if (anchorRowId) {
                    // 그룹(헤더+섹션 전체 등) 전체를 강제 배치할 때, ids의 첫 번째
                    // (대표 atom, 보통 헤더)만 실제로 pageLocked를 건다. 나머지
                    // atom까지 전부 개별로 잠그면, 큰 섹션을 옮길 때 수십 개
                    // atom이 전부 "강제 배치됨" 배너를 달고 여러 페이지에 걸쳐
                    // 흩어지며 rebalance의 예약된 빈 공간이 페이지 하나를 통째로
                    // 잡아먹는 참사가 났다(실제 발생 확인됨). 대표 atom 하나만
                    // 옮긴 지점의 "표식"으로 잠그고, 나머지는 그 뒤에 물리적으로
                    // 이어붙이기만 하고 잠그지 않아 — 이후 자연 넘침 재계산
                    // (rebalancePageOverflow)이 나머지 내용을 정상적인 자연
                    // 콘텐츠처럼 자유롭게 다시 흘려보낼 수 있다.
                    if (index === 0) {
                        usePrintStore
                            .getState()
                            .forceNextToRow([atomId], anchorRowId, insertPosition);
                    } else {
                        usePrintStore
                            .getState()
                            .insertAtomsNextToRow([atomId], anchorRowId, insertPosition);
                    }
                    // 첫 삽입 이후로는 방금 넣은 행을 기준으로 계속 '뒤에' 이어붙여야
                    // ids 내부 순서가 그대로 유지된다(맨 위에 붙는 경우도 두 번째
                    // atom부터는 첫 atom 뒤에 이어져야지, 매번 원래 anchorRow 앞에
                    // 다시 끼어들면 순서가 뒤집힌다).
                    insertPosition = 'after';
                } else {
                    // 이 페이지에 행이 하나도 없다(완전히 빈 페이지) — 첫 atom만
                    // forcePage로 넣고, 그 뒤부터는 방금 만들어진 행을 앵커 삼아
                    // 이어붙인다.
                    usePrintStore.getState().forcePage([atomId], targetPageIndex);
                }
                const latestLayout = usePrintStore.getState().outputLayout;
                const placement = latestLayout.placements.find((p) => p.atomId === atomId);
                const region = placement
                    ? latestLayout.regions.find((r) => r.id === placement.regionId)
                    : undefined;
                anchorRowId = region?.rowId ?? anchorRowId;
            });
            historyBatchActiveRef.current = false;
        },
        [getRowPairingKey, printableAtoms, effectivePageMap, store.outputLayout]
    );

    // 페이지별로 "어느 atom이 어느 region에, 그 안에서 어떤 항목 범위(run)로" 속하는지
    // 미리 계산해둔다. 렌더 루프와 placeAtomBeside 둘 다 이 하나의 파생값만 쓰도록
    // 통합해서, 예전처럼 같은 버킷팅 로직이 두 곳에 따로 있다가 어긋나는 걸 막는다.
    type PageRegionRuns = {
        pageRegionIds: Set<string>;
        firstRegionId: string | undefined;
        runsByRegionId: Map<string, RegionScopeRun[]>;
    };
    const pageRegionRunsList = useMemo<PageRegionRuns[]>(() => {
        const perPage = pageLayers.map((_, pageIdx) => {
            const { rows } = getOutputPageAt(store.outputLayout, pageIdx);
            const pageRegionIds = new Set(
                rows.flatMap(({ regions }) => regions.map((region) => region.id))
            );
            const firstRegionId = rows[0]?.regions[0]?.id;
            return {
                pageRegionIds,
                firstRegionId,
                atomsByRegionId: new Map<string, PrintAtomItem[]>(),
            };
        });

        // atom이 어느 페이지에 그려질지는 placement(사용자가 명시적으로 배치한
        // pageId)를 최우선으로 신뢰한다 — 자연 흐름(pageLayers[].items)만 훑던
        // 예전 로직은 placement가 다른 페이지를 가리켜도 무시하고 원래 자연
        // 페이지에만 그렸다. 그래서 cross-page 드래그가 store 데이터는 바뀌는데
        // 화면엔 전혀 반영되지 않는 버그가 났다. placement가 아직 없는(한 번도
        // 수동 배치 안 된) atom만 자연 페이지(atomPageMap)로 폴백한다.
        printableAtoms.forEach((atom) => {
            const placement = placementByAtomId.get(atom.id);
            const targetPageIdx = placement ? pageIndexByPageId.get(placement.pageId) : undefined;
            const pageIdx = targetPageIdx ?? atomPageMap.get(atom.id);
            if (pageIdx === undefined) return;
            const bucket = perPage[pageIdx];
            if (!bucket) return;
            const regionId =
                placement && bucket.pageRegionIds.has(placement.regionId)
                    ? placement.regionId
                    : bucket.firstRegionId;
            if (!regionId) return;
            bucket.atomsByRegionId.set(regionId, [
                ...(bucket.atomsByRegionId.get(regionId) ?? []),
                atom,
            ]);
        });

        return perPage.map(({ pageRegionIds, firstRegionId, atomsByRegionId }) => {
            atomsByRegionId.forEach((atoms) =>
                atoms.sort((left, right) => {
                    const leftOrder = placementByAtomId.get(left.id)?.order;
                    const rightOrder = placementByAtomId.get(right.id)?.order;
                    if (leftOrder === undefined || rightOrder === undefined) return 0;
                    return leftOrder - rightOrder;
                })
            );
            const runsByRegionId = new Map<string, RegionScopeRun[]>();
            atomsByRegionId.forEach((atoms, regionId) =>
                runsByRegionId.set(regionId, computeRegionScopeRuns(regionId, atoms))
            );
            return { pageRegionIds, firstRegionId, runsByRegionId };
        });
    }, [
        pageLayers,
        store.outputLayout,
        placementByAtomId,
        computeRegionScopeRuns,
        printableAtoms,
        pageIndexByPageId,
        atomPageMap,
    ]);

    const placeAtomBeside = useCallback(
        (
            pageIndex: number,
            draggedAtomId: string,
            targetAtomId: string,
            side: 'left' | 'right'
        ) => {
            if (draggedAtomId === targetAtomId) return;
            // 헤더는 좌우 2열 페어링 대상이 될 수 없다 — getAssociatedAtomIds가 헤더를
            // 섹션 전체(모든 하위 행 포함)로 묶어 반환하므로, 여기서 걸러내지 않으면
            // 섹션 전체가 다른 항목 옆 한 컬럼으로 욱여넣어지려는 시도가 생긴다.
            if (isHeaderAtom(draggedAtomId) || isHeaderAtom(targetAtomId)) return;
            const pageLayer = pageLayers[pageIndex];
            if (!pageLayer) return;
            const { rows } = getOutputPageAt(store.outputLayout, pageIndex);
            const validAtomIds = new Set(pageLayer.items.map((atom) => atom.id));
            const atomsByRegionId = new Map<string, string[]>();
            pageRegionRunsList[pageIndex]?.runsByRegionId.forEach((runs, regionId) => {
                atomsByRegionId.set(
                    regionId,
                    runs.flatMap((run) => run.atoms.map((atom) => atom.id))
                );
            });

            const draggedIds = getAssociatedAtomIds(draggedAtomId).filter((id) =>
                validAtomIds.has(id)
            );
            const draggedSet = new Set(draggedIds);
            const targetIds = new Set(
                getAssociatedAtomIds(targetAtomId).filter(
                    (id) => validAtomIds.has(id) && !draggedSet.has(id)
                )
            );
            if (draggedIds.length === 0 || targetIds.size === 0) return;
            // 서로 다른 회사/프로젝트/섹션의 항목은 나란히 배치할 수 없다.
            if (getRowPairingKey(draggedAtomId) !== getRowPairingKey(targetAtomId)) return;

            const composition = rows
                .map(({ regions }) =>
                    regions
                        .map((region) =>
                            (atomsByRegionId.get(region.id) ?? []).filter(
                                (id) => !draggedSet.has(id)
                            )
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
            } else if (targetRow.length < 4) {
                targetRow.splice(side === 'left' ? columnIndex : columnIndex + 1, 0, draggedIds);
            } else {
                return;
            }
            usePrintStore.getState().replacePageComposition(pageIndex, composition);
        },
        [
            isHeaderAtom,
            pageLayers,
            store.outputLayout,
            pageRegionRunsList,
            getAssociatedAtomIds,
            getRowPairingKey,
        ]
    );

    const clearDragOverStates = useCallback(() => {
        setDragOverAtom(null);
        setDragOverRun(null);
        setDragOverEmptyRegion(null);
        setDragOverRow(null);
        setDragOverRowTarget(null);
    }, []);

    const touchCanvasDrag = useTouchDrag({
        disabled: inlineEditMode,
        onDragStart: (sourceId) => setDraggedCanvasAtomId(sourceId),
        onDragOver: (sourceId, targetId) => {
            if (!targetId) {
                clearDragOverStates();
                return;
            }
            const [kind, pageIndexRaw, ...rest] = targetId.split(':');
            const pageIndex = Number(pageIndexRaw);
            if (kind === 'atom') {
                const [side, ...atomIdParts] = rest;
                setDragOverAtom({
                    pageIndex,
                    atomId: atomIdParts.join(':'),
                    side: side as 'left' | 'right',
                });
                setDragOverRun(null);
                setDragOverEmptyRegion(null);
            } else if (kind === 'run') {
                const [regionId, runIndexRaw, ...atomIdParts] = rest;
                const anchorAtomId = atomIdParts.join(':');
                const runIndex = Number(runIndexRaw);
                const orderedIds =
                    pageRegionRunsList[pageIndex]?.runsByRegionId
                        .get(regionId)
                        ?.find((run) => run.runIndex === runIndex)
                        ?.atoms.map((atom) => atom.id) ?? [];
                setDragOverRun({
                    pageIndex,
                    regionId,
                    runIndex,
                    anchorAtomId,
                    position: positionFromOrder(sourceId, anchorAtomId, orderedIds),
                });
                setDragOverAtom(null);
                setDragOverEmptyRegion(null);
            } else if (kind === 'region') {
                setDragOverEmptyRegion({ pageIndex, regionId: rest.join(':') });
                setDragOverAtom(null);
                setDragOverRun(null);
            } else if (kind === 'atomrow') {
                // 다열 행 옆으로 atom을 끼워넣는 경우 — 터치는 정확한 clientY가 없으니
                // 항상 'after'(행 다음)로 취급한다.
                setDragOverRow({ rowId: rest.join(':'), position: 'after' });
            }
        },
        onDrop: (sourceId, targetId) => {
            const [kind, pageIndexRaw, ...rest] = targetId.split(':');
            const pageIndex = Number(pageIndexRaw);
            if (kind === 'atom') {
                const [side, ...atomIdParts] = rest;
                placeAtomBeside(
                    pageIndex,
                    sourceId,
                    atomIdParts.join(':'),
                    side as 'left' | 'right'
                );
            } else if (kind === 'run') {
                const [regionId, , ...atomIdParts] = rest;
                const anchorAtomId = atomIdParts.join(':');
                const anchorAtom = printableAtoms.find((a) => a.id === anchorAtomId);
                const sourceAtom = printableAtoms.find((a) => a.id === sourceId);
                if (
                    anchorAtom?.isHeader &&
                    sourceAtom &&
                    sourceAtom.sectionId !== anchorAtom.sectionId
                ) {
                    const position =
                        dragOverRun?.anchorAtomId === anchorAtomId ? dragOverRun.position : 'after';
                    moveWholeSectionOnto(sourceId, anchorAtomId, position);
                } else {
                    const movingIds = getAssociatedAtomIds(sourceId);
                    const position = clampAtomPositionPastHeader(
                        movingIds,
                        anchorAtomId,
                        dragOverRun?.anchorAtomId === anchorAtomId ? dragOverRun.position : 'after'
                    );
                    store.insertAtomsIntoRegion(movingIds, regionId, {
                        atomId: anchorAtomId,
                        position,
                    });
                }
            } else if (kind === 'region') {
                store.insertAtomsIntoRegion(getAssociatedAtomIds(sourceId), rest.join(':'), null);
            } else if (kind === 'atomrow') {
                store.insertAtomsNextToRow(getAssociatedAtomIds(sourceId), rest.join(':'), 'after');
            }
        },
        onDragEnd: () => {
            setDraggedCanvasAtomId(null);
            clearDragOverStates();
        },
    });

    // 2/3열 행 자체를 통째로 위/아래 재정렬하는 별도 드래그 소스 — atom 드래그와
    // id 스킴이 겹치지 않도록 완전히 분리된 useTouchDrag 인스턴스를 쓴다.
    const touchRowDrag = useTouchDrag({
        onDragStart: (sourceId) => setDraggedRowId(sourceId),
        onDragOver: (sourceId, targetId) => {
            if (!targetId) {
                setDragOverRow(null);
                setDragOverRowTarget(null);
                return;
            }
            const [kind, ...rest] = targetId.split(':');
            if (kind === 'row') {
                const [pageIndexRaw, targetRowId] = rest;
                if (targetRowId === sourceId) {
                    setDragOverRow(null);
                    return;
                }
                const orderedRowIds = getOutputPageAt(
                    store.outputLayout,
                    Number(pageIndexRaw)
                ).rows.map(({ row }) => row.id);
                setDragOverRow({
                    rowId: targetRowId,
                    position: positionFromOrder(sourceId, targetRowId, orderedRowIds),
                });
                setDragOverRowTarget(null);
            } else if (kind === 'atom') {
                // 터치는 정확한 clientY가 없어 항상 'after'(그 atom 다음)로 취급한다.
                setDragOverRowTarget({ atomId: rest.join(':'), position: 'after' });
                setDragOverRow(null);
            }
        },
        onDrop: (sourceId, targetId) => {
            if (!targetId) return;
            const [kind, ...rest] = targetId.split(':');
            if (kind === 'row') {
                const [, targetRowId] = rest;
                if (targetRowId === sourceId) return;
                const position =
                    dragOverRow?.rowId === targetRowId ? dragOverRow.position : 'after';
                resolveRowToRowMove(sourceId, targetRowId, position);
            } else if (kind === 'atom') {
                const targetAtomId = rest.join(':');
                const rowAtomIds = getRowAtomIds(sourceId, store.outputLayout);
                const rowSectionId = rowAtomIds
                    .map((id) => printableAtoms.find((a) => a.id === id)?.sectionId)
                    .find((v): v is string => v !== undefined);
                const targetAtomForRow = printableAtoms.find((a) => a.id === targetAtomId);
                if (
                    targetAtomForRow?.isHeader &&
                    rowSectionId &&
                    rowSectionId !== targetAtomForRow.sectionId &&
                    rowAtomIds[0]
                ) {
                    moveWholeSectionOnto(rowAtomIds[0], targetAtomId, 'after');
                } else if (
                    rowSectionId &&
                    targetAtomForRow &&
                    rowSectionId === targetAtomForRow.sectionId
                ) {
                    // 같은 섹션일 때만 위치 재조정 — 다른 섹션의 일반 항목(헤더 아님) 위에
                    // 놓였다면 아무 것도 하지 않는다(구조가 무관한 섹션과 섞이는 것 방지).
                    store.moveRowToAtom(sourceId, { atomId: targetAtomId, position: 'after' });
                }
            }
        },
        onDragEnd: () => {
            setDraggedRowId(null);
            setDragOverRow(null);
            setDragOverRowTarget(null);
        },
    });

    // 개별 드래그/삭제/병합 함수마다 "섹션 섞이면 안 된다" 가드를 따로 넣는
    // 방식은 함수 하나라도 빠뜨리면 바로 다시 섞이는 문제가 반복됐다(실제로
    // 여러 번 재발). 대신 여기서 매번 무조건 강제한다 — 이 페이지의 모든 행을
    // "섹션의 자연 문서 순서" 기준으로 재정렬한다. 같은 섹션에 속한 행끼리는
    // 서로의 상대 순서를 보존하되(안정 정렬), 다른 섹션 행이 그 사이에 끼어들
    // 수는 구조적으로 없어진다 — 2/3/4열 행이 "구성 범위를 벗어나는" 경로를
    // 어떤 버그가 만들어내든, 다음 렌더에서 무조건 제자리로 스냅백된다.
    const enforceSectionRowOrder = useCallback(
        (layout: OutputLayout): OutputLayout => {
            // 예전엔 "섹션 랭크"로만 정렬해서, 같은 섹션 안에서 구성 관리 패널로
            // 항목 순서(itemOrderOverrides)를 바꿔도 이미 명시적으로 배치(materialize)된
            // 행끼리는 서로의 상대 순서가 안정 정렬로 그대로 보존돼 절대 안 바뀌었다
            // (실제 발생 확인됨 — 기술 스택 섹션에서 "프로젝트/학습"을 "핵심 기술
            // 스택"보다 위로 옮겨도 캔버스 렌더는 그대로였음). 섹션 단위가 아니라
            // atom 하나하나의 전체 문서상 순서(printableAtoms 인덱스)로 랭크를
            // 매기면, 섹션 간 순서는 물론 같은 섹션 안의 항목 순서 변경도 즉시
            // 반영된다.
            const atomRankById = new Map<string, number>();
            printableAtoms.forEach((atom, index) => {
                atomRankById.set(atom.id, index);
            });
            const rowRank = (row: OutputRow): number => {
                const ranks = getRowAtomIds(row.id, layout)
                    .map((id) => atomRankById.get(id))
                    .filter((r): r is number => r !== undefined);
                return ranks.length > 0 ? Math.min(...ranks) : Number.MAX_SAFE_INTEGER;
            };

            // 랭크 기반 정렬은 같은 페이지 안에서만 행 순서를 바꾼다 — 이미 다른
            // 페이지에 materialize돼 있는 행은 페이지를 넘나들며 옮길 방법이
            // 없어서, 순서가 바뀐 항목이 이미 뒤 페이지로 넘어가 있으면 여전히
            // 안 맞았다(실제 발생 확인됨 — "프로토콜을 지키며..."가 이미 2페이지에
            // materialize돼 있어서 순서상 1페이지로 와야 하는데도 그대로 2페이지에
            // 남음). 페이지 순서대로 훑으며 랭크가 이전 페이지의 최댓값보다 낮게
            // "역행"하는 행을 찾으면, 그 행의 배치를 아예 지워 순수 자연 흐름으로
            // 돌려보낸다 — 다음 self-heal에서 새로 갱신된 순서 기준으로 올바른
            // 페이지에 다시 배치된다. 강제 배치(pageLocked)된 행은 사용자의 명시적
            // 의도이므로 절대 건드리지 않는다.
            const isRowLocked = (row: OutputRow): boolean => {
                const regionIds = new Set(row.regionIds);
                return layout.placements.some((p) => regionIds.has(p.regionId) && p.pageLocked);
            };
            let runningMaxRank = -Infinity;
            const displacedAtomIds: string[] = [];
            layout.pages.forEach((page) => {
                const pageRows = layout.rows
                    .filter((row) => row.pageId === page.id)
                    .sort((a, b) => a.order - b.order);
                pageRows.forEach((row) => {
                    // 2-4열로 나란히 배치된 행은 pageLocked 행과 마찬가지로 사용자가
                    // 드래그로 명시적으로 만든 구조다 — 이 스캔은 self-heal이 outputLayout
                    // 바뀔 때마다(되돌리기/다시실행 포함) 무조건 도는데, 컬럼 페어링된
                    // 행까지 랭크 역행 검사 대상에 넣으면 방금 만든 2열 배치가 되돌리기와
                    // 무관하게 다음 self-heal 패스에서 조용히 단일열로 풀려버린다(실제
                    // 발생 확인됨 — 2열로 나눈 직후/되돌리기 후 화면이 계속 단일열로
                    // 되돌아감). 그래서 여기서도 아예 검사 대상에서 뺀다.
                    if (isRowLocked(row) || row.regionIds.length > 1) return;
                    const rank = rowRank(row);
                    if (rank === Number.MAX_SAFE_INTEGER) return;
                    if (rank < runningMaxRank) {
                        // 2-4열로 나란히 배치된(컬럼 페어링된) 행이 역행 대상이면
                        // 행에 속한 atom을 전부 배치 해제한다 — 컬럼 페어링은
                        // 순서와 무관한 별도 구조라서 "순서만 바로잡고 페어링은
                        // 그대로 유지"가 불가능하다. 그래서 페어링째로 풀어
                        // 자연 흐름(단일열)으로 돌려보내고, 나란히 배치를 다시
                        // 원하면 사용자가 드래그로 재조립해야 한다. 순서 변경과
                        // 동시에 컬럼 재구성까지 자동으로 맞추는 건 이 함수의
                        // 책임 밖으로 남겨둔 개선 여지다 — TODO(print-canvas):
                        // 구성 관리에서 순서를 바꿨을 때 멀티컬럼 페어링을
                        // 새 순서에 맞게 자동으로 재구성하는 전용 로직.
                        displacedAtomIds.push(...getRowAtomIds(row.id, layout));
                    } else {
                        runningMaxRank = rank;
                    }
                });
            });
            const workingLayout =
                displacedAtomIds.length > 0
                    ? {
                          ...layout,
                          placements: layout.placements.filter(
                              (p) => !displacedAtomIds.includes(p.atomId)
                          ),
                      }
                    : layout;

            const orderUpdates = new Map<string, number>();
            workingLayout.pages.forEach((page) => {
                const pageRowsOrdered = workingLayout.rows
                    .filter((row) => row.pageId === page.id)
                    .sort((a, b) => a.order - b.order);
                const ranked = pageRowsOrdered.map((row, originalIndex) => ({
                    row,
                    rank: rowRank(row),
                    originalIndex,
                }));
                const sorted = [...ranked].sort((a, b) =>
                    a.rank !== b.rank ? a.rank - b.rank : a.originalIndex - b.originalIndex
                );
                sorted.forEach(({ row }, index) => {
                    if (row.order !== index) orderUpdates.set(row.id, index);
                });
            });

            if (orderUpdates.size === 0 && displacedAtomIds.length === 0) return layout;

            const rows = workingLayout.rows.map((row) =>
                orderUpdates.has(row.id) ? { ...row, order: orderUpdates.get(row.id)! } : row
            );
            const pages = workingLayout.pages.map((page) => {
                const pageRowIds = rows
                    .filter((row) => row.pageId === page.id)
                    .sort((a, b) => a.order - b.order)
                    .map((row) => row.id);
                const pageRegionIds = pageRowIds.flatMap(
                    (id) => rows.find((row) => row.id === id)?.regionIds ?? []
                );
                return { ...page, rowIds: pageRowIds, regionIds: pageRegionIds };
            });

            return { ...workingLayout, rows, pages };
        },
        [printableAtoms, getRowAtomIds]
    );

    // 어떤 열이 비어 완전히 사라지면 그 행은 단일열로 줄어드는데, 이웃 행과
    // 다시 합칠지는 printLayoutModel.ts가 판단할 수 없다(그 계층은 atomId 문자열만
    // 다뤄 섹션 개념이 없다). 여기서 sectionId를 알고 있는 상태로, 인접한 두
    // 단일열 행이 "같은 섹션"일 때만 합친다 — 예전에 섹션 구분 없이 무조건
    // 합치던 로직이 다른 섹션끼리 섞이는 버그를 냈던 것을 대체한다.
    //
    // materialize와 병합 전부를 로컬 layout 변수 위에서 수렴할 때까지 계산한
    // 뒤 store.setOutputLayout으로 딱 한 번만 커밋한다 — 예전처럼 병합 한 쌍마다
    // store를 따로 갱신하면 undo 히스토리에 자동 정리 스냅샷이 여러 개 쌓여서,
    // 사용자가 실제로 한 액션 하나를 되돌리려 해도 중간 자동 정리 단계로만
    // 한 걸음씩 되돌아가는 문제가 있었다.
    useEffect(() => {
        // 위 id 재사용 수정으로 대부분의 무한 루프 원인(행 id churn)은 없앴지만,
        // push/pull 재배치 자체가 두 페이지 사이에서 진짜로 수렴하지 않는 경계
        // 케이스가 이론적으로 남을 수 있다 — 그 경우를 대비한 최종 안전장치.
        // 50ms 이내에 이 effect가 12번 넘게 연속으로 도는 건 사용자의 정상적인
        // 상호작용으로는 발생하지 않는다(무한 루프의 특징적인 패턴). 감지되면
        // 그 순간의 layout을 그대로 유지하고 building을 건너뛰어 크래시 대신
        // "약간 안 다듬어진 상태로 멈춤"을 택한다.
        const burst = selfHealBurstRef.current;
        const now = performance.now();
        if (now - burst.last < 50) {
            burst.count += 1;
        } else {
            burst.count = 1;
        }
        burst.last = now;
        if (burst.count > 12) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn(
                    '[self-heal] runaway loop detected, holding layout to break infinite update cycle'
                );
            }
            return;
        }

        const debugStart = process.env.NODE_ENV !== 'production' ? performance.now() : 0;
        let layout = store.outputLayout;
        let changed = false;

        for (let pageIndex = 0; pageIndex < layout.pages.length; pageIndex += 1) {
            const next = materializePageIntoRows(layout, pageIndex);
            if (next !== layout) {
                layout = next;
                changed = true;
            }
        }

        const deduped = deduplicateRowIds(layout);
        if (deduped !== layout) {
            layout = deduped;
            changed = true;
        }

        const pruned = pruneEmptyOutputRows(layout);
        if (pruned !== layout) {
            layout = pruned;
            changed = true;
        }

        let guard = 0;
        while (guard < 500) {
            guard += 1;
            let mergedPair: [string, string] | null = null;
            for (const page of layout.pages) {
                const pageRows = layout.rows
                    .filter((row) => row.pageId === page.id)
                    .sort((a, b) => a.order - b.order);
                for (let i = 0; i < pageRows.length - 1; i += 1) {
                    const rowA = pageRows[i];
                    const rowB = pageRows[i + 1];
                    if (rowA.regionIds.length !== 1 || rowB.regionIds.length !== 1) continue;
                    // region.kind가 여전히 'FLOW'가 아니면(LEFT_COLUMN/RIGHT_COLUMN/COLUMN)
                    // 원래 다열이었다가 컬럼이 비어 단일열로 줄어든 잔재다 — 그런 행만
                    // 이웃과 재결합 대상이다. 둘 다 처음부터 'FLOW'(materialize가 만든
                    // atom 하나짜리 독립 행 등)면 합칠 이유가 없다 — 합치면 atom을 하나씩
                    // 독립된 행으로 유지하는 의미가 없어진다.
                    const regionA = layout.regions.find((r) => r.id === rowA.regionIds[0]);
                    const regionB = layout.regions.find((r) => r.id === rowB.regionIds[0]);
                    const isFragment = (region: typeof regionA) =>
                        region !== undefined && region.kind !== 'FLOW';
                    if (!isFragment(regionA) && !isFragment(regionB)) continue;
                    const sectionA = getRowSectionId(rowA.id, layout);
                    const sectionB = getRowSectionId(rowB.id, layout);
                    if (sectionA && sectionB && sectionA === sectionB) {
                        mergedPair = [rowA.id, rowB.id];
                        break;
                    }
                }
                if (mergedPair) break;
            }
            if (!mergedPair) break;
            layout = mergeAdjacentSingleColumnRows(layout, mergedPair[0], mergedPair[1]);
            changed = true;
        }

        const reordered = enforceSectionRowOrder(layout);
        if (reordered !== layout) {
            layout = reordered;
            changed = true;
        }

        // 드래그로 명시적 배치가 바뀌어 어떤 페이지가 콘텐츠 최대 높이를 넘으면,
        // 자연 흐름 페이지네이터는 그걸 모르므로(placement가 있는 atom엔 관여
        // 안 함) 저절로 안 쪼개진다 — 넘치는 뒤쪽 행을 다음 페이지로 밀어낸다.
        // maxPageCount를 pageLayers.length로 캡핑해서, 렌더 루프가 실제로 그리는
        // 페이지 수 밖으로 내용이 밀려나 안 보이게 되는 것을 막는다.
        // 간격 드래그가 진행 중이면 건너뛴다 — pointermove마다 아직 확정 안 된
        // 간격값으로 다시 판단하면 콘텐츠가 페이지 사이를 왔다갔다한다(실제 발생
        // 확인됨). 드래그가 끝나면 확정값으로 한 번 더 self-heal이 돌아 반영된다.
        if (!gapDragActiveRef.current) {
            const rebalanced = rebalancePageOverflow(
                layout,
                getOutputAtomHeightPx,
                pageContentHeightPx,
                pageLayers.length
            );
            if (rebalanced !== layout) {
                layout = rebalanced;
                changed = true;
            }
        }

        if (process.env.NODE_ENV !== 'production') {
            const elapsed = performance.now() - debugStart;
            if (elapsed > 4) {
                console.log(
                    `[self-heal] ${elapsed.toFixed(1)}ms, changed=${changed}, pages=${layout.pages.length}, rows=${layout.rows.length}, guard=${guard}`
                );
            }
        }
        if (changed) {
            skipHistoryForOutputLayoutRef.current = true;
            usePrintStore.getState().setOutputLayout(layout);
        }
    }, [
        store.outputLayout,
        materializePageIntoRows,
        getRowSectionId,
        enforceSectionRowOrder,
        getOutputAtomHeightPx,
        pageContentHeightPx,
        pageLayers.length,
    ]);

    // 헤더/행을 화면 밖 섹션 쪽으로 옮기려면 드래그 중 캔버스가 자동으로
    // 스크롤돼야 한다. window에 capture 단계로 붙여서, 개별 드롭존이
    // stopPropagation을 불러도(대부분 그렇다) 항상 먼저 실행되게 한다.
    useEffect(() => {
        const isDragging = !!draggedCanvasAtomId || !!draggedRowId;
        if (!isDragging) return;

        const EDGE = 90;
        const MAX_SPEED = 24;

        const scrollFromClientY = (clientY: number) => {
            const container = canvasRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const fromTop = clientY - rect.top;
            const fromBottom = rect.bottom - clientY;
            if (fromTop < EDGE) {
                container.scrollTop -= Math.ceil(
                    ((EDGE - Math.max(0, fromTop)) / EDGE) * MAX_SPEED
                );
            } else if (fromBottom < EDGE) {
                container.scrollTop += Math.ceil(
                    ((EDGE - Math.max(0, fromBottom)) / EDGE) * MAX_SPEED
                );
            }
        };

        const handleDragOver = (event: globalThis.DragEvent) => scrollFromClientY(event.clientY);
        const handlePointerMove = (event: PointerEvent) => {
            if (event.pointerType === 'mouse') return;
            scrollFromClientY(event.clientY);
        };

        window.addEventListener('dragover', handleDragOver, true);
        window.addEventListener('pointermove', handlePointerMove, true);
        return () => {
            window.removeEventListener('dragover', handleDragOver, true);
            window.removeEventListener('pointermove', handlePointerMove, true);
        };
    }, [draggedCanvasAtomId, draggedRowId]);

    // 행/region/atom 렌더러(RowRenderer/RegionRenderer/RegionRunRenderer/
    // CanvasAtomRenderer)가 읽는 DnD 상태·핸들러 전부를 하나로 묶는다.
    // atomRenderContextValue와 같은 이유로 useMemo 필수 — 안 그러면 dragOver*
    // 상태 하나 바뀔 때마다 이 값 전체가 새로 만들어져 memo가 무력화된다.
    // (10개 useState/touchCanvasDrag/touchRowDrag 자체는 그대로 PrintCanvas에
    // 남아있고, 이 context는 그 "현재 값"을 읽기 전용으로 노출만 한다.)
    const dragContextValue: PrintDragContextValue = useMemo(
        () => ({
            draggedCanvasAtomId,
            setDraggedCanvasAtomId,
            dragOverEmptyRegion,
            setDragOverEmptyRegion,
            dragOverRun,
            setDragOverRun,
            dragOverAtom,
            setDragOverAtom,
            draggedRowId,
            setDraggedRowId,
            dragOverRow,
            setDragOverRow,
            dragOverRowTarget,
            setDragOverRowTarget,
            hoveredGripRowId,
            setHoveredGripRowId,
            hoveredGripAtomId,
            setHoveredGripAtomId,
            overflowRegionKeys,
            touchCanvasDrag,
            touchRowDrag,
            printableAtoms,
            getRowPairingKey,
            isHeaderAtom,
            getRowAtomIds,
            getRowSectionId,
            getAssociatedAtomIds,
            placeAtomBeside,
            moveWholeSectionOnto,
            clampAtomPositionPastHeader,
            clampRowPositionPastHeader,
            clearDragOverStates,
            resolveRowToRowMove,
        }),
        [
            draggedCanvasAtomId,
            dragOverEmptyRegion,
            dragOverRun,
            dragOverAtom,
            draggedRowId,
            dragOverRow,
            dragOverRowTarget,
            hoveredGripRowId,
            hoveredGripAtomId,
            overflowRegionKeys,
            touchCanvasDrag,
            touchRowDrag,
            printableAtoms,
            getRowPairingKey,
            isHeaderAtom,
            getRowAtomIds,
            getRowSectionId,
            getAssociatedAtomIds,
            placeAtomBeside,
            moveWholeSectionOnto,
            clampAtomPositionPastHeader,
            clampRowPositionPastHeader,
            clearDragOverStates,
            resolveRowToRowMove,
        ]
    );

    // atom 콘텐츠 카드(AtomCard)가 읽는 파생값·핸들러 전부를 하나로 묶는다. 드래그
    // 중 dragOver* 상태가 바뀌어도 이 값의 의존성엔 전혀 없으므로 참조가 그대로
    // 유지되고, AtomCard(React.memo)가 재조정을 건너뛴다 — 그냥 매 렌더 새
    // 객체 리터럴로 만들면 memo가 무력화되므로 useMemo가 필수다.
    const atomRenderContextValue: PrintAtomRenderContextValue = useMemo(
        () => ({
            introData,
            inlineEditMode,
            contentOverrides,
            profile,
            careerSummary,
            groupedCoreSkills,
            orderedCareerCards,
            visibleCompetencies,
            orderedMilestones,
            orderedCredentialExperiences,
            coverLetterItems,
            orderedCoverLetterItems,
            coverLetterSectionTitle,
            setCoverLetterSectionTitle,
            setProfileOverride,
            setExperienceOverride,
            setCompetencyOverride,
            setDetailOverride,
            setCoverLetterOverride,
            addCoverLetterItem,
            updateAddedCoverLetterItem,
            removeAddedCoverLetterItem,
            updateCustomSection,
            removeCustomSection,
            addCustomSectionItem,
            updateCustomSectionItem,
            removeCustomSectionItem,
            toggleSkillSelection,
            setSkillSelectorModalOpen,
            atomPageMap,
            effectivePageMap,
            pageBreakBoundaryAtomIds,
            pageBreakBottomBoundaryAtomIds,
            getAtomDisplayTitle,
            startGapDrag,
            getForcePageAssociatedAtomIds,
            forceMoveToPage,
            isPageBreakBannerVisible,
            isForcedViaGroupOwner,
        }),
        [
            introData,
            inlineEditMode,
            contentOverrides,
            profile,
            careerSummary,
            groupedCoreSkills,
            orderedCareerCards,
            visibleCompetencies,
            orderedMilestones,
            orderedCredentialExperiences,
            coverLetterItems,
            orderedCoverLetterItems,
            coverLetterSectionTitle,
            setCoverLetterSectionTitle,
            setProfileOverride,
            setExperienceOverride,
            setCompetencyOverride,
            setDetailOverride,
            setCoverLetterOverride,
            addCoverLetterItem,
            updateAddedCoverLetterItem,
            removeAddedCoverLetterItem,
            updateCustomSection,
            removeCustomSection,
            addCustomSectionItem,
            updateCustomSectionItem,
            removeCustomSectionItem,
            toggleSkillSelection,
            setSkillSelectorModalOpen,
            atomPageMap,
            effectivePageMap,
            pageBreakBoundaryAtomIds,
            pageBreakBottomBoundaryAtomIds,
            getAtomDisplayTitle,
            startGapDrag,
            getForcePageAssociatedAtomIds,
            forceMoveToPage,
            isPageBreakBannerVisible,
            isForcedViaGroupOwner,
        ]
    );

    return (
        <PrintDragContext.Provider value={dragContextValue}>
            <PrintAtomRenderContext.Provider value={atomRenderContextValue}>
                <>
                    {showAutoPrintOverlay && (
                        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-3 bg-slate-950 text-white print:hidden">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-white" />
                            <p className="text-sm font-bold">PDF 인쇄를 준비하는 중입니다…</p>
                        </div>
                    )}
                    <div className="h-screen overflow-hidden flex flex-col bg-slate-900 print:h-auto print:overflow-visible print:bg-white">
                        <PrintPreviewBar
                            excludedCount={store.printExcludedIds.length}
                            totalPages={visiblePageLayers.length}
                            navOpen={store.navPanelOpen}
                            activeTemplateName={activeTemplateName}
                            onToggleNav={() => store.setNavPanelOpen(!store.navPanelOpen)}
                            onSaveLocal={handleSaveLocalTemplate}
                            onSaveServer={
                                adminMode ? () => setSaveTemplateModalOpen(true) : undefined
                            }
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
                                        인라인 문구 편집 모드 활성화: A4 종이 위의 파란색 테두리
                                        텍스트를 클릭하여 맞춤 문구를 직접 수정하세요. 상단
                                        &apos;템플릿으로 저장&apos; 클릭 시 함께 저장됩니다.
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 min-h-0 flex">
                            {marginSettingsOpen && (
                                <PrintDocumentSettingsPanel
                                    onClose={() => setMarginSettingsOpen(false)}
                                    pageCount={pageLayers.length}
                                    onZoomFit={handleZoomFit}
                                    activeTemplateName={activeTemplateName}
                                    adminMode={adminMode}
                                    onOpenTemplateModal={() => setModeModalOpen(true)}
                                    onSaveServerTemplate={
                                        adminMode ? () => setSaveTemplateModalOpen(true) : undefined
                                    }
                                    onSaveLocalTemplate={handleSaveLocalTemplate}
                                />
                            )}
                            <div
                                ref={canvasRef}
                                onPointerDown={handleCanvasPanPointerDown}
                                onPointerMove={handleCanvasPanPointerMove}
                                onPointerUp={handleCanvasPanPointerUp}
                                onPointerCancel={handleCanvasPanPointerUp}
                                onClick={(event) => {
                                    if (suppressNextCanvasClickRef.current) {
                                        suppressNextCanvasClickRef.current = false;
                                        return;
                                    }
                                    const target = (
                                        event.target as HTMLElement
                                    ).closest<HTMLElement>('[data-print-el]');
                                    const previous =
                                        canvasRef.current?.querySelector<HTMLElement>(
                                            '[data-print-active]'
                                        );
                                    if (previous && previous !== target) {
                                        previous.removeAttribute('data-print-active');
                                    }
                                    if (target) {
                                        if (target.hasAttribute('data-print-active')) {
                                            target.removeAttribute('data-print-active');
                                        } else {
                                            target.setAttribute('data-print-active', '');
                                        }
                                    }
                                }}
                                className={`pdf-canvas flex-1 min-h-0 overflow-auto bg-[#cbd5e1] flex flex-col items-center pt-10 pb-4 relative print:block print:h-auto print:w-full print:bg-transparent print:p-0 print:m-0 ${isSpacePanMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                            >
                                <div
                                    className="resume-page resume-print-shell transition-all duration-300 flex flex-col items-center gap-10 print:gap-0 print:w-full print:max-w-none print:m-0 print:p-0 print:bg-transparent"
                                    style={
                                        {
                                            zoom: store.zoom,
                                            '--print-line-height': store.lineHeight,
                                            '--print-font-scale': store.outputLayout.fontScale,
                                        } as CSSProperties
                                    }
                                >
                                    {visiblePageLayers.map((page, pageIdx) => {
                                        const { page: outputPage, rows } = getOutputPageAt(
                                            store.outputLayout,
                                            pageIdx
                                        );
                                        const pageRuns = pageRegionRunsList[pageIdx];
                                        const populatedRows = rows.filter(({ regions }) =>
                                            regions.some(
                                                (region) =>
                                                    (pageRuns?.runsByRegionId.get(region.id)
                                                        ?.length ?? 0) > 0
                                            )
                                        );
                                        const renderedRows =
                                            populatedRows.length > 0
                                                ? populatedRows
                                                : rows.slice(0, 1);

                                        // 2/3/4열 하위 행 때문에 한 섹션이 여러 OutputRow로 쪼개져도
                                        // (구조상 불가피 — row 하나는 열 개수 하나만 가질 수 있다)
                                        // 화면에서는 연속된 같은 섹션 행들을 하나의 박스로 묶어 보여준다
                                        // — "2열짜리도 이 구성의 범위 안에 있다"가 시각적으로 명확해진다.
                                        const sectionChunks: Array<{
                                            sectionId: string | undefined;
                                            rows: typeof renderedRows;
                                        }> = [];
                                        renderedRows.forEach((entry) => {
                                            const sectionId = getRowSectionId(
                                                entry.row.id,
                                                store.outputLayout
                                            );
                                            const last = sectionChunks[sectionChunks.length - 1];
                                            if (
                                                last &&
                                                sectionId !== undefined &&
                                                last.sectionId === sectionId
                                            ) {
                                                last.rows.push(entry);
                                            } else {
                                                sectionChunks.push({ sectionId, rows: [entry] });
                                            }
                                        });

                                        return (
                                            <PdfPageLayer
                                                key={page.pageId}
                                                pageId={page.pageId}
                                                pageIndex={pageIdx}
                                                totalPages={visiblePageLayers.length}
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
                                                    {sectionChunks.map((chunk, chunkIndex) => {
                                                        const rowElements = chunk.rows.map(
                                                            ({ row, regions: rawRegions }) => (
                                                                <RowRenderer
                                                                    key={row.id}
                                                                    pageIndex={pageIdx}
                                                                    row={row}
                                                                    rawRegions={rawRegions}
                                                                    pageRuns={pageRuns}
                                                                />
                                                            )
                                                        );
                                                        if (chunk.rows.length <= 1) {
                                                            return (
                                                                <Fragment
                                                                    key={`chunk:${chunkIndex}`}
                                                                >
                                                                    {rowElements}
                                                                </Fragment>
                                                            );
                                                        }
                                                        // 이 청크(2/3/4열 하위 행 포함, 여러 OutputRow로
                                                        // 쪼개진 하나의 섹션) 안의 어떤 행이든, 또는 그
                                                        // 안의 어떤 atom이든 호버 중이면 청크 전체를
                                                        // 파란 테두리로 감싼다 — atom 하나만 호버해도
                                                        // "이게 이 구성 범위 안에 있다"가 보이게.
                                                        const chunkRowIds = new Set(
                                                            chunk.rows.map(({ row }) => row.id)
                                                        );
                                                        const isChunkHovered =
                                                            (hoveredGripRowId !== null &&
                                                                chunkRowIds.has(
                                                                    hoveredGripRowId
                                                                )) ||
                                                            (hoveredGripAtomId !== null &&
                                                                chunk.rows.some(({ row }) =>
                                                                    getRowAtomIds(
                                                                        row.id,
                                                                        store.outputLayout
                                                                    ).includes(hoveredGripAtomId)
                                                                ));
                                                        return (
                                                            <div
                                                                key={`chunk:${chunkIndex}`}
                                                                className={`relative rounded-md transition ${
                                                                    isChunkHovered
                                                                        ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-white'
                                                                        : ''
                                                                }`}
                                                            >
                                                                {!store.hidePrintGuides && (
                                                                    <div
                                                                        aria-hidden="true"
                                                                        className="pointer-events-none absolute inset-0 z-0 rounded-md border-2 border-dashed border-slate-300/70 print:hidden"
                                                                    />
                                                                )}
                                                                <div className="relative">
                                                                    {rowElements}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
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
                                    onRequestToggle={() =>
                                        store.setNavPanelOpen(!store.navPanelOpen)
                                    }
                                    onToggle={store.toggleExcluded}
                                    onReorderItem={store.reorderItemInScope}
                                    onReorder={reorderSectionsAndSync}
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
                                        className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
                            if (!adminMode) store.setAutoPrintRequested(true);
                        }}
                        restricted={!adminMode}
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
                            baseContentFingerprint,
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
            </PrintAtomRenderContext.Provider>
        </PrintDragContext.Provider>
    );
}
