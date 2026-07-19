import React, { useEffect, useState } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { listSessions, loadSession, deleteSession, exportSessionToFile, importSessionFromFile } from '../../lib/sessionEngine';
import { Download, Trash2, FolderOpen, Upload, X } from 'lucide-react';

export const SessionHistory: React.FC = () => {
  const { isSessionHistoryOpen, setSessionHistoryOpen, loadSessionIntoStore } = useRepositoryStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isSessionHistoryOpen) {
      refreshSessions();
    }
  }, [isSessionHistoryOpen]);

  const refreshSessions = async () => {
    const list = await listSessions();
    setSessions(list);
  };

  const handleLoad = async (id: string) => {
    setIsLoading(true);
    const session = await loadSession(id);
    if (session) {
      loadSessionIntoStore(session);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    await refreshSessions();
  };

  const handleExport = async (id: string) => {
    await exportSessionToFile(id);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsLoading(true);
      try {
        const id = await importSessionFromFile(file);
        await handleLoad(id);
      } catch (err) {
        console.error("Failed to import session", err);
      }
      setIsLoading(false);
    }
  };

  if (!isSessionHistoryOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="glass-panel" style={{ width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-default)', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        <div className="flex-between" style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-lg" style={{ fontWeight: 600 }}>Analysis Sessions</h2>
          <button onClick={() => setSessionHistoryOpen(false)} style={{ color: 'var(--text-tertiary)', background: 'transparent' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div className="flex-between" style={{ marginBottom: '12px' }}>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Saved Snapshots</span>
            <label className="text-sm cursor-pointer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-blue)', background: 'transparent' }}>
              <Upload size={14} /> Import Session
              <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            </label>
          </div>

          {isLoading ? (
            <div className="flex-center" style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading session...</div>
          ) : sessions.length === 0 ? (
            <div className="flex-center" style={{ padding: '40px', color: 'var(--text-tertiary)' }}>No saved sessions found.</div>
          ) : (
            sessions.map(s => (
              <div key={s.id} className="flex-between" style={{ padding: '16px', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <h3 className="text-base" style={{ fontWeight: 500 }}>{s.name}</h3>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    {new Date(s.timestamp).toLocaleString()} • {s.path}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleLoad(s.id)} title="Load Session" style={{ padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                    <FolderOpen size={16} />
                  </button>
                  <button onClick={() => handleExport(s.id)} title="Export File" style={{ padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                    <Download size={16} />
                  </button>
                  <button onClick={() => handleDelete(s.id)} title="Delete" style={{ padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', color: 'var(--color-danger)' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
