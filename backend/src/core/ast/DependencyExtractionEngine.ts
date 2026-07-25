import * as fs from 'fs/promises';
import pLimit from 'p-limit';
import { RepositoryModel } from '../scanner/types';
import { DependencyGraph } from './DependencyGraph';
import { PathResolver } from './PathResolver';
import { SwcParser } from './SwcParser';

export class DependencyExtractionEngine {
  private parser: SwcParser;
  private pathResolver: PathResolver;

  constructor() {
    this.parser = new SwcParser();
    this.pathResolver = new PathResolver();
  }

  /**
   * Extracts the dependency graph from a pre-scanned repository model.
   * @param repoModel The repository model produced by RepositoryScanner.
   * @param concurrencyLimit Maximum number of files to parse concurrently to manage memory.
   */
  public async extract(repoModel: RepositoryModel, concurrencyLimit: number = 50): Promise<DependencyGraph> {
    const graph = new DependencyGraph();
    const limit = pLimit(concurrencyLimit);

    // 1. Initialize all nodes
    for (const file of repoModel.files) {
      graph.addNode({
        id: file.path,
        fileMetadata: file,
        hasSyntaxError: false,
      });
    }

    // 2. Parse files and resolve edges concurrently
    const promises = repoModel.files.map(file => limit(async () => {
      // We only parse JS/TS for now
      if (!file.extension.match(/\.(ts|tsx|js|jsx|cjs|mjs)$/)) {
        return;
      }

      let content: string;
      try {
        content = await fs.readFile(file.path, 'utf8');
      } catch {
        console.warn(`Failed to read file for parsing: ${file.path}`);
        return;
      }

      let parsedDeps;
      try {
        parsedDeps = await this.parser.parse(file.path, content);
      } catch {
        const node = graph.getNode(file.path);
        if (node) node.hasSyntaxError = true;
        console.warn(`Syntax error in ${file.path}`);
        return;
      }

      // Resolve every import in this file concurrently — each resolve()
      // call is independent filesystem I/O, so there's no reason to await
      // them one at a time. addEdge() itself still runs in a plain loop
      // afterward, in original import order, so edge insertion order and
      // the outer p-limit(concurrencyLimit) file-level bound are unchanged.
      const resolutions = await Promise.all(
        parsedDeps.imports.map(async imp => ({
          imp,
          resolvedPath: await this.pathResolver.resolve(file.path, imp.specifier),
        })),
      );
      for (const { imp, resolvedPath } of resolutions) {
        if (resolvedPath) {
          // It's an internal absolute path we resolved
          graph.addEdge({
            sourceId: file.path,
            targetId: resolvedPath,
            isDynamic: imp.isDynamic,
            isTypeOnly: imp.isTypeOnly,
          });
        }
      }
      
    }));

    await Promise.all(promises);
    return graph;
  }
}
