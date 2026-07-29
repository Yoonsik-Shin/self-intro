'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Save, FileText } from 'lucide-react';
import { jobPostingApi, ApiError } from '@/lib/api';
import type { JobPosting } from '@/lib/api/types';

interface PostingMemoEditorProps {
    jobPosting: JobPosting;
}

export function PostingMemoEditor({ jobPosting }: PostingMemoEditorProps) {
    const queryClient = useQueryClient();
    const [memoText, setMemoText] = useState<string>(jobPosting.memo ?? '');
    const [savedMessage, setSavedMessage] = useState<string | null>(null);
    const [prevMemo, setPrevMemo] = useState<string | null>(jobPosting.memo);

    if (jobPosting.memo !== prevMemo) {
        setPrevMemo(jobPosting.memo);
        setMemoText(jobPosting.memo ?? '');
    }

    const isDirty = memoText !== (jobPosting.memo ?? '');

    const saveMutation = useMutation({
        mutationFn: (newMemo: string) => jobPostingApi.updateMemo(jobPosting.id, newMemo || null),
        onSuccess: (updatedPosting) => {
            queryClient.setQueryData<JobPosting[]>(['jobPostings'], (old) => {
                if (!old) return old;
                return old.map((item) => (item.id === updatedPosting.id ? updatedPosting : item));
            });
            queryClient.invalidateQueries({ queryKey: ['jobPostings'] });
            setSavedMessage('저장되었습니다');
            setTimeout(() => setSavedMessage(null), 3000);
        },
        onError: (error) => {
            alert(error instanceof ApiError ? error.message : '메모 저장에 실패했습니다.');
        },
    });

    const handleSave = useCallback(() => {
        saveMutation.mutate(memoText);
    }, [saveMutation, memoText]);

    // Save on Cmd+S or Ctrl+S
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                if (isDirty && !saveMutation.isPending) {
                    handleSave();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave, isDirty, saveMutation.isPending]);

    return (
        <div className="space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 shrink-0 text-slate-700" />
                        <h4 className="whitespace-nowrap text-sm font-extrabold text-slate-900">
                            공고 메모
                        </h4>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                        면접 준비, 담당자 연락처, 처우 조건 등을 자유롭게 기록하세요.
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {savedMessage && (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <Check className="h-3.5 w-3.5" />
                            {savedMessage}
                        </span>
                    )}
                    {isDirty && !savedMessage && (
                        <span className="text-xs font-bold text-amber-600">저장 필요</span>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saveMutation.isPending || !isDirty}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed ${
                            isDirty
                                ? 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40'
                                : 'border border-slate-200 bg-slate-50 text-slate-400'
                        }`}
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Save className="h-3.5 w-3.5" />
                        )}
                        저장
                    </button>
                </div>
            </div>

            {/* Textarea Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400">
                <textarea
                    value={memoText}
                    onChange={(e) => setMemoText(e.target.value)}
                    placeholder="이 공고와 관련된 메모를 자유롭게 입력하세요.&#10;(예: 면접 예상 질문, 처우 협상 노트, 채용 담당자 연락처 등)"
                    className="min-h-[300px] w-full resize-y border-none bg-transparent p-0 text-sm leading-relaxed text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 font-sans"
                />

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <span>💡</span> Cmd+S (Ctrl+S) 단축키로 빠르게 저장할 수 있습니다.
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-500">
                        {memoText.length.toLocaleString()} 자
                    </span>
                </div>
            </div>
        </div>
    );
}
