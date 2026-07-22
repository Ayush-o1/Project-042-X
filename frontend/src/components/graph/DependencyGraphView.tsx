import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { getDagreLayout } from './layoutUtils';
import { FileNode } from './FileNode';
import { FolderNode } from './FolderNode';
import { CustomEdge } from './CustomEdge';
import { computeInsights } from '../../lib/insightsEngine';
import type { ModuleMetrics } from '../../lib/insightsEngine';
import {
  Search, ZoomIn, ZoomOut, Maximize, X, ExternalLink, FileCode,
  Network, AlertTriangle, Users, Clock, Filter,
  ChevronDown, GitCommit, ArrowUpRight, ArrowDownRight, Flame,
  ShieldAlert, EyeOff, CircleDot, Hash
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
}: {
  nodes: Node[];
  onSearch: (id: string) => void;
  filters: GraphFilters;
  onFiltersChange: (f: GraphFilters) => void;
  fileTypes: string[];
}) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = nodes.find(n =>
      n.data.path && (n.data.path as string).toLowerCase().includes(query.toLowerCase())
    );
    if (found) onSearch(found.id);
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
    <Panel position="top-right" style={{ margin: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Main toolbar */}
      <div className="graph-toolbar">
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
            aria-label="Search graph nodes"
            className="graph-search-input"
          />
        </form>
        <div style={{ width: 1, height: 20, background: 'var(--border-default)' }} />
        {iconBtn(() => zoomIn({ duration: 800 }), <ZoomIn size={15} />, 'Zoom in')}
        {iconBtn(() => zoomOut({ duration: 800 }), <ZoomOut size={15} />, 'Zoom out')}
        {iconBtn(() => fitView({ duration: 800 }), <Maximize size={15} />, 'Fit view')}
        <div style={{ width: 1, height: 20, background: 'var(--border-default)' }} />
        {iconBtn(() => setFilterOpen(v => !v), <Filter size={15} />, 'Filters', filterOpen)}
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-xl)',
            padding: 'var(--space-5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            minWidth: 220,
            animation: 'slide-up var(--duration-fast) var(--ease-default)',
          }}
        >
          <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>
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
                  onClick={() => onFiltersChange({ ...filters, [key]: !val })}
                  style={{
                    width: 28, height: 16, borderRadius: 8,
                    background: val ? 'var(--accent)' : 'var(--bg-elevated)',
                    border: `1px solid ${val ? 'var(--accent)' : 'var(--border-default)'}`,
                    position: 'relative',
                    transition: 'all var(--duration-fast)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 2, left: val ? 12 : 2,
                    width: 10, height: 10,
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'left var(--duration-fast)',
                  }} />
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
    <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: 'var(--space-1)' }}>
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

const Inspector = ({
  node,
  onClose,
  onOpen,
  moduleMetrics,
  dependencies,
  gitCommitMap,
  gitAuthorsMap,
  gitLastModifiedMap,
}: {
  node: Node;
  onClose: () => void;
  onOpen: (path: string) => void;
  moduleMetrics: Map<string, ModuleMetrics>;
  dependencies: { nodes: any[]; edges: any[] } | null;
  gitCommitMap: Map<string, number>;
  gitAuthorsMap: Map<string, string[]>;
  gitLastModifiedMap: Map<string, string>;
}) => {
  const path = node.data.path as string;
  const fileName = path?.split('/').pop() || '';
  const ext = fileName.includes('.') ? `.${fileName.split('.').pop()}` : '';
  const inDegree = (node.data.inDegree as number) ?? 0;
  const outDegree = (node.data.outDegree as number) ?? 0;
  const size = (node.data.size as number) ?? 0;

  const metrics = moduleMetrics.get(path);

  // Get list of dependencies and dependents from the edge data
  const deps = dependencies?.edges.filter(e => e.sourceId === path || e.source === path).map(e => e.targetId || e.target) || [];
  const dependents = dependencies?.edges.filter(e => e.targetId === path || e.target === path).map(e => e.sourceId || e.source) || [];

  // Git data
  const commitCount = gitCommitMap.get(fileName) || gitCommitMap.get(path) || metrics?.commitCount || 0;
  const authors = gitAuthorsMap.get(path) || gitAuthorsMap.get(fileName) || [];
  const lastModified = gitLastModifiedMap.get(path) || gitLastModifiedMap.get(fileName) || null;

  const FileList: React.FC<{ paths: string[]; label: string; icon: React.ReactNode; color: string }> = ({ paths, label, icon, color }) => (
    paths.length > 0 ? (
      <div>
        <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
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
      style={{
        position: 'absolute',
        right: 'var(--space-5)',
        top: 'var(--space-5)',
        bottom: 'var(--space-5)',
        width: 320,
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
        <button type="button" onClick={onClose} className="btn-icon btn-icon-md" aria-label="Close inspector">
          <X size={14} />
        </button>
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
            <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }}>
              Module Health
            </div>
            <HealthBadge score={metrics.healthScore} />
          </div>
        )}

        {/* Coupling metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-1)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowDownRight size={10} /> Fan-In
            </div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{inDegree}</div>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>importers</div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-1)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowUpRight size={10} /> Fan-Out
            </div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{outDegree}</div>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>dependencies</div>
          </div>
        </div>

        {/* Instability metric */}
        {metrics && (
          <div>
            <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
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
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <GitCommit size={10} /> Commits
            </div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {commitCount || '—'}
            </div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Hash size={10} /> Size
            </div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {size > 0 ? `${(size / 1024).toFixed(1)}` : '—'}
            </div>
            {size > 0 && <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>KB</div>}
          </div>
        </div>

        {/* Authors */}
        {authors.length > 0 && (
          <div>
            <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
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
  onNodeNavigate?: (nodeId: string) => void;
  externalHighlight?: string | null;
}> = ({ externalHighlight }) => {
  const { dependencies, files, git, setActiveFile } = useRepositoryStore();
  const { setCenter } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [filters, setFilters] = useState<GraphFilters>({
    showOrphans: true,
    showCycles: false,
    highlightHotspots: false,
    highlightCycles: true,
    fileTypeFilter: '',
  });

  // ── Compute insights for overlay data ──────────────────────────────────────
  const insights = useMemo(() => {
    if (!dependencies) return null;
    return computeInsights(files, dependencies, git);
  }, [files, dependencies, git]);

  // ── Build git data lookup maps from raw git data ───────────────────────────
  const { gitCommitMap, gitAuthorsMap, gitLastModifiedMap } = useMemo(() => {
    const commitMap = new Map<string, number>();
    const authorsMap = new Map<string, string[]>();
    const lastModMap = new Map<string, string>();

    if (git) {
      for (const commit of git.commits) {
        const ts = (commit as any).timestamp ?? (commit as any).date;
        const dateStr = ts && typeof ts === 'string' ? ts.split('T')[0] : null;

        for (const file of commit.filesChanged || []) {
          if (!file) continue;
          const baseName = file.split('/').pop() || file;

          // Commit count
          commitMap.set(file, (commitMap.get(file) || 0) + 1);
          commitMap.set(baseName, (commitMap.get(baseName) || 0) + 1);

          // Authors
          const authors = authorsMap.get(file) || [];
          if (commit.author && !authors.includes(commit.author)) {
            authors.push(commit.author);
            authorsMap.set(file, authors);
            authorsMap.set(baseName, authors);
          }

          // Last modified (commits are sorted newest first)
          if (dateStr && !lastModMap.has(file)) {
            lastModMap.set(file, dateStr);
            lastModMap.set(baseName, dateStr);
          }
        }
      }
    }
    return { gitCommitMap: commitMap, gitAuthorsMap: authorsMap, gitLastModifiedMap: lastModMap };
  }, [git]);

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
  const [rawNodes, rawEdges] = useMemo(() => {
    if (!dependencies) return [[], []];
    const { nodes: ln, edges: le } = getDagreLayout(dependencies, 'LR');
    return [ln, le];
  }, [dependencies]);

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
            size: files.find(f => f.path === path)?.size ?? 0,
            isHotspot,
            isCycle,
            dimmed: false,
          },
        };
      });

    setNodes(processedNodes);
    setEdges(rawEdges);
  }, [rawNodes, rawEdges, insights, filters, files, setNodes, setEdges]);

  // ── Hover BFS highlight ───────────────────────────────────────────────────
  useEffect(() => {
    if (!hoveredNode || !dependencies) {
      setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, dimmed: false } })));
      setEdges(eds => eds.map(e => ({
        ...e,
        data: { ...e.data, isIncoming: false, isOutgoing: false, isDimmed: false }
      })));
      return;
    }

    const incomingIds = new Set<string>();
    const outgoingIds = new Set<string>();
    const incomingEdges = new Set<string>();
    const outgoingEdges = new Set<string>();

    const traverse = (nodeId: string, direction: 'in' | 'out', visitedNodes: Set<string>, visitedEdges: Set<string>) => {
      if (visitedNodes.has(nodeId)) return;
      visitedNodes.add(nodeId);

      dependencies.edges.forEach(e => {
        const edgeId = `${e.sourceId}-${e.targetId}`;
        if (direction === 'out' && e.sourceId === nodeId) {
          visitedEdges.add(edgeId);
          traverse(e.targetId, direction, visitedNodes, visitedEdges);
        }
        if (direction === 'in' && e.targetId === nodeId) {
          visitedEdges.add(edgeId);
          traverse(e.sourceId, direction, visitedNodes, visitedEdges);
        }
      });
    };

    traverse(hoveredNode, 'in', incomingIds, incomingEdges);
    traverse(hoveredNode, 'out', outgoingIds, outgoingEdges);

    setNodes(nds => nds.map(n => {
      if (n.type === 'folderNode') return n;
      const isConnected = incomingIds.has(n.id) || outgoingIds.has(n.id) || n.id === hoveredNode;
      return { ...n, data: { ...n.data, dimmed: !isConnected } };
    }));

    setEdges(eds => eds.map(e => {
      const isIncoming = incomingEdges.has(e.id);
      const isOutgoing = outgoingEdges.has(e.id);
      const isConnected = isIncoming || isOutgoing;
      return {
        ...e,
        data: { ...e.data, isIncoming, isOutgoing, isDimmed: !isConnected },
      };
    }));
  }, [hoveredNode, dependencies, setNodes, setEdges]);

  // ── External highlight (from Insights navigation) ────────────────────────
  useEffect(() => {
    if (!externalHighlight) return;
    handleSearchFocus(externalHighlight);
  }, [externalHighlight]); // eslint-disable-line

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'folderNode') return;
    setSelectedNode(node);
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
      setHoveredNode(nodeId);
      setSelectedNode(node);
    }
  };

  if (!dependencies) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 'var(--space-6)' }}>
        <div style={{ width: 56, height: 56, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-2xl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Network size={24} style={{ opacity: 0.3 }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>No Dependency Graph</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Analyze a repository to build its AST graph.</p>
        </div>
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
        onNodeMouseEnter={(_, node) => {
          if (node.type !== 'folderNode') setHoveredNode(node.id);
        }}
        onNodeMouseLeave={() => setHoveredNode(null)}
        onPaneClick={() => { setHoveredNode(null); setSelectedNode(null); }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ duration: 800 }}
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
        <Inspector
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onOpen={handleOpenFile}
          moduleMetrics={insights?.moduleMetrics || new Map()}
          dependencies={dependencies}
          gitCommitMap={gitCommitMap}
          gitAuthorsMap={gitAuthorsMap}
          gitLastModifiedMap={gitLastModifiedMap}
        />
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
