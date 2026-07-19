import React, { useEffect, useState } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { listSessions, loadSession } from '../../lib/sessionEngine';
import type { AnalysisSession } from '../../lib/sessionEngine';
import { X, ArrowRight } from 'lucide-react';

export const CompareSnapshots: React.FC = () => {
  const { isCompareModalOpen, setCompareModalOpen } = useRepositoryStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionA, setSessionA] = useState<AnalysisSession | null>(null);
  const [sessionB, setSessionB] = useState<AnalysisSession | null>(null);

  useEffect(() => {
    if (isCompareModalOpen) {
      listSessions().then(setSessions);
    } else {
      setSessionA(null);
      setSessionB(null);
    }
  }, [isCompareModalOpen]);

  const handleSelectA = async (id: string) => {
    if (!id) return setSessionA(null);
    const s = await loadSession(id);
    setSessionA(s || null);
  };

  const handleSelectB = async (id: string) => {
    if (!id) return setSessionB(null);
    const s = await loadSession(id);
    setSessionB(s || null);
  };

  if (!isCompareModalOpen) return null;

  const getDiff = (a: number, b: number) => {
    const diff = b - a;
    if (diff > 0) return <span style={{ color: 'var(--color-danger)' }}>+{diff}</span>;
    if (diff < 0) return <span style={{ color: 'var(--color-success)' }}>{diff}</span>;
    return <span style={{ color: 'var(--text-tertiary)' }}>No change</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="glass-panel" style={{ width: '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-default)', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        <div className="flex-between" style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-lg" style={{ fontWeight: 600 }}>Compare Repository Snapshots</h2>
          <button onClick={() => setCompareModalOpen(false)} style={{ color: 'var(--text-tertiary)', background: 'transparent' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '20px', display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <label className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Base Snapshot (A)</label>
            <select onChange={(e) => handleSelectA(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)' }}>
              <option value="">Select Session...</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name} ({new Date(s.timestamp).toLocaleString()})</option>)}
            </select>
          </div>
          <div className="flex-center" style={{ paddingTop: '24px', color: 'var(--text-tertiary)' }}><ArrowRight size={20} /></div>
          <div style={{ flex: 1 }}>
            <label className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Target Snapshot (B)</label>
            <select onChange={(e) => handleSelectB(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)' }}>
              <option value="">Select Session...</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name} ({new Date(s.timestamp).toLocaleString()})</option>)}
            </select>
          </div>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, backgroundColor: 'var(--bg-panel)' }}>
          {!sessionA || !sessionB ? (
            <div className="flex-center text-sm" style={{ color: 'var(--text-tertiary)', padding: '40px' }}>
              Select two sessions to compare architecture metrics.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '16px', padding: '12px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600, color: 'var(--text-secondary)' }} className="text-sm">
                <span>Metric</span>
                <span>Base (A)</span>
                <span>Target (B)</span>
                <span>Difference</span>
              </div>

              {[
                { label: 'Total Files', a: sessionA.metadata.statistics.totalFiles, b: sessionB.metadata.statistics.totalFiles },
                { label: 'Total Commits', a: sessionA.metadata.statistics.totalCommits, b: sessionB.metadata.statistics.totalCommits },
                { label: 'Dependencies', a: sessionA.dependencies?.edges.length || 0, b: sessionB.dependencies?.edges.length || 0 },
                { label: 'Circular Dependencies', a: sessionA.insights?.circularDependencies.length || 0, b: sessionB.insights?.circularDependencies.length || 0 },
                { label: 'Orphan Files', a: sessionA.insights?.orphanFiles.length || 0, b: sessionB.insights?.orphanFiles.length || 0 },
                { label: 'Average Fan-In', a: sessionA.insights?.averageFanIn || 0, b: sessionB.insights?.averageFanIn || 0, isFloat: true },
                { label: 'Max Depth', a: sessionA.insights?.longestDependencyChain || 0, b: sessionB.insights?.longestDependencyChain || 0 },
              ].map((row, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '16px', padding: '12px', backgroundColor: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }} className="text-sm">
                  <span style={{ fontWeight: 500 }}>{row.label}</span>
                  <span>{row.isFloat ? row.a.toFixed(2) : row.a}</span>
                  <span>{row.isFloat ? row.b.toFixed(2) : row.b}</span>
                  <span style={{ fontWeight: 600 }}>{row.isFloat ? (row.b - row.a).toFixed(2) : getDiff(row.a, row.b)}</span>
                </div>
              ))}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
