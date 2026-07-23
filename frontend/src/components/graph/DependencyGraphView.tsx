import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
import type { ModuleMetrics } from '../../lib/insightsEngine';
import { fuzzyScore } from '../../lib/fuzzyMatch';
import {
  Search, ZoomIn, ZoomOut, Maximize, X, ExternalLink, FileCode,
  Network, AlertTriangle, Users, Clock, Filter,
  ChevronDown, GitCommit, ArrowUpRight, ArrowDownRight, Flame,
  ShieldAlert, EyeOff, CircleDot, Hash, Loader2, Pin,
  ChevronsDownUp, ChevronsUpDown
} from 'lucide-react';

const nodeTypes = {
  fileNode: FileNode,
  folderNode: FolderNode
};

const edgeTypes = {
  custom: CustomEdge
};

// ─── Filter State ──────────────────────────────────────────────────────────────

interface GraphFilters {
  showOrphans: boolean;
  showCycles: boolean;
  highlightHotspots: boolean;
  highlightCycles: boolean;
  fileTypeFilter: string; // '' = all, '.ts', '.js', etc.
}

// ─── Graph Toolbar ─────────────────────────────────────────────────────────────

const CustomToolbar = ({
  nodes,
  onSearch,
  filters,
  onFiltersChange,
  fileTypes,
  shiftLeftFor,
  onCollapseAll,
  onExpandAll,
}: {
  nodes: Node[];
  onSearch: (id: string) => void;
  filters: GraphFilters;
  onFiltersChange: (f: GraphFilters) => void;
  fileTypes: string[];
  /** Extra right margin (CSS length) so the toolbar/filter/legend column
   *  doesn't sit underneath the Node Inspector when both are open at once. */
  shiftLeftFor?: string;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);

  // Fuzzy-ranked results instead of a single blind jump to the first
  // substring match — same scoring the Command Palette and Sidebar filter
  // already use, so all three search entry points behave identically.
  const results = useMemo(() => {
    if (!query) return [];
    return nodes
      .filter(n => n.type === 'fileNode')
      .map(n => {
        const label = (n.data.label as string) || '';
        const path = (n.data.path as string) || '';
        const labelMatch = fuzzyScore(label, query);
        if (labelMatch !== null) return { node: n, score: labelMatch + 100 };
        const pathMatch = fuzzyScore(path, query);
        return pathMatch !== null ? { node: n, score: pathMatch } : null;
      })
      .filter((x): x is { node: Node; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(x => x.node);
  }, [nodes, query]);

  useEffect(() => { setActiveResultIndex(0); }, [query]);

  const selectResult = (node: Node) => {
    onSearch(node.id);
    setQuery('');
    setFocused(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (results[activeResultIndex]) selectResult(results[activeResultIndex]);
  };

  const iconBtn = (onClick: () => void, icon: React.ReactNode, label: string, active = false) => (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="btn-icon btn-icon-md"
      style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}
    >
      {icon}
    </button>
  );

  return (
    <Panel
      position="top-right"
      style={{
        margin: 'var(--space-5)',
        marginRight: shiftLeftFor ? `calc(var(--space-5) + ${shiftLeftFor})` : 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        transition: 'margin-right var(--duration-normal) var(--ease-default)',
      }}
    >
      {/* Main toolbar */}
      <div className="graph-toolbar">
        <div style={{ position: 'relative' }}>
          <form onSubmit={handleSearch} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={13}
              style={{
                position: 'absolute', left: 8,
                color: focused ? 'var(--accent)' : 'var(--text-tertiary)',
                transition: 'color var(--duration-fast)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Find node…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActiveResultIndex(i => Math.min(i + 1, results.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveResultIndex(i => Math.max(i - 1, 0)); }
                else if (e.key === 'Escape') { setQuery(''); }
              }}
              role="combobox"
              aria-expanded={focused && results.length > 0}
              aria-autocomplete="list"
              aria-controls="graph-search-results"
              aria-activedescendant={results[activeResultIndex] ? `graph-search-option-${activeResultIndex}` : undefined}
              aria-label="Search graph nodes"
              className="graph-search-input"
            />
          </form>
          {focused && query && results.length > 0 && (
            <div
              id="graph-search-results"
              role="listbox"
              aria-label="Matching files"
              className="dropdown-panel animate-slide-up"
              style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 260, zIndex: 'var(--z-dropdown)' }}
            >
              {results.map((node, i) => (
                <button
                  key={node.id}
                  id={`graph-search-option-${i}`}
                  role="option"
                  aria-selected={i === activeResultIndex}
                  type="button"
                  className="menu-item"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => selectResult(node)}
                  onMouseEnter={() => setActiveResultIndex(i)}
                  style={{ background: i === activeResultIndex ? 'var(--bg-hover)' : undefined }}
                >
                  <span className="menu-item-icon"><FileCode size={13} /></span>
                  <div style={{ overflow: 'hidden' }}>
                    <div className="menu-item-title">{node.data.label as string}</div>
                    <div className="menu-item-subtitle" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {node.data.path as string}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="divider-v-sm" />
        {iconBtn(() => zoomIn({ duration: 800 }), <ZoomIn size={15} />, 'Zoom in')}
        {iconBtn(() => zoomOut({ duration: 800 }), <ZoomOut size={15} />, 'Zoom out')}
        {iconBtn(() => fitView({ duration: 800 }), <Maximize size={15} />, 'Fit view')}
        <div className="divider-v-sm" />
        {iconBtn(onCollapseAll, <ChevronsDownUp size={15} />, 'Collapse all folders')}
        {iconBtn(onExpandAll, <ChevronsUpDown size={15} />, 'Expand all folders')}
        <div className="divider-v-sm" />
        {iconBtn(() => setFilterOpen(v => !v), <Filter size={15} />, 'Filters', filterOpen)}
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="filter-panel" style={{ minWidth: 220 }}>
          <span className="field-label">
            Graph Filters
          </span>

          {/* Toggles */}
          {([
            { key: 'showOrphans',       label: 'Show Orphan Files',     icon: <EyeOff size={12} /> },
            { key: 'showCycles',        label: 'Show Cycle Files Only',  icon: <CircleDot size={12} /> },
            { key: 'highlightHotspots', label: 'Highlight Hotspots',    icon: <Flame size={12} /> },
            { key: 'highlightCycles',   label: 'Highlight Cycles',      icon: <AlertTriangle size={12} /> },
          ] as { key: keyof GraphFilters; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => {
            const val = filters[key] as boolean;
            return (
              <label
                key={key}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', gap: 'var(--space-3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: val ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  {icon}
                  <span style={{ fontSize: 'var(--text-xs)' }}>{label}</span>
                </div>
                <div
                  role="switch"
                  aria-checked={val}
                  aria-label={label}
                  tabIndex={0}
                  onClick={() => onFiltersChange({ ...filters, [key]: !val })}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFiltersChange({ ...filters, [key]: !val }); } }}
                  className={`toggle-track${val ? ' is-on' : ''}`}
                >
                  <div className="toggle-thumb" />
                </div>
              </label>
            );
          })}

          {/* File type filter */}
          {fileTypes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                File Type
              </span>
              <div style={{ position: 'relative' }}>
                <select
                  value={filters.fileTypeFilter}
                  onChange={e => onFiltersChange({ ...filters, fileTypeFilter: e.target.value })}
                  aria-label="Filter by file type"
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-xs)',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    appearance: 'none',
                    paddingRight: 'var(--space-8)',
                  }}
                >
                  <option value="">All types</option>
                  {fileTypes.map(ext => (
                    <option key={ext} value={ext}>{ext}</option>
                  ))}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-5)',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap',
        }}
      >
        {[
          { color: 'var(--lang-ts)', label: 'TypeScript' },
          { color: 'var(--lang-js)', label: 'JavaScript' },
          { color: 'var(--lang-json)', label: 'JSON' },
          { color: 'var(--color-danger)', label: 'Cycle' },
          { color: '#f59e0b', label: 'Hotspot' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div className="graph-legend-dot" style={{ background: color }} />
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>{label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
};

// ─── Inspector Row ─────────────────────────────────────────────────────────────

const InspectorRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div className="field-label" style={{ marginBottom: 'var(--space-1)' }}>
      {label}
    </div>
    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', lineHeight: 'var(--leading-relaxed)' }}>
      {value}
    </div>
  </div>
);

// ─── Inspector Health Badge ────────────────────────────────────────────────────

const HealthBadge: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 70 ? 'var(--color-success)' : score >= 40 ? 'var(--color-warning)' : 'var(--color-danger)';
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'Degraded' : 'Critical';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 100,
      background: `color-mix(in srgb, ${color} 12%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      color, fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-semibold)',
      fontFamily: 'var(--font-sans)',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {label} ({score})
    </span>
  );
};

// ─── Inspector Panel ───────────────────────────────────────────────────────────

interface GraphAdjacency {
  forward: Map<string, { target: string; edgeId: string }[]>;
  reverse: Map<string, { source: string; edgeId: string }[]>;
}

const Inspector = ({
  node,
  onClose,
  onOpen,
  moduleMetrics,
  adjacency,
  gitCommitMap,
  gitAuthorsMap,
  gitLastModifiedMap,
  isPinned,
  onTogglePin,
}: {
  node: Node;
  onClose: () => void;
  onOpen: (path: string) => void;
  moduleMetrics: Map<string, ModuleMetrics>;
  adjacency: GraphAdjacency;
  gitCommitMap: Map<string, number>;
  gitAuthorsMap: Map<string, string[]>;
  gitLastModifiedMap: Map<string, string>;
  /** Whether this node's dependency highlight is pinned (persists after the
   *  mouse leaves it) rather than just hover-previewed. */
  isPinned: boolean;
  onTogglePin: () => void;
}) => {
  const path = node.data.path as string;
  const fileName = path?.split('/').pop() || '';
  const ext = fileName.includes('.') ? `.${fileName.split('.').pop()}` : '';
  const inDegree = (node.data.inDegree as number) ?? 0;
  const outDegree = (node.data.outDegree as number) ?? 0;
  const size = (node.data.size as number) ?? 0;

  const metrics = moduleMetrics.get(path);

  // O(degree) lookups via the prebuilt adjacency index instead of scanning
  // every edge in the graph on each render.
  const deps = (adjacency.forward.get(path) ?? []).map(e => e.target);
  const dependents = (adjacency.reverse.get(path) ?? []).map(e => e.source);

  // Git data (all maps are keyed by absolute path)
  const commitCount = gitCommitMap.get(path) ?? metrics?.commitCount ?? 0;
  const authors = gitAuthorsMap.get(path) || [];
  const lastModified = gitLastModifiedMap.get(path) || null;

  const FileList: React.FC<{ paths: string[]; label: string; icon: React.ReactNode; color: string }> = ({ paths, label, icon, color }) => (
    paths.length > 0 ? (
      <div>
        <div className="field-label" style={{ marginBottom: 'var(--space-2)' }}>
          {icon} {label} ({paths.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 100, overflowY: 'auto' }}>
          {paths.slice(0, 8).map((p, i) => (
            <div key={i} style={{ fontSize: 'var(--text-2xs)', color, fontFamily: 'var(--font-mono)', padding: '2px 4px', background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p}>
              {p.split('/').pop()}
            </div>
          ))}
          {paths.length > 8 && (
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', padding: '2px 4px' }}>+{paths.length - 8} more</div>
          )}
        </div>
      </div>
    ) : null
  );

  return (
    <div
      className="graph-inspector"
      style={{
        position: 'absolute',
        right: 'var(--space-5)',
        top: 'var(--space-5)',
        bottom: 'var(--space-5)',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-focus)',
        borderRadius: 'var(--radius-2xl)',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        overflow: 'hidden',
        animation: 'slide-up var(--duration-normal) var(--ease-default)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-5) var(--space-6)',
        borderBottom: '1px solid var(--border-default)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <FileCode size={14} color="var(--accent)" />
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
            Node Inspector
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <button
            type="button"
            onClick={onTogglePin}
            className="btn-icon btn-icon-md"
            aria-label={isPinned ? 'Unpin dependency highlight' : 'Pin dependency highlight'}
            aria-pressed={isPinned}
            title={isPinned ? 'Highlight pinned — click to unpin' : 'Pin this node’s dependency highlight so it stays visible'}
            style={{ color: isPinned ? 'var(--accent)' : 'var(--text-tertiary)' }}
          >
            <Pin size={14} fill={isPinned ? 'var(--accent)' : 'none'} />
          </button>
          <button type="button" onClick={onClose} className="btn-icon btn-icon-md" aria-label="Close inspector">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

        {/* File info */}
        <InspectorRow label="File" value={fileName} />
        <InspectorRow label="Path" value={path} />
        {ext && (
          <InspectorRow label="Extension" value={
            <span className={`badge badge-${ext === '.ts' || ext === '.tsx' ? 'accent' : 'default'}`}>{ext}</span>
          } />
        )}

        {/* Health Score */}
        {metrics && (
          <div>
            <div className="field-label" style={{ marginBottom: 'var(--space-2)' }}>
              Module Health
            </div>
            <HealthBadge score={metrics.healthScore} />
          </div>
        )}

        {/* Coupling metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div className="stat-box">
            <div className="stat-box-label">
              <ArrowDownRight size={10} /> Fan-In
            </div>
            <div className="stat-box-value">{inDegree}</div>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>importers</div>
          </div>
          <div className="stat-box">
            <div className="stat-box-label">
              <ArrowUpRight size={10} /> Fan-Out
            </div>
            <div className="stat-box-value">{outDegree}</div>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>dependencies</div>
          </div>
        </div>

        {/* Instability metric */}
        {metrics && (
          <div>
            <div className="field-label" style={{ marginBottom: 'var(--space-2)' }}>
              <ShieldAlert size={10} /> Instability (Martin's I)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${metrics.instability * 100}%`,
                  background: metrics.instability > 0.7 ? 'var(--color-danger)' : metrics.instability > 0.4 ? 'var(--color-warning)' : 'var(--color-success)',
                  borderRadius: 3,
                  transition: 'width var(--duration-normal)',
                }} />
              </div>
              <span style={{ fontSize: 'var(--text-xs)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', minWidth: 30 }}>
                {metrics.instability.toFixed(2)}
              </span>
            </div>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>
              0 = stable · 1 = unstable
            </div>
          </div>
        )}

        {/* Git data */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div className="stat-box">
            <div className="stat-box-label">
              <GitCommit size={10} /> Commits
            </div>
            <div className="stat-box-value">
              {commitCount || '—'}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-box-label">
              <Hash size={10} /> Size
            </div>
            <div className="stat-box-value">
              {size > 0 ? `${(size / 1024).toFixed(1)}` : '—'}
            </div>
            {size > 0 && <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>KB</div>}
          </div>
        </div>

        {/* Authors */}
        {authors.length > 0 && (
          <div>
            <div className="field-label" style={{ marginBottom: 'var(--space-2)' }}>
              <Users size={10} /> Authors
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {authors.slice(0, 5).map((author, i) => (
                <span key={i} style={{ fontSize: 'var(--text-2xs)', padding: '2px 8px', background: 'var(--accent-subtle)', color: 'var(--accent-hover)', borderRadius: 100, border: '1px solid var(--border-focus)' }}>
                  {author}
                </span>
              ))}
              {authors.length > 5 && (
                <span style={{ fontSize: 'var(--text-2xs)', padding: '2px 8px', color: 'var(--text-tertiary)' }}>+{authors.length - 5}</span>
              )}
            </div>
          </div>
        )}

        {/* Last modified */}
        {lastModified && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-tertiary)' }}>
            <Clock size={11} />
            <span style={{ fontSize: 'var(--text-xs)' }}>Last modified: {lastModified}</span>
          </div>
        )}

        {/* Flags */}
        {(metrics?.isInCycle || metrics?.isOrphan) && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {metrics.isInCycle && (
              <span style={{ fontSize: 'var(--text-2xs)', padding: '2px 8px', background: 'var(--color-danger-subtle)', color: 'var(--color-danger)', borderRadius: 100, border: '1px solid var(--color-danger-border)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CircleDot size={9} /> In Cycle
              </span>
            )}
            {metrics.isOrphan && (
              <span style={{ fontSize: 'var(--text-2xs)', padding: '2px 8px', background: 'var(--color-warning-subtle)', color: 'var(--color-warning)', borderRadius: 100, border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <EyeOff size={9} /> Orphan
              </span>
            )}
          </div>
        )}

        {/* Dependency lists */}
        <FileList
          paths={dependents}
          label="Imported By"
          icon={<ArrowDownRight size={9} />}
          color="var(--accent-hover)"
        />
        <FileList
          paths={deps}
          label="Imports"
          icon={<ArrowUpRight size={9} />}
          color="var(--text-secondary)"
        />
      </div>

      {/* Footer */}
      <div style={{ padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border-default)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <button
          type="button"
          onClick={() => onOpen(path)}
          className="btn btn-primary btn-md"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <ExternalLink size={13} />
          Open in Code Viewer
        </button>
      </div>
    </div>
  );
};

// ─── Flow Wrapper ──────────────────────────────────────────────────────────────

const FlowWrapper: React.FC<{
  externalHighlight?: string | null;
}> = ({ externalHighlight }) => {
  const { dependencies, files, git, insights, setActiveFile, clearGraphHighlight } =
    useRepositoryStore(
      useShallow(s => ({
        dependencies: s.dependencies,
        files: s.files,
        git: s.git,
        insights: s.insights,
        setActiveFile: s.setActiveFile,
        clearGraphHighlight: s.clearGraphHighlight,
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
  // effect below); un-hovering reverts to whatever's pinned.
  const [pinnedNode, setPinnedNode] = useState<string | null>(null);
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
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const allFolderIds = useMemo(() => {
    if (!dependencies) return new Set<string>();
    const allFolders = new Set<string>();
    for (const n of dependencies.nodes) {
      const folder = getFolderPath(n.path);
      if (folder) allFolders.add(folder);
    }
    return allFolders;
  }, [dependencies]);

  useEffect(() => {
    setCollapsedFolders(allFolderIds);
  }, [allFolderIds]);

  const handleCollapseAll = useCallback(() => setCollapsedFolders(new Set(allFolderIds)), [allFolderIds]);
  const handleExpandAll = useCallback(() => setCollapsedFolders(new Set()), []);

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
      collapsedFolders: Array.from(collapsedFolders),
    } satisfies DagreLayoutRequest);

    return () => worker.removeEventListener('message', handleMessage);
    // Re-requests layout whenever collapse state changes too, not just on a
    // new dataset — expanding/collapsing a folder is a real layout change
    // (dagre needs to reserve different space), not just a style toggle.
  }, [dependencies, collapsedFolders]);

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
      setCollapsedFolders(prev => {
        const next = new Set(prev);
        next.delete(folder);
        return next;
      });
    }
  }, [externalHighlight, nodes]); // eslint-disable-line

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'folderNode') {
      const folderId = node.id;
      setCollapsedFolders(prev => {
        const next = new Set(prev);
        if (next.has(folderId)) next.delete(folderId); else next.add(folderId);
        return next;
      });
      return;
    }
    setSelectedNode(node);
    setPinnedNode(node.id);
  }, []);

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
        <CustomToolbar
          nodes={nodes}
          onSearch={handleSearchFocus}
          filters={filters}
          onFiltersChange={setFilters}
          fileTypes={fileTypes}
          shiftLeftFor={!isCompact && selectedNode ? 'calc(320px + var(--space-4))' : undefined}
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
          <Inspector
            node={selectedNode}
            onClose={() => { setSelectedNode(null); if (pinnedNode === selectedNode.id) setPinnedNode(null); }}
            onOpen={handleOpenFile}
            moduleMetrics={insights?.moduleMetrics || new Map()}
            adjacency={adjacency}
            gitCommitMap={gitCommitMap}
            gitAuthorsMap={gitAuthorsMap}
            gitLastModifiedMap={gitLastModifiedMap}
            isPinned={pinnedNode === selectedNode.id}
            onTogglePin={() => setPinnedNode(prev => prev === selectedNode.id ? null : selectedNode.id)}
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
