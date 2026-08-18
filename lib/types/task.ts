export interface TaskModel {
  id: string
  title: string
  description: string
  due_date: string
  priority: boolean
  is_active: boolean
  assignee: string
  created_by: string | null
  created_at: string
  updated_at: string
  parent_task_id: string | null
  project_id: string
  category: string
  status: string
  project_name: string
}

export interface TasksResponse {
  success: boolean
  data: TaskModel[]
}

export interface TaskDetailResponse {
  success: boolean
  data: TaskModel
}

export interface TaskHistoryEntry {
  id: string
  task_id: string
  action: string
  field_name: string | null
  old_value: string | null
  new_value: string | null
  actor_id: string | null
  actor_type: string
  note: string | null
  created_at: string
  actor_name: string | null
}

export interface TaskHistoryResponse {
  success: boolean
  data: TaskHistoryEntry[]
}

export interface TaskCategory {
  id: string
  name: string
  color: string
}
