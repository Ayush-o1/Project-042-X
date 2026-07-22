import React, { useMemo } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { computeInsights } from '../../lib/insightsEngine';
import type { ModuleMetrics, PackageMetrics } from '../../lib/insightsEngine';
import {
  AlertTriangle, FileCode, Network, Layers,
  GitCommit, Activity, Link, RefreshCw,
  CircleDot, Unlink, Info, TrendingUp, Calendar,
  ShieldAlert, Flame, Heart, BarChart2, Users,
  ArrowRight, Package, Zap
} from 'lucide-react';

/* ── Clickable Bar row with animated fill ───────────────────────── */
const BarItem: React.FC<{
  label: string;
  value: number;
  maxValue: number;
  suffix?: string;
  color: string;
  onClick?: () => void;
  badge?: React.ReactNode;
}> = ({ label, value, maxValue, suffix = '', color, onClick, badge }) => {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div
      className="bar-row"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        gap: 'var(--space-2)',
        borderRadius: 'var(--radius-md)',
        padding: onClick ? 'var(--space-2)' : '0',
        margin: onClick ? '-var(--space-2)' : '0',
        transition: 'background var(--duration-fast)',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div className="bar-row-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', overflow: 'hidden', maxWidth: '75%' }}>
          <span
            style={{
              fontSize: 'var(--text-xs)',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={label}
          >
            {label}
          </span>
          {badge}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {value}{suffix}
          </span>
          {onClick && <ArrowRight size={10} color="var(--text-tertiary)" style={{ opacity: 0, transition: 'opacity var(--duration-fast)' }} className="bar-arrow" />}
        </div>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
};

/* ── Section panel ───────────────────────────────────────────────── */
const Panel: React.FC<{
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  description?: string;
}> = ({ title, icon, iconColor, badge, children, description }) => (
  <div
    style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-2xl)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-6) var(--space-8)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <span style={{ color: iconColor }}>{icon}</span>
        <div>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', display: 'block' }}>
            {title}
          </span>
          {description && (
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>{description}</span>
          )}
        </div>
      </div>
      {badge}
    </div>
    <div style={{ padding: 'var(--space-6) var(--space-8)', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {children}
    </div>
  </div>
);

/* ── Commit activity heatmap ─────────────────────────────────────── */
const CommitHeatmap: React.FC<{ activity: { date: string; count: number }[] }> = ({ activity }) => {
  if (activity.length === 0) return (
    <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
      No commit data available
    </div>
  );

  const maxCount = Math.max(...activity.map(a => a.count), 1);
  const getLevel = (count: number): number => {
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio < 0.2) return 1;
    if (ratio < 0.4) return 2;
    if (ratio < 0.6) return 3;
    if (ratio < 0.8) return 4;
    return 5;
  };

  const recentActivity = activity.slice(-91);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 10px)', gap: 2 }}>
        {recentActivity.map((day, i) => (
          <div
            key={i}
            className={`heatmap-cell heatmap-${getLevel(day.count)}`}
            title={`${day.date}: ${day.count} commit${day.count !== 1 ? 's' : ''}`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
        <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>Less</span>
        {[0, 1, 2, 3, 4, 5].map(l => (
          <div key={l} className={`heatmap-cell heatmap-${l}`} />
        ))}
        <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>More</span>
      </div>
    </div>
  );
};

/* ── Collapsible cycle row (clickable) ──────────────────────────── */
const CycleRow: React.FC<{ cycle: string[]; index: number; onNavigate: (id: string) => void }> = ({ cycle, index, onNavigate }) => {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: 'var(--space-3) var(--space-4)',
          textAlign: 'left', color: 'var(--text-secondary)', background: 'transparent', gap: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <CircleDot size={12} color="var(--color-danger)" />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}>Cycle {index + 1}</span>
          <span className="badge badge-danger">{cycle.length} files</span>
        </div>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div style={{ padding: 'var(--space-2) var(--space-4) var(--space-3)', display: 'flex', flexDirection: 'column', gap: 2, borderTop: '1px solid var(--color-danger-border)' }}>
          {cycle.map((file, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onNavigate(file)}
              style={{
                fontSize: 'var(--text-xs)', color: 'var(--color-danger)',
                fontFamily: 'var(--font-mono)', textAlign: 'left',
                padding: '2px 4px', borderRadius: 4,
                background: 'transparent',
                display: 'flex', alignItems: 'center', gap: 4,
                cursor: 'pointer',
                transition: 'background var(--duration-fast)',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-danger-subtle)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              title={`Navigate to ${file} in graph`}
            >
              <ArrowRight size={9} />
              {file.split('/').pop()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── KPI Card ─────────────────────────────────────────────────────── */
const KpiCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  description: string;
  status?: 'good' | 'warn' | 'danger' | 'neutral';
}> = ({ label, value, icon, iconBg, iconColor, description, status = 'neutral' }) => {
  const statusColors = {
    good:    'var(--color-success)',
    warn:    'var(--color-warning)',
    danger:  'var(--color-danger)',
    neutral: 'var(--text-tertiary)',
  };

  return (
    <div className="metric-card" title={description}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 32, height: 32, background: iconBg, borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor }}>
          {icon}
        </div>
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 'var(--radius-full)', background: statusColors[status], flexShrink: 0 }} />
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-subtext">{description}</div>
    </div>
  );
};

/* ── Module Health Row ────────────────────────────────────────────── */
const ModuleHealthRow: React.FC<{ m: ModuleMetrics; onClick: () => void }> = ({ m, onClick }) => {
  const name = m.id.split('/').pop() || m.id;
  const healthColor = m.healthScore >= 70 ? 'var(--color-success)' : m.healthScore >= 40 ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        width: '100%', textAlign: 'left', cursor: 'pointer',
        transition: 'border-color var(--duration-fast), background var(--duration-fast)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-active)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
      title={`Click to view ${m.id} in graph`}
    >
      {/* Health indicator */}
      <div style={{ width: 6, height: 28, background: healthColor, borderRadius: 3, flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </div>
        <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', display: 'flex', gap: 'var(--space-3)', marginTop: 1 }}>
          <span>I: {m.instability.toFixed(2)}</span>
          <span>In: {m.fanIn}</span>
          <span>Out: {m.fanOut}</span>
        </div>
      </div>

      {/* Health score */}
      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: healthColor, fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'right' }}>
        {m.healthScore}
      </div>
      <ArrowRight size={11} color="var(--text-tertiary)" />
    </button>
  );
};

/* ── Package Health Row ───────────────────────────────────────────── */
const PackageRow: React.FC<{ p: PackageMetrics }> = ({ p }) => {
  const name = p.path.split('/').pop() || p.path;
  const healthColor = p.avgHealthScore >= 70 ? 'var(--color-success)' : p.avgHealthScore >= 40 ? 'var(--color-warning)' : 'var(--color-danger)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      padding: 'var(--space-3) var(--space-4)',
      background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-subtle)',
    }}>
      <Package size={12} color={healthColor} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', display: 'flex', gap: 'var(--space-3)', marginTop: 1 }}>
          <span>{p.fileCount} files</span>
          <span>I̅: {p.avgInstability.toFixed(2)}</span>
        </div>
      </div>
      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: healthColor, fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(p.avgHealthScore)}
      </div>
    </div>
  );
};

/* ── Author bar ───────────────────────────────────────────────────── */
const AUTHOR_PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6'
];

const AuthorBar: React.FC<{ author: string; count: number; pct: number; color: string }> = ({ author, count, pct, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
    <div style={{ width: 24, height: 24, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'white' }}>{author.charAt(0).toUpperCase()}</span>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{author}</div>
      <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 600ms ease' }} />
      </div>
    </div>
    <span style={{ fontSize: 'var(--text-xs)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', minWidth: 40, textAlign: 'right' }}>{count} ({pct}%)</span>
  </div>
);

/* ── LANG COLORS ──────────────────────────────────────────────────── */
const LANG_COLORS: Record<string, string> = {
  '.ts':  'var(--lang-ts)',
  '.tsx': 'var(--lang-ts)',
  '.js':  'var(--lang-js)',
  '.jsx': 'var(--lang-js)',
  '.json':'var(--lang-json)',
  '.md':  'var(--text-tertiary)',
  '.css': '#38bdf8',
  '.html':'#f97316',
  '.svg': 'var(--lang-image)',
  '.png': 'var(--lang-image)',
};

/* ── Main Dashboard ───────────────────────────────────────────────── */
export const InsightsDashboard: React.FC = () => {
  const {
    files, dependencies, git,
    isFetchingFiles, isFetchingDependencies, isFetchingGit,
    navigateToGraphNode, setActiveFile,
  } = useRepositoryStore();

  const insights = useMemo(() => {
    if (files.length === 0 && !dependencies && !git) return null;
    return computeInsights(files, dependencies, git);
  }, [files, dependencies, git]);

  if (!insights) {
    return (
      <div className="flex-center" style={{ height: '100%', color: 'var(--text-secondary)', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Activity size={28} style={{ opacity: 0.3 }} />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
          Waiting for analysis to complete…
        </span>
      </div>
    );
  }

  const isAnalyzing = isFetchingFiles || isFetchingDependencies || isFetchingGit;
  const maxHotspot = insights.hotspots[0]?.inDegree || 1;
  const maxGitFile = insights.mostActiveGitFiles[0]?.count || 1;
  const maxModuleSize = insights.largestModules[0]?.size || 1;
  const maxFileTypeCount = insights.fileTypeDistribution[0]?.count || 1;

  return (
    <div
      style={{
        padding: 'var(--space-8) var(--space-10)',
        overflowY: 'auto',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-8)',
        animation: 'fade-in 300ms ease-out',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 'var(--space-1)' }}>
            Repository Insights
          </h1>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Algorithmic health metrics computed from your codebase · Click items to navigate
          </p>
        </div>
        {isAnalyzing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--accent)' }}>
            <RefreshCw size={13} className="animate-spin" />
            <span style={{ fontSize: 'var(--text-xs)' }}>Computing…</span>
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-5)' }}>
        <KpiCard
          label="Circular Dependencies"
          value={insights.circularDependencies.length}
          icon={<AlertTriangle size={16} />}
          iconBg="var(--color-danger-subtle)"
          iconColor="var(--color-danger)"
          description="Strongly connected components via Tarjan's SCC"
          status={insights.circularDependencies.length === 0 ? 'good' : insights.circularDependencies.length < 3 ? 'warn' : 'danger'}
        />
        <KpiCard
          label="Orphan Files"
          value={insights.orphanFiles.length}
          icon={<Unlink size={16} />}
          iconBg="var(--color-warning-subtle)"
          iconColor="var(--color-warning)"
          description="Files with no imports or importers — dead code candidates"
          status={insights.orphanFiles.length === 0 ? 'good' : insights.orphanFiles.length < 5 ? 'warn' : 'danger'}
        />
        <KpiCard
          label="Architecture Complexity"
          value={`${insights.architectureComplexityScore}%`}
          icon={<Zap size={16} />}
          iconBg="var(--accent-subtle)"
          iconColor="var(--accent-hover)"
          description="Edge density: actual edges / max possible edges (coupling ratio)"
          status={insights.architectureComplexityScore > 15 ? 'danger' : insights.architectureComplexityScore > 8 ? 'warn' : 'good'}
        />
        <KpiCard
          label="Max Depth Chain"
          value={insights.longestDependencyChain}
          icon={<Layers size={16} />}
          iconBg="var(--color-success-subtle)"
          iconColor="var(--color-success)"
          description="Longest dependency chain via memoized DFS from root nodes"
          status={insights.longestDependencyChain > 10 ? 'warn' : 'good'}
        />
      </div>

      {/* ── Second row of KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-5)' }}>
        <KpiCard
          label="Avg Fan-In"
          value={insights.averageFanIn.toFixed(2)}
          icon={<Network size={16} />}
          iconBg="var(--bg-surface)"
          iconColor="var(--text-secondary)"
          description="Average afferent coupling per module"
          status={insights.averageFanIn > 5 ? 'warn' : 'good'}
        />
        <KpiCard
          label="Unstable Modules"
          value={insights.mostUnstableModules.filter(m => m.instability > 0.7).length}
          icon={<ShieldAlert size={16} />}
          iconBg="var(--color-danger-subtle)"
          iconColor="var(--color-danger)"
          description="Modules with instability > 0.7 (Martin's metric)"
          status={insights.mostUnstableModules.filter(m => m.instability > 0.7).length > 5 ? 'danger' : 'warn'}
        />
        <KpiCard
          label="Hotspot Files"
          value={insights.hotspots.length}
          icon={<Flame size={16} />}
          iconBg="rgba(245,158,11,0.1)"
          iconColor="#f59e0b"
          description="Top fan-in files — most imported across the codebase"
          status="neutral"
        />
        <KpiCard
          label="Contributors"
          value={insights.authorContributions.length}
          icon={<Users size={16} />}
          iconBg="var(--bg-surface)"
          iconColor="var(--text-secondary)"
          description="Unique authors from full git history"
          status="neutral"
        />
      </div>

      {/* ── Commit Activity Heatmap ── */}
      {insights.commitActivity.length > 0 && (
        <Panel
          title="Commit Activity"
          icon={<Calendar size={15} />}
          iconColor="var(--accent)"
          badge={
            <span className="badge badge-accent">
              {insights.commitActivity.reduce((s, a) => s + a.count, 0)} commits
            </span>
          }
        >
          <CommitHeatmap activity={insights.commitActivity} />
        </Panel>
      )}

      {/* ── Architecture Intelligence ── */}
      {insights.sickestModules.length > 0 && (
        <Panel
          title="Module Health Scores"
          icon={<Heart size={15} />}
          iconColor="var(--color-danger)"
          description="Composite score: instability + hotspot + churn + cycle membership (0–100)"
          badge={<span className="badge badge-danger">Sickest First</span>}
        >
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }}>
            Click any module to jump to it in the Architecture Graph
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {insights.sickestModules.slice(0, 8).map((m) => (
              <ModuleHealthRow key={m.id} m={m} onClick={() => navigateToGraphNode(m.id)} />
            ))}
          </div>
        </Panel>
      )}

      {/* ── Package Health ── */}
      {insights.packageMetrics.length > 0 && (
        <Panel
          title="Package Health"
          icon={<Package size={15} />}
          iconColor="var(--color-warning)"
          description="Per-directory health rollup (avg instability, avg health)"
          badge={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>by avg health</span>}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            {insights.packageMetrics.slice(0, 8).map((p, i) => (
              <PackageRow key={i} p={p} />
            ))}
          </div>
        </Panel>
      )}

      {/* ── 2-column grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>

        {/* Circular Dependencies */}
        <Panel
          title="Circular Dependencies"
          icon={<AlertTriangle size={15} />}
          iconColor="var(--color-danger)"
          badge={
            <span className={`badge ${insights.circularDependencies.length === 0 ? 'badge-success' : 'badge-danger'}`}>
              {insights.circularDependencies.length === 0 ? 'Clean' : `${insights.circularDependencies.length} cycle${insights.circularDependencies.length !== 1 ? 's' : ''}`}
            </span>
          }
        >
          {insights.circularDependencies.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-8)', gap: 'var(--space-3)', color: 'var(--color-success)' }}>
              <Info size={20} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 'var(--leading-relaxed)' }}>
                No circular dependencies detected.<br />Your dependency graph is acyclic.
              </span>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }}>
                Click a file inside a cycle to navigate to it in the graph
              </p>
              {insights.circularDependencies.slice(0, 8).map((cycle, i) => (
                <CycleRow key={i} cycle={cycle} index={i} onNavigate={navigateToGraphNode} />
              ))}
            </>
          )}
        </Panel>

        {/* Orphan Files */}
        <Panel
          title="Orphan Files"
          icon={<Unlink size={15} />}
          iconColor="var(--color-warning)"
          badge={
            <span className={`badge ${insights.orphanFiles.length === 0 ? 'badge-success' : 'badge-warning'}`}>
              {insights.orphanFiles.length === 0 ? 'None' : insights.orphanFiles.length}
            </span>
          }
        >
          {insights.orphanFiles.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-8)', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                All files are connected in the dependency graph.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: 220, overflowY: 'auto' }}>
              {insights.orphanFiles.map((file, i) => {
                const fileModel = files.find(f => f.path === file);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (fileModel) setActiveFile(fileModel);
                      navigateToGraphNode(file);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                      transition: 'border-color var(--duration-fast)',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'}
                    title={`Navigate to ${file} in graph`}
                  >
                    <FileCode size={11} color="var(--color-warning)" />
                    <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={file}>
                      {file.split('/').pop()}
                    </span>
                    <ArrowRight size={10} color="var(--text-tertiary)" />
                  </button>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Dependency Hotspots */}
        <Panel
          title="Dependency Hotspots"
          icon={<Link size={15} />}
          iconColor="var(--accent-hover)"
          badge={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>by fan-in · click to navigate</span>}
        >
          {insights.hotspots.length === 0 ? (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>No dependency data</span>
          ) : (
            insights.hotspots.slice(0, 8).map((h, i) => (
              <BarItem
                key={i}
                label={h.id.split('/').pop() || h.id}
                value={h.inDegree}
                maxValue={maxHotspot}
                suffix=" imports"
                color="var(--accent)"
                onClick={() => navigateToGraphNode(h.id)}
              />
            ))
          )}
        </Panel>

        {/* Most Active Git Files */}
        <Panel
          title="Most Active Git Files"
          icon={<GitCommit size={15} />}
          iconColor="var(--color-success)"
          badge={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>by commits</span>}
        >
          {insights.mostActiveGitFiles.length === 0 ? (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>No git data</span>
          ) : (
            insights.mostActiveGitFiles.slice(0, 8).map((f, i) => (
              <BarItem
                key={i}
                label={f.path.split('/').pop() || f.path}
                value={f.count}
                maxValue={maxGitFile}
                suffix=" commits"
                color="var(--color-success)"
              />
            ))
          )}
        </Panel>

        {/* File Type Distribution */}
        <Panel
          title="File Type Distribution"
          icon={<FileCode size={15} />}
          iconColor="var(--lang-image)"
          badge={
            <span className="badge badge-default">
              {insights.fileTypeDistribution.reduce((s, f) => s + f.count, 0)} files
            </span>
          }
        >
          {insights.fileTypeDistribution.slice(0, 10).map((f, i) => (
            <BarItem
              key={i}
              label={f.extension || 'no extension'}
              value={f.count}
              maxValue={maxFileTypeCount}
              suffix=" files"
              color={LANG_COLORS[f.extension] || 'var(--text-tertiary)'}
            />
          ))}
        </Panel>

        {/* Largest Modules */}
        <Panel
          title="Largest Modules"
          icon={<Activity size={15} />}
          iconColor="var(--color-warning)"
          badge={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>by size</span>}
        >
          {insights.largestModules.length === 0 ? (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>No module data</span>
          ) : (
            insights.largestModules.slice(0, 8).map((m, i) => (
              <BarItem
                key={i}
                label={m.path || '/'}
                value={Math.round(m.size / 1024)}
                maxValue={Math.round(maxModuleSize / 1024)}
                suffix=" KB"
                color="var(--color-warning)"
              />
            ))
          )}
        </Panel>

      </div>

      {/* ── Author Contributions ── */}
      {insights.authorContributions.length > 0 && (
        <Panel
          title="Author Contributions"
          icon={<Users size={15} />}
          iconColor="var(--accent)"
          description="Commit share by author from full git history"
          badge={<span className="badge badge-default">{insights.authorContributions.length} authors</span>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {insights.authorContributions.slice(0, 10).map((a, i) => (
              <AuthorBar
                key={i}
                author={a.author}
                count={a.count}
                pct={a.percentage}
                color={AUTHOR_PALETTE[i % AUTHOR_PALETTE.length]}
              />
            ))}
          </div>
        </Panel>
      )}

      {/* ── Most Connected ── */}
      {insights.mostConnectedFiles.length > 0 && (
        <Panel
          title="Most Connected Files"
          icon={<TrendingUp size={15} />}
          iconColor="var(--accent)"
          badge={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>total degree (in + out) · click to navigate</span>}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            {insights.mostConnectedFiles.slice(0, 8).map((f, i) => (
              <BarItem
                key={i}
                label={f.id.split('/').pop() || f.id}
                value={f.totalDegree}
                maxValue={insights.mostConnectedFiles[0].totalDegree}
                suffix=" connections"
                color="var(--accent)"
                onClick={() => navigateToGraphNode(f.id)}
              />
            ))}
          </div>
        </Panel>
      )}

      {/* ── Fan-In / Fan-Out Table ── */}
      {insights.mostUnstableModules.length > 0 && (
        <Panel
          title="Instability Ranking"
          icon={<BarChart2 size={15} />}
          iconColor="var(--color-danger)"
          description="Robert Martin's I = Ce/(Ca+Ce). Click to view in graph."
          badge={<span className="badge badge-danger">Most Unstable</span>}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 48px 48px 48px 64px', gap: 0 }}>
            {/* Header */}
            {['Module', 'In', 'Out', 'I', 'Health'].map(h => (
              <div key={h} style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', fontWeight: 'var(--weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border-subtle)' }}>{h}</div>
            ))}
            {insights.mostUnstableModules.slice(0, 10).map((m) => {
              const hc = m.healthScore >= 70 ? 'var(--color-success)' : m.healthScore >= 40 ? 'var(--color-warning)' : 'var(--color-danger)';
              return (
                <React.Fragment key={m.id}>
                  <button
                    type="button"
                    onClick={() => navigateToGraphNode(m.id)}
                    style={{
                      fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--accent)',
                      padding: 'var(--space-2) var(--space-3)', textAlign: 'left', cursor: 'pointer',
                      background: 'transparent', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                    title={m.id}
                  >
                    {m.id.split('/').pop()}
                  </button>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', padding: 'var(--space-2) var(--space-3)', fontVariantNumeric: 'tabular-nums', textAlign: 'right', borderBottom: '1px solid var(--border-subtle)' }}>{m.fanIn}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', padding: 'var(--space-2) var(--space-3)', fontVariantNumeric: 'tabular-nums', textAlign: 'right', borderBottom: '1px solid var(--border-subtle)' }}>{m.fanOut}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: m.instability > 0.7 ? 'var(--color-danger)' : m.instability > 0.4 ? 'var(--color-warning)' : 'var(--color-success)', padding: 'var(--space-2) var(--space-3)', fontVariantNumeric: 'tabular-nums', fontWeight: 'var(--weight-semibold)', textAlign: 'right', borderBottom: '1px solid var(--border-subtle)' }}>
                    {m.instability.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: hc, padding: 'var(--space-2) var(--space-3)', fontVariantNumeric: 'tabular-nums', fontWeight: 'var(--weight-bold)', textAlign: 'right', borderBottom: '1px solid var(--border-subtle)' }}>
                    {m.healthScore}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
};
