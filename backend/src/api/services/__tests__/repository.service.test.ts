import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
    expect(service.getFiles(idA).map(f => f.name)).toEqual(['alpha.ts']);
    expect(service.getFiles(idB).map(f => f.name)).toEqual(['beta.ts']);

    // The default (no id) resolves to the most recently completed analysis —
    // preserves single-session client behavior.
    expect(service.getFiles().map(f => f.name)).toEqual(['beta.ts']);
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
});
