'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronLeft, FileText, Loader2, X } from 'lucide-react';
import { jobPostingApi } from '@/lib/api/jobPosting';
import { ApiError } from '@/lib/api/client';
import type { JobPostingCoverLetterItem } from '@/lib/api/types';
import { AiRevisionChat } from '@/components/shared/AiRevisionChat';

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
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
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
    const handleGenerate = async (
        feedbackInstruction: string | undefined,
        aiModel: string,
        customModelName?: string
    ) => {
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
                    feedbackInstruction,
                    coverLetterItemId: item.id,
                    aiModel,
                    customModelName,
                },
                { signal: controller.signal }
            );

            // 생성된 초안을 답변 입력 상자에 자동 적용
            setAnswerText(res.draftAnswer);
            await refetchRevisions();
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
                        <AiRevisionChat
                            revisions={revisions}
                            isRevisionsLoading={isRevisionsLoading}
                            isGenerating={isGenerating}
                            onGenerate={handleGenerate}
                            onCancelGenerate={handleCancelGenerate}
                            onApply={handleApplyAnswer}
                            title="AI 초안 & 지적사항 타임라인"
                            subtitle="피드백 대화 이력이 자동 기록됩니다."
                            generateButtonLabel="새 초안 생성"
                            emptyTitle="아직 생성된 초안이 없습니다."
                            emptyDescription="[새 초안 생성] 버튼을 누르면 이력 및 경험 프로필을 종합 참조하여 맞춤 초안을 작성합니다."
                            inputPlaceholder="지적사항이나 보완 요청을 입력하세요 (전송 버튼 클릭 시 반영)"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(drawerContent, document.body);
}
