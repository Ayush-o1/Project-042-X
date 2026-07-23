import React, { useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react';
import type { Node, Edge, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { useShallow } from 'zustand/react/shallow';
import { getGitDagreLayout } from './layoutUtils';
import { CommitNode } from './CommitNode';
import type { CommitNodeData } from './CommitNode';
import { DayGroupNode } from './DayGroupNode';
import { GitToolbar } from './GitToolbar';
import { GitBranch, X } from 'lucide-react';
import { hashAuthor } from '../../lib/authorColors';

// Extended CommitNode wrapper so we can pass onOpenFile
const CommitNodeWrapper = (props: NodeProps<Node<CommitNodeData>>) => {
  const { setActiveFile, files } = useRepositoryStore(
    useShallow(s => ({ setActiveFile: s.setActiveFile, files: s.files })),
  );
  const handleOpenFile = (relativePath: string) => {
    // Try to match relative path against absolute file paths
    const fileModel = files.find(f => f.path.endsWith(relativePath) || f.name === relativePath.split('/').pop());
    if (fileModel) setActiveFile(fileModel);
  };
  return <CommitNode {...props} onOpenFile={handleOpenFile} />;
};

const nodeTypes = { commitNode: CommitNodeWrapper, dayGroupNode: DayGroupNode };

/**
 * Upper bound on commits rendered as graph nodes. Git history can run into
 * the tens of thousands; laying out and mounting that many 300x80px DOM
 * nodes with dagre freezes the tab well before it becomes readable anyway.
 * The backend already caps analysis at DEFAULT_MAX_COMMITS (20,000); this
 * caps what's actually drawn, since even a few thousand nodes is unusable.
 */
const MAX_RENDERED_COMMITS = 500;

/* ── Flow wrapper ──────────────────────────────────────────────────── */
const FlowWrapper: React.FC = () => {
  const {
    git, groupByDay, setGroupByDay, collapsedDays, setCollapsedDays,
  } = useRepositoryStore(
    useShallow(s => ({
      git: s.git,
      groupByDay: s.gitGroupByDay,
      setGroupByDay: s.setGitGroupByDay,
      collapsedDays: s.gitCollapsedDays,
      setCollapsedDays: s.setGitCollapsedDays,
    })),
  );
  const { setCenter } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Filter state
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Day grouping — off by default; individual commits are already fine for
  // small/medium histories, so this is an opt-in density reducer rather than
  // the default view (unlike Architecture's folder collapse, which defaults
  // to collapsed since that's uncontroversially better for any repo with
  // folders). Lives in the store (not local state) so toggling it on, then
  // checking another tab, doesn't silently turn it back off.

  // All unique authors
  const authors = useMemo(() => {
    if (!git) return [];
    const authorSet = new Set<string>();
    git.commits.forEach(c => { if (c.author) authorSet.add(c.author); });
    return Array.from(authorSet).sort();
  }, [git]);

  // Filtered commits (git.commits is already newest-first from the backend)
  const filteredCommits = useMemo(() => {
    if (!git) return [];
    return git.commits.filter(c => {
      if (selectedAuthor && c.author !== selectedAuthor) return false;
      if (dateFrom || dateTo) {
        if (c.timestamp) {
          const commitDate = c.timestamp.split('T')[0];
          if (dateFrom && commitDate < dateFrom) return false;
          if (dateTo && commitDate > dateTo) return false;
        }
      }
      return true;
    });
  }, [git, selectedAuthor, dateFrom, dateTo]);

  // Commits actually drawn — capped to keep dagre layout and DOM mounting fast
  const renderedCommits = useMemo(
    () => filteredCommits.slice(0, MAX_RENDERED_COMMITS),
    [filteredCommits],
  );
  const isCapped = filteredCommits.length > renderedCommits.length;

  // Toggling day grouping on collapses every day; toggling it off restores
  // every individual commit. Clicking a single day-group node afterward
  // expands just that day (see onNodeClick below).
  const toggleGroupByDay = () => {
    const next = !groupByDay;
    setGroupByDay(next);
    if (next) {
      const days = new Set(renderedCommits.map(c => c.timestamp?.split('T')[0] || 'unknown'));
      setCollapsedDays(days);
    } else {
      setCollapsedDays(new Set());
    }
  };

  // Rebuild layout when the rendered commit set changes
  useEffect(() => {
    if (renderedCommits.length > 0) {
      const { nodes: ln, edges: le } = getGitDagreLayout({ commits: renderedCommits }, 'TB', groupByDay ? collapsedDays : undefined);
      const commitsByHash = new Map(renderedCommits.map(c => [c.hash, c]));
      // Inject author color and filesChanged into node data
      const enrichedNodes = ln.map(n => ({
        ...n,
        data: {
          ...n.data,
          authorColor: hashAuthor(n.data.author as string || ''),
          filesChanged: commitsByHash.get(n.id)?.filesChanged || [],
        },
      }));
      setNodes(enrichedNodes);
      setEdges(le);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [renderedCommits, groupByDay, collapsedDays, setNodes, setEdges]);

  // BFS highlight. Each edge's own branch-lane color (data.laneColor, set by
  // getGitDagreLayout) is the resting state instead of a flat gray — restored
  // here rather than baked into `style` permanently, since this effect
  // overwrites `style` wholesale on every hover change.
  useEffect(() => {
    if (!hoveredNode) {
      setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, dimmed: false } })));
      setEdges(eds => eds.map(e => ({
        ...e,
        animated: false,
        style: { stroke: (e.data as { laneColor?: string })?.laneColor ?? 'rgba(255,255,255,0.06)', strokeWidth: 1.5, opacity: 1 },
      })));
      return;
    }

    // Only rendered commits exist as nodes, so only those need scanning.
    const connected = new Set<string>([hoveredNode]);
    renderedCommits.forEach(commit => {
      if (commit.hash === hoveredNode) commit.parents.forEach(p => connected.add(p));
      if (commit.parents.includes(hoveredNode)) connected.add(commit.hash);
    });

    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, dimmed: !connected.has(n.id) && n.id !== hoveredNode },
    })));

    setEdges(eds => eds.map(e => {
      const isConnected = e.source === hoveredNode || e.target === hoveredNode;
      const laneColor = (e.data as { laneColor?: string })?.laneColor ?? 'rgba(255,255,255,0.06)';
      return {
        ...e,
        animated: isConnected,
        style: {
          stroke: isConnected ? 'var(--accent)' : laneColor,
          strokeWidth: isConnected ? 2.5 : 1,
          opacity: isConnected ? 1 : 0.15,
          transition: 'all 250ms ease',
        },
      };
    }));
  }, [hoveredNode, renderedCommits, setNodes, setEdges]);

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    if (node.type !== 'dayGroupNode') return;
    const dayKey = (node.data as { dayKey?: string }).dayKey;
    if (!dayKey) return;
    const next = new Set(collapsedDays);
    next.delete(dayKey);
    setCollapsedDays(next);
  };

  const handleSearchFocus = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setCenter(node.position.x + 150, node.position.y + 40, { zoom: 1.2, duration: 800 });
      setHoveredNode(nodeId);
    }
  };

  // git.commits is newest-first, so renderedCommits[0] is the latest commit —
  // unless it's inside a collapsed day, in which case its day-group node is
  // the closest thing to "latest" on screen.
  const handleJumpToLatest = () => {
    const latest = renderedCommits[0];
    if (!latest) return;
    const dayKey = latest.timestamp?.split('T')[0] || 'unknown';
    const targetId = groupByDay && collapsedDays.has(dayKey) ? `day:${dayKey}` : latest.hash;
    handleSearchFocus(targetId);
  };

  if (!git) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 'var(--space-6)' }}>
        <div className="empty-state-icon" style={{ marginBottom: 0 }}>
          <GitBranch size={24} style={{ opacity: 0.3 }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>No Git History</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Analyze a repository with a valid <code style={{ fontFamily: 'var(--font-mono)' }}>.git</code> directory.
          </p>
        </div>
      </div>
    );
  }

  const totalCount = git.commits.length;
  const hasFilters = Boolean(selectedAuthor || dateFrom || dateTo);

  return (
    <>
      {/* Status bar: active filters and/or the render cap */}
      {(hasFilters || isCapped) && (
        <div style={{
          position: 'absolute', top: 'var(--space-5)', left: 'var(--space-5)',
          maxWidth: 'calc(100vw - var(--space-10))',
          zIndex: 10, display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap',
          padding: 'var(--space-2) var(--space-4)',
          background: 'var(--bg-panel)', border: '1px solid var(--border-focus)',
          borderRadius: 'var(--radius-full)', boxShadow: 'var(--shadow-md)',
          animation: 'slide-up var(--duration-fast) var(--ease-default)',
        }}>
          {selectedAuthor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: hashAuthor(selectedAuthor) }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>{selectedAuthor}</span>
            </div>
          )}
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }} title={isCapped ? `Showing the ${MAX_RENDERED_COMMITS} most recent commits of ${filteredCommits.length} matching` : undefined}>
            {renderedCommits.length} of {totalCount} commits{isCapped ? ' (capped)' : ''}
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setSelectedAuthor(''); setDateFrom(''); setDateTo(''); }}
              style={{ color: 'var(--text-tertiary)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              aria-label="Clear filters"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={(_, node) => setHoveredNode(node.id)}
        onNodeMouseLeave={() => setHoveredNode(null)}
        onNodeClick={handleNodeClick}
        onPaneClick={() => setHoveredNode(null)}
        nodeTypes={nodeTypes}
        fitView
        // Bounded, not fit-all — see the identical rationale on the
        // Architecture graph's ReactFlow. A history of a few hundred commits
        // previously fit-to-window meant every commit card shrank well below
        // legible size; this caps how far the initial view zooms out.
        fitViewOptions={{ duration: 800, minZoom: 0.55 }}
        attributionPosition="bottom-right"
        minZoom={0.05}
        maxZoom={2}
      >
        <Background color="rgba(255,255,255,0.04)" gap={20} size={1} />
        <GitToolbar
          nodes={nodes}
          onSearch={handleSearchFocus}
          authors={authors}
          selectedAuthor={selectedAuthor}
          onAuthorChange={setSelectedAuthor}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          groupByDay={groupByDay}
          onToggleGroupByDay={toggleGroupByDay}
          onJumpToLatest={handleJumpToLatest}
        />
        <MiniMap
          nodeColor={n => {
            const author = n.data?.author as string || '';
            return author ? hashAuthor(author) : 'var(--accent)';
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
          style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)' }}
        />
      </ReactFlow>
    </>
  );
};

/* ── Export ────────────────────────────────────────────────────────── */
export const GitGraphView: React.FC = () => (
  <div style={{ height: '100%', width: '100%', backgroundColor: 'var(--bg-app)', position: 'relative' }}>
    <ReactFlowProvider>
      <FlowWrapper />
    </ReactFlowProvider>
  </div>
);
