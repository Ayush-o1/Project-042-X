import React, { useEffect, useRef, useState } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { useShallow } from 'zustand/react/shallow';
import { listSessions, loadSession } from '../../lib/sessionEngine';
import type { AnalysisSession } from '../../lib/sessionEngine';
import { X, ArrowRight, GitCompare, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useDelayedFocus } from '../../hooks/useDelayedFocus';
import { useToast } from '../../hooks/useToast';

type SessionSummary = { id: string; name: string; timestamp: string; path: string };

interface DiffRow {
  label: string;
  a: number;
  b: number;
  isFloat?: boolean;
  lowerIsBetter?: boolean;
}

const DiffCell: React.FC<{ a: number; b: number; isFloat?: boolean; lowerIsBetter?: boolean }> = ({
  a, b, isFloat, lowerIsBetter,
}) => {
  const diff = b - a;
  const improved = lowerIsBetter ? diff < 0 : diff > 0;
  const regressed = lowerIsBetter ? diff > 0 : diff < 0;

  if (diff === 0)
    return <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}><Minus size={12} /> —</span>;

  const formatted = isFloat ? `${diff > 0 ? '+' : ''}${diff.toFixed(2)}` : `${diff > 0 ? '+' : ''}${diff}`;
  const color = improved ? 'var(--color-success)' : regressed ? 'var(--color-danger)' : 'var(--text-tertiary)';
  const Icon = improved ? TrendingUp : TrendingDown;

  return (
    <span style={{ color, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 'var(--weight-semibold)' }}>
      <Icon size={12} />
      {formatted}
    </span>
  );
};

export const CompareSnapshots: React.FC = () => {
  const { isCompareModalOpen, setCompareModalOpen } = useRepositoryStore(
    useShallow(s => ({ isCompareModalOpen: s.isCompareModalOpen, setCompareModalOpen: s.setCompareModalOpen })),
  );
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionA, setSessionA] = useState<AnalysisSession | null>(null);
  const [sessionB, setSessionB] = useState<AnalysisSession | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useDelayedFocus(closeRef, isCompareModalOpen);

  useEffect(() => {
    if (isCompareModalOpen) {
      listSessions()
        .then(list => setSessions(list as SessionSummary[]))
        .catch(() => toast.error('Could not list sessions', 'Failed to read from IndexedDB.'));
    } else {
      setSessionA(null);
      setSessionB(null);
    }
    // Deliberately omits `toast`: the context value it comes from is a new
    // object on every ToastProvider render (any toast firing anywhere in the
    // app), and re-running this effect on that would re-fetch the session
    // list every time an unrelated toast pops up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompareModalOpen]);

  useEffect(() => {
    if (!isCompareModalOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setCompareModalOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isCompareModalOpen, setCompareModalOpen]);

  useFocusTrap(sheetRef, isCompareModalOpen);

  const handleSelectA = async (id: string) => {
    if (!id) return setSessionA(null);
    setLoadingA(true);
    try {
      const s = await loadSession(id);
      setSessionA(s || null);
    } catch {
      toast.error('Could not load snapshot', 'Failed to read the session from IndexedDB.');
      setSessionA(null);
    } finally {
      setLoadingA(false);
    }
  };

  const handleSelectB = async (id: string) => {
    if (!id) return setSessionB(null);
    setLoadingB(true);
    try {
      const s = await loadSession(id);
      setSessionB(s || null);
    } catch {
      toast.error('Could not load snapshot', 'Failed to read the session from IndexedDB.');
      setSessionB(null);
    } finally {
      setLoadingB(false);
    }
  };

  if (!isCompareModalOpen) return null;

  const diffRows: DiffRow[] = sessionA && sessionB ? [
    { label: 'Total Files',           a: sessionA.metadata.statistics.totalFiles,      b: sessionB.metadata.statistics.totalFiles },
    { label: 'Total Commits',         a: sessionA.metadata.statistics.totalCommits,     b: sessionB.metadata.statistics.totalCommits },
    { label: 'Dependencies',          a: sessionA.dependencies?.edges.length || 0,      b: sessionB.dependencies?.edges.length || 0 },
    { label: 'Circular Dependencies', a: sessionA.insights?.circularDependencies.length || 0, b: sessionB.insights?.circularDependencies.length || 0, lowerIsBetter: true },
    { label: 'Orphan Files',          a: sessionA.insights?.orphanFiles.length || 0,    b: sessionB.insights?.orphanFiles.length || 0, lowerIsBetter: true },
    { label: 'Average Fan-In',        a: sessionA.insights?.averageFanIn || 0,          b: sessionB.insights?.averageFanIn || 0, isFloat: true },
    { label: 'Max Dependency Depth',  a: sessionA.insights?.longestDependencyChain || 0, b: sessionB.insights?.longestDependencyChain || 0 },
  ] : [];

  return (
    <div
      className="modal-overlay centered"
      onClick={e => { if (e.target === e.currentTarget) setCompareModalOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-title"
    >
      <div ref={sheetRef} className="modal-sheet" style={{ width: 720, maxHeight: '85vh' }}>

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div className="icon-tile icon-tile-md">
              <GitCompare size={14} />
            </div>
            <h2 id="compare-title" className="modal-title">Compare Snapshots</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setCompareModalOpen(false)}
            className="btn-icon btn-icon-md"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Session pickers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'end',
            gap: 'var(--space-4)',
            padding: 'var(--space-6) var(--space-10)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          {/* Picker A */}
          <div>
            <label
              htmlFor="session-a"
              style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', fontWeight: 'var(--weight-medium)' }}
            >
              Base Snapshot (A)
            </label>
            <select id="session-a" className="select" onChange={e => handleSelectA(e.target.value)} disabled={loadingA}>
              <option value="">Select session…</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} · {new Date(s.timestamp).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <ArrowRight size={18} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />

          {/* Picker B */}
          <div>
            <label
              htmlFor="session-b"
              style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', fontWeight: 'var(--weight-medium)' }}
            >
              Target Snapshot (B)
            </label>
            <select id="session-b" className="select" onChange={e => handleSelectB(e.target.value)} disabled={loadingB}>
              <option value="">Select session…</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} · {new Date(s.timestamp).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Diff table */}
        <div className="modal-body">
          {!sessionA || !sessionB ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-16)',
                gap: 'var(--space-4)',
                color: 'var(--text-tertiary)',
              }}
            >
              <GitCompare size={28} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
                Select two sessions above to compare their metrics
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {/* Table header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-3) var(--space-5)',
                  borderBottom: '1px solid var(--border-default)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                {['Metric', 'Base (A)', 'Target (B)', 'Δ Difference'].map(h => (
                  <span
                    key={h}
                    style={{
                      fontSize: 'var(--text-2xs)',
                      fontWeight: 'var(--weight-semibold)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {h}
                  </span>
                ))}
              </div>

              {/* Table rows */}
              {diffRows.map((row, i) => (
                <div
                  key={i}
                  className="hover-row-surface"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    gap: 'var(--space-4)',
                    padding: 'var(--space-4) var(--space-5)',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>
                    {row.label}
                  </span>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {row.isFloat ? row.a.toFixed(2) : row.a}
                  </span>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {row.isFloat ? row.b.toFixed(2) : row.b}
                  </span>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    <DiffCell a={row.a} b={row.b} isFloat={row.isFloat} lowerIsBetter={row.lowerIsBetter} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
