export type PricingPlanCode = 'FREE' | 'PERSONAL_PRO' | 'BUSINESS';

export type PricingPlan = {
    code: PricingPlanCode;
    name: string;
    description: string;
    monthlyPriceKrw: number;
    annualPriceKrw: number | null;
    ownedWorkspaces: number;
    includedMembers: number;
    aiBenefit: string;
    benefits: string[];
    recommended?: boolean;
};

export const PRICING_PLANS: PricingPlan[] = [
    {
        code: 'FREE',
        name: 'Free',
        description: '개인 또는 조직의 Workspace를 혼자 가볍게 시작하는 플랜',
        monthlyPriceKrw: 0,
        annualPriceKrw: null,
        ownedWorkspaces: 1,
        includedMembers: 1,
        aiBenefit: '대상 AI 기능별 월 1회',
        benefits: [
            '경력·학습·역량·포트폴리오 원본 관리',
            '무료 AI 세션별 보정 3회 · 생성 후 7일',
            'BYOK 지원 · AI 없는 PDF 출력은 제한 없음',
        ],
    },
    {
        code: 'PERSONAL_PRO',
        name: 'Pro',
        description: '더 많은 Workspace와 AI 사용량이 필요한 개인·소규모 팀 플랜',
        monthlyPriceKrw: 9_900,
        annualPriceKrw: 99_000,
        ownedWorkspaces: 5,
        includedMembers: 5,
        aiBenefit: '매월 5,000 AI point',
        benefits: [
            'point 잔액 안에서 AI 보정 횟수 제한 없음',
            '월 포함 point 우선 사용 · 월말 만료',
            '구매 point 무기한 이월 · BYOK 지원',
        ],
        recommended: true,
    },
    {
        code: 'BUSINESS',
        name: 'Business',
        description: '여러 멤버가 역할을 나눠 콘텐츠와 공개 결과물을 운영하는 플랜',
        monthlyPriceKrw: 39_000,
        annualPriceKrw: 390_000,
        ownedWorkspaces: 10,
        includedMembers: 10,
        aiBenefit: '매월 25,000 AI point',
        benefits: [
            'Workspace 멤버·역할 기반 공동 관리',
            'point 잔액 안에서 AI 보정 횟수 제한 없음',
            '구매 point 무기한 이월 · BYOK 지원',
        ],
    },
];

export const PRICING_ADDONS = [
    {
        name: 'AI point pack',
        price: '10,000 point · 9,900원',
        description: '사용자가 승인할 때만 결제되는 일회성 상품이며 자동충전하지 않습니다.',
    },
    {
        name: '추가 좌석',
        price: '월 3,000원 · 연 30,000원',
        description: 'Pro와 Business에서 제공하며 다음 갱신일까지 남은 기간은 일할 계산합니다.',
    },
] as const;

export function formatPricingKrw(value: number) {
    return `${value.toLocaleString('ko-KR')}원`;
}
