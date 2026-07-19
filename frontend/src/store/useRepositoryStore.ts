import { create } from 'zustand';
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
  activeTab: 'code' | 'dependencies' | 'git';

  // DX State
  favorites: FileModel[];
  recentFiles: FileModel[];
  expandedFolders: Record<string, boolean>;
  commandPaletteOpen: boolean;

  // Actions
  analyze: (path: string) => Promise<void>;
  cancelAnalysis: () => void;
  setActiveFile: (file: FileModel) => Promise<void>;
  closeFile: (path: string) => void;
  setActiveTab: (tab: 'code' | 'dependencies' | 'git') => void;
  toggleFolder: (path: string) => void;
  toggleFavorite: (file: FileModel) => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
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

  favorites: [],
  recentFiles: [],
  expandedFolders: {},
  commandPaletteOpen: false,

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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/repository/analyze`, {
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
      const filesRes = await fetch(`${import.meta.env.VITE_API_URL}/repository/files`, { signal });
      const filesData = await filesRes.json();
      if (filesData.success) {
        set({ files: filesData.data });
      }
      set({ analysisProgress: 60, isFetchingFiles: false, isFetchingDependencies: true });

      // 3. Fetch Dependencies Incremental
      const depRes = await fetch(`${import.meta.env.VITE_API_URL}/repository/dependencies`, { signal });
      const depData = await depRes.json();
      if (depData.success) {
        set({ dependencies: depData.data });
      }
      set({ analysisProgress: 85, isFetchingDependencies: false, isFetchingGit: true });

      // 4. Fetch Git Data Incremental
      const gitRes = await fetch(`${import.meta.env.VITE_API_URL}/repository/git`, { signal });
      const gitData = await gitRes.json();
      if (gitData.success) {
        set({ git: gitData.data });
      }

      set({ analysisProgress: 100, isFetchingGit: false });

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Fetch aborted');
      } else {
        set({ error: err.message });
      }
    } finally {
      set({ isAnalyzing: false, abortController: null, isFetchingFiles: false, isFetchingDependencies: false, isFetchingGit: false });
    }
  },

  setActiveFile: async (file: FileModel) => {
    if (file.isDirectory) return;

    const state = get();
    
    // Manage Recent Files
    const recentFiles = [file, ...state.recentFiles.filter(f => f.path !== file.path)].slice(0, 10);
    
    // Manage Open Tabs
    let openFiles = [...state.openFiles];
    if (!openFiles.find(f => f.path === file.path)) {
      openFiles.push(file);
    }

    set({ activeFile: file, openFiles, recentFiles, isFileLoading: true, error: null, activeTab: 'code', commandPaletteOpen: false });
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/repository/file-content?path=${encodeURIComponent(file.path)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to read file');
      set({ activeFileContent: data.data });
    } catch (err: any) {
      set({ error: err.message, activeFileContent: null });
    } finally {
      set({ isFileLoading: false });
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

  setActiveTab: (tab: 'code' | 'dependencies' | 'git') => {
    set({ activeTab: tab });
  },

  toggleFolder: (path: string) => {
    const expanded = get().expandedFolders;
    // Default to true if not present, then toggle
    const current = expanded[path] === undefined ? true : expanded[path];
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
  }
}));
