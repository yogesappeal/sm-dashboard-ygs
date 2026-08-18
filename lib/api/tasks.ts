import { api } from './fetcher'
import type { TaskModel, TasksResponse, TaskDetailResponse, TaskHistoryEntry, TaskHistoryResponse } from '../types'

interface GetTasksParams {
  assignee?: string
  status?: string
  category?: string
  projectId?: string
  onlyParent?: boolean
  isActive?: boolean
  priority?: boolean
}

export async function getAllTasks(token: string, params: GetTasksParams = {}) {
  const q = new URLSearchParams({
    ...(params.assignee ? { assignee: params.assignee } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.category ? { category: params.category } : {}),
    ...(params.projectId ? { project: params.projectId } : {}),
    ...(params.onlyParent !== undefined ? { only_parent: String(params.onlyParent) } : {}),
    ...(params.isActive !== undefined ? { is_active: String(params.isActive) } : {}),
    ...(params.priority !== undefined ? { priority: String(params.priority) } : {}),
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
  return api.post('/functions/v1/tasks', token, body)
}

export async function updateExistingTask(token: string, body: { task_id: string; [key: string]: unknown }) {
  const { task_id, ...rest } = body
  return api.patch(`/functions/v1/tasks/${task_id}`, token, rest)
}

export async function updateTaskPriority(
  token: string,
  taskId: string,
  priority: boolean
) {
  return api.patch(`/functions/v1/tasks/${taskId}/priority`, token, { priority })
}

export async function updateTaskStatus(
  token: string,
  taskId: string,
  status: string
) {
  return api.patch(`/functions/v1/tasks/${taskId}/status`, token, { status })
}

export async function getTaskById(token: string, taskId: string): Promise<TaskModel> {
  const res = await api.get<TaskDetailResponse>(`/functions/v1/tasks/${taskId}`, token)
  return res.data
}

export async function getTaskHistory(token: string, taskId: string): Promise<TaskHistoryEntry[]> {
  const res = await api.get<TaskHistoryResponse>(`/functions/v1/tasks/${taskId}/history`, token)
  return res.data ?? []
}
