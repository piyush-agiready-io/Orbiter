import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_RECENTS = 5;

interface RecentsState {
  recentIds: string[];
  addRecent: (projectId: string) => void;
}

export const useRecents = create<RecentsState>()(
  persist(
    (set) => ({
      recentIds: [],
      addRecent: (id) =>
        set((state) => {
          const filtered = state.recentIds.filter((r) => r !== id);
          return { recentIds: [id, ...filtered].slice(0, MAX_RECENTS) };
        }),
    }),
    { name: 'orbiter-recents' },
  ),
);
