'use client'

import { create } from 'zustand'
import type { UserDetails } from '../types'

type UserRole = 'Site Manager' | 'Operations' | null

interface AuthStore {
  user: UserDetails | null
  role: UserRole
  token: string | null
  isLoading: boolean
  setUser: (user: UserDetails | null) => void
  setRole: (role: UserRole) => void
  setToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  role: null,
  token: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setToken: (token) => set({ token }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ user: null, role: null, token: null }),
}))
