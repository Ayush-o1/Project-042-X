import React, { useState } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { FolderGit2, Search, Play, XCircle } from 'lucide-react';

export const Header: React.FC = () => {
  const [path, setPath] = useState('');
  const { analyze, metadata, isAnalyzing, analysisProgress, cancelAnalysis } = useRepositoryStore();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (path.trim() && !isAnalyzing) {
      analyze(path.trim());
    }
  };

  return (
    <header className="flex-between" style={{
      padding: '0 20px',
      height: '60px',
      backgroundColor: 'var(--bg-app)',
      borderBottom: '1px solid var(--border-default)',
      position: 'relative'
    }}>
      <div className="flex-center" style={{ gap: '10px', width: '250px' }}>
        <FolderGit2 size={20} color="var(--accent-blue)" />
        <h1 className="text-base" style={{ fontWeight: 600 }}>Project 042-X</h1>
      </div>

      <form onSubmit={handleAnalyze} className="flex-center" style={{ gap: '8px', flex: 1, maxWidth: '500px', margin: '0 20px' }}>
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
        {isAnalyzing ? (
          <button 
            type="button" 
            onClick={cancelAnalysis}
            className="flex-center"
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--color-danger)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              gap: '6px'
            }}
          >
            <XCircle size={14} />
            Cancel
          </button>
        ) : (
          <button 
            type="submit" 
            disabled={!path.trim()}
            className="btn-primary"
          >
            <Play size={14} />
            Analyze
          </button>
        )}
      </form>

      <div className="flex-center text-xs" style={{ color: 'var(--text-tertiary)', gap: '16px', width: '250px', justifyContent: 'flex-end' }}>
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

      {/* Progress Bar overlay at bottom of header */}
      {isAnalyzing && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '2px',
          width: `${analysisProgress}%`,
          backgroundColor: 'var(--accent-blue)',
          transition: 'width 300ms ease'
        }} />
      )}
    </header>
  );
};
