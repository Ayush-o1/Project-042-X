import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Folder, FolderOpen, ChevronRight } from 'lucide-react';

interface FolderNodeData {
  label: string;
  collapsed?: boolean;
  fileCount?: number;
  /** Set by the same hover/pin highlight pass that dims file nodes — a
   *  collapsed folder can be a real endpoint of that highlight (an edge
   *  redirected into it), so it needs the same dimmed treatment. */
  dimmed?: boolean;
}

export const FolderNode = memo(({ data, selected }: NodeProps) => {
  const { label, collapsed, fileCount, dimmed } = data as unknown as FolderNodeData;

  // Collapsed: a regular-weight summary card standing in for every file it
  // contains — the same footprint class as a file node, fully clickable to
  // expand. Toggling itself happens in the parent's onNodeClick (folder
  // nodes are a layout/interaction concern the view already centralizes for
  // file selection, so collapse-toggling lives there too instead of each
  // node managing its own click wiring).
  if (collapsed) {
    return (
      <div
        className={`graph-node${selected ? ' selected' : ''}${dimmed ? ' dimmed' : ''}`}
        style={{
          width: '100%',
          height: '100%',
          padding: 'var(--space-4) var(--space-5)',
          backgroundColor: 'var(--bg-elevated)',
          border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-strong)'}`,
          borderLeft: '3px solid var(--text-tertiary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: selected ? 'var(--shadow-accent)' : 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          cursor: 'pointer',
          opacity: dimmed ? 0.12 : 1,
          transition: 'transform var(--duration-fast) var(--ease-default), border-color var(--duration-fast), opacity 300ms ease',
        }}
        title={`${label} — ${fileCount} file${fileCount === 1 ? '' : 's'}. Click to expand.`}
      >
        <Folder size={15} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </span>
          <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>
            {fileCount} file{fileCount === 1 ? '' : 's'}
          </span>
        </div>
        <ChevronRight size={13} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
      </div>
    );
  }

  // Expanded: the transparent cluster container. Only the label row is
  // clickable (pointerEvents: auto, carved out of the container's own
  // pointerEvents: none) so clicks elsewhere still pass through to the
  // child file nodes dagre has placed inside it.
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: selected ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
        border: `1px dashed ${selected ? 'var(--accent)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-2xl)',
        padding: 'var(--space-8)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'background var(--duration-normal) var(--ease-default), border-color var(--duration-normal) var(--ease-default)',
        pointerEvents: 'none',
      }}
    >
      <div
        className="graph-folder-label"
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
          marginBottom: 'var(--space-4)', color: 'var(--text-secondary)',
          pointerEvents: 'auto', cursor: 'pointer', alignSelf: 'flex-start',
          padding: '2px var(--space-2)', marginLeft: 'calc(var(--space-2) * -1)',
          borderRadius: 'var(--radius-md)',
        }}
        title={`${label}${fileCount ? ` — ${fileCount} file${fileCount === 1 ? '' : 's'}` : ''}. Click to collapse.`}
      >
        <FolderOpen size={16} />
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
    </div>
  );
});

FolderNode.displayName = 'FolderNode';
