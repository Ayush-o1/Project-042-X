import { describe, it, expect } from 'vitest';
import { computeInsights, deriveRepoRoot, isSourceFile, serializeInsights } from '../insightsEngine';
import type { DependencyGraphData, FileModel, GitGraphData } from '../../types';

const ROOT = '/repo';

function file(relativePath: string, size = 100): FileModel {
  return {
    name: relativePath.split('/').pop() || relativePath,
    path: `${ROOT}/${relativePath}`,
    relativePath,
    isDirectory: false,
    size,
    extension: relativePath.includes('.') ? `.${relativePath.split('.').pop()}` : '',
    language: 'TypeScript',
    lastModified: 0,
  };
}

function graph(nodes: string[], edges: [string, string][]): DependencyGraphData {
  return {
    nodes: nodes.map(rel => ({
      id: `${ROOT}/${rel}`,
      path: `${ROOT}/${rel}`,
      name: rel.split('/').pop() || rel,
      type: 'TypeScript',
    })),
    edges: edges.map(([s, t]) => ({
      sourceId: `${ROOT}/${s}`,
      targetId: `${ROOT}/${t}`,
      type: 'static',
    })),
  };
}

function gitData(commits: { files: string[]; author?: string; date?: string }[]): GitGraphData {
  return {
    head: 'h0',
    commits: commits.map((c, i) => ({
      hash: `h${i}`,
      parents: i + 1 < commits.length ? [`h${i + 1}`] : [],
      author: c.author ?? 'Alice',
      timestamp: c.date ?? '2026-01-01T10:00:00Z',
      message: `commit ${i}`,
      refs: [],
      filesChanged: c.files,
    })),
  };
}

describe('isSourceFile', () => {
  it('accepts parseable extensions and rejects others', () => {
    expect(isSourceFile('/a/b.ts')).toBe(true);
    expect(isSourceFile('/a/b.tsx')).toBe(true);
    expect(isSourceFile('/a/b.mjs')).toBe(true);
    expect(isSourceFile('/a/README.md')).toBe(false);
    expect(isSourceFile('/a/data.json')).toBe(false);
    expect(isSourceFile('/a/script.py')).toBe(false);
  });
});

describe('deriveRepoRoot', () => {
  it('uses relativePath when available', () => {
    expect(deriveRepoRoot([file('src/a.ts'), file('src/b.ts')])).toBe(ROOT);
  });

  it('falls back to the longest common directory prefix', () => {
    const files: FileModel[] = [
      { ...file('x'), path: '/home/u/proj/src/a.ts', relativePath: undefined },
      { ...file('x'), path: '/home/u/proj/lib/b.ts', relativePath: undefined },
      { ...file('x'), path: '/home/u/proj/c.ts', relativePath: undefined },
    ];
    expect(deriveRepoRoot(files)).toBe('/home/u/proj');
  });

  it('returns empty string for an empty list', () => {
    expect(deriveRepoRoot([])).toBe('');
  });
});

describe('computeInsights — graph metrics', () => {
  const files = [
    file('src/a.ts', 100),
    file('src/b.ts', 200),
    file('src/c.ts', 300),
    file('src/lonely.ts', 50),
    file('docs/README.md', 1000),
  ];
  // a <-> b cycle; c -> a; lonely has no edges; README can never have edges
  const deps = graph(
    ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/lonely.ts', 'docs/README.md'],
    [['src/a.ts', 'src/b.ts'], ['src/b.ts', 'src/a.ts'], ['src/c.ts', 'src/a.ts']],
  );

  const insights = computeInsights(files, deps, null);

  it('detects the a<->b cycle via Tarjan SCC', () => {
    expect(insights.circularDependencies).toHaveLength(1);
    expect(insights.circularDependencies[0].sort()).toEqual(
      [`${ROOT}/src/a.ts`, `${ROOT}/src/b.ts`].sort(),
    );
    expect(insights.cycleNodeIds.has(`${ROOT}/src/a.ts`)).toBe(true);
  });

  it('flags only source files as orphans', () => {
    expect(insights.orphanFiles).toEqual([`${ROOT}/src/lonely.ts`]);
  });

  it('excludes non-source files from average fan-in and density denominators', () => {
    // 3 edges over 4 source files
    expect(insights.averageFanIn).toBeCloseTo(3 / 4);
    expect(insights.avgOutDegree).toBeCloseTo(0.75);
    // density = 3 / (4*3) = 25%
    expect(insights.graphDensity).toBeCloseTo(25);
  });

  it('computes instability per Martin: I = Ce / (Ca + Ce)', () => {
    const a = insights.moduleMetrics.get(`${ROOT}/src/a.ts`)!;
    // a: fanOut 1 (a->b), fanIn 2 (b->a, c->a) => I = 1/3
    expect(a.fanIn).toBe(2);
    expect(a.fanOut).toBe(1);
    expect(a.instability).toBeCloseTo(1 / 3);

    const c = insights.moduleMetrics.get(`${ROOT}/src/c.ts`)!;
    // c: fanOut 1, fanIn 0 => I = 1 (maximally unstable)
    expect(c.instability).toBe(1);
  });

  it('counts unstable modules across the whole graph, not a top-10 slice', () => {
    expect(insights.unstableModuleCount).toBe(1); // only c has I > 0.7
  });

  it('ranks largest modules by repo-relative folder, never absolute ancestors', () => {
    const paths = insights.largestModules.map(m => m.path);
    expect(paths).toContain('src');
    expect(paths).toContain('docs');
    for (const p of paths) {
      expect(p.startsWith('/')).toBe(false);
    }
  });

  it('computes package cohesion as internal / total edges', () => {
    const src = insights.packageMetrics.find(p => p.path === `${ROOT}/src`)!;
    // all 3 edges are inside src
    expect(src.internalEdges).toBe(3);
    expect(src.externalEdges).toBe(0);
    expect(src.cohesion).toBe(1);
  });

  it('computes longest dependency chain from roots', () => {
    // c -> a -> b (cycle collapses; DFS guards visited): chain length 3
    expect(insights.longestDependencyChain).toBe(3);
  });
});

describe('computeInsights — git joins', () => {
  const files = [file('src/index.ts'), file('lib/index.ts')];
  const deps = graph(['src/index.ts', 'lib/index.ts'], [['src/index.ts', 'lib/index.ts']]);
  const git = gitData([
    { files: ['src/index.ts'] },
    { files: ['src/index.ts'] },
    { files: ['lib/index.ts'] },
  ]);

  it('joins commit counts by exact repo-relative path (no basename collisions)', () => {
    const insights = computeInsights(files, deps, git);
    expect(insights.moduleMetrics.get(`${ROOT}/src/index.ts`)!.commitCount).toBe(2);
    expect(insights.moduleMetrics.get(`${ROOT}/lib/index.ts`)!.commitCount).toBe(1);
  });

  it('aggregates author contributions with percentages', () => {
    const git2 = gitData([
      { files: ['src/index.ts'], author: 'Alice' },
      { files: ['src/index.ts'], author: 'Alice' },
      { files: ['lib/index.ts'], author: 'Bob' },
      { files: ['lib/index.ts'], author: 'Bob' },
    ]);
    const insights = computeInsights(files, deps, git2);
    expect(insights.authorContributions).toHaveLength(2);
    expect(insights.authorContributions[0].percentage).toBe(50);
  });

  it('buckets commit activity by day', () => {
    const git3 = gitData([
      { files: ['src/index.ts'], date: '2026-02-01T09:00:00Z' },
      { files: ['src/index.ts'], date: '2026-02-01T18:00:00Z' },
      { files: ['lib/index.ts'], date: '2026-02-02T09:00:00Z' },
    ]);
    const insights = computeInsights(files, deps, git3);
    expect(insights.commitActivity).toEqual([
      { date: '2026-02-01', count: 2 },
      { date: '2026-02-02', count: 1 },
    ]);
  });
});

describe('computeInsights — degenerate inputs', () => {
  it('returns a safe partial result without dependency data', () => {
    const insights = computeInsights([file('a.ts')], null, null);
    expect(insights.circularDependencies).toEqual([]);
    expect(insights.orphanFiles).toEqual([]);
    expect(insights.graphDensity).toBe(0);
    expect(insights.moduleMetrics.size).toBe(0);
  });

  it('handles an empty repository', () => {
    const insights = computeInsights([], { nodes: [], edges: [] }, null);
    expect(insights.averageFanIn).toBe(0);
    expect(insights.longestDependencyChain).toBe(0);
  });
});

describe('serializeInsights', () => {
  it('converts Maps and Sets into JSON-safe arrays', () => {
    const files = [file('src/a.ts'), file('src/b.ts')];
    const deps = graph(['src/a.ts', 'src/b.ts'], [['src/a.ts', 'src/b.ts'], ['src/b.ts', 'src/a.ts']]);
    const serialized = serializeInsights(computeInsights(files, deps, null));

    const roundTripped = JSON.parse(JSON.stringify(serialized));
    expect(Array.isArray(roundTripped.moduleMetrics)).toBe(true);
    expect(roundTripped.moduleMetrics.length).toBe(2);
    expect(Array.isArray(roundTripped.cycleNodeIds)).toBe(true);
    expect(roundTripped.cycleNodeIds.length).toBe(2);
  });
});
