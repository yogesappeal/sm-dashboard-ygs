'use client'

import { create } from 'zustand'
import type { UserDetails } from '../types'

export type UserRole = 'Site Manager' | 'Operations' | 'Admin' | null

interface AuthStore {
  user: UserDetails | null
  role: UserRole
  token: string | null
  isLoading: boolean
  // True once we've fetched the user's job_title and it's not one of the
  // roles allowed to use this app (see components/shared/auth-provider.tsx).
  // Distinct from `role === null`, which also happens transiently before the
  // fetch resolves or if it fails outright (fail-open, non-fatal).
  accessDenied: boolean
  setUser: (user: UserDetails | null) => void
  setRole: (role: UserRole) => void
  setToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  setAccessDenied: (denied: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  role: null,
  token: null,
  isLoading: true,
  accessDenied: false,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setToken: (token) => set({ token }),
  setLoading: (isLoading) => set({ isLoading }),
  setAccessDenied: (accessDenied) => set({ accessDenied }),
  clear: () => set({ user: null, role: null, token: null, accessDenied: false }),
}))
