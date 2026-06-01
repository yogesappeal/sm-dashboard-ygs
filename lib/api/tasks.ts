import { api } from './fetcher'
import type { TaskModel, TasksResponse } from '../types'

interface GetTasksParams {
  assignee?: string
  status?: string
  category?: string
  projectId?: string
}

export async function getAllTasks(token: string, params: GetTasksParams = {}) {
  const q = new URLSearchParams({
    ...(params.assignee ? { assignee: params.assignee } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.category ? { category: params.category } : {}),
    ...(params.projectId ? { project_id: params.projectId } : {}),
  })
  const qs = q.toString()
  const res = await api.get<TasksResponse>(
    `/functions/v1/tasks${qs ? `?${qs}` : ''}`,
    token
  )
  // Handle both { data: [...] } and direct array response shapes
  return Array.isArray(res) ? res : (res.data ?? [])
}

export async function insertNewTask(token: string, body: unknown) {
  return api.post('/functions/v1/insert-task', token, body)
}

export async function updateExistingTask(token: string, body: unknown) {
  return api.post('/functions/v1/update-task', token, body)
}

export async function updateTaskPriority(
  token: string,
  taskId: string,
  priority: boolean
) {
  return api.post('/functions/v1/task-priority', token, {
    task_id: taskId,
    priority,
  })
}

export async function updateTaskStatus(
  token: string,
  taskId: string,
  status: string
) {
  return api.post('/functions/v1/task-status', token, {
    task_id: taskId,
    status,
  })
}
