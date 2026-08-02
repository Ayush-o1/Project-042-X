import React, { useEffect, useState, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { rankByFuzzyMatch, FILENAME_MATCH_BONUS } from '../../lib/fuzzyMatch';
import {
  Search, FileCode, AlertTriangle, Filter, ChevronDown,
  Flame, EyeOff, CircleDot, Info, FileWarning,
} from 'lucide-react';
import type { DependencyGraphData } from '../../types';
import { healthToColor } from '../../lib/health';

export interface GraphFilters {
  showOrphans: boolean;
  showCycles: boolean;
  highlightHotspots: boolean;
  highlightCycles: boolean;
  fileTypeFilter: string; // '' = all, '.ts', '.js', etc.
}

const DEPTH_OPTIONS: { value: 1 | 2 | 3 | 'all'; label: string }[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 'all', label: 'All' },
];

/** The toolbar needs `overflow-x: auto` so it can scroll horizontally on
 *  narrow viewports, but per the CSS overflow spec, setting only one axis
 *  to a non-`visible` value forces the other axis to compute as `auto` too
 *  — so any dropdown positioned `absolute` inside it gets silently clipped
 *  the instant it extends past the toolbar's own bottom edge (confirmed by
 *  screenshotting: the panel was in the DOM with a real bounding box, just
 *  invisible). Portaling to `document.body` and positioning from the
 *  anchor's live `getBoundingClientRect()` sidesteps that entirely, for
 *  every dropdown this toolbar opens (search results, filters, legend). */
const AnchoredPanel: React.FC<{
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  align: 'left' | 'right';
  children: React.ReactNode;
}> = ({ anchorRef, open, align, children }) => {
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) { setPos(null); return; }
    const update = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      setPos(align === 'left'
        ? { top: rect.bottom + 6, left: rect.left }
        : { top: rect.bottom + 6, right: window.innerWidth - rect.right });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, anchorRef, align]);

  if (!open || !pos) return null;
  return createPortal(
    <div style={{ position: 'fixed', top: pos.top, left: pos.left, right: pos.right, zIndex: 'var(--z-dropdown)' }}>
      {children}
    </div>,
    document.body,
  );
};

/** Search, depth stepper, and filters for the Architecture focus canvas —
 *  a real toolbar docked above the canvas, not a floating overlay, so
 *  opening the Inspector or changing depth never has to reposition it. */
export const ArchitectureToolbar = ({
  files,
  onSearch,
  depth,
  onDepthChange,
  filters,
  onFiltersChange,
  fileTypes,
}: {
  files: DependencyGraphData['nodes'];
  onSearch: (id: string) => void;
  depth: 1 | 2 | 3 | 'all';
  onDepthChange: (depth: 1 | 2 | 3 | 'all') => void;
  filters: GraphFilters;
  onFiltersChange: (f: GraphFilters) => void;
  fileTypes: string[];
}) => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const legendBtnRef = useRef<HTMLButtonElement>(null);

  const results = useMemo(() => {
    if (!query) return [];
    return rankByFuzzyMatch(files, query, [
      { get: n => n.name || '', bonus: FILENAME_MATCH_BONUS },
      { get: n => n.path || '' },
    ]).slice(0, 8);
  }, [files, query]);

  useEffect(() => { setActiveResultIndex(0); }, [query]);

  const selectResult = (id: string) => {
    onSearch(id);
    setQuery('');
    setFocused(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (results[activeResultIndex]) selectResult(results[activeResultIndex].id);
  };

  return (
    <div className="architecture-toolbar">
      <div ref={searchWrapperRef} style={{ position: 'relative' }}>
        <form onSubmit={handleSearch} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={13}
            style={{
              position: 'absolute', left: 8,
              color: focused ? 'var(--accent)' : 'var(--text-tertiary)',
              transition: 'color var(--duration-fast)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Find a file…  (⌘K)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActiveResultIndex(i => Math.min(i + 1, results.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveResultIndex(i => Math.max(i - 1, 0)); }
              else if (e.key === 'Escape') { setQuery(''); (e.target as HTMLInputElement).blur(); }
            }}
            role="combobox"
            aria-expanded={focused && results.length > 0}
            aria-autocomplete="list"
            aria-controls="architecture-search-results"
            aria-activedescendant={results[activeResultIndex] ? `architecture-search-option-${activeResultIndex}` : undefined}
            aria-label="Search files"
            className="graph-search-input"
            id="architecture-search-input"
          />
        </form>
        <AnchoredPanel anchorRef={searchWrapperRef} open={focused && !!query && results.length > 0} align="left">
          <div
            id="architecture-search-results"
            role="listbox"
            aria-label="Matching files"
            className="dropdown-panel animate-slide-up"
            style={{ minWidth: 280 }}
          >
            {results.map((node, i) => (
              <button
                key={node.id}
                id={`architecture-search-option-${i}`}
                role="option"
                aria-selected={i === activeResultIndex}
                type="button"
                className="menu-item"
                onMouseDown={e => e.preventDefault()}
                onClick={() => selectResult(node.id)}
                onMouseEnter={() => setActiveResultIndex(i)}
                style={{ background: i === activeResultIndex ? 'var(--bg-hover)' : undefined }}
              >
                <span className="menu-item-icon"><FileCode size={13} /></span>
                <div style={{ overflow: 'hidden' }}>
                  <div className="menu-item-title">{node.name}</div>
                  <div className="menu-item-subtitle" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.path}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </AnchoredPanel>
      </div>

      <div className="divider-v-sm" />

      <div className="architecture-depth-stepper" role="group" aria-label="Neighborhood depth">
        {DEPTH_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            className={`architecture-depth-btn${depth === opt.value ? ' active' : ''}`}
            onClick={() => onDepthChange(opt.value)}
            aria-pressed={depth === opt.value}
            title={opt.value === 'all' ? 'Show every reachable hop' : `Show ${opt.value} hop${opt.value === 1 ? '' : 's'} out`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="divider-v-sm" />

      <div style={{ position: 'relative' }}>
        <button
          ref={filterBtnRef}
          type="button"
          onClick={() => setFilterOpen(v => !v)}
          title="Filters"
          aria-label="Filters"
          aria-expanded={filterOpen}
          className="btn-icon btn-icon-md"
          style={{ color: filterOpen ? 'var(--accent)' : 'var(--text-tertiary)' }}
        >
          <Filter size={15} />
        </button>

        <AnchoredPanel anchorRef={filterBtnRef} open={filterOpen} align="right">
          <div className="filter-panel" style={{ minWidth: 220 }}>
            <span className="field-label">Filters</span>

            {([
              { key: 'showOrphans',       label: 'Show Orphan Files',      icon: <EyeOff size={12} /> },
              { key: 'showCycles',        label: 'Show Cycle Files Only',  icon: <CircleDot size={12} /> },
              { key: 'highlightHotspots', label: 'Highlight Hotspots',     icon: <Flame size={12} /> },
              { key: 'highlightCycles',   label: 'Highlight Cycles',       icon: <AlertTriangle size={12} /> },
            ] as { key: keyof GraphFilters; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => {
              const val = filters[key] as boolean;
              return (
                <label
                  key={key}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', gap: 'var(--space-3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: val ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                    {icon}
                    <span style={{ fontSize: 'var(--text-xs)' }}>{label}</span>
                  </div>
                  <div
                    role="switch"
                    aria-checked={val}
                    aria-label={label}
                    tabIndex={0}
                    onClick={() => onFiltersChange({ ...filters, [key]: !val })}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFiltersChange({ ...filters, [key]: !val }); } }}
                    className={`toggle-track${val ? ' is-on' : ''}`}
                  >
                    <div className="toggle-thumb" />
                  </div>
                </label>
              );
            })}

            {fileTypes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  File Type
                </span>
                <div style={{ position: 'relative' }}>
                  <select
                    value={filters.fileTypeFilter}
                    onChange={e => onFiltersChange({ ...filters, fileTypeFilter: e.target.value })}
                    aria-label="Filter by file type"
                    style={{
                      width: '100%',
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-xs)',
                      fontFamily: 'var(--font-mono)',
                      cursor: 'pointer',
                      appearance: 'none',
                      paddingRight: 'var(--space-8)',
                    }}
                  >
                    <option value="">All types</option>
                    {fileTypes.map(ext => (
                      <option key={ext} value={ext}>{ext}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                </div>
              </div>
            )}
          </div>
        </AnchoredPanel>
      </div>

      <div style={{ position: 'relative' }}>
        <button
          ref={legendBtnRef}
          type="button"
          onClick={() => setLegendOpen(v => !v)}
          title="Legend"
          aria-label="Legend"
          aria-expanded={legendOpen}
          className="btn-icon btn-icon-md"
          style={{ color: legendOpen ? 'var(--accent)' : 'var(--text-tertiary)' }}
        >
          <Info size={15} />
        </button>

        <AnchoredPanel anchorRef={legendBtnRef} open={legendOpen} align="right">
          <div className="filter-panel" style={{ minWidth: 240 }}>
            <span className="field-label">What am I looking at?</span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Node size — imports
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {[{ s: 8, label: 'few' }, { s: 12, label: 'some' }, { s: 16, label: 'many' }].map(({ s, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: s, height: s, borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }} />
                    <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Left border — health score
              </span>
              <div style={{ height: 6, borderRadius: 3, background: `linear-gradient(to right, ${healthToColor(0)}, ${healthToColor(50)}, ${healthToColor(100)})` }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>
                <span>0 unhealthy</span>
                <span>100 healthy</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Icons
              </span>
              {[
                { icon: <AlertTriangle size={12} color="var(--color-danger)" />, label: 'In a circular dependency' },
                { icon: <Flame size={12} color="#f59e0b" />, label: 'High fan-in hotspot' },
                { icon: <FileWarning size={12} color="var(--color-danger)" />, label: 'Failed to parse' },
              ].map(({ icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  {icon}
                  <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-secondary)' }}>{label}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Edges
              </span>
              {[
                { dash: 'none', label: 'Static import' },
                { dash: '2px 4px', label: 'Dynamic import()' },
                { dash: '8px 4px', label: 'Type-only import' },
              ].map(({ dash, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <svg width="24" height="8" aria-hidden="true">
                    <line x1="0" y1="4" x2="24" y2="4" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeDasharray={dash} />
                  </svg>
                  <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-secondary)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </AnchoredPanel>
      </div>
    </div>
  );
};
