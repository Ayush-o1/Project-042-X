import { assignCommitLanes, getCommitDayKey } from './commitLanes';
import type { GitCommitNode } from '../../types';

/**
 * A day-header row. Always rendered as a sticky divider; when `collapsed`,
 * it stands in for every commit made that day (the day's commits are not
 * emitted as separate item rows) and `authors`/`count` summarize them.
 */
export interface TimelineHeaderRow {
  dayKey: string;
  count: number;
  authors: string[];
  collapsed: boolean;
  /** Lane this row's own dot renders in — the newest commit's lane, since
   *  commits are newest-first within a day. */
  lane: number;
  /** Other lanes with a lineage passing straight through this row's full
   *  height (rendered as a plain vertical line, no dot). */
  throughLanes: number[];
}

export interface TimelineCommitRow {
  commit: GitCommitNode;
  lane: number;
  throughLanes: number[];
  /** Additional parent lanes this commit merges into, beyond the one its
   *  own lane continues into. Empty for a non-merge commit. */
  mergeIntoLanes: number[];
}

export interface TimelineGroups {
  /** One entry per calendar day, newest first. */
  groups: TimelineHeaderRow[];
  /** Parallel to `groups` — how many rows of `items` belong to each group.
   *  0 for a collapsed day (its commits aren't in `items` at all). Matches
   *  the shape `GroupedVirtuoso`'s `groupCounts` prop expects directly. */
  groupCounts: number[];
  /** Every rendered commit row, flattened across all groups in the same
   *  order `groupCounts` implies. */
  items: TimelineCommitRow[];
}

/**
 * Splits commit history into the day-groups and commit-rows
 * `GroupedVirtuoso` renders, and computes each row's lane-gutter geometry
 * (which lanes are active, which are merging in) directly from
 * `assignCommitLanes`'s lane assignment.
 *
 * `assignCommitLanes` decides WHICH lane a commit belongs to (a stable
 * identity used for color). This function separately walks the same
 * newest-first history to decide, row by row, which lanes have an active
 * lineage passing through — i.e. the actual line geometry a gutter draws.
 * The two are kept apart deliberately: lane assignment doesn't change when
 * a day collapses, but which lines are visible does.
 *
 * @param commits Newest-first (the order the store already provides).
 */
export function buildTimelineRows(
  commits: GitCommitNode[],
  collapsedDays: Set<string>,
): TimelineGroups {
  const laneOf = assignCommitLanes(commits);

  const dayOrder: string[] = [];
  const dayCommits = new Map<string, GitCommitNode[]>();
  for (const commit of commits) {
    const day = getCommitDayKey(commit.timestamp);
    if (!dayCommits.has(day)) {
      dayCommits.set(day, []);
      dayOrder.push(day);
    }
    dayCommits.get(day)!.push(commit);
  }

  // activeLanes[i] is the hash lane i is currently waiting to reach, walking
  // backwards through time — the same bookkeeping assignCommitLanes uses
  // internally, rebuilt here because row rendering needs the live snapshot
  // at every row, not just the final lane each commit landed in.
  const activeLanes: (string | null)[] = [];
  const setLane = (lane: number, hash: string | null) => {
    while (activeLanes.length <= lane) activeLanes.push(null);
    activeLanes[lane] = hash;
  };
  const activeLaneIndices = (excludeLane: number): number[] => {
    const lanes: number[] = [];
    activeLanes.forEach((hash, lane) => {
      if (hash !== null && lane !== excludeLane) lanes.push(lane);
    });
    return lanes;
  };

  const groups: TimelineHeaderRow[] = [];
  const groupCounts: number[] = [];
  const items: TimelineCommitRow[] = [];

  for (const day of dayOrder) {
    const dayList = dayCommits.get(day)!;
    const repLane = laneOf.get(dayList[0].hash) ?? 0;

    if (collapsedDays.has(day)) {
      const throughLanes = activeLaneIndices(repLane);
      const authors = new Set<string>();
      for (const commit of dayList) {
        if (commit.author) authors.add(commit.author);
        const lane = laneOf.get(commit.hash)!;
        const [firstParent, ...otherParents] = commit.parents;
        setLane(lane, firstParent ?? null);
        for (const parentHash of otherParents) {
          const parentLane = laneOf.get(parentHash);
          if (parentLane !== undefined && !activeLanes.includes(parentHash)) {
            setLane(parentLane, parentHash);
          }
        }
      }
      groups.push({
        dayKey: day, count: dayList.length,
        authors: Array.from(authors), collapsed: true,
        lane: repLane, throughLanes,
      });
      groupCounts.push(0);
      continue;
    }

    groups.push({
      dayKey: day, count: dayList.length,
      authors: [], collapsed: false,
      lane: repLane, throughLanes: activeLaneIndices(repLane),
    });

    let countThisGroup = 0;
    for (const commit of dayList) {
      const lane = laneOf.get(commit.hash)!;
      const throughLanes = activeLaneIndices(lane);
      const [firstParent, ...otherParents] = commit.parents;
      const mergeIntoLanes: number[] = [];

      setLane(lane, firstParent ?? null);
      for (const parentHash of otherParents) {
        const parentLane = laneOf.get(parentHash);
        if (parentLane === undefined) continue;
        if (!activeLanes.includes(parentHash)) setLane(parentLane, parentHash);
        mergeIntoLanes.push(parentLane);
      }

      items.push({ commit, lane, throughLanes, mergeIntoLanes });
      countThisGroup++;
    }
    groupCounts.push(countThisGroup);
  }

  return { groups, groupCounts, items };
}

/**
 * The position a given commit would occupy in `GroupedVirtuoso`'s single
 * flattened, continuously-scrollable list — group headers count as one slot
 * each, same as `GroupProps`'s `data-item-index` describes — so
 * `scrollToIndex`/`scrollIntoView` land on the right row. Returns -1 if the
 * commit isn't currently rendered (filtered out, or hidden inside a
 * collapsed day that hasn't been expanded yet).
 */
export function flatIndexOfCommit(
  { groups, groupCounts, items }: TimelineGroups,
  hash: string,
): number {
  const itemIndex = items.findIndex(i => i.commit.hash === hash);
  if (itemIndex === -1) return -1;

  let flatIndex = 0;
  let remaining = itemIndex;
  for (let g = 0; g < groups.length; g++) {
    flatIndex += 1; // the group's own header slot
    const count = groupCounts[g];
    if (remaining < count) return flatIndex + remaining;
    flatIndex += count;
    remaining -= count;
  }
  return -1; // unreachable if itemIndex was valid
}
