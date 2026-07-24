import type { GitCommitNode } from '../../types';

export type BucketGranularity = 'day' | 'week' | 'month';

export interface ActivityBucket {
  /** ISO date (UTC midnight) of the bucket's start. */
  key: string;
  count: number;
}

const DAY_MS = 86_400_000;

const startOfWeek = (d: Date): Date => {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = copy.getUTCDay();
  copy.setUTCDate(copy.getUTCDate() - day);
  return copy;
};
const startOfMonth = (d: Date): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const startOfDay = (d: Date): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** Which bucket a given date falls into at a given granularity — exported
 *  so a consumer that already knows the histogram's chosen granularity (see
 *  {@link chooseGranularity}) can classify a single commit into a bucket
 *  key without re-bucketing the whole list, e.g. to filter the commit list
 *  down to whichever bucket the user clicked. */
export const classifyIntoBucket = (d: Date, granularity: BucketGranularity): string => {
  const start = granularity === 'day' ? startOfDay(d) : granularity === 'week' ? startOfWeek(d) : startOfMonth(d);
  return start.toISOString().split('T')[0];
};

const addUnit = (key: string, granularity: BucketGranularity): string => {
  const d = new Date(`${key}T00:00:00Z`);
  if (granularity === 'day') d.setUTCDate(d.getUTCDate() + 1);
  else if (granularity === 'week') d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().split('T')[0];
};

/**
 * Buckets commits into a chronological (oldest → newest) activity histogram,
 * choosing the coarsest granularity that still keeps the bucket count under
 * `maxBuckets` — day-level for anything spanning a few months, falling back
 * to week then month for longer histories, so the histogram stays a fixed,
 * reasonable width regardless of how far back history goes. Empty periods
 * are included as zero-count buckets so the shape reads as a continuous
 * timeline rather than skipping gaps.
 */
/** The granularity {@link bucketCommitActivity} would choose for this
 *  commit list — exposed separately so a caller can classify individual
 *  commits (via {@link classifyIntoBucket}) using the exact same scheme the
 *  rendered histogram used, without re-deriving it. */
export function chooseGranularity(commits: GitCommitNode[], maxBuckets = 120): BucketGranularity {
  const dated = commits.filter(c => c.timestamp).map(c => new Date(c.timestamp).getTime());
  if (dated.length === 0) return 'day';
  const spanDays = Math.max(1, Math.ceil((Math.max(...dated) - Math.min(...dated)) / DAY_MS));
  if (spanDays > maxBuckets * 30) return 'month';
  if (spanDays > maxBuckets) return 'week';
  return 'day';
}

export function bucketCommitActivity(commits: GitCommitNode[], maxBuckets = 120): ActivityBucket[] {
  const dated = commits.filter(c => c.timestamp).map(c => new Date(c.timestamp));
  if (dated.length === 0) return [];

  const minTime = Math.min(...dated.map(d => d.getTime()));
  const maxTime = Math.max(...dated.map(d => d.getTime()));
  const granularity = chooseGranularity(commits, maxBuckets);

  const counts = new Map<string, number>();
  for (const date of dated) {
    const key = classifyIntoBucket(date, granularity);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const buckets: ActivityBucket[] = [];
  let cursor = classifyIntoBucket(new Date(minTime), granularity);
  const end = classifyIntoBucket(new Date(maxTime), granularity);
  // Bounded loop: span is already capped in day-terms above, so this cannot
  // run away even for a multi-decade history.
  while (cursor <= end && buckets.length <= maxBuckets + 1) {
    buckets.push({ key: cursor, count: counts.get(cursor) ?? 0 });
    if (cursor === end) break;
    cursor = addUnit(cursor, granularity);
  }

  return buckets;
}
