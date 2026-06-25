import { create } from 'zustand';

export interface VersionSnapshot {
  id: string;
  version_name: string;
  created_at: string;
  snapshot_data: string;
  snapshot_json: unknown;
}

interface VersionState {
  isSidebarOpen: boolean;
  versions: VersionSnapshot[];
  toggleSidebar: () => void;
  setVersions: (versions: VersionSnapshot[]) => void;
  addVersion: (version: VersionSnapshot) => void;
}

export const useVersionStore = create<VersionState>((set) => ({
  isSidebarOpen: false,
  versions: [],
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setVersions: (versions) => set({ versions }),
  addVersion: (version) => set((state) => ({ versions: [version, ...state.versions] })),
}));