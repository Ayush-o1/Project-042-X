import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { Calendar, ChevronRight } from 'lucide-react';
import { laneColor } from './layoutUtils';
import { hashAuthor } from '../../lib/authorColors';

export interface DayGroupNodeData {
  dayKey: string;
  count: number;
  authors: string[];
  lane: number;
  dimmed?: boolean;
}

const formatDayLabel = (dayKey: string): string => {
  const date = new Date(`${dayKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dayKey;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

/**
 * A collapsed day's worth of commits, standing in for every commit made on
 * that calendar day. Exists purely to keep a dense history readable —
 * expanding one back to individual commits is a click away (handled
 * centrally by the view, same pattern as the Architecture graph's collapsed
 * FolderNode).
 */
export const DayGroupNode = memo(({ data, selected }: NodeProps) => {
  const { dayKey, count, authors, lane, dimmed } = data as unknown as DayGroupNodeData;
  const branchColor = laneColor(lane ?? 0);
  const visibleAuthors = authors.slice(0, 4);
  const overflowCount = authors.length - visibleAuthors.length;

  return (
    <div
      className={`graph-node${selected ? ' selected' : ''}${dimmed ? ' dimmed' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        padding: 'var(--space-4) var(--space-5)',
        backgroundColor: selected ? 'var(--bg-active)' : 'var(--bg-surface)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-default)'}`,
        borderLeft: `3px solid ${branchColor}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: selected ? 'var(--shadow-accent)' : 'var(--shadow-sm)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        cursor: 'pointer',
        opacity: dimmed ? 0.12 : 1,
        transition: 'transform var(--duration-fast) var(--ease-default), border-color var(--duration-fast), opacity 300ms ease',
      }}
      title={`${count} commit${count === 1 ? '' : 's'} on ${formatDayLabel(dayKey)}. Click to expand.`}
    >
      <Handle type="target" position={Position.Top} style={{ background: 'var(--accent)', border: 'none', width: 6, height: 6 }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Calendar size={13} color="var(--text-tertiary)" />
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>
            {formatDayLabel(dayKey)}
          </span>
        </div>
        <ChevronRight size={13} color="var(--text-tertiary)" />
      </div>

      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
        {count} commit{count === 1 ? '' : 's'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        {visibleAuthors.map((author, i) => (
          <div
            key={author}
            className="avatar avatar-sm"
            style={{
              background: hashAuthor(author),
              marginLeft: i === 0 ? 0 : -6,
              border: '2px solid var(--bg-surface)',
              zIndex: visibleAuthors.length - i,
            }}
            title={author}
          >
            {author.charAt(0).toUpperCase()}
          </div>
        ))}
        {overflowCount > 0 && (
          <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', marginLeft: 'var(--space-2)' }}>
            +{overflowCount} more
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--accent)', border: 'none', width: 6, height: 6 }} />
    </div>
  );
});

DayGroupNode.displayName = 'DayGroupNode';
