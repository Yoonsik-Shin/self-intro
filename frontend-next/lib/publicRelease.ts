export type PublicReleaseChannel = 'PRIVATE_BETA' | 'PAID';

const configuredChannel = process.env.NEXT_PUBLIC_RELEASE_CHANNEL?.trim().toUpperCase();

// 공개 설정이 누락되거나 오타가 나면 결제를 노출하지 않는 쪽으로 닫는다.
export const PUBLIC_RELEASE_CHANNEL: PublicReleaseChannel =
    configuredChannel === 'PAID' ? 'PAID' : 'PRIVATE_BETA';

export const IS_PRIVATE_BETA = PUBLIC_RELEASE_CHANNEL === 'PRIVATE_BETA';
export const IS_PUBLIC_BILLING_AVAILABLE = PUBLIC_RELEASE_CHANNEL === 'PAID';
