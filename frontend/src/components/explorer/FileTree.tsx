import React, { useState } from 'react';
import { ChevronRight, ChevronDown, File, FileCode2, FileJson, Image as ImageIcon } from 'lucide-react';
import { useRepositoryStore } from '../../store/useRepositoryStore';

export const FileTree: React.FC<{ node: any, depth: number }> = ({ node, depth }) => {
  const [isOpen, setIsOpen] = useState(depth === 0);
  const { setActiveFile, activeFile } = useRepositoryStore();

  const isSelected = activeFile?.path === node.file?.path;

  const getIcon = () => {
    if (node.isDirectory) return isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />;
    
    const ext = node.file?.extension;
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return <FileCode2 size={14} color="#3b82f6" />;
    if (['.json', '.md'].includes(ext)) return <FileJson size={14} color="#10b981" />;
    if (['.png', '.jpg', '.svg'].includes(ext)) return <ImageIcon size={14} color="#8b5cf6" />;
    return <File size={14} color="var(--text-secondary)" />;
  };

  const handleToggle = () => {
    if (node.isDirectory) setIsOpen(!isOpen);
    else if (node.file) setActiveFile(node.file);
  };

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
          gap: '6px', 
          padding: '4px 8px',
          paddingLeft: `${depth * 12 + 8}px`,
          cursor: 'pointer',
          borderRadius: '4px',
          color: isSelected ? 'white' : 'var(--text-primary)',
          backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
          fontSize: '13px',
          userSelect: 'none'
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', width: '16px', opacity: node.isDirectory ? 0.7 : 1 }}>
          {getIcon()}
        </span>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.name}
        </span>
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
