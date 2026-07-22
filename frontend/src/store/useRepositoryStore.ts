import { create } from 'zustand';
import {
  analyzeRepository,
  fetchDependencies,
  fetchFileContent,
  fetchFiles,
  fetchGit,
} from '../api/client';
import { computeInsights } from '../lib/insightsEngine';
import type { InsightsResult } from '../lib/insightsEngine';
import type { AnalysisSession } from '../lib/sessionEngine';
import type { FileModel, RepositoryMetadata, DependencyGraphData, GitGraphData } from '../types';

export type ActiveTab = 'code' | 'dependencies' | 'git' | 'insights';

interface RepositoryState {
  isAnalyzing: boolean;
  isFetchingFiles: boolean;
  isFetchingDependencies: boolean;
  isFetchingGit: boolean;
  analysisProgress: number; // 0 to 100
  abortController: AbortController | null;
  error: string | null;

  /** Resource id of the current analysis; sent with every data request. */
  analysisId: string | null;
  metadata: RepositoryMetadata | null;
  files: FileModel[];
  dependencies: DependencyGraphData | null;
  git: GitGraphData | null;
  /**
   * Derived metrics, computed exactly once per loaded dataset (after analysis
   * completes or a session loads). Consumers must read this instead of calling
   * computeInsights themselves.
   */
  insights: InsightsResult | null;

  // Tabs & Code Viewer
  activeFile: FileModel | null;
  openFiles: FileModel[];
  activeFileContent: string | null;
  isFileLoading: boolean;
  activeTab: ActiveTab;

  // Deep-link: highlight a specific node in the dependency graph
  graphHighlightNode: string | null;

  // DX State
  favorites: FileModel[];
  expandedFolders: Record<string, boolean>;
  commandPaletteOpen: boolean;
  isSettingsOpen: boolean;
  isSessionHistoryOpen: boolean;
  isCompareModalOpen: boolean;

  // Actions
  analyze: (path: string) => Promise<void>;
  cancelAnalysis: () => void;
  setActiveFile: (file: FileModel) => Promise<void>;
  closeFile: (path: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
  toggleFolder: (path: string) => void;
  toggleFavorite: (file: FileModel) => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  setSessionHistoryOpen: (isOpen: boolean) => void;
  setCompareModalOpen: (isOpen: boolean) => void;
  loadSessionIntoStore: (session: AnalysisSession) => void;
  /** Navigate to the dependency graph and highlight a specific node */
  navigateToGraphNode: (nodeId: string) => void;
  /** Called by the graph view once it has focused the highlighted node */
  clearGraphHighlight: () => void;
}

export const useRepositoryStore = create<RepositoryState>((set, get) => ({
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

  cancelAnalysis: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({
        isAnalyzing: false,
        isFetchingFiles: false,
        isFetchingDependencies: false,
        isFetchingGit: false,
        analysisProgress: 0,
        abortController: null,
        error: 'Analysis cancelled by user.'
      });
    }
  },

  loadSessionIntoStore: (session: AnalysisSession) => {
    // Sessions loaded from IndexedDB carry real Map/Set instances (structured
    // clone); anything else (e.g. freshly imported JSON) is recomputed.
    const insights =
      session.insights && session.insights.moduleMetrics instanceof Map
        ? session.insights
        : computeInsights(session.files, session.dependencies, session.git);

    set({
      analysisId: null, // session data is local; backend fetches would be stale
      metadata: session.metadata,
      files: session.files,
      dependencies: session.dependencies,
      git: session.git,
      insights,
      error: null,
      isAnalyzing: false,
      isFetchingFiles: false,
      isFetchingDependencies: false,
      isFetchingGit: false,
      analysisProgress: 100,
      activeTab: 'insights',
      isSessionHistoryOpen: false
    });
  },

  analyze: async (path: string) => {
    const controller = new AbortController();
    const signal = controller.signal;

    set({
      isAnalyzing: true,
      error: null,
      abortController: controller,
      analysisProgress: 10,
      analysisId: null,
      metadata: null,
      files: [],
      dependencies: null,
      git: null,
      insights: null,
    });

    try {
      // 1. Run the analysis; the backend returns a resource id used below.
      const { analysisId, metadata } = await analyzeRepository(path, signal);
      set({ analysisId, metadata, analysisProgress: 30, isFetchingFiles: true });

      // 2-4. Fetch the payloads addressed by the analysis id.
      const files = await fetchFiles(analysisId, signal);
      set({ files, analysisProgress: 60, isFetchingFiles: false, isFetchingDependencies: true });

      const dependencies = await fetchDependencies(analysisId, signal);
      set({ dependencies, analysisProgress: 85, isFetchingDependencies: false, isFetchingGit: true });

      const git = await fetchGit(analysisId, signal);

      // 5. Compute derived metrics exactly once for the completed dataset.
      const insights = computeInsights(files, dependencies, git);
      set({ git, insights, analysisProgress: 100, isFetchingGit: false });

    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        set({ error: (err as Error).message });
      }
    } finally {
      if (get().abortController === controller) {
        set({ isAnalyzing: false, abortController: null, isFetchingFiles: false, isFetchingDependencies: false, isFetchingGit: false });
      }
    }
  },

  setActiveFile: async (file: FileModel) => {
    if (file.isDirectory) return;

    const state = get();

    // Manage Open Tabs
    const openFiles = [...state.openFiles];
    if (!openFiles.find(f => f.path === file.path)) {
      openFiles.push(file);
    }

    set({ activeFile: file, openFiles, isFileLoading: true, error: null, activeTab: 'code', commandPaletteOpen: false });

    try {
      const content = await fetchFileContent(file.path, state.analysisId ?? undefined);
      if (get().activeFile?.path === file.path) {
        set({ activeFileContent: content });
      }
    } catch (err) {
      if (get().activeFile?.path === file.path) {
        set({ error: (err as Error).message, activeFileContent: null });
      }
    } finally {
      if (get().activeFile?.path === file.path) {
        set({ isFileLoading: false });
      }
    }
  },

  closeFile: (path: string) => {
    const state = get();
    const newOpenFiles = state.openFiles.filter(f => f.path !== path);
    let newActiveFile = state.activeFile;
    let newContent = state.activeFileContent;

    if (state.activeFile?.path === path) {
      if (newOpenFiles.length > 0) {
        newActiveFile = newOpenFiles[newOpenFiles.length - 1];
        setTimeout(() => get().setActiveFile(newActiveFile!), 0);
      } else {
        newActiveFile = null;
        newContent = null;
      }
    }
    set({ openFiles: newOpenFiles, activeFile: newActiveFile, activeFileContent: newContent });
  },

  setActiveTab: (tab: ActiveTab) => {
    set({ activeTab: tab });
  },

  toggleFolder: (path: string) => {
    const expanded = get().expandedFolders;
    // Folders render collapsed by default, so an absent entry means "closed".
    // (Defaulting to true here made the first click on every folder a no-op.)
    const current = expanded[path] ?? false;
    set({ expandedFolders: { ...expanded, [path]: !current } });
  },

  toggleFavorite: (file: FileModel) => {
    const state = get();
    const isFav = state.favorites.find(f => f.path === file.path);
    if (isFav) {
      set({ favorites: state.favorites.filter(f => f.path !== file.path) });
    } else {
      set({ favorites: [...state.favorites, file] });
    }
  },

  setCommandPaletteOpen: (isOpen: boolean) => {
    set({ commandPaletteOpen: isOpen });
  },

  setSettingsOpen: (isOpen: boolean) => {
    set({ isSettingsOpen: isOpen });
  },

  setSessionHistoryOpen: (isOpen: boolean) => {
    set({ isSessionHistoryOpen: isOpen });
  },

  setCompareModalOpen: (isOpen: boolean) => {
    set({ isCompareModalOpen: isOpen });
  },

  navigateToGraphNode: (nodeId: string) => {
    // The highlight stays set until the graph view consumes it via
    // clearGraphHighlight — a fixed timeout raced against the lazy-loaded
    // graph chunk and silently dropped the navigation on first use.
    set({ activeTab: 'dependencies', graphHighlightNode: nodeId });
  },

  clearGraphHighlight: () => {
    set({ graphHighlightNode: null });
  },
}));
