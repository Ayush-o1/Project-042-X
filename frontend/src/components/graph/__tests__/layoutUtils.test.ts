import { describe, it, expect } from 'vitest';
import { getDagreLayout, getGitDagreLayout } from '../layoutUtils';
import type { DependencyGraphData } from '../../../types';

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

describe('getGitDagreLayout', () => {
  const commits = [
    { hash: 'c2', parents: ['c1'], message: 'second', author: 'A', refs: [], timestamp: 't2' },
    { hash: 'c1', parents: [], message: 'first', author: 'A', refs: [], timestamp: 't1' },
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
