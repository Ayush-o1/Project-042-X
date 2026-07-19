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

    // Test path traversal security
    const outsidePath = path.join(os.tmpdir(), 'malicious.txt');
    await fs.writeFile(outsidePath, 'secret');
    const invalidFileRes = await request(app)
      .get('/api/v1/repository/file-content')
      .query({ path: outsidePath });
    expect(invalidFileRes.status).toBe(500); // Because it throws an Error currently in service
    expect(invalidFileRes.body.error.message).toContain('Access Denied');
  });
});
