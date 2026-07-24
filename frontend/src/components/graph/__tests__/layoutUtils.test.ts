import { describe, it, expect } from 'vitest';
import { getFocusedLayout, getFolderPath, importanceTier } from '../layoutUtils';
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

describe('getFocusedLayout', () => {
  it('returns nothing for an empty center set', () => {
    expect(getFocusedLayout(deps, [], 2)).toEqual({ nodes: [], edges: [] });
  });

  it('includes the center node itself, marked isCenter', () => {
    const { nodes } = getFocusedLayout(deps, ['/r/src/a.ts'], 2);
    const center = nodes.find(n => n.id === '/r/src/a.ts')!;
    expect(center).toBeDefined();
    expect(center.isCenter).toBe(true);
  });

  it('places dependencies and dependents on opposite sides of the center', () => {
    const { nodes } = getFocusedLayout(deps, ['/r/src/a.ts'], 2);
    const center = nodes.find(n => n.id === '/r/src/a.ts')!;
    const dependency = nodes.find(n => n.id === '/r/src/b.ts')!; // a -> b
    const dependent = nodes.find(n => n.id === '/r/main.ts')!;   // main -> a

    expect(dependency.position.x).toBeGreaterThan(center.position.x);
    expect(dependent.position.x).toBeLessThan(center.position.x);
  });

  it('respects the depth limit — a hop beyond depth is excluded', () => {
    const chain: DependencyGraphData = {
      nodes: [
        { id: 'a', path: 'a.ts', name: 'a.ts', type: 'TypeScript' },
        { id: 'b', path: 'b.ts', name: 'b.ts', type: 'TypeScript' },
        { id: 'c', path: 'c.ts', name: 'c.ts', type: 'TypeScript' },
      ],
      edges: [
        { sourceId: 'a', targetId: 'b', type: 'static' },
        { sourceId: 'b', targetId: 'c', type: 'static' },
      ],
    };
    const depthOne = getFocusedLayout(chain, ['a'], 1);
    expect(depthOne.nodes.map(n => n.id).sort()).toEqual(['a', 'b']);

    const depthAll = getFocusedLayout(chain, ['a'], 'all');
    expect(depthAll.nodes.map(n => n.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('lays out every file in a multi-node folder focus as siblings', () => {
    const { nodes } = getFocusedLayout(deps, ['/r/src/a.ts', '/r/src/b.ts'], 1);
    const a = nodes.find(n => n.id === '/r/src/a.ts')!;
    const b = nodes.find(n => n.id === '/r/src/b.ts')!;
    const main = nodes.find(n => n.id === '/r/main.ts')!;
    expect(a.isCenter).toBe(true);
    expect(b.isCenter).toBe(true);
    expect(main.isCenter).toBe(false);
  });

  it('produces finite positions for every node', () => {
    const { nodes } = getFocusedLayout(deps, ['/r/src/a.ts'], 'all');
    for (const n of nodes) {
      expect(Number.isFinite(n.position.x)).toBe(true);
      expect(Number.isFinite(n.position.y)).toBe(true);
    }
  });

  it('carries fan-in/out counts through to each node', () => {
    const { nodes } = getFocusedLayout(deps, ['/r/src/a.ts'], 'all');
    const a = nodes.find(n => n.id === '/r/src/a.ts')!;
    expect(a.inDegree).toBe(1); // main -> a
    expect(a.outDegree).toBe(1); // a -> b
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

describe('importanceTier', () => {
  it('tiers by in-degree thresholds', () => {
    expect(importanceTier(0)).toBe('small');
    expect(importanceTier(3)).toBe('medium');
    expect(importanceTier(8)).toBe('large');
  });
});
