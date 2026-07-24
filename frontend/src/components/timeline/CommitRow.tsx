import { memo, useState } from 'react';
import { Tag, GitBranch, Copy, Check, FileCode, ChevronRight } from 'lucide-react';
import { LaneGutter } from './LaneGutter';
import { laneGutterWidth, laneX } from './laneGeometry';
import { laneColor } from './commitLanes';
import { hashAuthor } from '../../lib/authorColors';
import type { TimelineCommitRow } from './timelineRows';
import { ROW_HEIGHT, type RowDensity } from './constants';

const formatRelativeDate = (iso: string): string => {
  if (!iso) return '';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

const refLabel = (ref: string): { label: string; isTag: boolean; isHead: boolean } | null => {
  const isTag = ref.startsWith('tag: ');
  const isHead = ref === 'HEAD' || ref.startsWith('HEAD ->');
  const label = isTag ? ref.substring(5) : ref.startsWith('HEAD -> ') ? ref.substring(8) : ref;
  if (label === 'HEAD') return null;
  return { label, isTag, isHead };
};

export interface CommitRowProps {
  row: TimelineCommitRow;
  totalLanes: number;
  density: RowDensity;
  /** Whether this row's own lane continues into the row rendered below it —
   *  false for a root commit or the oldest row in a filtered/capped window,
   *  which stops the gutter's line at the bottom of this row instead of
   *  running it into whatever renders next. */
  continuesBelow: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  isSearchMatch: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  onOpenFile: (relativePath: string) => void;
}

export const CommitRow = memo(({
  row, totalLanes, density, continuesBelow, isSelected, isExpanded, isSearchMatch,
  onToggleExpand, onSelect, onOpenFile,
}: CommitRowProps) => {
  const [copied, setCopied] = useState(false);
  const { commit, lane } = row;
  const rowHeight = ROW_HEIGHT[density];
  const authorColor = hashAuthor(commit.author || '');
  const refs = (commit.refs || []).map(refLabel).filter((r): r is NonNullable<typeof r> => r !== null);

  const handleCopyHash = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(commit.hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div
      role="treeitem"
      aria-level={2}
      aria-selected={isSelected}
      aria-expanded={isExpanded}
      tabIndex={isSelected ? 0 : -1}
      className={`timeline-row${isSelected ? ' selected' : ''}${isSearchMatch ? ' flash' : ''}`}
      onClick={() => { onSelect(); onToggleExpand(); }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpand(); } }}
    >
      <div className="timeline-row-head" style={{ height: rowHeight }}>
        <LaneGutter
          lane={lane}
          throughLanes={row.throughLanes}
          mergeIntoLanes={row.mergeIntoLanes}
          continuesBelow={continuesBelow && !isExpanded}
          showOwnDot
          totalLanes={totalLanes}
          rowHeight={rowHeight}
        />
        <div className="avatar avatar-sm" style={{ background: authorColor, flexShrink: 0 }} title={commit.author}>
          {(commit.author || '?').charAt(0).toUpperCase()}
        </div>
        <span className="timeline-row-message" title={commit.message}>{commit.message}</span>
        {refs.length > 0 && (
          <div className="timeline-row-refs">
            {refs.map((r, i) => (
              <span
                key={i}
                className={`badge ${r.isTag ? 'badge-success' : r.isHead ? 'badge-accent' : 'badge-default'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
              >
                {r.isTag ? <Tag size={9} /> : <GitBranch size={9} />}
                {r.label}
              </span>
            ))}
          </div>
        )}
        <span className="timeline-row-hash">{commit.hash.substring(0, 7)}</span>
        <span className="timeline-row-date">{formatRelativeDate(commit.timestamp)}</span>
        <ChevronRight size={13} className="timeline-row-chevron" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }} />
      </div>

      {isExpanded && (
        <div className="timeline-row-detail">
          <div style={{ width: laneGutterWidth(totalLanes), flexShrink: 0, position: 'relative' }}>
            {continuesBelow && (
              <div
                style={{
                  position: 'absolute', top: 0, bottom: 0, left: laneX(lane) - 1,
                  width: 2, background: laneColor(lane), opacity: 0.9,
                }}
                aria-hidden="true"
              />
            )}
          </div>
          <div className="timeline-row-detail-content">
            <p className="timeline-row-full-message">{commit.message}</p>
            <div className="timeline-row-detail-meta">
              <span>{commit.author}{commit.authorEmail ? ` <${commit.authorEmail}>` : ''}</span>
              <span>·</span>
              <span title={commit.timestamp}>{commit.timestamp ? new Date(commit.timestamp).toLocaleString() : ''}</span>
              <button type="button" onClick={handleCopyHash} className="link-action" style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {commit.hash.substring(0, 10)}
              </button>
            </div>
            {commit.filesChanged && commit.filesChanged.length > 0 && (
              <div className="timeline-row-files">
                <div className="field-label" style={{ marginBottom: 'var(--space-2)' }}>
                  <FileCode size={10} /> {commit.filesChanged.length} file{commit.filesChanged.length !== 1 ? 's' : ''} changed
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 160, overflowY: 'auto' }}>
                  {commit.filesChanged.slice(0, 30).map((file, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={e => { e.stopPropagation(); onOpenFile(file); }}
                      className="commit-file-link"
                      title={file}
                    >
                      {file.split('/').pop()}
                    </button>
                  ))}
                  {commit.filesChanged.length > 30 && (
                    <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', padding: '1px 4px' }}>
                      +{commit.filesChanged.length - 30} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

CommitRow.displayName = 'CommitRow';
