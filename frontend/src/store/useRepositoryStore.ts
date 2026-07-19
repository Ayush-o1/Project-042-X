import { create } from 'zustand';
import type { FileModel, RepositoryMetadata, DependencyGraphData, GitGraphData } from '../types';

interface RepositoryState {
  isAnalyzing: boolean;
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
  setActiveFile: (file: FileModel) => Promise<void>;
  closeFile: (path: string) => void;
  setActiveTab: (tab: 'code' | 'dependencies' | 'git') => void;
  toggleFolder: (path: string) => void;
  toggleFavorite: (file: FileModel) => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
}

export const useRepositoryStore = create<RepositoryState>((set, get) => ({
  isAnalyzing: false,
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

  analyze: async (path: string) => {
    set({ isAnalyzing: true, error: null });
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/repository/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to analyze repository');
      }

      set({ metadata: data.data });

      // Fetch files, dependencies, and git natively
      const [filesRes, depRes, gitRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/repository/files`),
        fetch(`${import.meta.env.VITE_API_URL}/repository/dependencies`),
        fetch(`${import.meta.env.VITE_API_URL}/repository/git`)
      ]);
      
      const filesData = await filesRes.json();
      const depData = await depRes.json();
      const gitData = await gitRes.json();
      
      if (filesData.success) set({ files: filesData.data });
      if (depData.success) set({ dependencies: depData.data });
      if (gitData.success) set({ git: gitData.data });

    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isAnalyzing: false });
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
        // We need to fetch the content for the newly active file, but doing it asynchronously here is tricky.
        // We'll call setActiveFile to handle the fetch safely.
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
    set({ expandedFolders: { ...expanded, [path]: !expanded[path] } });
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
