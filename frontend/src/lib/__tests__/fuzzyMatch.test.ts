import { describe, it, expect } from 'vitest';
import { fuzzyScore } from '../fuzzyMatch';

describe('fuzzyScore', () => {
  it('returns 0 for an empty query (matches everything)', () => {
    expect(fuzzyScore('CommandPalette.tsx', '')).toBe(0);
  });

  it('returns null when the query is not a subsequence of the text', () => {
    expect(fuzzyScore('CommandPalette.tsx', 'xyz')).toBeNull();
  });

  it('matches a non-contiguous subsequence', () => {
    expect(fuzzyScore('abcdef', 'ace')).not.toBeNull();
  });

  it('matches are case-insensitive', () => {
    expect(fuzzyScore('CommandPalette.tsx', 'COMMAND')).not.toBeNull();
  });

  it('scores a contiguous run higher than the same characters scattered', () => {
    // 'x' is a neutral separator (not a word-boundary character like '/' or
    // '-'), isolating the consecutive-run bonus from the boundary bonus.
    const contiguous = fuzzyScore('abcdefgh', 'abc')!;
    const scattered = fuzzyScore('axbxcxdefgh', 'abc')!;
    expect(contiguous).toBeGreaterThan(scattered);
  });

  it('scores a match starting at a word boundary higher than one starting mid-word', () => {
    // "graph" starts right after the '/' boundary in the second path, but
    // is buried mid-word in the first ("layoutUtils" contains no "graph").
    const boundaryMatch = fuzzyScore('components/graph/layoutUtils.ts', 'graph')!;
    const midWordMatch = fuzzyScore('components/dependencygraph/layoutUtils.ts', 'graph')!;
    expect(boundaryMatch).toBeGreaterThan(midWordMatch);
  });

  it('ranks a full filename match above a longer path-only match with the same query', () => {
    const filenameScore = fuzzyScore('index.ts', 'index')!;
    const longerPathScore = fuzzyScore('components/graph/very/deeply/nested/index.ts', 'index')!;
    expect(filenameScore).toBeGreaterThan(longerPathScore);
  });
});
