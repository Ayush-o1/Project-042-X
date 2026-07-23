import { describe, it, expect } from 'vitest';
import { getDagreLayout, getGitDagreLayout, getFolderPath, assignCommitLanes, getCommitDayKey } from '../layoutUtils';
import type { DependencyGraphData, GitCommitNode } from '../../../types';

const deps: DependencyGraphData = {
  nodes: [
    { id: '/r/src/a.ts', path: '/r/src/a.ts', name: 'a.ts', type: 'TypeScript' },
    { id: '/r/src/b.ts', path: '/r/src/b.ts', name: 'b.ts', type: 'TypeScript' },
    { id: '/r/main.ts', path: '/r/main.ts', name: 'main.ts', type: 'TypeScript' },
  ],
  edges: [
    { sourceId: '/r/main.ts', targetId: '/r/src/a.ts', type: 'static' },
    { sourceId: '/r/src/a.ts', targetId: '/r/src/b.ts', type: 'static' },
  ],
};

describe('getDagreLayout', () => {
  const { nodes, edges } = getDagreLayout(deps, 'LR');

  it('creates a folder node per parent directory plus one file node per input', () => {
    const folderNodes = nodes.filter(n => n.type === 'folderNode');
    const fileNodes = nodes.filter(n => n.type === 'fileNode');
    expect(fileNodes).toHaveLength(3);
    // parents of the three files: /r/src and /r
    expect(folderNodes.map(f => f.id).sort()).toEqual(['/r', '/r/src']);
  });

  it('assigns files to their folder via parentId', () => {
    const a = nodes.find(n => n.id === '/r/src/a.ts')!;
    expect(a.parentId).toBe('/r/src');
    expect(a.extent).toBe('parent');
  });

  it('produces finite positions for every node', () => {
    for (const n of nodes) {
      expect(Number.isFinite(n.position.x)).toBe(true);
      expect(Number.isFinite(n.position.y)).toBe(true);
    }
  });

  it('preserves every edge with a stable id', () => {
    expect(edges).toHaveLength(2);
    expect(edges[0].id).toBe('/r/main.ts-/r/src/a.ts');
    expect(edges.every(e => e.type === 'custom')).toBe(true);
  });
});

describe('getFolderPath', () => {
  it('returns the immediate containing directory', () => {
    expect(getFolderPath('/r/src/components/Foo.tsx')).toBe('/r/src/components');
  });

  it('returns null for a root-level file', () => {
    expect(getFolderPath('index.ts')).toBeNull();
  });
});

describe('getDagreLayout — folder collapse', () => {
  it('hides file nodes inside a collapsed folder, keeping one summary folder node', () => {
    const { nodes } = getDagreLayout(deps, 'LR', new Set(['/r/src']));
    const fileNodes = nodes.filter(n => n.type === 'fileNode');
    const folderNodes = nodes.filter(n => n.type === 'folderNode');

    // a.ts and b.ts both live in /r/src and are now hidden; main.ts (in /r,
    // not collapsed) still renders.
    expect(fileNodes.map(n => n.id)).toEqual(['/r/main.ts']);
    expect(folderNodes).toHaveLength(2);

    const collapsedFolder = folderNodes.find(n => n.id === '/r/src')!;
    expect(collapsedFolder.data.collapsed).toBe(true);
    expect(collapsedFolder.data.fileCount).toBe(2);

    const expandedFolder = folderNodes.find(n => n.id === '/r')!;
    expect(expandedFolder.data.collapsed).toBe(false);
  });

  it('redirects edges that cross into a collapsed folder to the folder id', () => {
    const { edges } = getDagreLayout(deps, 'LR', new Set(['/r/src']));
    // main.ts -> a.ts becomes main.ts -> /r/src (a.ts is hidden)
    expect(edges.some(e => e.source === '/r/main.ts' && e.target === '/r/src')).toBe(true);
  });

  it('drops edges that become internal to a single collapsed folder', () => {
    // a.ts -> b.ts are both inside /r/src — once collapsed, that edge
    // would be a self-loop on the folder node and is dropped entirely.
    const { edges } = getDagreLayout(deps, 'LR', new Set(['/r/src']));
    expect(edges.some(e => e.source === '/r/src' && e.target === '/r/src')).toBe(false);
  });

  it('deduplicates parallel edges produced by redirection, tracking a count', () => {
    // Two files inside the same collapsed folder (/r/lib) both importing the
    // same external file both redirect their source to /r/lib — that's one
    // real "parallel edges" case redirection can create, and it should
    // collapse to a single edge with data.count === 2, not two parallel ones.
    const fanOut: DependencyGraphData = {
      nodes: [
        { id: '/r/lib/a.ts', path: '/r/lib/a.ts', name: 'a.ts', type: 'TypeScript' },
        { id: '/r/lib/b.ts', path: '/r/lib/b.ts', name: 'b.ts', type: 'TypeScript' },
        { id: '/r/util.ts', path: '/r/util.ts', name: 'util.ts', type: 'TypeScript' },
      ],
      edges: [
        { sourceId: '/r/lib/a.ts', targetId: '/r/util.ts', type: 'static' },
        { sourceId: '/r/lib/b.ts', targetId: '/r/util.ts', type: 'static' },
      ],
    };
    const { edges } = getDagreLayout(fanOut, 'LR', new Set(['/r/lib']));
    const fromLib = edges.filter(e => e.source === '/r/lib');
    expect(fromLib).toHaveLength(1);
    expect((fromLib[0].data as { count: number }).count).toBe(2);
  });

  it('behaves identically to the uncollapsed case when collapsedFolders is empty', () => {
    const collapsed = getDagreLayout(deps, 'LR', new Set());
    const defaultArg = getDagreLayout(deps, 'LR');
    expect(collapsed.nodes.map(n => n.id).sort()).toEqual(defaultArg.nodes.map(n => n.id).sort());
    expect(collapsed.edges.map(e => e.id).sort()).toEqual(defaultArg.edges.map(e => e.id).sort());
  });
});

describe('getDagreLayout — node importance sizing', () => {
  it('reserves more space for a file with many importers than one with none', () => {
    const nodes = Array.from({ length: 10 }, (_, i) => ({
      id: `/r/importer${i}.ts`, path: `/r/importer${i}.ts`, name: `importer${i}.ts`, type: 'TypeScript',
    }));
    const hub: DependencyGraphData = {
      nodes: [...nodes, { id: '/r/hub.ts', path: '/r/hub.ts', name: 'hub.ts', type: 'TypeScript' }],
      edges: nodes.map(n => ({ sourceId: n.id, targetId: '/r/hub.ts', type: 'static' })),
    };
    const { nodes: laidOut } = getDagreLayout(hub, 'LR');
    const hubNode = laidOut.find(n => n.id === '/r/hub.ts')!;
    const importerNode = laidOut.find(n => n.id === '/r/importer0.ts')!;

    expect(hubNode.data.importance).toBe('large');
    expect(importerNode.data.importance).toBe('small');
  });
});

describe('assignCommitLanes', () => {
  const commit = (hash: string, parents: string[]): GitCommitNode => ({
    hash, parents, author: 'a', timestamp: 't', message: 'm', refs: [], filesChanged: [],
  });

  it('keeps a linear history on a single lane', () => {
    const commits = [commit('c3', ['c2']), commit('c2', ['c1']), commit('c1', [])];
    const lanes = assignCommitLanes(commits);
    expect(lanes.get('c3')).toBe(lanes.get('c2'));
    expect(lanes.get('c2')).toBe(lanes.get('c1'));
  });

  it('gives a merged-in branch its own lane distinct from the mainline', () => {
    // c3 merges c2b into mainline (c1 -> c2a -> c3, with c2b branching off
    // c1 and merging back at c3).
    const commits = [
      commit('c3', ['c2a', 'c2b']),
      commit('c2b', ['c1']),
      commit('c2a', ['c1']),
      commit('c1', []),
    ];
    const lanes = assignCommitLanes(commits);
    expect(lanes.get('c3')).toBe(lanes.get('c2a')); // mainline continues via first parent
    expect(lanes.get('c2b')).not.toBe(lanes.get('c2a')); // merged branch gets its own lane
  });

  it('assigns a lane to every commit', () => {
    const commits = [commit('c3', ['c2a', 'c2b']), commit('c2b', ['c1']), commit('c2a', ['c1']), commit('c1', [])];
    const lanes = assignCommitLanes(commits);
    for (const c of commits) {
      expect(lanes.has(c.hash)).toBe(true);
      expect(lanes.get(c.hash)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('getGitDagreLayout', () => {
  const commits = [
    { hash: 'c2', parents: ['c1'], message: 'second', author: 'A', refs: [], timestamp: 't2', filesChanged: [] },
    { hash: 'c1', parents: [], message: 'first', author: 'A', refs: [], timestamp: 't1', filesChanged: [] },
  ];
  const { nodes, edges } = getGitDagreLayout({ commits }, 'TB');

  it('creates one commit node per commit', () => {
    expect(nodes).toHaveLength(2);
    expect(nodes.every(n => n.type === 'commitNode')).toBe(true);
  });

  it('creates child-to-parent edges', () => {
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('c2');
    expect(edges[0].target).toBe('c1');
  });

  it('positions all commits with finite coordinates', () => {
    for (const n of nodes) {
      expect(Number.isFinite(n.position.x)).toBe(true);
      expect(Number.isFinite(n.position.y)).toBe(true);
    }
  });
});

describe('getCommitDayKey', () => {
  it('extracts the date portion of an ISO timestamp', () => {
    expect(getCommitDayKey('2026-07-23T14:30:00Z')).toBe('2026-07-23');
  });

  it('falls back to "unknown" for an empty timestamp', () => {
    expect(getCommitDayKey('')).toBe('unknown');
  });
});

describe('getGitDagreLayout — day grouping', () => {
  const commit = (hash: string, parents: string[], day: string, author = 'A'): GitCommitNode => ({
    hash, parents, author, timestamp: `${day}T10:00:00Z`, message: `msg ${hash}`, refs: [], filesChanged: [],
  });

  // Two commits on 2026-07-23, one on 2026-07-22, newest-first.
  const commits = [
    commit('c3', ['c2'], '2026-07-23', 'Bob'),
    commit('c2', ['c1'], '2026-07-23', 'Alice'),
    commit('c1', [], '2026-07-22', 'Alice'),
  ];

  it('leaves individual commit nodes untouched when no day is collapsed', () => {
    const { nodes } = getGitDagreLayout({ commits }, 'TB');
    expect(nodes.every(n => n.type === 'commitNode')).toBe(true);
    expect(nodes).toHaveLength(3);
  });

  it('collapses a day into one summary node with the right count and authors', () => {
    const { nodes } = getGitDagreLayout({ commits }, 'TB', new Set(['2026-07-23']));
    const commitNodes = nodes.filter(n => n.type === 'commitNode');
    const dayNodes = nodes.filter(n => n.type === 'dayGroupNode');

    expect(commitNodes.map(n => n.id)).toEqual(['c1']); // only the un-collapsed day's commit remains
    expect(dayNodes).toHaveLength(1);
    expect(dayNodes[0].data.dayKey).toBe('2026-07-23');
    expect(dayNodes[0].data.count).toBe(2);
    expect((dayNodes[0].data.authors as string[]).sort()).toEqual(['Alice', 'Bob']);
  });

  it('redirects an edge crossing into a collapsed day to the day-group id', () => {
    const { edges } = getGitDagreLayout({ commits }, 'TB', new Set(['2026-07-23']));
    // c2 -> c1 becomes day:2026-07-23 -> c1 (c2 is hidden inside the group)
    expect(edges.some(e => e.source === 'day:2026-07-23' && e.target === 'c1')).toBe(true);
  });

  it('drops an edge that becomes internal to a single collapsed day', () => {
    const { edges } = getGitDagreLayout({ commits }, 'TB', new Set(['2026-07-23']));
    // c3 -> c2 are both inside the collapsed day — would be a self-loop.
    expect(edges.some(e => e.source === 'day:2026-07-23' && e.target === 'day:2026-07-23')).toBe(false);
  });
});
