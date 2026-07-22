import React, { useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Panel
} from '@xyflow/react';
import type { Node, Edge, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { useShallow } from 'zustand/react/shallow';
import { getGitDagreLayout } from './layoutUtils';
import { CommitNode } from './CommitNode';
import type { CommitNodeData } from './CommitNode';
import { Search, ZoomIn, ZoomOut, Maximize, GitBranch, Filter, X, Users, ChevronDown } from 'lucide-react';
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

const nodeTypes = { commitNode: CommitNodeWrapper };

/**
 * Upper bound on commits rendered as graph nodes. Git history can run into
 * the tens of thousands; laying out and mounting that many 300x80px DOM
 * nodes with dagre freezes the tab well before it becomes readable anyway.
 * The backend already caps analysis at DEFAULT_MAX_COMMITS (20,000); this
 * caps what's actually drawn, since even a few thousand nodes is unusable.
 */
const MAX_RENDERED_COMMITS = 500;

/* ── Git Toolbar ──────────────────────────────────────────────────── */
const GitToolbar = ({
  nodes,
  onSearch,
  authors,
  selectedAuthor,
  onAuthorChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: {
  nodes: Node[];
  onSearch: (id: string) => void;
  authors: string[];
  selectedAuthor: string;
  onAuthorChange: (a: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (d: string) => void;
  onDateToChange: (d: string) => void;
}) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = nodes.find(n =>
      n.id.toLowerCase().includes(query.toLowerCase()) ||
      ((n.data.message as string) || '').toLowerCase().includes(query.toLowerCase())
    );
    if (found) onSearch(found.id);
  };

  const iconBtn = (onClick: () => void, icon: React.ReactNode, label: string, active = false) => (
    <button type="button" onClick={onClick} title={label} aria-label={label} className="btn-icon btn-icon-md" style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}>
      {icon}
    </button>
  );

  const hasActiveFilters = selectedAuthor !== '' || dateFrom !== '' || dateTo !== '';

  return (
    <Panel position="top-right" style={{ margin: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div className="graph-toolbar">
        <form onSubmit={handleSearch} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={13} style={{ position: 'absolute', left: 8, color: focused ? 'var(--accent)' : 'var(--text-tertiary)', transition: 'color var(--duration-fast)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Search commits…" value={query} onChange={e => setQuery(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} aria-label="Search git commits" className="graph-search-input" />
        </form>
        <div style={{ width: 1, height: 20, background: 'var(--border-default)' }} />
        {iconBtn(() => zoomIn({ duration: 800 }), <ZoomIn size={15} />, 'Zoom in')}
        {iconBtn(() => zoomOut({ duration: 800 }), <ZoomOut size={15} />, 'Zoom out')}
        {iconBtn(() => fitView({ duration: 800 }), <Maximize size={15} />, 'Fit view')}
        <div style={{ width: 1, height: 20, background: 'var(--border-default)' }} />
        <div style={{ position: 'relative' }}>
          {iconBtn(() => setFilterOpen(v => !v), <Filter size={15} />, 'Filters', filterOpen || hasActiveFilters)}
          {hasActiveFilters && (
            <div style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
          )}
        </div>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div style={{
          background: 'var(--bg-panel)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)',
          padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
          minWidth: 240, animation: 'slide-up var(--duration-fast) var(--ease-default)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>Git Filters</span>
            {hasActiveFilters && (
              <button type="button" onClick={() => { onAuthorChange(''); onDateFromChange(''); onDateToChange(''); }} style={{ fontSize: 'var(--text-2xs)', color: 'var(--accent)', background: 'transparent', cursor: 'pointer' }}>
                Clear all
              </button>
            )}
          </div>

          {/* Author filter */}
          {authors.length > 0 && (
            <div>
              <label style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 'var(--space-2)' }}>
                <Users size={10} /> Author
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedAuthor}
                  onChange={e => onAuthorChange(e.target.value)}
                  style={{
                    width: '100%', padding: 'var(--space-2) var(--space-3)',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                    fontSize: 'var(--text-xs)', cursor: 'pointer', appearance: 'none', paddingRight: 'var(--space-8)',
                  }}
                >
                  <option value="">All authors</option>
                  {authors.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
              </div>
              {selectedAuthor && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: hashAuthor(selectedAuthor) }} />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{selectedAuthor}</span>
                </div>
              )}
            </div>
          )}

          {/* Date range */}
          <div>
            <label style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 'var(--space-2)' }}>
              Date Range
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', minWidth: 24 }}>From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => onDateFromChange(e.target.value)}
                  style={{ flex: 1, padding: '3px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', minWidth: 24 }}>To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => onDateToChange(e.target.value)}
                  style={{ flex: 1, padding: '3px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
};

/* ── Flow wrapper ──────────────────────────────────────────────────── */
const FlowWrapper: React.FC = () => {
  const git = useRepositoryStore(s => s.git);
  const { setCenter } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Filter state
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  // Rebuild layout when the rendered commit set changes
  useEffect(() => {
    if (renderedCommits.length > 0) {
      const { nodes: ln, edges: le } = getGitDagreLayout({ commits: renderedCommits }, 'TB');
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
  }, [renderedCommits, setNodes, setEdges]);

  // BFS highlight
  useEffect(() => {
    if (!hoveredNode) {
      setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, dimmed: false } })));
      setEdges(eds => eds.map(e => ({
        ...e,
        animated: false,
        style: { stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1.5, opacity: 1 },
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
      return {
        ...e,
        animated: isConnected,
        style: {
          stroke: isConnected ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
          strokeWidth: isConnected ? 2.5 : 1,
          opacity: isConnected ? 1 : 0.08,
          transition: 'all 250ms ease',
        },
      };
    }));
  }, [hoveredNode, renderedCommits, setNodes, setEdges]);

  const handleSearchFocus = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setCenter(node.position.x + 150, node.position.y + 40, { zoom: 1.2, duration: 800 });
      setHoveredNode(nodeId);
    }
  };

  if (!git) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 'var(--space-6)' }}>
        <div style={{ width: 56, height: 56, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-2xl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          zIndex: 10, display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
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
        onPaneClick={() => setHoveredNode(null)}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ duration: 800 }}
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
