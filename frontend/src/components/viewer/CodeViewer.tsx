import React from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';

export const CodeViewer: React.FC = () => {
  const { activeFile, activeFileContent, isFileLoading } = useRepositoryStore();

  if (!activeFile) {
    return (
      <div className="flex-center text-sm" style={{ height: '100%', color: 'var(--text-tertiary)' }}>
        Select a file to view its content
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '12px 20px', 
        borderBottom: '1px solid var(--border-default)', 
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }} className="text-sm">
        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{activeFile.path}</span>
        <span style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
          {(activeFile.size / 1024).toFixed(1)} KB
        </span>
      </div>
      
      <div style={{ flex: 1, overflow: 'auto', padding: '24px', backgroundColor: 'var(--bg-app)' }}>
        {isFileLoading ? (
          <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading...</div>
        ) : (
          <pre style={{ margin: 0 }}>
            <code className="font-mono text-sm" style={{ 
              lineHeight: 1.6,
              color: 'var(--text-secondary)'
            }}>
              {activeFileContent}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
};
