import React, { useMemo } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { ChevronRight, ChevronDown, File, FileCode2, FileJson, Image as ImageIcon } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import type { FileModel } from '../../types';

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: Record<string, TreeNode>;
  file?: FileModel;
  depth: number;
}

const FileTreeNode: React.FC<{ node: TreeNode; }> = React.memo(({ node }) => {
  const { setActiveFile, activeFile, expandedFolders, toggleFolder, toggleFavorite, favorites } = useRepositoryStore();
  const isOpen = expandedFolders[node.path] || false;
  const isSelected = activeFile?.path === node.file?.path;
  const isFav = node.file ? favorites.find(f => f.path === node.file?.path) : false;

  const getIcon = () => {
    if (node.isDirectory) return isOpen || node.depth === 0 ? <ChevronDown size={14} /> : <ChevronRight size={14} />;
    
    const ext = node.file?.extension;
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext || '')) return <FileCode2 size={14} color="var(--accent-blue)" />;
    if (['.json', '.md'].includes(ext || '')) return <FileJson size={14} color="var(--color-success)" />;
    if (['.png', '.jpg', '.svg'].includes(ext || '')) return <ImageIcon size={14} color="#8b5cf6" />;
    return <File size={14} color="var(--text-tertiary)" />;
  };

  const handleToggle = () => {
    if (node.isDirectory) {
      if (node.depth > 0) toggleFolder(node.path); // Don't toggle root
    } else if (node.file) {
      setActiveFile(node.file);
    }
  };

  return (
    <div 
      onClick={handleToggle}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '6px 8px',
        paddingLeft: `${node.depth * 14 + 10}px`,
        cursor: 'pointer',
        color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)',
        backgroundColor: isSelected ? 'var(--accent-blue-bg)' : 'transparent',
        fontSize: '13px',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', width: '16px', opacity: node.isDirectory ? 0.7 : 1 }}>
        {getIcon()}
      </span>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
        {node.name}
      </span>
      {!node.isDirectory && node.file && (
        <span 
          onClick={(e) => { e.stopPropagation(); toggleFavorite(node.file!); }}
          style={{ 
            opacity: isFav || isSelected ? 1 : 0,
            color: isFav ? 'var(--color-warning)' : 'var(--text-tertiary)',
            transition: 'opacity 150ms ease',
            display: 'flex',
            alignItems: 'center'
          }}
          className="favorite-btn"
        >
          ★
        </span>
      )}
    </div>
  );
});

export const Sidebar: React.FC = () => {
  const { files, metadata, favorites, openFiles, setActiveFile, activeFile, closeFile, expandedFolders } = useRepositoryStore();

  const flatVisibleFiles = useMemo(() => {
    if (!metadata || files.length === 0) return [];
    
    // 1. Build nested tree
    const root: TreeNode = { name: metadata.name, path: metadata.path, isDirectory: true, children: {}, depth: 0 };
    const rootPrefix = metadata.path;

    for (const file of files) {
      let rel = file.path.replace(rootPrefix, '');
      if (rel.startsWith('/')) rel = rel.substring(1);
      if (rel === '') continue; // Skip root itself if included

      const parts = rel.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          if (!current.children) current.children = {};
          current.children[part] = { name: part, path: file.path, isDirectory: file.isDirectory, file, depth: i + 1 };
        } else {
          if (!current.children) current.children = {};
          if (!current.children[part]) {
            const dirPath = rootPrefix + '/' + parts.slice(0, i + 1).join('/');
            current.children[part] = { name: part, path: dirPath, isDirectory: true, children: {}, depth: i + 1 };
          }
          current = current.children[part];
        }
      }
    }

    // 2. Flatten based on expanded state
    const flat: TreeNode[] = [];
    
    const traverse = (node: TreeNode) => {
      flat.push(node);
      // Only traverse children if it's the root (depth 0, always expand) or it's expanded in state
      if (node.isDirectory && (node.depth === 0 || expandedFolders[node.path] === true)) {
        if (node.children) {
          const childrenNodes = Object.values(node.children);
          childrenNodes.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
          });
          for (const child of childrenNodes) {
            traverse(child);
          }
        }
      }
    };
    
    traverse(root);
    return flat;
  }, [files, metadata, expandedFolders]);

  return (
    <aside style={{
      width: '300px',
      backgroundColor: 'var(--bg-panel)',
      borderRight: '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* OPEN EDITORS */}
        {openFiles.length > 0 && (
          <div style={{ marginBottom: '12px', flexShrink: 0 }}>
            <div className="text-xs" style={{ padding: '16px 20px 8px 20px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
              Open Editors
            </div>
            <div style={{ padding: '0 10px', maxHeight: '150px', overflowY: 'auto' }}>
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
          <div style={{ marginBottom: '12px', flexShrink: 0 }}>
            <div className="text-xs" style={{ padding: '16px 20px 8px 20px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
              Favorites
            </div>
            <div style={{ padding: '0 10px', maxHeight: '150px', overflowY: 'auto' }}>
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

        {/* EXPLORER (Virtualized) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="text-xs" style={{ padding: '16px 20px 8px 20px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em', flexShrink: 0 }}>
            Explorer
          </div>
          <div style={{ flex: 1, padding: '0 0px 20px 0px' }}>
            {flatVisibleFiles.length > 0 ? (
              <Virtuoso
                style={{ height: '100%' }}
                data={flatVisibleFiles}
                itemContent={(_, node) => <FileTreeNode node={node} />}
              />
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
