import { memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { LaneGutter } from './LaneGutter';
import { hashAuthor } from '../../lib/authorColors';
import type { TimelineHeaderRow } from './timelineRows';
import { HEADER_ROW_HEIGHT } from './constants';

const formatDayLabel = (dayKey: string): string => {
  const date = new Date(`${dayKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dayKey;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

export interface DayHeaderRowProps {
  row: TimelineHeaderRow;
  totalLanes: number;
  continuesBelow: boolean;
  isSelected: boolean;
  onToggleCollapse: () => void;
  onSelect: () => void;
}

/** Sticky date divider. Always present as a section label; when the day is
 *  collapsed it also stands in for every commit made that day, showing a
 *  count and a stacked-avatar summary instead of individual rows. */
export const DayHeaderRow = memo(({
  row, totalLanes, continuesBelow, isSelected, onToggleCollapse, onSelect,
}: DayHeaderRowProps) => {
  const visibleAuthors = row.authors.slice(0, 4);
  const overflow = row.authors.length - visibleAuthors.length;

  return (
    <div
      role="treeitem"
      aria-level={1}
      aria-expanded={!row.collapsed}
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
      className={`timeline-header-row${isSelected ? ' selected' : ''}`}
      style={{ height: HEADER_ROW_HEIGHT }}
      onClick={() => { onSelect(); onToggleCollapse(); }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleCollapse(); } }}
      title={row.collapsed ? `${row.count} commit${row.count === 1 ? '' : 's'} — click to expand` : 'Click to collapse'}
    >
      <LaneGutter
        lane={row.lane}
        throughLanes={row.throughLanes}
        continuesBelow={continuesBelow}
        showOwnDot={row.collapsed}
        shape="diamond"
        totalLanes={totalLanes}
        rowHeight={HEADER_ROW_HEIGHT}
      />
      {row.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
      <span className="timeline-header-label">{formatDayLabel(row.dayKey)}</span>
      <span className="timeline-header-count">{row.count} commit{row.count === 1 ? '' : 's'}</span>
      {row.collapsed && visibleAuthors.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'var(--space-2)' }}>
          {visibleAuthors.map((author, i) => (
            <div
              key={author}
              className="avatar avatar-sm"
              style={{ background: hashAuthor(author), marginLeft: i === 0 ? 0 : -6, border: '2px solid var(--bg-app)', zIndex: visibleAuthors.length - i }}
              title={author}
            >
              {author.charAt(0).toUpperCase()}
            </div>
          ))}
          {overflow > 0 && (
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', marginLeft: 'var(--space-2)' }}>+{overflow}</span>
          )}
        </div>
      )}
    </div>
  );
});

DayHeaderRow.displayName = 'DayHeaderRow';
