import ignore, { Ignore } from 'ignore';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IScannerFilter } from './types';

const HARDCODED_IGNORES = [
  'node_modules',
  'dist',
  'build',
  'coverage',
  'out',
  'target',
  'vendor',
  '__pycache__',
  '.git',
  '.next',
  '.nuxt',
  '.cache',
  '.vscode',
  '.idea',
  '*.bundle.js',
  '*.min.js'
];

export class IgnoreFilter implements IScannerFilter {
  private ig: Ignore;

  constructor() {
    this.ig = ignore().add(HARDCODED_IGNORES);
  }

  /**
   * Initializes the filter by reading the .gitignore file at the repository root if it exists.
   */
  public async initialize(repoPath: string): Promise<void> {
    try {
      const gitignorePath = path.join(repoPath, '.gitignore');
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
      this.ig.add(gitignoreContent);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.warn(`Warning: Failed to read .gitignore at ${repoPath}: ${error.message}`);
      }
      // If it doesn't exist, we just rely on hardcoded ignores.
    }
  }

  /**
   * Determines if a given relative path should be ignored.
   * @param relativePath The path relative to the repository root.
   * @param isDirectory Whether the path points to a directory.
   */
  public shouldIgnore(relativePath: string, isDirectory: boolean): boolean {
    // If it's a directory, append a trailing slash for correct ignore package behavior
    const testPath = isDirectory ? `${relativePath}/` : relativePath;
    return this.ig.ignores(testPath);
  }
}
