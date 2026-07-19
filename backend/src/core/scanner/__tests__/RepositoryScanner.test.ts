import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { RepositoryScanner } from '../RepositoryScanner';
import { InvalidRepositoryError } from '../../errors/RepositoryErrors';

describe('RepositoryScanner', () => {
  let tempDir: string;
  let scanner: RepositoryScanner;

  beforeEach(async () => {
    scanner = new RepositoryScanner();
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project042x-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should throw InvalidRepositoryError if .git is missing', async () => {
    await expect(scanner.scan(tempDir)).rejects.toThrow(InvalidRepositoryError);
  });

  it('should scan a valid git repository and extract metadata for supported files', async () => {
    // 1. Create fake .git dir
    await fs.mkdir(path.join(tempDir, '.git'));
    
    // 2. Create some files
    await fs.writeFile(path.join(tempDir, 'main.ts'), 'console.log("hello");');
    await fs.writeFile(path.join(tempDir, 'readme.md'), '# Hello');
    
    // 3. Create unsupported file
    await fs.writeFile(path.join(tempDir, 'image.png'), 'fake image data');

    // 4. Create ignored node_modules directory with a supported file inside
    await fs.mkdir(path.join(tempDir, 'node_modules'));
    await fs.writeFile(path.join(tempDir, 'node_modules', 'lib.ts'), 'console.log("ignored");');

    const result = await scanner.scan(tempDir);

    expect(result.name).toBe(path.basename(tempDir));
    expect(result.totalFiles).toBe(2); // main.ts and readme.md
    
    const extensions = result.files.map(f => f.extension).sort();
    expect(extensions).toEqual(['.md', '.ts']);
    
    const libFile = result.files.find(f => f.name === 'lib.ts');
    expect(libFile).toBeUndefined(); // Should have been ignored
  });

  it('should respect custom .gitignore rules', async () => {
    await fs.mkdir(path.join(tempDir, '.git'));
    await fs.writeFile(path.join(tempDir, '.gitignore'), 'secret.ts\n');
    await fs.writeFile(path.join(tempDir, 'main.ts'), 'console.log("hello");');
    await fs.writeFile(path.join(tempDir, 'secret.ts'), 'console.log("secret");');

    const result = await scanner.scan(tempDir);

    expect(result.totalFiles).toBe(1);
    expect(result.files[0].name).toBe('main.ts');
  });
});
