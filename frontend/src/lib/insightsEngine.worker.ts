/// <reference lib="webworker" />
import { computeInsights } from './insightsEngine';
import type { InsightsResult } from './insightsEngine';
import type { DependencyGraphData, FileModel, GitGraphData } from '../types';

// computeInsights (Tarjan's SCC, memoized DFS longest-path, several full
// node/edge passes) is pure computation with no DOM access, so — like the
// dagre layout — it's moved off the main thread to avoid blocking the UI
// right as analysis results are about to render.

export interface InsightsWorkerRequest {
  requestId: number;
  files: FileModel[];
  dependencies: DependencyGraphData | null;
  git: GitGraphData | null;
}

export interface InsightsWorkerResponse {
  requestId: number;
  result: InsightsResult;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<InsightsWorkerRequest>) => {
  const { requestId, files, dependencies, git } = e.data;
  const result = computeInsights(files, dependencies, git);
  const response: InsightsWorkerResponse = { requestId, result };
  ctx.postMessage(response);
};
