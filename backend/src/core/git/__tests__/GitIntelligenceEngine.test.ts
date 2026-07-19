import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import simpleGit, { SimpleGit } from 'simple-git';
import { GitIntelligenceEngine } from '../GitIntelligenceEngine';
import { EmptyGitRepositoryError, GitRepositoryError } from '../../errors/GitErrors';

describe('GitIntelligenceEngine', () => {
  let tempDir: string;
  let engine: GitIntelligenceEngine;
  let git: SimpleGit;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project042x-git-test-'));
    engine = new GitIntelligenceEngine();
    
    // Initialize git repo for testing explicitly on 'main'
    git = simpleGit(tempDir);
    await git.init(['-b', 'main']);
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should throw EmptyGitRepositoryError for a repo with no commits', async () => {
    await expect(engine.analyze(tempDir)).rejects.toThrow(EmptyGitRepositoryError);
  });

  it('should throw GitRepositoryError for a non-git directory', async () => {
    const nonGitDir = await fs.mkdtemp(path.join(os.tmpdir(), 'non-git-'));
    await expect(engine.analyze(nonGitDir)).rejects.toThrow(GitRepositoryError);
    await fs.rm(nonGitDir, { recursive: true, force: true });
  });

  it('should build a topological graph for a linear history', async () => {
    await fs.writeFile(path.join(tempDir, 'file.txt'), 'hello');
    await git.add('file.txt');
    const commit1 = await git.commit('Initial commit');

    await fs.writeFile(path.join(tempDir, 'file.txt'), 'hello world');
    await git.add('file.txt');
    const commit2 = await git.commit('Second commit');

    const graph = await engine.analyze(tempDir);

    expect(graph.commits.size).toBe(2);
    
    const node2 = graph.commits.get(commit2.commit)!;
    expect(node2.message).toBe('Second commit');
    expect(node2.parents).toEqual([commit1.commit]);
    
    // Check HEAD ref
    expect(node2.refs).toContain('HEAD -> main'); // default branch is main
    expect(graph.head).toBe(commit2.commit);
  });

  it('should correctly handle merge commits and branches', async () => {
    await fs.writeFile(path.join(tempDir, 'base.txt'), 'base');
    await git.add('.');
    const baseCommit = await git.commit('Base');

    // Create branch feature
    await git.checkoutLocalBranch('feature');
    await fs.writeFile(path.join(tempDir, 'feature.txt'), 'feature');
    await git.add('.');
    const featureCommit = await git.commit('Feature commit');

    // Go back to main
    await git.checkout('main');
    await fs.writeFile(path.join(tempDir, 'main.txt'), 'main');
    await git.add('.');
    const mainCommit = await git.commit('Main commit');

    // Merge feature into main
    await git.merge(['feature']);
    const mergeLog = await git.log({ maxCount: 1 });
    const mergeCommitHash = mergeLog.latest!.hash;

    const graph = await engine.analyze(tempDir);

    expect(graph.commits.size).toBe(4); // base, feature, main, merge
    
    const mergeNode = graph.commits.get(mergeCommitHash)!;
    expect(mergeNode.parents.length).toBe(2);
    expect(mergeNode.parents).toContain(mainCommit.commit);
    expect(mergeNode.parents).toContain(featureCommit.commit);
  });

  it('should correctly capture tags', async () => {
    await fs.writeFile(path.join(tempDir, 'file.txt'), 'hello');
    await git.add('.');
    const c1 = await git.commit('C1');
    await git.addTag('v1.0.0');

    const graph = await engine.analyze(tempDir);
    const node = graph.commits.get(c1.commit)!;
    
    expect(node.refs.some(r => r.includes('tag: v1.0.0'))).toBe(true);
  });
});
