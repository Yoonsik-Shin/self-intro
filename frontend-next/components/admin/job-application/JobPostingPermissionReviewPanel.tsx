'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import type {
    JobCatalogPermissionBasis,
    JobCatalogPermissionPosting,
    JobCatalogPermissionReviewRequest,
} from '@/lib/api/jobCatalogPermission';
import { jobCatalogPermissionApi } from '@/lib/api/jobCatalogPermission';

const PERMISSION_BASIS_LABELS: Record<JobCatalogPermissionBasis, string> = {
    UNKNOWN: '권한 근거 없음',
    EMPLOYER_DIRECT_SUBMISSION: '채용 기업 직접 제공',
    WRITTEN_LICENSE: '서면 이용 허락',
    OFFICIAL_API_LICENSE: '재배포 허용 공식 API',
};

export function JobPostingPermissionReviewPanel({
    posting,
}: {
    posting: JobCatalogPermissionPosting;
}) {
    const queryClient = useQueryClient();
    const { data: reviewEvents = [], isLoading: isReviewEventsLoading } = useQuery({
        queryKey: ['jobPostingPermissionReviewEvents', posting.id],
        queryFn: () => jobCatalogPermissionApi.reviewEvents(posting.id),
    });
    const [draft, setDraft] = useState<JobCatalogPermissionReviewRequest>({
        reviewStatus: posting.permissionReviewStatus,
        permissionBasis: posting.permissionBasis,
        evidenceReference: posting.permissionEvidenceReference ?? '',
        grantorName: posting.permissionGrantorName ?? '',
        grantorAuthority: posting.permissionGrantorAuthority ?? '',
        permissionScopeNote: posting.permissionScopeNote ?? '',
        termsVersion: posting.permissionTermsVersion ?? '',
        revocationContact: posting.permissionRevocationContact ?? '',
        expiresAt: posting.permissionExpiresAt?.slice(0, 16) ?? '',
    });

    const reviewMutation = useMutation({
        mutationFn: (reviewStatus: JobCatalogPermissionReviewRequest['reviewStatus']) =>
            jobCatalogPermissionApi.review(posting.id, {
                ...draft,
                reviewStatus,
                expiresAt: draft.expiresAt || null,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobPostings'] });
            queryClient.invalidateQueries({ queryKey: ['workspaceJobPostingCatalog'] });
            queryClient.invalidateQueries({
                queryKey: ['jobPostingPermissionReviewEvents', posting.id],
            });
        },
        onError: (error) =>
            alert(
                error instanceof ApiError ? error.message : '공유 권한 검토 저장에 실패했습니다.'
            ),
    });

    const inputClass =
        'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-400';
    const statusLabel = posting.sharedCatalogEligible
        ? '공통 카탈로그 공개 가능'
        : posting.permissionReviewStatus === 'REJECTED'
          ? '공유 불가'
          : '검토 대기 · Workspace 비공개';

    return (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className="text-sm font-black text-slate-900">공통 카탈로그 공유 권한</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                        운영자 판단만으로 승인할 수 없습니다. 권리자 또는 계약·API 약관의 저장 및
                        재노출 허용 근거를 확인한 경우에만 승인하세요.
                    </p>
                </div>
                <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                        posting.sharedCatalogEligible
                            ? 'bg-emerald-100 text-emerald-700'
                            : posting.permissionReviewStatus === 'REJECTED'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                    }`}
                >
                    {statusLabel}
                </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="col-span-2 grid gap-1 text-[11px] font-bold text-slate-600">
                    권한 근거
                    <select
                        className={inputClass}
                        value={draft.permissionBasis}
                        onChange={(event) =>
                            setDraft((current) => ({
                                ...current,
                                permissionBasis: event.target.value as JobCatalogPermissionBasis,
                            }))
                        }
                    >
                        {Object.entries(PERMISSION_BASIS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="grid gap-1 text-[11px] font-bold text-slate-600">
                    허락 주체
                    <input
                        className={inputClass}
                        value={draft.grantorName ?? ''}
                        onChange={(event) =>
                            setDraft((current) => ({ ...current, grantorName: event.target.value }))
                        }
                        placeholder="회사·권리자명"
                    />
                </label>
                <label className="grid gap-1 text-[11px] font-bold text-slate-600">
                    허락 권한 확인
                    <input
                        className={inputClass}
                        value={draft.grantorAuthority ?? ''}
                        onChange={(event) =>
                            setDraft((current) => ({
                                ...current,
                                grantorAuthority: event.target.value,
                            }))
                        }
                        placeholder="담당 부서·계약 당사자"
                    />
                </label>
                <label className="col-span-2 grid gap-1 text-[11px] font-bold text-slate-600">
                    증빙 참조
                    <input
                        className={inputClass}
                        value={draft.evidenceReference ?? ''}
                        onChange={(event) =>
                            setDraft((current) => ({
                                ...current,
                                evidenceReference: event.target.value,
                            }))
                        }
                        placeholder="계약서 ID, 이메일 보관 위치, 공식 API 약관 URL"
                    />
                </label>
                <label className="col-span-2 grid gap-1 text-[11px] font-bold text-slate-600">
                    허용 범위
                    <textarea
                        className={`${inputClass} min-h-20 resize-y`}
                        value={draft.permissionScopeNote ?? ''}
                        onChange={(event) =>
                            setDraft((current) => ({
                                ...current,
                                permissionScopeNote: event.target.value,
                            }))
                        }
                        placeholder="저장·검색·회원 대상 재노출 허용 범위와 제한"
                    />
                </label>
                <label className="grid gap-1 text-[11px] font-bold text-slate-600">
                    약관·계약 버전
                    <input
                        className={inputClass}
                        value={draft.termsVersion ?? ''}
                        onChange={(event) =>
                            setDraft((current) => ({
                                ...current,
                                termsVersion: event.target.value,
                            }))
                        }
                        placeholder="선택 입력"
                    />
                </label>
                <label className="grid gap-1 text-[11px] font-bold text-slate-600">
                    철회 연락처
                    <input
                        className={inputClass}
                        value={draft.revocationContact ?? ''}
                        onChange={(event) =>
                            setDraft((current) => ({
                                ...current,
                                revocationContact: event.target.value,
                            }))
                        }
                        placeholder="철회 요청을 받을 이메일·채널"
                    />
                </label>
                <label className="grid gap-1 text-[11px] font-bold text-slate-600">
                    만료 시각
                    <input
                        type="datetime-local"
                        className={inputClass}
                        value={draft.expiresAt ?? ''}
                        onChange={(event) =>
                            setDraft((current) => ({ ...current, expiresAt: event.target.value }))
                        }
                    />
                </label>
            </div>

            <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate('REVIEW_REQUIRED')}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"
                >
                    검토 대기로 격리
                </button>
                <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate('REJECTED')}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 disabled:opacity-40"
                >
                    공유 불가
                </button>
                <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate('APPROVED')}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                >
                    증빙 확인 후 승인
                </button>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
                <h4 className="text-xs font-black text-slate-900">변경 불가 심사 이력</h4>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    승인·격리·거절 시점의 근거와 담당자를 스냅샷으로 보존합니다.
                </p>
                {isReviewEventsLoading ? (
                    <p className="mt-3 text-xs font-bold text-slate-400">
                        이력을 불러오는 중입니다.
                    </p>
                ) : reviewEvents.length === 0 ? (
                    <p className="mt-3 text-xs font-bold text-slate-400">
                        아직 저장된 심사 이력이 없습니다.
                    </p>
                ) : (
                    <ol className="mt-3 space-y-2">
                        {reviewEvents.map((event) => (
                            <li
                                key={event.id}
                                className="rounded-lg border border-slate-200 bg-white p-3 text-xs"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <strong className="text-slate-800">
                                        {event.reviewStatus} ·{' '}
                                        {PERMISSION_BASIS_LABELS[event.permissionBasis]}
                                    </strong>
                                    <time className="text-[11px] text-slate-400">
                                        {new Date(event.reviewedAt).toLocaleString('ko-KR')}
                                    </time>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">
                                    담당자 #{event.reviewedByUserId}
                                    {event.evidenceReference
                                        ? ` · 증빙 ${event.evidenceReference}`
                                        : ' · 증빙 참조 없음'}
                                </p>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </section>
    );
}
