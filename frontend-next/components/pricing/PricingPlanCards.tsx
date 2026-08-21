import Link from 'next/link';
import { Check, ExternalLink } from 'lucide-react';
import {
    PRICING_ADDONS,
    PRICING_PLANS,
    formatPricingKrw,
    type PricingPlanCode,
} from '@/lib/pricingPlans';
import { IS_PRIVATE_BETA } from '@/lib/publicRelease';

export function PricingPlanCards({
    currentPlanCode,
    dashboard = false,
}: {
    currentPlanCode?: PricingPlanCode;
    dashboard?: boolean;
}) {
    return (
        <div className="space-y-4">
            {IS_PRIVATE_BETA && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-black text-amber-950">초대형 비공개 베타</p>
                    <p className="mt-1 text-xs leading-5 text-amber-900">
                        베타 기간에는 결제하지 않습니다. 아래 플랜은 예정 혜택을 비교하기 위한
                        안내이며, 가격과 결제 조건은 정식 출시 전에 별도로 알리고 동의를 받습니다.
                    </p>
                </div>
            )}
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <div>
                    <p className="text-xs font-black text-slate-950">소개 주체</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                        Workspace를 만들 때 개인 또는 기업·팀을 선택합니다.
                    </p>
                </div>
                <div>
                    <p className="text-xs font-black text-slate-950">사용 규모</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                        두 소개 유형 모두 Free, Pro, Business 중 필요한 규모를 선택할 수 있습니다.
                    </p>
                </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
                {PRICING_PLANS.map((plan) => {
                    const current = currentPlanCode === plan.code;
                    return (
                        <article
                            key={plan.code}
                            className={`relative flex h-full flex-col rounded-xl border bg-white p-5 ${
                                current
                                    ? 'border-slate-950 ring-1 ring-slate-950'
                                    : plan.recommended
                                      ? 'border-slate-400'
                                      : 'border-slate-200'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-lg font-black text-slate-950">
                                        {plan.name}
                                    </h3>
                                    <p className="mt-2 text-xs leading-5 text-slate-600">
                                        {plan.description}
                                    </p>
                                </div>
                                {(current ||
                                    (IS_PRIVATE_BETA && plan.code !== 'FREE') ||
                                    (!IS_PRIVATE_BETA && !currentPlanCode && plan.recommended)) && (
                                    <span className="shrink-0 rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black text-white">
                                        {current
                                            ? '현재 플랜'
                                            : IS_PRIVATE_BETA
                                              ? '출시 예정'
                                              : '추천'}
                                    </span>
                                )}
                            </div>

                            <div className="mt-5 border-y border-slate-200 py-4">
                                {IS_PRIVATE_BETA ? (
                                    <>
                                        <strong className="text-2xl font-black tracking-tight text-slate-950">
                                            {plan.code === 'FREE'
                                                ? '베타 기간 무료'
                                                : '정식 출시 예정'}
                                        </strong>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {plan.code === 'FREE'
                                                ? '초대받은 Workspace에서 이용'
                                                : '가격·결제일은 출시 전 별도 안내'}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-end gap-1.5">
                                            <strong className="text-2xl font-black tracking-tight text-slate-950">
                                                {formatPricingKrw(plan.monthlyPriceKrw)}
                                            </strong>
                                            <span className="pb-1 text-xs text-slate-500">
                                                / 월
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {plan.annualPriceKrw === null
                                                ? '연간 결제 없음'
                                                : `연 ${formatPricingKrw(plan.annualPriceKrw)} · 12개월 제공`}
                                        </p>
                                    </>
                                )}
                            </div>

                            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <dt className="text-slate-500">소유 Workspace</dt>
                                    <dd className="mt-1 font-black text-slate-900">
                                        {plan.ownedWorkspaces}개
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-slate-500">포함 멤버</dt>
                                    <dd className="mt-1 font-black text-slate-900">
                                        {plan.includedMembers}명
                                    </dd>
                                </div>
                                <div className="col-span-2">
                                    <dt className="text-slate-500">AI 제공량</dt>
                                    <dd className="mt-1 font-black text-slate-900">
                                        {plan.aiBenefit}
                                    </dd>
                                </div>
                            </dl>

                            <ul className="mt-4 flex-1 space-y-2 border-t border-slate-100 pt-4">
                                {plan.benefits.map((benefit) => (
                                    <li
                                        key={benefit}
                                        className="flex gap-2 text-xs leading-5 text-slate-600"
                                    >
                                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </article>
                    );
                })}
            </div>

            {!dashboard && (
                <div className="grid gap-3 sm:grid-cols-2">
                    {PRICING_ADDONS.map((addon) => (
                        <article
                            key={addon.name}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h3 className="font-black text-slate-950">{addon.name}</h3>
                                <strong className="text-sm text-slate-900">
                                    {IS_PRIVATE_BETA ? '정식 출시 예정' : addon.price}
                                </strong>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-slate-600">
                                {addon.description}
                            </p>
                        </article>
                    ))}
                </div>
            )}

            {dashboard && (
                <div className="flex justify-end">
                    <Link
                        href="/pricing"
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-xs font-black text-slate-700 hover:text-slate-950"
                    >
                        전체 요금제와 AI 정책 보기
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                </div>
            )}
        </div>
    );
}
