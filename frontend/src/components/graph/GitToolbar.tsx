import React, { useEffect, useState, useMemo } from 'react';
import { useReactFlow, Panel } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { rankByFuzzyMatch } from '../../lib/fuzzyMatch';
import { hashAuthor } from '../../lib/authorColors';
import {
  Search, ZoomIn, ZoomOut, Maximize, Filter, Users,
  ChevronDown, GitCommit, CalendarDays, ArrowUpToLine
} from 'lucide-react';

/** Search, zoom, jump-to-latest, day-grouping, and author/date filters for
 *  the Git Timeline. */
export const GitToolbar = ({
  nodes,
  onSearch,
  authors,
  selectedAuthor,
  onAuthorChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  groupByDay,
  onToggleGroupByDay,
  onJumpToLatest,
}: {
  nodes: Node[];
  onSearch: (id: string) => void;
  authors: string[];
  selectedAuthor: string;
  onAuthorChange: (a: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (d: string) => void;
  onDateToChange: (d: string) => void;
  groupByDay: boolean;
  onToggleGroupByDay: () => void;
  onJumpToLatest: () => void;
}) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);

  // Fuzzy-ranked results (hash or message) instead of a single blind jump to
  // the first substring match — same scoring the Architecture graph's search,
  // Command Palette, and Sidebar filter already use. Neither field gets a
  // priority bonus here (unlike those three): a commit's hash and message
  // are equally valid ways to find it, so the better of the two matches wins.
  const results = useMemo(() => rankByFuzzyMatch(nodes, query, [
    { get: n => (n.data.message as string) || '' },
    { get: n => n.id },
  ]).slice(0, 8), [nodes, query]);

  useEffect(() => { setActiveResultIndex(0); }, [query]);

  const selectResult = (node: Node) => {
    onSearch(node.id);
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

  const hasActiveFilters = selectedAuthor !== '' || dateFrom !== '' || dateTo !== '';

  return (
    <Panel position="top-right" style={{ margin: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div className="graph-toolbar">
        <div style={{ position: 'relative' }}>
          <form onSubmit={handleSearch} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={13} style={{ position: 'absolute', left: 8, color: focused ? 'var(--accent)' : 'var(--text-tertiary)', transition: 'color var(--duration-fast)', pointerEvents: 'none' }} />
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
              aria-controls="git-search-results"
              aria-activedescendant={results[activeResultIndex] ? `git-search-option-${activeResultIndex}` : undefined}
              aria-label="Search git commits"
              className="graph-search-input"
            />
          </form>
          {focused && query && results.length > 0 && (
            <div
              id="git-search-results"
              role="listbox"
              aria-label="Matching commits"
              className="dropdown-panel animate-slide-up"
              style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 280, zIndex: 'var(--z-dropdown)' }}
            >
              {results.map((node, i) => (
                <button
                  key={node.id}
                  id={`git-search-option-${i}`}
                  role="option"
                  aria-selected={i === activeResultIndex}
                  type="button"
                  className="menu-item"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => selectResult(node)}
                  onMouseEnter={() => setActiveResultIndex(i)}
                  style={{ background: i === activeResultIndex ? 'var(--bg-hover)' : undefined }}
                >
                  <span className="menu-item-icon"><GitCommit size={13} /></span>
                  <div style={{ overflow: 'hidden' }}>
                    <div className="menu-item-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {node.data.message as string}
                    </div>
                    <div className="menu-item-subtitle" style={{ fontFamily: 'var(--font-mono)' }}>
                      {node.id.substring(0, 7)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="divider-v-sm" />
        {iconBtn(() => zoomIn({ duration: 800 }), <ZoomIn size={15} />, 'Zoom in')}
        {iconBtn(() => zoomOut({ duration: 800 }), <ZoomOut size={15} />, 'Zoom out')}
        {iconBtn(() => fitView({ duration: 800 }), <Maximize size={15} />, 'Fit view')}
        {iconBtn(onJumpToLatest, <ArrowUpToLine size={15} />, 'Jump to latest commit')}
        <div className="divider-v-sm" />
        {iconBtn(onToggleGroupByDay, <CalendarDays size={15} />, groupByDay ? 'Ungroup commits' : 'Group by day', groupByDay)}
        <div className="divider-v-sm" />
        <div style={{ position: 'relative' }}>
          {iconBtn(() => setFilterOpen(v => !v), <Filter size={15} />, 'Filters', filterOpen || hasActiveFilters)}
          {hasActiveFilters && (
            <div className="status-dot" style={{ position: 'absolute', top: 4, right: 4, background: 'var(--accent)' }} />
          )}
        </div>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="filter-panel" style={{ minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="field-label">Git Filters</span>
            {hasActiveFilters && (
              <button type="button" onClick={() => { onAuthorChange(''); onDateFromChange(''); onDateToChange(''); }} style={{ fontSize: 'var(--text-2xs)', color: 'var(--accent)', background: 'transparent', cursor: 'pointer' }}>
                Clear all
              </button>
            )}
          </div>

          {/* Author filter */}
          {authors.length > 0 && (
            <div>
              <label style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 'var(--space-2)' }}>
                <Users size={10} /> Author
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedAuthor}
                  onChange={e => onAuthorChange(e.target.value)}
                  aria-label="Filter by author"
                  style={{
                    width: '100%', padding: 'var(--space-2) var(--space-3)',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                    fontSize: 'var(--text-xs)', cursor: 'pointer', appearance: 'none', paddingRight: 'var(--space-8)',
                  }}
                >
                  <option value="">All authors</option>
                  {authors.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
              </div>
              {selectedAuthor && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: hashAuthor(selectedAuthor) }} />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{selectedAuthor}</span>
                </div>
              )}
            </div>
          )}

          {/* Date range */}
          <div>
            <label style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 'var(--space-2)' }}>
              Date Range
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', minWidth: 24 }}>From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => onDateFromChange(e.target.value)}
                  aria-label="From date"
                  style={{ flex: 1, padding: '3px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', minWidth: 24 }}>To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => onDateToChange(e.target.value)}
                  aria-label="To date"
                  style={{ flex: 1, padding: '3px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
};
