'use client';

export type AuthSessionEventType = 'AUTHENTICATED' | 'UNAUTHENTICATED';

type AuthSessionEvent = {
    eventId: string;
    sourceId: string;
    type: AuthSessionEventType;
    emittedAt: number;
};

const CHANNEL_NAME = 'self-intro-auth-session';
const STORAGE_KEY = 'self-intro-auth-session-event';
const sourceId = typeof crypto === 'undefined' ? 'server' : crypto.randomUUID();

function isAuthSessionEvent(value: unknown): value is AuthSessionEvent {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<AuthSessionEvent>;
    return (
        typeof candidate.eventId === 'string' &&
        typeof candidate.sourceId === 'string' &&
        typeof candidate.emittedAt === 'number' &&
        (candidate.type === 'AUTHENTICATED' || candidate.type === 'UNAUTHENTICATED')
    );
}

export function publishAuthSessionEvent(type: AuthSessionEventType) {
    if (typeof window === 'undefined') return;
    const event: AuthSessionEvent = {
        eventId: crypto.randomUUID(),
        sourceId,
        type,
        emittedAt: Date.now(),
    };

    if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage(event);
        channel.close();
    }

    try {
        // BroadcastChannel을 제한한 브라우저를 위한 fallback이다. 이벤트에는 사용자
        // 식별 정보나 인증 토큰을 저장하지 않는다.
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
    } catch {
        // 저장소 접근을 차단해도 현재 탭의 인증 흐름은 계속 진행한다.
    }
}

export function subscribeAuthSessionEvents(listener: (event: AuthSessionEvent) => void) {
    if (typeof window === 'undefined') return () => {};
    const handledEventIds = new Set<string>();

    const dispatch = (value: unknown) => {
        if (!isAuthSessionEvent(value) || value.sourceId === sourceId) return;
        if (handledEventIds.has(value.eventId)) return;
        handledEventIds.add(value.eventId);
        if (handledEventIds.size > 100) handledEventIds.clear();
        listener(value);
    };

    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;
    const onMessage = (event: MessageEvent<unknown>) => dispatch(event.data);
    const onStorage = (event: StorageEvent) => {
        if (event.key !== STORAGE_KEY || !event.newValue) return;
        try {
            dispatch(JSON.parse(event.newValue));
        } catch {
            // 손상된 외부 저장소 값은 무시하고 서버 세션을 신뢰한다.
        }
    };

    channel?.addEventListener('message', onMessage);
    window.addEventListener('storage', onStorage);
    return () => {
        channel?.removeEventListener('message', onMessage);
        channel?.close();
        window.removeEventListener('storage', onStorage);
    };
}
