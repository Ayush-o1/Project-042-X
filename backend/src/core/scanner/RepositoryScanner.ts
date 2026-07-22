import * as fs from 'fs/promises';
import * as path from 'path';
import { InvalidRepositoryError } from '../errors/RepositoryErrors';
import { RepositoryModel, FileModel } from './types';
import { IgnoreFilter } from './IgnoreFilter';
import { isSupportedExtension, getLanguageForExtension } from './ExtensionRegistry';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export class RepositoryScanner {
  private ignoreFilter: IgnoreFilter;

  constructor() {
    this.ignoreFilter = new IgnoreFilter();
  }

  /**
   * Scans a local Git repository and extracts structural metadata.
   * @param repoPath Absolute path to the local repository.
   * @returns A structured in-memory representation of the repository.
   */
  public async scan(repoPath: string): Promise<RepositoryModel> {
    const absoluteRepoPath = path.resolve(repoPath);

    await this.verifyGitRepository(absoluteRepoPath);
    await this.ignoreFilter.initialize(absoluteRepoPath);

    const repoName = path.basename(absoluteRepoPath);
    const files: FileModel[] = [];

    await this.traverseDirectory(absoluteRepoPath, absoluteRepoPath, files);

    const totalSize = files.reduce((sum, file) => sum + file.sizeBytes, 0);

    return {
      path: absoluteRepoPath,
      name: repoName,
      totalFiles: files.length,
      totalSize,
      files,
    };
  }

  /**
   * Verifies that the path contains a .git directory.
   */
  private async verifyGitRepository(repoPath: string): Promise<void> {
    try {
      const gitPath = path.join(repoPath, '.git');
      const stats = await fs.stat(gitPath);
      if (!stats.isDirectory()) {
        throw new InvalidRepositoryError(repoPath);
      }
    } catch (error: any) {
      if (error instanceof InvalidRepositoryError) {
        throw error;
      }
      throw new InvalidRepositoryError(repoPath);
    }
  }

  /**
   * Recursively traverses the directory tree, applying filters.
   */
  private async traverseDirectory(rootPath: string, currentPath: string, files: FileModel[]): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch (error: any) {
      // EACCES or ENOENT can occur; log warning and skip
      console.warn(`Warning: Could not read directory ${currentPath}: ${error.message}`);
      return;
    }

    const promises = entries.map(async (entry) => {
      const fullPath = path.join(currentPath, entry.name);
      // Ensure we use POSIX separators for relative paths so the ignore package works correctly
      const relativePath = path.relative(rootPath, fullPath).split(path.sep).join('/');

      if (entry.isDirectory()) {
        if (!this.ignoreFilter.shouldIgnore(relativePath, true)) {
          await this.traverseDirectory(rootPath, fullPath, files);
        }
      } else if (entry.isFile()) {
        if (!this.ignoreFilter.shouldIgnore(relativePath, false)) {
          await this.processFile(rootPath, fullPath, relativePath, files);
        }
      }
    });

    await Promise.all(promises);
  }

  /**
   * Extracts metadata for a single file if it is supported and within size limits.
   */
  private async processFile(rootPath: string, fullPath: string, relativePath: string, files: FileModel[]): Promise<void> {
    const extension = path.extname(fullPath);

    // Filter by supported extensions before stat'ing to save I/O overhead
    if (!isSupportedExtension(extension)) {
      return;
    }

    try {
      const stats = await fs.stat(fullPath);

      if (stats.size <= MAX_FILE_SIZE_BYTES) {
        files.push({
          path: fullPath,
          relativePath,
          name: path.basename(fullPath),
          extension,
          language: getLanguageForExtension(extension),
          sizeBytes: stats.size,
        });
      }
    } catch (error: any) {
      // Ignore ENOENT (file deleted during scan)
      if (error.code !== 'ENOENT') {
        console.warn(`Warning: Could not stat file ${fullPath}: ${error.message}`);
      }
    }
  }
}
