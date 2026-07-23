import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileCode2, FileJson, Image as ImageIcon, File, Flame, AlertTriangle } from 'lucide-react';

interface FileNodeData {
  label: string;
  type: string;
  path: string;
  dimmed?: boolean;
  isHotspot?: boolean;
  isCycle?: boolean;
  inDegree?: number;
  outDegree?: number;
}

export const FileNode = memo(({ data, selected }: { data: FileNodeData; selected?: boolean }) => {
  const getLanguageDetails = () => {
    if (!data?.label) return { icon: <File size={14} color="var(--text-tertiary)" />, color: 'var(--text-tertiary)' };
    const ext = data.label.substring(data.label.lastIndexOf('.'));
    if (['.ts', '.tsx'].includes(ext)) return { icon: <FileCode2 size={14} color="var(--lang-ts)" />, color: 'var(--lang-ts)' };
    if (['.js', '.jsx'].includes(ext)) return { icon: <FileCode2 size={14} color="var(--lang-js)" />, color: 'var(--lang-js)' };
    if (['.json', '.md'].includes(ext)) return { icon: <FileJson size={14} color="var(--lang-json)" />, color: 'var(--lang-json)' };
    if (['.png', '.jpg', '.svg'].includes(ext)) return { icon: <ImageIcon size={14} color="var(--lang-image)" />, color: 'var(--lang-image)' };
    return { icon: <File size={14} color="var(--text-secondary)" />, color: 'var(--text-secondary)' };
  };

  const { icon, color } = getLanguageDetails();

  // Override border color for special states
  const borderColor = selected
    ? 'var(--accent)'
    : data.isCycle
    ? 'var(--color-danger)'
    : data.isHotspot
    ? '#f59e0b'
    : 'var(--border-default)';

  const leftBorderColor = data.isCycle
    ? 'var(--color-danger)'
    : data.isHotspot
    ? '#f59e0b'
    : color;

  const bgColor = selected
    ? 'var(--bg-active)'
    : data.isCycle
    ? 'color-mix(in srgb, var(--color-danger) 6%, var(--bg-surface))'
    : data.isHotspot
    ? 'color-mix(in srgb, #f59e0b 6%, var(--bg-surface))'
    : 'var(--bg-surface)';

  const boxShadow = selected
    ? 'var(--shadow-accent)'
    : data.isCycle
    ? '0 0 0 1px var(--color-danger), 0 0 12px rgba(239,68,68,0.15)'
    : data.isHotspot
    ? '0 0 0 1px #f59e0b, 0 0 12px rgba(245,158,11,0.15)'
    : 'var(--shadow-sm)';

  return (
    <div
      className={`graph-node${selected ? ' selected' : ''}${data.dimmed ? ' dimmed' : ''}`}
      style={{
        padding: 'var(--space-4) var(--space-5)',
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${leftBorderColor}`,
        boxShadow,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        width: 240,
        color: 'var(--text-primary)',
        borderRadius: 'var(--radius-lg)',
        transition: 'transform var(--duration-fast) var(--ease-default), border-color var(--duration-fast), box-shadow var(--duration-fast), opacity 300ms ease',
        transform: selected ? 'scale(1.02)' : 'scale(1)',
        opacity: data.dimmed ? 0.12 : 1,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: 'var(--accent)', border: 'none', width: 6, height: 6 }} />
      {icon}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data?.label || 'Unknown'}
        </span>
      </div>

      {/* Overlay badges */}
      {(data.isCycle || data.isHotspot) && (
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {data.isCycle && (
            <span title="In circular dependency">
              <AlertTriangle size={11} color="var(--color-danger)" />
            </span>
          )}
          {data.isHotspot && (
            <span title="High fan-in hotspot">
              <Flame size={11} color="#f59e0b" />
            </span>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ background: 'var(--accent)', border: 'none', width: 6, height: 6 }} />
    </div>
  );
});

FileNode.displayName = 'FileNode';
