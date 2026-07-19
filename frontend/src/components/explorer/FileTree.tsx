import React from 'react';
import { ChevronRight, ChevronDown, File, FileCode2, FileJson, Image as ImageIcon } from 'lucide-react';
import { useRepositoryStore } from '../../store/useRepositoryStore';

export const FileTree: React.FC<{ node: any, depth: number }> = ({ node, depth }) => {
  const { setActiveFile, activeFile, expandedFolders, toggleFolder, toggleFavorite, favorites } = useRepositoryStore();
  const isOpen = expandedFolders[node.path] || false;

  const isSelected = activeFile?.path === node.file?.path;

  const getIcon = () => {
    if (node.isDirectory) return isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />;
    
    const ext = node.file?.extension;
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return <FileCode2 size={14} color="var(--accent-blue)" />;
    if (['.json', '.md'].includes(ext)) return <FileJson size={14} color="var(--color-success)" />;
    if (['.png', '.jpg', '.svg'].includes(ext)) return <ImageIcon size={14} color="#8b5cf6" />;
    return <File size={14} color="var(--text-tertiary)" />;
  };

  const handleToggle = () => {
    if (node.isDirectory) toggleFolder(node.path);
    else if (node.file) setActiveFile(node.file);
  };

  const isFav = favorites.find(f => f.path === node.file?.path);

  const childrenNodes = node.children ? Object.values(node.children) : [];
  childrenNodes.sort((a: any, b: any) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <div 
        onClick={handleToggle}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '6px 8px',
          paddingLeft: `${depth * 14 + 10}px`,
          cursor: 'pointer',
          borderRadius: '6px',
          color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)',
          backgroundColor: isSelected ? 'var(--accent-blue-bg)' : 'transparent',
          fontSize: '13px',
          userSelect: 'none',
          transition: 'background-color 150ms ease, color 150ms ease'
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
        {!node.isDirectory && (
          <span 
            onClick={(e) => { e.stopPropagation(); toggleFavorite(node.file); }}
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

      {isOpen && node.isDirectory && (
        <div>
          {childrenNodes.map((child: any) => (
            <FileTree key={child.path || child.name} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
