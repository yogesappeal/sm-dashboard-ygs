import { create } from 'zustand'
import type { ScopeItem } from '../types'

interface ScopeStore {
  // Draft scope items being built for the create form
  draftItems: ScopeItem[]
  addDraftItem: (item: ScopeItem) => void
  updateDraftItem: (id: string, item: Partial<ScopeItem>) => void
  removeDraftItem: (id: string) => void
  clearDraftItems: () => void
}

export const useScopeStore = create<ScopeStore>((set) => ({
  draftItems: [],
  addDraftItem: (item) =>
    set((s) => ({ draftItems: [...s.draftItems, item] })),
  updateDraftItem: (id, patch) =>
    set((s) => ({
      draftItems: s.draftItems.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })),
  removeDraftItem: (id) =>
    set((s) => ({ draftItems: s.draftItems.filter((i) => i.id !== id) })),
  clearDraftItems: () => set({ draftItems: [] }),
}))
