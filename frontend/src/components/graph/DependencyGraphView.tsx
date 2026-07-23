import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { useShallow } from 'zustand/react/shallow';
import { useMediaQuery, BREAKPOINTS } from '../../hooks/useMediaQuery';
import { usePersistedState } from '../../hooks/usePersistedState';
import type { DagreLayoutRequest, DagreLayoutResponse } from './dagreLayout.worker';
import { FileNode } from './FileNode';
import { FolderNode } from './FolderNode';
import { CustomEdge } from './CustomEdge';
import { getFolderPath } from './layoutUtils';
import { deriveRepoRoot } from '../../lib/insightsEngine';
import { ArchitectureToolbar } from './ArchitectureToolbar';
import type { GraphFilters } from './ArchitectureToolbar';
import { NodeInspector } from './NodeInspector';
import { Network, Loader2 } from 'lucide-react';

const nodeTypes = {
  fileNode: FileNode,
  folderNode: FolderNode
};

const edgeTypes = {
  custom: CustomEdge
};

// ─── Flow Wrapper ──────────────────────────────────────────────────────────────

const FlowWrapper: React.FC<{
  externalHighlight?: string | null;
}> = ({ externalHighlight }) => {
  const {
    dependencies, files, git, insights, setActiveFile, clearGraphHighlight,
    architectureCollapsedFolders, setArchitectureCollapsedFolders,
    architecturePinnedNodeId, setArchitecturePinnedNodeId,
  } = useRepositoryStore(
      useShallow(s => ({
        dependencies: s.dependencies,
        files: s.files,
        git: s.git,
        insights: s.insights,
        setActiveFile: s.setActiveFile,
        clearGraphHighlight: s.clearGraphHighlight,
        architectureCollapsedFolders: s.architectureCollapsedFolders,
        setArchitectureCollapsedFolders: s.setArchitectureCollapsedFolders,
        architecturePinnedNodeId: s.architecturePinnedNodeId,
        setArchitecturePinnedNodeId: s.setArchitecturePinnedNodeId,
      })),
    );
  const { setCenter } = useReactFlow();

  // Below the tablet-landscape breakpoint there isn't room to dock the Node
  // Inspector beside the toolbar, so it becomes a full-height overlay drawer
  // instead (see the .graph-inspector-backdrop below).
  const isCompact = useMediaQuery(`(max-width: ${BREAKPOINTS.tabletLandscape - 1}px)`);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  // Click-to-pin: persists the focus/dim highlight after the mouse leaves
  // the node, so you can actually read what you just highlighted instead of
  // it vanishing the instant you move toward the Inspector. Hovering a
  // *different* node still gives a temporary preview (see the highlight
  // effect below); un-hovering reverts to whatever's pinned. The pinned id
  // itself lives in the store (see architecturePinnedNodeId) so it survives
  // switching tabs; selectedNode stays local (it's a full React Flow Node
  // object, recomputed on every layout, not something worth storing globally)
  // and is re-derived from the pinned id once nodes repopulate after a remount.
  const pinnedNode = architecturePinnedNodeId;
  const setPinnedNode = setArchitecturePinnedNodeId;
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  // The four toggles are durable preferences (persisted across sessions);
  // fileTypeFilter is reset per-analysis below since a leftover '.rs' filter
  // silently hiding every file in a newly-opened JS repo would be confusing.
  const [filters, setFilters] = usePersistedState<GraphFilters>('graphFilters', {
    showOrphans: true,
    showCycles: false,
    highlightHotspots: false,
    highlightCycles: true,
    fileTypeFilter: '',
  });

  useEffect(() => {
    setFilters(f => f.fileTypeFilter ? { ...f, fileTypeFilter: '' } : f);
  }, [dependencies, setFilters]);

  // ── Folder collapse state — every folder starts collapsed on a genuinely
  // new dataset (the single highest-leverage fix for "the graph is
  // overwhelming": most repos have far more files than folders). Expanding
  // is an explicit per-folder click, not persisted across analyses since the
  // folder set is repo-specific.
  const allFolderIds = useMemo(() => {
    if (!dependencies) return new Set<string>();
    const allFolders = new Set<string>();
    for (const n of dependencies.nodes) {
      const folder = getFolderPath(n.path);
      if (folder) allFolders.add(folder);
    }
    return allFolders;
  }, [dependencies]);

  // Seeds the store's collapse set to "all collapsed" exactly once per
  // dataset (architectureCollapsedFolders is reset to null by analyze()/
  // loadSessionIntoStore()). Guarding on `!== null` — rather than reseeding
  // on every `allFolderIds` identity change — is what makes this survive a
  // tab switch: the previous local-state version reseeded on every remount
  // because the memo it depended on was recreated fresh each time.
  useEffect(() => {
    if (!dependencies || architectureCollapsedFolders !== null) return;
    setArchitectureCollapsedFolders(new Set(allFolderIds));
  }, [dependencies, architectureCollapsedFolders, allFolderIds, setArchitectureCollapsedFolders]);

  const collapsedFolders = architectureCollapsedFolders ?? allFolderIds;
  const handleCollapseAll = useCallback(
    () => setArchitectureCollapsedFolders(new Set(allFolderIds)),
    [allFolderIds, setArchitectureCollapsedFolders],
  );
  const handleExpandAll = useCallback(
    () => setArchitectureCollapsedFolders(new Set()),
    [setArchitectureCollapsedFolders],
  );

  // ── O(1) lookups, built once per dataset ───────────────────────────────────
  const fileSizeMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of files) m.set(f.path, f.size);
    return m;
  }, [files]);

  // ── Build git data lookup maps from raw git data ───────────────────────────
  // Git paths are repo-relative while node ids are absolute, so all maps are
  // keyed by absolute path (joined via the repo root). Keying by basename
  // caused every `index.ts` in the repo to share one entry.
  const { gitCommitMap, gitAuthorsMap, gitLastModifiedMap } = useMemo(() => {
    const commitMap = new Map<string, number>();
    const authorsMap = new Map<string, string[]>();
    const lastModMap = new Map<string, string>();
    const repoRoot = deriveRepoRoot(files);

    if (git && repoRoot) {
      for (const commit of git.commits) {
        const dateStr = commit.timestamp ? commit.timestamp.split('T')[0] : null;

        for (const file of commit.filesChanged || []) {
          if (!file) continue;
          const absPath = `${repoRoot}/${file}`;

          // Commit count
          commitMap.set(absPath, (commitMap.get(absPath) || 0) + 1);

          // Authors
          const authors = authorsMap.get(absPath) || [];
          if (commit.author && !authors.includes(commit.author)) {
            authors.push(commit.author);
            authorsMap.set(absPath, authors);
          }

          // Last modified (commits are sorted newest first)
          if (dateStr && !lastModMap.has(absPath)) {
            lastModMap.set(absPath, dateStr);
          }
        }
      }
    }
    return { gitCommitMap: commitMap, gitAuthorsMap: authorsMap, gitLastModifiedMap: lastModMap };
  }, [git, files]);

  // ── Collect unique file types for filter dropdown ─────────────────────────
  const fileTypes = useMemo(() => {
    if (!dependencies) return [];
    const exts = new Set<string>();
    dependencies.nodes.forEach(n => {
      const ext = n.path?.split('.').pop();
      if (ext && ext !== n.path) exts.add(`.${ext}`);
    });
    return Array.from(exts).sort();
  }, [dependencies]);

  // ── Raw layout (recomputed only when dependencies change) ─────────────────
  // Dagre's layout pass runs in a Web Worker instead of blocking the main
  // thread — on repos with a few thousand files this was a noticeable
  // freeze (see README's Performance Notes). The requestId guards against a
  // slower, now-stale response from a previous dataset overwriting a newer
  // one if `dependencies` changes again before the worker replies.
  const [rawNodes, setRawNodes] = useState<Node[]>([]);
  const [rawEdges, setRawEdges] = useState<Edge[]>([]);
  const [isLayouting, setIsLayouting] = useState(false);
  const layoutWorkerRef = useRef<Worker | null>(null);
  const layoutRequestIdRef = useRef(0);

  useEffect(() => {
    if (!dependencies) {
      setRawNodes([]);
      setRawEdges([]);
      return;
    }

    if (!layoutWorkerRef.current) {
      layoutWorkerRef.current = new Worker(
        new URL('./dagreLayout.worker.ts', import.meta.url),
        { type: 'module' },
      );
    }
    const worker = layoutWorkerRef.current;
    const requestId = ++layoutRequestIdRef.current;
    setIsLayouting(true);

    const handleMessage = (e: MessageEvent<DagreLayoutResponse>) => {
      if (e.data.requestId !== layoutRequestIdRef.current) return;
      setRawNodes(e.data.nodes);
      setRawEdges(e.data.edges);
      setIsLayouting(false);
    };
    worker.addEventListener('message', handleMessage);
    worker.postMessage({
      requestId,
      data: dependencies,
      direction: 'LR',
      collapsedFolders: Array.from(architectureCollapsedFolders ?? allFolderIds),
    } satisfies DagreLayoutRequest);

    return () => worker.removeEventListener('message', handleMessage);
    // Re-requests layout whenever collapse state changes too, not just on a
    // new dataset — expanding/collapsing a folder is a real layout change
    // (dagre needs to reserve different space), not just a style toggle.
    // Depends on architectureCollapsedFolders (the store value) rather than
    // the derived `collapsedFolders` so this doesn't re-fire on the one
    // extra render the seeding effect above causes.
  }, [dependencies, architectureCollapsedFolders, allFolderIds]);

  // Terminate the worker only when the view itself unmounts, not on every
  // dependency change — it's reused across layout requests. Must null out
  // the ref after terminating: React StrictMode (enabled in main.tsx) mounts
  // every component twice in development — mount, cleanup, mount again — and
  // without this, the second mount would see a non-null ref pointing at an
  // already-terminated worker, silently skip creating a new one, and post
  // messages into the void forever (the graph would never leave "Laying out
  // graph…" the first time the Architecture tab opens in `npm run dev`).
  useEffect(() => () => {
    layoutWorkerRef.current?.terminate();
    layoutWorkerRef.current = null;
  }, []);

  /**
   * Adjacency indexes for hover highlighting, built from the worker's
   * already-resolved edges (rawEdges) rather than the raw dependency data —
   * that's what makes hovering a node correctly highlight a collapsed
   * folder standing in for a hidden dependency, instead of only ever
   * matching individual (possibly-hidden) file ids. O(V+E) to build; O(V+E)
   * per hover traversal instead of an O(V·E) rescan.
   */
  const adjacency = useMemo(() => {
    const forward = new Map<string, { target: string; edgeId: string }[]>();
    const reverse = new Map<string, { source: string; edgeId: string }[]>();
    for (const e of rawEdges) {
      if (!forward.has(e.source)) forward.set(e.source, []);
      forward.get(e.source)!.push({ target: e.target, edgeId: e.id });
      if (!reverse.has(e.target)) reverse.set(e.target, []);
      reverse.get(e.target)!.push({ source: e.source, edgeId: e.id });
    }
    return { forward, reverse };
  }, [rawEdges]);

  // ── Apply insight overlays + filters ─────────────────────────────────────
  useEffect(() => {
    if (rawNodes.length === 0) return;

    const cycleIds = insights?.cycleNodeIds || new Set<string>();
    const hotspotIds = insights?.hotspotNodeIds || new Set<string>();
    const orphanSet = new Set(insights?.orphanFiles || []);

    const processedNodes = rawNodes
      .filter(n => {
        if (n.type === 'folderNode') return true;
        const path = n.data.path as string;

        // File type filter
        if (filters.fileTypeFilter) {
          const ext = path?.split('.').pop();
          if (ext && `.${ext}` !== filters.fileTypeFilter) return false;
        }

        // Orphan filter
        if (!filters.showOrphans && orphanSet.has(path)) return false;

        // Cycles-only filter
        if (filters.showCycles && !cycleIds.has(path)) return false;

        return true;
      })
      .map(n => {
        if (n.type === 'folderNode') return n;
        const path = n.data.path as string;
        const metrics = insights?.moduleMetrics.get(path);
        const isHotspot = filters.highlightHotspots && hotspotIds.has(path);
        const isCycle = filters.highlightCycles && cycleIds.has(path);

        return {
          ...n,
          data: {
            ...n.data,
            inDegree: metrics?.fanIn ?? n.data.inDegree ?? 0,
            outDegree: metrics?.fanOut ?? n.data.outDegree ?? 0,
            size: fileSizeMap.get(path) ?? 0,
            isHotspot,
            isCycle,
            dimmed: false,
          },
        };
      });

    setNodes(processedNodes);
    setEdges(rawEdges);
  }, [rawNodes, rawEdges, insights, filters, fileSizeMap, setNodes, setEdges]);

  // ── Re-open the Inspector after a remount ──────────────────────────────────
  // architecturePinnedNodeId survives switching tabs (it lives in the store);
  // selectedNode is local and starts null on every fresh mount. Once nodes
  // repopulate, restore the Inspector for whatever was pinned before, instead
  // of leaving the pin "active" with no visible panel.
  useEffect(() => {
    if (!architecturePinnedNodeId || selectedNode) return;
    const node = nodes.find(n => n.id === architecturePinnedNodeId);
    if (node && node.type !== 'folderNode') setSelectedNode(node);
  }, [architecturePinnedNodeId, nodes, selectedNode]);

  // ── Hover/pin highlight (transitive dependency closure) ───────────────────
  // Traverses the memoized adjacency index (O(V+E)) and preserves object
  // identity for untouched nodes/edges so React.memo skips their re-render.
  // Hovering takes precedence when active (a temporary preview); with
  // nothing hovered it falls back to whatever's pinned via click, so the
  // highlight survives the mouse actually leaving the node.
  const focusNode = hoveredNode ?? pinnedNode;
  useEffect(() => {
    if (!focusNode) {
      setNodes(nds => nds.map(n =>
        n.data.dimmed === false ? n : { ...n, data: { ...n.data, dimmed: false } },
      ));
      setEdges(eds => eds.map(e => {
        const d = e.data as { isIncoming?: boolean; isOutgoing?: boolean; isDimmed?: boolean } | undefined;
        if (!d?.isIncoming && !d?.isOutgoing && !d?.isDimmed) return e;
        return { ...e, data: { ...e.data, isIncoming: false, isOutgoing: false, isDimmed: false } };
      }));
      return;
    }

    // Iterative DFS over the prebuilt adjacency lists in each direction.
    const walk = (
      start: string,
      next: (id: string) => { other: string; edgeId: string }[],
    ): { nodes: Set<string>; edges: Set<string> } => {
      const seen = new Set<string>([start]);
      const edgeIds = new Set<string>();
      const stack = [start];
      while (stack.length > 0) {
        const id = stack.pop()!;
        for (const { other, edgeId } of next(id)) {
          edgeIds.add(edgeId);
          if (!seen.has(other)) {
            seen.add(other);
            stack.push(other);
          }
        }
      }
      return { nodes: seen, edges: edgeIds };
    };

    const downstream = walk(focusNode, id =>
      (adjacency.forward.get(id) ?? []).map(e => ({ other: e.target, edgeId: e.edgeId })));
    const upstream = walk(focusNode, id =>
      (adjacency.reverse.get(id) ?? []).map(e => ({ other: e.source, edgeId: e.edgeId })));

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
  }, [focusNode, adjacency, setNodes, setEdges]);

  // ── External highlight (from Insights navigation) ────────────────────────
  // Re-runs when nodes populate so navigation works even while this lazy view
  // is still mounting; the highlight is cleared only once actually consumed.
  useEffect(() => {
    if (!externalHighlight || nodes.length === 0) return;
    const found = nodes.some(n => n.id === externalHighlight);
    if (found) {
      handleSearchFocus(externalHighlight);
      clearGraphHighlight();
      return;
    }
    // Not currently visible — most likely hidden inside a collapsed folder
    // (Insights/Code Viewer navigate by absolute file path, which folder
    // collapse can hide entirely). Expand it; this effect re-fires once the
    // resulting re-layout makes the node appear, and the branch above then
    // focuses it normally.
    const folder = getFolderPath(externalHighlight);
    if (folder && collapsedFolders.has(folder)) {
      const next = new Set(collapsedFolders);
      next.delete(folder);
      setArchitectureCollapsedFolders(next);
    }
  }, [externalHighlight, nodes]); // eslint-disable-line

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'folderNode') {
      const folderId = node.id;
      // Reads the live store value rather than closing over `collapsedFolders`
      // so this callback doesn't need it in its dependency array (which would
      // otherwise recreate onNodeClick, and therefore ReactFlow's prop, on
      // every single folder toggle).
      const current = useRepositoryStore.getState().architectureCollapsedFolders ?? new Set<string>();
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId); else next.add(folderId);
      setArchitectureCollapsedFolders(next);
      return;
    }
    setSelectedNode(node);
    setPinnedNode(node.id);
  }, [setArchitectureCollapsedFolders, setPinnedNode]);

  const handleOpenFile = (path: string) => {
    const fileModel = files.find(f => f.path === path);
    if (fileModel) setActiveFile(fileModel);
  };

  const handleSearchFocus = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      let absoluteX = node.position.x;
      let absoluteY = node.position.y;
      if (node.parentId) {
        const parent = nodes.find(p => p.id === node.parentId);
        if (parent) {
          absoluteX += parent.position.x;
          absoluteY += parent.position.y;
        }
      }
      setCenter(absoluteX + 125, absoluteY + 40, { zoom: 1.2, duration: 800 });
      setPinnedNode(nodeId);
      if (node.type !== 'folderNode') setSelectedNode(node);
    }
  };

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

  // The worker's layout pass hasn't resolved yet for this dataset — shown
  // instead of an empty canvas, since large graphs can take a moment.
  if (isLayouting && nodes.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 'var(--space-4)' }}>
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>Laying out graph…</span>
      </div>
    );
  }

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={(_, node) => setHoveredNode(node.id)}
        onNodeMouseLeave={() => setHoveredNode(null)}
        onPaneClick={() => { setHoveredNode(null); setSelectedNode(null); setPinnedNode(null); }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        // Bounded, not fit-all: the previous unconditional fitView would zoom
        // out as far as needed to fit the entire graph, which on a few
        // hundred files put every label below legible size before the user
        // had done anything. Folder-collapse (defaulting to all-collapsed)
        // already shrinks what's on screen; this caps how far the *initial*
        // fit can still zoom out on top of that. Manual zoom-out (minZoom
        // below) remains unrestricted for anyone who wants the full picture.
        fitViewOptions={{ duration: 800, minZoom: 0.5 }}
        attributionPosition="bottom-right"
        minZoom={0.05}
        maxZoom={2}
      >
        <Background color="rgba(255,255,255,0.04)" gap={20} size={1} />
        <ArchitectureToolbar
          nodes={nodes}
          onSearch={handleSearchFocus}
          filters={filters}
          onFiltersChange={setFilters}
          fileTypes={fileTypes}
          shiftLeftFor={!isCompact && selectedNode ? 'calc(var(--inspector-width) + var(--space-4))' : undefined}
          onCollapseAll={handleCollapseAll}
          onExpandAll={handleExpandAll}
        />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'folderNode') return 'transparent';
            const path = n.data?.path as string;
            if (insights?.cycleNodeIds.has(path)) return 'var(--color-danger)';
            if (insights?.hotspotNodeIds.has(path)) return '#f59e0b';
            if (n.data?.type === 'TypeScript') return '#3178c6';
            if (n.data?.type === 'JavaScript') return '#f7df1e';
            return 'var(--border-focus)';
          }}
          nodeStrokeColor={(n) => n.type === 'folderNode' ? 'var(--border-focus)' : 'transparent'}
          nodeStrokeWidth={3}
          maskColor="rgba(0, 0, 0, 0.7)"
          style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: '8px' }}
        />
      </ReactFlow>

      {selectedNode && (
        <>
          {isCompact && (
            <div
              className="graph-inspector-backdrop"
              onClick={() => setSelectedNode(null)}
              aria-hidden="true"
            />
          )}
          <NodeInspector
            node={selectedNode}
            onClose={() => { setSelectedNode(null); if (pinnedNode === selectedNode.id) setPinnedNode(null); }}
            onOpen={handleOpenFile}
            moduleMetrics={insights?.moduleMetrics || new Map()}
            adjacency={adjacency}
            gitCommitMap={gitCommitMap}
            gitAuthorsMap={gitAuthorsMap}
            gitLastModifiedMap={gitLastModifiedMap}
            isPinned={pinnedNode === selectedNode.id}
            onTogglePin={() => setPinnedNode(pinnedNode === selectedNode.id ? null : selectedNode.id)}
          />
        </>
      )}
    </>
  );
};

// ─── Export ────────────────────────────────────────────────────────────────────

export const DependencyGraphView: React.FC<{
  externalHighlight?: string | null;
}> = ({ externalHighlight }) => {
  return (
    <div id="architecture-graph-container" style={{ height: '100%', width: '100%', backgroundColor: 'var(--bg-app)', position: 'relative' }}>
      <ReactFlowProvider>
        <FlowWrapper externalHighlight={externalHighlight} />
      </ReactFlowProvider>
    </div>
  );
};
