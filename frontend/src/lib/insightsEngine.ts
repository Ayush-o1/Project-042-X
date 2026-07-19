import type { DependencyGraphData, FileModel, GitGraphData } from '../types';

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
}

export function computeInsights(
  files: FileModel[],
  dependencies: DependencyGraphData | null,
  git: GitGraphData | null
): InsightsResult {
  // 1. File Type Distribution & Largest Modules
  const fileTypeDistributionMap = new Map<string, number>();
  const folderSizeMap = new Map<string, number>();

  for (const file of files) {
    if (!file.isDirectory) {
      const ext = file.extension || 'Unknown';
      fileTypeDistributionMap.set(ext, (fileTypeDistributionMap.get(ext) || 0) + 1);

      // Accumulate size for parent folders
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

  // 2. Graph Metrics
  let circularDependencies: string[][] = [];
  let orphanFiles: string[] = [];
  let hotspots: { id: string; inDegree: number }[] = [];
  let mostConnectedFiles: { id: string; totalDegree: number }[] = [];
  let longestDependencyChain = 0;
  let averageFanIn = 0;

  if (dependencies) {
    const { nodes, edges } = dependencies;
    const inDegreeMap = new Map<string, number>();
    const outDegreeMap = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    for (const node of nodes) {
      inDegreeMap.set(node.id, 0);
      outDegreeMap.set(node.id, 0);
      adjList.set(node.id, []);
    }

    for (const edge of edges) {
      inDegreeMap.set(edge.targetId, (inDegreeMap.get(edge.targetId) || 0) + 1);
      outDegreeMap.set(edge.sourceId, (outDegreeMap.get(edge.sourceId) || 0) + 1);
      
      const targets = adjList.get(edge.sourceId) || [];
      targets.push(edge.targetId);
      adjList.set(edge.sourceId, targets);
    }

    // Hotspots and Connectivity
    let totalInDegree = 0;
    for (const node of nodes) {
      const inD = inDegreeMap.get(node.id) || 0;
      const outD = outDegreeMap.get(node.id) || 0;
      totalInDegree += inD;

      if (inD === 0 && outD === 0) {
        orphanFiles.push(node.id);
      }
      hotspots.push({ id: node.id, inDegree: inD });
      mostConnectedFiles.push({ id: node.id, totalDegree: inD + outD });
    }

    hotspots = hotspots.sort((a, b) => b.inDegree - a.inDegree).slice(0, 10);
    mostConnectedFiles = mostConnectedFiles.sort((a, b) => b.totalDegree - a.totalDegree).slice(0, 10);
    averageFanIn = nodes.length > 0 ? (totalInDegree / nodes.length) : 0;

    // Tarjan's SCC for Circular Dependencies
    let index = 0;
    const indices = new Map<string, number>();
    const lowlinks = new Map<string, number>();
    const onStack = new Map<string, boolean>();
    const stack: string[] = [];

    const strongconnect = (v: string) => {
      indices.set(v, index);
      lowlinks.set(v, index);
      index++;
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
        }
      }
    };

    for (const node of nodes) {
      if (!indices.has(node.id)) {
        strongconnect(node.id);
      }
    }

    // Longest Path (DAG assumption or DFS memoization)
    const memo = new Map<string, number>();
    const dfsLongest = (u: string, visited: Set<string>): number => {
      if (memo.has(u)) return memo.get(u)!;
      if (visited.has(u)) return 0; // Break cycles
      
      visited.add(u);
      let maxChild = 0;
      const targets = adjList.get(u) || [];
      for (const v of targets) {
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
  }

  // 3. Git Activity Metrics
  const mostActiveGitFilesMap = new Map<string, number>();
  const commitActivityMap = new Map<string, number>();

  if (git) {
    for (const commit of git.commits) {
      // Activity over time (by Day)
      const dateStr = commit.timestamp.split('T')[0];
      commitActivityMap.set(dateStr, (commitActivityMap.get(dateStr) || 0) + 1);

      // Files changed
      if (commit.filesChanged) {
        for (const file of commit.filesChanged) {
          mostActiveGitFilesMap.set(file, (mostActiveGitFilesMap.get(file) || 0) + 1);
        }
      }
    }
  }

  const mostActiveGitFiles = Array.from(mostActiveGitFilesMap.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const commitActivity = Array.from(commitActivityMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date)); // Sort chronologically

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
    averageFanIn
  };
}
