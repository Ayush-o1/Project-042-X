import React, { useState } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { FolderGit2, Search, Play } from 'lucide-react';

export const Header: React.FC = () => {
  const [path, setPath] = useState('');
  const { analyze, metadata, isAnalyzing } = useRepositoryStore();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (path.trim()) {
      analyze(path.trim());
    }
  };

  return (
    <header className="flex-between" style={{
      padding: '0 20px',
      height: '60px',
      backgroundColor: 'var(--bg-app)',
      borderBottom: '1px solid var(--border-default)'
    }}>
      <div className="flex-center" style={{ gap: '10px' }}>
        <FolderGit2 size={20} color="var(--accent-blue)" />
        <h1 className="text-base" style={{ fontWeight: 600 }}>Project 042-X</h1>
      </div>

      <form onSubmit={handleAnalyze} className="flex-center" style={{ gap: '8px', width: '400px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Absolute Repository Path..."
            value={path}
            onChange={(e) => setPath(e.target.value)}
            disabled={isAnalyzing}
            className="text-sm"
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              transition: 'border-color 150ms ease, background-color 150ms ease'
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.backgroundColor = 'var(--bg-surface)'; }}
          />
        </div>
        <button 
          type="submit" 
          disabled={isAnalyzing || !path.trim()}
          className="btn-primary"
        >
          <Play size={14} />
          {isAnalyzing ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>

      <div className="flex-center text-xs" style={{ color: 'var(--text-tertiary)', gap: '16px' }}>
        {metadata && (
          <>
            <span style={{ color: 'var(--text-secondary)' }}>{metadata.statistics.totalFiles} Files</span>
            <span style={{ color: 'var(--text-secondary)' }}>{metadata.statistics.totalCommits} Commits</span>
            <span style={{ color: 'var(--text-secondary)', padding: '2px 6px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px' }}>
              {metadata.statistics.predominantLanguage}
            </span>
          </>
        )}
      </div>
    </header>
  );
};
