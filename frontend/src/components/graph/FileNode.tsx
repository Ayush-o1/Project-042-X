import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileCode2, FileJson, Image as ImageIcon, File, Flame, AlertTriangle, FileWarning } from 'lucide-react';
import { healthToColor } from '../../lib/health';
import type { ImportanceTier } from './layoutUtils';

interface FileNodeData {
  label: string;
  type: string;
  path: string;
  dimmed?: boolean;
  isHotspot?: boolean;
  isCycle?: boolean;
  isCenter?: boolean;
  /** 0–100, undefined for a file insightsEngine skipped (non-source file). */
  healthScore?: number;
  inDegree?: number;
  outDegree?: number;
  /** Structural in-degree tier computed at layout time — see layoutUtils'
   *  HIGH/MEDIUM_IMPORTANCE_IN_DEGREE. Drives the node's visual weight so a
   *  heavily-imported file reads as more important at a glance. */
  importance?: ImportanceTier;
  /** True when the backend's AST parse failed on this file — surfaced so a
   *  file the graph couldn't fully analyze doesn't look like any other. */
  hasSyntaxError?: boolean;
}

const IMPORTANCE_STYLES: Record<ImportanceTier, { fontSize: string; fontWeight: string; borderWidth: number }> = {
  small:  { fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-normal)',   borderWidth: 2 },
  medium: { fontSize: 'var(--text-xs)',  fontWeight: 'var(--weight-medium)',   borderWidth: 4 },
  large:  { fontSize: 'var(--text-sm)',  fontWeight: 'var(--weight-semibold)', borderWidth: 6 },
};

const LANG_BADGE: Record<string, { icon: React.ReactNode; color: string }> = {
  TypeScript: { icon: <FileCode2 size={10} />, color: 'var(--lang-ts)' },
  JavaScript: { icon: <FileCode2 size={10} />, color: 'var(--lang-js)' },
  JSON: { icon: <FileJson size={10} />, color: 'var(--lang-json)' },
};

export const FileNode = memo(({ data, selected }: { data: FileNodeData; selected?: boolean }) => {
  const tier = data.importance ?? 'medium';
  const { fontSize, fontWeight, borderWidth } = IMPORTANCE_STYLES[tier];
  const ext = data.label?.substring(data.label.lastIndexOf('.'));
  const langBadge = ['.png', '.jpg', '.svg'].includes(ext ?? '')
    ? { icon: <ImageIcon size={10} />, color: 'var(--lang-image)' }
    : LANG_BADGE[data.type] ?? { icon: <File size={10} />, color: 'var(--text-tertiary)' };

  // Health score is now the primary color signal (the actionable one) —
  // language moves to a small corner badge. Cycle/hotspot states still take
  // visual priority over health since they're the two things most worth
  // interrupting the health read for.
  const healthColor = data.healthScore !== undefined ? healthToColor(data.healthScore) : 'var(--border-default)';
  const leftBorderColor = data.isCycle ? 'var(--color-danger)' : data.isHotspot ? '#f59e0b' : healthColor;
  const borderColor = selected ? 'var(--accent)' : 'var(--border-default)';

  const bgColor = selected
    ? 'var(--bg-active)'
    : data.isCycle
    ? 'color-mix(in srgb, var(--color-danger) 6%, var(--bg-surface))'
    : data.isHotspot
    ? 'color-mix(in srgb, #f59e0b 6%, var(--bg-surface))'
    : 'var(--bg-surface)';

  return (
    <div
      className={`graph-node${selected ? ' selected' : ''}${data.dimmed ? ' dimmed' : ''}${data.isCenter ? ' is-center' : ''}`}
      title={`${data?.label || 'Unknown'}${data.healthScore !== undefined ? ` — health ${data.healthScore}` : ''}${tier === 'large' ? ' — heavily imported' : ''}`}
      style={{
        padding: 'var(--space-4) var(--space-5)',
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderLeft: `${borderWidth}px solid ${leftBorderColor}`,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        width: '100%',
        height: '100%',
        color: 'var(--text-primary)',
        borderRadius: 'var(--radius-lg)',
        position: 'relative',
        transition: 'transform var(--duration-fast) var(--ease-default), border-color var(--duration-fast), box-shadow var(--duration-fast), opacity 300ms ease',
        transform: selected ? 'scale(1.02)' : 'scale(1)',
        opacity: data.dimmed ? 0.12 : 1,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: 'var(--accent)', border: 'none', width: 6, height: 6 }} />

      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, minWidth: 0 }}>
        <span style={{ fontSize, fontWeight, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data?.label || 'Unknown'}
        </span>
        {data.healthScore !== undefined && tier !== 'small' && (
          // Health was previously carried only by the left border's color —
          // a real number here gives it a non-color signal too, and answers
          // "how much" rather than just "worse/better".
          <span style={{ fontSize: 'var(--text-2xs)', color: healthColor, opacity: 0.85 }}>
            health {data.healthScore}
          </span>
        )}
      </div>

      <span className="graph-node-lang-badge" style={{ color: langBadge.color }} title={data.type}>
        {langBadge.icon}
      </span>

      {(data.isCycle || data.isHotspot || data.hasSyntaxError) && (
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {data.hasSyntaxError && (
            <span title="Failed to parse — this file's imports/exports may be incomplete">
              <FileWarning size={11} color="var(--color-danger)" />
            </span>
          )}
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
