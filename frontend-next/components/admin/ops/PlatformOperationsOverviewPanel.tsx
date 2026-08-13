'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, RefreshCw, ShieldCheck, UserRoundCheck, UsersRound } from 'lucide-react';
import { platformOperationsApi } from '@/lib/api';

const numberFormatter = new Intl.NumberFormat('ko-KR');

export function PlatformOperationsOverviewPanel() {
    const { data, error, isPending, isFetching, refetch } = useQuery({
        queryKey: ['ops', 'platform-overview'],
        queryFn: platformOperationsApi.overview,
        refetchOnWindowFocus: false,
    });

    return (
        <section className="space-y-6 text-slate-800">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
                        Platform Operations
                    </span>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                        사용자·Workspace 운영 현황
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        개인정보나 Workspace 콘텐츠를 열람하지 않고 계정, Workspace, Membership의
                        상태별 집계만 확인합니다.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void refetch()}
                    disabled={isFetching}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                    새로고침
                </button>
            </header>

            {error && (
                <p
                    role="alert"
                    className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
                >
                    운영 현황을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
                </p>
            )}

            {isPending || !data ? (
                <div className="grid gap-4 lg:grid-cols-3">
                    {[0, 1, 2].map((item) => (
                        <div key={item} className="h-56 animate-pulse rounded-2xl bg-slate-100" />
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid gap-4 lg:grid-cols-3">
                        <MetricGroup
                            icon={UsersRound}
                            title="플랫폼 계정"
                            total={data.accounts.total}
                            metrics={[
                                ['활성', data.accounts.active],
                                ['이메일 확인 대기', data.accounts.pendingVerification],
                                ['정지', data.accounts.suspended],
                                ['탈퇴', data.accounts.deleted],
                            ]}
                        />
                        <MetricGroup
                            icon={Building2}
                            title="Workspace"
                            total={data.workspaces.total}
                            metrics={[
                                ['활성', data.workspaces.active],
                                ['공개 중', data.workspaces.activePublished],
                                ['비공개', data.workspaces.activePrivate],
                                ['정지', data.workspaces.suspended],
                                ['폐쇄', data.workspaces.deleted],
                            ]}
                        />
                        <MetricGroup
                            icon={UserRoundCheck}
                            title="Membership"
                            total={data.memberships.total}
                            metrics={[
                                ['활성', data.memberships.active],
                                ['초대 대기', data.memberships.invited],
                                ['정지', data.memberships.suspended],
                            ]}
                        />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-slate-200">
                        <div className="flex items-center gap-2 text-sm font-bold">
                            <ShieldCheck className="h-5 w-5 text-emerald-400" />
                            최소 메타데이터 원칙: 이름·이메일·slug·콘텐츠는 이 화면에 제공하지
                            않습니다.
                        </div>
                        <time className="text-xs text-slate-400" dateTime={data.generatedAt}>
                            집계 {new Date(data.generatedAt).toLocaleString('ko-KR')}
                        </time>
                    </div>
                </>
            )}
        </section>
    );
}

function MetricGroup({
    icon: Icon,
    title,
    total,
    metrics,
}: {
    icon: typeof UsersRound;
    title: string;
    total: number;
    metrics: Array<[string, number]>;
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="rounded-xl bg-slate-950 p-2 text-white">
                        <Icon className="h-5 w-5" />
                    </span>
                    <h2 className="font-black text-slate-950">{title}</h2>
                </div>
                <strong className="text-2xl font-black tabular-nums text-slate-950">
                    {numberFormatter.format(total)}
                </strong>
            </div>
            <dl className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
                {metrics.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between py-2.5 text-sm">
                        <dt className="text-slate-500">{label}</dt>
                        <dd className="font-black tabular-nums text-slate-800">
                            {numberFormatter.format(value)}
                        </dd>
                    </div>
                ))}
            </dl>
        </article>
    );
}
