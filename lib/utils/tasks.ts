import type { TaskModel } from '../types'

export function buildTaskRequestBody(task: Partial<TaskModel>): Record<string, unknown> {
  return {
    title: task.title,
    description: task.description ?? '',
    due_date: task.due_date,
    priority: task.priority ?? false,
    assignee: task.assignee,
    category: task.category,
    status: task.status ?? 'pending',
    project_id: task.project_id,
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
