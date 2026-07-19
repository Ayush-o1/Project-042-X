import React, { useEffect, useState, useRef } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { Search, FileCode2, FileJson, Image as ImageIcon, File } from 'lucide-react';
export const CommandPalette: React.FC = () => {
  const { commandPaletteOpen, setCommandPaletteOpen, files, setActiveFile } = useRepositoryStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  const filteredFiles = files.filter(f => !f.isDirectory && f.path.toLowerCase().includes(query.toLowerCase())).slice(0, 50);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!commandPaletteOpen) return;
      
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredFiles[selectedIndex]) {
        setActiveFile(filteredFiles[selectedIndex]);
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, filteredFiles, selectedIndex, setActiveFile, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const getIcon = (ext?: string) => {
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext || '')) return <FileCode2 size={16} color="var(--accent-blue)" />;
    if (['.json', '.md'].includes(ext || '')) return <FileJson size={16} color="var(--color-success)" />;
    if (['.png', '.jpg', '.svg'].includes(ext || '')) return <ImageIcon size={16} color="#8b5cf6" />;
    return <File size={16} color="var(--text-tertiary)" />;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingTop: '15vh',
      zIndex: 1000,
    }} onClick={() => setCommandPaletteOpen(false)}>
      <div 
        className="glass-panel"
        style={{ width: '600px', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-panel)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}>
          <Search size={20} color="var(--text-secondary)" style={{ marginRight: '12px' }} />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search files by name... (Cmd+P)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ flex: 1, fontSize: '16px', color: 'var(--text-primary)', background: 'transparent', outline: 'none', border: 'none' }}
          />
          <div className="text-xs" style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)', padding: '2px 6px', borderRadius: '4px' }}>ESC</div>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px 0' }}>
          {filteredFiles.length === 0 ? (
            <div className="text-sm" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No files found.</div>
          ) : (
            filteredFiles.map((f, i) => (
              <div 
                key={f.path}
                className="flex-between"
                onClick={() => { setActiveFile(f); setCommandPaletteOpen(false); }}
                style={{
                  padding: '12px 20px',
                  backgroundColor: i === selectedIndex ? 'var(--accent-blue-bg)' : 'transparent',
                  color: i === selectedIndex ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                  {getIcon(f.extension)}
                  <span className="text-sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {f.path.substring(f.path.lastIndexOf('/') + 1)}
                  </span>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {f.path}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
