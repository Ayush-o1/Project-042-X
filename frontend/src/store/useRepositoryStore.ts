import { create } from 'zustand';
import type { FileModel, RepositoryMetadata, DependencyGraphData, GitGraphData } from '../types';

interface RepositoryState {
  isAnalyzing: boolean;
  error: string | null;
  metadata: RepositoryMetadata | null;
  files: FileModel[];
  dependencies: DependencyGraphData | null;
  git: GitGraphData | null;
  activeFile: FileModel | null;
  activeFileContent: string | null;
  isFileLoading: boolean;
  activeTab: 'code' | 'dependencies' | 'git';

  analyze: (path: string) => Promise<void>;
  setActiveFile: (file: FileModel) => Promise<void>;
  setActiveTab: (tab: 'code' | 'dependencies' | 'git') => void;
}

export const useRepositoryStore = create<RepositoryState>((set) => ({
  isAnalyzing: false,
  error: null,
  metadata: null,
  files: [],
  dependencies: null,
  git: null,
  activeFile: null,
  activeFileContent: null,
  isFileLoading: false,
  activeTab: 'code',

  analyze: async (path: string) => {
    set({ isAnalyzing: true, error: null });
    try {
      const res = await fetch('http://localhost:5001/api/v1/repository/analyze', {
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
        fetch('http://localhost:5001/api/v1/repository/files'),
        fetch('http://localhost:5001/api/v1/repository/dependencies'),
        fetch('http://localhost:5001/api/v1/repository/git')
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

    set({ activeFile: file, isFileLoading: true, error: null, activeTab: 'code' });
    try {
      const res = await fetch(`http://localhost:5001/api/v1/repository/file-content?path=${encodeURIComponent(file.path)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to read file');
      set({ activeFileContent: data.data });
    } catch (err: any) {
      set({ error: err.message, activeFileContent: null });
    } finally {
      set({ isFileLoading: false });
    }
  },

  setActiveTab: (tab: 'code' | 'dependencies' | 'git') => {
    set({ activeTab: tab });
  }
}));
