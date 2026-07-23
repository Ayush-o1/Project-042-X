import React, { useMemo } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { useShallow } from 'zustand/react/shallow';
import {
  ChevronRight, ChevronDown, File, FileCode2, FileJson,
  Image as ImageIcon, Star, X, Layers,
  FileText
} from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import type { FileModel } from '../../types';

/* ── Tree types ─────────────────────────────────────────────── */
interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: Record<string, TreeNode>;
  file?: FileModel;
  depth: number;
}

/* ── File icon by extension ─────────────────────────────────── */
const getFileIcon = (ext?: string): React.ReactNode => {
  if (['.ts', '.tsx'].includes(ext || ''))
    return <FileCode2 size={13} color="var(--lang-ts)" />;
  if (['.js', '.jsx'].includes(ext || ''))
    return <FileCode2 size={13} color="var(--lang-js)" />;
  if (['.json'].includes(ext || ''))
    return <FileJson size={13} color="var(--lang-json)" />;
  if (['.md', '.mdx'].includes(ext || ''))
    return <FileText size={13} color="var(--text-tertiary)" />;
  if (['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(ext || ''))
    return <ImageIcon size={13} color="var(--lang-image)" />;
  return <File size={13} color="var(--text-tertiary)" />;
};

/* ── FileTree row ───────────────────────────────────────────── */
// Every row selects only the exact slivers of state it needs (not the whole
// store) so that e.g. toggling one folder re-renders one row, not the tree.
const FileTreeNode: React.FC<{ node: TreeNode; closeOverlayOnSelect?: () => void }> = React.memo(({ node, closeOverlayOnSelect }) => {
  const setActiveFile = useRepositoryStore(s => s.setActiveFile);
  const toggleFolder = useRepositoryStore(s => s.toggleFolder);
  const toggleFavorite = useRepositoryStore(s => s.toggleFavorite);
  const isOpen = useRepositoryStore(s => s.expandedFolders[node.path] || false);
  const isSelected = useRepositoryStore(s => s.activeFile?.path === node.file?.path);
  const isFav = useRepositoryStore(s =>
    node.file ? s.favorites.some(f => f.path === node.file?.path) : false,
  );

  const handleClick = () => {
    if (node.isDirectory) {
      if (node.depth > 0) toggleFolder(node.path);
    } else if (node.file) {
      setActiveFile(node.file);
      closeOverlayOnSelect?.();
    }
  };

  return (
    <div
      role={node.file ? 'button' : undefined}
      tabIndex={node.file ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      aria-selected={isSelected}
      aria-label={node.file ? `Open ${node.name}` : undefined}
      className={`sidebar-file-item${isSelected ? ' selected' : ''}`}
      style={{
        paddingLeft: `${node.depth * 14 + 8}px`,
        cursor: node.isDirectory && node.depth === 0 ? 'default' : 'pointer',
      }}
    >
      {/* Chevron or file icon */}
      <span style={{ display: 'flex', alignItems: 'center', width: 14, flexShrink: 0, opacity: node.isDirectory ? 0.7 : 1 }}>
        {node.isDirectory
          ? (isOpen || node.depth === 0)
            ? <ChevronDown size={12} />
            : <ChevronRight size={12} />
          : getFileIcon(node.file?.extension)
        }
      </span>

      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {node.name}
      </span>

      {/* Star favorite button */}
      {!node.isDirectory && node.file && (
        <button
          type="button"
          aria-label={isFav ? `Remove ${node.name} from favorites` : `Add ${node.name} to favorites`}
          onClick={e => { e.stopPropagation(); toggleFavorite(node.file!); }}
          className="btn-icon btn-icon-sm row-hide-action"
          style={{
            opacity: isFav ? 1 : undefined,
            color: isFav ? 'var(--color-warning)' : 'var(--text-tertiary)',
            flexShrink: 0,
          }}
        >
          <Star size={10} fill={isFav ? 'var(--color-warning)' : 'none'} />
        </button>
      )}
    </div>
  );
});

/* ── Sidebar section header ─────────────────────────────────── */
const SectionLabel: React.FC<{ label: string; count?: number }> = ({ label, count }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'var(--space-6) var(--space-6) var(--space-2)',
    }}
  >
    <span className="field-label">
      {label}
    </span>
    {count !== undefined && (
      <span className="badge badge-default" style={{ fontSize: 9, padding: '1px 4px' }}>{count}</span>
    )}
  </div>
);

/* ── Main Sidebar ───────────────────────────────────────────── */
interface SidebarProps {
  /** True below the tablet-landscape breakpoint, where the sidebar floats
   *  above the content instead of sitting inline next to it. */
  isOverlay: boolean;
  isOpen: boolean;
  onRequestClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOverlay, isOpen, onRequestClose }) => {
  const {
    files, metadata, favorites, openFiles,
    setActiveFile, activeFile, closeFile,
    expandedFolders,
  } = useRepositoryStore(
    useShallow(s => ({
      files: s.files,
      metadata: s.metadata,
      favorites: s.favorites,
      openFiles: s.openFiles,
      setActiveFile: s.setActiveFile,
      activeFile: s.activeFile,
      closeFile: s.closeFile,
      expandedFolders: s.expandedFolders,
    })),
  );

  /* Build the flat visible tree (memoized) */
  const flatVisibleFiles = useMemo(() => {
    if (!metadata || files.length === 0) return [];

    const root: TreeNode = {
      name: metadata.name, path: metadata.path,
      isDirectory: true, children: {}, depth: 0,
    };
    const rootPrefix = metadata.path;

    for (const file of files) {
      let rel = file.path.replace(rootPrefix, '');
      if (rel.startsWith('/')) rel = rel.substring(1);
      if (rel === '') continue;

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

    const flat: TreeNode[] = [];
    const traverse = (node: TreeNode) => {
      flat.push(node);
      if (node.isDirectory && (node.depth === 0 || expandedFolders[node.path] === true)) {
        if (node.children) {
          const children = Object.values(node.children).sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
          });
          for (const child of children) traverse(child);
        }
      }
    };

    traverse(root);
    return flat;
  }, [files, metadata, expandedFolders]);

  const handleFileActivate = (file: FileModel) => {
    setActiveFile(file);
    if (isOverlay) onRequestClose();
  };

  return (
    <aside
      aria-label="File explorer"
      className={`sidebar-aside${isOverlay ? ' sidebar-overlay' : ''}${isOverlay && !isOpen ? ' sidebar-closed' : ''}`}
      style={{
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* ── Open Editors ── */}
      {openFiles.length > 0 && (
        <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border-subtle)' }}>
          <SectionLabel label="Open Editors" count={openFiles.length} />
          <div style={{ padding: '0 var(--space-4)', maxHeight: 140, overflowY: 'auto' }}>
            {openFiles.map(f => {
              const isActive = activeFile?.path === f.path;
              return (
                <div
                  key={f.path}
                  onClick={() => handleFileActivate(f)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') handleFileActivate(f); }}
                  aria-label={`Switch to ${f.name}`}
                  className={`sidebar-row flex-between${isActive ? ' active' : ''}`}
                  style={{
                    backgroundColor: isActive ? 'var(--bg-active)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', overflow: 'hidden', flex: 1 }}>
                    {getFileIcon(f.extension)}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Close ${f.name}`}
                    onClick={e => { e.stopPropagation(); closeFile(f.path); }}
                    className="btn-icon btn-icon-sm row-hide-action"
                    style={{ flexShrink: 0, color: 'var(--text-tertiary)' }}
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Favorites ── */}
      {favorites.length > 0 && (
        <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border-subtle)' }}>
          <SectionLabel label="Starred" count={favorites.length} />
          <div style={{ padding: '0 var(--space-4)', maxHeight: 140, overflowY: 'auto' }}>
            {favorites.map(f => {
              const isActive = activeFile?.path === f.path;
              return (
                <div
                  key={f.path}
                  onClick={() => handleFileActivate(f)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') handleFileActivate(f); }}
                  aria-label={`Switch to ${f.name}`}
                  className={`sidebar-row${isActive ? ' active' : ''}`}
                  style={{
                    backgroundColor: isActive ? 'var(--bg-selected)' : 'transparent',
                    color: isActive ? 'var(--accent-hover)' : 'var(--text-secondary)',
                  }}
                >
                  <Star size={10} color="var(--color-warning)" fill="var(--color-warning)" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {f.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Explorer (Virtualized) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <SectionLabel label="Explorer" count={files.filter(f => !f.isDirectory).length || undefined} />

        <div style={{ flex: 1 }}>
          {flatVisibleFiles.length > 0 ? (
            <Virtuoso
              style={{ height: '100%' }}
              data={flatVisibleFiles}
              itemContent={(_, node) => (
                <FileTreeNode node={node} closeOverlayOnSelect={isOverlay ? onRequestClose : undefined} />
              )}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-20)',
                gap: 'var(--space-4)',
                color: 'var(--text-tertiary)',
              }}
            >
              <Layers size={24} style={{ opacity: 0.4 }} />
              <span style={{ fontSize: 'var(--text-xs)', textAlign: 'center', lineHeight: 'var(--leading-relaxed)' }}>
                Enter a repository path<br />to explore files
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
