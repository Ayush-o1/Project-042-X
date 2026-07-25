import * as fs from 'fs/promises';
import * as path from 'path';
import type { Stats } from 'fs';

export class PathResolver {
  private static readonly EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs'];

  /**
   * Resolves a module specifier to an absolute file path.
   * If it cannot resolve (e.g., node_modules import like 'express'), it returns null.
   *
   * @param sourceFilePath The absolute path of the file containing the import.
   * @param specifier The import string (e.g., './utils', 'react').
   */
  public async resolve(sourceFilePath: string, specifier: string): Promise<string | null> {
    // We only care about relative or absolute internal imports for the dependency graph
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
      // It's likely a node_module or an alias we aren't handling currently
      return null;
    }

    const sourceDir = path.dirname(sourceFilePath);
    const targetPath = specifier.startsWith('/')
      ? specifier
      : path.resolve(sourceDir, specifier);

    const extensionCandidates = PathResolver.EXTENSIONS.map(ext => `${targetPath}${ext}`);

    // Fast path: the exact-match candidate and the single most common
    // extension (EXTENSIONS[0], '.ts') together cover the overwhelming
    // majority of real imports in this codebase's own style. Checking both
    // concurrently costs the same 2 filesystem round trips as the old
    // sequential version's own best case (an extensionless import
    // resolving on the first extension checked) — measured to be a wash on
    // local SSD, unlike eagerly firing every candidate up front, which
    // measured ~20-25% *slower* here for exactly that common case (see
    // PERFORMANCE_REPORT.md's Phase 2 verification notes).
    const [exactStat, firstExtStat] = await Promise.all([
      this.statOrNull(targetPath),
      this.statOrNull(extensionCandidates[0]),
    ]);

    // 1. Exact match
    if (exactStat) {
      if (exactStat.isFile()) return targetPath;

      // If it's a directory, check for index files
      if (exactStat.isDirectory()) {
        const indexPath = await this.resolveIndexFile(targetPath);
        if (indexPath) return indexPath;
        // No index file — fall through to the extension checks below,
        // exactly as the old sequential version did.
      }
    }

    // 2. Check extensions, in PathResolver.EXTENSIONS order.
    // EXTENSIONS[0] was already fetched above — reuse it instead of
    // re-stating it.
    if (firstExtStat?.isFile()) return extensionCandidates[0];

    // Slow path: nothing matched yet. This is the case that used to cost up
    // to ~12 more sequential round trips one at a time (an unresolved
    // specifier, a non-JS/TS import like CSS, or a match late in
    // EXTENSIONS) — probe the rest concurrently instead.
    const remaining = extensionCandidates.slice(1);
    const remainingStats = await Promise.all(remaining.map(p => this.statOrNull(p)));
    for (let i = 0; i < remaining.length; i++) {
      if (remainingStats[i]?.isFile()) return remaining[i];
    }

    return null;
  }

  /**
   * A single fs.stat, treating "doesn't exist" and any other stat failure
   * (permission error, or the file vanishing mid-scan on an actively
   * modified repo) alike as "no candidate here" rather than rejecting the
   * whole dependency-graph build over one path.
   */
  private async statOrNull(p: string): Promise<Stats | null> {
    try {
      return await fs.stat(p);
    } catch {
      return null;
    }
  }

  private async resolveIndexFile(dirPath: string): Promise<string | null> {
    const candidates = PathResolver.EXTENSIONS.map(ext => path.join(dirPath, `index${ext}`));
    const stats = await Promise.all(candidates.map(p => this.statOrNull(p)));
    for (let i = 0; i < candidates.length; i++) {
      if (stats[i]?.isFile()) return candidates[i];
    }
    return null;
  }
}
