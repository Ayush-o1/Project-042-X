import { memo } from 'react';
import type { ActivityBucket } from './activityBuckets';

export interface ActivityHistogramProps {
  buckets: ActivityBucket[];
  selectedBucketKey: string | null;
  onSelectBucket: (key: string | null) => void;
}

/** The timeline's overview layer — a bar per time bucket, oldest to newest,
 *  answering "when was this repository actually active" at a glance. Click
 *  a bar to filter the list to that period; click it again to clear. This
 *  replaces the previous implementation's MiniMap, which summarized 2D node
 *  position — meaningless for what is fundamentally 1D chronological data. */
export const ActivityHistogram = memo(({ buckets, selectedBucketKey, onSelectBucket }: ActivityHistogramProps) => {
  if (buckets.length === 0) return null;
  const maxCount = Math.max(...buckets.map(b => b.count), 1);

  return (
    <div
      role="group"
      aria-label="Commit activity over time — click a bar to filter to that period"
      className="timeline-histogram"
    >
      {buckets.map(bucket => {
        const isSelected = bucket.key === selectedBucketKey;
        const heightPct = bucket.count === 0 ? 4 : Math.max(8, (bucket.count / maxCount) * 100);
        return (
          <button
            key={bucket.key}
            type="button"
            className={`timeline-histogram-bar${isSelected ? ' selected' : ''}`}
            style={{ height: `${heightPct}%` }}
            disabled={bucket.count === 0}
            title={`${new Date(bucket.key).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} — ${bucket.count} commit${bucket.count === 1 ? '' : 's'}`}
            aria-pressed={isSelected}
            onClick={() => onSelectBucket(isSelected ? null : bucket.key)}
          />
        );
      })}
    </div>
  );
});

ActivityHistogram.displayName = 'ActivityHistogram';
