'use client';

import { Fragment, memo, useLayoutEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
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
    Plus,
    RotateCcw,
    Settings,
    Sparkles,
} from 'lucide-react';
import { groupCoreSkills } from '@/lib/introDerivations';
import { credentialKindLabel, formatCredentialPeriod, graduationStatusLabel } from '@/lib/format';
import { resumeMarkdownComponents } from '@/lib/markdown';
import type { PrintAtomItem } from '@/lib/pdfLayoutEngine';
import { usePrintStore } from '@/store/usePrintStore';
import { PrintEyeButton } from './PrintEyeButton';
import { usePrintAtomRenderContext } from './PrintAtomRenderContext';

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

export const AtomCard = memo(function AtomCard({ atom }: { atom: PrintAtomItem }) {
    const store = usePrintStore();
    const {
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
        effectivePageMap,
        pageBreakBoundaryAtomIds,
        pageBreakBottomBoundaryAtomIds,
        getAtomDisplayTitle,
        startGapDrag,
        getForcePageAssociatedAtomIds,
        forceMoveToPage,
        isPageBreakBannerVisible,
        isForcedViaGroupOwner,
    } = usePrintAtomRenderContext();

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

    const renderPageBreakControl = (
        id: string,
        sectionId: string,
        options?: { hidePinAndGap?: boolean }
    ) => {
        if (!isPageBreakBannerVisible(id)) return null;
        void sectionId;

        const isBoundary = pageBreakBoundaryAtomIds.has(id);
        const isBottomBoundary = pageBreakBottomBoundaryAtomIds.has(id);
        const forcedPage = store.forcedPageOverrides[id];
        const currentPage = effectivePageMap.get(id);
        const itemTitle = getAtomDisplayTitle(id);
        const isExcluded = store.printExcludedIds.includes(id);

        const shortItemTitle = itemTitle.length > 8 ? `${itemTitle.slice(0, 8)}...` : itemTitle;

        // 섹션 헤더는 renderSectionControls가 같은 섹션 id로 이미 핀/여백 조절을
        // 제공한다 — 여기서 또 다른 id(헤더 전용 atom id)로 같은 걸 하나 더
        // 띄우면 두 개의 서로 다른 핀/여백 상태가 생겨 혼란스럽다. 그런 경우
        // 호출부가 hidePinAndGap로 끈다.
        const pinAndGapButtons = options?.hidePinAndGap ? null : (
            <>
                <div
                    onPointerDown={startGapDrag(id)}
                    title="위치/여백 조절 (끌어서 간격 세밀 조절)"
                    className="flex h-6 w-6 touch-none cursor-ns-resize items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 transition shadow-sm shrink-0"
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
            // 헤더/회사 카드처럼 여러 행으로 이뤄진 그룹을 통째로 강제 배치한
            // 뒤 "한 단계 더" 올리거나 내리면, 그 그룹이 이미 하나의 행으로
            // 합쳐진 상태에서 다시 forceNextToRow로 재배치하며 행 구조가
            // 깨졌다(실제 발생 확인됨 — 두 번째로 누르면 뒤쪽 페이지 레이아웃이
            // 통째로 흐트러짐). 원자 하나짜리 그룹(atom 1개)만 안전이 확인돼서,
            // 여러 행짜리 그룹은 "한 단계 더" 이동 없이 해제 후 재배치만
            // 지원한다.
            const isSingleAtomGroup = getForcePageAssociatedAtomIds(id).length === 1;

            return (
                <div className="pp-page-break-banner absolute -top-7 left-[112px] right-0 z-30 flex items-center justify-between rounded-md border border-indigo-400/50 bg-slate-900/90 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-md print:hidden">
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
                        {isSingleAtomGroup && forcedPage > 0 && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    forceMoveToPage(
                                        getForcePageAssociatedAtomIds(id),
                                        forcedPage - 1
                                    );
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
                        {isSingleAtomGroup && options?.hidePinAndGap && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    forceMoveToPage(
                                        getForcePageAssociatedAtomIds(id),
                                        forcedPage + 1
                                    );
                                }}
                                className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-blue-500 active:scale-95 transition shadow-sm cursor-pointer shrink-0"
                                title={`'${itemTitle}' 항목을 ${forcedPage + 2}페이지로 한 단계 더 내립니다.`}
                            >
                                <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate max-w-[150px]">
                                    {forcedPage + 2}페이지로 더 내리기
                                </span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                store.clearForcedPage(getForcePageAssociatedAtomIds(id));
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
        const targetNextPage = (currentPage ?? 0) + 1;

        return (
            <div
                className={`pp-page-break-banner absolute -top-7 ${isBoundary || isBottomBoundary ? 'left-[112px]' : 'left-0'} right-0 z-30 flex items-center justify-between rounded-md border border-blue-400/50 bg-slate-900/90 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-md print:hidden`}
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
                                : isBottomBoundary
                                  ? `${itemTitle} 항목이 이 페이지의 마지막 행입니다.`
                                  : `${itemTitle} 여백 세밀 조절 중`
                        }
                    >
                        {isBoundary
                            ? `${shortItemTitle} 항목부터 다음 페이지로 분할`
                            : isBottomBoundary
                              ? `${shortItemTitle} 항목이 페이지 마지막 행`
                              : `${shortItemTitle} 여백 세밀 조절 중`}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isBoundary && targetPrevPage >= 0 && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                forceMoveToPage(getForcePageAssociatedAtomIds(id), targetPrevPage);
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
                    {isBottomBoundary && currentPage !== undefined && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                forceMoveToPage(getForcePageAssociatedAtomIds(id), targetNextPage);
                            }}
                            title={`'${itemTitle}' 항목을 ${targetNextPage + 1}페이지로 강제 내립니다.`}
                            className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-blue-500 active:scale-95 transition shadow-sm cursor-pointer shrink-0"
                        >
                            <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate max-w-[160px]">
                                &apos;{shortItemTitle}&apos; {targetNextPage + 1}페이지로 강제
                                내리기
                            </span>
                        </button>
                    )}
                    {pinAndGapButtons}
                </div>
            </div>
        );
    };

    const renderSectionControls = (id: string, headerAtomId?: string) => {
        if (store.hidePrintGuides) return null;
        // 섹션 헤더는 자연 페이지 분할 지점에 있을 때만 renderPageBreakControl이
        // "강제 올리기" 배너를 띄운다 — 페이지 중간에 얌전히 있는 헤더는 배너 자체가
        // 안 뜨니 내릴 방법이 아예 없었다(실제 보고됨). intro-profile은 항상 맨 위
        // 고정이라 대상에서 제외한다.
        const targetHeaderId = headerAtomId ?? id;
        const isForced =
            targetHeaderId !== 'intro-profile' &&
            store.forcedPageOverrides[targetHeaderId] !== undefined;
        const forcedPage = store.forcedPageOverrides[targetHeaderId];
        const currentPage = effectivePageMap.get(targetHeaderId);
        // renderPageBreakControl이 이 헤더용 큰 배너(강제 배치됨/페이지 분할
        // 지점)를 이미 보여주고 있으면, 여기서 또 강제 배치 버튼들을 띄우면
        // 두 컨트롤이 겹쳐 보인다(실제 발생 확인됨). 그 배너 안에도 이제
        // 위/아래 강제 이동이 다 있으니, 여기서는 배너가 없을 때만(페이지
        // 중간에 얌전히 있는 헤더) 강제 이동 버튼을 보여준다.
        const bannerAlreadyVisible =
            targetHeaderId !== 'intro-profile' && isPageBreakBannerVisible(targetHeaderId);

        return (
            <div className="pp-controls print:hidden flex items-center gap-1">
                <PrintEyeButton
                    id={id}
                    excluded={store.printExcludedIds.includes(id)}
                    onToggle={store.toggleExcluded}
                />
                {!bannerAlreadyVisible && targetHeaderId !== 'intro-profile' && isForced && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            forceMoveToPage(
                                getForcePageAssociatedAtomIds(targetHeaderId),
                                forcedPage! + 1
                            );
                        }}
                        title={`'${getAtomDisplayTitle(targetHeaderId)}' 섹션을 ${forcedPage! + 2}페이지로 한 단계 더 내립니다.`}
                        className="flex h-7 items-center gap-1 rounded-full bg-blue-600 px-2.5 text-[10px] font-black text-white shadow-lg transition hover:bg-blue-500"
                    >
                        <ArrowDown className="h-3.5 w-3.5" />
                        <span>{forcedPage! + 2}p로 더 내리기</span>
                    </button>
                )}
                {!bannerAlreadyVisible && targetHeaderId !== 'intro-profile' && isForced && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            store.clearForcedPage(getForcePageAssociatedAtomIds(targetHeaderId));
                        }}
                        title="강제 배치를 해제하고 원래 자동 배치 상태로 복원합니다."
                        className="flex h-7 items-center gap-1 rounded-full bg-rose-600 px-2.5 text-[10px] font-black text-white shadow-lg transition hover:bg-rose-700"
                    >
                        <ArrowDown className="h-3.5 w-3.5" />
                        <span>원래 위치로</span>
                    </button>
                )}
                {!bannerAlreadyVisible &&
                    targetHeaderId !== 'intro-profile' &&
                    !isForced &&
                    currentPage !== undefined && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                forceMoveToPage(
                                    getForcePageAssociatedAtomIds(targetHeaderId),
                                    currentPage + 1
                                );
                            }}
                            title={`'${getAtomDisplayTitle(targetHeaderId)}' 섹션 전체를 다음 페이지로 강제로 내립니다.`}
                            className="flex h-7 items-center gap-1 rounded-full bg-blue-600 px-2.5 text-[10px] font-black text-white shadow-lg transition hover:bg-blue-500"
                        >
                            <ArrowDown className="h-3.5 w-3.5" />
                            <span>다음 페이지로 내리기</span>
                        </button>
                    )}
                <div
                    onPointerDown={startGapDrag(id)}
                    title="위쪽 간격 조절 (아래로 끌면 넓어짐)"
                    className="grid h-7 w-7 touch-none cursor-ns-resize place-items-center rounded-full bg-slate-900/90 text-white shadow-lg transition hover:bg-slate-900"
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
        const currentPage = effectivePageMap.get(id);
        // 이 항목이 속한 회사 카드/섹션 헤더가 통째로 강제 배치돼서 나도
        // pageLocked를 같이 물려받은 경우, 나까지 독립적으로 "강제 배치됨"
        // 버튼들을 띄우면 같은 그룹 안에서 배지가 항목 수만큼 중복으로 뜬다
        // (실제 발생 확인됨 — 회사 카드 하나 내렸는데 그 안의 모든 프로젝트·
        // 상세에 배너가 다 뜸). 그룹 소유자가 강제 배치돼 있으면 개별 강제
        // 배치 버튼은 숨기고 눈(제외)·간격 조절만 남긴다 — 위치는 그룹
        // 소유자 쪽에서만 조절한다.
        const suppressedByGroupOwner = isForcedViaGroupOwner(id);
        // 회사 카드처럼 여러 행짜리 그룹을 강제 배치한 뒤 "한 단계 더"
        // 내리면 행 구조가 깨진다(renderPageBreakControl과 동일한 원인 —
        // forceNextToRow가 그룹 전체를 행 하나로 합쳐버림). 원자 하나짜리
        // 그룹만 안전하다고 확인됐다.
        const isSingleAtomGroup = getForcePageAssociatedAtomIds(id).length === 1;

        return (
            <div className="pp-controls print:hidden flex items-center gap-1 bg-slate-900/90 p-1 rounded-full shadow-lg backdrop-blur-md z-40">
                <PrintEyeButton
                    id={id}
                    excluded={store.printExcludedIds.includes(id)}
                    onToggle={store.toggleExcluded}
                />
                {!suppressedByGroupOwner && isSingleAtomGroup && isForced && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            forceMoveToPage(getForcePageAssociatedAtomIds(id), forcedPage + 1);
                        }}
                        title={`'${getAtomDisplayTitle(id)}' 항목을 ${forcedPage + 2}페이지로 한 단계 더 내립니다.`}
                        className="flex h-6 items-center gap-1 rounded-full bg-blue-600 px-2.5 text-[10px] font-black text-white hover:bg-blue-500 transition cursor-pointer shadow-sm"
                    >
                        <ArrowDown className="h-3 w-3" />
                        <span>{forcedPage + 2}p로 더 내리기</span>
                    </button>
                )}
                {!suppressedByGroupOwner && isForced && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            store.clearForcedPage(getForcePageAssociatedAtomIds(id));
                        }}
                        title={`원래 위치(${nextPageNum}페이지)로 다시 내리기`}
                        className="flex h-6 items-center gap-1 rounded-full bg-rose-600 px-2.5 text-[10px] font-black text-white hover:bg-rose-700 transition cursor-pointer shadow-sm"
                    >
                        <ArrowDown className="h-3 w-3" />
                        <span>원래 위치로</span>
                    </button>
                )}
                {!suppressedByGroupOwner &&
                    !isSingleAtomGroup &&
                    !isForced &&
                    currentPage !== undefined && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                forceMoveToPage(getForcePageAssociatedAtomIds(id), currentPage + 1);
                            }}
                            title={`'${getAtomDisplayTitle(id)}' 항목을 ${currentPage + 2}페이지로 강제로 내립니다.`}
                            className="flex h-6 items-center gap-1 rounded-full bg-blue-600 px-2.5 text-[10px] font-black text-white hover:bg-blue-500 transition cursor-pointer shadow-sm"
                        >
                            <ArrowDown className="h-3 w-3" />
                            <span>다음 페이지로 내리기</span>
                        </button>
                    )}
                <div
                    onPointerDown={startGapDrag(id)}
                    title="위아래로 끌어서 간격 세밀 조절"
                    className="grid h-6 w-6 touch-none cursor-ns-resize place-items-center rounded-full bg-slate-700/90 text-white transition hover:bg-blue-600 hover:scale-110"
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
                                <h2 className="resume-profile-role font-black tracking-tight text-slate-900 whitespace-nowrap text-sm">
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
                    {renderPageBreakControl('skills-header', 'skills', { hidePinAndGap: true })}
                    {renderSectionControls('skills', 'skills-header')}
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
                                className="absolute bottom-1 right-0 z-10 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1 text-xs font-black text-white shadow-xs hover:bg-blue-700 transition cursor-pointer print:hidden"
                                title="DB 전체 기술 스택 선택 및 관리 모달 열기"
                            >
                                <Settings className="h-3.5 w-3.5" />
                                <span>DB 기술스택 선택/관리</span>
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
                    {renderPageBreakControl('competencies-header', 'competencies', {
                        hidePinAndGap: true,
                    })}
                    {renderSectionControls('competencies', 'competencies-header')}
                    <div className="flex items-center justify-start gap-2 border-b border-slate-200 pb-2 w-full">
                        <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                            <Sparkles className="h-4 w-4 text-slate-900" />
                            핵심 역량
                        </h2>
                    </div>
                </div>
            );

        case 'competency-item': {
            const competency = visibleCompetencies.find((c) => c.id === atom.dataId);
            if (!competency) return null;
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
                                {((competency.tags ?? []).length > 0 ||
                                    competency.skills.length > 0) && (
                                    <p className="resume-meta mt-1 font-bold text-slate-500 text-[10px]">
                                        {((competency.tags ?? []).length > 0
                                            ? (competency.tags ?? [])
                                            : competency.skills
                                        )
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
                    {renderPageBreakControl('career-header', 'career', { hidePinAndGap: true })}
                    {renderSectionControls('career', 'career-header')}
                    <div className="flex items-center justify-start gap-2 border-b border-slate-200 pb-2 w-full">
                        <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                            <Briefcase className="h-4 w-4 text-slate-900" />
                            {careerSummary.trim() ? `직장 경력 (총 ${careerSummary})` : '직장 경력'}
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
            const p = allProjects.find((proj) => proj.details?.some((d) => d.id === atom.dataId));
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
                            (val) => setDetailOverride(detail.id, 'narrative', val, origNarrative),
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
                    {renderPageBreakControl('credentials-header', 'credentials', {
                        hidePinAndGap: true,
                    })}
                    {renderSectionControls('credentials', 'credentials-header')}
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
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                            <div className="flex items-baseline gap-2 min-w-0">
                                <span className="resume-label rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 shrink-0">
                                    {kind}
                                </span>
                                <h3 className="font-bold text-slate-900 text-xs break-words">
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
                    {renderPageBreakControl('projects-header', 'projects', { hidePinAndGap: true })}
                    {renderSectionControls('projects', 'projects-header')}
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
                            (val) => setDetailOverride(detail.id, 'narrative', val, origNarrative),
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
                    {renderPageBreakControl('cover-letter-header', 'cover-letter', {
                        hidePinAndGap: true,
                    })}
                    {renderSectionControls('cover-letter', 'cover-letter-header')}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 w-full">
                        <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                            <MessageSquareText className="h-4 w-4 text-slate-900" />
                            {inlineEditMode ? (
                                renderInlineText({
                                    value: coverLetterSectionTitle,
                                    baseValue: '지원 문항',
                                    textClassName: 'font-black text-slate-900 text-sm sm:text-base',
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
            const origQuestion = isAdded ? item.question : (origItem?.question ?? item.question);
            const origAnswer = isAdded ? item.answer : (origItem?.answer ?? item.answer);
            const onQuestionChange = isAdded
                ? (val: string | undefined) => updateAddedCoverLetterItem(item.id, 'question', val)
                : (val: string | undefined) =>
                      setCoverLetterOverride(item.id, 'question', val, origQuestion);
            const onAnswerChange = isAdded
                ? (val: string | undefined) => updateAddedCoverLetterItem(item.id, 'answer', val)
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
                    {renderPageBreakControl(sectionId, sectionId, { hidePinAndGap: true })}
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
                        <div className="print:hidden flex shrink-0 items-center gap-1">
                            {inlineEditMode && (
                                <button
                                    type="button"
                                    onClick={() => addCustomSectionItem(section.id)}
                                    className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-blue-700"
                                >
                                    <Plus className="h-3 w-3" /> 항목 추가
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => removeCustomSection(section.id)}
                                className="rounded bg-rose-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-rose-600"
                            >
                                섹션 삭제
                            </button>
                        </div>
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
                    <button
                        type="button"
                        onClick={() => removeCustomSectionItem(sectionId, itemId)}
                        className="print:hidden absolute right-8 top-2 z-20 rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white hover:bg-rose-600"
                    >
                        삭제
                    </button>
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
});
