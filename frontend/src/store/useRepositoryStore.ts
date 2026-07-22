import { create } from 'zustand';
import { API_URL } from '../lib/config';
import type { FileModel, RepositoryMetadata, DependencyGraphData, GitGraphData } from '../types';

interface RepositoryState {
  isAnalyzing: boolean;
  isFetchingFiles: boolean;
  isFetchingDependencies: boolean;
  isFetchingGit: boolean;
  analysisProgress: number; // 0 to 100
  abortController: AbortController | null;
  error: string | null;
  
  metadata: RepositoryMetadata | null;
  files: FileModel[];
  dependencies: DependencyGraphData | null;
  git: GitGraphData | null;
  
  // Tabs & Code Viewer
  activeFile: FileModel | null;
  openFiles: FileModel[];
  activeFileContent: string | null;
  isFileLoading: boolean;
  activeTab: 'code' | 'dependencies' | 'git' | 'insights';

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
  setActiveTab: (tab: 'code' | 'dependencies' | 'git' | 'insights') => void;
  toggleFolder: (path: string) => void;
  toggleFavorite: (file: FileModel) => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  setSessionHistoryOpen: (isOpen: boolean) => void;
  setCompareModalOpen: (isOpen: boolean) => void;
  loadSessionIntoStore: (session: any) => void;
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
  
  metadata: null,
  files: [],
  dependencies: null,
  git: null,
  
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

  loadSessionIntoStore: (session: any) => {
    set({
      metadata: session.metadata,
      files: session.files,
      dependencies: session.dependencies,
      git: session.git,
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
      metadata: null,
      files: [],
      dependencies: null,
      git: null
    });

    try {
      // 1. Fetch Metadata (Core analysis)
      const res = await fetch(`${API_URL}/repository/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
        signal
      });
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to analyze repository');
      }

      set({ metadata: data.data, analysisProgress: 30, isFetchingFiles: true });

      // 2. Fetch Files Incremental
      const filesRes = await fetch(`${API_URL}/repository/files`, { signal });
      const filesData = await filesRes.json();
      if (filesData.success) {
        // Normalize: backend FileModel uses sizeBytes, has no isDirectory/lastModified.
        // Frontend FileModel expects size, isDirectory, lastModified.
        const normalizedFiles = (filesData.data as any[]).map((f) => ({
          name: f.name,
          path: f.path,
          relativePath: f.relativePath,
          extension: f.extension,
          language: f.language,
          size: f.sizeBytes ?? 0,
          sizeBytes: f.sizeBytes ?? 0,
          isDirectory: false,      // backend only returns files, never directories
          lastModified: 0,         // not tracked by backend
        }));
        set({ files: normalizedFiles });
      }
      set({ analysisProgress: 60, isFetchingFiles: false, isFetchingDependencies: true });

      // 3. Fetch Dependencies Incremental
      const depRes = await fetch(`${API_URL}/repository/dependencies`, { signal });
      const depData = await depRes.json();
      if (depData.success) {
        // Normalize: backend GraphNode shape is {id, fileMetadata:{path,name,language,...}, hasSyntaxError}
        // Frontend DependencyGraphData.GraphNode expects {id, path, name, type}
        const normalizedDeps = {
          nodes: (depData.data.nodes as any[]).map((n) => ({
            id: n.id,
            path: n.fileMetadata?.path ?? n.id,
            name: n.fileMetadata?.name ?? n.id.split('/').pop() ?? n.id,
            type: n.fileMetadata?.language ?? 'Unknown',
            hasSyntaxError: n.hasSyntaxError ?? false,
          })),
          // Normalize: backend GraphEdge shape is {sourceId, targetId, isDynamic, isTypeOnly}
          // Frontend DependencyGraphData.GraphEdge expects {sourceId, targetId, type}
          edges: (depData.data.edges as any[]).map((e) => ({
            sourceId: e.sourceId,
            targetId: e.targetId,
            type: e.isDynamic ? 'dynamic' : 'static',
            isDynamic: e.isDynamic,
            isTypeOnly: e.isTypeOnly,
          })),
        };
        set({ dependencies: normalizedDeps });
      }
      set({ analysisProgress: 85, isFetchingDependencies: false, isFetchingGit: true });

      // 4. Fetch Git Data Incremental
      const gitRes = await fetch(`${API_URL}/repository/git`, { signal });
      const gitData = await gitRes.json();
      if (gitData.success) {
        // Normalize: backend GitCommitNode uses authorName/authorEmail/date (Date object serialized)
        // Frontend GitGraphData.GitCommitNode expects author/timestamp (string)
        const normalizedGit = {
          head: gitData.data.head,
          commits: (gitData.data.commits as any[]).map((c) => ({
            hash: c.hash,
            parents: c.parents ?? [],
            author: c.authorName ?? c.author ?? 'Unknown',
            authorEmail: c.authorEmail ?? '',
            // date is serialized as ISO string by JSON.stringify on a Date object
            timestamp: typeof c.date === 'string'
              ? c.date
              : (c.timestamp ?? new Date(c.date).toISOString()),
            message: c.message ?? '',
            refs: c.refs ?? [],
            filesChanged: c.filesChanged ?? [],
          })),
        };
        set({ git: normalizedGit });
      }

      set({ analysisProgress: 100, isFetchingGit: false });

    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Fetch aborted — state already cleaned up by cancelAnalysis
      } else {
        set({ error: err.message });
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
      const res = await fetch(`${API_URL}/repository/file-content?path=${encodeURIComponent(file.path)}`);
      const data = await res.json();
      if (get().activeFile?.path === file.path) {
        if (!data.success) throw new Error(data.error?.message || 'Failed to read file');
        set({ activeFileContent: data.data });
      }
    } catch (err: any) {
      if (get().activeFile?.path === file.path) {
        set({ error: err.message, activeFileContent: null });
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

  setActiveTab: (tab: 'code' | 'dependencies' | 'git' | 'insights') => {
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
