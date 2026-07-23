'use client';

import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Heart } from 'lucide-react';
import { ApiError, donationApi } from '@/lib/api';
import type { DonationEventActor, DonationEventType } from '@/lib/api/types';

const DONATION_EVENT_LABELS: Record<DonationEventType, string> = {
    CREATED: '후원 생성',
    PAY_REQUESTED: '결제요청 발급',
    PAY_FAILED: '결제요청 실패',
    PAID: '결제완료',
    CANCELED: '취소/환불',
    CALLBACK_REJECTED: '콜백 거부',
};

const DONATION_ACTOR_LABELS: Record<DonationEventActor, string> = {
    VISITOR: '방문자',
    SYSTEM: '시스템',
    PAYAPP: '페이앱',
    KOFI: 'Ko-fi',
    ADMIN: '관리자',
};

export function DonationsPanel() {
    const queryClient = useQueryClient();
    const [expandedDonationId, setExpandedDonationId] = useState<number | null>(null);

    const { data: donationSummary, isLoading: isDonationLoading } = useQuery({
        queryKey: ['donations', 'admin'],
        queryFn: donationApi.adminList,
    });
    const { data: donationConfig } = useQuery({
        queryKey: ['donationConfig'],
        queryFn: donationApi.config,
    });
    const { data: donationEvents = [], isLoading: isDonationEventsLoading } = useQuery({
        queryKey: ['donations', 'admin', 'events', expandedDonationId],
        queryFn: () => donationApi.adminEvents(expandedDonationId!),
        enabled: expandedDonationId !== null,
    });

    const toggleDonationMutation = useMutation({
        mutationFn: (enabled: boolean) => donationApi.adminUpdateSettings(enabled),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['donationConfig'] }),
        onError: (error) => {
            alert(error instanceof ApiError ? error.message : '설정 변경에 실패했습니다.');
        },
    });

    const cancelDonationMutation = useMutation({
        mutationFn: (id: number) => donationApi.adminCancel(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['donations', 'admin'] });
            alert('환불 처리가 완료되었습니다.');
        },
        onError: (error) => {
            alert(error instanceof ApiError ? error.message : '환불 처리에 실패했습니다.');
        },
    });

    const handleCancelDonation = (id: number, amount: number) => {
        if (!window.confirm(`${amount.toLocaleString()}원 후원을 환불(결제취소)하시겠습니까?`))
            return;
        cancelDonationMutation.mutate(id);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                    <h2 className="text-xl font-black text-slate-950">후원 내역</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        페이앱 결제 기준 후원 내역입니다. 결제완료 건은 환불(전액취소)할 수
                        있습니다.
                    </p>
                </div>
                <label className="flex cursor-pointer items-center gap-3">
                    <span className="text-sm font-bold text-slate-600">후원 버튼 노출</span>
                    <button
                        role="switch"
                        aria-checked={donationConfig?.enabled === true}
                        disabled={donationConfig === undefined || toggleDonationMutation.isPending}
                        onClick={() =>
                            toggleDonationMutation.mutate(!(donationConfig?.enabled === true))
                        }
                        className={`relative h-7 w-12 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${donationConfig?.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                        <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${donationConfig?.enabled ? 'left-6' : 'left-1'}`}
                        />
                    </button>
                </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {[
                    {
                        label: '누적 후원금 (결제완료)',
                        value: donationSummary?.paidTotal,
                        suffix: '원',
                        icon: Heart,
                    },
                    {
                        label: '결제완료 건수',
                        value: donationSummary?.paidCount,
                        suffix: '건',
                        icon: Check,
                    },
                ].map(({ label, value, suffix, icon: Icon }) => (
                    <div
                        key={label}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-500">{label}</p>
                            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600">
                                <Icon className="h-4 w-4" />
                            </span>
                        </div>
                        <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                            {isDonationLoading || value === undefined
                                ? '—'
                                : `${value.toLocaleString()}${suffix}`}
                        </p>
                    </div>
                ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="px-5 py-3 font-bold">일시</th>
                                <th className="px-5 py-3 text-right font-bold">금액</th>
                                <th className="px-5 py-3 font-bold">메시지</th>
                                <th className="px-5 py-3 font-bold">상태</th>
                                <th className="px-5 py-3 text-right font-bold">환불</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(donationSummary?.donations ?? []).map((donation) => (
                                <Fragment key={donation.id}>
                                    <tr
                                        className="cursor-pointer text-slate-600 transition hover:bg-slate-50"
                                        onClick={() =>
                                            setExpandedDonationId(
                                                expandedDonationId === donation.id
                                                    ? null
                                                    : donation.id
                                            )
                                        }
                                    >
                                        <td className="px-5 py-3 font-semibold text-slate-700 whitespace-nowrap">
                                            <span className="mr-2 inline-block text-slate-400">
                                                {expandedDonationId === donation.id ? '▾' : '▸'}
                                            </span>
                                            {donation.createdAt.replace('T', ' ').slice(0, 16)}
                                        </td>
                                        <td className="px-5 py-3 text-right font-bold">
                                            {donation.amount.toLocaleString()}원
                                        </td>
                                        <td
                                            className="max-w-[240px] truncate px-5 py-3"
                                            title={donation.message ?? ''}
                                        >
                                            {donation.message ?? (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                                                    donation.status === 'PAID'
                                                        ? 'bg-emerald-50 text-emerald-600'
                                                        : donation.status === 'CANCELED'
                                                          ? 'bg-amber-50 text-amber-600'
                                                          : donation.status === 'FAILED'
                                                            ? 'bg-rose-50 text-rose-600'
                                                            : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                {donation.status === 'PAID'
                                                    ? '결제완료'
                                                    : donation.status === 'CANCELED'
                                                      ? '취소됨'
                                                      : donation.status === 'FAILED'
                                                        ? '실패'
                                                        : '대기'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            {donation.status === 'PAID' && (
                                                <button
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleCancelDonation(
                                                            donation.id,
                                                            donation.amount
                                                        );
                                                    }}
                                                    disabled={cancelDonationMutation.isPending}
                                                    className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-extrabold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    환불
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {expandedDonationId === donation.id && (
                                        <tr>
                                            <td colSpan={5} className="bg-slate-50 px-5 py-4">
                                                {isDonationEventsLoading ? (
                                                    <p className="text-sm font-semibold text-slate-400">
                                                        이력을 불러오는 중입니다.
                                                    </p>
                                                ) : donationEvents.length === 0 ? (
                                                    <p className="text-sm font-semibold text-slate-400">
                                                        기록된 이력이 없습니다.
                                                    </p>
                                                ) : (
                                                    <ol className="space-y-2">
                                                        {donationEvents.map((event) => (
                                                            <li
                                                                key={event.id}
                                                                className="flex items-baseline gap-3 text-sm"
                                                            >
                                                                <span className="whitespace-nowrap font-mono text-xs text-slate-400">
                                                                    {event.createdAt
                                                                        .replace('T', ' ')
                                                                        .slice(0, 19)}
                                                                </span>
                                                                <span
                                                                    className={`font-extrabold ${
                                                                        event.eventType === 'PAID'
                                                                            ? 'text-emerald-600'
                                                                            : event.eventType ===
                                                                                'CANCELED'
                                                                              ? 'text-amber-600'
                                                                              : event.eventType ===
                                                                                      'PAY_FAILED' ||
                                                                                  event.eventType ===
                                                                                      'CALLBACK_REJECTED'
                                                                                ? 'text-rose-600'
                                                                                : 'text-slate-700'
                                                                    }`}
                                                                >
                                                                    {
                                                                        DONATION_EVENT_LABELS[
                                                                            event.eventType
                                                                        ]
                                                                    }
                                                                </span>
                                                                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs font-bold text-slate-600">
                                                                    {
                                                                        DONATION_ACTOR_LABELS[
                                                                            event.actor
                                                                        ]
                                                                    }
                                                                </span>
                                                                {event.payState && (
                                                                    <span className="text-xs text-slate-400">
                                                                        pay_state={event.payState}
                                                                    </span>
                                                                )}
                                                                {event.detail && (
                                                                    <span
                                                                        className="truncate text-xs text-slate-500"
                                                                        title={event.detail}
                                                                    >
                                                                        {event.detail}
                                                                    </span>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ol>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                            {!isDonationLoading &&
                                (donationSummary?.donations ?? []).length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-5 py-10 text-center font-semibold text-slate-400"
                                        >
                                            아직 후원 내역이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            {isDonationLoading && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-5 py-10 text-center font-semibold text-slate-400"
                                    >
                                        후원 내역을 불러오는 중입니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
