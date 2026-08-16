// crypto.randomUUID()는 secure context(HTTPS 또는 localhost)에서만 존재한다.
// LAN IP로 http 접속(예: 태블릿 실기기 테스트) 시 이 메서드 자체가 없어 TypeError로
// 죽는다. crypto.getRandomValues는 secure context 여부와 무관하게 항상 쓸 수 있어
// 이걸로 UUID v4를 직접 조립하는 fallback을 둔다.
export function randomId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}
