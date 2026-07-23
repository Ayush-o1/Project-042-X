/// <reference lib="webworker" />
import { getDagreLayout } from './layoutUtils';
import type { DependencyGraphData } from '../../types';
import type { Node, Edge } from '@xyflow/react';

// dagre's layout pass is pure computation (no DOM access), so it's a good
// candidate to move off the main thread. Only the file dependency graph
// uses this worker — it's the one view whose node count is genuinely
// unbounded (README's "Performance Notes" already flagged large repos
// causing a noticeable main-thread pause here). The Git Timeline's layout
// stays synchronous: it's capped at MAX_RENDERED_COMMITS (500), where a
// worker's message-passing overhead would outweigh any benefit.

export interface DagreLayoutRequest {
  requestId: number;
  data: DependencyGraphData;
  direction: 'TB' | 'LR';
}

export interface DagreLayoutResponse {
  requestId: number;
  nodes: Node[];
  edges: Edge[];
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<DagreLayoutRequest>) => {
  const { requestId, data, direction } = e.data;
  const { nodes, edges } = getDagreLayout(data, direction);
  const response: DagreLayoutResponse = { requestId, nodes, edges };
  ctx.postMessage(response);
};
