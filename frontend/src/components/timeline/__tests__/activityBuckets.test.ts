import { describe, it, expect } from 'vitest';
import { bucketCommitActivity } from '../activityBuckets';
import type { GitCommitNode } from '../../../types';

const commit = (hash: string, timestamp: string): GitCommitNode => ({
  hash, parents: [], author: 'A', timestamp, message: 'm', refs: [], filesChanged: [],
});

describe('bucketCommitActivity', () => {
  it('returns an empty array for no commits', () => {
    expect(bucketCommitActivity([])).toEqual([]);
  });

  it('buckets same-day commits together at day granularity', () => {
    const commits = [
      commit('a', '2026-07-23T09:00:00Z'),
      commit('b', '2026-07-23T18:00:00Z'),
      commit('c', '2026-07-22T09:00:00Z'),
    ];
    const buckets = bucketCommitActivity(commits);
    expect(buckets).toEqual([
      { key: '2026-07-22', count: 1 },
      { key: '2026-07-23', count: 2 },
    ]);
  });

  it('fills gaps between the first and last commit with zero-count buckets', () => {
    const commits = [commit('a', '2026-07-20T00:00:00Z'), commit('b', '2026-07-23T00:00:00Z')];
    const buckets = bucketCommitActivity(commits);
    expect(buckets.map(b => b.key)).toEqual(['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23']);
    expect(buckets.map(b => b.count)).toEqual([1, 0, 0, 1]);
  });

  it('falls back to coarser granularity to keep the bucket count bounded', () => {
    // A span of 400 days with maxBuckets=100 must not produce ~400 day-buckets.
    const commits = [commit('a', '2025-01-01T00:00:00Z'), commit('b', '2026-02-04T00:00:00Z')];
    const buckets = bucketCommitActivity(commits, 100);
    expect(buckets.length).toBeLessThanOrEqual(101);
  });

  it('is oldest-first, ascending', () => {
    const commits = [commit('a', '2026-07-23T00:00:00Z'), commit('b', '2026-07-20T00:00:00Z')];
    const buckets = bucketCommitActivity(commits);
    expect(buckets[0].key < buckets[buckets.length - 1].key).toBe(true);
  });
});
