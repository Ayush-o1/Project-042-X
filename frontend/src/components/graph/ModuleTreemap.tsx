import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Folder, HeartPulse, Flame, FileType2, ArrowLeft, ChevronRight } from 'lucide-react';
import { computeTreemap } from './treemapLayout';
import { getFolderPath } from './layoutUtils';
import { healthToColor } from '../../lib/health';
import type { PackageMetrics } from '../../lib/insightsEngine';
import type { DependencyGraphData } from '../../types';
import { useElementSize } from '../../hooks/useElementSize';

export type TreemapColorMode = 'health' | 'hotspot' | 'type';

const LANG_COLOR: Record<string, string> = {
  TypeScript: 'var(--lang-ts)',
  JavaScript: 'var(--lang-js)',
  JSON: 'var(--lang-json)',
};

function hotspotToColor(fanIn: number, maxFanIn: number): string {
  if (maxFanIn <= 0) return 'var(--bg-elevated)';
  const t = Math.min(1, fanIn / maxFanIn);
  // Amber (low) -> red (high); a distinct scale from health's green-anchored
  // one so "hotspot" mode never gets mistaken for "everything is healthy".
  const r = Math.round(251 - t * 12);
  const g = Math.round(191 - t * 175);
  const b = Math.round(36 - t * 20);
  return `rgb(${r}, ${g}, ${Math.max(0, b)})`;
}

interface FolderCell extends PackageMetrics {
  dominantType: string;
}

// Every leaf directory (`PackageMetrics.path`) was previously rendered as
// its own flat, sibling rectangle — `src/components/graph` and `src/lib`
// read as unrelated equals, and two folders sharing a leaf name in
// different parents were only distinguishable via hover tooltip. This tree
// groups leaves by their real parent/child path structure so the panel can
// show one level at a time (drill in/out), with siblings guaranteed
// distinct by construction.
interface TreeNode {
  segment: string;
  /** Full path (same format as PackageMetrics.path / focusedFolder) up to
   *  and including this node — reused directly by onSelectFolder. */
  absPath: string;
  children: Map<string, TreeNode>;
  /** Present when `absPath` is itself a real leaf directory (files live
   *  directly in it) — which can be true even when `children` is also
   *  non-empty (a folder with both direct files and subfolders). */
  leaf?: FolderCell;
}

function longestCommonPrefix(pathLists: string[][]): string[] {
  if (pathLists.length === 0) return [];
  let prefix = pathLists[0];
  for (let i = 1; i < pathLists.length && prefix.length > 0; i++) {
    const parts = pathLists[i];
    let j = 0;
    while (j < prefix.length && j < parts.length && prefix[j] === parts[j]) j++;
    prefix = prefix.slice(0, j);
  }
  return prefix;
}

function buildTree(cells: FolderCell[], commonPrefixLen: number): TreeNode {
  const root: TreeNode = { segment: '', absPath: '', children: new Map() };
  for (const cell of cells) {
    const parts = cell.path.split('/');
    const relParts = parts.slice(commonPrefixLen);
    let node = root;
    let absPath = parts.slice(0, commonPrefixLen).join('/');
    for (const part of relParts) {
      absPath = absPath ? `${absPath}/${part}` : part;
      if (!node.children.has(part)) node.children.set(part, { segment: part, absPath, children: new Map() });
      node = node.children.get(part)!;
    }
    node.leaf = cell;
  }
  return root;
}

function nodeAt(root: TreeNode, path: string[]): TreeNode | undefined {
  let node = root;
  for (const seg of path) {
    const next = node.children.get(seg);
    if (!next) return undefined;
    node = next;
  }
  return node;
}

function collectLeaves(node: TreeNode, acc: FolderCell[]): void {
  if (node.leaf) acc.push(node.leaf);
  node.children.forEach(child => collectLeaves(child, acc));
}

/** A folder with subfolders is displayed as one cell whose size/color
 *  reflect the whole subtree — summed counts, fileCount-weighted averages
 *  for health/instability. Internal/external edge counts (and therefore
 *  cohesion) are a sum-of-leaves approximation: an edge between two
 *  sibling subfolders of this node is still counted as "external" the way
 *  it was at the leaf level, rather than reclassified as internal to this
 *  aggregate — recomputing it exactly would need the full edge list
 *  re-walked per aggregate node, which isn't worth the cost for what is a
 *  navigational visualization, not a certified metric. */
function aggregate(node: TreeNode): FolderCell {
  if (node.children.size === 0 && node.leaf) return node.leaf;

  const leaves: FolderCell[] = [];
  collectLeaves(node, leaves);

  const fileCount = leaves.reduce((s, l) => s + l.fileCount, 0);
  const totalSize = leaves.reduce((s, l) => s + l.totalSize, 0);
  const totalFanIn = leaves.reduce((s, l) => s + l.totalFanIn, 0);
  const totalFanOut = leaves.reduce((s, l) => s + l.totalFanOut, 0);
  const internalEdges = leaves.reduce((s, l) => s + l.internalEdges, 0);
  const externalEdges = leaves.reduce((s, l) => s + l.externalEdges, 0);
  const avgHealthScore = fileCount > 0 ? leaves.reduce((s, l) => s + l.avgHealthScore * l.fileCount, 0) / fileCount : 0;
  const avgInstability = fileCount > 0 ? leaves.reduce((s, l) => s + l.avgInstability * l.fileCount, 0) / fileCount : 0;
  const totalEdges = internalEdges + externalEdges;
  const cohesion = totalEdges === 0 ? 1 : internalEdges / totalEdges;

  const typeCounts = new Map<string, number>();
  leaves.forEach(l => typeCounts.set(l.dominantType, (typeCounts.get(l.dominantType) ?? 0) + l.fileCount));
  let dominantType = 'Other';
  let max = 0;
  typeCounts.forEach((count, type) => { if (count > max) { max = count; dominantType = type; } });

  return {
    path: node.absPath, fileCount, totalSize, avgInstability, avgHealthScore,
    totalFanIn, totalFanOut, internalEdges, externalEdges, cohesion, dominantType,
  };
}

export const ModuleTreemap = ({
  dependencies,
  packageMetrics,
  colorMode,
  onColorModeChange,
  focusedFolder,
  onSelectFolder,
}: {
  dependencies: DependencyGraphData;
  packageMetrics: PackageMetrics[];
  colorMode: TreemapColorMode;
  onColorModeChange: (mode: TreemapColorMode) => void;
  focusedFolder: string | null;
  onSelectFolder: (folderPath: string) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(containerRef);
  const [hovered, setHovered] = useState<string | null>(null);
  const [treemapPath, setTreemapPath] = useState<string[]>([]);

  const leafCells: FolderCell[] = useMemo(() => {
    const typeCounts = new Map<string, Map<string, number>>();
    for (const node of dependencies.nodes) {
      const folder = getFolderPath(node.path);
      if (!folder) continue;
      if (!typeCounts.has(folder)) typeCounts.set(folder, new Map());
      const counts = typeCounts.get(folder)!;
      counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
    }
    return packageMetrics.map(pkg => {
      const counts = typeCounts.get(pkg.path);
      let dominantType = 'Other';
      let max = 0;
      counts?.forEach((count, type) => { if (count > max) { max = count; dominantType = type; } });
      return { ...pkg, dominantType };
    });
  }, [dependencies, packageMetrics]);

  const commonPrefix = useMemo(
    () => longestCommonPrefix(leafCells.map(c => c.path.split('/'))),
    [leafCells],
  );
  const commonPrefixPath = commonPrefix.join('/');

  const tree = useMemo(() => buildTree(leafCells, commonPrefix.length), [leafCells, commonPrefix]);

  // Follow the graph's own focus: if a file/folder is selected elsewhere
  // (search, a risk shortcut, keyboard traversal) whose containing folder
  // isn't visible at the treemap's current drill level, jump to the level
  // that makes it visible instead of leaving the panel showing an
  // unrelated part of the tree.
  useEffect(() => {
    if (!focusedFolder) return;
    if (focusedFolder === commonPrefixPath) { setTreemapPath([]); return; }
    if (!focusedFolder.startsWith(commonPrefixPath ? `${commonPrefixPath}/` : '')) return;
    const rel = focusedFolder.slice(commonPrefixPath ? commonPrefixPath.length + 1 : 0).split('/');
    setTreemapPath(rel.slice(0, -1));
  }, [focusedFolder, commonPrefixPath]);

  const currentNode = nodeAt(tree, treemapPath) ?? tree;
  // If navigation ever lands somewhere stale (e.g. a fresh analysis
  // changed the tree shape), fall back to root rather than rendering
  // nothing.
  useEffect(() => {
    if (!nodeAt(tree, treemapPath)) setTreemapPath([]);
  }, [tree, treemapPath]);

  const cells = useMemo(
    () => Array.from(currentNode.children.values()).map(child => ({ node: child, cell: aggregate(child) })),
    [currentNode],
  );

  const maxFanIn = useMemo(() => Math.max(1, ...cells.map(c => c.cell.totalFanIn)), [cells]);

  const rects = useMemo(
    () => computeTreemap(cells.map(c => ({ value: c.cell.fileCount })), width, height),
    [cells, width, height],
  );

  const colorFor = (cell: FolderCell): string => {
    if (colorMode === 'health') return healthToColor(cell.avgHealthScore);
    if (colorMode === 'hotspot') return hotspotToColor(cell.totalFanIn, maxFanIn);
    return LANG_COLOR[cell.dominantType] ?? 'var(--text-tertiary)';
  };

  const MODES: { key: TreemapColorMode; icon: React.ReactNode; label: string }[] = [
    { key: 'health', icon: <HeartPulse size={12} />, label: 'Health' },
    { key: 'hotspot', icon: <Flame size={12} />, label: 'Hotspot' },
    { key: 'type', icon: <FileType2 size={12} />, label: 'Type' },
  ];

  return (
    <div className="treemap-panel">
      <div className="treemap-panel-header">
        <div className="treemap-panel-title">
          <Folder size={13} />
          <span>Modules</span>
        </div>
        <div className="treemap-mode-toggle" role="group" aria-label="Treemap color mode">
          {MODES.map(m => (
            <button
              key={m.key}
              type="button"
              className={`treemap-mode-btn${colorMode === m.key ? ' active' : ''}`}
              onClick={() => onColorModeChange(m.key)}
              title={`Color by ${m.label}`}
              aria-label={`Color by ${m.label}`}
              aria-pressed={colorMode === m.key}
            >
              {m.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="treemap-breadcrumb">
        <button
          type="button"
          onClick={() => setTreemapPath(p => p.slice(0, -1))}
          disabled={treemapPath.length === 0}
          className="btn-icon btn-icon-sm"
          aria-label="Up one level"
          title="Up one level"
        >
          <ArrowLeft size={12} />
        </button>
        <button type="button" onClick={() => setTreemapPath([])} className="treemap-breadcrumb-segment">
          root
        </button>
        {treemapPath.map((seg, i) => (
          <React.Fragment key={i}>
            <ChevronRight size={10} className="treemap-breadcrumb-sep" />
            <button type="button" onClick={() => setTreemapPath(treemapPath.slice(0, i + 1))} className="treemap-breadcrumb-segment">
              {seg}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div ref={containerRef} className="treemap-canvas">
        {cells.length === 0 && (
          <div className="treemap-empty">No folders to show.</div>
        )}
        {/* A single dead-end leaf (no further subfolders) would otherwise
            fill the entire panel with one giant, information-free colored
            rectangle — proportional sizing has nothing to be proportional
            *to* with just one item. A compact card reads better than a
            wall of one color for what is, structurally, a tiny repo. */}
        {cells.length === 1 && cells[0].node.children.size === 0 ? (
          <div className="treemap-empty" style={{ flexDirection: 'column', gap: 'var(--space-3)' }}>
            <span>{cells[0].node.segment} — {cells[0].cell.fileCount} file{cells[0].cell.fileCount === 1 ? '' : 's'}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onSelectFolder(cells[0].cell.path)}>
              Explore in graph
            </button>
          </div>
        ) : cells.map(({ node, cell }, i) => {
          const rect = rects[i];
          if (!rect || rect.width < 1 || rect.height < 1) return null;
          const hasChildren = node.children.size > 0;
          const isFocused = focusedFolder === cell.path;
          const isHovered = hovered === cell.path;
          const showLabel = rect.width > 46 && rect.height > 24;
          return (
            <button
              key={node.absPath}
              type="button"
              className={`treemap-cell${isFocused ? ' focused' : ''}${isHovered ? ' hovered' : ''}`}
              style={{
                left: rect.x, top: rect.y, width: rect.width, height: rect.height,
                background: colorFor(cell),
              }}
              onMouseEnter={() => setHovered(cell.path)}
              onMouseLeave={() => setHovered(h => (h === cell.path ? null : h))}
              onClick={() => (hasChildren ? setTreemapPath(p => [...p, node.segment]) : onSelectFolder(cell.path))}
              onDoubleClick={hasChildren ? () => onSelectFolder(cell.path) : undefined}
              title={`${cell.path} — ${cell.fileCount} file${cell.fileCount === 1 ? '' : 's'}, health ${Math.round(cell.avgHealthScore)}, ${cell.internalEdges + cell.externalEdges === 0 ? 0 : Math.round(cell.cohesion * 100)}% cohesion${hasChildren ? ' — click to open, double-click to select' : ''}`}
              aria-label={`${node.segment} — ${cell.fileCount} file${cell.fileCount === 1 ? '' : 's'}, health ${Math.round(cell.avgHealthScore)}${hasChildren ? ', contains subfolders' : ''}`}
            >
              {showLabel && (
                <span className="treemap-cell-label">
                  {node.segment}{hasChildren && <ChevronRight size={9} style={{ display: 'inline', verticalAlign: 'middle', opacity: 0.7 }} />}
                  <span className="treemap-cell-count">{cell.fileCount}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
