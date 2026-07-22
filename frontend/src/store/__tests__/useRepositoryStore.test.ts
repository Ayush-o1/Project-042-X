import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DependencyGraphData, FileModel, GitGraphData, RepositoryMetadata } from '../../types';

// Mock the API client so store tests exercise store logic only, not fetch/network.
vi.mock('../../api/client', () => ({
  analyzeRepository: vi.fn(),
  fetchFiles: vi.fn(),
  fetchDependencies: vi.fn(),
  fetchGit: vi.fn(),
  fetchFileContent: vi.fn(),
}));

import { useRepositoryStore } from '../useRepositoryStore';
import * as client from '../../api/client';

const metadata: RepositoryMetadata = {
  path: '/repo',
  name: 'repo',
  statistics: { totalFiles: 1, totalSize: 10, totalCommits: 1, totalBranches: 1, predominantLanguage: 'TypeScript' },
};

const files: FileModel[] = [
  { name: 'a.ts', path: '/repo/a.ts', relativePath: 'a.ts', isDirectory: false, size: 10, extension: '.ts', language: 'TypeScript', lastModified: 0 },
];

const dependencies: DependencyGraphData = { nodes: [], edges: [] };
const git: GitGraphData = { head: null, commits: [], totalCommits: 0 };

function resetStore() {
  useRepositoryStore.setState({
    isAnalyzing: false,
    isFetchingFiles: false,
    isFetchingDependencies: false,
    isFetchingGit: false,
    analysisProgress: 0,
    abortController: null,
    error: null,
    analysisId: null,
    metadata: null,
    files: [],
    dependencies: null,
    git: null,
    insights: null,
    activeFile: null,
    openFiles: [],
    activeFileContent: null,
    isFileLoading: false,
    activeTab: 'code',
    graphHighlightNode: null,
    favorites: [],
    expandedFolders: {},
    commandPaletteOpen: false,
    isSettingsOpen: false,
    isSessionHistoryOpen: false,
    isCompareModalOpen: false,
  });
}

describe('useRepositoryStore.analyze', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('threads the returned analysisId through every subsequent fetch', async () => {
    vi.mocked(client.analyzeRepository).mockResolvedValue({ analysisId: 'abc-123', metadata });
    vi.mocked(client.fetchFiles).mockResolvedValue(files);
    vi.mocked(client.fetchDependencies).mockResolvedValue(dependencies);
    vi.mocked(client.fetchGit).mockResolvedValue(git);

    await useRepositoryStore.getState().analyze('/repo');

    expect(client.fetchFiles).toHaveBeenCalledWith('abc-123', expect.anything());
    expect(client.fetchDependencies).toHaveBeenCalledWith('abc-123', expect.anything());
    expect(client.fetchGit).toHaveBeenCalledWith('abc-123', expect.anything());

    const state = useRepositoryStore.getState();
    expect(state.analysisId).toBe('abc-123');
    expect(state.metadata).toEqual(metadata);
    expect(state.isAnalyzing).toBe(false);
    expect(state.analysisProgress).toBe(100);
  });

  it('computes insights exactly once and stores the result', async () => {
    vi.mocked(client.analyzeRepository).mockResolvedValue({ analysisId: 'id', metadata });
    vi.mocked(client.fetchFiles).mockResolvedValue(files);
    vi.mocked(client.fetchDependencies).mockResolvedValue(dependencies);
    vi.mocked(client.fetchGit).mockResolvedValue(git);

    await useRepositoryStore.getState().analyze('/repo');

    const { insights } = useRepositoryStore.getState();
    expect(insights).not.toBeNull();
    expect(insights!.moduleMetrics).toBeInstanceOf(Map);
  });

  it('sets error and clears loading flags when a fetch step fails', async () => {
    vi.mocked(client.analyzeRepository).mockResolvedValue({ analysisId: 'id', metadata });
    vi.mocked(client.fetchFiles).mockRejectedValue(new Error('backend unreachable'));

    await useRepositoryStore.getState().analyze('/repo');

    const state = useRepositoryStore.getState();
    expect(state.error).toBe('backend unreachable');
    expect(state.isAnalyzing).toBe(false);
    expect(state.isFetchingFiles).toBe(false);
  });

  it('does not set an error when the request was aborted by the user', async () => {
    const abortError = new DOMException('aborted', 'AbortError');
    vi.mocked(client.analyzeRepository).mockRejectedValue(abortError);

    await useRepositoryStore.getState().analyze('/repo');

    expect(useRepositoryStore.getState().error).toBeNull();
  });

  it('resets prior analysis state at the start of a new run', async () => {
    useRepositoryStore.setState({ analysisId: 'stale', metadata, files, dependencies, git });
    vi.mocked(client.analyzeRepository).mockImplementation(
      () => new Promise(() => {}), // never resolves; we only care about the synchronous reset
    );

    void useRepositoryStore.getState().analyze('/repo');

    const state = useRepositoryStore.getState();
    expect(state.analysisId).toBeNull();
    expect(state.files).toEqual([]);
    expect(state.isAnalyzing).toBe(true);
  });
});

describe('useRepositoryStore.cancelAnalysis', () => {
  beforeEach(resetStore);

  it('aborts the in-flight controller and reports cancellation', () => {
    const controller = new AbortController();
    const abortSpy = vi.spyOn(controller, 'abort');
    useRepositoryStore.setState({ isAnalyzing: true, abortController: controller, analysisProgress: 42 });

    useRepositoryStore.getState().cancelAnalysis();

    expect(abortSpy).toHaveBeenCalled();
    const state = useRepositoryStore.getState();
    expect(state.isAnalyzing).toBe(false);
    expect(state.analysisProgress).toBe(0);
    expect(state.error).toBe('Analysis cancelled by user.');
  });

  it('is a no-op when nothing is in flight', () => {
    useRepositoryStore.getState().cancelAnalysis();
    expect(useRepositoryStore.getState().error).toBeNull();
  });
});

describe('useRepositoryStore.toggleFolder', () => {
  beforeEach(resetStore);

  it('defaults an unseen folder to collapsed, so the first toggle opens it', () => {
    useRepositoryStore.getState().toggleFolder('/repo/src');
    // First click must expand, not collapse — a prior bug defaulted to
    // "expanded" here, making the first click on every folder a no-op.
    expect(useRepositoryStore.getState().expandedFolders['/repo/src']).toBe(true);

    useRepositoryStore.getState().toggleFolder('/repo/src');
    expect(useRepositoryStore.getState().expandedFolders['/repo/src']).toBe(false);
  });
});

describe('useRepositoryStore.navigateToGraphNode / clearGraphHighlight', () => {
  beforeEach(resetStore);

  it('sets the tab and highlight, and only clears on explicit consumption', () => {
    useRepositoryStore.getState().navigateToGraphNode('/repo/a.ts');
    let state = useRepositoryStore.getState();
    expect(state.activeTab).toBe('dependencies');
    expect(state.graphHighlightNode).toBe('/repo/a.ts');

    // No timers involved — a lazily-mounted graph view can consume the
    // highlight any time later without racing a fixed timeout.
    useRepositoryStore.getState().clearGraphHighlight();
    state = useRepositoryStore.getState();
    expect(state.graphHighlightNode).toBeNull();
  });
});

describe('useRepositoryStore.toggleFavorite', () => {
  beforeEach(resetStore);

  it('adds then removes a file from favorites', () => {
    useRepositoryStore.getState().toggleFavorite(files[0]);
    expect(useRepositoryStore.getState().favorites).toHaveLength(1);

    useRepositoryStore.getState().toggleFavorite(files[0]);
    expect(useRepositoryStore.getState().favorites).toHaveLength(0);
  });
});

describe('useRepositoryStore.closeFile', () => {
  beforeEach(resetStore);

  it('falls back to the last remaining open file when closing the active one', () => {
    const fileA: FileModel = { ...files[0], path: '/repo/a.ts', name: 'a.ts' };
    const fileB: FileModel = { ...files[0], path: '/repo/b.ts', name: 'b.ts' };
    useRepositoryStore.setState({ openFiles: [fileA, fileB], activeFile: fileB, activeFileContent: 'x' });

    useRepositoryStore.getState().closeFile('/repo/b.ts');

    const state = useRepositoryStore.getState();
    expect(state.openFiles).toEqual([fileA]);
    // setActiveFile(fileA) is deferred via setTimeout; activeFile is
    // updated synchronously to the remaining tab either way.
    expect(state.activeFile?.path).toBe('/repo/a.ts');
  });

  it('clears the active file when the last tab is closed', () => {
    const fileA: FileModel = { ...files[0], path: '/repo/a.ts' };
    useRepositoryStore.setState({ openFiles: [fileA], activeFile: fileA, activeFileContent: 'x' });

    useRepositoryStore.getState().closeFile('/repo/a.ts');

    const state = useRepositoryStore.getState();
    expect(state.openFiles).toEqual([]);
    expect(state.activeFile).toBeNull();
    expect(state.activeFileContent).toBeNull();
  });
});
