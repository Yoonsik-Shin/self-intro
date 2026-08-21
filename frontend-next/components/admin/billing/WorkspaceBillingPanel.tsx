'use client';

import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { billingApi } from '@/lib/api';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';
import { WorkspaceBillingManagement } from './WorkspaceBillingManagement';
import { PricingPlanCards } from '@/components/pricing/PricingPlanCards';
import { AiPointUsageGuide } from '@/components/pricing/AiPointUsageGuide';
import { IS_PRIVATE_BETA } from '@/lib/publicRelease';

const FEATURE_LABEL: Record<string, string> = {
    EXPERIENCE: '경험 정리',
    STUDY: '학습 정리',
    COMPETENCY: '역량 정리',
    PORTFOLIO_CASE: '포트폴리오 사례',
    JOB_SUPPORT: '지원서 분석',
    PDF_OUTPUT: 'PDF·출력 문서',
};

export function WorkspaceBillingPanel({ workspaceSlug }: { workspaceSlug: string }) {
    const overview = useQuery({
        queryKey: ['workspace', workspaceSlug, 'billing-overview'],
        queryFn: () => billingApi.overview(workspaceSlug),
    });
    const usage = useQuery({
        queryKey: ['workspace', workspaceSlug, 'ai-usage'],
        queryFn: () => billingApi.aiUsage(workspaceSlug),
    });

    const error = overview.error ?? usage.error;
    if (error) {
        return (
            <div className="space-y-4 text-slate-800">
                <AdminPageHeader
                    headingAs="h1"
                    title="요금제·AI 사용량"
                    description="Workspace에 귀속된 구독과 AI 사용량을 확인합니다."
                />
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error instanceof Error ? error.message : '요금제 정보를 불러오지 못했습니다.'}
                </p>
            </div>
        );
    }

    const data = overview.data;
    return (
        <div className="space-y-4 text-slate-800">
            <AdminPageHeader
                headingAs="h1"
                title="요금제·AI 사용량"
                description="Workspace 단위의 구독, 좌석과 AI point 사용 내역입니다."
                actions={
                    <button
                        type="button"
                        onClick={() => void Promise.all([overview.refetch(), usage.refetch()])}
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                        <RefreshCw className="h-4 w-4" /> 새로고침
                    </button>
                }
            />

            {data && (
                <>
                    <section className="grid gap-3 md:grid-cols-3">
                        <Summary label="현재 플랜" value={data.planName} />
                        <Summary
                            label="사용 가능한 AI point"
                            value={`${data.availableAiPoints.toLocaleString('ko-KR')} point`}
                            detail={
                                data.pointEnforcementEnabled
                                    ? '실제 사용량 정산 적용 중'
                                    : '현재 shadow 계측 중'
                            }
                        />
                        <Summary
                            label="멤버"
                            value={`${data.activeMembers} / ${data.includedMembers}명`}
                            detail={
                                IS_PRIVATE_BETA
                                    ? '베타 기간에는 추가 좌석을 결제하지 않습니다.'
                                    : `초과 좌석은 월 ${formatKrw(data.extraSeatMonthlyKrw)}`
                            }
                        />
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-5">
                        <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                            <Detail
                                label="월 결제"
                                value={
                                    IS_PRIVATE_BETA
                                        ? '베타 기간 결제 없음'
                                        : formatKrw(data.monthlyPriceKrw)
                                }
                            />
                            <Detail
                                label="연 결제"
                                value={
                                    IS_PRIVATE_BETA
                                        ? '베타 기간 결제 없음'
                                        : formatKrw(data.annualPriceKrw)
                                }
                            />
                            <Detail
                                label="AI 처리 경로"
                                value={`${data.aiProvider} · ${data.credentialMode}`}
                            />
                            <Detail label="처리 정책 버전" value={data.consentPolicyVersion} />
                        </div>
                        <p className="mt-4 text-xs leading-5 text-slate-500">
                            월 포함 point는 월말에 만료되고 구매 point는 이월됩니다. 시작된 작업은
                            서버 원가 상한 안에서 끝까지 처리되며 자동 충전하지 않습니다.
                        </p>
                    </section>

                    <AiPointUsageGuide compact />

                    <section className="rounded-xl border border-slate-200 bg-white p-5">
                        <div className="mb-4">
                            <h2 className="font-bold text-slate-950">플랜 비교</h2>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                {IS_PRIVATE_BETA
                                    ? '정식 출시를 준비 중인 플랜별 혜택과 AI 제공량을 비교합니다.'
                                    : '가격, 포함 Workspace·멤버와 월 AI 제공량을 비교합니다.'}
                            </p>
                        </div>
                        <PricingPlanCards currentPlanCode={data.planCode} dashboard />
                    </section>
                </>
            )}

            <WorkspaceBillingManagement
                workspaceSlug={workspaceSlug}
                currentPlanCode={data?.planCode}
                currentBillingCycle={data?.billingCycle}
            />

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="font-bold text-slate-950">최근 AI 사용</h2>
                    <p className="mt-1 text-xs text-slate-500">
                        Prompt와 결과 원문은 이 원장에 저장하지 않습니다.
                    </p>
                </div>
                {!usage.data || usage.data.items.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-slate-500">
                        기록된 AI 사용량이 없습니다.
                    </p>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {usage.data.items.map((item) => (
                            <article
                                key={item.usageId}
                                className="grid gap-2 px-5 py-4 text-sm md:grid-cols-[180px_1fr_auto] md:items-center"
                            >
                                <div>
                                    <strong className="text-slate-950">
                                        {FEATURE_LABEL[item.featureCode] ?? item.featureCode}
                                    </strong>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {new Date(item.startedAt).toLocaleString('ko-KR')}
                                    </p>
                                </div>
                                <div className="text-xs text-slate-600">
                                    <p>{item.operationCode}</p>
                                    <p className="mt-1">
                                        {item.provider ?? '처리 경로 확인 중'}
                                        {item.model ? ` · ${item.model}` : ''}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <strong className="text-slate-950">
                                        {item.committedPoints.toLocaleString('ko-KR')} point
                                    </strong>
                                    <p className="mt-1 text-xs text-slate-500">{item.status}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

function Summary({ label, value, detail }: { label: string; value: string; detail?: string }) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
            {detail && <p className="mt-2 text-xs text-slate-500">{detail}</p>}
        </section>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-1 font-semibold text-slate-900">{value}</p>
        </div>
    );
}

function formatKrw(value: number) {
    return `${value.toLocaleString('ko-KR')}원`;
}
