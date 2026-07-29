import * as dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 76;

export function layoutWithDagre<NodeData extends Record<string, unknown>>(
    nodes: Node<NodeData>[],
    edges: Edge[],
    direction: 'TB' | 'LR' = 'TB'
): Node<NodeData>[] {
    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: direction, nodesep: 48, ranksep: 96 });

    nodes.forEach((node) => {
        graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });
    edges.forEach((edge) => {
        graph.setEdge(edge.source, edge.target);
    });

    dagre.layout(graph);

    return nodes.map((node) => {
        const { x, y } = graph.node(node.id);
        return {
            ...node,
            position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
        };
    });
}

export const DAGRE_NODE_WIDTH = NODE_WIDTH;
export const DAGRE_NODE_HEIGHT = NODE_HEIGHT;
