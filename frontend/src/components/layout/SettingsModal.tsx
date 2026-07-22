import React, { useEffect, useRef } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { useShallow } from 'zustand/react/shallow';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { label: 'Command Palette',  keys: ['⌘', 'K'] },
  { label: 'Save Session',     keys: ['⌘', 'S'] },
  { label: 'Export PDF',       keys: ['⌘', '⇧', 'E'] },
];

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, setSettingsOpen } = useRepositoryStore(
    useShallow(s => ({ isSettingsOpen: s.isSettingsOpen, setSettingsOpen: s.setSettingsOpen })),
  );
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isSettingsOpen) {
      setTimeout(() => closeRef.current?.focus(), 50);
    }
  }, [isSettingsOpen]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSettingsOpen, setSettingsOpen]);

  if (!isSettingsOpen) return null;

  return (
    <div
      className="modal-overlay centered"
      onClick={e => { if (e.target === e.currentTarget) setSettingsOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="modal-sheet" style={{ width: 480 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div
              style={{
                width: 28, height: 28,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-tertiary)',
              }}
            >
              <Keyboard size={14} />
            </div>
            <h2 id="settings-title" className="modal-title">Keyboard Shortcuts</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="btn-icon btn-icon-md"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {SHORTCUTS.map(({ label, keys }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-4) var(--space-5)',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  {label}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  {keys.map((k, i) => (
                    <kbd key={i} className="kbd">{k}</kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 'var(--space-8)',
              padding: 'var(--space-5)',
              background: 'var(--accent-muted)',
              border: '1px solid rgba(99,102,241,0.12)',
              borderRadius: 'var(--radius-xl)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              lineHeight: 'var(--leading-relaxed)',
            }}
          >
            <span style={{ color: 'var(--accent-hover)', fontWeight: 'var(--weight-medium)' }}>Tip: </span>
            Use <kbd className="kbd">⌘K</kbd> anywhere in the app to open the Command Palette
            and quickly jump to any file.
          </div>
        </div>
      </div>
    </div>
  );
};
