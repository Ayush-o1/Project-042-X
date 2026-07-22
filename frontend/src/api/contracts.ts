/**
 * Wire contract of the backend API (backend/src/api).
 *
 * These types mirror the exact JSON shapes the backend serializes. They are
 * the single place where backend shapes are described on the frontend; the
 * client in ./client.ts converts them into the frontend domain models in
 * ../types. If a backend field changes, this file — and only this file —
 * should fail to compile.
 */

/** Every endpoint responds with this envelope. */
export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/** backend/src/core/scanner/types.ts → FileModel */
export interface WireFile {
  path: string;
  relativePath: string;
  name: string;
  extension: string;
  language: string;
  sizeBytes: number;
}

/** backend/src/core/engine/types.ts → RepositoryStatistics */
export interface WireStatistics {
  totalFiles: number;
  totalSize: number;
  totalCommits: number;
  totalBranches: number;
  predominantLanguage: string;
}

/** POST /repository/analyze response payload */
export interface WireAnalyzeResult {
  /** Identifier of this analysis; pass to subsequent GETs. */
  analysisId: string;
  path: string;
  name: string;
  statistics: WireStatistics;
}

/** backend/src/core/ast/types.ts → GraphNode, serialized */
export interface WireGraphNode {
  id: string;
  fileMetadata: WireFile;
  hasSyntaxError: boolean;
}

/** backend/src/core/ast/types.ts → GraphEdge, serialized */
export interface WireGraphEdge {
  sourceId: string;
  targetId: string;
  isDynamic: boolean;
  isTypeOnly: boolean;
}

export interface WireDependencies {
  nodes: WireGraphNode[];
  edges: WireGraphEdge[];
}

/** backend/src/core/git/types.ts → GitCommitNode; Date serializes to ISO string */
export interface WireCommit {
  hash: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
  refs: string[];
  filesChanged: string[];
}

export interface WireGitData {
  head: string | null;
  commits: WireCommit[];
  /** Total number of commits in the analysis (may exceed commits.length when paginated). */
  totalCommits: number;
}
