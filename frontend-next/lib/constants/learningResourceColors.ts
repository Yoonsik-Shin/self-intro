// 카테고리 slug를 해시해 고정 팔레트에서 색상을 뽑는다.
// 카테고리 목록이 아직 확정/시딩되지 않았으므로 특정 slug를 하드코딩하지 않고,
// 어떤 카테고리가 들어와도 항상 같은 색이 나오도록 해시 기반으로 매핑한다.
const PALETTE = [
    '#0EA5E9', // sky
    '#8B5CF6', // violet
    '#F97316', // orange
    '#10B981', // emerald
    '#EC4899', // pink
    '#F59E0B', // amber
    '#6366F1', // indigo
    '#14B8A6', // teal
    '#EF4444', // red
    '#84CC16', // lime
    '#A855F7', // purple
    '#0891B2', // cyan
];

export function colorForCategory(slug: string): string {
    let hash = 0;
    for (let i = 0; i < slug.length; i += 1) {
        hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
    }
    return PALETTE[hash % PALETTE.length];
}

const PRIORITY_COLOR: Record<string, string> = {
    P0: '#EF4444', // red-500
    P1: '#FB923C', // orange-400
    P2: '#FDE047', // yellow-300
    P3: '#CBD5E1', // slate-300
};
const PRIORITY_UNSET_COLOR = '#94A3B8'; // slate-400 (우선순위 미지정)

export function colorForPriority(tier?: string | null): string {
    if (!tier) return PRIORITY_UNSET_COLOR;
    return PRIORITY_COLOR[tier] ?? PRIORITY_UNSET_COLOR;
}
