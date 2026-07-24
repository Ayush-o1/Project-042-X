import type { GitCommitNode } from '../../types';

/** The calendar day (repo-local to whatever the commit timestamp encodes) a
 *  commit falls on, used as its day-group id. */
export function getCommitDayKey(timestamp: string): string {
  return timestamp ? timestamp.split('T')[0] : 'unknown';
}

// ─── Commit lane assignment (branch topology coloring) ────────────────────────
//
// Git doesn't durably record "which branch" a historical commit belongs to —
// refs only mark current branch *tips*. What's fully recoverable from the
// commit list itself is topology: parent/child structure. This assigns each
// commit to a "lane" using the same technique `git log --graph` and tools
// like GitKraken use — walk commits newest-first, track which lane each
// still-open lineage occupies, and reuse/open/close lanes as merges and
// branch points are encountered. The result is a small integer per commit
// (not a position), used both to pick a stable color and — in the timeline
// gutter — to fix each lane's horizontal position.

const BRANCH_PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
];

export function laneColor(lane: number): string {
  return BRANCH_PALETTE[lane % BRANCH_PALETTE.length];
}

/**
 * @param commits Must be newest-first (the order the backend/renderedCommits
 *   already provide) — the algorithm walks history backwards in time.
 * @returns commit hash -> lane index.
 */
export function assignCommitLanes(commits: GitCommitNode[]): Map<string, number> {
  const laneOf = new Map<string, number>();
  // activeLanes[i] is the hash that lane i is currently waiting to reach as
  // it walks backwards through history; `null` marks a free (reusable) lane.
  const activeLanes: (string | null)[] = [];

  const claimLane = (expecting: string | null): number => {
    const free = activeLanes.indexOf(null);
    if (free !== -1) {
      activeLanes[free] = expecting;
      return free;
    }
    activeLanes.push(expecting);
    return activeLanes.length - 1;
  };

  for (const commit of commits) {
    let lane = activeLanes.indexOf(commit.hash);
    if (lane === -1) {
      // No open lineage was waiting for this commit — it's a new branch tip
      // (or the render window was capped before its child appeared).
      lane = claimLane(null);
    }
    laneOf.set(commit.hash, lane);

    const [firstParent, ...otherParents] = commit.parents;
    // This lane continues into the first parent (git's own convention for
    // "which side of a merge is the mainline"); a root commit closes it.
    activeLanes[lane] = firstParent ?? null;

    // Additional parents (merge sources) open their own lanes if nothing is
    // already tracking them, so the merged-in branch gets its own color
    // for its remaining history above the merge point.
    for (const parentHash of otherParents) {
      if (!activeLanes.includes(parentHash)) {
        claimLane(parentHash);
      }
    }
  }

  return laneOf;
}
