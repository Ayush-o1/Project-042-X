import React, { useEffect, useMemo, useState } from 'react';
import { Search, GitCommit, CalendarDays, ArrowUpToLine, Rows3, Rows2, X } from 'lucide-react';
import { rankByFuzzyMatch } from '../../lib/fuzzyMatch';
import type { GitCommitNode } from '../../types';
import type { RowDensity } from './constants';

export interface TimelineToolbarProps {
  commits: GitCommitNode[];
  onJumpToCommit: (hash: string) => void;
  groupByDay: boolean;
  onToggleGroupByDay: () => void;
  onJumpToLatest: () => void;
  density: RowDensity;
  onDensityChange: (density: RowDensity) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  visibleCount: number;
  totalCount: number;
}

/** Search, day-grouping, jump-to-latest, and density controls for the Git
 *  Timeline. Deliberately has no zoom/pan/fit-view — those belonged to the
 *  previous canvas-based implementation and have no equivalent in a
 *  scrollable list. */
export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
  commits, onJumpToCommit, groupByDay, onToggleGroupByDay, onJumpToLatest,
  density, onDensityChange, hasActiveFilters, onClearFilters, visibleCount, totalCount,
}) => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);

  // Same fuzzy scoring the Architecture graph, Command Palette, and Sidebar
  // filter use. Neither field gets a priority bonus — a commit's hash and
  // message are equally valid ways to find it.
  const results = useMemo(() => rankByFuzzyMatch(commits, query, [
    { get: c => c.message || '' },
    { get: c => c.hash },
  ]).slice(0, 8), [commits, query]);

  useEffect(() => { setActiveResultIndex(0); }, [query]);

  const selectResult = (commit: GitCommitNode) => {
    onJumpToCommit(commit.hash);
    setQuery('');
    setFocused(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (results[activeResultIndex]) selectResult(results[activeResultIndex]);
  };

  const iconBtn = (onClick: () => void, icon: React.ReactNode, label: string, active = false) => (
    <button type="button" onClick={onClick} title={label} aria-label={label} className="btn-icon btn-icon-md" style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}>
      {icon}
    </button>
  );

  return (
    <div className="timeline-toolbar">
      <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
        <form onSubmit={handleSearch} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={13} style={{ position: 'absolute', left: 8, color: focused ? 'var(--accent)' : 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search commits…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActiveResultIndex(i => Math.min(i + 1, results.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveResultIndex(i => Math.max(i - 1, 0)); }
              else if (e.key === 'Escape') { setQuery(''); }
            }}
            role="combobox"
            aria-expanded={focused && results.length > 0}
            aria-autocomplete="list"
            aria-controls="timeline-search-results"
            aria-activedescendant={results[activeResultIndex] ? `timeline-search-option-${activeResultIndex}` : undefined}
            aria-label="Search git commits"
            className="graph-search-input"
            style={{ width: '100%' }}
          />
        </form>
        {focused && query && results.length > 0 && (
          <div id="timeline-search-results" role="listbox" aria-label="Matching commits" className="dropdown-panel animate-slide-up" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 280, zIndex: 'var(--z-dropdown)' }}>
            {results.map((commit, i) => (
              <button
                key={commit.hash}
                id={`timeline-search-option-${i}`}
                role="option"
                aria-selected={i === activeResultIndex}
                type="button"
                className="menu-item"
                onMouseDown={e => e.preventDefault()}
                onClick={() => selectResult(commit)}
                onMouseEnter={() => setActiveResultIndex(i)}
                style={{ background: i === activeResultIndex ? 'var(--bg-hover)' : undefined }}
              >
                <span className="menu-item-icon"><GitCommit size={13} /></span>
                <div style={{ overflow: 'hidden' }}>
                  <div className="menu-item-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{commit.message}</div>
                  <div className="menu-item-subtitle" style={{ fontFamily: 'var(--font-mono)' }}>{commit.hash.substring(0, 7)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="divider-v-sm" />
      {iconBtn(onJumpToLatest, <ArrowUpToLine size={15} />, 'Jump to latest commit')}
      {iconBtn(onToggleGroupByDay, <CalendarDays size={15} />, groupByDay ? 'Ungroup commits' : 'Group by day', groupByDay)}
      <div className="divider-v-sm" />
      {iconBtn(() => onDensityChange('comfortable'), <Rows2 size={15} />, 'Comfortable rows', density === 'comfortable')}
      {iconBtn(() => onDensityChange('compact'), <Rows3 size={15} />, 'Compact rows', density === 'compact')}

      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginLeft: 'var(--space-2)' }}>
        {visibleCount === totalCount ? `${totalCount} commits` : `${visibleCount} of ${totalCount}`}
      </span>

      {hasActiveFilters && (
        <button type="button" onClick={onClearFilters} className="btn-icon btn-icon-md" aria-label="Clear filters" title="Clear filters" style={{ color: 'var(--accent)' }}>
          <X size={14} />
        </button>
      )}
    </div>
  );
};
