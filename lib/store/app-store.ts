'use client'

import { create } from 'zustand'
import type { SmToolboxModel } from '../types'

type MenuItem = 'home' | 'purchase-orders' | 'suppliers' | 'scope' | 'tasks'

interface AppStore {
  activeMenu: MenuItem
  sidebarOpen: boolean
  mobileSidebarOpen: boolean
  toolboxItems: SmToolboxModel[]
  setActiveMenu: (menu: MenuItem) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void
  setToolboxItems: (items: SmToolboxModel[]) => void
}

export const useAppStore = create<AppStore>((set) => ({
  activeMenu: 'home',
  sidebarOpen: true,
  mobileSidebarOpen: false,
  toolboxItems: [],
  setActiveMenu: (activeMenu) => set({ activeMenu }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
  setToolboxItems: (toolboxItems) => set({ toolboxItems }),
}))
