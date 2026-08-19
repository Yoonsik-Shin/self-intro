'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';
import { ApiError } from '@/lib/api';
import { skillProposalApi, type SkillProposal } from '@/lib/api/skillProposal';
import { getSkillCategoryPresentation } from './skillPresentation';

export function SkillProposalOperations() {
    const queryClient = useQueryClient();
    const [rejectingId, setRejectingId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const { data: proposals = [], isLoading } = useQuery({
        queryKey: ['adminSkillProposals'],
        queryFn: skillProposalApi.pendingReview,
    });

    const reviewMutation = useMutation({
        mutationFn: ({
            id,
            reviewStatus,
            reason,
        }: {
            id: number;
            reviewStatus: 'APPROVED' | 'REJECTED';
            reason?: string;
        }) => skillProposalApi.review(id, { reviewStatus, rejectionReason: reason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminSkillProposals'] });
            queryClient.invalidateQueries({ queryKey: ['skill-catalog'] });
            setRejectingId(null);
            setRejectionReason('');
        },
        onError: (error) => {
            window.alert(error instanceof ApiError ? error.message : '심사 처리에 실패했습니다.');
        },
    });

    return (
        <div className="space-y-5">
            <AdminPageHeader
                eyebrow="Platform Catalog Governance"
                title="기술 카탈로그 심사"
                description="Workspace 사용자가 공통 카탈로그에 없는 기술을 제안하면 여기서 승인·반려합니다. 승인해야 공통 카탈로그(skill 테이블)에 정식으로 들어갑니다."
            />

            {isLoading ? (
                <EmptyState label="심사 대기 목록을 불러오는 중입니다." />
            ) : proposals.length === 0 ? (
                <EmptyState label="심사 대기 중인 제안이 없습니다." />
            ) : (
                <div className="grid gap-3 xl:grid-cols-2">
                    {proposals.map((proposal) => (
                        <ProposalCard
                            key={proposal.id}
                            proposal={proposal}
                            isRejecting={rejectingId === proposal.id}
                            rejectionReason={rejectionReason}
                            onStartReject={() => {
                                setRejectingId(proposal.id);
                                setRejectionReason('');
                            }}
                            onCancelReject={() => setRejectingId(null)}
                            onRejectionReasonChange={setRejectionReason}
                            onApprove={() =>
                                reviewMutation.mutate({ id: proposal.id, reviewStatus: 'APPROVED' })
                            }
                            onConfirmReject={() =>
                                reviewMutation.mutate({
                                    id: proposal.id,
                                    reviewStatus: 'REJECTED',
                                    reason: rejectionReason.trim() || undefined,
                                })
                            }
                            isPending={reviewMutation.isPending}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function ProposalCard({
    proposal,
    isRejecting,
    rejectionReason,
    onStartReject,
    onCancelReject,
    onRejectionReasonChange,
    onApprove,
    onConfirmReject,
    isPending,
}: {
    proposal: SkillProposal;
    isRejecting: boolean;
    rejectionReason: string;
    onStartReject: () => void;
    onCancelReject: () => void;
    onRejectionReasonChange: (value: string) => void;
    onApprove: () => void;
    onConfirmReject: () => void;
    isPending: boolean;
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-400">
                        {proposal.workspaceName ?? `Workspace #${proposal.workspaceId}`}
                    </p>
                    <h3 className="mt-2 truncate text-base font-black text-slate-950">
                        {proposal.name}
                    </h3>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                        {getSkillCategoryPresentation(proposal.category).label}
                    </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                    <Clock3 className="h-3.5 w-3.5" /> 심사 대기
                </span>
            </div>

            {proposal.comment && (
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
                    {proposal.comment}
                </p>
            )}

            {isRejecting ? (
                <div className="mt-4 space-y-2">
                    <textarea
                        autoFocus
                        rows={2}
                        value={rejectionReason}
                        onChange={(event) => onRejectionReasonChange(event.target.value)}
                        placeholder="반려 사유 (선택, 제안한 Workspace에 표시됩니다)"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-800"
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onCancelReject}
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            disabled={isPending}
                            onClick={onConfirmReject}
                            className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        >
                            반려 확정
                        </button>
                    </div>
                </div>
            ) : (
                <div className="mt-4 flex gap-2">
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={onStartReject}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                    >
                        <XCircle className="h-3.5 w-3.5" /> 반려
                    </button>
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={onApprove}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                        <CheckCircle2 className="h-3.5 w-3.5" /> 승인
                    </button>
                </div>
            )}
        </article>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center text-sm font-bold text-slate-500">
            {label}
        </div>
    );
}
