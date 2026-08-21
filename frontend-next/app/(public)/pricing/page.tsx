import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { PricingPlanCards } from '@/components/pricing/PricingPlanCards';
import { AiPointUsageGuide } from '@/components/pricing/AiPointUsageGuide';
import { IS_PRIVATE_BETA } from '@/lib/publicRelease';

export const metadata: Metadata = {
    title: '요금제 | Self-Intro',
    description: IS_PRIVATE_BETA
        ? '비공개 베타에서 제공되는 Free, Pro, Business 예정 혜택과 AI point 정책을 확인합니다.'
        : '개인과 기업·팀 Workspace에서 선택할 수 있는 Free, Pro, Business 요금제와 AI point 정책을 확인합니다.',
};

export default function PricingPage() {
    return (
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            <header className="max-w-3xl">
                <p className="text-sm font-black text-slate-500">Workspace pricing</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                    기록 규모와 AI 사용량에 맞는 플랜
                </h1>
                <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">
                    {IS_PRIVATE_BETA
                        ? '현재 초대형 비공개 베타로 운영하며 카드 등록, 구독 결제와 AI point 구매를 받지 않습니다. Free·Pro·Business는 예정 혜택 비교용이며, 정식 출시 전에 가격·결제일·환불 조건을 별도로 알리고 동의를 받습니다.'
                        : '개인 또는 기업·팀은 Workspace의 소개 주체이고, Free·Pro·Business는 사용 규모에 따른 요금제입니다. 구독과 AI point는 사용자 개인이 아니라 Workspace에 귀속됩니다. 표시 금액은 부가세가 포함된 최종 결제금액이며 무료 체험 후 자동 유료전환과 AI 자동충전은 제공하지 않습니다.'}
                </p>
            </header>

            <div className="mt-10">
                <AiPointUsageGuide />
            </div>

            <section className="mt-10" aria-label="요금제 비교">
                <PricingPlanCards />
            </section>

            <section className="mt-8 rounded-xl border border-slate-300 bg-slate-950 p-6 text-white sm:p-8">
                <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-black text-slate-300">
                            <ShieldCheck className="h-4 w-4" /> 결제·AI 사용 원칙
                        </div>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                            월 포함 point를 먼저 사용하고 구매 point는 만료 없이 이월합니다. 이미
                            시작된 작업은 서버 원가 상한 안에서 마무리하며, 실패한 작업의 예약
                            point는 반환합니다. 내 AI API 키 연결은 모든 플랜에서 사용할 수
                            있습니다.
                        </p>
                    </div>
                    <Link
                        href="/architecture/demo"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-black text-slate-950 hover:bg-slate-200"
                    >
                        Workspace 체험 <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
