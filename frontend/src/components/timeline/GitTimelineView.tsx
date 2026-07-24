import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GroupedVirtuoso, type GroupedVirtuosoHandle } from 'react-virtuoso';
import { GitBranch } from 'lucide-react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { useShallow } from 'zustand/react/shallow';
import { usePersistedState } from '../../hooks/usePersistedState';
import { buildTimelineRows, flatIndexOfCommit } from './timelineRows';
import { bucketCommitActivity, chooseGranularity, classifyIntoBucket } from './activityBuckets';
import { CommitRow } from './CommitRow';
import { DayHeaderRow } from './DayHeaderRow';
import { ActivityHistogram } from './ActivityHistogram';
import { AuthorFilterStack } from './AuthorFilterStack';
import { TimelineToolbar } from './TimelineToolbar';
import { getCommitDayKey } from './commitLanes';
import type { RowDensity } from './constants';

const FLASH_DURATION_MS = 1500;

const GitTimelineFlow: React.FC = () => {
  const {
    git, files, setActiveFile,
    groupByDay, setGroupByDay, collapsedDays, setCollapsedDays,
  } = useRepositoryStore(
    useShallow(s => ({
      git: s.git,
      files: s.files,
      setActiveFile: s.setActiveFile,
      groupByDay: s.gitGroupByDay,
      setGroupByDay: s.setGitGroupByDay,
      collapsedDays: s.gitCollapsedDays,
      setCollapsedDays: s.setGitCollapsedDays,
    })),
  );

  const virtuosoRef = useRef<GroupedVirtuosoHandle>(null);
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [histogramBucketKey, setHistogramBucketKey] = useState<string | null>(null);
  const [density, setDensity] = usePersistedState<RowDensity>('gitTimelineDensity', 'comfortable');
  /** The keyboard-selected/focused row, identified by a stable key rather
   *  than a numeric index — indices shift under day-collapse and filtering,
   *  a hash or day key doesn't. */
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expandedHashes, setExpandedHashes] = useState<Set<string>>(new Set());
  const [flashHash, setFlashHash] = useState<string | null>(null);
  const [pendingJumpHash, setPendingJumpHash] = useState<string | null>(null);

  // `git?.commits ?? []` would allocate a fresh empty array every render
  // whenever no repository is loaded, which is exactly the unstable
  // reference the memoized values below need to avoid.
  const commits = useMemo(() => git?.commits ?? [], [git]);

  const authors = useMemo(() => {
    const set = new Set<string>();
    commits.forEach(c => { if (c.author) set.add(c.author); });
    return Array.from(set).sort();
  }, [commits]);

  const granularity = useMemo(() => chooseGranularity(commits), [commits]);
  const histogramBuckets = useMemo(() => bucketCommitActivity(commits), [commits]);

  const filteredCommits = useMemo(() => {
    return commits.filter(c => {
      if (selectedAuthor && c.author !== selectedAuthor) return false;
      if (histogramBucketKey && c.timestamp) {
        if (classifyIntoBucket(new Date(c.timestamp), granularity) !== histogramBucketKey) return false;
      }
      return true;
    });
  }, [commits, selectedAuthor, histogramBucketKey, granularity]);

  const timeline = useMemo(
    () => buildTimelineRows(filteredCommits, groupByDay ? collapsedDays : new Set()),
    [filteredCommits, groupByDay, collapsedDays],
  );
  const { groups, groupCounts, items } = timeline;

  const totalLanes = useMemo(() => {
    let max = 0;
    for (const g of groups) max = Math.max(max, g.lane, ...g.throughLanes);
    for (const it of items) max = Math.max(max, it.lane, ...it.throughLanes, ...it.mergeIntoLanes);
    return max + 1;
  }, [groups, items]);

  const hasActiveFilters = Boolean(selectedAuthor || histogramBucketKey);
  const clearFilters = () => { setSelectedAuthor(''); setHistogramBucketKey(null); };

  // Resolves a pending "jump to this commit" request once the commit's row
  // actually exists — immediately if it's already visible, or one render
  // later if jumping to it first required expanding a collapsed day.
  useEffect(() => {
    if (!pendingJumpHash) return;
    const flatIndex = flatIndexOfCommit(timeline, pendingJumpHash);
    if (flatIndex === -1) return; // still hidden inside a day we just asked to expand — wait for the re-render
    virtuosoRef.current?.scrollToIndex({ index: flatIndex, align: 'center', behavior: 'smooth' });
    setSelectedKey(pendingJumpHash);
    setFlashHash(pendingJumpHash);
    setPendingJumpHash(null);
    const timer = setTimeout(() => setFlashHash(null), FLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [pendingJumpHash, timeline]);

  // Moves DOM focus to the newly-selected row — but only when focus was
  // already somewhere inside the list, so this never steals focus away from
  // the search input or another control for an unrelated selection change.
  useEffect(() => {
    if (!selectedKey) return;
    if (!containerRef.current?.contains(document.activeElement)) return;
    rowRefs.current.get(selectedKey)?.focus({ preventScroll: true });
  }, [selectedKey]);

  const jumpToCommit = (hash: string) => {
    const commit = commits.find(c => c.hash === hash);
    if (!commit) return;
    const day = getCommitDayKey(commit.timestamp);
    if (groupByDay && collapsedDays.has(day)) {
      const next = new Set(collapsedDays);
      next.delete(day);
      setCollapsedDays(next);
    }
    setPendingJumpHash(hash);
  };

  const handleJumpToLatest = () => {
    if (filteredCommits.length > 0) jumpToCommit(filteredCommits[0].hash);
  };

  const toggleGroupByDay = () => {
    const next = !groupByDay;
    setGroupByDay(next);
    setCollapsedDays(next ? new Set(filteredCommits.map(c => getCommitDayKey(c.timestamp))) : new Set());
  };

  const toggleDayCollapse = (dayKey: string) => {
    const next = new Set(collapsedDays);
    if (next.has(dayKey)) next.delete(dayKey); else next.add(dayKey);
    setCollapsedDays(next);
  };

  const toggleExpanded = (hash: string) => {
    setExpandedHashes(prev => {
      const next = new Set(prev);
      if (next.has(hash)) next.delete(hash); else next.add(hash);
      return next;
    });
  };

  const handleOpenFile = (relativePath: string) => {
    const fileModel = files.find(f => f.path.endsWith(relativePath) || f.name === relativePath.split('/').pop());
    if (fileModel) setActiveFile(fileModel);
  };

  // Flat key sequence (group keys and item hashes interleaved, in render
  // order) — what arrow-key navigation moves through. Recomputed from the
  // same groups/items the list renders, so selection always lands on
  // something actually visible.
  const flatKeys = useMemo(() => {
    const keys: string[] = [];
    let itemIndex = 0;
    for (let g = 0; g < groups.length; g++) {
      keys.push(`day:${groups[g].dayKey}`);
      for (let i = 0; i < groupCounts[g]; i++) keys.push(items[itemIndex + i].commit.hash);
      itemIndex += groupCounts[g];
    }
    return keys;
  }, [groups, groupCounts, items]);

  const moveSelection = (delta: number) => {
    setSelectedKey(prev => {
      const currentIndex = prev ? flatKeys.indexOf(prev) : -1;
      const nextIndex = Math.max(0, Math.min(flatKeys.length - 1, currentIndex + delta));
      return flatKeys[nextIndex] ?? null;
    });
  };

  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    if (flatKeys.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1); }
    else if (e.key === 'Home') { e.preventDefault(); setSelectedKey(flatKeys[0]); }
    else if (e.key === 'End') { e.preventDefault(); setSelectedKey(flatKeys[flatKeys.length - 1]); }
  };

  if (!git) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 'var(--space-6)' }}>
        <div className="empty-state-icon" style={{ marginBottom: 0 }}>
          <GitBranch size={24} style={{ opacity: 0.3 }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>No Git History</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Analyze a repository with a valid <code style={{ fontFamily: 'var(--font-mono)' }}>.git</code> directory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)' }}>
      <TimelineToolbar
        commits={commits}
        onJumpToCommit={jumpToCommit}
        groupByDay={groupByDay}
        onToggleGroupByDay={toggleGroupByDay}
        onJumpToLatest={handleJumpToLatest}
        density={density}
        onDensityChange={setDensity}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        visibleCount={filteredCommits.length}
        totalCount={commits.length}
      />

      <ActivityHistogram
        buckets={histogramBuckets}
        selectedBucketKey={histogramBucketKey}
        onSelectBucket={setHistogramBucketKey}
      />

      {authors.length > 1 && (
        <div style={{ padding: 'var(--space-3) var(--space-6)', borderBottom: '1px solid var(--border-subtle)' }}>
          <AuthorFilterStack authors={authors} selectedAuthor={selectedAuthor} onSelectAuthor={setSelectedAuthor} />
        </div>
      )}

      {groups.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>No commits match the current filters.</p>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="btn btn-secondary btn-sm">Clear filters</button>
          )}
        </div>
      ) : (
        <div
          ref={containerRef}
          role="tree"
          aria-label="Commit history"
          style={{ flex: 1, minHeight: 0 }}
          onKeyDown={handleContainerKeyDown}
        >
          <GroupedVirtuoso
            ref={virtuosoRef}
            groupCounts={groupCounts}
            data={items}
            groupContent={groupIndex => {
              const group = groups[groupIndex];
              const key = `day:${group.dayKey}`;
              // A day with visible commits below it, or any day that isn't
              // the very last group overall, has something for its line to
              // continue into.
              const continuesBelow = groupCounts[groupIndex] > 0 || groupIndex < groups.length - 1;
              return (
                <div ref={el => { if (el) rowRefs.current.set(key, el); else rowRefs.current.delete(key); }}>
                  <DayHeaderRow
                    row={group}
                    totalLanes={totalLanes}
                    continuesBelow={continuesBelow}
                    isSelected={selectedKey === key}
                    onToggleCollapse={() => toggleDayCollapse(group.dayKey)}
                    onSelect={() => setSelectedKey(key)}
                  />
                </div>
              );
            }}
            itemContent={(index, _groupIndex, item) => {
              const isLastItem = index === items.length - 1;
              const continuesBelow = item.commit.parents.length > 0 && !isLastItem;
              return (
                <div ref={el => { if (el) rowRefs.current.set(item.commit.hash, el); else rowRefs.current.delete(item.commit.hash); }}>
                  <CommitRow
                    row={item}
                    totalLanes={totalLanes}
                    density={density}
                    continuesBelow={continuesBelow}
                    isSelected={selectedKey === item.commit.hash}
                    isExpanded={expandedHashes.has(item.commit.hash)}
                    isSearchMatch={flashHash === item.commit.hash}
                    onToggleExpand={() => toggleExpanded(item.commit.hash)}
                    onSelect={() => setSelectedKey(item.commit.hash)}
                    onOpenFile={handleOpenFile}
                  />
                </div>
              );
            }}
          />
        </div>
      )}
    </div>
  );
};

export const GitTimelineView: React.FC = () => (
  <div style={{ height: '100%', width: '100%' }}>
    <GitTimelineFlow />
  </div>
);
