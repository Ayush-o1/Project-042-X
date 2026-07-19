import React from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { X } from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, setSettingsOpen } = useRepositoryStore();

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="glass-panel" style={{ width: '500px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-default)', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        <div className="flex-between" style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-lg" style={{ fontWeight: 600 }}>Preferences</h2>
          <button onClick={() => setSettingsOpen(false)} style={{ color: 'var(--text-tertiary)', background: 'transparent' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <h3 className="text-sm" style={{ fontWeight: 600, marginBottom: '8px' }}>Keyboard Shortcuts</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div className="flex-between text-sm" style={{ padding: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Command Palette</span>
                <kbd style={{ backgroundColor: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>Cmd + K</kbd>
              </div>
              <div className="flex-between text-sm" style={{ padding: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Close File</span>
                <kbd style={{ backgroundColor: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>Cmd + W</kbd>
              </div>
              <div className="flex-between text-sm" style={{ padding: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Save Session</span>
                <kbd style={{ backgroundColor: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>Cmd + S</kbd>
              </div>
              <div className="flex-between text-sm" style={{ padding: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Export PDF</span>
                <kbd style={{ backgroundColor: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>Cmd + Shift + E</kbd>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};
