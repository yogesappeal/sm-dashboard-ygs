import type { TaskModel } from '../types'

export function buildTaskRequestBody(task: Partial<TaskModel>): Record<string, unknown> {
  return {
    title: task.title,
    description: task.description ?? '',
    due_date: task.dueDate,
    priority: task.priority ?? false,
    assignee: task.assignee,
    category: task.category,
    status: task.status ?? 'pending',
    project_id: task.projectId,
    parent_task_id: task.parentTaskId ?? null,
  }
}

export function formatTaskLog(task: TaskModel): string {
  return `[${task.status?.toUpperCase()}] ${task.title} — Due: ${task.dueDate ?? 'N/A'}`
}

export function groupTasksByStatus(tasks: TaskModel[]): Record<string, TaskModel[]> {
  return tasks.reduce<Record<string, TaskModel[]>>((acc, task) => {
    const key = task.status || 'unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(task)
    return acc
  }, {})
}
