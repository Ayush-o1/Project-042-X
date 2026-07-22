import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import simpleGit from 'simple-git';
import { app } from '../../app';

describe('API Routes Integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project042x-api-test-'));
    const git = simpleGit(tempDir);
    await git.init(['-b', 'main']);
    await git.addConfig('user.name', 'API Tester');
    await git.addConfig('user.email', 'api@example.com');

    await fs.writeFile(path.join(tempDir, 'main.ts'), 'console.log("hello");');
    await git.add('.');
    await git.commit('Initial API test commit');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('GET /api/v1/health should return 200 UP', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UP');
  });

  it('POST /api/v1/repository/analyze should return 400 for missing path', async () => {
    const res = await request(app).post('/api/v1/repository/analyze').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/repository/analyze should return 422 for invalid git repository', async () => {
    const invalidDir = await fs.mkdtemp(path.join(os.tmpdir(), 'invalid-repo-'));
    const res = await request(app)
      .post('/api/v1/repository/analyze')
      .send({ path: invalidDir });
      
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_REPOSITORY');
    await fs.rm(invalidDir, { recursive: true, force: true });
  });

  it('POST /api/v1/repository/analyze should successfully analyze and cache the model', async () => {
    const res = await request(app)
      .post('/api/v1/repository/analyze')
      .send({ path: tempDir });
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(path.basename(tempDir));
    expect(res.body.data.statistics.totalCommits).toBe(1);

    // Test that the cached sub-routes now work
    const statsRes = await request(app).get('/api/v1/repository/statistics');
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.totalCommits).toBe(1);
    
    const filesRes = await request(app).get('/api/v1/repository/files');
    expect(filesRes.status).toBe(200);
    expect(filesRes.body.data.length).toBe(1); // main.ts

    // Test file reading
    const validFileRes = await request(app)
      .get('/api/v1/repository/file-content')
      .query({ path: path.join(tempDir, 'main.ts') });
    expect(validFileRes.status).toBe(200);
    expect(validFileRes.body.data).toBe('console.log("hello");');

    // Path traversal: files outside the repository are rejected with 403
    const outsidePath = path.join(os.tmpdir(), 'malicious.txt');
    await fs.writeFile(outsidePath, 'secret');
    const invalidFileRes = await request(app)
      .get('/api/v1/repository/file-content')
      .query({ path: outsidePath });
    expect(invalidFileRes.status).toBe(403);
    expect(invalidFileRes.body.error.code).toBe('ACCESS_DENIED');
    await fs.rm(outsidePath, { force: true });

    // Files inside the repo but not part of the scanned set (e.g. git internals)
    // are also rejected
    const gitInternalRes = await request(app)
      .get('/api/v1/repository/file-content')
      .query({ path: path.join(tempDir, '.git', 'config') });
    expect(gitInternalRes.status).toBe(403);
    expect(gitInternalRes.body.error.code).toBe('ACCESS_DENIED');
  });

  it('GET /api/v1/repository/file-content should reject relative paths', async () => {
    const res = await request(app)
      .get('/api/v1/repository/file-content')
      .query({ path: '../etc/passwd' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject requests with a non-local Host header (DNS rebinding guard)', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .set('Host', 'evil.example.com');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_HOST');
  });

  it('should return an analysisId and serve data addressed by it', async () => {
    const analyzeRes = await request(app)
      .post('/api/v1/repository/analyze')
      .send({ path: tempDir });
    expect(analyzeRes.status).toBe(200);
    const { analysisId } = analyzeRes.body.data;
    expect(typeof analysisId).toBe('string');
    expect(analysisId.length).toBeGreaterThan(0);

    const filesRes = await request(app)
      .get('/api/v1/repository/files')
      .query({ analysisId });
    expect(filesRes.status).toBe(200);
    expect(filesRes.body.data.length).toBe(1);

    // Unknown id → 404, never another analysis's data
    const missingRes = await request(app)
      .get('/api/v1/repository/files')
      .query({ analysisId: 'does-not-exist' });
    expect(missingRes.status).toBe(404);
    expect(missingRes.body.error.code).toBe('ANALYSIS_NOT_FOUND');
  });

  it('should paginate git history with offset/limit and report totalCommits', async () => {
    // Add a second commit for a 2-commit history
    await fs.writeFile(path.join(tempDir, 'second.ts'), 'export const x = 1;');
    const git = simpleGit(tempDir);
    await git.add('.');
    await git.commit('Second commit');

    const analyzeRes = await request(app)
      .post('/api/v1/repository/analyze')
      .send({ path: tempDir });
    const { analysisId } = analyzeRes.body.data;

    const page1 = await request(app)
      .get('/api/v1/repository/git')
      .query({ analysisId, offset: 0, limit: 1 });
    expect(page1.status).toBe(200);
    expect(page1.body.data.commits.length).toBe(1);
    expect(page1.body.data.totalCommits).toBe(2);
    expect(page1.body.data.commits[0].message).toBe('Second commit'); // newest first

    const page2 = await request(app)
      .get('/api/v1/repository/git')
      .query({ analysisId, offset: 1, limit: 1 });
    expect(page2.body.data.commits.length).toBe(1);
    expect(page2.body.data.commits[0].message).toBe('Initial API test commit');
  });

  it('should honor the maxCommits analysis option', async () => {
    await fs.writeFile(path.join(tempDir, 'extra.ts'), 'export const y = 2;');
    const git = simpleGit(tempDir);
    await git.add('.');
    await git.commit('Extra commit');

    const res = await request(app)
      .post('/api/v1/repository/analyze')
      .send({ path: tempDir, maxCommits: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.statistics.totalCommits).toBe(1);
  });
});
