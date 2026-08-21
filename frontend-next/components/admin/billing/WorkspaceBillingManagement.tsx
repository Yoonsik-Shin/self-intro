'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { billingApi, type BillingCharge } from '@/lib/api';
import { useRecentReauthentication } from '@/hooks/useRecentReauthentication';
import { useAuthStore } from '@/store/useAuthStore';
import { loadTossPayments } from '@/lib/tossPayments';
import { isPlatformOwnerPreview } from '@/lib/privateBetaPreview';
import { IS_PUBLIC_BILLING_AVAILABLE } from '@/lib/publicRelease';

type PurchaseConfirmation = {
    pendingName: string;
    title: string;
    amountLabel: string;
    description: string;
    isRecurring?: boolean;
    action: () => Promise<BillingCharge>;
};

type CompletedPurchase = {
    title: string;
    charge: BillingCharge;
};

export function WorkspaceBillingManagement({
    workspaceSlug,
    currentPlanCode,
    currentBillingCycle,
}: {
    workspaceSlug: string;
    currentPlanCode?: 'FREE' | 'PERSONAL_PRO' | 'BUSINESS';
    currentBillingCycle?: string | null;
}) {
    const queryClient = useQueryClient();
    const me = useAuthStore((state) => state.me);
    const { isReauthenticated } = useRecentReauthentication();
    const workspace = me?.workspaces.find((candidate) => candidate.slug === workspaceSlug);
    const isOwner = workspace?.role === 'OWNER';
    const billingAvailable =
        IS_PUBLIC_BILLING_AVAILABLE || isPlatformOwnerPreview(me, workspaceSlug);
    const byok = useQuery({
        queryKey: ['workspace', workspaceSlug, 'byok'],
        queryFn: () => billingApi.byokStatus(workspaceSlug),
        enabled: Boolean(workspace) && billingAvailable,
    });
    const [provider, setProvider] = useState('OPENAI');
    const [apiKey, setApiKey] = useState('');
    const [pending, setPending] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [purchaseConfirmation, setPurchaseConfirmation] = useState<PurchaseConfirmation | null>(
        null
    );
    const [purchaseAccepted, setPurchaseAccepted] = useState(false);
    const [completedPurchase, setCompletedPurchase] = useState<CompletedPurchase | null>(null);

    if (!isOwner) return null;

    const run = async (name: string, action: () => Promise<unknown>, success: string) => {
        setPending(name);
        setMessage(null);
        try {
            await action();
            setMessage(success);
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ['workspace', workspaceSlug, 'billing-overview'],
                }),
                queryClient.invalidateQueries({ queryKey: ['workspace', workspaceSlug, 'byok'] }),
            ]);
        } catch (caught) {
            setMessage(caught instanceof Error ? caught.message : '요청을 완료하지 못했습니다.');
        } finally {
            setPending(null);
        }
    };

    const registerCard = async () => {
        setPending('card');
        setMessage(null);
        try {
            const context = await billingApi.checkoutContext(workspaceSlug);
            if (!context.enabled || !context.clientKey) {
                throw new Error('PG sandbox와 운영 출시 게이트가 아직 활성화되지 않았습니다.');
            }
            await loadTossPayments();
            const tossPayments = window.TossPayments?.(context.clientKey);
            if (!tossPayments) throw new Error('결제창을 초기화하지 못했습니다.');
            const callback = new URL('/billing/toss/callback', window.location.origin);
            callback.searchParams.set('workspaceSlug', workspaceSlug);
            const fail = new URL('/billing/toss/fail', window.location.origin);
            fail.searchParams.set('workspaceSlug', workspaceSlug);
            await tossPayments.payment({ customerKey: context.customerKey }).requestBillingAuth({
                method: 'CARD',
                successUrl: callback.toString(),
                failUrl: fail.toString(),
            });
        } catch (caught) {
            setMessage(
                caught instanceof Error ? caught.message : '카드 등록을 시작하지 못했습니다.'
            );
            setPending(null);
        }
    };

    const idempotencyKey = () => crypto.randomUUID().replaceAll('-', '_');
    const disabled = !isReauthenticated || pending !== null || !me?.mfaEnabled;
    const hasPaidSubscription = Boolean(currentPlanCode && currentPlanCode !== 'FREE');
    const subscriptionPurchaseDisabled = disabled || hasPaidSubscription;
    const requestPurchase = (confirmation: PurchaseConfirmation) => {
        setPurchaseAccepted(false);
        setPurchaseConfirmation(confirmation);
        setMessage(null);
    };
    const confirmPurchase = async () => {
        if (!purchaseConfirmation || !purchaseAccepted) return;
        const confirmation = purchaseConfirmation;
        setPurchaseConfirmation(null);
        setPending(confirmation.pendingName);
        setMessage(null);
        try {
            const charge = await confirmation.action();
            setCompletedPurchase({ title: confirmation.title, charge });
            await queryClient.invalidateQueries({
                queryKey: ['workspace', workspaceSlug, 'billing-overview'],
            });
        } catch (caught) {
            setMessage(caught instanceof Error ? caught.message : '결제를 완료하지 못했습니다.');
        } finally {
            setPending(null);
        }
    };

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="font-bold text-slate-950">구독·결제 관리</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                    {billingAvailable
                        ? 'OWNER의 MFA와 최근 비밀번호 확인이 필요합니다. 무료 체험 자동전환과 AI 자동충전은 없습니다. 표시 금액은 모두 부가세가 포함된 최종 결제금액입니다.'
                        : '비공개 베타에서는 카드 등록, 구독, AI point와 추가 좌석 결제를 받지 않습니다. 정식 출시 전에 가격과 결제 조건을 별도로 안내합니다.'}
                </p>
                {billingAvailable ? (
                    <>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <Action
                                label="카드 등록·교체"
                                disabled={disabled}
                                onClick={registerCard}
                            />
                            <Action
                                label={
                                    currentPlanCode === 'PERSONAL_PRO' &&
                                    currentBillingCycle === 'MONTHLY'
                                        ? 'Pro 월간 · 현재 플랜'
                                        : 'Pro 월간 9,900원'
                                }
                                disabled={subscriptionPurchaseDisabled}
                                onClick={() =>
                                    requestPurchase({
                                        pendingName: 'pro-monthly',
                                        title: 'Pro 월간 구독',
                                        amountLabel: '9,900원',
                                        description:
                                            '등록한 카드로 즉시 승인하며, 승인 성공 후 Pro 월간 혜택이 적용됩니다.',
                                        action: () =>
                                            billingApi.purchaseSubscription(
                                                workspaceSlug,
                                                'PERSONAL_PRO',
                                                'MONTHLY',
                                                idempotencyKey()
                                            ),
                                    })
                                }
                            />
                            <Action
                                label={
                                    currentPlanCode === 'PERSONAL_PRO' &&
                                    currentBillingCycle === 'ANNUAL'
                                        ? 'Pro 연간 · 현재 플랜'
                                        : 'Pro 연간 99,000원'
                                }
                                disabled={subscriptionPurchaseDisabled}
                                onClick={() =>
                                    requestPurchase({
                                        pendingName: 'pro-annual',
                                        title: 'Pro 연간 구독',
                                        amountLabel: '99,000원',
                                        description:
                                            '등록한 카드로 즉시 승인하며, 승인 성공 후 Pro 연간 혜택이 적용됩니다.',
                                        action: () =>
                                            billingApi.purchaseSubscription(
                                                workspaceSlug,
                                                'PERSONAL_PRO',
                                                'ANNUAL',
                                                idempotencyKey()
                                            ),
                                    })
                                }
                            />
                            <Action
                                label={
                                    currentPlanCode === 'BUSINESS' &&
                                    currentBillingCycle === 'MONTHLY'
                                        ? 'Business 월간 · 현재 플랜'
                                        : 'Business 월간 39,000원'
                                }
                                disabled={subscriptionPurchaseDisabled}
                                onClick={() =>
                                    requestPurchase({
                                        pendingName: 'business-monthly',
                                        title: 'Business 월간 구독',
                                        amountLabel: '39,000원',
                                        description:
                                            '등록한 카드로 즉시 승인하며, 승인 성공 후 Business 월간 혜택이 적용됩니다.',
                                        action: () =>
                                            billingApi.purchaseSubscription(
                                                workspaceSlug,
                                                'BUSINESS',
                                                'MONTHLY',
                                                idempotencyKey()
                                            ),
                                    })
                                }
                            />
                            <Action
                                label={
                                    currentPlanCode === 'BUSINESS' &&
                                    currentBillingCycle === 'ANNUAL'
                                        ? 'Business 연간 · 현재 플랜'
                                        : 'Business 연간 390,000원'
                                }
                                disabled={subscriptionPurchaseDisabled}
                                onClick={() =>
                                    requestPurchase({
                                        pendingName: 'business-annual',
                                        title: 'Business 연간 구독',
                                        amountLabel: '390,000원',
                                        description:
                                            '등록한 카드로 즉시 승인하며, 승인 성공 후 Business 연간 혜택이 적용됩니다.',
                                        action: () =>
                                            billingApi.purchaseSubscription(
                                                workspaceSlug,
                                                'BUSINESS',
                                                'ANNUAL',
                                                idempotencyKey()
                                            ),
                                    })
                                }
                            />
                            <Action
                                label="AI point 10,000 · 9,900원"
                                disabled={disabled}
                                onClick={() =>
                                    requestPurchase({
                                        pendingName: 'points',
                                        title: 'AI point 10,000 구매',
                                        amountLabel: '9,900원',
                                        description:
                                            '등록한 카드로 즉시 승인하며, 구매 point는 만료 없이 이월됩니다.',
                                        isRecurring: false,
                                        action: () =>
                                            billingApi.purchasePointPack(
                                                workspaceSlug,
                                                idempotencyKey()
                                            ),
                                    })
                                }
                            />
                            <Action
                                label="좌석 1개 추가"
                                disabled={disabled}
                                onClick={() =>
                                    requestPurchase({
                                        pendingName: 'seat',
                                        title: '좌석 1개 추가',
                                        amountLabel: '최대 3,000원',
                                        description:
                                            '월 3,000원을 기준으로 다음 갱신일까지 일할 계산한 금액을 즉시 승인합니다.',
                                        action: () =>
                                            billingApi.purchaseSeat(
                                                workspaceSlug,
                                                idempotencyKey()
                                            ),
                                    })
                                }
                            />
                            <Action
                                label="기간 종료일에 해지"
                                disabled={disabled}
                                onClick={() =>
                                    void run(
                                        'cancel-subscription',
                                        () => billingApi.cancelSubscription(workspaceSlug),
                                        '현재 기간 종료일에 해지하도록 예약했습니다.'
                                    )
                                }
                            />
                            <Action
                                label="해지 예약 취소"
                                disabled={disabled}
                                onClick={() =>
                                    void run(
                                        'resume-subscription',
                                        () => billingApi.resumeSubscription(workspaceSlug),
                                        '구독 자동 갱신을 다시 활성화했습니다.'
                                    )
                                }
                            />
                        </div>

                        {hasPaidSubscription && (
                            <p className="mt-3 text-xs leading-5 text-slate-500">
                                활성 구독이 있어 신규 구독의 중복 결제를 차단했습니다. 플랜·결제
                                주기 변경은 별도의 변경 정산 기능이 준비된 뒤 제공합니다.
                            </p>
                        )}
                    </>
                ) : (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                        베타 기간 무료 · 결제 기능은 정식 출시 준비가 끝난 뒤 별도 동의를 받아
                        활성화합니다.
                    </div>
                )}

                {message && (
                    <p
                        role="alert"
                        className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900"
                    >
                        {message}
                    </p>
                )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="font-bold text-slate-950">내 AI API 키 연결</h2>
                {billingAvailable ? (
                    <>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            키 원문은 Secret Manager에만 저장합니다. 실패 시 플랫폼 키로 자동
                            전환하지 않습니다.
                        </p>
                        <div className="mt-3 text-sm text-slate-700">
                            현재 사용 방식:{' '}
                            <strong>
                                {byok.data?.credentialMode === 'BYOK'
                                    ? '내 AI 키'
                                    : byok.data?.credentialMode === 'PLATFORM_MANAGED'
                                      ? '플랫폼 제공 AI'
                                      : '확인 중'}
                            </strong>
                            {byok.data?.maskedFingerprint && ` · ${byok.data.maskedFingerprint}`}
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-[140px_1fr]">
                            <select
                                value={provider}
                                onChange={(event) => setProvider(event.target.value)}
                                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                            >
                                <option value="OPENAI">OpenAI</option>
                                <option value="ANTHROPIC">Anthropic</option>
                                <option value="GEMINI">Gemini</option>
                            </select>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(event) => setApiKey(event.target.value)}
                                placeholder="AI 제공업체 API 키"
                                autoComplete="off"
                                className="min-h-11 rounded-lg border border-slate-300 px-3 text-base sm:text-sm"
                            />
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                            <Action
                                label="내 AI 키 저장·교체"
                                disabled={disabled || !apiKey}
                                onClick={() =>
                                    void run(
                                        'byok',
                                        () =>
                                            billingApi.configureByok(
                                                workspaceSlug,
                                                provider,
                                                apiKey
                                            ),
                                        '내 AI API 키를 안전하게 저장했습니다.'
                                    ).then(() => setApiKey(''))
                                }
                            />
                            <Action
                                label="내 AI 키 연결 해제"
                                disabled={disabled || byok.data?.credentialMode !== 'BYOK'}
                                onClick={() =>
                                    void run(
                                        'revoke-byok',
                                        () => billingApi.revokeByok(workspaceSlug),
                                        '내 AI 키 연결을 해제하고 AI 실행을 중지했습니다.'
                                    )
                                }
                            />
                            <Action
                                label="플랫폼 경로 선택"
                                disabled={disabled}
                                onClick={() =>
                                    void run(
                                        'platform-ai',
                                        () => billingApi.usePlatformAi(workspaceSlug),
                                        '플랫폼 관리 AI 경로를 선택했습니다.'
                                    )
                                }
                            />
                        </div>
                    </>
                ) : (
                    <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                        비공개 베타에서는 외부 AI 키를 입력받지 않습니다. OCI Vault 저장·폐기 검증을
                        마친 뒤, 키 원문을 애플리케이션 DB에 남기지 않는 방식으로 제공합니다.
                    </p>
                )}
            </section>

            {(!me?.mfaEnabled || !isReauthenticated) && (
                <p
                    role="status"
                    className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 lg:col-span-2"
                >
                    {!me?.mfaEnabled
                        ? '먼저 계정 보안에서 MFA를 등록해 주세요.'
                        : '상단의 중요 작업 인증에서 현재 비밀번호를 확인해 주세요.'}
                </p>
            )}

            {purchaseConfirmation && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="purchase-confirmation-title"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
                >
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <h2
                            id="purchase-confirmation-title"
                            className="text-lg font-black text-slate-950"
                        >
                            결제 내용을 확인해 주세요
                        </h2>
                        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                            <dt className="text-slate-500">상품</dt>
                            <dd className="text-right font-bold text-slate-950">
                                {purchaseConfirmation.title}
                            </dd>
                            <dt className="text-slate-500">결제금액</dt>
                            <dd className="text-right font-bold text-slate-950">
                                {purchaseConfirmation.amountLabel} · 부가세 포함
                            </dd>
                        </dl>
                        <p className="mt-4 text-sm leading-6 text-slate-600">
                            {purchaseConfirmation.description}
                        </p>
                        <label className="mt-4 flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={purchaseAccepted}
                                onChange={(event) => setPurchaseAccepted(event.target.checked)}
                                className="mt-1 h-4 w-4"
                            />
                            <span>
                                {purchaseConfirmation.isRecurring === false
                                    ? '결제금액, 1회 결제 조건과 포인트 환불 정책을 확인했습니다. 이 결제로 자동충전되지 않습니다.'
                                    : '결제금액, 정기결제 조건과 이용약관의 해지·환불 정책을 확인했습니다.'}
                            </span>
                        </label>
                        <div className="mt-5 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setPurchaseConfirmation(null)}
                                className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                disabled={!purchaseAccepted}
                                onClick={() => void confirmPurchase()}
                                className="min-h-11 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                            >
                                결제 승인하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {completedPurchase && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="purchase-complete-title"
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4"
                    onMouseDown={(event) => {
                        if (event.currentTarget === event.target) setCompletedPurchase(null);
                    }}
                >
                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <button
                            type="button"
                            onClick={() => setCompletedPurchase(null)}
                            aria-label="결제 완료 창 닫기"
                            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="h-7 w-7" />
                        </div>
                        <h2
                            id="purchase-complete-title"
                            className="mt-5 text-xl font-black text-slate-950"
                        >
                            결제가 완료됐습니다
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                            {completedPurchase.title} 결제가 정상적으로 승인되었습니다.
                        </p>
                        <dl className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4 text-sm">
                            <div className="flex items-center justify-between gap-4 py-3">
                                <dt className="text-slate-500">결제금액</dt>
                                <dd className="font-black text-slate-950">
                                    {completedPurchase.charge.amountKrw.toLocaleString('ko-KR')}원
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-4 py-3">
                                <dt className="text-slate-500">결제상태</dt>
                                <dd className="font-black text-emerald-700">
                                    {completedPurchase.charge.status === 'APPROVED'
                                        ? '승인 완료'
                                        : completedPurchase.charge.status}
                                </dd>
                            </div>
                            <div className="py-3">
                                <dt className="text-slate-500">주문번호</dt>
                                <dd className="mt-1 break-all text-xs font-semibold text-slate-800">
                                    {completedPurchase.charge.orderId}
                                </dd>
                            </div>
                        </dl>
                        <button
                            type="button"
                            autoFocus
                            onClick={() => setCompletedPurchase(null)}
                            className="mt-5 min-h-11 w-full rounded-lg bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800"
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Action({
    label,
    disabled,
    onClick,
}: {
    label: string;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
            {label}
        </button>
    );
}
