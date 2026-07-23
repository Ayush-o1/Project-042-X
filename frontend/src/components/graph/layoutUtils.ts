import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { DependencyGraphData, GitCommitNode } from '../../types';

/**
 * Files with at least this many importers are treated as structurally
 * important and rendered larger — a lightweight, layout-time signal
 * (raw in-degree from the edge list) distinct from insightsEngine's
 * "hotspot" definition, which needs the full analysis and isn't available
 * yet when layout runs. Two tiers keep the effect legible without turning
 * the canvas into a bubble chart.
 */
const HIGH_IMPORTANCE_IN_DEGREE = 8;
const MEDIUM_IMPORTANCE_IN_DEGREE = 3;

const FILE_NODE_SIZES = {
  small:  { width: 220, height: 52 },
  medium: { width: 250, height: 60 },
  large:  { width: 270, height: 70 },
} as const;

export type ImportanceTier = keyof typeof FILE_NODE_SIZES;

const importanceTier = (inDegree: number): ImportanceTier => {
  if (inDegree >= HIGH_IMPORTANCE_IN_DEGREE) return 'large';
  if (inDegree >= MEDIUM_IMPORTANCE_IN_DEGREE) return 'medium';
  return 'small';
};

/** A file's immediate containing directory, used as its folder-cluster id
 *  (there is no folder-of-folder nesting in this model — every file belongs
 *  to exactly one flat folder cluster keyed by its full parent path). Root-
 *  level files have no folder. Exported so callers can compute the same
 *  folder set getDagreLayout would (e.g. to seed a default collapsed set)
 *  without duplicating the split/join logic. */
export function getFolderPath(filePath: string): string | null {
  const parts = filePath.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : null;
}

export const getDagreLayout = (
  data: DependencyGraphData,
  direction: 'TB' | 'LR' = 'LR',
  collapsedFolders: Set<string> = new Set(),
) => {
  const dagreGraph = new dagre.graphlib.Graph({ compound: true });
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

  // ── Structural in-degree, computed once from the raw edge list — drives
  // both node sizing (below) and is independent of which folders are
  // currently collapsed, so a file's visual weight doesn't jump around as
  // the user expands/collapses unrelated folders. ─────────────────────────
  const inDegreeByFile = new Map<string, number>();
  for (const e of data.edges) {
    inDegreeByFile.set(e.targetId, (inDegreeByFile.get(e.targetId) ?? 0) + 1);
  }

  // ── Folder membership: every file's immediate containing directory
  // becomes exactly one folder id (there is no folder-of-folder nesting in
  // this model — see the "creates a folder node per parent directory" test
  // for the shape this produces). ─────────────────────────────────────────
  const folderOfFile = new Map<string, string>();
  const folderFileCount = new Map<string, number>();
  data.nodes.forEach(node => {
    const folderPath = getFolderPath(node.path);
    if (folderPath) {
      folderOfFile.set(node.id, folderPath);
      folderFileCount.set(folderPath, (folderFileCount.get(folderPath) ?? 0) + 1);
    }
  });

  /** A file is hidden when its folder is collapsed; resolves to the folder
   *  id in that case so edges/positions redirect there instead. */
  const resolve = (id: string): string => {
    const folder = folderOfFile.get(id);
    return folder && collapsedFolders.has(folder) ? folder : id;
  };
  const isHiddenFile = (id: string): boolean => {
    const folder = folderOfFile.get(id);
    return Boolean(folder && collapsedFolders.has(folder));
  };

  const xyNodes: Node[] = [];

  // ── Folder nodes — a collapsed folder is a regular sized "summary" node;
  // an expanded one is still the transparent dagre-compound cluster the
  // rest of this function already assumed. ───────────────────────────────
  folderFileCount.forEach((fileCount, folder) => {
    const collapsed = collapsedFolders.has(folder);
    const label = folder.split('/').pop();

    if (collapsed) {
      const { width, height } = FILE_NODE_SIZES.medium;
      xyNodes.push({
        id: folder,
        type: 'folderNode',
        position: { x: 0, y: 0 },
        data: { label, collapsed: true, fileCount },
        style: { width, height, zIndex: 0 },
      });
      dagreGraph.setNode(folder, { width, height });
    } else {
      xyNodes.push({
        id: folder,
        type: 'folderNode',
        position: { x: 0, y: 0 },
        data: { label, collapsed: false, fileCount },
        style: { zIndex: -1 },
      });
      dagreGraph.setNode(folder, { label: folder, clusterLabelPos: 'top' });
    }
  });

  // ── File nodes — skipped entirely while their folder is collapsed. ─────
  data.nodes.forEach(node => {
    if (isHiddenFile(node.id)) return;

    const parentId = folderOfFile.get(node.id);
    const tier = importanceTier(inDegreeByFile.get(node.id) ?? 0);
    const { width, height } = FILE_NODE_SIZES[tier];

    const xyNode: Node = {
      id: node.id,
      type: 'fileNode',
      position: { x: 0, y: 0 },
      data: { label: node.name, type: node.type, path: node.path, importance: tier },
      parentId,
      extent: parentId ? 'parent' : undefined,
    };
    xyNodes.push(xyNode);
    dagreGraph.setNode(node.id, { width, height });
    if (parentId) {
      dagreGraph.setParent(node.id, parentId);
    }
  });

  // ── Edges — redirected to the folder id on whichever end is collapsed,
  // self-loops (both ends collapse into the same folder) dropped, parallel
  // edges produced by the redirection deduplicated (with a count so the
  // edge can communicate "this folder has 3 imports of that one"). ───────
  const edgeByKey = new Map<string, Edge & { data: { count: number } }>();
  for (const edge of data.edges) {
    const source = resolve(edge.sourceId);
    const target = resolve(edge.targetId);
    if (source === target) continue;

    // Same id convention as before collapse existed (`source-target`), kept
    // unchanged so anything keying off this format (e.g. hover-highlight's
    // adjacency edgeId lookups) doesn't need to change too.
    const key = `${source}-${target}`;
    const existing = edgeByKey.get(key);
    if (existing) {
      existing.data.count += 1;
    } else {
      edgeByKey.set(key, {
        id: key,
        source,
        target,
        type: 'custom',
        animated: true,
        data: { count: 1 },
      });
    }
  }
  const xyEdges: Edge[] = Array.from(edgeByKey.values());

  xyEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  xyNodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    if (!nodeWithPosition) return;

    // Shift coordinate system from center to top-left for xyflow
    if (node.type === 'folderNode') {
      node.position = {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      };
      if (!node.data.collapsed) {
        node.style = { ...node.style, width: nodeWithPosition.width, height: nodeWithPosition.height };
      }
    } else {
      const { width, height } = FILE_NODE_SIZES[(node.data.importance as ImportanceTier) ?? 'medium'];
      // FileNode renders at width/height: 100% — this is what makes the
      // importance tier's reserved dagre space and the actually-rendered
      // node size the same thing, so bigger-tier nodes don't overlap their
      // neighbors or leave the reserved gap empty.
      node.style = { ...node.style, width, height };
      let absoluteX = nodeWithPosition.x - width / 2;
      let absoluteY = nodeWithPosition.y - height / 2;

      if (node.parentId) {
        const parentWithPosition = dagreGraph.node(node.parentId);
        const parentAbsoluteX = parentWithPosition.x - parentWithPosition.width / 2;
        const parentAbsoluteY = parentWithPosition.y - parentWithPosition.height / 2;
        node.position = {
          x: absoluteX - parentAbsoluteX,
          y: absoluteY - parentAbsoluteY,
        };
      } else {
        node.position = { x: absoluteX, y: absoluteY };
      }
    }
  });

  return { nodes: xyNodes, edges: xyEdges };
};

export const getGitDagreLayout = (data: { commits: GitCommitNode[] }, direction: 'TB' | 'LR' = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // TB (top-to-bottom) makes git timelines look correct
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 60 });

  const laneOf = assignCommitLanes(data.commits);

  const xyNodes: Node[] = data.commits.map((commit) => ({
    id: commit.hash,
    type: 'commitNode',
    position: { x: 0, y: 0 },
    data: {
      hash: commit.hash, message: commit.message, author: commit.author,
      refs: commit.refs, timestamp: commit.timestamp,
      lane: laneOf.get(commit.hash) ?? 0,
    },
  }));

  const xyEdges: Edge[] = [];
  data.commits.forEach(commit => {
    commit.parents.forEach((parentHash: string) => {
      // The edge takes the color of the lane it descends FROM (the child
      // commit's lane) — a merge's extra parents render in the color of
      // whichever branch is merging in, not the branch merged into.
      const lane = laneOf.get(commit.hash) ?? 0;
      xyEdges.push({
        id: `${commit.hash}-${parentHash}`,
        source: commit.hash,
        target: parentHash,
        type: 'straight',
        style: { stroke: laneColor(lane), strokeWidth: 2 },
        // The view's hover-highlight effect overwrites `style` wholesale to
        // show/hide the accent-colored "connected to hovered commit" state
        // — data.laneColor is this edge's own branch color, kept out of
        // reach of that so it can be restored once hovering stops.
        data: { laneColor: laneColor(lane) },
      });
    });
  });

  xyNodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 300, height: 80 });
  });

  xyEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  xyNodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - 150,
      y: nodeWithPosition.y - 40,
    };
  });

  return { nodes: xyNodes, edges: xyEdges };
};

// ─── Commit lane assignment (branch topology coloring) ────────────────────────
//
// Git doesn't durably record "which branch" a historical commit belongs to —
// refs only mark current branch *tips*. What's fully recoverable from the
// commit list itself is topology: parent/child structure. This assigns each
// commit to a "lane" using the same technique `git log --graph` and tools
// like GitKraken use — walk commits newest-first, track which lane each
// still-open lineage occupies, and reuse/open/close lanes as merges and
// branch points are encountered. The result is a small integer per commit
// (not a position), used purely to pick a stable color.

const BRANCH_PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
];

export function laneColor(lane: number): string {
  return BRANCH_PALETTE[lane % BRANCH_PALETTE.length];
}

/**
 * @param commits Must be newest-first (the order the backend/renderedCommits
 *   already provide) — the algorithm walks history backwards in time.
 * @returns commit hash -> lane index.
 */
export function assignCommitLanes(commits: GitCommitNode[]): Map<string, number> {
  const laneOf = new Map<string, number>();
  // activeLanes[i] is the hash that lane i is currently waiting to reach as
  // it walks backwards through history; `null` marks a free (reusable) lane.
  const activeLanes: (string | null)[] = [];

  const claimLane = (expecting: string | null): number => {
    const free = activeLanes.indexOf(null);
    if (free !== -1) {
      activeLanes[free] = expecting;
      return free;
    }
    activeLanes.push(expecting);
    return activeLanes.length - 1;
  };

  for (const commit of commits) {
    let lane = activeLanes.indexOf(commit.hash);
    if (lane === -1) {
      // No open lineage was waiting for this commit — it's a new branch tip
      // (or the render window was capped before its child appeared).
      lane = claimLane(null);
    }
    laneOf.set(commit.hash, lane);

    const [firstParent, ...otherParents] = commit.parents;
    // This lane continues into the first parent (git's own convention for
    // "which side of a merge is the mainline"); a root commit closes it.
    activeLanes[lane] = firstParent ?? null;

    // Additional parents (merge sources) open their own lanes if nothing is
    // already tracking them, so the merged-in branch gets its own color
    // for its remaining history above the merge point.
    for (const parentHash of otherParents) {
      if (!activeLanes.includes(parentHash)) {
        claimLane(parentHash);
      }
    }
  }

  return laneOf;
}
