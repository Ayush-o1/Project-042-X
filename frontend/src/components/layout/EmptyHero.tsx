import React, { useEffect, useState } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../../hooks/useToast';
import { listSessions, loadSession } from '../../lib/sessionEngine';
import type { AnalysisSession } from '../../lib/sessionEngine';
import {
  Network, GitBranch, BarChart2, FileCode,
  FolderGit2, ArrowRight, Terminal, Zap,
  Clock, FolderOpen
} from 'lucide-react';

type SessionSummary = Omit<AnalysisSession, 'files' | 'dependencies' | 'git' | 'insights'>;

const RECENT_SESSIONS_SHOWN = 4;

const FEATURE_ITEMS = [
  { icon: <Network  size={16} />, title: 'AST Dependency Graph', desc: 'Interactive visualization of every import' },
  { icon: <GitBranch size={16} />, title: 'Git Timeline',         desc: 'Full commit history with branch topology' },
  { icon: <BarChart2 size={16} />, title: 'Insights Engine',      desc: 'Circular deps, hotspots, fan-in metrics' },
  { icon: <FileCode  size={16} />, title: 'Code Viewer',          desc: 'Syntax-highlighted source exploration' },
  { icon: <Zap       size={16} />, title: 'Session Persistence',  desc: 'IndexedDB snapshots, no re-analysis' },
  { icon: <Terminal  size={16} />, title: 'Export Engine',        desc: 'PDF, Markdown, JSON, PNG, SVG' },
];

/** The landing state shown when no repository is loaded — a short pitch,
 *  the "Analyze a Repository" call to action, recent sessions for a
 *  returning user (if any), and a feature grid otherwise. */
export const EmptyHero: React.FC = () => {
  const { loadSessionIntoStore, setSessionHistoryOpen } = useRepositoryStore(
    useShallow(s => ({
      loadSessionIntoStore: s.loadSessionIntoStore,
      setSessionHistoryOpen: s.setSessionHistoryOpen,
    })),
  );
  const toast = useToast();
  const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    listSessions().then(list => setRecentSessions(list as SessionSummary[])).catch(() => {
      // No saved sessions yet, or IndexedDB is unavailable — the hero's
      // feature grid is a perfectly good empty state, so this fails silently.
    });
  }, []);

  const handleOpenRecent = async (id: string) => {
    try {
      const session = await loadSession(id);
      if (session) {
        loadSessionIntoStore(session);
        toast.success('Session restored', `"${session.name}" loaded from IndexedDB.`);
      }
    } catch {
      toast.error('Could not load session', 'Failed to read the snapshot from IndexedDB.');
    }
  };

  const focusPathInput = () => {
    document.getElementById('repo-path-input')?.focus();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100%',
        overflowY: 'auto',
        padding: 'var(--space-20) var(--space-12)',
        gap: 'var(--space-16)',
        animation: 'fade-in 400ms ease-out',
      }}
    >
      {/* Hero */}
      <div style={{ textAlign: 'center', maxWidth: 480, marginTop: 'auto' }}>
        <div
          style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(129,140,248,0.08))',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 'var(--radius-3xl)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-8)',
            boxShadow: '0 0 40px rgba(99,102,241,0.12)',
          }}
        >
          <FolderGit2 size={28} color="var(--accent)" />
        </div>

        <h1
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--weight-bold)',
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            marginBottom: 'var(--space-4)',
            lineHeight: 'var(--leading-tight)',
          }}
        >
          Repository Intelligence
        </h1>
        <p style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--text-tertiary)',
          lineHeight: 'var(--leading-relaxed)',
          marginBottom: 'var(--space-8)',
        }}>
          Point 042-X at any local Git repository to parse every file, extract
          its dependency graph, and reveal the full structure of your codebase
          — entirely on your machine.
        </p>

        <button
          type="button"
          onClick={focusPathInput}
          className="btn btn-primary btn-md"
        >
          Analyze a Repository
          <ArrowRight size={14} />
        </button>
        <p style={{
          fontSize: 'var(--text-2xs)',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
          marginTop: 'var(--space-4)',
        }}>
          Enter an absolute path in the bar above, e.g. /Users/you/your-project
        </p>
      </div>

      {/* Recent repositories — only for returning users with saved sessions */}
      {recentSessions.length > 0 && (
        <div style={{ width: '100%', maxWidth: 720 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)' }}>
              <Clock size={13} />
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)' }}>Recent Repositories</span>
            </div>
            {recentSessions.length > RECENT_SESSIONS_SHOWN && (
              <button
                type="button"
                onClick={() => setSessionHistoryOpen(true)}
                className="link-action"
                style={{ fontSize: 'var(--text-2xs)' }}
              >
                View all {recentSessions.length}
              </button>
            )}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            {recentSessions.slice(0, RECENT_SESSIONS_SHOWN).map(session => (
              <button
                key={session.id}
                type="button"
                onClick={() => handleOpenRecent(session.id)}
                className="feature-card"
                style={{ textAlign: 'left', cursor: 'pointer' }}
              >
                <span style={{ color: 'var(--accent)' }}><FolderOpen size={16} /></span>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {session.name}
                  </div>
                  <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>
                    {session.metadata.statistics.totalFiles} files · {formatDate(session.timestamp)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feature grid */}
      <div style={{ width: '100%', maxWidth: 600, marginBottom: 'auto' }}>
        {recentSessions.length > 0 && (
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            What 042-X Can Do
          </div>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 'var(--space-4)',
            width: '100%',
          }}
        >
          {FEATURE_ITEMS.map(item => (
            <div key={item.title} className="feature-card">
              <span style={{ color: 'var(--accent)' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginBottom: 2 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', lineHeight: 'var(--leading-relaxed)' }}>
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
