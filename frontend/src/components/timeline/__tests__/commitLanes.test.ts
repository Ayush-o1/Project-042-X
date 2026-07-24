import { describe, it, expect } from 'vitest';
import { assignCommitLanes, getCommitDayKey } from '../commitLanes';
import type { GitCommitNode } from '../../../types';

describe('assignCommitLanes', () => {
  const commit = (hash: string, parents: string[]): GitCommitNode => ({
    hash, parents, author: 'a', timestamp: 't', message: 'm', refs: [], filesChanged: [],
  });

  it('keeps a linear history on a single lane', () => {
    const commits = [commit('c3', ['c2']), commit('c2', ['c1']), commit('c1', [])];
    const lanes = assignCommitLanes(commits);
    expect(lanes.get('c3')).toBe(lanes.get('c2'));
    expect(lanes.get('c2')).toBe(lanes.get('c1'));
  });

  it('gives a merged-in branch its own lane distinct from the mainline', () => {
    // c3 merges c2b into mainline (c1 -> c2a -> c3, with c2b branching off
    // c1 and merging back at c3).
    const commits = [
      commit('c3', ['c2a', 'c2b']),
      commit('c2b', ['c1']),
      commit('c2a', ['c1']),
      commit('c1', []),
    ];
    const lanes = assignCommitLanes(commits);
    expect(lanes.get('c3')).toBe(lanes.get('c2a')); // mainline continues via first parent
    expect(lanes.get('c2b')).not.toBe(lanes.get('c2a')); // merged branch gets its own lane
  });

  it('assigns a lane to every commit', () => {
    const commits = [commit('c3', ['c2a', 'c2b']), commit('c2b', ['c1']), commit('c2a', ['c1']), commit('c1', [])];
    const lanes = assignCommitLanes(commits);
    for (const c of commits) {
      expect(lanes.has(c.hash)).toBe(true);
      expect(lanes.get(c.hash)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('getCommitDayKey', () => {
  it('extracts the date portion of an ISO timestamp', () => {
    expect(getCommitDayKey('2026-07-23T14:30:00Z')).toBe('2026-07-23');
  });

  it('falls back to "unknown" for an empty timestamp', () => {
    expect(getCommitDayKey('')).toBe('unknown');
  });
});
