export type RadialLeafInput = {
    id: string;
    categorySlug: string;
};

export type RadialCategoryInput = {
    slug: string;
};

export type RadialRelationInput = {
    source: string;
    target: string;
};

export type RadialPosition = { x: number; y: number };

export const ROOT_NODE_RADIUS = 44;
export const CATEGORY_NODE_RADIUS = 32;

const CATEGORY_RING_RADIUS = 240;
const LEAF_START_GAP = 110; // 카테고리 노드 중심에서 첫 리프 링까지 거리
const LEAF_RING_GAP = 130; // 리프 링 사이 간격
const LEAVES_PER_RING = 4;
const SLICE_FILL_RATIO = 0.8; // 인접 카테고리 쐐기와 겹치지 않도록 슬라이스 폭에 여유를 둔다
// 활성 카테고리가 1~2개뿐이면 비례 배분상 거의 360도를 다 차지하게 되는데, 그러면
// 자식들이 부채꼴로 모이지 않고 원 전체에 흩뿌려진 것처럼 보인다. 카테고리 몇 개가
// 켜져 있든 자식 부채꼴 폭 자체는 이 값 이상으로 넓어지지 않게 캡을 둔다.
const MAX_LEAF_SLICE_WIDTH = Math.PI * 0.42; // 약 75.6도

export type RadialLayoutResult = {
    rootPosition: RadialPosition;
    categoryPositions: Record<string, RadialPosition>;
    leafPositions: Record<string, RadialPosition>;
};

/**
 * relation으로 이어진 노드끼리 링/각도상 서로 옆자리에 오도록, 같은 카테고리 안에서만
 * 연결 성분(connected component) 단위로 묶어 순서를 다시 짠다. idx 순서가 곧 부채꼴
 * 안에서의 위치(링, 각도)를 결정하므로, 연결된 노드들을 인접한 idx로 모으면 화면에서도
 * 서로 가까워진다. 카테고리를 넘나드는 relation은(그룹핑을 깨야 해서) 대상에서 뺀다.
 */
function groupConnectedLeaves(
    members: RadialLeafInput[],
    adjacency: Map<string, Set<string>>
): RadialLeafInput[] {
    const memberIds = new Set(members.map((m) => m.id));
    const byId = new Map(members.map((m) => [m.id, m]));
    const visited = new Set<string>();
    const ordered: RadialLeafInput[] = [];

    members.forEach((start) => {
        if (visited.has(start.id)) return;
        const stack = [start.id];
        visited.add(start.id);
        while (stack.length > 0) {
            const currentId = stack.pop()!;
            ordered.push(byId.get(currentId)!);
            const neighbors = adjacency.get(currentId);
            if (!neighbors) continue;
            neighbors.forEach((neighborId) => {
                if (memberIds.has(neighborId) && !visited.has(neighborId)) {
                    visited.add(neighborId);
                    stack.push(neighborId);
                }
            });
        }
    });

    return ordered;
}

/**
 * 중심에 루트(예: "온라인 강의") 하나, 그 둘레에 카테고리가 시계 방향으로 배치되고,
 * 각 카테고리의 강의들은 그 카테고리 쐐기(slice) 각도 안에서 바깥쪽 동심 링으로
 * 부채꼴처럼 퍼지는 방사형(radial) 트리 레이아웃. 물리 시뮬레이션 없이 한 번에 계산된다.
 *
 * 모든 카테고리에 똑같은 각도 폭을 주면 강의 1개짜리와 8개짜리가 같은 폭을 나눠 써서
 * 강의가 많은 쪽은 라벨이 다닥다닥 겹치고 적은 쪽은 휑해 보인다. 그래서 소속 강의 수의
 * 제곱근에 비례해 각도 폭을 배분한다(제곱근을 쓰는 이유: 8개짜리가 1개짜리보다 8배가
 * 아니라 약 2.8배 넓게만 차지하게 해서 한두 카테고리가 원 전체를 독식하지 않게 함).
 */
export function layoutRadialTree(
    leaves: RadialLeafInput[],
    categoryOrder: RadialCategoryInput[],
    relations: RadialRelationInput[] = []
): RadialLayoutResult {
    const grouped = new Map<string, RadialLeafInput[]>();
    leaves.forEach((leaf) => {
        const bucket = grouped.get(leaf.categorySlug) ?? [];
        bucket.push(leaf);
        grouped.set(leaf.categorySlug, bucket);
    });

    const adjacency = new Map<string, Set<string>>();
    relations.forEach(({ source, target }) => {
        if (!adjacency.has(source)) adjacency.set(source, new Set());
        if (!adjacency.has(target)) adjacency.set(target, new Set());
        adjacency.get(source)!.add(target);
        adjacency.get(target)!.add(source);
    });
    grouped.forEach((members, slug) => {
        grouped.set(slug, groupConnectedLeaves(members, adjacency));
    });

    const activeCategories = categoryOrder.filter((c) => (grouped.get(c.slug)?.length ?? 0) > 0);

    const weights = activeCategories.map((c) => Math.sqrt(grouped.get(c.slug)?.length ?? 1));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;

    const categoryPositions: Record<string, RadialPosition> = {};
    const leafPositions: Record<string, RadialPosition> = {};

    let cursorAngle = -Math.PI / 2; // 12시 방향에서 시작해 시계 방향으로

    activeCategories.forEach((category, i) => {
        const allocatedWidth = (2 * Math.PI * weights[i]) / totalWeight;
        const midAngle = cursorAngle + allocatedWidth / 2;

        categoryPositions[category.slug] = {
            x: CATEGORY_RING_RADIUS * Math.cos(midAngle),
            y: CATEGORY_RING_RADIUS * Math.sin(midAngle),
        };

        const sliceWidth = Math.min(allocatedWidth * SLICE_FILL_RATIO, MAX_LEAF_SLICE_WIDTH);
        const members = grouped.get(category.slug) ?? [];
        members.forEach((leaf, idx) => {
            const ring = Math.floor(idx / LEAVES_PER_RING);
            const posInRing = idx % LEAVES_PER_RING;
            const countInThisRing = Math.min(
                LEAVES_PER_RING,
                members.length - ring * LEAVES_PER_RING
            );
            const ringRadius = CATEGORY_RING_RADIUS + LEAF_START_GAP + ring * LEAF_RING_GAP;

            const leafAngle =
                countInThisRing === 1
                    ? midAngle
                    : midAngle - sliceWidth / 2 + (sliceWidth * posInRing) / (countInThisRing - 1);

            leafPositions[leaf.id] = {
                x: ringRadius * Math.cos(leafAngle),
                y: ringRadius * Math.sin(leafAngle),
            };
        });

        cursorAngle += allocatedWidth;
    });

    return { rootPosition: { x: 0, y: 0 }, categoryPositions, leafPositions };
}
