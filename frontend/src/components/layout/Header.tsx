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
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      backgroundColor: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <FolderGit2 size={24} color="var(--accent)" />
        <h1 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Project 042-X</h1>
      </div>

      <form onSubmit={handleAnalyze} style={{ display: 'flex', gap: '10px', width: '400px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input 
            type="text" 
            placeholder="Absolute Repository Path..."
            value={path}
            onChange={(e) => setPath(e.target.value)}
            disabled={isAnalyzing}
            style={{
              width: '100%',
              padding: '8px 10px 8px 34px',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
          />
        </div>
        <button 
          type="submit" 
          disabled={isAnalyzing || !path.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 16px',
            backgroundColor: 'var(--accent)',
            color: 'white',
            borderRadius: '6px',
            fontWeight: 500,
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
            opacity: isAnalyzing || !path.trim() ? 0.7 : 1
          }}
        >
          <Play size={16} />
          {isAnalyzing ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>

      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '20px' }}>
        {metadata && (
          <>
            <span>{metadata.statistics.totalFiles} Files</span>
            <span>{metadata.statistics.totalCommits} Commits</span>
            <span>{metadata.statistics.predominantLanguage}</span>
          </>
        )}
      </div>
    </header>
  );
};
