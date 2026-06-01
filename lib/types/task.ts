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
  message: string
  data: TaskModel[]
  meta: { total: number }
}

export interface TaskCategory {
  id: string
  name: string
  color: string
}
