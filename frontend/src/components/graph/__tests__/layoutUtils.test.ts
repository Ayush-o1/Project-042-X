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
    const result = getFocusedLayout(deps, [], 2);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.meta).toMatchObject({ requestedDepth: 2, effectiveDepth: 2, reduced: false, truncated: false });
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

  it('stays at the requested depth when the neighborhood is within budget (unchanged fast path)', () => {
    const { meta } = getFocusedLayout(deps, ['/r/src/a.ts'], 2);
    expect(meta).toMatchObject({ requestedDepth: 2, effectiveDepth: 2, reduced: false, truncated: false });
  });

  describe('budget-capped layout (dagre.layout() is severely superlinear in edge count — see layoutUtils.ts)', () => {
    // a -> b -> c -> d, so depth 1 from 'a' includes {a, b} and depth 3/'all' includes everything.
    const chain: DependencyGraphData = {
      nodes: [
        { id: 'a', path: 'a.ts', name: 'a.ts', type: 'TypeScript' },
        { id: 'b', path: 'b.ts', name: 'b.ts', type: 'TypeScript' },
        { id: 'c', path: 'c.ts', name: 'c.ts', type: 'TypeScript' },
        { id: 'd', path: 'd.ts', name: 'd.ts', type: 'TypeScript' },
      ],
      edges: [
        { sourceId: 'a', targetId: 'b', type: 'static' },
        { sourceId: 'b', targetId: 'c', type: 'static' },
        { sourceId: 'c', targetId: 'd', type: 'static' },
      ],
    };

    it('auto-steps the depth down when the requested depth exceeds the node budget', () => {
      // depth 1 -> {a,b} = 2 nodes (fits); depth 2 -> {a,b,c} = 3 nodes (over budget of 2).
      const { nodes, meta } = getFocusedLayout(chain, ['a'], 'all', { budget: { maxNodes: 2, maxEdges: 100 } });
      expect(meta.requestedDepth).toBe('all');
      expect(meta.effectiveDepth).toBe(1);
      expect(meta.reduced).toBe(true);
      expect(meta.truncated).toBe(false);
      expect(nodes.map(n => n.id).sort()).toEqual(['a', 'b']);
    });

    it('auto-steps the depth down when the requested depth exceeds the edge budget', () => {
      // depth 1 -> 1 edge (a->b, fits budget of 1); depth 2 -> 2 edges (over budget of 1).
      const { meta } = getFocusedLayout(chain, ['a'], 3, { budget: { maxNodes: 100, maxEdges: 1 } });
      expect(meta.effectiveDepth).toBe(1);
      expect(meta.reduced).toBe(true);
    });

    it('never mutates the requested depth even when it reduces the effective one', () => {
      const { meta } = getFocusedLayout(chain, ['a'], 3, { budget: { maxNodes: 2, maxEdges: 100 } });
      expect(meta.requestedDepth).toBe(3);
    });

    it('truncates to the highest in-degree neighbors when even depth 1 exceeds the budget', () => {
      // hub has 5 direct dependents; a budget too small to fit even one of them
      // alongside the center forces the truncation branch (the depth-stepping
      // loop bottoms out at depth 1 and still can't fit).
      const hub: DependencyGraphData = {
        nodes: [
          { id: 'hub', path: 'hub.ts', name: 'hub.ts', type: 'TypeScript' },
          ...['e0', 'e1', 'e2', 'e3', 'e4'].map(id => ({ id, path: `${id}.ts`, name: `${id}.ts`, type: 'TypeScript' })),
        ],
        edges: ['e0', 'e1', 'e2', 'e3', 'e4'].map(id => ({ sourceId: 'hub', targetId: id, type: 'static' as const })),
      };
      const { nodes, meta } = getFocusedLayout(hub, ['hub'], 'all', { budget: { maxNodes: 2, maxEdges: 100 } });
      expect(meta.truncated).toBe(true);
      expect(meta.reduced).toBe(true);
      expect(nodes.length).toBeLessThanOrEqual(2);
      expect(nodes.some(n => n.id === 'hub' && n.isCenter)).toBe(true);
    });

    it('override skips the budget entirely and lays out exactly the requested depth', () => {
      const { nodes, meta } = getFocusedLayout(chain, ['a'], 'all', {
        budget: { maxNodes: 2, maxEdges: 100 },
        override: true,
      });
      expect(meta.effectiveDepth).toBe('all');
      expect(meta.reduced).toBe(false);
      expect(meta.truncated).toBe(false);
      expect(nodes.map(n => n.id).sort()).toEqual(['a', 'b', 'c', 'd']);
    });
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
