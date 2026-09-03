import { create } from 'zustand';

export type AppTheme = 'dark';

export interface Track {
  id: string;
  title: string;
  duration: number | null;
  albumId: string | null;
  audioUri: string | null;
  coverImage: string | null;
}

interface AppState {
  currentPlayingTrack: Track | null;
  activeTheme: AppTheme;
  setCurrentPlayingTrack: (track: Track | null) => void;
  setActiveTheme: (theme: AppTheme) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPlayingTrack: null,
  activeTheme: 'dark',
  setCurrentPlayingTrack: (track) => set({ currentPlayingTrack: track }),
  setActiveTheme: (theme) => set({ activeTheme: theme }),
}));