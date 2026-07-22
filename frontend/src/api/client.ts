/**
 * Typed API client. All backend I/O and wire→domain normalization lives here;
 * the store and components only ever see the domain models from ../types.
 */
import { API_URL } from '../lib/config';
import type {
  ApiEnvelope,
  WireAnalyzeResult,
  WireDependencies,
  WireFile,
  WireGitData,
} from './contracts';
import type {
  DependencyGraphData,
  FileModel,
  GitGraphData,
  RepositoryMetadata,
} from '../types';

export class ApiError extends Error {
  public readonly code?: string;
  public readonly status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/** Fetches and unwraps the standard response envelope, throwing ApiError on failure. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(
      'Could not reach the analysis backend. Is it running? (npm run dev:backend)',
    );
  }

  let body: ApiEnvelope<T>;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(`Unexpected non-JSON response from the backend (HTTP ${res.status}).`, undefined, res.status);
  }

  if (!res.ok || !body.success || body.data === undefined) {
    throw new ApiError(
      body.error?.message ?? `Request failed (HTTP ${res.status}).`,
      body.error?.code,
      res.status,
    );
  }
  return body.data;
}

const withAnalysisId = (path: string, analysisId?: string) =>
  analysisId ? `${path}${path.includes('?') ? '&' : '?'}analysisId=${encodeURIComponent(analysisId)}` : path;

// ─── Normalizers (wire → domain) ───────────────────────────────────────────────

function toFileModel(f: WireFile): FileModel {
  return {
    name: f.name,
    path: f.path,
    relativePath: f.relativePath,
    extension: f.extension,
    language: f.language,
    size: f.sizeBytes,
    isDirectory: false, // the scanner only reports files
    lastModified: 0,    // not tracked by the backend
  };
}

function toDependencyGraph(d: WireDependencies): DependencyGraphData {
  return {
    nodes: d.nodes.map(n => ({
      id: n.id,
      path: n.fileMetadata.path,
      name: n.fileMetadata.name,
      type: n.fileMetadata.language,
      hasSyntaxError: n.hasSyntaxError,
    })),
    edges: d.edges.map(e => ({
      sourceId: e.sourceId,
      targetId: e.targetId,
      type: e.isDynamic ? 'dynamic' : 'static',
      isDynamic: e.isDynamic,
      isTypeOnly: e.isTypeOnly,
    })),
  };
}

function toGitGraph(g: WireGitData): GitGraphData {
  return {
    head: g.head,
    commits: g.commits.map(c => ({
      hash: c.hash,
      parents: c.parents,
      author: c.authorName || 'Unknown',
      authorEmail: c.authorEmail,
      timestamp: c.date,
      message: c.message,
      refs: c.refs,
      filesChanged: c.filesChanged,
    })),
    totalCommits: g.totalCommits ?? g.commits.length,
  };
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export interface AnalyzeResponse {
  analysisId: string;
  metadata: RepositoryMetadata;
}

export async function analyzeRepository(
  repoPath: string,
  signal?: AbortSignal,
): Promise<AnalyzeResponse> {
  const data = await request<WireAnalyzeResult>('/repository/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: repoPath }),
    signal,
  });
  return {
    analysisId: data.analysisId,
    metadata: { path: data.path, name: data.name, statistics: data.statistics },
  };
}

export async function fetchFiles(analysisId?: string, signal?: AbortSignal): Promise<FileModel[]> {
  const data = await request<WireFile[]>(withAnalysisId('/repository/files', analysisId), { signal });
  return data.map(toFileModel);
}

export async function fetchDependencies(
  analysisId?: string,
  signal?: AbortSignal,
): Promise<DependencyGraphData> {
  const data = await request<WireDependencies>(withAnalysisId('/repository/dependencies', analysisId), { signal });
  return toDependencyGraph(data);
}

export async function fetchGit(analysisId?: string, signal?: AbortSignal): Promise<GitGraphData> {
  const data = await request<WireGitData>(withAnalysisId('/repository/git', analysisId), { signal });
  return toGitGraph(data);
}

export async function fetchFileContent(filePath: string, analysisId?: string): Promise<string> {
  return request<string>(
    withAnalysisId(`/repository/file-content?path=${encodeURIComponent(filePath)}`, analysisId),
  );
}
