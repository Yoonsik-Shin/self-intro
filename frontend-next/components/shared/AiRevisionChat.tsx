'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Check, Copy, Cpu, Loader2, MessageSquare, Send, Sparkles, User } from 'lucide-react';
import { AI_MODEL_OPTIONS } from '@/lib/constants/aiModels';
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
    title?: string;
    subtitle?: string;
    generateButtonLabel?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    inputPlaceholder?: string;
};

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
    title = 'AI 초안 & 지적사항 타임라인',
    subtitle = '피드백 대화 이력이 자동 기록됩니다.',
    generateButtonLabel = '새 초안 생성',
    emptyTitle = '아직 생성된 초안이 없습니다.',
    emptyDescription = '[새 초안 생성] 버튼을 누르면 초안을 작성합니다.',
    inputPlaceholder = '지적사항이나 보완 요청을 입력하세요 (전송 버튼 클릭 시 반영)',
}: AiRevisionChatProps) {
    const globalAiModel = useAiModelStore((state) => state.modelKey);
    const globalCustomModelName = useAiModelStore((state) => state.customModelName);
    const setSuppressFloatingWidget = useAiModelStore((state) => state.setSuppressFloatingWidget);
    // 대시보드 헤더에서 고른 전역 기본값으로 초기화하되, 이 안에서 바꿔도 전역 값은 그대로 둔다.
    const [selectedAiModel, setSelectedAiModel] = useState(globalAiModel);
    const [customModelInput, setCustomModelInput] = useState(globalCustomModelName);

    // 이 컴포넌트는 자체 모델 선택 드롭다운을 갖고 있어, 떠 있는 동안 전역 플로팅 위젯까지
    // 겹쳐 보이면 어느 쪽이 우선인지 헷갈린다 — 마운트돼 있는 동안 위젯을 숨긴다.
    useEffect(() => {
        setSuppressFloatingWidget(true);
        return () => setSuppressFloatingWidget(false);
    }, [setSuppressFloatingWidget]);

    const chatBottomRef = useRef<HTMLDivElement>(null);
    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }, []);

    useEffect(() => {
        if (revisions.length > 0) scrollToBottom();
    }, [revisions, scrollToBottom]);

    const [feedbackInput, setFeedbackInput] = useState('');

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
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 bg-indigo-50/50 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="rounded-xl bg-indigo-600 p-2 text-white shrink-0 shadow-xs">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-slate-900 whitespace-nowrap">
                            {title}
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-400 truncate">
                            {subtitle}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => (isGenerating ? onCancelGenerate() : handleGenerate())}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-extrabold transition whitespace-nowrap shrink-0 shadow-xs ${
                        isGenerating
                            ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                            : 'border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50'
                    }`}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-rose-600" />
                            <span>생성 취소</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                            <span>{generateButtonLabel}</span>
                        </>
                    )}
                </button>
            </div>

            {/* Model Selector Bar */}
            <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-100/70 px-4 py-2.5 shrink-0">
                <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-extrabold text-slate-700 whitespace-nowrap flex items-center gap-1">
                        <Cpu className="h-3.5 w-3.5 text-indigo-600" />
                        AI 생성 모델:
                    </label>
                    <div className="flex items-center gap-2 flex-1 max-w-[280px]">
                        <select
                            value={selectedAiModel}
                            onChange={(e) => setSelectedAiModel(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-extrabold text-slate-800 focus:border-indigo-500 focus:outline-none shadow-2xs"
                        >
                            {AI_MODEL_OPTIONS.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                    {opt.name} · {opt.tag}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {selectedAiModel === 'CUSTOM' && (
                    <input
                        type="text"
                        value={customModelInput}
                        onChange={(e) => setCustomModelInput(e.target.value)}
                        placeholder="공식 API 모델명 입력 (예: claude-sonnet-5, gpt-5.4-mini)"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                )}
            </div>

            {/* Chat Messages Timeline */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                {isRevisionsLoading ? (
                    <div className="flex h-full items-center justify-center gap-2 text-xs font-semibold text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        대화 이력을 불러오는 중...
                    </div>
                ) : revisions.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center p-6">
                        <div className="rounded-full bg-indigo-100 p-3.5 text-indigo-600 mb-3">
                            <Bot className="h-7 w-7" />
                        </div>
                        <p className="text-sm font-extrabold text-slate-800">{emptyTitle}</p>
                        <p className="mt-1.5 text-xs text-slate-400 max-w-xs leading-5">
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
                                    className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-5 shadow-xs ${
                                        isUser
                                            ? 'bg-amber-500 text-white rounded-br-none font-semibold'
                                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                                    }`}
                                >
                                    {isUser ? (
                                        <p className="mb-1 text-[10px] font-bold text-amber-100 flex items-center gap-1">
                                            <MessageSquare className="h-3 w-3" />
                                            지적 / 보완 요청
                                        </p>
                                    ) : (
                                        <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                                            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 shadow-2xs">
                                                <Cpu className="h-3 w-3 text-indigo-600" />
                                                {rev.aiModel || 'AI 답변'}
                                            </span>
                                            <span className="text-[10px] font-semibold text-slate-400">
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
                                                className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100 whitespace-nowrap"
                                            >
                                                <Copy className="h-3 w-3" />
                                                복사
                                            </button>
                                            {onApply && (
                                                <button
                                                    type="button"
                                                    onClick={() => onApply(rev.content)}
                                                    className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[10px] font-extrabold text-white transition hover:bg-indigo-700 shadow-xs whitespace-nowrap"
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
                {isGenerating && (
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
                                className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-extrabold text-rose-600 transition hover:bg-rose-100 shrink-0 whitespace-nowrap shadow-2xs"
                            >
                                🚫 생성 취소
                            </button>
                        </div>
                    </div>
                )}
                <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="border-t border-slate-200 p-3.5 bg-white shrink-0">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (feedbackInput.trim() && !isGenerating) {
                            handleGenerate(feedbackInput);
                            setFeedbackInput('');
                        }
                    }}
                    className="flex items-end gap-2"
                >
                    <textarea
                        rows={2}
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        placeholder={inputPlaceholder}
                        className="flex-1 min-w-0 resize-y min-h-[52px] max-h-36 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition font-medium leading-5"
                    />
                    <button
                        type="submit"
                        disabled={isGenerating || !feedbackInput.trim()}
                        className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 whitespace-nowrap shadow-sm h-10"
                    >
                        {isGenerating ? (
                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        ) : (
                            <Send className="h-4 w-4 shrink-0" />
                        )}
                        전송
                    </button>
                </form>
            </div>
        </div>
    );
}
