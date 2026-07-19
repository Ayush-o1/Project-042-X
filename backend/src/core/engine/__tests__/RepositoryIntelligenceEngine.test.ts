import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import simpleGit, { SimpleGit } from 'simple-git';
import { RepositoryIntelligenceEngine } from '../RepositoryIntelligenceEngine';
import { EmptyGitRepositoryError } from '../../errors/GitErrors';

describe('RepositoryIntelligenceEngine', () => {
  let tempDir: string;
  let engine: RepositoryIntelligenceEngine;
  let git: SimpleGit;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project042x-engine-test-'));
    engine = new RepositoryIntelligenceEngine();
    
    // Initialize git repo for testing explicitly on 'main'
    git = simpleGit(tempDir);
    await git.init(['-b', 'main']);
    await git.addConfig('user.name', 'Engine Tester');
    await git.addConfig('user.email', 'engine@example.com');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should throw if the repository is empty', async () => {
    await expect(engine.analyze(tempDir)).rejects.toThrow(EmptyGitRepositoryError);
  });

  it('should correctly unify filesystem, AST, and Git data into a single model', async () => {
    // 1. Create files with dependencies
    const fileA = path.join(tempDir, 'utils.ts');
    const fileB = path.join(tempDir, 'main.ts');
    
    await fs.writeFile(fileA, 'export const x = 1;');
    await fs.writeFile(fileB, 'import { x } from "./utils";\nconsole.log(x);');

    // 2. Commit them
    await git.add('.');
    const c1 = await git.commit('Initial feature');

    // 3. Create a new branch
    await git.checkoutLocalBranch('feature-x');
    await fs.writeFile(path.join(tempDir, 'main.ts'), 'import { x } from "./utils";\nconsole.log(x + 1);');
    await git.add('.');
    const c2 = await git.commit('Updated feature on branch');

    // 4. Run the Engine
    const unifiedModel = await engine.analyze(tempDir);

    // Verify Filesystem (Phase 3)
    expect(unifiedModel.files.length).toBe(2);
    const extensions = unifiedModel.files.map(f => f.extension).sort();
    expect(extensions).toEqual(['.ts', '.ts']);

    // Verify AST (Phase 4)
    expect(unifiedModel.dependencies.getAllNodes().length).toBe(2);
    const edges = unifiedModel.dependencies.getAllEdges();
    expect(edges.length).toBe(1);
    expect(edges[0].sourceId).toBe(fileB);
    expect(edges[0].targetId).toBe(fileA);

    // Verify Git (Phase 5)
    expect(unifiedModel.git.commits.size).toBe(2);
    expect(unifiedModel.git.head).toBe(c2.commit);

    // Verify Statistics (Phase 6)
    expect(unifiedModel.statistics.totalFiles).toBe(2);
    expect(unifiedModel.statistics.totalCommits).toBe(2);
    expect(unifiedModel.statistics.totalBranches).toBe(2); // main, feature-x
    expect(unifiedModel.statistics.predominantLanguage).toBe('TypeScript');
  });
});
