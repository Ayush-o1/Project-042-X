/// <reference lib="webworker" />
import { getFocusedLayout } from './layoutUtils';
import type { FocusedLayoutResult } from './layoutUtils';
import type { DependencyGraphData } from '../../types';

// dagre's layout pass is pure computation (no DOM access), so it's a good
// candidate to move off the main thread. Only the file dependency graph
// uses this worker — it's the one view whose node count is genuinely
// unbounded (README's "Performance Notes" already flagged large repos
// causing a noticeable main-thread pause here). The Git Timeline's layout
// stays synchronous: it's a virtualized list, not a canvas layout problem.

export interface DagreLayoutRequest {
  requestId: number;
  data: DependencyGraphData;
  /** File (or, for a folder focus, every file in that folder) to center
   *  the neighborhood on. Empty means "no focus" — the caller should skip
   *  requesting a layout entirely in that case. */
  centerIds: string[];
  depth: 1 | 2 | 3 | 'all';
  /** Skip the edge/node budget check and lay out exactly the requested
   *  depth, however expensive — set when the user explicitly dismisses a
   *  "neighborhood too large" reduction notice. */
  override?: boolean;
}

export interface DagreLayoutResponse {
  requestId: number;
  result: FocusedLayoutResult;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<DagreLayoutRequest>) => {
  const { requestId, data, centerIds, depth, override } = e.data;
  const result = getFocusedLayout(data, centerIds, depth, { override });
  const response: DagreLayoutResponse = { requestId, result };
  ctx.postMessage(response);
};
