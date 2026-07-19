import * as fs from 'fs/promises';
import * as path from 'path';

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
    let targetPath = specifier.startsWith('/') 
      ? specifier 
      : path.resolve(sourceDir, specifier);

    // 1. Check exact match
    if (await this.fileExists(targetPath)) {
      const stat = await fs.stat(targetPath);
      if (stat.isFile()) return targetPath;
      
      // If it's a directory, check for index files
      if (stat.isDirectory()) {
        const indexPath = await this.resolveIndexFile(targetPath);
        if (indexPath) return indexPath;
      }
    }

    // 2. Check extensions
    for (const ext of PathResolver.EXTENSIONS) {
      const withExt = `${targetPath}${ext}`;
      if (await this.isFile(withExt)) {
        return withExt;
      }
    }

    return null;
  }

  private async fileExists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }

  private async isFile(p: string): Promise<boolean> {
    try {
      const stat = await fs.stat(p);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  private async resolveIndexFile(dirPath: string): Promise<string | null> {
    for (const ext of PathResolver.EXTENSIONS) {
      const indexPath = path.join(dirPath, `index${ext}`);
      if (await this.isFile(indexPath)) {
        return indexPath;
      }
    }
    return null;
  }
}
