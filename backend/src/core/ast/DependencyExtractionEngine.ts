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
      } catch (e) {
        console.warn(`Failed to read file for parsing: ${file.path}`);
        return;
      }

      let parsedDeps;
      try {
        parsedDeps = await this.parser.parse(file.path, content);
      } catch (e) {
        const node = graph.getNode(file.path);
        if (node) node.hasSyntaxError = true;
        console.warn(`Syntax error in ${file.path}`);
        return;
      }

      // Resolve edges
      for (const imp of parsedDeps.imports) {
        const resolvedPath = await this.pathResolver.resolve(file.path, imp.specifier);
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
