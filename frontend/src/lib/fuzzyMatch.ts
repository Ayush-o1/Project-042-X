/**
 * Subsequence fuzzy match — returns null if `query`'s characters don't all
 * appear in `text` in order, otherwise a score where higher is a better
 * match. Consecutive runs and word-boundary starts (after `/`, `-`, `_`,
 * `.`, or at the very start) score higher, the same rough heuristic VS
 * Code's Quick Open uses so "cvtr" ranks "CommandPalette.tsx" above an
 * unrelated file that merely contains those letters in order somewhere.
 */
export function fuzzyScore(text: string, query: string): number | null {
  if (!query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();

  let score = 0;
  let tIdx = 0;
  let consecutive = 0;

  for (let qIdx = 0; qIdx < q.length; qIdx++) {
    const foundIdx = t.indexOf(q[qIdx], tIdx);
    if (foundIdx === -1) return null;

    if (foundIdx === tIdx) {
      consecutive++;
      score += 3 + consecutive;
    } else {
      consecutive = 0;
      score += 1;
    }

    const prevChar = t[foundIdx - 1];
    if (foundIdx === 0 || prevChar === '/' || prevChar === '-' || prevChar === '_' || prevChar === '.') {
      score += 5;
    }

    tIdx = foundIdx + 1;
  }

  // Prefer tighter matches — less unmatched "slack" between the characters.
  score -= (t.length - q.length) * 0.1;
  return score;
}

/**
 * Score bonus applied to a primary-field match (filename, commit message) so
 * it always outranks a match found only in a fallback field (full path,
 * hash) — the standard priority every fuzzy search entry point in the app
 * gives a name match over a path-only one.
 */
export const FILENAME_MATCH_BONUS = 100;

/** One field to fuzzy-match against, for {@link rankByFuzzyMatch}. */
export interface FuzzyField<T> {
  get: (item: T) => string;
  /**
   * Added to this field's score when it matches. Used to make one field
   * (e.g. a filename) always outrank another (e.g. its full path) even when
   * the path's raw match would otherwise score higher — large enough that a
   * matching bonused field never loses to a non-bonused one in practice,
   * mirroring how VS Code's Quick Open ranks name matches above path-only
   * ones.
   */
  bonus?: number;
}

/**
 * Ranks items by the best fuzzy match across one or more text fields per
 * item, descending, filtering out items that match none of the fields.
 *
 * This is the one ranking algorithm behind every fuzzy search entry point in
 * the app — the Command Palette, the Sidebar filter, and both graph
 * toolbars all fuzzy-match a primary field (name/label/message) with a
 * lower-priority fallback field (path/hash), and previously each
 * reimplemented that by hand.
 */
export function rankByFuzzyMatch<T>(items: T[], query: string, fields: FuzzyField<T>[]): T[] {
  if (!query) return [];

  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    let best: number | null = null;
    for (const { get, bonus = 0 } of fields) {
      const match = fuzzyScore(get(item), query);
      if (match === null) continue;
      const score = match + bonus;
      if (best === null || score > best) best = score;
    }
    if (best !== null) scored.push({ item, score: best });
  }

  return scored.sort((a, b) => b.score - a.score).map(x => x.item);
}
