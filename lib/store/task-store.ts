'use client'

import { create } from 'zustand'
import type { TaskModel } from '../types'

interface TaskStore {
  tasks: TaskModel[]
  categories: string[]
  setTasks: (tasks: TaskModel[]) => void
  setCategories: (categories: string[]) => void
  addTask: (task: TaskModel) => void
  updateTask: (id: string, updates: Partial<TaskModel>) => void
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  categories: [],
  setTasks: (tasks) => set({ tasks }),
  setCategories: (categories) => set({ categories }),
  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
  updateTask: (id, updates) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
}))
