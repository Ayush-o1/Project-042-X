import { create } from 'zustand';
import type { FileModel, RepositoryMetadata } from '../types';

interface RepositoryState {
  isAnalyzing: boolean;
  error: string | null;
  metadata: RepositoryMetadata | null;
  files: FileModel[];
  activeFile: FileModel | null;
  activeFileContent: string | null;
  isFileLoading: boolean;

  analyze: (path: string) => Promise<void>;
  setActiveFile: (file: FileModel) => Promise<void>;
}

export const useRepositoryStore = create<RepositoryState>((set) => ({
  isAnalyzing: false,
  error: null,
  metadata: null,
  files: [],
  activeFile: null,
  activeFileContent: null,
  isFileLoading: false,

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

      // After successful analysis, immediately fetch files
      const filesRes = await fetch('http://localhost:5001/api/v1/repository/files');
      const filesData = await filesRes.json();
      if (filesData.success) {
        set({ files: filesData.data });
      }

    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isAnalyzing: false });
    }
  },

  setActiveFile: async (file: FileModel) => {
    if (file.isDirectory) return;

    set({ activeFile: file, isFileLoading: true, error: null });
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
  }
}));
