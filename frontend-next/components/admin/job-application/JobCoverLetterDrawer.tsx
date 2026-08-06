'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Bot,
    Check,
    ChevronLeft,
    Copy,
    Cpu,
    FileText,
    Loader2,
    MessageSquare,
    Send,
    Sparkles,
    User,
    X,
} from 'lucide-react';
import { jobPostingApi } from '@/lib/api/jobPosting';
import { ApiError } from '@/lib/api/client';
import type { JobPostingCoverLetterItem } from '@/lib/api/types';
import { AI_MODEL_OPTIONS } from '@/lib/constants/aiModels';
import { useAiModelStore } from '@/store/useAiModelStore';

interface JobCoverLetterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    jobPostingId: number;
    companyName: string;
    positionTitle: string;
    item: JobPostingCoverLetterItem | null;
    itemIndex: number;
    initialAnswer: string;
    onSaveAnswer: (itemId: number, newAnswer: string) => Promise<void>;
}

export function JobCoverLetterDrawer({
    isOpen,
    onClose,
    jobPostingId,
    companyName,
    positionTitle,
    item,
    itemIndex,
    initialAnswer,
    onSaveAnswer,
}: JobCoverLetterDrawerProps) {
    const [mounted, setMounted] = useState(false);
    const [prevItemId, setPrevItemId] = useState<number | null>(item?.id ?? null);
    const [answerText, setAnswerText] = useState(initialAnswer);
    const [feedbackInput, setFeedbackInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const globalAiModel = useAiModelStore((state) => state.modelKey);
    const globalCustomModelName = useAiModelStore((state) => state.customModelName);
    const setSuppressFloatingWidget = useAiModelStore((state) => state.setSuppressFloatingWidget);
    // 대시보드 헤더에서 고른 전역 기본값으로 초기화하되, 이 드로어 안에서 바꿔도 전역 값은 그대로 둔다.
    const [selectedAiModel, setSelectedAiModel] = useState<string>(globalAiModel);
    const [customModelInput, setCustomModelInput] = useState<string>(globalCustomModelName);
    const chatBottomRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // item.id가 바뀔 때 answerText 리셋
    if (item && item.id !== prevItemId) {
        setPrevItemId(item.id);
        setAnswerText(initialAnswer);
    }

    const itemId = item?.id ?? 0;

    // 히스토리 조회 Query
    const {
        data: revisions = [],
        isLoading: isRevisionsLoading,
        refetch: refetchRevisions,
    } = useQuery({
        queryKey: ['coverLetterRevisions', itemId],
        queryFn: () => (itemId ? jobPostingApi.coverLetterRevisions(itemId) : Promise.resolve([])),
        enabled: isOpen && itemId > 0,
    });

    // 자동 스크롤
    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }, []);

    useEffect(() => {
        if (revisions.length > 0) {
            scrollToBottom();
        }
    }, [revisions, scrollToBottom]);

    // 이 드로어는 자체 모델 선택 드롭다운을 갖고 있어, 열려 있는 동안 전역 플로팅 위젯까지
    // 겹쳐 보이면 어느 쪽이 우선인지 헷갈린다 — 열려 있는 동안 위젯을 숨긴다.
    useEffect(() => {
        setSuppressFloatingWidget(isOpen);
        return () => setSuppressFloatingWidget(false);
    }, [isOpen, setSuppressFloatingWidget]);

    if (!isOpen || !item || !mounted) return null;

    const characterLimit = item.characterLimit;
    const currentLength = answerText.length;
    const isOverLimit = characterLimit !== null && currentLength > characterLimit;

    // 생성 취소 핸들러
    const handleCancelGenerate = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsGenerating(false);
    };

    // 초안 생성 / 피드백 반영 핸들러
    const handleGenerate = async (feedbackInstruction?: string) => {
        if (isGenerating) return;
        setIsGenerating(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const res = await jobPostingApi.generateCoverLetterDraft(
                jobPostingId,
                {
                    question: item.question,
                    characterLimit: item.characterLimit,
                    currentDraft: answerText || undefined,
                    feedbackInstruction: feedbackInstruction?.trim() || undefined,
                    coverLetterItemId: item.id,
                    aiModel: selectedAiModel,
                    customModelName:
                        selectedAiModel === 'CUSTOM' ? customModelInput.trim() : undefined,
                },
                { signal: controller.signal }
            );

            // 생성된 초안을 답변 입력 상자에 자동 적용
            setAnswerText(res.draftAnswer);
            setFeedbackInput('');
            await refetchRevisions();
            scrollToBottom();
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return; // 사용자가 생성을 중단한 경우
            }
            alert(
                error instanceof ApiError
                    ? error.message
                    : 'AI 초안 생성에 실패했습니다. 다시 시도해 주세요.'
            );
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    };

    const handleApplyAnswer = (content: string) => {
        setAnswerText(content);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSaveAnswer(item.id, answerText);
            alert('답변이 성공적으로 저장되었습니다.');
        } catch (error) {
            alert('답변 저장에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('복사되었습니다.');
    };

    const drawerContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6 animate-in fade-in duration-200">
            <div className="flex flex-col w-full h-full max-w-7xl max-h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/90 shrink-0">
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition shrink-0 bg-white border border-slate-200 shadow-xs"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="rounded-md bg-indigo-100 px-2.5 py-0.5 text-xs font-extrabold text-indigo-700 whitespace-nowrap shrink-0">
                                    문항 {itemIndex + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-500 truncate">
                                    {companyName} · {positionTitle}
                                </span>
                            </div>
                            <h3 className="mt-1 text-base font-extrabold text-slate-900 line-clamp-1">
                                {item.question}
                            </h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">
                            {characterLimit
                                ? `최대 ${characterLimit.toLocaleString()}자`
                                : '글자 수 제한 없음'}
                        </span>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition shrink-0"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Content Body: 2-Column Split (Left 7 : Right 5) */}
                <div className="grid grid-cols-12 flex-1 overflow-hidden min-h-0 bg-white">
                    {/* Left Column: Editor (7 Columns) */}
                    <div className="col-span-12 lg:col-span-7 flex flex-col border-r border-slate-200 p-6 overflow-y-auto bg-slate-50/40">
                        <div className="mb-3 flex items-center justify-between gap-2 shrink-0">
                            <label className="flex items-center gap-2 text-sm font-extrabold text-slate-800 whitespace-nowrap">
                                <FileText className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                                최종 자소서 답변 에디터
                            </label>
                            <span
                                className={`text-xs font-bold whitespace-nowrap shrink-0 ${
                                    isOverLimit ? 'text-rose-600 font-extrabold' : 'text-slate-500'
                                }`}
                            >
                                {currentLength.toLocaleString()}자
                                {characterLimit !== null &&
                                    ` / ${characterLimit.toLocaleString()}자`}
                                {isOverLimit &&
                                    ` (${(currentLength - characterLimit).toLocaleString()}자 초과)`}
                            </span>
                        </div>

                        <textarea
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            placeholder="오른쪽 AI 대화창에서 초안을 생성하거나, 직접 답변을 작성해 보세요."
                            className="w-full flex-1 resize-none rounded-xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition shadow-xs font-medium"
                        />

                        <div className="mt-4 flex items-center justify-between gap-3 shrink-0">
                            <p className="text-xs font-semibold text-slate-400">
                                * 오른쪽 대화창에서 지적사항을 입력하여 AI 초안을 계속 발전시킬 수
                                있습니다.
                            </p>
                            <button
                                type="button"
                                disabled={isSaving || answerText === initialAnswer}
                                onClick={handleSave}
                                className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-md whitespace-nowrap shrink-0"
                            >
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                ) : (
                                    <Check className="h-4 w-4 shrink-0" />
                                )}
                                답변 저장
                            </button>
                        </div>
                    </div>

                    {/* Right Column: AI Chat & Feedback Timeline (5 Columns) */}
                    <div className="col-span-12 lg:col-span-5 flex flex-col h-full overflow-hidden bg-white">
                        {/* Chat Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 bg-indigo-50/50 shrink-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="rounded-xl bg-indigo-600 p-2 text-white shrink-0 shadow-xs">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-extrabold text-slate-900 whitespace-nowrap">
                                        AI 초안 & 지적사항 타임라인
                                    </h4>
                                    <p className="text-[11px] font-semibold text-slate-400 truncate">
                                        피드백 대화 이력이 자동 기록됩니다.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    isGenerating ? handleCancelGenerate() : handleGenerate()
                                }
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
                                        <span>새 초안 생성</span>
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
                                    <p className="text-sm font-extrabold text-slate-800">
                                        아직 생성된 초안이 없습니다.
                                    </p>
                                    <p className="mt-1.5 text-xs text-slate-400 max-w-xs leading-5">
                                        [새 초안 생성] 버튼을 누르면 이력 및 경험 프로필을 종합
                                        참조하여 맞춤 초안을 작성합니다.
                                    </p>
                                </div>
                            ) : (
                                revisions.map((rev) => {
                                    const isUser = rev.senderType === 'USER';

                                    return (
                                        <div
                                            key={rev.id}
                                            className={`flex gap-2.5 ${
                                                isUser ? 'justify-end' : 'justify-start'
                                            }`}
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
                                                                ? rev.createdAt
                                                                      .replace('T', ' ')
                                                                      .slice(0, 16)
                                                                : ''}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="whitespace-pre-wrap">
                                                    {rev.content}
                                                </div>

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
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleApplyAnswer(rev.content)
                                                            }
                                                            className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[10px] font-extrabold text-white transition hover:bg-indigo-700 shadow-xs whitespace-nowrap"
                                                        >
                                                            <Check className="h-3 w-3" />
                                                            최종 답변으로 적용
                                                        </button>
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
                                            onClick={handleCancelGenerate}
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
                                    }
                                }}
                                className="flex items-end gap-2"
                            >
                                <textarea
                                    rows={2}
                                    value={feedbackInput}
                                    onChange={(e) => setFeedbackInput(e.target.value)}
                                    placeholder="지적사항이나 보완 요청을 입력하세요 (전송 버튼 클릭 시 반영)"
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
                </div>
            </div>
        </div>
    );

    return createPortal(drawerContent, document.body);
}
