import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { PathResolver } from '../PathResolver';

describe('PathResolver', () => {
  let tempDir: string;
  let resolver: PathResolver;

  beforeEach(async () => {
    resolver = new PathResolver();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project042x-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should resolve an exact file path', async () => {
    const file = path.join(tempDir, 'utils.ts');
    await fs.writeFile(file, '');

    const resolved = await resolver.resolve(path.join(tempDir, 'main.ts'), './utils.ts');
    expect(resolved).toBe(file);
  });

  it('should resolve a file by appending extension', async () => {
    const file = path.join(tempDir, 'utils.tsx');
    await fs.writeFile(file, '');

    const resolved = await resolver.resolve(path.join(tempDir, 'main.ts'), './utils');
    expect(resolved).toBe(file);
  });

  it('should resolve an index file inside a directory', async () => {
    const dir = path.join(tempDir, 'components');
    await fs.mkdir(dir);
    const file = path.join(dir, 'index.js');
    await fs.writeFile(file, '');

    const resolved = await resolver.resolve(path.join(tempDir, 'main.ts'), './components');
    expect(resolved).toBe(file);
  });

  it('should return null for unresolved or external modules', async () => {
    const resolved = await resolver.resolve(path.join(tempDir, 'main.ts'), 'react');
    expect(resolved).toBeNull();
  });
});
