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
