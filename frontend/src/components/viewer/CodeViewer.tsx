import React from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';

export const CodeViewer: React.FC = () => {
  const { activeFile, activeFileContent, isFileLoading } = useRepositoryStore();

  if (!activeFile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        Select a file to view its content
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '10px 20px', 
        borderBottom: '1px solid var(--border)', 
        backgroundColor: 'var(--bg-primary)',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span>{activeFile.path}</span>
        <span style={{ backgroundColor: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
          {(activeFile.size / 1024).toFixed(1)} KB
        </span>
      </div>
      
      <div style={{ flex: 1, overflow: 'auto', padding: '20px', backgroundColor: '#1e1e1e' }}>
        {isFileLoading ? (
          <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
        ) : (
          <pre style={{ margin: 0 }}>
            <code style={{ 
              fontFamily: '"Fira Code", "JetBrains Mono", monospace', 
              fontSize: '13px',
              lineHeight: 1.5,
              color: '#d4d4d4'
            }}>
              {activeFileContent}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
};
