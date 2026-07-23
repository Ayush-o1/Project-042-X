import React, { useEffect, useRef, useState } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { useShallow } from 'zustand/react/shallow';
import {
  listSessions, loadSession, deleteSession,
  exportSessionToFile, importSessionFromFile
} from '../../lib/sessionEngine';
import type { AnalysisSession } from '../../lib/sessionEngine';
import {
  Download, Trash2, FolderOpen, Upload,
  X, Loader2, Clock, Archive
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useDelayedFocus } from '../../hooks/useDelayedFocus';

type SessionSummary = Omit<AnalysisSession, 'files' | 'dependencies' | 'git' | 'insights'>;

export const SessionHistory: React.FC = () => {
  const { isSessionHistoryOpen, setSessionHistoryOpen, loadSessionIntoStore } = useRepositoryStore(
    useShallow(s => ({
      isSessionHistoryOpen: s.isSessionHistoryOpen,
      setSessionHistoryOpen: s.setSessionHistoryOpen,
      loadSessionIntoStore: s.loadSessionIntoStore,
    })),
  );
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (isSessionHistoryOpen) refreshSessions();
    // refreshSessions is a plain function recreated every render (it now
    // closes over `toast`, whose own context value is a new object on every
    // ToastProvider render). Depending on it would re-fetch the session list
    // whenever any toast fires anywhere in the app, not just when this modal
    // opens — only isSessionHistoryOpen should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSessionHistoryOpen]);

  useDelayedFocus(closeRef, isSessionHistoryOpen);

  useEffect(() => {
    if (!isSessionHistoryOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSessionHistoryOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSessionHistoryOpen, setSessionHistoryOpen]);

  useFocusTrap(sheetRef, isSessionHistoryOpen);

  const refreshSessions = async () => {
    try {
      const list = await listSessions();
      setSessions(list as SessionSummary[]);
    } catch {
      toast.error('Could not list sessions', 'Failed to read from IndexedDB.');
    }
  };

  const handleLoad = async (id: string) => {
    setIsLoading(true);
    try {
      const session = await loadSession(id);
      if (session) {
        loadSessionIntoStore(session);
        setSessionHistoryOpen(false);
        toast.success('Session loaded', `"${session.name}" analysis restored.`);
      }
    } catch {
      toast.error('Load failed', 'Could not read session from IndexedDB.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (deletingId === id) {
      try {
        await deleteSession(id);
        await refreshSessions();
        toast.info('Session deleted', `"${name}" removed.`);
      } catch {
        toast.error('Delete failed', 'Could not remove the session from IndexedDB.');
      } finally {
        setDeletingId(null);
      }
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(prev => prev === id ? null : prev), 3000);
    }
  };

  const handleExport = async (id: string, name: string) => {
    try {
      await exportSessionToFile(id);
      toast.success('Session exported', `"${name}" saved as JSON file.`);
    } catch {
      toast.error('Export failed', 'Could not export session file.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const id = await importSessionFromFile(file);
      const session = await loadSession(id);
      if (session) {
        loadSessionIntoStore(session);
        setSessionHistoryOpen(false);
        toast.success('Session imported', `"${session.name}" analysis loaded.`);
      }
    } catch {
      toast.error('Import failed', 'Invalid session file format.');
    } finally {
      setIsLoading(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      + ' · '
      + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  if (!isSessionHistoryOpen) return null;

  return (
    <div
      className="modal-overlay centered"
      onClick={e => { if (e.target === e.currentTarget) setSessionHistoryOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sessions-title"
    >
      <div ref={sheetRef} className="modal-sheet" style={{ width: 580, maxHeight: '80vh' }}>

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div className="icon-tile icon-tile-md">
              <Clock size={14} />
            </div>
            <h2 id="sessions-title" className="modal-title">Analysis Sessions</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <label className="link-action">
              <Upload size={13} />
              Import
              <input
                ref={importRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
                aria-label="Import session file"
              />
            </label>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setSessionHistoryOpen(false)}
              className="btn-icon btn-icon-md"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {isLoading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-20)',
                gap: 'var(--space-4)',
              }}
            >
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>Loading session…</span>
            </div>
          ) : sessions.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-20)',
                gap: 'var(--space-6)',
                color: 'var(--text-tertiary)',
              }}
            >
              <Archive size={32} style={{ opacity: 0.3 }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginBottom: 'var(--space-2)', color: 'var(--text-secondary)' }}>
                  No saved sessions
                </p>
                <p style={{ fontSize: 'var(--text-xs)', lineHeight: 'var(--leading-relaxed)' }}>
                  Use <strong style={{ color: 'var(--text-secondary)' }}>Save</strong> in the header or <kbd className="kbd">⌘S</kbd> to snapshot<br />a repository analysis for later.
                </p>
              </div>
            </div>
          ) : (
            sessions.map(s => {
              const isConfirmingDelete = deletingId === s.id;
              return (
                <div
                  key={s.id}
                  className={`session-row${isConfirmingDelete ? ' confirming' : ''}`}
                >
                  {/* Session info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                      {s.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                        {s.path}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                      {formatDate(s.timestamp)}
                      {s.metadata?.statistics?.totalFiles && (
                        <> · <span style={{ color: 'var(--text-secondary)' }}>{s.metadata.statistics.totalFiles} files</span></>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleLoad(s.id)}
                      className="btn-icon btn-icon-md"
                      title="Load session"
                      aria-label={`Load session ${s.name}`}
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <FolderOpen size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport(s.id, s.name)}
                      className="btn-icon btn-icon-md"
                      title="Export as JSON"
                      aria-label={`Export session ${s.name}`}
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <Download size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id, s.name)}
                      className="btn-icon btn-icon-md"
                      title={isConfirmingDelete ? 'Click again to confirm delete' : 'Delete session'}
                      aria-label={`Delete session ${s.name}`}
                      style={{
                        color: isConfirmingDelete ? 'var(--color-danger)' : 'var(--text-tertiary)',
                        background: isConfirmingDelete ? 'var(--color-danger-subtle)' : 'transparent',
                        borderRadius: 'var(--radius-lg)',
                        transition: 'color var(--duration-fast), background var(--duration-fast)',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
