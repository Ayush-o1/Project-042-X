import React, { useEffect, useRef, useState } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../../hooks/useToast';
import { PUBLIC_DEMO_MODE } from '../../lib/config';
import { listSessions, loadSession } from '../../lib/sessionEngine';
import type { AnalysisSession } from '../../lib/sessionEngine';
import { FolderGit2, ArrowRight, Clock, FolderOpen, UploadCloud } from 'lucide-react';

type SessionSummary = Omit<AnalysisSession, 'files' | 'dependencies' | 'git' | 'insights'>;

const RECENT_SESSIONS_SHOWN = 4;

// Demo deployments reject local filesystem paths server-side, so the
// example/placeholder copy only ever suggests what will actually work.
const EXAMPLE_INPUTS = PUBLIC_DEMO_MODE
  ? ['https://github.com/vercel/next.js', 'https://github.com/expressjs/express']
  : ['/Users/ayush/Desktop/MyProject', 'https://github.com/vercel/next.js'];

/** The landing state shown when no repository is loaded. The repository
 *  input is the hero itself — not a button that points up at the header's
 *  bar — since that's the one thing a first-time visitor needs to find in
 *  under three seconds. Recent sessions and a one-line capability summary
 *  exist underneath it, deliberately quiet, so nothing competes with it. */
export const EmptyHero: React.FC = () => {
  const { analyze, loadSessionIntoStore, setSessionHistoryOpen, goHome } = useRepositoryStore(
    useShallow(s => ({
      analyze: s.analyze,
      loadSessionIntoStore: s.loadSessionIntoStore,
      setSessionHistoryOpen: s.setSessionHistoryOpen,
      goHome: s.goHome,
    })),
  );
  const toast = useToast();
  const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([]);
  const [path, setPath] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  useEffect(() => {
    listSessions().then(list => setRecentSessions(list as SessionSummary[])).catch(() => {
      // No saved sessions yet, or IndexedDB is unavailable — the hero works
      // perfectly well without this section, so this fails silently.
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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (path.trim()) analyze(path.trim());
  };

  /** Fills the input and refocuses it. `cursorStart` is used for a dropped
   *  folder name — the user still needs to type the parent directory in
   *  front of it, so the cursor belongs at position 0, not the end. */
  const fillPath = (value: string, cursorStart = false) => {
    setPath(value);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      if (cursorStart) el.setSelectionRange(0, 0);
      else el.select();
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragOver(false);

    // A dragged link (e.g. a GitHub tab's address bar) arrives as text —
    // the one drop source that's a complete, immediately usable value.
    const uri = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')).trim();
    if (/^https?:\/\//i.test(uri)) {
      fillPath(uri);
      return;
    }

    // A dropped local folder: the browser's drag-and-drop and File APIs
    // deliberately never expose an absolute filesystem path (a security
    // boundary, not a gap in this integration) — only the folder's own
    // name is available. Pre-fill that and park the cursor at the start
    // so completing the path is just typing the parent directory in front.
    const entry = e.dataTransfer.items?.[0]?.webkitGetAsEntry?.();
    if (entry) {
      fillPath(entry.name, true);
      if (entry.isDirectory) {
        toast.info('Complete the path', `Browsers can't reveal a folder's full location — finish typing the path in front of "${entry.name}".`);
      }
      return;
    }

    const file = e.dataTransfer.files?.[0];
    if (file) fillPath(file.name, true);
  };

  const placeholder = PUBLIC_DEMO_MODE
    ? 'Paste a public GitHub repository URL…'
    : 'Enter a local project path or GitHub repository URL…';

  const helperText = PUBLIC_DEMO_MODE
    ? 'Supports public GitHub repositories.'
    : 'Supports local folders and public GitHub repositories.';

  return (
    <div className="empty-hero">
      <div className="empty-hero-content">
        <div className="empty-hero-badge">
          <FolderGit2 size={28} color="var(--accent)" />
        </div>

        <h1 className="empty-hero-title">Repository Intelligence</h1>
        <p className="empty-hero-pitch">
          {PUBLIC_DEMO_MODE
            ? 'Point 042-X at any public GitHub repository to parse every file, extract its dependency graph, and reveal the full structure of the codebase.'
            : 'Point 042-X at any local Git repository — or a public GitHub URL — to parse every file, extract its dependency graph, and reveal the full structure of your codebase.'}
        </p>

        <form onSubmit={handleSubmit}>
          <div
            className={`empty-hero-dropzone${isDragOver ? ' drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              id="repo-path-input"
              type="text"
              value={path}
              onChange={e => setPath(e.target.value)}
              placeholder={placeholder}
              aria-label="Repository path or GitHub URL"
              className="empty-hero-input"
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="btn btn-primary btn-lg empty-hero-submit" disabled={!path.trim()}>
              Analyze Repository
              <ArrowRight size={16} />
            </button>
          </div>
          <p className="empty-hero-helper">
            {isDragOver ? (
              <><UploadCloud size={12} /> Drop to fill in the path</>
            ) : (
              helperText
            )}
          </p>
        </form>

        <div className="empty-hero-examples">
          {EXAMPLE_INPUTS.map(example => (
            <button
              key={example}
              type="button"
              className="empty-hero-example-chip"
              onClick={() => fillPath(example)}
              title={`Use "${example}"`}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Recent repositories — only for returning users with saved sessions.
          Deliberately smaller and lower on the page than the input above:
          a real secondary action, never competing with the primary one. */}
      {recentSessions.length > 0 && (
        <div className="empty-hero-recent">
          <div className="empty-hero-recent-header">
            <div className="empty-hero-recent-label">
              <Clock size={13} />
              <span>Recent Repositories</span>
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
          <div className="empty-hero-recent-grid">
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

      <p className="empty-hero-capabilities">
        AST dependency graphs · Git timeline · Insights engine · Code viewer
      </p>

      <button
        type="button"
        onClick={goHome}
        className="empty-hero-back-home"
        aria-label="Back to home page"
      >
        ← Back to home
      </button>
    </div>
  );
};
