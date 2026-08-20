'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ArrowUp,
    Bot,
    Check,
    ChevronDown,
    CircleAlert,
    Copy,
    Cpu,
    Loader2,
    MessageSquare,
    Sparkles,
    User,
} from 'lucide-react';
import type { PortfolioEvidenceReadinessAssessment } from '@/lib/api/types';
import {
    AI_MODEL_OPTIONS,
    PROVIDER_BRAND_PATH,
    PROVIDER_COLOR,
    PROVIDER_FALLBACK_ICON,
    type AiModelProvider,
    type AiModelTagTone,
} from '@/lib/constants/aiModels';
import { useAiModelStore } from '@/store/useAiModelStore';

export type AiRevisionChatMessage = {
    id: number;
    senderType: string;
    content: string;
    aiModel?: string | null;
    createdAt: string;
};

type AiRevisionChatProps = {
    revisions: AiRevisionChatMessage[];
    isRevisionsLoading?: boolean;
    isGenerating: boolean;
    /** feedbackInstruction이 없으면 "처음부터 새로 생성", 있으면 그 피드백을 반영해 재생성한다. */
    onGenerate: (
        feedbackInstruction: string | undefined,
        aiModel: string,
        customModelName?: string
    ) => void;
    onCancelGenerate: () => void;
    /** AI 메시지 본문을 그대로 어딘가에 적용하고 싶을 때만 넘긴다(예: 자소서 답변 에디터). 없으면 "적용" 버튼을 숨긴다. */
    onApply?: (content: string) => void;
    /** 구조화된 revision처럼 메시지 ID가 필요한 적용 흐름에서 사용한다. */
    onApplyMessage?: (message: AiRevisionChatMessage) => void;
    title?: string;
    subtitle?: string;
    generateButtonLabel?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    inputPlaceholder?: string;
    showModelSelector?: boolean;
    showGenerateButton?: boolean;
    showHeader?: boolean;
    showGeneratingIndicator?: boolean;
    readinessNotice?: PortfolioEvidenceReadinessAssessment | null;
};

const MODEL_TAG_CLASS: Record<AiModelTagTone, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
};

function ModelProviderMark({
    provider,
    className,
}: {
    provider: AiModelProvider;
    className?: string;
}) {
    const brandPath = PROVIDER_BRAND_PATH[provider];
    if (brandPath) {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
                <path d={brandPath} />
            </svg>
        );
    }

    const FallbackIcon = PROVIDER_FALLBACK_ICON[provider] ?? Cpu;
    return <FallbackIcon className={className} aria-hidden="true" />;
}

/**
 * 자소서 대화형 재생성 UI(JobCoverLetterDrawer)에서 추출한 공용 채팅 컴포넌트.
 * 이력서/포트폴리오 PDF 초안 재생성에도 동일한 패턴(모델 선택 + 대화 타임라인 + 피드백 입력)을 쓴다.
 */
export function AiRevisionChat({
    revisions,
    isRevisionsLoading = false,
    isGenerating,
    onGenerate,
    onCancelGenerate,
    onApply,
    onApplyMessage,
    title = 'AI 초안 & 지적사항 타임라인',
    subtitle = '피드백 대화 이력이 자동 기록됩니다.',
    generateButtonLabel = '새 초안 생성',
    emptyTitle = '아직 생성된 초안이 없습니다.',
    emptyDescription = '[새 초안 생성] 버튼을 누르면 초안을 작성합니다.',
    inputPlaceholder = '지적사항이나 보완 요청을 입력하세요 (전송 버튼 클릭 시 반영)',
    showModelSelector = true,
    showGenerateButton = true,
    showHeader = true,
    showGeneratingIndicator = true,
    readinessNotice = null,
}: AiRevisionChatProps) {
    const globalAiModel = useAiModelStore((state) => state.modelKey);
    const globalCustomModelName = useAiModelStore((state) => state.customModelName);
    const setSuppressFloatingWidget = useAiModelStore((state) => state.setSuppressFloatingWidget);
    // 대시보드 헤더에서 고른 전역 기본값으로 초기화하되, 이 안에서 바꿔도 전역 값은 그대로 둔다.
    const [selectedAiModel, setSelectedAiModel] = useState(globalAiModel);
    const [customModelInput, setCustomModelInput] = useState(globalCustomModelName);
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const modelPickerRef = useRef<HTMLDivElement>(null);
    const selectedModel =
        AI_MODEL_OPTIONS.find((option) => option.id === selectedAiModel) ?? AI_MODEL_OPTIONS[0];

    useEffect(() => {
        if (!isModelMenuOpen) return;

        const closeModelMenu = (event: MouseEvent) => {
            if (!modelPickerRef.current?.contains(event.target as Node)) {
                setIsModelMenuOpen(false);
            }
        };
        const closeModelMenuWithEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsModelMenuOpen(false);
        };

        document.addEventListener('mousedown', closeModelMenu);
        document.addEventListener('keydown', closeModelMenuWithEscape);
        return () => {
            document.removeEventListener('mousedown', closeModelMenu);
            document.removeEventListener('keydown', closeModelMenuWithEscape);
        };
    }, [isModelMenuOpen]);

    // 이 컴포넌트는 자체 모델 선택 드롭다운을 갖고 있어, 떠 있는 동안 전역 플로팅 위젯까지
    // 겹쳐 보이면 어느 쪽이 우선인지 헷갈린다 — 마운트돼 있는 동안 위젯을 숨긴다.
    useEffect(() => {
        setSuppressFloatingWidget(true);
        return () => setSuppressFloatingWidget(false);
    }, [setSuppressFloatingWidget]);

    const chatBottomRef = useRef<HTMLDivElement>(null);
    const feedbackTextareaRef = useRef<HTMLTextAreaElement>(null);
    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }, []);

    useEffect(() => {
        if (revisions.length > 0) scrollToBottom();
    }, [revisions, scrollToBottom]);

    const [feedbackInput, setFeedbackInput] = useState('');
    const isEmptyChat =
        !isRevisionsLoading && revisions.length === 0 && !isGenerating && !readinessNotice;

    useEffect(() => {
        const textarea = feedbackTextareaRef.current;
        if (!textarea) return;

        const maxHeight = 160;
        textarea.style.height = 'auto';
        const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${nextHeight}px`;
        textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }, [feedbackInput]);

    const handleGenerate = (feedbackInstruction?: string) => {
        if (isGenerating) return;
        onGenerate(
            feedbackInstruction?.trim() || undefined,
            selectedAiModel,
            selectedAiModel === 'CUSTOM' ? customModelInput.trim() : undefined
        );
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('복사되었습니다.');
    };

    return (
        <div className="flex h-full flex-col overflow-hidden bg-white">
            {/* Chat Header */}
            {showHeader && (
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-indigo-50/50 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="shrink-0 rounded-md bg-indigo-600 p-2 text-white shadow-xs">
                            <Sparkles className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <h4 className="whitespace-nowrap text-sm font-extrabold text-slate-900">
                                {title}
                            </h4>
                            <p className="truncate text-xs font-semibold text-slate-500">
                                {subtitle}
                            </p>
                        </div>
                    </div>
                    {(showGenerateButton || isGenerating) && (
                        <button
                            type="button"
                            onClick={() => (isGenerating ? onCancelGenerate() : handleGenerate())}
                            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-2 text-xs font-extrabold shadow-xs transition ${
                                isGenerating
                                    ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                                    : 'border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50'
                            }`}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-rose-600" />
                                    <span>생성 취소</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                                    <span>{generateButtonLabel}</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}

            {/* Chat Messages Timeline */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/30 p-3">
                {isRevisionsLoading ? (
                    <div className="flex h-full items-center justify-center gap-2 text-sm font-semibold text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        대화 이력을 불러오는 중...
                    </div>
                ) : isEmptyChat ? (
                    <div className="flex min-h-full flex-col items-center justify-center px-6 py-4 text-center">
                        <div className="mb-3 rounded-full bg-indigo-100 p-3.5 text-indigo-600">
                            <Bot className="h-7 w-7" />
                        </div>
                        <p className="text-base font-extrabold text-slate-800">{emptyTitle}</p>
                        <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-500">
                            {emptyDescription}
                        </p>
                    </div>
                ) : (
                    revisions.map((rev) => {
                        const isUser = rev.senderType === 'USER';
                        return (
                            <div
                                key={rev.id}
                                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                            >
                                {!isUser && (
                                    <div className="h-7 w-7 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs shadow-xs mt-1">
                                        <Bot className="h-4 w-4" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[88%] rounded-2xl p-3.5 text-sm leading-6 shadow-xs ${
                                        isUser
                                            ? 'bg-amber-500 text-white rounded-br-none font-semibold'
                                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                                    }`}
                                >
                                    {isUser ? (
                                        <p className="mb-1 flex items-center gap-1 text-xs font-bold text-amber-100">
                                            <MessageSquare className="h-3 w-3" />
                                            지적 / 보완 요청
                                        </p>
                                    ) : (
                                        <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                                            <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200/80 bg-indigo-50 px-2 py-0.5 text-xs font-extrabold text-indigo-700 shadow-2xs">
                                                <Cpu className="h-3 w-3 text-indigo-600" />
                                                {rev.aiModel || 'AI 답변'}
                                            </span>
                                            <span className="text-xs font-semibold text-slate-400">
                                                {rev.createdAt
                                                    ? rev.createdAt.replace('T', ' ').slice(0, 16)
                                                    : ''}
                                            </span>
                                        </div>
                                    )}
                                    <div className="whitespace-pre-wrap">{rev.content}</div>

                                    {!isUser && (
                                        <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(rev.content)}
                                                className="flex items-center gap-1 whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
                                            >
                                                <Copy className="h-3 w-3" />
                                                복사
                                            </button>
                                            {(onApply || onApplyMessage) && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onApplyMessage
                                                            ? onApplyMessage(rev)
                                                            : onApply?.(rev.content)
                                                    }
                                                    className="flex items-center gap-1 whitespace-nowrap rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-xs transition hover:bg-indigo-700"
                                                >
                                                    <Check className="h-3 w-3" />
                                                    최종 답변으로 적용
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {isUser && (
                                    <div className="h-7 w-7 shrink-0 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs shadow-xs mt-1">
                                        <User className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
                {readinessNotice && (
                    <div className="flex justify-start gap-2" role="status" aria-live="polite">
                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white shadow-xs">
                            <Bot className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1 rounded-2xl rounded-bl-none border border-slate-300 bg-white p-3 text-sm leading-5 text-slate-800 shadow-xs">
                            <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                                <CircleAlert className="h-4 w-4 text-slate-600" />
                                <span className="font-extrabold text-slate-900">
                                    {readinessNotice.readiness === 'NEEDS_INPUT'
                                        ? '추가 설명 필요'
                                        : '근거 재선택 필요'}
                                </span>
                            </div>
                            <p className="font-medium">{readinessNotice.message}</p>
                            <div className="mt-2 grid grid-cols-5 gap-1.5">
                                {(
                                    [
                                        ['problem', '문제'],
                                        ['role', '역할'],
                                        ['judgment', '판단'],
                                        ['solution', '해결'],
                                        ['outcome', '성과'],
                                    ] as const
                                ).map(([key, label]) => {
                                    const item = readinessNotice.coverage[key];
                                    const statusLabel =
                                        item.status === 'SATISFIED'
                                            ? '충족'
                                            : item.status === 'PARTIAL'
                                              ? '일부'
                                              : '부족';
                                    return (
                                        <div
                                            key={key}
                                            title={item.reason}
                                            className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-center"
                                        >
                                            <span className="block text-xs font-bold text-slate-700">
                                                {label}
                                            </span>
                                            <span className="block text-[11px] font-medium text-slate-500">
                                                {statusLabel}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            {(readinessNotice.conflicts.length > 0 ||
                                readinessNotice.suggestions.length > 0) && (
                                <div className="mt-2 grid gap-3 lg:grid-cols-2">
                                    {readinessNotice.conflicts.length > 0 && (
                                        <div>
                                            <p className="text-xs font-extrabold text-slate-700">
                                                충돌하거나 관련성이 낮은 근거
                                            </p>
                                            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs leading-5 text-slate-600">
                                                {readinessNotice.conflicts.map((conflict) => (
                                                    <li key={conflict}>{conflict}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {readinessNotice.suggestions.length > 0 && (
                                        <div>
                                            <p className="text-xs font-extrabold text-slate-700">
                                                다음 행동
                                            </p>
                                            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs leading-5 text-slate-600">
                                                {readinessNotice.suggestions.map((suggestion) => (
                                                    <li key={suggestion}>{suggestion}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                            {readinessNotice.questions.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-xs font-extrabold text-slate-700">
                                        알려주면 좋은 내용
                                    </p>
                                    <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs leading-5 text-slate-600">
                                        {readinessNotice.questions.map((question) => (
                                            <li key={question}>{question}</li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {isGenerating && showGeneratingIndicator && (
                    <div className="flex gap-2.5 justify-start animate-pulse">
                        <div className="h-7 w-7 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                            <Bot className="h-4 w-4" />
                        </div>
                        <div className="rounded-2xl rounded-bl-none border border-indigo-100 bg-indigo-50/80 p-3.5 text-xs text-indigo-700 flex items-center justify-between gap-3 font-semibold flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                                <Loader2 className="h-4 w-4 animate-spin shrink-0 text-indigo-600" />
                                <span className="truncate">
                                    지적사항을 반영하여 초안을 작성하는 중입니다...
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={onCancelGenerate}
                                className="rounded-md bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-extrabold text-rose-600 transition hover:bg-rose-100 shrink-0 whitespace-nowrap shadow-2xs"
                            >
                                생성 취소
                            </button>
                        </div>
                    </div>
                )}
                <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="shrink-0 border-t border-slate-200 bg-white p-2.5">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (feedbackInput.trim() && !isGenerating) {
                            handleGenerate(feedbackInput);
                            setFeedbackInput('');
                        }
                    }}
                    className="rounded-2xl border border-slate-300 bg-white p-1.5 shadow-sm transition focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-200"
                >
                    <textarea
                        ref={feedbackTextareaRef}
                        rows={1}
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing)
                                return;
                            e.preventDefault();
                            if (!feedbackInput.trim() || isGenerating) return;
                            handleGenerate(feedbackInput);
                            setFeedbackInput('');
                        }}
                        placeholder={inputPlaceholder}
                        className="block min-h-9 max-h-40 w-full resize-none overflow-y-hidden bg-transparent px-3 py-2 text-sm font-medium leading-5 text-slate-800 outline-none placeholder:text-slate-400"
                    />
                    <div className="flex min-h-9 items-end justify-between gap-2 px-1 pb-1">
                        {showModelSelector ? (
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                <div ref={modelPickerRef} className="relative min-w-0">
                                    <button
                                        type="button"
                                        aria-haspopup="listbox"
                                        aria-expanded={isModelMenuOpen}
                                        aria-label={`AI 생성 모델: ${selectedModel.name}`}
                                        onClick={() => setIsModelMenuOpen((open) => !open)}
                                        className="flex max-w-[17rem] min-w-0 items-center gap-2 rounded-full bg-slate-100 py-1.5 pr-2.5 pl-1.5 text-left transition hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
                                    >
                                        <span
                                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                                            style={{
                                                backgroundColor:
                                                    PROVIDER_COLOR[selectedModel.provider],
                                            }}
                                        >
                                            <ModelProviderMark
                                                provider={selectedModel.provider}
                                                className="h-3.5 w-3.5"
                                            />
                                        </span>
                                        <span className="min-w-0 truncate text-xs font-semibold text-slate-700">
                                            {selectedModel.name}
                                        </span>
                                        <span
                                            className={`hidden shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:inline ${MODEL_TAG_CLASS[selectedModel.tagTone]}`}
                                        >
                                            {selectedModel.tag}
                                        </span>
                                        <ChevronDown
                                            className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`}
                                            aria-hidden="true"
                                        />
                                    </button>

                                    {isModelMenuOpen && (
                                        <div
                                            role="listbox"
                                            aria-label="AI 생성 모델 선택"
                                            className="absolute bottom-[calc(100%+0.5rem)] left-0 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
                                        >
                                            <div className="px-2 pt-1 pb-1.5 text-[11px] font-semibold text-slate-500">
                                                AI 생성 모델
                                            </div>
                                            <div className="max-h-72 space-y-0.5 overflow-y-auto overscroll-contain">
                                                {AI_MODEL_OPTIONS.map((option) => {
                                                    const isSelected =
                                                        option.id === selectedAiModel;
                                                    return (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            role="option"
                                                            aria-selected={isSelected}
                                                            onClick={() => {
                                                                setSelectedAiModel(option.id);
                                                                setIsModelMenuOpen(false);
                                                            }}
                                                            className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                                                                isSelected
                                                                    ? 'bg-indigo-50'
                                                                    : 'hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <span
                                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                                                                style={{
                                                                    backgroundColor:
                                                                        PROVIDER_COLOR[
                                                                            option.provider
                                                                        ],
                                                                }}
                                                            >
                                                                <ModelProviderMark
                                                                    provider={option.provider}
                                                                    className="h-4 w-4"
                                                                />
                                                            </span>
                                                            <span className="min-w-0 flex-1">
                                                                <span className="flex min-w-0 items-center gap-1.5">
                                                                    <span className="truncate text-[13px] font-semibold text-slate-800">
                                                                        {option.name}
                                                                    </span>
                                                                    <span
                                                                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${MODEL_TAG_CLASS[option.tagTone]}`}
                                                                    >
                                                                        {option.tag}
                                                                    </span>
                                                                </span>
                                                                <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-400">
                                                                    {option.price}
                                                                </span>
                                                            </span>
                                                            {isSelected && (
                                                                <Check className="h-4 w-4 shrink-0 text-indigo-600" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <p className="px-2 pt-2 pb-1 text-[10px] leading-4 text-slate-400">
                                                이 대화에서 생성할 초안에만 적용됩니다.
                                            </p>
                                        </div>
                                    )}
                                </div>
                                {selectedAiModel === 'CUSTOM' && (
                                    <input
                                        type="text"
                                        value={customModelInput}
                                        onChange={(e) => setCustomModelInput(e.target.value)}
                                        placeholder="API 모델명"
                                        aria-label="사용자 지정 API 모델명"
                                        className="min-w-0 max-w-64 flex-1 rounded-full border-0 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300"
                                    />
                                )}
                            </div>
                        ) : (
                            <span />
                        )}
                        <button
                            type="submit"
                            disabled={isGenerating || !feedbackInput.trim()}
                            aria-label="메시지 전송"
                            title="전송"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                        >
                            {isGenerating ? (
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                            ) : (
                                <ArrowUp className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
