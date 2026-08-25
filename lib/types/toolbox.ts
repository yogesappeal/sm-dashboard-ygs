export interface ToolboxApp {
  url: string
  icon: string
  name: string
}

export interface ToolboxCategory {
  category: string
  apps: ToolboxApp[]
}

export interface ToolboxResponse {
  success: boolean
  data: ToolboxCategory[]
}
