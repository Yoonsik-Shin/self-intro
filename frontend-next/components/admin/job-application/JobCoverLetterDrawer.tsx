'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Bot,
    Check,
    ChevronLeft,
    Copy,
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
    const [prevItemId, setPrevItemId] = useState<number | null>(item?.id ?? null);
    const [answerText, setAnswerText] = useState(initialAnswer);
    const [feedbackInput, setFeedbackInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const chatBottomRef = useRef<HTMLDivElement>(null);

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

    if (!isOpen || !item) return null;

    const characterLimit = item.characterLimit;
    const currentLength = answerText.length;
    const isOverLimit = characterLimit !== null && currentLength > characterLimit;

    // 초안 생성 / 피드백 반영 핸들러
    const handleGenerate = async (feedbackInstruction?: string) => {
        if (isGenerating) return;
        setIsGenerating(true);

        try {
            const res = await jobPostingApi.generateCoverLetterDraft(jobPostingId, {
                question: item.question,
                characterLimit: item.characterLimit,
                currentDraft: answerText || undefined,
                feedbackInstruction: feedbackInstruction?.trim() || undefined,
                coverLetterItemId: item.id,
            });

            // 생성된 초안을 답변 입력 상자에 자동 적용
            setAnswerText(res.draftAnswer);
            setFeedbackInput('');
            await refetchRevisions();
            scrollToBottom();
        } catch (error) {
            alert(
                error instanceof ApiError
                    ? error.message
                    : 'AI 초안 생성에 실패했습니다. 다시 시도해 주세요.'
            );
        } finally {
            setIsGenerating(false);
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

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
            <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
                <div className="w-screen max-w-5xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                    {/* Drawer Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                                        문항 {itemIndex + 1}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500">
                                        {companyName} · {positionTitle}
                                    </span>
                                </div>
                                <h3 className="mt-0.5 text-sm font-extrabold text-slate-800 line-clamp-1">
                                    {item.question}
                                </h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">
                                {characterLimit
                                    ? `최대 ${characterLimit.toLocaleString()}자`
                                    : '글자 수 제한 없음'}
                            </span>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Drawer Content: 2-Column Split */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
                        {/* Left Column: Final Answer Editor (7 Columns) */}
                        <div className="lg:col-span-7 flex flex-col border-r border-slate-200 p-6 overflow-y-auto bg-slate-50/30">
                            <div className="mb-3 flex items-center justify-between">
                                <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
                                    <FileText className="h-4 w-4 text-indigo-600" />
                                    최종 자소서 답변 에디터
                                </label>
                                <span
                                    className={`text-xs font-bold ${
                                        isOverLimit
                                            ? 'text-rose-500 font-extrabold'
                                            : 'text-slate-400'
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
                                rows={16}
                                value={answerText}
                                onChange={(e) => setAnswerText(e.target.value)}
                                placeholder="오른쪽 AI 대화창에서 초안을 생성하거나, 직접 답변을 작성해 보세요."
                                className="w-full flex-1 resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition shadow-xs"
                            />

                            <div className="mt-4 flex items-center justify-between">
                                <p className="text-xs text-slate-400">
                                    * 지적사항을 대화창에 입력하여 AI 초안을 계속 발전시킬 수
                                    있습니다.
                                </p>
                                <button
                                    type="button"
                                    disabled={isSaving || answerText === initialAnswer}
                                    onClick={handleSave}
                                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4" />
                                    )}
                                    답변 저장
                                </button>
                            </div>
                        </div>

                        {/* Right Column: AI Chat & Feedback Timeline (5 Columns) */}
                        <div className="lg:col-span-5 flex flex-col h-full overflow-hidden bg-white">
                            {/* Chat Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-indigo-50/40">
                                <div className="flex items-center gap-2">
                                    <div className="rounded-lg bg-indigo-600 p-1.5 text-white">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-extrabold text-slate-800">
                                            AI 초안 & 지적사항 타임라인
                                        </h4>
                                        <p className="text-[11px] font-semibold text-slate-400">
                                            피드백 대화 이력이 모두 자동 기록됩니다.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={isGenerating}
                                    onClick={() => handleGenerate()}
                                    className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
                                >
                                    {isGenerating ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-3.5 w-3.5" />
                                    )}
                                    새 초안 생성
                                </button>
                            </div>

                            {/* Chat Messages Timeline */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/20">
                                {isRevisionsLoading ? (
                                    <div className="flex h-full items-center justify-center gap-2 text-xs font-semibold text-slate-400">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        대화 이력을 불러오는 중...
                                    </div>
                                ) : revisions.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center text-center p-6">
                                        <div className="rounded-full bg-indigo-100 p-3 text-indigo-600 mb-2">
                                            <Bot className="h-6 w-6" />
                                        </div>
                                        <p className="text-xs font-extrabold text-slate-700">
                                            아직 생성된 초안이 없습니다.
                                        </p>
                                        <p className="mt-1 text-[11px] text-slate-400 max-w-xs">
                                            [새 초안 생성] 버튼을 누르면 이력 및 경험 프로필을 종합
                                            참조하여 맞춤 초안을 서빙합니다.
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
                                                    <div className="h-7 w-7 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs shadow-xs">
                                                        <Bot className="h-4 w-4" />
                                                    </div>
                                                )}
                                                <div
                                                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-5 shadow-xs ${
                                                        isUser
                                                            ? 'bg-amber-500 text-white rounded-br-none font-semibold'
                                                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                                                    }`}
                                                >
                                                    {isUser && (
                                                        <p className="mb-1 text-[10px] font-bold text-amber-100 flex items-center gap-1">
                                                            <MessageSquare className="h-3 w-3" />
                                                            지적 / 보완 요청
                                                        </p>
                                                    )}
                                                    <div className="whitespace-pre-wrap">
                                                        {rev.content}
                                                    </div>

                                                    {!isUser && (
                                                        <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleCopy(rev.content)
                                                                }
                                                                className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                                복사
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleApplyAnswer(rev.content)
                                                                }
                                                                className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[10px] font-extrabold text-white transition hover:bg-indigo-700 shadow-xs"
                                                            >
                                                                <Check className="h-3 w-3" />
                                                                최종 답변으로 적용
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                {isUser && (
                                                    <div className="h-7 w-7 shrink-0 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs shadow-xs">
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
                                        <div className="rounded-2xl rounded-bl-none border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs text-indigo-700 flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            지적사항을 반영하여 맞춤 자소서 초안을 재작성하는
                                            중입니다...
                                        </div>
                                    </div>
                                )}
                                <div ref={chatBottomRef} />
                            </div>

                            {/* Chat Input Bar */}
                            <div className="border-t border-slate-200 p-3 bg-white">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (feedbackInput.trim()) {
                                            handleGenerate(feedbackInput);
                                        }
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <input
                                        type="text"
                                        value={feedbackInput}
                                        onChange={(e) => setFeedbackInput(e.target.value)}
                                        placeholder="지적사항이나 보완 요청을 입력하세요 (예: 2단락 성과 강조)"
                                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isGenerating || !feedbackInput.trim()}
                                        className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2.5 text-xs font-extrabold text-white transition hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
                                    >
                                        {isGenerating ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                        전송
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
