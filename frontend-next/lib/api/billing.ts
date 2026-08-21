import { request } from './client';

export type WorkspaceBillingOverview = {
    planCode: 'FREE' | 'PERSONAL_PRO' | 'BUSINESS';
    planName: string;
    monthlyPriceKrw: number;
    annualPriceKrw: number;
    includedAiPoints: number;
    availableAiPoints: number;
    includedMembers: number;
    activeMembers: number;
    extraSeatMonthlyKrw: number;
    subscriptionStatus: string;
    billingCycle: string | null;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    pointEnforcementEnabled: boolean;
    aiProvider: string;
    aiRegion: string;
    credentialMode: string;
    consentPolicyVersion: string;
};

export type WorkspaceAiUsage = {
    items: Array<{
        usageId: string;
        featureCode: string;
        operationCode: string;
        provider: string | null;
        model: string | null;
        status: string;
        chargeOutcome: string;
        estimatedPoints: number;
        committedPoints: number;
        inputTokens: number | null;
        outputTokens: number | null;
        failureCode: string | null;
        startedAt: string;
        completedAt: string | null;
    }>;
};

export type BillingCheckoutContext = {
    enabled: boolean;
    provider: 'TOSS';
    clientKey: string;
    customerKey: string;
};

export type BillingCharge = {
    id: number;
    chargeType: string;
    productCode: string;
    billingCycle: string | null;
    points: number;
    amountKrw: number;
    orderId: string;
    status: string;
};

export type WorkspaceByokStatus = {
    credentialMode: 'PLATFORM_MANAGED' | 'BYOK';
    provider: string;
    generationEnabled: boolean;
    maskedFingerprint: string | null;
    credentialStatus: string | null;
    keyVersion: string | null;
    lastValidatedAt: string | null;
    rotatedAt: string | null;
};

export const billingApi = {
    overview: (workspaceSlug: string) =>
        request<WorkspaceBillingOverview>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/billing/overview`
        ),
    aiUsage: (workspaceSlug: string, limit = 20) =>
        request<WorkspaceAiUsage>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/billing/ai-usage?limit=${limit}`
        ),
    checkoutContext: (workspaceSlug: string) =>
        request<BillingCheckoutContext>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/billing/checkout-context`
        ),
    confirmPaymentMethod: (workspaceSlug: string, authKey: string, customerKey: string) =>
        request<void>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/billing/payment-methods/confirm`,
            { method: 'POST', body: JSON.stringify({ authKey, customerKey }) }
        ),
    purchaseSubscription: (
        workspaceSlug: string,
        planCode: 'PERSONAL_PRO' | 'BUSINESS',
        billingCycle: 'MONTHLY' | 'ANNUAL',
        idempotencyKey: string
    ) =>
        request<BillingCharge>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/billing/subscriptions/purchase`,
            {
                method: 'POST',
                body: JSON.stringify({ planCode, billingCycle, idempotencyKey }),
            }
        ),
    purchasePointPack: (workspaceSlug: string, idempotencyKey: string) =>
        request<BillingCharge>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/billing/point-packs/purchase`,
            { method: 'POST', body: JSON.stringify({ idempotencyKey }) }
        ),
    purchaseSeat: (workspaceSlug: string, idempotencyKey: string) =>
        request<BillingCharge>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/billing/seats/purchase`,
            { method: 'POST', body: JSON.stringify({ idempotencyKey }) }
        ),
    cancelSubscription: (workspaceSlug: string) =>
        request<void>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/billing/subscription`, {
            method: 'DELETE',
        }),
    resumeSubscription: (workspaceSlug: string) =>
        request<void>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/billing/subscription/resume`,
            { method: 'POST' }
        ),
    byokStatus: (workspaceSlug: string) =>
        request<WorkspaceByokStatus>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/ai-provider`
        ),
    configureByok: (workspaceSlug: string, provider: string, apiKey: string) =>
        request<WorkspaceByokStatus>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/ai-provider/byok`,
            { method: 'PUT', body: JSON.stringify({ provider, apiKey }) }
        ),
    revokeByok: (workspaceSlug: string) =>
        request<WorkspaceByokStatus>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/ai-provider/byok`,
            { method: 'DELETE' }
        ),
    usePlatformAi: (workspaceSlug: string) =>
        request<WorkspaceByokStatus>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/ai-provider/platform-managed`,
            { method: 'POST' }
        ),
};
