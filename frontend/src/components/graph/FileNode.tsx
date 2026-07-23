import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileCode2, FileJson, Image as ImageIcon, File, Flame, AlertTriangle } from 'lucide-react';
import type { ImportanceTier } from './layoutUtils';

interface FileNodeData {
  label: string;
  type: string;
  path: string;
  dimmed?: boolean;
  isHotspot?: boolean;
  isCycle?: boolean;
  inDegree?: number;
  outDegree?: number;
  /** Structural in-degree tier computed at layout time — see layoutUtils'
   *  HIGH/MEDIUM_IMPORTANCE_IN_DEGREE. Drives the node's visual weight so a
   *  heavily-imported file reads as more important at a glance, not just
   *  via the same-size left-border color every other node also has. */
  importance?: ImportanceTier;
}

const IMPORTANCE_STYLES: Record<ImportanceTier, { iconSize: number; fontSize: string; fontWeight: string; borderWidth: number }> = {
  small:  { iconSize: 12, fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-normal)',   borderWidth: 2 },
  medium: { iconSize: 14, fontSize: 'var(--text-xs)',  fontWeight: 'var(--weight-medium)',   borderWidth: 3 },
  large:  { iconSize: 16, fontSize: 'var(--text-sm)',  fontWeight: 'var(--weight-semibold)', borderWidth: 4 },
};

export const FileNode = memo(({ data, selected }: { data: FileNodeData; selected?: boolean }) => {
  const tier = data.importance ?? 'medium';
  const { iconSize, fontSize, fontWeight, borderWidth } = IMPORTANCE_STYLES[tier];

  const getLanguageDetails = () => {
    if (!data?.label) return { icon: <File size={iconSize} color="var(--text-tertiary)" />, color: 'var(--text-tertiary)' };
    const ext = data.label.substring(data.label.lastIndexOf('.'));
    if (['.ts', '.tsx'].includes(ext)) return { icon: <FileCode2 size={iconSize} color="var(--lang-ts)" />, color: 'var(--lang-ts)' };
    if (['.js', '.jsx'].includes(ext)) return { icon: <FileCode2 size={iconSize} color="var(--lang-js)" />, color: 'var(--lang-js)' };
    if (['.json', '.md'].includes(ext)) return { icon: <FileJson size={iconSize} color="var(--lang-json)" />, color: 'var(--lang-json)' };
    if (['.png', '.jpg', '.svg'].includes(ext)) return { icon: <ImageIcon size={iconSize} color="var(--lang-image)" />, color: 'var(--lang-image)' };
    return { icon: <File size={iconSize} color="var(--text-secondary)" />, color: 'var(--text-secondary)' };
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
      title={`${data?.label || 'Unknown'}${tier === 'large' ? ' — heavily imported' : ''}`}
      style={{
        padding: 'var(--space-4) var(--space-5)',
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderLeft: `${borderWidth}px solid ${leftBorderColor}`,
        boxShadow,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        width: '100%',
        height: '100%',
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
        <span style={{ fontSize, fontWeight, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
