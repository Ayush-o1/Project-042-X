import React, { useMemo } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { FileTree } from '../explorer/FileTree';
import type { FileModel } from '../../types';

// Helper to convert flat array to nested tree
interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: Record<string, TreeNode>;
  file?: FileModel;
}

export const Sidebar: React.FC = () => {
  const { files, metadata, favorites, openFiles, setActiveFile, activeFile, closeFile } = useRepositoryStore();

  const fileTree = useMemo(() => {
    if (!metadata || files.length === 0) return null;
    
    const root: TreeNode = { name: metadata.name, path: metadata.path, isDirectory: true, children: {} };
    const rootPrefix = metadata.path;

    for (const file of files) {
      // Remove root path to get relative path for nesting
      let rel = file.path.replace(rootPrefix, '');
      if (rel.startsWith('/')) rel = rel.substring(1);
      
      const parts = rel.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          // Leaf node
          if (!current.children) current.children = {};
          current.children[part] = { name: part, path: file.path, isDirectory: file.isDirectory, file };
        } else {
          // Directory node
          if (!current.children) current.children = {};
          if (!current.children[part]) {
            current.children[part] = { name: part, path: '', isDirectory: true, children: {} };
          }
          current = current.children[part];
        }
      }
    }
    return root;
  }, [files, metadata]);

  return (
    <aside style={{
      width: '300px',
      backgroundColor: 'var(--bg-panel)',
      borderRight: '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* OPEN EDITORS */}
        {openFiles.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div className="text-xs" style={{ padding: '16px 20px 8px 20px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
              Open Editors
            </div>
            <div style={{ padding: '0 10px' }}>
              {openFiles.map(f => (
                <div key={f.path} className="flex-between" style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  backgroundColor: activeFile?.path === f.path ? 'var(--bg-active)' : 'transparent',
                  color: activeFile?.path === f.path ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
                onClick={() => setActiveFile(f)}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path.substring(f.path.lastIndexOf('/') + 1)}</span>
                  <span onClick={(e) => { e.stopPropagation(); closeFile(f.path); }} style={{ cursor: 'pointer', opacity: 0.6 }}>×</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAVORITES */}
        {favorites.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div className="text-xs" style={{ padding: '16px 20px 8px 20px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
              Favorites
            </div>
            <div style={{ padding: '0 10px' }}>
              {favorites.map(f => (
                <div key={f.path} className="flex-between" style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  backgroundColor: activeFile?.path === f.path ? 'var(--accent-blue-bg)' : 'transparent',
                  color: activeFile?.path === f.path ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
                onClick={() => setActiveFile(f)}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path.substring(f.path.lastIndexOf('/') + 1)}</span>
                  <span style={{ color: 'var(--color-warning)' }}>★</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXPLORER */}
        <div>
          <div className="text-xs" style={{ padding: '16px 20px 8px 20px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
            Explorer
          </div>
          <div style={{ padding: '0 10px 20px 10px' }}>
            {fileTree ? (
              <FileTree node={fileTree} depth={0} />
            ) : (
              <div className="text-sm" style={{ padding: '20px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                No repository loaded.
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
