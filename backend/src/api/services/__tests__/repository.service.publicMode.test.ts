import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import simpleGit from 'simple-git';
import type { RepositoryService as RepositoryServiceType } from '../repository.service';

// PUBLIC_DEMO_MODE is read once at module load time, so it needs a fresh
// module registry per test to observe a different value of it — isolated
// into its own file so it never affects the ambient env for other suites.
describe('RepositoryService — PUBLIC_DEMO_MODE', () => {
  const originalEnv = process.env.PUBLIC_DEMO_MODE;
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'project042x-public-mode-'));
    const git = simpleGit(dir);
    await git.init(['-b', 'main']);
    await git.addConfig('user.name', 'Public Mode Tester');
    await git.addConfig('user.email', 'public@example.com');
    await fs.writeFile(path.join(dir, 'index.ts'), 'export const x = 1;');
    await git.add('.');
    await git.commit('Initial commit');
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
    process.env.PUBLIC_DEMO_MODE = originalEnv;
  });

  it('rejects a local absolute path when PUBLIC_DEMO_MODE=true', async () => {
    process.env.PUBLIC_DEMO_MODE = 'true';
    vi.resetModules();
    const { RepositoryService } = await import('../repository.service');
    const { LocalPathAnalysisDisabledError } = await import('../../../core/errors/RepositoryErrors');
    const service = new (RepositoryService as unknown as { new (): RepositoryServiceType })();

    await expect(service.analyzeRepository(dir)).rejects.toThrow(LocalPathAnalysisDisabledError);
  });

  it('still allows a local absolute path when PUBLIC_DEMO_MODE is unset', async () => {
    delete process.env.PUBLIC_DEMO_MODE;
    vi.resetModules();
    const { RepositoryService } = await import('../repository.service');
    const service = new (RepositoryService as unknown as { new (): RepositoryServiceType })();

    const { analysisId } = await service.analyzeRepository(dir);
    expect(analysisId).toBeTruthy();
  });
});
