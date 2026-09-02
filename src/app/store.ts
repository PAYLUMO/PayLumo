import { create } from 'zustand';
import type { StoredAnalysis } from '@shared/analysis/types';
import { getAnalysis, saveAnalysis } from '@/lib/storage';

interface AnalysisStore {
  /** dernière analyse produite / ouverte, gardée en mémoire pour l'affichage. */
  current: StoredAnalysis | null;
  status: 'idle' | 'working' | 'done' | 'error';
  error: string | null;
  setWorking: () => void;
  setError: (message: string) => void;
  setCurrent: (a: StoredAnalysis, persist?: boolean) => void;
  loadById: (id: string) => Promise<StoredAnalysis | null>;
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  current: null,
  status: 'idle',
  error: null,
  setWorking: () => set({ status: 'working', error: null }),
  setError: (message) => set({ status: 'error', error: message }),
  setCurrent: (a, persist = true) => {
    set({ current: a, status: 'done', error: null });
    if (persist) void saveAnalysis(a);
  },
  loadById: async (id) => {
    const existing = get().current;
    if (existing?.id === id) return existing;
    const a = (await getAnalysis(id)) ?? null;
    if (a) set({ current: a, status: 'done' });
    return a;
  },
}));
