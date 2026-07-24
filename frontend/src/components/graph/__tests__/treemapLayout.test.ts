import { describe, it, expect } from 'vitest';
import { computeTreemap } from '../treemapLayout';

describe('computeTreemap', () => {
  it('returns an empty array for no items or a zero-sized container', () => {
    expect(computeTreemap([], 100, 100)).toEqual([]);
    expect(computeTreemap([{ value: 1 }], 0, 100)).toEqual([]);
  });

  it('tiles the full container — rect areas sum to the container area', () => {
    const items = [{ value: 10 }, { value: 5 }, { value: 3 }, { value: 1 }];
    const rects = computeTreemap(items, 200, 100);
    const totalArea = rects.reduce((sum, r) => sum + r.width * r.height, 0);
    expect(totalArea).toBeCloseTo(200 * 100, 0);
  });

  it('gives every item a positive-area rect', () => {
    const items = [{ value: 4 }, { value: 4 }, { value: 4 }];
    const rects = computeTreemap(items, 90, 90);
    expect(rects).toHaveLength(3);
    for (const r of rects) {
      expect(r.width).toBeGreaterThan(0);
      expect(r.height).toBeGreaterThan(0);
    }
  });

  it('gives a larger value a larger area', () => {
    const rects = computeTreemap([{ value: 90 }, { value: 10 }], 100, 100);
    const areas = rects.map(r => r.width * r.height);
    expect(areas[0]).toBeGreaterThan(areas[1]);
  });

  it('keeps every rect within the container bounds', () => {
    const rects = computeTreemap([{ value: 7 }, { value: 2 }, { value: 5 }, { value: 9 }, { value: 1 }], 150, 80);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(150 + 0.01);
      expect(r.y + r.height).toBeLessThanOrEqual(80 + 0.01);
    }
  });
});
