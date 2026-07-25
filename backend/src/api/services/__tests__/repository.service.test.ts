import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import simpleGit from 'simple-git';
import { RepositoryService } from '../repository.service';
import { AnalysisNotFoundError, NoRepositoryAnalyzedError, FileAccessDeniedError } from '../../../core/errors/RepositoryErrors';

async function makeRepo(name: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `project042x-svc-${name}-`));
  const git = simpleGit(dir);
  await git.init(['-b', 'main']);
  await git.addConfig('user.name', 'Svc Tester');
  await git.addConfig('user.email', 'svc@example.com');
  await fs.writeFile(path.join(dir, `${name}.ts`), `export const ${name} = true;`);
  await git.add('.');
  await git.commit(`Initial ${name} commit`);
  return dir;
}

describe('RepositoryService — analysis resource isolation', () => {
  let dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map(d => fs.rm(d, { recursive: true, force: true })));
    dirs = [];
  });

  it('keeps concurrent analyses fully isolated by id', async () => {
    // Fresh instance per test: RepositoryService is a process-wide singleton
    // in the app, but its constructor is accessible within the module for tests.
    const service = new (RepositoryService as unknown as { new (): RepositoryService })();

    const dirA = await makeRepo('alpha');
    const dirB = await makeRepo('beta');
    dirs.push(dirA, dirB);

    const { analysisId: idA } = await service.analyzeRepository(dirA);
    const { analysisId: idB } = await service.analyzeRepository(dirB);

    expect(idA).not.toBe(idB);
    expect(service.getFiles(idA).files.map(f => f.name)).toEqual(['alpha.ts']);
    expect(service.getFiles(idB).files.map(f => f.name)).toEqual(['beta.ts']);

    // The default (no id) resolves to the most recently completed analysis —
    // preserves single-session client behavior.
    expect(service.getFiles().files.map(f => f.name)).toEqual(['beta.ts']);
  });

  it('throws AnalysisNotFoundError for an unknown id, never falling back to another analysis', async () => {
    const service = new (RepositoryService as unknown as { new (): RepositoryService })();
    const dir = await makeRepo('gamma');
    dirs.push(dir);

    await service.analyzeRepository(dir);

    expect(() => service.getFiles('nonexistent-id')).toThrow(AnalysisNotFoundError);
  });

  it('throws NoRepositoryAnalyzedError when nothing has ever been analyzed', () => {
    const service = new (RepositoryService as unknown as { new (): RepositoryService })();
    expect(() => service.getFiles()).toThrow(NoRepositoryAnalyzedError);
  });

  it('evicts the oldest analysis once the cache exceeds its bound', async () => {
    const service = new (RepositoryService as unknown as { new (): RepositoryService })();
    const created = await Promise.all(
      ['r1', 'r2', 'r3', 'r4'].map(name => makeRepo(name)),
    );
    dirs.push(...created);

    const ids: string[] = [];
    for (const dir of created) {
      const { analysisId } = await service.analyzeRepository(dir);
      ids.push(analysisId);
    }

    // Cache bound is 3: the first analysis should have been evicted.
    expect(() => service.getFiles(ids[0])).toThrow(AnalysisNotFoundError);
    // The three most recent remain addressable.
    expect(() => service.getFiles(ids[1])).not.toThrow();
    expect(() => service.getFiles(ids[2])).not.toThrow();
    expect(() => service.getFiles(ids[3])).not.toThrow();
  });

  it('only serves file content for files the scanner actually discovered', async () => {
    const service = new (RepositoryService as unknown as { new (): RepositoryService })();
    const dir = await makeRepo('delta');
    dirs.push(dir);
    const { analysisId } = await service.analyzeRepository(dir);

    const content = await service.getFileContent(path.join(dir, 'delta.ts'), analysisId);
    expect(content).toContain('delta');

    // .git internals were never in the scanned file list.
    await expect(
      service.getFileContent(path.join(dir, '.git', 'config'), analysisId),
    ).rejects.toThrow(FileAccessDeniedError);
  });

  it('serves correct file content across repeated calls (realpath caching does not corrupt results)', async () => {
    const service = new (RepositoryService as unknown as { new (): RepositoryService })();
    const dir = await makeRepo('epsilon');
    dirs.push(dir);
    const { analysisId } = await service.analyzeRepository(dir);
    const target = path.join(dir, 'epsilon.ts');

    // First call populates AnalysisEntry.realRootPromise; subsequent calls
    // reuse it. All three must still resolve to the same correct content.
    const first = await service.getFileContent(target, analysisId);
    const second = await service.getFileContent(target, analysisId);
    const third = await service.getFileContent(target, analysisId);
    expect(first).toContain('epsilon');
    expect(second).toBe(first);
    expect(third).toBe(first);

    // The path-traversal guard still rejects an outside file after the
    // root's realpath has been cached by the calls above.
    await expect(
      service.getFileContent(path.join(dir, '.git', 'config'), analysisId),
    ).rejects.toThrow(FileAccessDeniedError);
  });

  it('paginates getFiles with offset/limit and reports totalFiles, matching the unpaginated result when concatenated', async () => {
    const service = new (RepositoryService as unknown as { new (): RepositoryService })();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'project042x-svc-manyfiles-'));
    dirs.push(dir);
    const git = simpleGit(dir);
    await git.init(['-b', 'main']);
    await git.addConfig('user.name', 'Svc Tester');
    await git.addConfig('user.email', 'svc@example.com');
    for (const name of ['a', 'b', 'c']) {
      await fs.writeFile(path.join(dir, `${name}.ts`), `export const ${name} = true;`);
    }
    await git.add('.');
    await git.commit('three files');

    const { analysisId } = await service.analyzeRepository(dir);
    const full = service.getFiles(analysisId);
    expect(full.totalFiles).toBe(3);
    expect(full.files.length).toBe(3);

    const page1 = service.getFiles(analysisId, 0, 2);
    const page2 = service.getFiles(analysisId, 2, 2);
    expect(page1.files.length).toBe(2);
    expect(page2.files.length).toBe(1);
    expect(page1.totalFiles).toBe(3);
    expect(page2.totalFiles).toBe(3);
    expect([...page1.files, ...page2.files].map(f => f.name).sort())
      .toEqual(full.files.map(f => f.name).sort());
  });

  it('paginates getDependencies by node, with each page carrying only its own nodes\' outgoing edges, reconstructing the full graph when concatenated', async () => {
    const service = new (RepositoryService as unknown as { new (): RepositoryService })();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'project042x-svc-manydeps-'));
    dirs.push(dir);
    const git = simpleGit(dir);
    await git.init(['-b', 'main']);
    await git.addConfig('user.name', 'Svc Tester');
    await git.addConfig('user.email', 'svc@example.com');
    await fs.writeFile(path.join(dir, 'a.ts'), `import './b';\nimport './c';\n`);
    await fs.writeFile(path.join(dir, 'b.ts'), `import './c';\n`);
    await fs.writeFile(path.join(dir, 'c.ts'), `export const c = 1;\n`);
    await git.add('.');
    await git.commit('three linked files');

    const { analysisId } = await service.analyzeRepository(dir);
    const full = service.getDependencies(analysisId);
    expect(full.totalNodes).toBe(3);
    expect(full.edges.length).toBe(3); // a->b, a->c, b->c

    const page1 = service.getDependencies(analysisId, 0, 2);
    const page2 = service.getDependencies(analysisId, 2, 2);
    expect(page1.nodes.length).toBe(2);
    expect(page2.nodes.length).toBe(1);

    const allPagedNodeIds = [...page1.nodes, ...page2.nodes].map(n => n.id).sort();
    expect(allPagedNodeIds).toEqual(full.nodes.map(n => n.id).sort());

    const allPagedEdges = [...page1.edges, ...page2.edges];
    expect(allPagedEdges.length).toBe(full.edges.length);
    const edgeKey = (e: { sourceId: string; targetId: string }) => `${e.sourceId}->${e.targetId}`;
    expect(allPagedEdges.map(edgeKey).sort()).toEqual(full.edges.map(edgeKey).sort());
  });

  it('serves correct git data across repeated calls (commit-array caching does not corrupt results)', async () => {
    const service = new (RepositoryService as unknown as { new (): RepositoryService })();
    const dir = await makeRepo('zeta');
    dirs.push(dir);
    const { analysisId } = await service.analyzeRepository(dir);

    const first = service.getGitData(analysisId);
    const second = service.getGitData(analysisId);
    expect(first.totalCommits).toBe(1);
    expect(second).toEqual(first);

    const paged = service.getGitData(analysisId, 0, 1);
    expect(paged.commits).toEqual(first.commits);
  });
});
