import React from 'react';
import type { ModuleMetrics, PackageMetrics } from '../../lib/insightsEngine';
import {
  FileCode, ExternalLink, Users, Clock,
  ArrowUpRight, ArrowDownRight, ShieldAlert,
  EyeOff, CircleDot, Hash, Pin, GitCommit, X, Folder,
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

export const HealthBadge: React.FC<{ score: number }> = ({ score }) => {
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

/** Detail panel for the currently selected/pinned file in the Architecture
 *  focus canvas — health score, coupling metrics, git activity, and its
 *  immediate dependency/dependent lists. Fills whatever container the
 *  caller docks it in (a fixed-width grid column on wide viewports, a
 *  full-height overlay drawer on narrow ones) rather than positioning
 *  itself, so opening it never has to reflow anything else on screen. */
export const NodeInspector = ({
  path,
  sizeBytes,
  onClose,
  onOpen,
  moduleMetrics,
  adjacency,
  gitCommitMap,
  gitAuthorsMap,
  gitLastModifiedMap,
  isPinned,
  onTogglePin,
  circularDependencies,
  packageMetrics,
  folderPath,
}: {
  path: string;
  sizeBytes: number;
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
  /** Every circular-dependency chain in the repo — filtered down to the
   *  ones this file actually participates in, so "In Cycle" can show which
   *  files, not just that it's true. */
  circularDependencies: string[][];
  packageMetrics: Map<string, PackageMetrics>;
  /** This file's containing directory (same grouping the treemap uses) —
   *  looked up in `packageMetrics` to show the enclosing package's cohesion
   *  as first-class UI instead of only a treemap hover tooltip. */
  folderPath: string | null;
}) => {
  const fileName = path?.split('/').pop() || '';
  const ext = fileName.includes('.') ? `.${fileName.split('.').pop()}` : '';

  const metrics = moduleMetrics.get(path);
  const inDegree = metrics?.fanIn ?? 0;
  const outDegree = metrics?.fanOut ?? 0;

  // O(degree) lookups via the prebuilt adjacency index instead of scanning
  // every edge in the graph on each render.
  const deps = (adjacency.forward.get(path) ?? []).map(e => e.target);
  const dependents = (adjacency.reverse.get(path) ?? []).map(e => e.source);

  // Git data (all maps are keyed by absolute path)
  const commitCount = gitCommitMap.get(path) ?? metrics?.commitCount ?? 0;
  const authors = gitAuthorsMap.get(path) || [];
  const lastModified = gitLastModifiedMap.get(path) || null;

  const cyclesForFile = circularDependencies.filter(chain => chain.includes(path));
  const pkgMetrics = folderPath ? packageMetrics.get(folderPath) : undefined;

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
    <div className="graph-inspector">
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
              {sizeBytes > 0 ? `${(sizeBytes / 1024).toFixed(1)}` : '—'}
            </div>
            {sizeBytes > 0 && <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>KB</div>}
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

        {/* Circular dependency chains — which files, not just "yes/no" */}
        {cyclesForFile.length > 0 && (
          <div>
            <div className="field-label" style={{ marginBottom: 'var(--space-2)' }}>
              <CircleDot size={10} /> Circular Dependency Chain{cyclesForFile.length > 1 ? 's' : ''} ({cyclesForFile.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {cyclesForFile.map((chain, i) => (
                <div key={i} style={{ fontSize: 'var(--text-2xs)', fontFamily: 'var(--font-mono)', color: 'var(--color-danger)', background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger-border)', borderRadius: 6, padding: 'var(--space-2)', lineHeight: 'var(--leading-relaxed)', wordBreak: 'break-word' }}>
                  {chain.map((p, j) => (
                    <React.Fragment key={j}>
                      <span style={{ fontWeight: p === path ? 'var(--weight-semibold)' : undefined, textDecoration: p === path ? 'underline' : undefined }}>
                        {p.split('/').pop()}
                      </span>
                      {j < chain.length - 1 && <span style={{ opacity: 0.5 }}> → </span>}
                    </React.Fragment>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Containing package's cohesion — previously only a treemap hover tooltip */}
        {pkgMetrics && (
          <div>
            <div className="field-label" style={{ marginBottom: 'var(--space-2)' }}>
              <Folder size={10} /> Package: {folderPath?.split('/').pop()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              <div style={{ flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${pkgMetrics.cohesion * 100}%`,
                  background: pkgMetrics.cohesion > 0.7 ? 'var(--color-success)' : pkgMetrics.cohesion > 0.4 ? 'var(--color-warning)' : 'var(--color-danger)',
                  borderRadius: 3,
                }} />
              </div>
              <span style={{ fontSize: 'var(--text-xs)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', minWidth: 30 }}>
                {(pkgMetrics.cohesion * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>
              {pkgMetrics.internalEdges} internal edge{pkgMetrics.internalEdges === 1 ? '' : 's'} · {pkgMetrics.externalEdges} crossing the package boundary
            </div>
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

/** Shown instead of NodeInspector when 2+ files are shift/ctrl-selected on
 *  the canvas — a compact side-by-side comparison rather than forcing the
 *  user to flip between single-file inspector views one at a time. */
export const NodeComparisonPanel: React.FC<{
  paths: string[];
  moduleMetrics: Map<string, ModuleMetrics>;
  onClose: () => void;
  onRemove: (path: string) => void;
  onFocusOne: (path: string) => void;
}> = ({ paths, moduleMetrics, onClose, onRemove, onFocusOne }) => (
  <div className="graph-inspector">
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: 'var(--space-5) var(--space-6)',
      borderBottom: '1px solid var(--border-default)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <FileCode size={14} color="var(--accent)" />
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
          Comparing {paths.length} files
        </span>
      </div>
      <button type="button" onClick={onClose} className="btn-icon btn-icon-md" aria-label="Clear comparison">
        <X size={14} />
      </button>
    </div>

    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {paths.map(p => {
        const m = moduleMetrics.get(p);
        return (
          <div
            key={p}
            role="button"
            tabIndex={0}
            onClick={() => onFocusOne(p)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFocusOne(p); } }}
            style={{
              border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-3)', cursor: 'pointer', background: 'var(--bg-elevated)',
              display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p}>
                {p.split('/').pop()}
              </span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onRemove(p); }}
                className="btn-icon btn-icon-sm"
                aria-label={`Remove ${p.split('/').pop()} from comparison`}
              >
                <X size={11} />
              </button>
            </div>
            {m ? <HealthBadge score={m.healthScore} /> : (
              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>No metrics (non-source file)</span>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>
              <span>Fan-in {m?.fanIn ?? 0}</span>
              <span>Fan-out {m?.fanOut ?? 0}</span>
              {m && <span>Instability {m.instability.toFixed(2)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
