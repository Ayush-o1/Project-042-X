import React, { useEffect, useRef, useState } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { useShallow } from 'zustand/react/shallow';
import {
  Search, FileCode2, FileJson, Image as ImageIcon,
  File, FileText, Command
} from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

const getFileIcon = (ext?: string): React.ReactNode => {
  if (['.ts', '.tsx'].includes(ext || '')) return <FileCode2 size={14} color="var(--lang-ts)" />;
  if (['.js', '.jsx'].includes(ext || '')) return <FileCode2 size={14} color="var(--lang-js)" />;
  if (['.json'].includes(ext || ''))       return <FileJson  size={14} color="var(--lang-json)" />;
  if (['.md', '.mdx'].includes(ext || '')) return <FileText  size={14} color="var(--text-tertiary)" />;
  if (['.png', '.jpg', '.svg', '.webp'].includes(ext || '')) return <ImageIcon size={14} color="var(--lang-image)" />;
  return <File size={14} color="var(--text-tertiary)" />;
};

const highlightMatch = (text: string, query: string) => {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'var(--accent-subtle)', color: 'var(--accent-hover)', borderRadius: 2 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
};

export const CommandPalette: React.FC = () => {
  const { commandPaletteOpen, setCommandPaletteOpen, files, setActiveFile } = useRepositoryStore(
    useShallow(s => ({
      commandPaletteOpen: s.commandPaletteOpen,
      setCommandPaletteOpen: s.setCommandPaletteOpen,
      files: s.files,
      setActiveFile: s.setActiveFile,
    })),
  );
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const filteredFiles = files
    .filter(f => !f.isDirectory && f.path.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 50);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!commandPaletteOpen) return;
      if (e.key === 'Escape')     { setCommandPaletteOpen(false); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(p => Math.min(p + 1, filteredFiles.length - 1)); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(p => Math.max(p - 1, 0)); }
      else if (e.key === 'Enter' && filteredFiles[selectedIndex]) {
        setActiveFile(filteredFiles[selectedIndex]);
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, filteredFiles, selectedIndex, setActiveFile, setCommandPaletteOpen]);

  useFocusTrap(sheetRef, commandPaletteOpen);

  if (!commandPaletteOpen) return null;

  const dirOf = (path: string) => {
    const i = path.lastIndexOf('/');
    return i > -1 ? path.slice(0, i) : '';
  };
  const nameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);

  return (
    <div
      className="modal-overlay"
      style={{ paddingTop: '14vh', alignItems: 'flex-start' }}
      onClick={() => setCommandPaletteOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="File search"
    >
      <div
        ref={sheetRef}
        className="modal-sheet animate-slide-up"
        style={{ width: 580 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
            padding: 'var(--space-4) var(--space-6)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <Search size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search files…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls="palette-results"
            aria-activedescendant={filteredFiles[selectedIndex] ? `palette-option-${selectedIndex}` : undefined}
            style={{
              flex: 1,
              fontSize: 'var(--text-base)',
              color: 'var(--text-primary)',
              background: 'transparent',
              outline: 'none',
              border: 'none',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
            <kbd className="kbd" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Command size={9} />K
            </kbd>
            <kbd className="kbd">ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="palette-results"
          role="listbox"
          style={{
            maxHeight: 380,
            overflowY: 'auto',
            padding: 'var(--space-2)',
          }}
        >
          {files.filter(f => !f.isDirectory).length === 0 ? (
            <div
              style={{
                padding: 'var(--space-16)',
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: 'var(--text-sm)',
              }}
            >
              No repository loaded. Enter a path in the header to begin.
            </div>
          ) : filteredFiles.length === 0 ? (
            <div
              style={{
                padding: 'var(--space-16)',
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: 'var(--text-sm)',
              }}
            >
              No files match "{query}"
            </div>
          ) : (
            filteredFiles.map((f, i) => {
              const isSelected = i === selectedIndex;
              const dir  = dirOf(f.path);
              const name = nameOf(f.path);
              return (
                <div
                  key={f.path}
                  id={`palette-option-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => { setActiveFile(f); setCommandPaletteOpen(false); }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-4)',
                    padding: 'var(--space-3) var(--space-5)',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: isSelected ? 'var(--bg-selected)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background var(--duration-fast)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', overflow: 'hidden', flex: 1 }}>
                    <span style={{ flexShrink: 0 }}>{getFileIcon(f.extension)}</span>
                    <span
                      style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--weight-medium)',
                        color: isSelected ? 'var(--accent-hover)' : 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flexShrink: 0,
                      }}
                    >
                      {highlightMatch(name, query)}
                    </span>
                    {dir && (
                      <span
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--text-tertiary)',
                          fontFamily: 'var(--font-mono)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {dir}
                      </span>
                    )}
                  </div>
                  {f.extension && (
                    <span className="badge badge-default" style={{ flexShrink: 0 }}>
                      {f.extension.slice(1)}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {filteredFiles.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-6)',
              padding: 'var(--space-3) var(--space-6)',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            {[
              { keys: ['↑', '↓'], label: 'Navigate' },
              { keys: ['↵'], label: 'Open' },
              { keys: ['Esc'], label: 'Close' },
            ].map(({ keys, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {keys.map(k => <kbd key={k} className="kbd">{k}</kbd>)}
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{label}</span>
              </div>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {filteredFiles.length} result{filteredFiles.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
