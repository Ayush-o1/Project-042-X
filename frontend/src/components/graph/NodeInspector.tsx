import React from 'react';
import type { Node } from '@xyflow/react';
import type { ModuleMetrics } from '../../lib/insightsEngine';
import {
  FileCode, ExternalLink, Users, Clock,
  ArrowUpRight, ArrowDownRight, ShieldAlert,
  EyeOff, CircleDot, Hash, Pin, GitCommit, X
} from 'lucide-react';

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

export interface GraphAdjacency {
  forward: Map<string, { target: string; edgeId: string }[]>;
  reverse: Map<string, { source: string; edgeId: string }[]>;
}

/** Detail panel for the currently selected/pinned file node in the
 *  Architecture graph — health score, coupling metrics, git activity, and
 *  its immediate dependency/dependent lists. */
export const NodeInspector = ({
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
