import dagre from 'dagre';
import { MarkerType } from '@xyflow/react';
import type { Edge } from '@xyflow/react';
import type { DependencyGraphData } from '../../types';

/**
 * Files with at least this many importers are treated as structurally
 * important and rendered larger — a lightweight, layout-time signal (raw
 * in-degree from the edge list) distinct from insightsEngine's "hotspot"
 * definition. A wide size range so a genuine hub is unmistakably larger,
 * not just marginally.
 */
const HIGH_IMPORTANCE_IN_DEGREE = 8;
const MEDIUM_IMPORTANCE_IN_DEGREE = 3;

export const FILE_NODE_SIZES = {
  small:  { width: 190, height: 48 },
  medium: { width: 240, height: 60 },
  large:  { width: 300, height: 76 },
} as const;

export type ImportanceTier = keyof typeof FILE_NODE_SIZES;

export const importanceTier = (inDegree: number): ImportanceTier => {
  if (inDegree >= HIGH_IMPORTANCE_IN_DEGREE) return 'large';
  if (inDegree >= MEDIUM_IMPORTANCE_IN_DEGREE) return 'medium';
  return 'small';
};

/** A file's immediate containing directory — the same flat, one-level-deep
 *  grouping the treemap and the folder-focus mode both key off. Root-level
 *  files have no folder. */
export function getFolderPath(filePath: string): string | null {
  const parts = filePath.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : null;
}

const RANK_SEP = 140;
const NODE_SEP = 24;

/** One "side" of a focused neighborhood — either the dependency side
 *  (edges flowing out of the center) or the dependent side (edges flowing
 *  into the center), laid out independently with dagre and then merged by
 *  the caller. */
function layoutSide(
  centerIds: string[],
  reachable: Map<string, number>, // id -> hop distance from nearest center (>= 1)
  data: DependencyGraphData,
  direction: 'forward' | 'backward',
  inDegreeByFile: Map<string, number>,
): { nodes: Map<string, { x: number; y: number }>; edges: Edge[] } {
  const included = new Set(centerIds);
  reachable.forEach((_hop, id) => included.add(id));

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: NODE_SEP, ranksep: RANK_SEP });

  for (const id of included) {
    const tier = importanceTier(inDegreeByFile.get(id) ?? 0);
    const { width, height } = FILE_NODE_SIZES[tier];
    g.setNode(id, { width, height });
  }

  const edges: Edge[] = [];
  const seenEdgeIds = new Set<string>();
  for (const e of data.edges) {
    if (!included.has(e.sourceId) || !included.has(e.targetId)) continue;
    const sourceIsCenter = centerIds.includes(e.sourceId);
    const targetIsCenter = centerIds.includes(e.targetId);
    if (sourceIsCenter && targetIsCenter) continue; // sibling center-to-center, not this side's concern

    const id = `${e.sourceId}->${e.targetId}`;
    if (!seenEdgeIds.has(id)) {
      seenEdgeIds.add(id);
      edges.push({
        id, source: e.sourceId, target: e.targetId, type: 'custom', data: { count: 1 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: 'var(--border-focus)' },
      });
    }

    // Only edges pointing away from the center belong in *this* side's
    // ranking graph — e.g. on the dependency side, center -> dependency (or
    // dependency -> a further dependency) counts. Feeding an edge that
    // points back toward the center into dagre would create a ranking
    // cycle; it's still drawn (added to `edges` above), just not used to
    // rank.
    const sourceHop = sourceIsCenter ? 0 : reachable.get(e.sourceId) ?? Infinity;
    const targetHop = targetIsCenter ? 0 : reachable.get(e.targetId) ?? Infinity;
    const pointsOutward = direction === 'forward' ? targetHop > sourceHop : sourceHop > targetHop;
    if (pointsOutward) {
      if (direction === 'forward') g.setEdge(e.sourceId, e.targetId);
      else g.setEdge(e.targetId, e.sourceId); // reversed so the center still ranks first
    }
  }

  dagre.layout(g);

  const nodes = new Map<string, { x: number; y: number }>();
  included.forEach(id => {
    const pos = g.node(id);
    if (pos) nodes.set(id, { x: pos.x, y: pos.y });
  });
  return { nodes, edges };
}

/** BFS outward from `startIds` following edges in `direction`, up to
 *  `maxDepth` hops (Infinity for "all"). Returns hop distance per reached
 *  id, excluding the start set itself. */
function bfsReachable(
  startIds: string[],
  data: DependencyGraphData,
  direction: 'forward' | 'backward',
  maxDepth: number,
): Map<string, number> {
  const adjacency = new Map<string, string[]>();
  for (const e of data.edges) {
    const [from, to] = direction === 'forward' ? [e.sourceId, e.targetId] : [e.targetId, e.sourceId];
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from)!.push(to);
  }

  const distance = new Map<string, number>();
  const startSet = new Set(startIds);
  let frontier = [...startIds];
  let hop = 0;
  while (frontier.length > 0 && hop < maxDepth) {
    hop++;
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) ?? []) {
        if (startSet.has(neighbor) || distance.has(neighbor)) continue;
        distance.set(neighbor, hop);
        next.push(neighbor);
      }
    }
    frontier = next;
  }
  return distance;
}

export interface FocusedLayoutNode {
  id: string;
  path: string;
  label: string;
  type: string;
  isCenter: boolean;
  inDegree: number;
  outDegree: number;
  position: { x: number; y: number };
}

export interface FocusedLayoutResult {
  nodes: FocusedLayoutNode[];
  edges: Edge[];
}

/**
 * Lays out a depth-limited neighborhood around one or more "center" files —
 * a single focused file, or every file in a focused folder (siblings, one
 * hop). Dependencies render to one side, dependents to the other, exactly
 * as import statements read: neither direction fights the other for space,
 * and nothing outside the requested depth is computed or rendered at all.
 *
 * Two independent dagre passes (dependency side, dependent side) share the
 * center set as their common anchor; the dependent side's ranking graph
 * uses reversed edges so the center still lands at rank 0, then its x
 * positions are negated to place it on the opposite side. This reuses
 * dagre's deterministic, hierarchical ranking (kept from the old
 * whole-graph layout) instead of a hand-rolled positioning algorithm.
 */
export function getFocusedLayout(
  data: DependencyGraphData,
  centerIds: string[],
  depth: 1 | 2 | 3 | 'all',
): FocusedLayoutResult {
  if (centerIds.length === 0) return { nodes: [], edges: [] };
  const maxDepth = depth === 'all' ? Infinity : depth;

  const nodeById = new Map(data.nodes.map(n => [n.id, n]));
  const inDegreeByFile = new Map<string, number>();
  const outDegreeByFile = new Map<string, number>();
  for (const e of data.edges) {
    inDegreeByFile.set(e.targetId, (inDegreeByFile.get(e.targetId) ?? 0) + 1);
    outDegreeByFile.set(e.sourceId, (outDegreeByFile.get(e.sourceId) ?? 0) + 1);
  }

  const dependencies = bfsReachable(centerIds, data, 'forward', maxDepth);
  const dependents = bfsReachable(centerIds, data, 'backward', maxDepth);

  const depSide = layoutSide(centerIds, dependencies, data, 'forward', inDegreeByFile);
  const depentSide = layoutSide(centerIds, dependents, data, 'backward', inDegreeByFile);

  // Anchor both sides on the primary center node so they share one
  // coordinate space; any additional center nodes (folder-focus siblings)
  // keep their position relative to the anchor from the dependency-side
  // pass, since that's the copy actually used below.
  const anchorId = centerIds[0];
  const depAnchor = depSide.nodes.get(anchorId) ?? { x: 0, y: 0 };
  const depentAnchor = depentSide.nodes.get(anchorId) ?? { x: 0, y: 0 };

  const positioned = new Map<string, { x: number; y: number }>();
  depSide.nodes.forEach((pos, id) => {
    positioned.set(id, { x: pos.x - depAnchor.x, y: pos.y - depAnchor.y });
  });
  depentSide.nodes.forEach((pos, id) => {
    if (positioned.has(id) && centerIds.includes(id)) return; // already placed via dep side
    positioned.set(id, { x: -(pos.x - depentAnchor.x), y: pos.y - depentAnchor.y });
  });

  const nodes: FocusedLayoutNode[] = [];
  positioned.forEach((position, id) => {
    const raw = nodeById.get(id);
    if (!raw) return;
    nodes.push({
      id,
      path: raw.path,
      label: raw.name,
      type: raw.type,
      isCenter: centerIds.includes(id),
      inDegree: inDegreeByFile.get(id) ?? 0,
      outDegree: outDegreeByFile.get(id) ?? 0,
      position,
    });
  });

  const edgeById = new Map<string, Edge>();
  for (const e of [...depSide.edges, ...depentSide.edges]) edgeById.set(e.id, e);

  return { nodes, edges: Array.from(edgeById.values()) };
}
