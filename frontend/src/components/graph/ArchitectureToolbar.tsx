import React, { useEffect, useState, useMemo } from 'react';
import { useReactFlow, Panel } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { rankByFuzzyMatch, FILENAME_MATCH_BONUS } from '../../lib/fuzzyMatch';
import {
  Search, ZoomIn, ZoomOut, Maximize, FileCode,
  AlertTriangle, Filter, ChevronDown,
  Flame, EyeOff, CircleDot, ChevronsDownUp, ChevronsUpDown
} from 'lucide-react';

export interface GraphFilters {
  showOrphans: boolean;
  showCycles: boolean;
  highlightHotspots: boolean;
  highlightCycles: boolean;
  fileTypeFilter: string; // '' = all, '.ts', '.js', etc.
}

/** Search, zoom, folder collapse, filters, and the language/status legend
 *  for the Architecture graph. */
export const ArchitectureToolbar = ({
  nodes,
  onSearch,
  filters,
  onFiltersChange,
  fileTypes,
  shiftLeftFor,
  onCollapseAll,
  onExpandAll,
}: {
  nodes: Node[];
  onSearch: (id: string) => void;
  filters: GraphFilters;
  onFiltersChange: (f: GraphFilters) => void;
  fileTypes: string[];
  /** Extra right margin (CSS length) so the toolbar/filter/legend column
   *  doesn't sit underneath the Node Inspector when both are open at once. */
  shiftLeftFor?: string;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);

  // Fuzzy-ranked results instead of a single blind jump to the first
  // substring match — same scoring the Command Palette and Sidebar filter
  // already use, so all three search entry points behave identically.
  const results = useMemo(() => {
    const fileNodes = nodes.filter(n => n.type === 'fileNode');
    return rankByFuzzyMatch(fileNodes, query, [
      { get: n => (n.data.label as string) || '', bonus: FILENAME_MATCH_BONUS },
      { get: n => (n.data.path as string) || '' },
    ]).slice(0, 8);
  }, [nodes, query]);

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
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="btn-icon btn-icon-md"
      style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}
    >
      {icon}
    </button>
  );

  return (
    <Panel
      position="top-right"
      style={{
        margin: 'var(--space-5)',
        marginRight: shiftLeftFor ? `calc(var(--space-5) + ${shiftLeftFor})` : 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        transition: 'margin-right var(--duration-normal) var(--ease-default)',
      }}
    >
      {/* Main toolbar */}
      <div className="graph-toolbar">
        <div style={{ position: 'relative' }}>
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
              placeholder="Find node…"
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
              aria-controls="graph-search-results"
              aria-activedescendant={results[activeResultIndex] ? `graph-search-option-${activeResultIndex}` : undefined}
              aria-label="Search graph nodes"
              className="graph-search-input"
            />
          </form>
          {focused && query && results.length > 0 && (
            <div
              id="graph-search-results"
              role="listbox"
              aria-label="Matching files"
              className="dropdown-panel animate-slide-up"
              style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 260, zIndex: 'var(--z-dropdown)' }}
            >
              {results.map((node, i) => (
                <button
                  key={node.id}
                  id={`graph-search-option-${i}`}
                  role="option"
                  aria-selected={i === activeResultIndex}
                  type="button"
                  className="menu-item"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => selectResult(node)}
                  onMouseEnter={() => setActiveResultIndex(i)}
                  style={{ background: i === activeResultIndex ? 'var(--bg-hover)' : undefined }}
                >
                  <span className="menu-item-icon"><FileCode size={13} /></span>
                  <div style={{ overflow: 'hidden' }}>
                    <div className="menu-item-title">{node.data.label as string}</div>
                    <div className="menu-item-subtitle" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {node.data.path as string}
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
        <div className="divider-v-sm" />
        {iconBtn(onCollapseAll, <ChevronsDownUp size={15} />, 'Collapse all folders')}
        {iconBtn(onExpandAll, <ChevronsUpDown size={15} />, 'Expand all folders')}
        <div className="divider-v-sm" />
        {iconBtn(() => setFilterOpen(v => !v), <Filter size={15} />, 'Filters', filterOpen)}
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="filter-panel" style={{ minWidth: 220 }}>
          <span className="field-label">
            Graph Filters
          </span>

          {/* Toggles */}
          {([
            { key: 'showOrphans',       label: 'Show Orphan Files',     icon: <EyeOff size={12} /> },
            { key: 'showCycles',        label: 'Show Cycle Files Only',  icon: <CircleDot size={12} /> },
            { key: 'highlightHotspots', label: 'Highlight Hotspots',    icon: <Flame size={12} /> },
            { key: 'highlightCycles',   label: 'Highlight Cycles',      icon: <AlertTriangle size={12} /> },
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

          {/* File type filter */}
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
      )}

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-5)',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap',
        }}
      >
        {[
          { color: 'var(--lang-ts)', label: 'TypeScript' },
          { color: 'var(--lang-js)', label: 'JavaScript' },
          { color: 'var(--lang-json)', label: 'JSON' },
          { color: 'var(--color-danger)', label: 'Cycle' },
          { color: '#f59e0b', label: 'Hotspot' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div className="graph-legend-dot" style={{ background: color }} />
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>{label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
};
