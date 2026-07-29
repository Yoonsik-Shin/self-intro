'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Save, FileText } from 'lucide-react';
import { jobPostingApi, ApiError } from '@/lib/api';
import type { JobPosting } from '@/lib/api/types';
import { MarkdownEditor } from '../shared/MarkdownEditor';

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
            setSavedMessage('저장되었습니다.');
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
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-bold text-slate-800">공고 메모</span>
                    <span className="text-xs text-slate-400">
                        면접 준비, 지원 관련 메모 등을 마크다운으로 작성해보세요. (Cmd+S / Ctrl+S
                        저장)
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {savedMessage && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <Check className="h-3.5 w-3.5" />
                            {savedMessage}
                        </span>
                    )}
                    {isDirty && !savedMessage && (
                        <span className="text-xs font-medium text-amber-600">
                            변경사항 있음 (저장 필요)
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saveMutation.isPending || !isDirty}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed ${
                            isDirty
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
                                : 'bg-slate-100 text-slate-400'
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

            <div className="rounded-xl border border-slate-200 bg-white">
                <MarkdownEditor value={memoText} onChange={setMemoText} />
            </div>
        </div>
    );
}
