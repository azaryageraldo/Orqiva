import type { Edge } from "@xyflow/react";

type Position = { x: number; y: number };

type LayoutNode = {
  id: string;
  position: Position;
};

/**
 * Node cards are 224px wide and roughly 64px tall. The pitches below are
 * multiples of the editor snap grid so a tidy layout stays on the grid.
 */
const NODE_WIDTH = 224;
const NODE_HEIGHT = 64;
const COLUMN_GAP = 96;
const ROW_GAP = 112;
const COLUMN_PITCH = NODE_WIDTH + COLUMN_GAP;
const ROW_PITCH = NODE_HEIGHT + ROW_GAP;
const GRID_SIZE = 16;
const ORIGIN_X = 64;
const ORIGIN_Y = 48;

export type TidyLayoutResult<N extends LayoutNode> = {
  nodes: N[];
  edges: Edge[];
  removedEdges: number;
};

type ConnectionLike = {
  source: string;
  sourceHandle?: string | null;
  target: string;
};

export function edgeConnectionKey(edge: ConnectionLike): string {
  return `${edge.source}::${edge.sourceHandle ?? "default"}::${edge.target}`;
}

/**
 * Removes redundant edges and re-positions nodes in a top-down layered layout.
 *
 * Rules that keep the graph readable:
 * - Bottom / default handles continue straight down (same column).
 * - A Condition's `true` handle branches one column to the right.
 * - Nodes sharing a rank are pushed apart so they never overlap.
 * - Back edges (cycles) are ignored while ranking so the layout terminates.
 */
export function tidyLayout<N extends LayoutNode>(
  nodes: N[],
  edges: Edge[],
): TidyLayoutResult<N> {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const seenConnections = new Set<string>();
  const cleanedEdges: Edge[] = [];
  let removedEdges = 0;

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      removedEdges += 1;
      continue;
    }

    const key = edgeConnectionKey(edge);

    if (seenConnections.has(key)) {
      removedEdges += 1;
      continue;
    }

    seenConnections.add(key);
    cleanedEdges.push(edge);
  }

  if (nodes.length === 0) {
    return { nodes, edges: cleanedEdges, removedEdges };
  }

  // Self loops cannot participate in ranking without creating an endless rank.
  const links = cleanedEdges.filter((edge) => edge.source !== edge.target);
  const incoming = new Map<string, Edge[]>();

  for (const edge of links) {
    const parents = incoming.get(edge.target);

    if (parents) {
      parents.push(edge);
    } else {
      incoming.set(edge.target, [edge]);
    }
  }

  const connectedIds = new Set<string>();
  for (const edge of links) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }

  const roots = nodes
    .filter((node) => connectedIds.has(node.id) && !incoming.has(node.id))
    .map((node) => node.id);

  if (roots.length === 0 && connectedIds.size > 0) {
    // The whole graph is cyclic: pick one node as the starting point.
    const first = nodes.find((node) => connectedIds.has(node.id));

    if (first) {
      roots.push(first.id);
    }
  }

  const rank = new Map<string, number>();
  roots.forEach((id) => rank.set(id, 0));

  const maxRank = Math.max(0, nodes.length - 1);

  // Longest-path ranking with a hard cap keeps merged branches below all of
  // their parents while still terminating when the graph contains a cycle.
  for (let pass = 0; pass < nodes.length; pass += 1) {
    let changed = false;

    for (const edge of links) {
      const sourceRank = rank.get(edge.source);

      if (sourceRank === undefined) {
        continue;
      }

      const nextRank = Math.min(sourceRank + 1, maxRank);
      const targetRank = rank.get(edge.target);

      if (targetRank === undefined || nextRank > targetRank) {
        rank.set(edge.target, nextRank);
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  let highestRank = 0;
  for (const value of rank.values()) {
    highestRank = Math.max(highestRank, value);
  }

  // Unconnected nodes are parked in a single row below the graph.
  for (const node of nodes) {
    if (!rank.has(node.id)) {
      rank.set(node.id, highestRank + 1);
    }
  }

  const rankBuckets = new Map<number, string[]>();
  for (const node of nodes) {
    const value = rank.get(node.id) ?? 0;
    const bucket = rankBuckets.get(value);

    if (bucket) {
      bucket.push(node.id);
    } else {
      rankBuckets.set(value, [node.id]);
    }
  }

  const originalOrder = new Map<string, number>();
  nodes.forEach((node, index) => originalOrder.set(node.id, index));

  const xById = new Map<string, number>();
  const sortedRanks = [...rankBuckets.keys()].sort((left, right) => left - right);

  for (const value of sortedRanks) {
    const ids = rankBuckets.get(value) ?? [];
    const desired = ids.map((id, indexInRank) => {
      const placedParents = (incoming.get(id) ?? []).filter(
        (edge) => edge.source !== id && xById.has(edge.source),
      );

      if (placedParents.length === 0) {
        return { id, x: indexInRank * COLUMN_PITCH };
      }

      let total = 0;

      for (const edge of placedParents) {
        const parentX = xById.get(edge.source) ?? 0;
        total += edge.sourceHandle === "true" ? parentX + COLUMN_PITCH : parentX;
      }

      return { id, x: total / placedParents.length };
    });

    desired.sort(
      (left, right) =>
        left.x - right.x ||
        (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0),
    );

    let previousX: number | null = null;

    for (const item of desired) {
      const x: number =
        previousX === null ? item.x : Math.max(item.x, previousX + COLUMN_PITCH);

      xById.set(item.id, x);
      previousX = x;
    }
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;

  for (const node of nodes) {
    minX = Math.min(minX, xById.get(node.id) ?? 0);
    minY = Math.min(minY, (rank.get(node.id) ?? 0) * ROW_PITCH);
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
  }

  if (!Number.isFinite(minY)) {
    minY = 0;
  }

  const snap = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;

  const positioned = nodes.map((node) => ({
    ...node,
    position: {
      x: snap((xById.get(node.id) ?? 0) - minX + ORIGIN_X),
      y: snap((rank.get(node.id) ?? 0) * ROW_PITCH - minY + ORIGIN_Y),
    },
  }));

  return { nodes: positioned, edges: cleanedEdges, removedEdges };
}
