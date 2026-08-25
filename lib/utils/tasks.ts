import { isBefore, startOfDay, parseISO, isValid } from 'date-fns'
import type { TaskModel } from '../types'

export const TASK_CATEGORIES = ['General', 'Contract', 'PO', 'Scope', 'Supplier'] as const

// Overdue is derived client-side, not a real backend status — a task is
// overdue if its due date is before today and it isn't already done.
export function isTaskOverdue(task: Pick<TaskModel, 'due_date' | 'status'>): boolean {
  if (!task.due_date || task.status === 'done') return false
  const due = parseISO(task.due_date)
  if (!isValid(due)) return false
  return isBefore(startOfDay(due), startOfDay(new Date()))
}

export function buildTaskRequestBody(task: Partial<TaskModel>): Record<string, unknown> {
  return {
    title: task.title,
    description: task.description ?? '',
    due_date: task.due_date,
    priority: task.priority ?? false,
    assignee: task.assignee,
    category: task.category,
    status: task.status ?? 'open',
    project_id: task.project_id,
    // Mirrors the contract's client_ra_number — the tasks list (GET /tasks)
    // returns it as project_name, so writes need to keep it in sync.
    project_name: task.project_name,
    parent_task_id: task.parent_task_id ?? null,
  }
}

export function formatTaskLog(task: TaskModel): string {
  return `[${task.status?.toUpperCase()}] ${task.title} — Due: ${task.due_date ?? 'N/A'}`
}

export function groupTasksByStatus(tasks: TaskModel[]): Record<string, TaskModel[]> {
  return tasks.reduce<Record<string, TaskModel[]>>((acc, task) => {
    const key = task.status || 'unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(task)
    return acc
  }, {})
}

/** Map parent_task_id → its direct children */
export function buildSubtaskMap(tasks: TaskModel[]): Record<string, TaskModel[]> {
  return tasks.reduce<Record<string, TaskModel[]>>((acc, task) => {
    if (task.parent_task_id) {
      if (!acc[task.parent_task_id]) acc[task.parent_task_id] = []
      acc[task.parent_task_id].push(task)
    }
    return acc
  }, {})
}
