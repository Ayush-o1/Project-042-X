import React from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';

export const CodeViewer: React.FC = () => {
  const { activeFile, activeFileContent, isFileLoading, openFiles, setActiveFile, closeFile } = useRepositoryStore();

  if (!activeFile) {
    return (
      <div className="flex-center text-sm" style={{ height: '100%', color: 'var(--text-tertiary)' }}>
        Select a file to view its content
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* File Tabs */}
      {openFiles.length > 0 && (
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-default)',
          overflowX: 'auto',
          padding: '8px 12px 0 12px',
          gap: '4px'
        }}>
          {openFiles.map(f => (
            <div 
              key={f.path}
              onClick={() => setActiveFile(f)}
              className="flex-between text-sm"
              style={{
                padding: '6px 12px',
                backgroundColor: activeFile?.path === f.path ? 'var(--bg-app)' : 'transparent',
                color: activeFile?.path === f.path ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                border: activeFile?.path === f.path ? '1px solid var(--border-default)' : '1px solid transparent',
                borderBottom: 'none',
                cursor: 'pointer',
                gap: '8px'
              }}
            >
              <span>{f.path.substring(f.path.lastIndexOf('/') + 1)}</span>
              <span 
                onClick={(e) => { e.stopPropagation(); closeFile(f.path); }}
                style={{ opacity: activeFile?.path === f.path ? 1 : 0.4, cursor: 'pointer' }}
              >
                ×
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Breadcrumb Header */}
      <div style={{ 
        padding: '12px 20px', 
        borderBottom: '1px solid var(--border-default)', 
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }} className="text-sm">
        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
          {activeFile.path.split('/').map((part, i, arr) => (
            <React.Fragment key={i}>
              <span>{part}</span>
              {i < arr.length - 1 && <span style={{ margin: '0 6px', color: 'var(--text-tertiary)' }}>/</span>}
            </React.Fragment>
          ))}
        </span>
        <span style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: 'auto' }}>
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
