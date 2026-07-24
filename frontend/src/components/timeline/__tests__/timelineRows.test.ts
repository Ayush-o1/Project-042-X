import { describe, it, expect } from 'vitest';
import { buildTimelineRows, flatIndexOfCommit } from '../timelineRows';
import type { GitCommitNode } from '../../../types';

const commit = (hash: string, parents: string[], day: string, author = 'A'): GitCommitNode => ({
  hash, parents, author, timestamp: `${day}T10:00:00Z`, message: `msg ${hash}`, refs: [], filesChanged: [],
});

describe('buildTimelineRows — linear history, no grouping', () => {
  const commits = [
    commit('c3', ['c2'], '2026-07-23'),
    commit('c2', ['c1'], '2026-07-23'),
    commit('c1', [], '2026-07-22'),
  ];
  const { groups, groupCounts, items } = buildTimelineRows(commits, new Set());

  it('emits one group per day, with matching commit counts', () => {
    expect(groups.map(g => g.dayKey)).toEqual(['2026-07-23', '2026-07-22']);
    expect(groupCounts).toEqual([2, 1]);
  });

  it('flattens all commits into items in newest-first order', () => {
    expect(items.map(i => i.commit.hash)).toEqual(['c3', 'c2', 'c1']);
  });

  it('keeps every commit on the same lane for a linear history', () => {
    expect(new Set(items.map(i => i.lane)).size).toBe(1);
  });

  it('draws no through-lanes or merges for a single-lineage history', () => {
    for (const item of items) {
      expect(item.throughLanes).toEqual([]);
      expect(item.mergeIntoLanes).toEqual([]);
    }
    for (const group of groups) expect(group.throughLanes).toEqual([]);
  });

  it('an expanded day\'s header reports its count but no author summary (the rows below do that)', () => {
    const header = groups.find(g => g.dayKey === '2026-07-23')!;
    expect(header.collapsed).toBe(false);
    expect(header.count).toBe(2);
    expect(header.authors).toEqual([]);
  });
});

describe('buildTimelineRows — branch and merge', () => {
  // c3 merges c2b into mainline (c1 -> c2a -> c3, c2b branches off c1).
  const commits = [
    commit('c3', ['c2a', 'c2b'], '2026-07-23'),
    commit('c2b', ['c1'], '2026-07-23'),
    commit('c2a', ['c1'], '2026-07-23'),
    commit('c1', [], '2026-07-23'),
  ];
  const { items } = buildTimelineRows(commits, new Set());
  const find = (hash: string) => items.find(i => i.commit.hash === hash)!;

  it('gives the merged-in branch (c2b) its own lane, distinct from mainline', () => {
    const c3 = find('c3'), c2a = find('c2a'), c2b = find('c2b');
    expect(c3.lane).toBe(c2a.lane);
    expect(c2b.lane).not.toBe(c2a.lane);
  });

  it('marks the merge commit as connecting down into the other branch\'s lane', () => {
    const c3 = find('c3'), c2b = find('c2b');
    expect(c3.mergeIntoLanes).toEqual([c2b.lane]);
  });

  it('shows the merged branch lane as a through-lane on the row between the merge and its branch point', () => {
    const c2a = find('c2a'), c2b = find('c2b');
    expect(c2a.throughLanes).toContain(c2b.lane);
  });
});

describe('buildTimelineRows — collapsed day', () => {
  const commits = [
    commit('c3', ['c2'], '2026-07-23', 'Bob'),
    commit('c2', ['c1'], '2026-07-23', 'Alice'),
    commit('c1', [], '2026-07-22', 'Alice'),
  ];

  it('replaces the collapsed day\'s commits with a single summarizing group (zero items)', () => {
    const { groups, groupCounts, items } = buildTimelineRows(commits, new Set(['2026-07-23']));
    expect(groups.map(g => g.dayKey)).toEqual(['2026-07-23', '2026-07-22']);
    expect(groupCounts).toEqual([0, 1]);
    expect(items.map(i => i.commit.hash)).toEqual(['c1']);

    const header = groups[0];
    expect(header.collapsed).toBe(true);
    expect(header.count).toBe(2);
    expect(header.authors.sort()).toEqual(['Alice', 'Bob']);
  });

  it('behaves identically to no grouping when collapsedDays is empty', () => {
    const { groups, groupCounts, items } = buildTimelineRows(commits, new Set());
    expect(groups.map(g => g.dayKey)).toEqual(['2026-07-23', '2026-07-22']);
    expect(groupCounts).toEqual([2, 1]);
    expect(items.map(i => i.commit.hash)).toEqual(['c3', 'c2', 'c1']);
  });
});

describe('flatIndexOfCommit', () => {
  const commits = [
    commit('c3', ['c2'], '2026-07-23'),
    commit('c2', ['c1'], '2026-07-23'),
    commit('c1', [], '2026-07-22'),
  ];

  it('counts each group header as one slot ahead of its items', () => {
    const timeline = buildTimelineRows(commits, new Set());
    // flat sequence: [header:23](0) [c3](1) [c2](2) [header:22](3) [c1](4)
    expect(flatIndexOfCommit(timeline, 'c3')).toBe(1);
    expect(flatIndexOfCommit(timeline, 'c2')).toBe(2);
    expect(flatIndexOfCommit(timeline, 'c1')).toBe(4);
  });

  it('returns -1 for a commit hidden inside a collapsed day', () => {
    const timeline = buildTimelineRows(commits, new Set(['2026-07-23']));
    expect(flatIndexOfCommit(timeline, 'c3')).toBe(-1);
  });

  it('returns -1 for an unknown hash', () => {
    const timeline = buildTimelineRows(commits, new Set());
    expect(flatIndexOfCommit(timeline, 'nope')).toBe(-1);
  });
});
