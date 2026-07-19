import React, { useMemo } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { computeInsights } from '../../lib/insightsEngine';
import { Activity, AlertTriangle, Layers, GitCommit, FileCode, Network, Link, Disc } from 'lucide-react';

export const InsightsDashboard: React.FC = () => {
  const { files, dependencies, git, isFetchingFiles, isFetchingDependencies, isFetchingGit } = useRepositoryStore();

  const insights = useMemo(() => {
    // Only compute if we have some data, but let it update progressively if we want.
    if (files.length === 0 && !dependencies && !git) return null;
    return computeInsights(files, dependencies, git);
  }, [files, dependencies, git]);

  if (!insights) {
    return (
      <div className="flex-center" style={{ height: '100%', color: 'var(--text-secondary)' }}>
        No insights available. Please wait for analysis.
      </div>
    );
  }

  const isAnalyzing = isFetchingFiles || isFetchingDependencies || isFetchingGit;

  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="flex-between">
        <h2 className="text-lg" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Repository Intelligence Dashboard</h2>
        {isAnalyzing && (
          <span className="text-sm" style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="animate-spin"><Disc size={14} /></span>
            Computing live insights...
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-panel)' }}>
          <div className="flex-center" style={{ gap: '8px', color: 'var(--color-danger)', marginBottom: '8px' }}>
            <AlertTriangle size={18} />
            <h3 className="text-sm" style={{ fontWeight: 500 }}>Circular Dependencies</h3>
          </div>
          <p className="text-xl" style={{ fontWeight: 600 }}>{insights.circularDependencies.length}</p>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-panel)' }}>
          <div className="flex-center" style={{ gap: '8px', color: 'var(--color-warning)', marginBottom: '8px' }}>
            <FileCode size={18} />
            <h3 className="text-sm" style={{ fontWeight: 500 }}>Orphan Files</h3>
          </div>
          <p className="text-xl" style={{ fontWeight: 600 }}>{insights.orphanFiles.length}</p>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-panel)' }}>
          <div className="flex-center" style={{ gap: '8px', color: 'var(--accent-blue)', marginBottom: '8px' }}>
            <Network size={18} />
            <h3 className="text-sm" style={{ fontWeight: 500 }}>Average Fan-In</h3>
          </div>
          <p className="text-xl" style={{ fontWeight: 600 }}>{insights.averageFanIn.toFixed(2)}</p>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-panel)' }}>
          <div className="flex-center" style={{ gap: '8px', color: 'var(--color-success)', marginBottom: '8px' }}>
            <Layers size={18} />
            <h3 className="text-sm" style={{ fontWeight: 500 }}>Max Depth Chain</h3>
          </div>
          <p className="text-xl" style={{ fontWeight: 600 }}>{insights.longestDependencyChain}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Dependency Hotspots */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-panel)' }}>
          <h3 className="text-base" style={{ fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link size={16} color="var(--accent-blue)" />
            Dependency Hotspots (Top Fan-In)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {insights.hotspots.map((h, i) => (
              <div key={i} className="flex-between text-sm" style={{ padding: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '6px' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '16px' }}>
                  {h.id.substring(h.id.lastIndexOf('/') + 1)}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{h.inDegree}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Active Git Files */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-panel)' }}>
          <h3 className="text-base" style={{ fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitCommit size={16} color="var(--color-success)" />
            Most Active Git Files
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {insights.mostActiveGitFiles.map((h, i) => (
              <div key={i} className="flex-between text-sm" style={{ padding: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '6px' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '16px' }}>
                  {h.path.substring(h.path.lastIndexOf('/') + 1)}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>{h.count} commits</span>
              </div>
            ))}
          </div>
        </div>

        {/* Largest Modules */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-panel)' }}>
          <h3 className="text-base" style={{ fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="var(--color-warning)" />
            Largest Modules
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {insights.largestModules.map((m, i) => (
              <div key={i} className="flex-between text-sm" style={{ padding: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '6px' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '16px' }}>
                  {m.path || '/'}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{(m.size / 1024).toFixed(1)} KB</span>
              </div>
            ))}
          </div>
        </div>

        {/* File Type Distribution */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-panel)' }}>
          <h3 className="text-base" style={{ fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCode size={16} color="#8b5cf6" />
            File Type Distribution
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {insights.fileTypeDistribution.slice(0, 15).map((f, i) => (
              <div key={i} className="flex-center text-sm" style={{ padding: '6px 12px', backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ marginRight: '8px', fontWeight: 500, color: 'var(--text-secondary)' }}>{f.extension}</span>
                <span style={{ fontWeight: 600 }}>{f.count}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
