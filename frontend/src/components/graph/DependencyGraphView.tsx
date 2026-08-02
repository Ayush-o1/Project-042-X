import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { useShallow } from 'zustand/react/shallow';
import { useMediaQuery, BREAKPOINTS } from '../../hooks/useMediaQuery';
import { usePersistedState } from '../../hooks/usePersistedState';
import type { DagreLayoutRequest, DagreLayoutResponse } from './dagreLayout.worker';
import { FileNode } from './FileNode';
import { CustomEdge } from './CustomEdge';
import { getFolderPath, importanceTier } from './layoutUtils';
import type { FocusedLayoutMeta } from './layoutUtils';
import { ModuleTreemap } from './ModuleTreemap';
import type { TreemapColorMode } from './ModuleTreemap';
import { ArchitectureToolbar } from './ArchitectureToolbar';
import type { GraphFilters } from './ArchitectureToolbar';
import { NodeInspector } from './NodeInspector';
import { Network, Loader2, ShieldAlert, Compass, AlertCircle } from 'lucide-react';
import type { GraphNode } from '../../types';

const nodeTypes = { fileNode: FileNode };
const edgeTypes = { custom: CustomEdge };
const FOLDER_PREFIX = 'folder:';
const PULSE_DURATION_MS = 420;

/** The focus canvas — a depth-limited neighborhood laid out by the dagre
 *  worker, plus keyboard traversal and the hover/pin dependency highlight.
 *  Rendered only once something is focused; the default (nothing focused)
 *  state is handled entirely by the parent. */
const FocusCanvas: React.FC<{
  centerIds: string[];
  filters: GraphFilters;
  canvasSelection: string | null;
  onOpenInspector: (id: string) => void;
  onRecenter: (id: string) => void;
}> = ({ centerIds, filters, canvasSelection, onOpenInspector, onRecenter }) => {
  const { dependencies, insights } = useRepositoryStore(
    useShallow(s => ({ dependencies: s.dependencies, insights: s.insights })),
  );
  const architectureDepth = useRepositoryStore(s => s.architectureDepth);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [rawResult, setRawResult] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const [isLayouting, setIsLayouting] = useState(true);
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());
  const [layoutMeta, setLayoutMeta] = useState<FocusedLayoutMeta | null>(null);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [isTakingLong, setIsTakingLong] = useState(false);
  const [override, setOverride] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  // ── Depth-limited layout, off the main thread ──────────────────────────
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  // Small LRU: revisiting a recently-laid-out neighborhood (a very common
  // back-and-forth navigation pattern) renders instantly instead of
  // re-running the worker round trip.
  const cacheRef = useRef<Map<string, { nodes: Node[]; edges: Edge[]; meta: FocusedLayoutMeta }>>(new Map());
  const centerKey = centerIds.join(' ');
  // The budget cap (see layoutUtils.ts) keeps the default path well under
  // this; 13s is a safety net for the rare pathological case that slips
  // through, not the expected happy path. The override path intentionally
  // gets a much longer allowance — the user asked for the expensive layout
  // and was told upfront it can take up to ~40s.
  const LAYOUT_TIMEOUT_MS = 13000;
  const OVERRIDE_TIMEOUT_MS = 45000;
  const CACHE_LIMIT = 30;

  // A new focus target resets any explicit "load it anyway" override from
  // a previous, unrelated neighborhood.
  useEffect(() => { setOverride(false); }, [centerKey, architectureDepth]);

  useEffect(() => {
    if (!dependencies || centerIds.length === 0) {
      setRawResult({ nodes: [], edges: [] });
      setLayoutMeta(null);
      setLayoutError(null);
      return;
    }

    const cacheKey = `${centerKey}|${architectureDepth}|${override ? 1 : 0}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      // Touch for LRU: move to the most-recently-used end.
      cacheRef.current.delete(cacheKey);
      cacheRef.current.set(cacheKey, cached);
      setRawResult({ nodes: cached.nodes, edges: cached.edges });
      setLayoutMeta(cached.meta);
      setIsLayouting(false);
      setLayoutError(null);
      setIsTakingLong(false);
      return;
    }

    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('./dagreLayout.worker.ts', import.meta.url), { type: 'module' });
    }
    const worker = workerRef.current;
    const requestId = ++requestIdRef.current;
    setIsLayouting(true);
    setLayoutError(null);
    setIsTakingLong(false);

    const clearTimer = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const handleMessage = (e: MessageEvent<DagreLayoutResponse>) => {
      if (e.data.requestId !== requestIdRef.current) return;
      clearTimer();
      const { nodes: laidOut, edges: laidOutEdges, meta } = e.data.result;
      const xyNodes: Node[] = laidOut.map(n => {
        const { width, height } = importanceTier(n.inDegree) === 'large'
          ? { width: 300, height: 76 }
          : importanceTier(n.inDegree) === 'medium'
            ? { width: 240, height: 60 }
            : { width: 190, height: 48 };
        return {
          id: n.id,
          type: 'fileNode',
          position: n.position,
          style: { width, height },
          data: {
            label: n.label, type: n.type, path: n.path,
            isCenter: n.isCenter, inDegree: n.inDegree, outDegree: n.outDegree,
            importance: importanceTier(n.inDegree),
          },
        };
      });

      cacheRef.current.set(cacheKey, { nodes: xyNodes, edges: laidOutEdges, meta });
      if (cacheRef.current.size > CACHE_LIMIT) {
        const oldestKey = cacheRef.current.keys().next().value;
        if (oldestKey !== undefined) cacheRef.current.delete(oldestKey);
      }

      setRawResult({ nodes: xyNodes, edges: laidOutEdges });
      setLayoutMeta(meta);
      setIsLayouting(false);

      // Pulse edges leaving the new center once, then settle — the one
      // deliberate motion moment (see ArchitectureNodeCanvas's CustomEdge).
      const centerSet = new Set(centerIds);
      const toPulse = new Set(laidOutEdges.filter(e => centerSet.has(e.source)).map(e => e.id));
      setPulsingIds(toPulse);
      window.setTimeout(() => setPulsingIds(new Set()), PULSE_DURATION_MS);
    };

    const handleError = (ev: ErrorEvent) => {
      if (requestIdRef.current !== requestId) return;
      clearTimer();
      setIsLayouting(false);
      setLayoutError(ev.message || 'Something went wrong laying out this neighborhood.');
      // The worker may be left mid-broken after an uncaught exception —
      // drop it and let the next request create a fresh one, rather than
      // leaving `isLayouting` stuck true forever with no recovery.
      worker.terminate();
      workerRef.current = null;
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    // Defense-in-depth on top of the budget cap in getFocusedLayout: if a
    // request is still running past this, something (an unanticipated
    // pathological graph shape, an `override` request that's genuinely
    // slow) is taking far longer than expected — surface that instead of a
    // silent, indistinguishable-from-hung spinner. Always armed (never
    // skipped), just with a much longer allowance for `override` requests.
    timeoutRef.current = window.setTimeout(
      () => setIsTakingLong(true),
      override ? OVERRIDE_TIMEOUT_MS : LAYOUT_TIMEOUT_MS,
    );

    worker.postMessage({
      requestId, data: dependencies, centerIds, depth: architectureDepth, override,
    } satisfies DagreLayoutRequest);

    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      clearTimer();
    };
  }, [dependencies, centerKey, architectureDepth, override, retryToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { workerRef.current?.terminate(); workerRef.current = null; }, []);

  const handleCancelLayout = useCallback(() => {
    requestIdRef.current++; // invalidate any in-flight response/error for this request
    workerRef.current?.terminate();
    workerRef.current = null;
    setIsLayouting(false);
    setIsTakingLong(false);
    // Falling back to the capped view (rather than leaving a blank canvas)
    // re-triggers the effect at the safe budget instead of the request
    // that was just cancelled.
    setOverride(false);
    setRetryToken(t => t + 1);
  }, []);

  const handleRetry = useCallback(() => {
    setLayoutError(null);
    setRetryToken(t => t + 1);
  }, []);

  // ── Canvas-local adjacency (only edges actually rendered) for the
  // hover/pin dependency-chain highlight — deliberately scoped to what's
  // on screen, unlike the Inspector's fan-in/out lists which need the
  // full graph regardless of the current depth. ─────────────────────────
  const canvasAdjacency = useMemo(() => {
    const forward = new Map<string, { target: string; edgeId: string }[]>();
    const reverse = new Map<string, { source: string; edgeId: string }[]>();
    for (const e of rawResult.edges) {
      if (!forward.has(e.source)) forward.set(e.source, []);
      forward.get(e.source)!.push({ target: e.target, edgeId: e.id });
      if (!reverse.has(e.target)) reverse.set(e.target, []);
      reverse.get(e.target)!.push({ source: e.source, edgeId: e.id });
    }
    return { forward, reverse };
  }, [rawResult.edges]);

  // ── Apply insight overlays + filters ────────────────────────────────────
  useEffect(() => {
    const cycleIds = insights?.cycleNodeIds || new Set<string>();
    const hotspotIds = insights?.hotspotNodeIds || new Set<string>();
    const orphanSet = new Set(insights?.orphanFiles || []);

    const processed = rawResult.nodes
      .filter(n => {
        const path = n.data.path as string;
        if (filters.fileTypeFilter) {
          const ext = path?.split('.').pop();
          if (ext && `.${ext}` !== filters.fileTypeFilter) return false;
        }
        if (!filters.showOrphans && orphanSet.has(path)) return false;
        if (filters.showCycles && !cycleIds.has(path)) return false;
        return true;
      })
      .map(n => {
        const path = n.data.path as string;
        const metrics = insights?.moduleMetrics.get(path);
        return {
          ...n,
          data: {
            ...n.data,
            healthScore: metrics?.healthScore,
            isHotspot: filters.highlightHotspots && hotspotIds.has(path),
            isCycle: filters.highlightCycles && cycleIds.has(path),
            dimmed: false,
          },
        };
      });

    setNodes(processed);
    setEdges(rawResult.edges.map(e => ({ ...e, data: { ...e.data, pulse: pulsingIds.has(e.id) } })));
  }, [rawResult, insights, filters, setNodes, setEdges, pulsingIds]);

  // ── Hover/pin highlight (transitive dependency closure), scoped to the
  // canvas's own (depth-limited) adjacency. ──────────────────────────────
  const highlightAnchor = hoveredNode ?? canvasSelection;
  useEffect(() => {
    if (!highlightAnchor) {
      setNodes(nds => nds.map(n => (n.data.dimmed === false ? n : { ...n, data: { ...n.data, dimmed: false } })));
      setEdges(eds => eds.map(e => {
        const d = e.data as { isIncoming?: boolean; isOutgoing?: boolean; isDimmed?: boolean } | undefined;
        if (!d?.isIncoming && !d?.isOutgoing && !d?.isDimmed) return e;
        return { ...e, data: { ...e.data, isIncoming: false, isOutgoing: false, isDimmed: false } };
      }));
      return;
    }

    const walk = (start: string, next: (id: string) => { other: string; edgeId: string }[]) => {
      const seen = new Set<string>([start]);
      const edgeIds = new Set<string>();
      const stack = [start];
      while (stack.length > 0) {
        const id = stack.pop()!;
        for (const { other, edgeId } of next(id)) {
          edgeIds.add(edgeId);
          if (!seen.has(other)) { seen.add(other); stack.push(other); }
        }
      }
      return { nodes: seen, edges: edgeIds };
    };

    const downstream = walk(highlightAnchor, id => (canvasAdjacency.forward.get(id) ?? []).map(e => ({ other: e.target, edgeId: e.edgeId })));
    const upstream = walk(highlightAnchor, id => (canvasAdjacency.reverse.get(id) ?? []).map(e => ({ other: e.source, edgeId: e.edgeId })));

    setNodes(nds => nds.map(n => {
      const dimmed = !downstream.nodes.has(n.id) && !upstream.nodes.has(n.id);
      return n.data.dimmed === dimmed ? n : { ...n, data: { ...n.data, dimmed } };
    }));
    setEdges(eds => eds.map(e => {
      const isOutgoing = downstream.edges.has(e.id);
      const isIncoming = upstream.edges.has(e.id);
      const isDimmed = !isIncoming && !isOutgoing;
      const d = e.data as { isIncoming?: boolean; isOutgoing?: boolean; isDimmed?: boolean } | undefined;
      if (d?.isIncoming === isIncoming && d?.isOutgoing === isOutgoing && d?.isDimmed === isDimmed) return e;
      return { ...e, data: { ...e.data, isIncoming, isOutgoing, isDimmed } };
    }));
  }, [highlightAnchor, canvasAdjacency, setNodes, setEdges]);

  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    onRecenter(node.id);
    onOpenInspector(node.id);
  }, [onRecenter, onOpenInspector]);

  if (layoutError) {
    return (
      <div className="architecture-canvas-status">
        <AlertCircle size={20} style={{ color: 'var(--color-danger)' }} />
        <span>{layoutError}</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (isLayouting && nodes.length === 0) {
    return (
      <div className="architecture-canvas-status">
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <span>{override ? 'Laying out the full neighborhood — this can take up to a minute for dense graphs…' : 'Laying out neighborhood…'}</span>
        {isTakingLong && (
          <div className="architecture-canvas-timeout-notice">
            <span>This is taking longer than expected.</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancelLayout}>
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {layoutMeta?.reduced && (
        <div className="architecture-canvas-notice" role="status">
          <ShieldAlert size={14} />
          <span>
            {layoutMeta.truncated
              ? `This neighborhood is too dense to lay out in full (${layoutMeta.edgeCount.toLocaleString()}+ edges) — showing the most important files.`
              : `Depth ${layoutMeta.requestedDepth} would be too dense (${layoutMeta.edgeCount.toLocaleString()} edges) — showing depth ${layoutMeta.effectiveDepth} instead.`}
          </span>
          {!override && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOverride(true)}>
              Load full anyway
            </button>
          )}
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={(_, node) => setHoveredNode(node.id)}
        onNodeMouseLeave={() => setHoveredNode(null)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ duration: 500, padding: 0.3, maxZoom: 1.1 }}
        attributionPosition="bottom-right"
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: false }}
      >
        <Background color="rgba(255,255,255,0.04)" gap={20} size={1} />
      </ReactFlow>
    </>
  );
};

/** Default state — nothing focused yet. Never an empty canvas: surfaces
 *  the highest-risk files as one-click shortcuts, computed once already by
 *  insightsEngine (sickestModules), so opening Architecture always answers
 *  "where should I start?" without requiring any interaction first. */
const FocusPrompt: React.FC<{
  shortcuts: { path: string; healthScore: number }[];
  onSelect: (path: string) => void;
}> = ({ shortcuts, onSelect }) => (
  <div className="architecture-canvas-status architecture-focus-prompt">
    <Compass size={22} style={{ opacity: 0.35 }} />
    <p className="architecture-prompt-title">Select a file or folder to explore its dependencies.</p>
    {shortcuts.length > 0 && (
      <div className="architecture-prompt-shortcuts">
        <span className="field-label" style={{ marginBottom: 'var(--space-1)' }}>
          <ShieldAlert size={10} /> Highest-risk files
        </span>
        {shortcuts.map(s => (
          <button key={s.path} type="button" className="architecture-prompt-shortcut" onClick={() => onSelect(s.path)}>
            <span className="architecture-prompt-shortcut-name">{s.path.split('/').pop()}</span>
            <span className="architecture-prompt-shortcut-health" style={{ color: s.healthScore < 40 ? 'var(--color-danger)' : 'var(--color-warning)' }}>
              {s.healthScore}
            </span>
          </button>
        ))}
      </div>
    )}
  </div>
);

const FlowWrapper: React.FC<{ externalHighlight?: string | null; isActive: boolean }> = ({ externalHighlight, isActive }) => {
  const {
    dependencies, files, git, insights, setActiveFile, clearGraphHighlight,
    architectureFocusId, setArchitectureFocusId, architectureDepth, setArchitectureDepth,
  } = useRepositoryStore(
    useShallow(s => ({
      dependencies: s.dependencies,
      files: s.files,
      git: s.git,
      insights: s.insights,
      setActiveFile: s.setActiveFile,
      clearGraphHighlight: s.clearGraphHighlight,
      architectureFocusId: s.architectureFocusId,
      setArchitectureFocusId: s.setArchitectureFocusId,
      architectureDepth: s.architectureDepth,
      setArchitectureDepth: s.setArchitectureDepth,
    })),
  );

  const isCompact = useMediaQuery(`(max-width: ${BREAKPOINTS.tabletLandscape - 1}px)`);
  const [filters, setFilters] = usePersistedState<GraphFilters>('graphFilters', {
    showOrphans: true, showCycles: false, highlightHotspots: false, highlightCycles: true, fileTypeFilter: '',
  });
  const [treemapColorMode, setTreemapColorMode] = usePersistedState<TreemapColorMode>('architectureTreemapColorMode', 'health');
  const [canvasSelection, setCanvasSelection] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const cycleCursorRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setFilters(f => f.fileTypeFilter ? { ...f, fileTypeFilter: '' } : f);
  }, [dependencies, setFilters]);

  const nodeById = useMemo(() => {
    const m = new Map<string, GraphNode>();
    dependencies?.nodes.forEach(n => m.set(n.id, n));
    return m;
  }, [dependencies]);

  const centerIds = useMemo(() => {
    if (!architectureFocusId || !dependencies) return [];
    if (architectureFocusId.startsWith(FOLDER_PREFIX)) {
      const folder = architectureFocusId.slice(FOLDER_PREFIX.length);
      return dependencies.nodes.filter(n => getFolderPath(n.path) === folder).map(n => n.id);
    }
    return nodeById.has(architectureFocusId) ? [architectureFocusId] : [];
  }, [architectureFocusId, dependencies, nodeById]);

  const focusedFolder = useMemo(() => {
    if (!architectureFocusId) return null;
    if (architectureFocusId.startsWith(FOLDER_PREFIX)) return architectureFocusId.slice(FOLDER_PREFIX.length);
    return getFolderPath(nodeById.get(architectureFocusId)?.path ?? '');
  }, [architectureFocusId, nodeById]);

  // Global adjacency (full graph, not depth-limited) — what the Inspector's
  // "Imported By"/"Imports" lists and search/keyboard traversal need.
  const globalAdjacency = useMemo(() => {
    const forward = new Map<string, { target: string; edgeId: string }[]>();
    const reverse = new Map<string, { source: string; edgeId: string }[]>();
    dependencies?.edges.forEach(e => {
      const edgeId = `${e.sourceId}->${e.targetId}`;
      if (!forward.has(e.sourceId)) forward.set(e.sourceId, []);
      forward.get(e.sourceId)!.push({ target: e.targetId, edgeId });
      if (!reverse.has(e.targetId)) reverse.set(e.targetId, []);
      reverse.get(e.targetId)!.push({ source: e.sourceId, edgeId });
    });
    return { forward, reverse };
  }, [dependencies]);

  const { gitCommitMap, gitAuthorsMap, gitLastModifiedMap } = useMemo(() => {
    const commitMap = new Map<string, number>();
    const authorsMap = new Map<string, string[]>();
    const lastModMap = new Map<string, string>();
    const repoRoot = files.find(f => f.relativePath && f.path.endsWith(f.relativePath))
      ? files[0].path.slice(0, files[0].path.length - (files[0].relativePath?.length ?? 0) - 1)
      : '';
    if (git && repoRoot) {
      for (const commit of git.commits) {
        const dateStr = commit.timestamp ? commit.timestamp.split('T')[0] : null;
        for (const file of commit.filesChanged || []) {
          if (!file) continue;
          const absPath = `${repoRoot}/${file}`;
          commitMap.set(absPath, (commitMap.get(absPath) || 0) + 1);
          const authors = authorsMap.get(absPath) || [];
          if (commit.author && !authors.includes(commit.author)) { authors.push(commit.author); authorsMap.set(absPath, authors); }
          if (dateStr && !lastModMap.has(absPath)) lastModMap.set(absPath, dateStr);
        }
      }
    }
    return { gitCommitMap: commitMap, gitAuthorsMap: authorsMap, gitLastModifiedMap: lastModMap };
  }, [git, files]);

  const fileTypes = useMemo(() => {
    if (!dependencies) return [];
    const exts = new Set<string>();
    dependencies.nodes.forEach(n => { const ext = n.path?.split('.').pop(); if (ext && ext !== n.path) exts.add(`.${ext}`); });
    return Array.from(exts).sort();
  }, [dependencies]);

  const riskShortcuts = useMemo(
    () => (insights?.sickestModules ?? []).slice(0, 3).map(m => ({ path: m.id, healthScore: m.healthScore })),
    [insights],
  );

  // Reset the keyboard selection cursor whenever the rendered neighborhood
  // changes shape, defaulting to the (first) center node.
  useEffect(() => { setCanvasSelection(centerIds[0] ?? null); }, [centerIds.join(' ')]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenFile = useCallback((path: string) => {
    const fileModel = files.find(f => f.path === path);
    if (fileModel) setActiveFile(fileModel);
  }, [files, setActiveFile]);

  const handleFocusFile = useCallback((id: string) => {
    setArchitectureFocusId(id);
    setCanvasSelection(id);
  }, [setArchitectureFocusId]);

  const handleFocusFolder = useCallback((folderPath: string) => {
    setArchitectureFocusId(`${FOLDER_PREFIX}${folderPath}`);
    setIsInspectorOpen(false);
  }, [setArchitectureFocusId]);

  const handleSelectAndOpen = useCallback((id: string) => {
    handleFocusFile(id);
    setIsInspectorOpen(true);
  }, [handleFocusFile]);

  // ── External highlight (deep-link from Insights) ──────────────────────
  useEffect(() => {
    if (!externalHighlight || !dependencies) return;
    if (!nodeById.has(externalHighlight)) return;
    handleSelectAndOpen(externalHighlight);
    clearGraphHighlight();
  }, [externalHighlight, dependencies, nodeById, handleSelectAndOpen, clearGraphHighlight]);

  // ── Keyboard traversal ───────────────────────────────────────────────
  const handleCanvasKeyDown = (e: React.KeyboardEvent) => {
    if (!canvasSelection) return;
    const cycleNext = (candidates: string[]): string | undefined => {
      if (candidates.length === 0) return undefined;
      const cursor = (cycleCursorRef.current.get(canvasSelection) ?? -1) + 1;
      cycleCursorRef.current.set(canvasSelection, cursor % candidates.length);
      return candidates[cursor % candidates.length];
    };

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = cycleNext((globalAdjacency.forward.get(canvasSelection) ?? []).map(x => x.target));
      if (next) setCanvasSelection(next);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = cycleNext((globalAdjacency.reverse.get(canvasSelection) ?? []).map(x => x.source));
      if (next) setCanvasSelection(next);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) handleOpenFile(canvasSelection);
      else setIsInspectorOpen(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (isInspectorOpen) setIsInspectorOpen(false);
      else setArchitectureFocusId(null);
    }
  };

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isTyping = ['INPUT', 'TEXTAREA'].includes(target.tagName);

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.getElementById('architecture-search-input')?.focus();
      return;
    }
    if (isTyping) return;
    if (e.key === '1') setArchitectureDepth(1);
    else if (e.key === '2') setArchitectureDepth(2);
    else if (e.key === '3') setArchitectureDepth(3);
    else if (e.key === '4') setArchitectureDepth('all');
    else if (e.key === 'Escape' && !isInspectorOpen) setArchitectureFocusId(null);
  }, [setArchitectureDepth, setArchitectureFocusId, isInspectorOpen]);

  useEffect(() => {
    // Guarded by isActive: this view now stays mounted (hidden, not
    // unmounted) when another tab is selected, so without this check the
    // listener would keep intercepting global keystrokes meant for whatever
    // tab is actually visible.
    if (!isActive) return;
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown, isActive]);

  if (!dependencies) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 'var(--space-6)' }}>
        <div className="empty-state-icon" style={{ marginBottom: 0 }}>
          <Network size={24} style={{ opacity: 0.3 }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>No Dependency Graph</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Analyze a repository to build its AST graph.</p>
        </div>
      </div>
    );
  }

  const inspectorTarget = isInspectorOpen ? canvasSelection : null;

  return (
    <div className="architecture-layout">
      <ModuleTreemap
        dependencies={dependencies}
        packageMetrics={insights?.packageMetrics ?? []}
        colorMode={treemapColorMode}
        onColorModeChange={setTreemapColorMode}
        focusedFolder={focusedFolder}
        onSelectFolder={handleFocusFolder}
      />

      <div className="architecture-canvas-column">
        <ArchitectureToolbar
          files={dependencies.nodes}
          onSearch={handleSelectAndOpen}
          depth={architectureDepth}
          onDepthChange={setArchitectureDepth}
          filters={filters}
          onFiltersChange={setFilters}
          fileTypes={fileTypes}
        />
        <div
          ref={canvasWrapperRef}
          className="architecture-canvas-panel"
          tabIndex={0}
          role="application"
          aria-label="Dependency focus canvas"
          onKeyDown={handleCanvasKeyDown}
        >
          {centerIds.length === 0 ? (
            <FocusPrompt shortcuts={riskShortcuts} onSelect={handleSelectAndOpen} />
          ) : (
            <FocusCanvas
              centerIds={centerIds}
              filters={filters}
              canvasSelection={canvasSelection}
              onOpenInspector={id => { setCanvasSelection(id); setIsInspectorOpen(true); }}
              onRecenter={handleFocusFile}
            />
          )}
        </div>
      </div>

      {!isCompact && (
        <div className={`architecture-inspector-column${inspectorTarget ? ' open' : ''}`}>
          {inspectorTarget && (
            <NodeInspector
              path={inspectorTarget}
              sizeBytes={files.find(f => f.path === inspectorTarget)?.size ?? 0}
              onClose={() => setIsInspectorOpen(false)}
              onOpen={handleOpenFile}
              moduleMetrics={insights?.moduleMetrics || new Map()}
              adjacency={globalAdjacency}
              gitCommitMap={gitCommitMap}
              gitAuthorsMap={gitAuthorsMap}
              gitLastModifiedMap={gitLastModifiedMap}
              isPinned={canvasSelection === inspectorTarget}
              onTogglePin={() => setCanvasSelection(inspectorTarget)}
            />
          )}
        </div>
      )}

      {isCompact && inspectorTarget && (
        <>
          <div className="graph-inspector-backdrop" onClick={() => setIsInspectorOpen(false)} aria-hidden="true" />
          <div className="architecture-inspector-overlay">
            <NodeInspector
              path={inspectorTarget}
              sizeBytes={files.find(f => f.path === inspectorTarget)?.size ?? 0}
              onClose={() => setIsInspectorOpen(false)}
              onOpen={handleOpenFile}
              moduleMetrics={insights?.moduleMetrics || new Map()}
              adjacency={globalAdjacency}
              gitCommitMap={gitCommitMap}
              gitAuthorsMap={gitAuthorsMap}
              gitLastModifiedMap={gitLastModifiedMap}
              isPinned={canvasSelection === inspectorTarget}
              onTogglePin={() => setCanvasSelection(inspectorTarget)}
            />
          </div>
        </>
      )}
    </div>
  );
};

export const DependencyGraphView: React.FC<{ externalHighlight?: string | null; isActive?: boolean }> = ({ externalHighlight, isActive = true }) => {
  return (
    <div id="architecture-graph-container" style={{ height: '100%', width: '100%', backgroundColor: 'var(--bg-app)', position: 'relative' }}>
      <ReactFlowProvider>
        <FlowWrapper externalHighlight={externalHighlight} isActive={isActive} />
      </ReactFlowProvider>
    </div>
  );
};
