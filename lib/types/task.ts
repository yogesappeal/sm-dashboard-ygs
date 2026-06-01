export interface TaskModel {
  id: string
  title: string
  description: string
  dueDate: string
  priority: boolean
  isActive: boolean
  assignee: string
  createdBy: string
  createdAt: string
  updatedAt: string
  parentTaskId: string
  projectId: string
  category: string
  status: string
  projectName: string
}

export interface TaskCategory {
  id: string
  name: string
  color: string
}
