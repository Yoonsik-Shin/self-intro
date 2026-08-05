import type { TaxonomyNode } from './api/types';

/** node.id → node 맵. breadcrumb 경로를 구하려면 attach된 노드뿐 아니라 조상 노드 데이터도 필요해서
 * (study/learning-resource 응답엔 직접 attach된 노드만 들어있음) 전체 taxonomy 목록으로 맵을 만든다. */
export function toTaxonomyNodeMap(nodes: TaxonomyNode[]): Map<number, TaxonomyNode> {
    return new Map(nodes.map((node) => [node.id, node]));
}

/** node부터 최상위 조상까지의 이름을 ["백엔드", "데이터베이스"]처럼 루트→leaf 순으로 반환한다. */
export function taxonomyBreadcrumbNames(
    node: Pick<TaxonomyNode, 'id' | 'name' | 'parentId'>,
    nodesById: Map<number, TaxonomyNode>
): string[] {
    const names: string[] = [node.name];
    let current: TaxonomyNode | undefined =
        node.parentId !== null ? nodesById.get(node.parentId) : undefined;
    let guard = 0;
    while (current && guard++ < 20) {
        names.unshift(current.name);
        current = current.parentId !== null ? nodesById.get(current.parentId) : undefined;
    }
    return names;
}

export function taxonomyBreadcrumbLabel(
    node: Pick<TaxonomyNode, 'id' | 'name' | 'parentId'>,
    nodesById: Map<number, TaxonomyNode>
): string {
    return taxonomyBreadcrumbNames(node, nodesById).join(' › ');
}
