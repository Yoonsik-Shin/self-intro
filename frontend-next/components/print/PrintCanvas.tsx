'use client';

import {
    Fragment,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
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
    MessageSquareText,
    MoveVertical,
    Pin,
    PinOff,
    Sparkles,
    Settings,
    Plus,
    RotateCcw,
    X,
} from 'lucide-react';
import { jobPostingApi, printTemplateApi } from '@/lib/api';
import type {
    IntroductionResponse,
    JobPostingCoverLetterItem,
    PrintTemplate,
    PrintTemplateContentOverrides,
} from '@/lib/api/types';
import { AiRevisionChat } from '@/components/shared/AiRevisionChat';
import {
    buildCareerCards,
    buildMilestones,
    buildOrderedCredentials,
    groupCoreSkills,
    groupSkillsByUsage,
} from '@/lib/introDerivations';
import { credentialKindLabel, formatCredentialPeriod } from '@/lib/format';
import { resumeMarkdownComponents } from '@/lib/markdown';
import { partitionAtomsIntoPages, type PrintAtomItem } from '@/lib/pdfLayoutEngine';
import {
    printableSections,
    LOCKED_PRINT_SECTION_ID,
    reorderablePrintSections,
} from '@/lib/printSections';
import { generateUniqueLocalName, getLocalSaves, saveLocal } from '@/lib/printTemplateLocal';
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

type Props = {
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
    const dragRef = useRef<{ kind: 'section'; id: string } | null>(null);
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
    const reviseAbortControllerRef = useRef<AbortController | null>(null);

    // jobPostingId prop은 /print?jobPostingId=로 직접 열었을 때만 채워진다 — 공고 상세
    // "템플릿 편집 & 미리보기"나 관리자 템플릿 목록은 templateId만 넘기므로, 이미 로드된
    // activeTemplate 자신의 jobPostingId를 폴백으로 써야 대화형 재생성 버튼이 뜬다.
    const effectiveJobPostingId = jobPostingId ?? activeTemplate?.jobPostingId ?? null;
    const canRevise = Boolean(effectiveJobPostingId && activeTemplate?.id);
    const { data: revisions = [], isLoading: isRevisionsLoading } = useQuery({
        queryKey: ['printTemplateRevisions', activeTemplate?.id],
        queryFn: () => printTemplateApi.revisions(activeTemplate!.id),
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
            await jobPostingApi.reviseAiPrintDraftStream(
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
                    const refreshed = effectiveJobPostingId
                        ? await printTemplateApi.listByJobPosting(effectiveJobPostingId)
                        : [];
                    const updated = refreshed.find((t) => t.id === event.response.templateId);
                    if (updated) {
                        setActiveTemplate(updated);
                        store.applyTemplate({
                            excludedIds: updated.excludedIds,
                            sectionOrder: updated.sectionOrder,
                            sectionGaps: updated.sectionGaps,
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
        textClassName = '',
        placeholder = '',
        onChange,
    }: {
        value: string;
        baseValue: string;
        multiline?: boolean;
        textClassName?: string;
        placeholder?: string;
        onChange: (newValue: string | undefined) => void;
    }) => {
        const isOverridden = value !== baseValue;

        if (!inlineEditMode) {
            return (
                <span className={`inline-block w-full max-w-full ${textClassName}`}>{value}</span>
            );
        }

        return (
            <span className={`group/edit relative inline-block w-full max-w-full ${textClassName}`}>
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
    // 인쇄 캔버스에서만 즉석으로 추가한 사전질문 항목. 음수 id로 서버 항목과 구분하며,
    // "자소서" 탭의 실제 데이터에는 저장되지 않는다(인쇄 결과에만 반영).
    const [addedCoverLetterItems, setAddedCoverLetterItems] = useState<JobPostingCoverLetterItem[]>(
        []
    );
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

    const selectAllSkillsInGroup = (skillIds: number[]) => {
        setContentOverrides((current) => {
            const defaultCoreSkillIds = introData.skills.filter((s) => s.isCore).map((s) => s.id);
            const currentSelected = current.selectedSkillIds ?? defaultCoreSkillIds;
            const set = new Set([...currentSelected, ...skillIds]);
            const nextSelected = Array.from(set);

            const isDefaultState =
                defaultCoreSkillIds.length === nextSelected.length &&
                defaultCoreSkillIds.every((id) => nextSelected.includes(id));

            return {
                ...current,
                selectedSkillIds: isDefaultState ? undefined : nextSelected,
            };
        });
    };

    const deselectAllSkillsInGroup = (skillIds: number[]) => {
        setContentOverrides((current) => {
            const defaultCoreSkillIds = introData.skills.filter((s) => s.isCore).map((s) => s.id);
            const currentSelected = current.selectedSkillIds ?? defaultCoreSkillIds;
            const deselectSet = new Set(skillIds);
            const nextSelected = currentSelected.filter((id) => !deselectSet.has(id));

            const isDefaultState =
                defaultCoreSkillIds.length === nextSelected.length &&
                defaultCoreSkillIds.every((id) => nextSelected.includes(id));

            return {
                ...current,
                selectedSkillIds: isDefaultState ? undefined : nextSelected,
            };
        });
    };

    const resetSkillsToAll = () => {
        setContentOverrides((current) => ({
            ...current,
            selectedSkillIds: undefined,
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
                resolvedIntroData.competencies.filter((c) => c.visible),
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

    useEffect(() => {
        if (!sanitizedInitialTemplate) return;
        const rawGaps = sanitizedInitialTemplate.sectionGaps as Record<string, unknown>;
        const { __forcedPageOverrides, __itemOrderOverrides, ...pureGaps } = rawGaps;
        store.applyTemplate({
            excludedIds: sanitizedInitialTemplate.excludedIds,
            sectionOrder: sanitizedInitialTemplate.sectionOrder,
            sectionGaps: pureGaps as Record<string, number>,
            forcedPageOverrides:
                __forcedPageOverrides && typeof __forcedPageOverrides === 'object'
                    ? (__forcedPageOverrides as Record<string, number>)
                    : {},
            itemOrderOverrides:
                __itemOrderOverrides && typeof __itemOrderOverrides === 'object'
                    ? (__itemOrderOverrides as Record<string, string[]>)
                    : {},
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

    const orderedReorderableSections = store.printSectionOrder
        .map((id) => reorderablePrintSections.find((s) => s.id === id))
        .filter((s): s is (typeof reorderablePrintSections)[number] => Boolean(s));
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
                groupedCoreSkills.forEach((group) => {
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
                // 항목이 하나도 없어도 관리자 편집 모드에서는 헤더(질문 추가 버튼)는 보여준다.
                // 그래야 첫 질문을 추가할 진입점이 생긴다. 공개/인쇄 시점엔 완전히 숨긴다.
                if (orderedCoverLetterItems.length === 0 && !(adminMode && inlineEditMode)) {
                    return;
                }
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
        });
        return atoms;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        store.printExcludedIds,
        orderedSectionIdsKey,
        groupedCoreSkills,
        orderedCompetencies,
        orderedCareerCards,
        orderedCredentialExperiences,
        orderedMilestones,
        orderedCoverLetterItems,
        adminMode,
        inlineEditMode,
    ]);

    const pageLayers = useMemo(
        () =>
            partitionAtomsIntoPages(
                printableAtoms,
                store.atomHeights,
                store.sectionGaps,
                store.forcedPageOverrides
            ),
        [printableAtoms, store.atomHeights, store.sectionGaps, store.forcedPageOverrides]
    );

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
            elements.forEach((el) => {
                const atomId = el.dataset.atomId;
                if (!atomId) return;

                const target =
                    el.querySelector<HTMLElement>('[data-print-el]') ||
                    (el.firstElementChild as HTMLElement | null) ||
                    el;
                const height =
                    target.offsetHeight ||
                    Math.round(target.getBoundingClientRect().height / (store.zoom || 1));
                if (height > 0) newHeights.set(atomId, height);
            });

            const previous = usePrintStore.getState().atomHeights;
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
        if (atomId === 'cover-letter-header' || atomId === 'cover-letter') return '사전질문';

        if (atomId.startsWith('cover-letter-item:')) {
            const itemId = atomId.replace('cover-letter-item:', '');
            const item = orderedCoverLetterItems.find((c) => String(c.id) === itemId);
            if (item?.question) return `'${item.question}'`;
            return '사전질문 항목';
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
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1 text-xs font-black text-white shadow-xs hover:bg-blue-700 transition cursor-pointer print:hidden"
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
                                            <span
                                                key={skill.id}
                                                className="inline-flex items-center print:hidden"
                                            >
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
                                직장 경력 (총 {careerSummary})
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
                            className="border-b border-slate-100 py-3.5 w-full relative"
                        >
                            {renderItemControls(itemId)}
                            <span className="resume-print-plain resume-meta inline-flex rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-bold text-slate-950 text-xs">
                                {career.period}
                            </span>
                            <p className="resume-item-title mt-1.5 font-black text-slate-800 text-sm">
                                {renderInlineText({
                                    value: career.companyName,
                                    baseValue: origCompanyName,
                                    textClassName: 'font-black text-slate-800 text-sm',
                                    placeholder: '회사명을 입력하세요',
                                    onChange: (val) =>
                                        setExperienceOverride(
                                            career.id,
                                            'title',
                                            val,
                                            origCompanyName
                                        ),
                                })}{' '}
                                ({career.employmentType})
                            </p>
                            <p className="resume-meta font-semibold text-slate-500 text-xs">
                                {career.department} / {career.role}
                            </p>
                            {career.summary && (
                                <div className="resume-body mt-2 text-xs text-slate-600">
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
                                    <div className="resume-body mt-0.5 text-xs text-slate-600">
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
                const isFirst = p.details[0]?.id === detail.id;

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
                            className="py-2 pl-0 border-b border-slate-100/60 last:border-b-0 w-full relative"
                        >
                            {renderItemControls(itemId)}
                            {isFirst && (
                                <div className="resume-detail-header flex items-center gap-1.5 pb-1.5 border-b border-slate-100 mb-2">
                                    <h4 className="resume-label flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700 text-[10px]">
                                        <Briefcase className="h-3 w-3 text-slate-500" />
                                        상세 경험
                                    </h4>
                                </div>
                            )}
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
                            <div className="flex items-baseline justify-between gap-2">
                                <h3 className="font-black text-slate-900 text-xs">{m.title}</h3>
                                <span className="text-[10px] text-slate-400 font-mono shrink-0">
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
                const isFirst = m.details[0]?.id === detail.id;

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
                            className="py-2 pl-0 border-b border-slate-100/60 last:border-b-0 w-full relative"
                        >
                            {renderItemControls(itemId)}
                            {isFirst && (
                                <div className="resume-detail-header flex items-center gap-1.5 pb-1.5 border-b border-slate-100 mb-2">
                                    <h4 className="resume-label flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700 text-[10px]">
                                        <Briefcase className="h-3 w-3 text-slate-500" />
                                        상세 경험
                                    </h4>
                                </div>
                            )}
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
                                사전질문
                            </h2>
                            {inlineEditMode && (
                                <button
                                    type="button"
                                    onClick={addCoverLetterItem}
                                    className="print:hidden flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-blue-700"
                                >
                                    <Plus className="h-3 w-3" />
                                    질문 추가
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

    const navItemGroups = useMemo(
        () => [
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
        ],
        [orderedCompetencies, orderedCareerCards, orderedCredentialExperiences, orderedMilestones]
    );

    return (
        <>
            <div className="h-screen overflow-hidden flex flex-col bg-slate-900 print:h-auto print:overflow-visible print:bg-white">
                <PrintPreviewBar
                    excludedCount={store.printExcludedIds.length}
                    totalPages={pageLayers.length}
                    navOpen={store.navPanelOpen}
                    activeTemplateName={activeTemplateName}
                    onToggleAll={store.toggleAllExcluded}
                    onToggleNav={() => store.setNavPanelOpen(!store.navPanelOpen)}
                    onSaveLocal={() => {
                        const defaultName = generateUniqueLocalName('내 맞춤 인쇄 설정');
                        const memo = window.prompt(
                            '현재 인쇄 설정에 대한 설명/메모를 입력하세요:',
                            defaultName
                        );
                        if (memo === null) return;
                        const trimmed = memo.trim() || defaultName;
                        const existingSaves = getLocalSaves();
                        if (existingSaves.some((s) => s.memo.trim() === trimmed)) {
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
                            itemOrderOverrides: store.itemOrderOverrides,
                        });
                        alert(`'${trimmed}' 인쇄 설정이 성공적으로 저장되었습니다.`);
                    }}
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
                />

                {inlineEditMode && (
                    <div className="bg-slate-950 border-b border-blue-500/40 px-4 py-2 text-xs font-bold text-blue-200 flex items-center justify-center gap-2 shadow-md print:hidden shrink-0 z-40">
                        <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
                        <span>
                            ✍️ 인라인 문구 편집 모드 활성화: A4 종이 위의 파란색 테두리 텍스트를
                            클릭하여 맞춤 문구를 직접 수정하세요. 상단 &apos;템플릿으로 저장&apos;
                            클릭 시 함께 저장됩니다.
                        </span>
                    </div>
                )}

                <div className="flex-1 min-h-0 flex">
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
                            {pageLayers.map((page, pageIdx) => (
                                <PdfPageLayer
                                    key={pageIdx}
                                    pageIndex={pageIdx}
                                    totalPages={pageLayers.length}
                                    hideGuides={store.hidePrintGuides}
                                >
                                    {page.items.map((atom) => (
                                        <div
                                            key={atom.id}
                                            data-atom-id={atom.id}
                                            className="relative w-full"
                                        >
                                            {renderAtomContent(atom)}
                                        </div>
                                    ))}
                                </PdfPageLayer>
                            ))}
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
                key={`${activeTemplate?.id ?? 'new'}-${saveTemplateModalOpen ? 'open' : 'closed'}`}
                open={saveTemplateModalOpen}
                onClose={() => setSaveTemplateModalOpen(false)}
                currentSettings={{
                    excludedIds: store.printExcludedIds,
                    sectionOrder: store.printSectionOrder,
                    sectionGaps: store.sectionGaps,
                    forcedPageOverrides: store.forcedPageOverrides,
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
                    allSkills={introData.skills}
                    selectedSkillIds={contentOverrides.selectedSkillIds}
                    onToggleSkill={toggleSkillSelection}
                    onSelectAllInGroup={selectAllSkillsInGroup}
                    onDeselectAllInGroup={deselectAllSkillsInGroup}
                    onResetToAll={resetSkillsToAll}
                    onClose={() => setSkillSelectorModalOpen(false)}
                />
            )}
        </>
    );
}
