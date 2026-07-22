import type { DependencyGraphData, FileModel, GitGraphData } from '../types';

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
  /** Abstractness: how self-contained the package is */
  abstractness: number;
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
   * Architecture Complexity Score (ACS): ratio of edges to nodes.
   * A fully connected graph has ACS = N-1. We normalize to 0-100.
   * Higher = more coupled architecture.
   */
  architectureComplexityScore: number;
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
  const fileTypeDistributionMap = new Map<string, number>();
  const folderSizeMap = new Map<string, number>();

  for (const file of files) {
    if (!file.isDirectory) {
      const ext = file.extension || 'Unknown';
      fileTypeDistributionMap.set(ext, (fileTypeDistributionMap.get(ext) || 0) + 1);

      const parts = file.path.split('/');
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

    // Hotspots & connectivity
    let totalInDegree = 0;
    for (const node of nodes) {
      const inD = inDegreeMap.get(node.id) || 0;
      const outD = outDegreeMap.get(node.id) || 0;
      totalInDegree += inD;

      if (inD === 0 && outD === 0) orphanFiles.push(node.id);
      hotspots.push({ id: node.id, inDegree: inD });
      mostConnectedFiles.push({ id: node.id, totalDegree: inD + outD });
    }

    hotspots = hotspots.sort((a, b) => b.inDegree - a.inDegree).slice(0, 10);
    mostConnectedFiles = mostConnectedFiles.sort((a, b) => b.totalDegree - a.totalDegree).slice(0, 10);
    averageFanIn = nodes.length > 0 ? totalInDegree / nodes.length : 0;

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

    // ── Architecture Complexity Score ───────────────────────────────────────
    // Normalize edge density: 0 (no edges) to 100 (fully coupled)
    // Max possible edges in directed graph = N*(N-1)
    const N = nodes.length;
    const E = edges.length;
    const maxEdges = N > 1 ? N * (N - 1) : 1;
    const architectureComplexityScore = Math.round((E / maxEdges) * 100);

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
      const instability = totalCoupling === 0 ? 0 : fanOut / totalCoupling;

      // Commit count: try to match by relative path suffix
      const fileName = node.id.split('/').pop() || '';
      let commitCount = 0;
      for (const [relPath, count] of relativeFileCommitMap.entries()) {
        if (node.id.endsWith(relPath) || relPath.endsWith(fileName)) {
          commitCount = count;
          break;
        }
      }

      const isInCycle = cycleNodeIds.has(node.id);
      const isOrphan = fanIn === 0 && fanOut === 0;

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
      // Abstractness: proportion of internal to total edges — higher = more self-contained
      const totalEdges = p.internalEdges + p.externalEdges;
      const abstractness = totalEdges === 0 ? 1 : p.internalEdges / totalEdges;

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
        abstractness,
      };
    }).sort((a, b) => a.avgHealthScore - b.avgHealthScore);

    // Finalize sorted module lists
    const allModules = Array.from(moduleMetrics.values());
    const mostUnstableModules = [...allModules]
      .filter(m => !m.isOrphan)
      .sort((a, b) => b.instability - a.instability)
      .slice(0, 10);
    const sickestModules = [...allModules]
      .filter(m => !m.isOrphan)
      .sort((a, b) => a.healthScore - b.healthScore)
      .slice(0, 10);

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
      architectureComplexityScore,
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
    architectureComplexityScore: 0,
    authorContributions,
    cycleNodeIds: new Set(),
    hotspotNodeIds: new Set(),
  };
}
