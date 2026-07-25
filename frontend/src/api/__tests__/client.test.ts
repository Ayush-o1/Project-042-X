import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFiles, fetchDependencies } from '../client';

function jsonResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data }),
  } as Response;
}

const wireFile = (name: string) => ({
  path: `/repo/${name}.ts`,
  relativePath: `${name}.ts`,
  name: `${name}.ts`,
  extension: '.ts',
  language: 'TypeScript',
  sizeBytes: 10,
});

const wireNode = (id: string) => ({
  id: `/repo/${id}.ts`,
  fileMetadata: wireFile(id),
  hasSyntaxError: false,
});

describe('api/client pagination', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetchFiles pages through until offset reaches totalFiles and concatenates in order', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ files: [wireFile('a'), wireFile('b')], totalFiles: 3 }))
      .mockResolvedValueOnce(jsonResponse({ files: [wireFile('c')], totalFiles: 3 }));

    const files = await fetchFiles('analysis-1');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(files.map(f => f.name)).toEqual(['a.ts', 'b.ts', 'c.ts']);

    // Each request must carry analysisId plus an offset/limit pair, and
    // offset must advance by exactly what the previous page returned.
    const firstUrl = fetchMock.mock.calls[0][0] as string;
    const secondUrl = fetchMock.mock.calls[1][0] as string;
    expect(firstUrl).toContain('offset=0');
    expect(firstUrl).toContain('analysisId=analysis-1');
    expect(secondUrl).toContain('offset=2');
  });

  it('fetchFiles makes exactly one request when the first page already covers totalFiles', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ files: [wireFile('a')], totalFiles: 1 }));

    const files = await fetchFiles();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(files.map(f => f.name)).toEqual(['a.ts']);
  });

  it('fetchFiles returns an empty array without looping forever when totalFiles is 0', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ files: [], totalFiles: 0 }));

    const files = await fetchFiles();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(files).toEqual([]);
  });

  it('fetchDependencies pages through nodes and concatenates nodes/edges across pages', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          nodes: [wireNode('a')],
          edges: [{ sourceId: '/repo/a.ts', targetId: '/repo/b.ts', isDynamic: false, isTypeOnly: false }],
          totalNodes: 2,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          nodes: [wireNode('b')],
          edges: [],
          totalNodes: 2,
        }),
      );

    const deps = await fetchDependencies('analysis-1');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(deps.nodes.map(n => n.id)).toEqual(['/repo/a.ts', '/repo/b.ts']);
    expect(deps.edges).toEqual([
      { sourceId: '/repo/a.ts', targetId: '/repo/b.ts', type: 'static', isDynamic: false, isTypeOnly: false },
    ]);
  });

  it('a stall (server reports more items than it actually sent) does not loop forever', async () => {
    // Defensive case: if a page ever comes back empty but totalFiles claims
    // there's more, the loop must still terminate rather than spin.
    fetchMock.mockResolvedValueOnce(jsonResponse({ files: [], totalFiles: 5 }));

    const files = await fetchFiles();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(files).toEqual([]);
  });
});
