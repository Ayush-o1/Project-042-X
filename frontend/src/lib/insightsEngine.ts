import type { DependencyGraphData, FileModel, GitGraphData } from '../types';

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Extensions the AST engine can parse — the only files that can have edges. */
const SOURCE_FILE_RE = /\.(ts|tsx|js|jsx|cjs|mjs)$/;
export const isSourceFile = (path: string): boolean => SOURCE_FILE_RE.test(path);

/**
 * Derives the repository root from the file list.
 * Prefers the backend-provided relativePath (exact); falls back to the longest
 * common directory prefix for data loaded from older saved sessions.
 */
export function deriveRepoRoot(files: FileModel[]): string {
  for (const f of files) {
    if (f.relativePath && f.path.endsWith(f.relativePath)) {
      return f.path.slice(0, f.path.length - f.relativePath.length - 1);
    }
  }
  // Fallback: longest common directory prefix of all absolute paths
  if (files.length === 0) return '';
  let prefix = files[0].path.slice(0, files[0].path.lastIndexOf('/'));
  for (const f of files) {
    while (prefix && f.path !== prefix && !f.path.startsWith(prefix + '/')) {
      prefix = prefix.slice(0, prefix.lastIndexOf('/'));
    }
    if (!prefix) break;
  }
  return prefix;
}

// ─── Result Types ──────────────────────────────────────────────────────────────

export interface ModuleMetrics {
  id: string;
  /** Number of modules that depend on this one (afferent coupling) */
  fanIn: number;
  /** Number of modules this one depends on (efferent coupling) */
  fanOut: number;
  /**
   * Robert Martin's Instability metric: I = Ce / (Ca + Ce)
   * Range: 0 (maximally stable) to 1 (maximally unstable)
   * A stable module is depended upon by many; an unstable one depends on many.
   */
  instability: number;
  /**
   * Composite health score: 0 (critical) to 100 (healthy)
   * Weighted combination of: instability penalty, hotspot penalty, git churn penalty
   */
  healthScore: number;
  /** Git commit count for this file */
  commitCount: number;
  /** Whether this module is in a circular dependency cycle */
  isInCycle: boolean;
  /** Whether this module has no imports AND no importers */
  isOrphan: boolean;
}

export interface PackageMetrics {
  path: string;
  fileCount: number;
  totalSize: number;
  avgInstability: number;
  avgHealthScore: number;
  totalFanIn: number;
  totalFanOut: number;
  internalEdges: number;
  externalEdges: number;
  /**
   * Cohesion: ratio of intra-package edges to all edges touching the package
   * (1 = fully self-contained, 0 = all dependencies cross the boundary).
   * Note: this is NOT Robert Martin's "Abstractness" (abstract/total classes),
   * which would require type-level analysis.
   */
  cohesion: number;
}

export interface InsightsResult {
  circularDependencies: string[][];
  orphanFiles: string[];
  hotspots: { id: string; inDegree: number }[];
  largestModules: { path: string; size: number }[];
  fileTypeDistribution: { extension: string; count: number }[];
  mostConnectedFiles: { id: string; totalDegree: number }[];
  mostActiveGitFiles: { path: string; count: number }[];
  commitActivity: { date: string; count: number }[];
  longestDependencyChain: number;
  averageFanIn: number;

  // ── New: Architecture Metrics ──────────────────────────────────────────────
  /** Per-module detailed metrics (instability, health, etc.) */
  moduleMetrics: Map<string, ModuleMetrics>;
  /** Sorted list by instability (descending) — most unstable first */
  mostUnstableModules: ModuleMetrics[];
  /** Sorted list by health score (ascending) — sickest first */
  sickestModules: ModuleMetrics[];
  /** Per-directory package health rollups */
  packageMetrics: PackageMetrics[];
  /**
   * Directed edge density of the source-file graph, as a percentage:
   * E / (N·(N−1)) × 100 where N counts only parseable source files.
   * Real dependency graphs are sparse, so values are typically well below 1%.
   */
  graphDensity: number;
  /** Average outgoing dependencies per source file (E / N). */
  avgOutDegree: number;
  /** Number of source modules with instability > 0.7 (excluding orphans). */
  unstableModuleCount: number;
  /** Author → commit count map */
  authorContributions: { author: string; count: number; percentage: number }[];
  /** Set of node IDs that participate in circular dependencies (for graph overlay) */
  cycleNodeIds: Set<string>;
  /** Top hotspot node IDs (for graph overlay) */
  hotspotNodeIds: Set<string>;
}

// ─── Main Computation ──────────────────────────────────────────────────────────

export function computeInsights(
  files: FileModel[],
  dependencies: DependencyGraphData | null,
  git: GitGraphData | null
): InsightsResult {

  // ── 1. File Type Distribution & Largest Modules ───────────────────────────
  const repoRoot = deriveRepoRoot(files);
  const fileTypeDistributionMap = new Map<string, number>();
  const folderSizeMap = new Map<string, number>();

  for (const file of files) {
    if (!file.isDirectory) {
      const ext = file.extension || 'Unknown';
      fileTypeDistributionMap.set(ext, (fileTypeDistributionMap.get(ext) || 0) + 1);

      // Accumulate sizes on repo-relative folders only. Splitting the absolute
      // path would credit the entire repo size to every ancestor directory
      // (/Users, /Users/name, …), which is meaningless.
      const rel = file.relativePath
        ?? (repoRoot && file.path.startsWith(repoRoot + '/')
          ? file.path.slice(repoRoot.length + 1)
          : file.path);
      const parts = rel.split('/');
      let currentFolder = '';
      for (let i = 0; i < parts.length - 1; i++) {
        currentFolder += (i === 0 ? '' : '/') + parts[i];
        folderSizeMap.set(currentFolder, (folderSizeMap.get(currentFolder) || 0) + file.size);
      }
    }
  }

  const fileTypeDistribution = Array.from(fileTypeDistributionMap.entries())
    .map(([extension, count]) => ({ extension, count }))
    .sort((a, b) => b.count - a.count);

  const largestModules = Array.from(folderSizeMap.entries())
    .map(([path, size]) => ({ path, size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  // ── 2. Git Metrics (compute first — needed for module metrics) ────────────
  const mostActiveGitFilesMap = new Map<string, number>();
  const commitActivityMap = new Map<string, number>();
  const authorCommitMap = new Map<string, number>();

  if (git) {
    for (const commit of git.commits) {
      // Author contributions
      const author = commit.author || 'Unknown';
      authorCommitMap.set(author, (authorCommitMap.get(author) || 0) + 1);

      // Activity over time
      const ts = (commit as any).timestamp ?? (commit as any).date;
      if (ts && typeof ts === 'string' && ts.includes('T')) {
        const dateStr = ts.split('T')[0];
        commitActivityMap.set(dateStr, (commitActivityMap.get(dateStr) || 0) + 1);
      }

      // Per-file commit counts
      if (commit.filesChanged && Array.isArray(commit.filesChanged)) {
        for (const file of commit.filesChanged) {
          if (file) {
            mostActiveGitFilesMap.set(file, (mostActiveGitFilesMap.get(file) || 0) + 1);
          }
        }
      }
    }
  }

  // Build a map from filename (relative) → count for joining with absolute paths
  const relativeFileCommitMap = mostActiveGitFilesMap;

  // ── 3. Graph Metrics ──────────────────────────────────────────────────────
  let circularDependencies: string[][] = [];
  let orphanFiles: string[] = [];
  let hotspots: { id: string; inDegree: number }[] = [];
  let mostConnectedFiles: { id: string; totalDegree: number }[] = [];
  let longestDependencyChain = 0;
  let averageFanIn = 0;
  const moduleMetrics = new Map<string, ModuleMetrics>();
  const cycleNodeIds = new Set<string>();

  if (dependencies) {
    const { nodes, edges } = dependencies;
    const inDegreeMap = new Map<string, number>();
    const outDegreeMap = new Map<string, number>();
    const adjList = new Map<string, string[]>();
    const reverseAdjList = new Map<string, string[]>();

    for (const node of nodes) {
      inDegreeMap.set(node.id, 0);
      outDegreeMap.set(node.id, 0);
      adjList.set(node.id, []);
      reverseAdjList.set(node.id, []);
    }

    for (const edge of edges) {
      inDegreeMap.set(edge.targetId, (inDegreeMap.get(edge.targetId) || 0) + 1);
      outDegreeMap.set(edge.sourceId, (outDegreeMap.get(edge.sourceId) || 0) + 1);

      adjList.get(edge.sourceId)?.push(edge.targetId);
      reverseAdjList.get(edge.targetId)?.push(edge.sourceId);
    }

    // Hotspots & connectivity.
    // Only parseable source files can ever have edges, so orphan detection and
    // per-node averages are restricted to them — otherwise every .md/.json/.py
    // file would be falsely flagged as a "dead code candidate".
    let totalInDegree = 0;
    let sourceNodeCount = 0;
    for (const node of nodes) {
      const inD = inDegreeMap.get(node.id) || 0;
      const outD = outDegreeMap.get(node.id) || 0;
      totalInDegree += inD;

      if (isSourceFile(node.id)) {
        sourceNodeCount++;
        if (inD === 0 && outD === 0) orphanFiles.push(node.id);
      }
      hotspots.push({ id: node.id, inDegree: inD });
      mostConnectedFiles.push({ id: node.id, totalDegree: inD + outD });
    }

    hotspots = hotspots.sort((a, b) => b.inDegree - a.inDegree).slice(0, 10);
    mostConnectedFiles = mostConnectedFiles.sort((a, b) => b.totalDegree - a.totalDegree).slice(0, 10);
    averageFanIn = sourceNodeCount > 0 ? totalInDegree / sourceNodeCount : 0;

    // ── Tarjan's SCC for Circular Dependencies ──────────────────────────────
    let sccIndex = 0;
    const indices = new Map<string, number>();
    const lowlinks = new Map<string, number>();
    const onStack = new Map<string, boolean>();
    const stack: string[] = [];

    const strongconnect = (v: string) => {
      indices.set(v, sccIndex);
      lowlinks.set(v, sccIndex);
      sccIndex++;
      stack.push(v);
      onStack.set(v, true);

      const targets = adjList.get(v) || [];
      for (const w of targets) {
        if (!indices.has(w)) {
          strongconnect(w);
          lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!));
        } else if (onStack.get(w)) {
          lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!));
        }
      }

      if (lowlinks.get(v) === indices.get(v)) {
        const scc: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.set(w, false);
          scc.push(w);
        } while (w !== v);

        if (scc.length > 1) {
          circularDependencies.push(scc);
          scc.forEach(id => cycleNodeIds.add(id));
        }
      }
    };

    for (const node of nodes) {
      if (!indices.has(node.id)) strongconnect(node.id);
    }

    // ── Longest Path (DFS with memoization) ────────────────────────────────
    const memo = new Map<string, number>();
    const dfsLongest = (u: string, visited: Set<string>): number => {
      if (memo.has(u)) return memo.get(u)!;
      if (visited.has(u)) return 0;

      visited.add(u);
      let maxChild = 0;
      for (const v of adjList.get(u) || []) {
        maxChild = Math.max(maxChild, dfsLongest(v, visited));
      }
      visited.delete(u);

      const res = 1 + maxChild;
      memo.set(u, res);
      return res;
    };

    for (const node of nodes) {
      if ((inDegreeMap.get(node.id) || 0) === 0) {
        longestDependencyChain = Math.max(longestDependencyChain, dfsLongest(node.id, new Set()));
      }
    }

    // ── Graph Density (source-file graph only) ─────────────────────────────
    // Directed edge density E / (N·(N−1)). Non-source nodes never carry edges,
    // so including them would only dilute the denominator.
    const N = sourceNodeCount;
    const E = edges.length;
    const maxEdges = N > 1 ? N * (N - 1) : 1;
    const graphDensity = Math.round((E / maxEdges) * 10000) / 100;
    const avgOutDegree = N > 0 ? Math.round((E / N) * 100) / 100 : 0;

    // ── Per-Module Metrics (Instability, Health Score) ─────────────────────
    const maxCommitCount = Math.max(...Array.from(relativeFileCommitMap.values()), 1);
    const maxInDegree = hotspots[0]?.inDegree || 1;

    for (const node of nodes) {
      const fanIn = inDegreeMap.get(node.id) || 0;
      const fanOut = outDegreeMap.get(node.id) || 0;
      const totalCoupling = fanIn + fanOut;

      // Robert Martin's Instability: Ce / (Ca + Ce)
      // Ce = efferent coupling = fanOut (modules this depends on)
      // Ca = afferent coupling = fanIn (modules depending on this)
      // Defined as 0 for uncoupled modules (I is mathematically undefined there).
      const instability = totalCoupling === 0 ? 0 : fanOut / totalCoupling;

      // Commit count: git paths are repo-relative, node ids are absolute.
      // Join deterministically via the repo root instead of guessing by suffix
      // (suffix matching made every `index.ts` share one commit count).
      let commitCount = 0;
      if (repoRoot && node.id.startsWith(repoRoot + '/')) {
        commitCount = relativeFileCommitMap.get(node.id.slice(repoRoot.length + 1)) || 0;
      } else {
        for (const [relPath, count] of relativeFileCommitMap.entries()) {
          if (node.id.endsWith('/' + relPath)) {
            commitCount = count;
            break;
          }
        }
      }

      const isInCycle = cycleNodeIds.has(node.id);
      const isOrphan = isSourceFile(node.id) && fanIn === 0 && fanOut === 0;

      // Health Score (0–100, higher = healthier)
      // Penalize: high instability (weight 40), high hotspot (weight 30), high churn (weight 20), in cycle (weight 10)
      const instabilityPenalty = instability * 40;
      const hotspotPenalty = maxInDegree > 0 ? (fanIn / maxInDegree) * 30 : 0;
      const churnPenalty = maxCommitCount > 0 ? (commitCount / maxCommitCount) * 20 : 0;
      const cyclePenalty = isInCycle ? 10 : 0;
      const healthScore = Math.round(Math.max(0, 100 - instabilityPenalty - hotspotPenalty - churnPenalty - cyclePenalty));

      moduleMetrics.set(node.id, {
        id: node.id,
        fanIn,
        fanOut,
        instability,
        healthScore,
        commitCount,
        isInCycle,
        isOrphan,
      });
    }

    // ── Package Metrics (per directory) ────────────────────────────────────
    const packageMap = new Map<string, {
      fileIds: string[];
      totalFanIn: number;
      totalFanOut: number;
      internalEdges: number;
      externalEdges: number;
    }>();

    for (const node of nodes) {
      const parts = node.id.split('/');
      if (parts.length < 2) continue;
      const pkg = parts.slice(0, -1).join('/');

      if (!packageMap.has(pkg)) {
        packageMap.set(pkg, { fileIds: [], totalFanIn: 0, totalFanOut: 0, internalEdges: 0, externalEdges: 0 });
      }
      const p = packageMap.get(pkg)!;
      p.fileIds.push(node.id);
      p.totalFanIn += inDegreeMap.get(node.id) || 0;
      p.totalFanOut += outDegreeMap.get(node.id) || 0;
    }

    // Count internal vs external edges per package
    for (const edge of edges) {
      const srcPkg = edge.sourceId.split('/').slice(0, -1).join('/');
      const tgtPkg = edge.targetId.split('/').slice(0, -1).join('/');
      if (srcPkg === tgtPkg && packageMap.has(srcPkg)) {
        packageMap.get(srcPkg)!.internalEdges++;
      } else {
        if (packageMap.has(srcPkg)) packageMap.get(srcPkg)!.externalEdges++;
      }
    }

    const packageMetrics: PackageMetrics[] = Array.from(packageMap.entries()).map(([path, p]) => {
      const fileModels = p.fileIds.map(id => moduleMetrics.get(id)).filter(Boolean) as ModuleMetrics[];
      const avgInstability = fileModels.length > 0
        ? fileModels.reduce((s, m) => s + m.instability, 0) / fileModels.length
        : 0;
      const avgHealthScore = fileModels.length > 0
        ? fileModels.reduce((s, m) => s + m.healthScore, 0) / fileModels.length
        : 0;
      const totalSize = p.fileIds.reduce((s, id) => {
        const f = files.find(f => f.path === id);
        return s + (f?.size || 0);
      }, 0);
      // Cohesion: proportion of internal to total edges — higher = more self-contained
      const totalEdges = p.internalEdges + p.externalEdges;
      const cohesion = totalEdges === 0 ? 1 : p.internalEdges / totalEdges;

      return {
        path,
        fileCount: p.fileIds.length,
        totalSize,
        avgInstability,
        avgHealthScore,
        totalFanIn: p.totalFanIn,
        totalFanOut: p.totalFanOut,
        internalEdges: p.internalEdges,
        externalEdges: p.externalEdges,
        cohesion,
      };
    }).sort((a, b) => a.avgHealthScore - b.avgHealthScore);

    // Finalize sorted module lists (source files only — coupling metrics are
    // meaningless for files the parser never touches)
    const sourceModules = Array.from(moduleMetrics.values())
      .filter(m => isSourceFile(m.id) && !m.isOrphan);
    const mostUnstableModules = [...sourceModules]
      .sort((a, b) => b.instability - a.instability)
      .slice(0, 10);
    const sickestModules = [...sourceModules]
      .sort((a, b) => a.healthScore - b.healthScore)
      .slice(0, 10);
    const unstableModuleCount = sourceModules.filter(m => m.instability > 0.7).length;

    // Hotspot node IDs (top 10 by fan-in)
    const hotspotNodeIds = new Set(hotspots.map(h => h.id));

    // ── Author Contributions ──────────────────────────────────────────────
    const totalCommits = git?.commits.length || 1;
    const authorContributions = Array.from(authorCommitMap.entries())
      .map(([author, count]) => ({
        author,
        count,
        percentage: Math.round((count / totalCommits) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const mostActiveGitFiles = Array.from(mostActiveGitFilesMap.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const commitActivity = Array.from(commitActivityMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      circularDependencies,
      orphanFiles,
      hotspots,
      largestModules,
      fileTypeDistribution,
      mostConnectedFiles,
      mostActiveGitFiles,
      commitActivity,
      longestDependencyChain,
      averageFanIn,
      moduleMetrics,
      mostUnstableModules,
      sickestModules,
      packageMetrics,
      graphDensity,
      avgOutDegree,
      unstableModuleCount,
      authorContributions,
      cycleNodeIds,
      hotspotNodeIds,
    };
  }

  // ── No dependency data: return partial result ─────────────────────────────
  const mostActiveGitFiles = Array.from(mostActiveGitFilesMap.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const commitActivity = Array.from(commitActivityMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalCommits = git?.commits.length || 1;
  const authorContributions = Array.from(authorCommitMap.entries())
    .map(([author, count]) => ({
      author,
      count,
      percentage: Math.round((count / totalCommits) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    circularDependencies: [],
    orphanFiles: [],
    hotspots: [],
    largestModules,
    fileTypeDistribution,
    mostConnectedFiles: [],
    mostActiveGitFiles,
    commitActivity,
    longestDependencyChain: 0,
    averageFanIn: 0,
    moduleMetrics: new Map(),
    mostUnstableModules: [],
    sickestModules: [],
    packageMetrics: [],
    graphDensity: 0,
    avgOutDegree: 0,
    unstableModuleCount: 0,
    authorContributions,
    cycleNodeIds: new Set(),
    hotspotNodeIds: new Set(),
  };
}

// ─── Serialization ─────────────────────────────────────────────────────────────

/**
 * Converts an InsightsResult into a plain-JSON-safe object.
 * InsightsResult contains Map and Set values, which JSON.stringify silently
 * serializes as `{}` — exports must go through this instead.
 */
export function serializeInsights(insights: InsightsResult) {
  return {
    ...insights,
    moduleMetrics: Array.from(insights.moduleMetrics.values()),
    cycleNodeIds: Array.from(insights.cycleNodeIds),
    hotspotNodeIds: Array.from(insights.hotspotNodeIds),
  };
}
