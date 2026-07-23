import { describe, it, expect } from 'vitest';
import { fuzzyScore, rankByFuzzyMatch } from '../fuzzyMatch';

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

describe('rankByFuzzyMatch', () => {
  interface File { name: string; path: string }
  const files: File[] = [
    { name: 'CommandPalette.tsx', path: 'src/components/layout/CommandPalette.tsx' },
    { name: 'Sidebar.tsx',        path: 'src/components/layout/Sidebar.tsx' },
    { name: 'index.ts',           path: 'src/components/graph/very/deeply/nested/index.ts' },
  ];
  const nameField = { get: (f: File) => f.name, bonus: 100 };
  const pathField = { get: (f: File) => f.path };

  it('returns nothing for an empty query', () => {
    expect(rankByFuzzyMatch(files, '', [nameField, pathField])).toEqual([]);
  });

  it('excludes items that match none of the given fields', () => {
    const result = rankByFuzzyMatch(files, 'zzz', [nameField, pathField]);
    expect(result).toEqual([]);
  });

  it('ranks a bonused-field match above a match only found in the fallback field', () => {
    // "Sidebar" matches Sidebar.tsx's name directly; it's also a subsequence
    // of CommandPalette's path-only text, but the bonused name match must win.
    const result = rankByFuzzyMatch(files, 'Sidebar', [nameField, pathField]);
    expect(result[0].name).toBe('Sidebar.tsx');
  });

  it('takes the best score across fields when no bonus favors either one', () => {
    // "index" only matches the third file, via either field — same result
    // either way, just confirming multi-field matching doesn't drop it.
    const result = rankByFuzzyMatch(files, 'index', [nameField, pathField]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('index.ts');
  });

  it('sorts by descending best-field score, matching a manual computation', () => {
    const bestScore = (f: File) => {
      const nameScore = fuzzyScore(f.name, 'i');
      const pathScore = fuzzyScore(f.path, 'i');
      return Math.max(nameScore !== null ? nameScore + 100 : -Infinity, pathScore ?? -Infinity);
    };
    const result = rankByFuzzyMatch(files, 'i', [nameField, pathField]);
    const scores = result.map(bestScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});
