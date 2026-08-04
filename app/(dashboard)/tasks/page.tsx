'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckSquare, Flag } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { usePermission } from '@/lib/hooks/use-permission'
import { getAllTasks } from '@/lib/api'
import { groupTasksByStatus, buildSubtaskMap } from '@/lib/utils/tasks'
import { PageHeader } from '@/components/shared/page-header'
import { TaskCard, TaskTableHeader } from '@/components/cards/task-card'
import { TaskSlideOver } from '@/components/cards/task-slide-over'
import { TaskQuickAdd } from '@/components/cards/task-quick-add'
import { EmptyState } from '@/components/ui/empty-state'
import { TableRowSkeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { TaskModel } from '@/lib/types'

const FEATURE_TASK = process.env.NEXT_PUBLIC_FEATURE_TASK === 'true'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  done: 'Done',
}

export default function TasksPage() {
  const { token } = useAuthStore()
  const canViewTasks = usePermission('task:view')

  const [statusFilter, setStatusFilter] = useState('')
  const [priorityOnly, setPriorityOnly] = useState(false)
  // Stack of tasks drilled into from the detail slide-over — last item is
  // the one currently shown, earlier items are what "Back" returns to.
  const [taskDetailStack, setTaskDetailStack] = useState<TaskModel[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)

  const editingTask = taskDetailStack[taskDetailStack.length - 1] ?? null
  const parentTaskDetail = taskDetailStack.length > 1 ? taskDetailStack[taskDetailStack.length - 2] : null

  const openTaskDetail = (task: TaskModel) => setTaskDetailStack([task])
  const pushTaskDetail = (task: TaskModel) => setTaskDetailStack((s) => [...s, task])
  const popTaskDetail = () => setTaskDetailStack((s) => s.slice(0, -1))
  const closeTaskDetail = () => setTaskDetailStack([])

  const queryKey = ['tasks', statusFilter]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getAllTasks(token!, { status: statusFilter || undefined, onlyParent: false }),
    enabled: !!token && FEATURE_TASK && canViewTasks,
    staleTime: 60 * 1000,
  })

  const allTasks = Array.isArray(data) ? data : []
  const subtaskMap = buildSubtaskMap(allTasks)
  // Only show root tasks in the list — subtasks are rendered inside their parent
  const rootTasks = allTasks.filter((t) => !t.parent_task_id)
  const tasks = priorityOnly ? rootTasks.filter((t) => t.priority) : rootTasks
  const grouped = statusFilter ? null : groupTasksByStatus(tasks)

  if (!FEATURE_TASK) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <CheckSquare className="text-slate-300" size={28} />
        </div>
        <p className="text-slate-700 font-medium">Tasks are currently disabled</p>
        <p className="text-slate-400 text-sm mt-1">Enable via NEXT_PUBLIC_FEATURE_TASK=true</p>
      </div>
    )
  }

  if (!canViewTasks) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <CheckSquare className="text-slate-300" size={28} />
        </div>
        <p className="text-slate-700 font-medium">You don&apos;t have access to Tasks</p>
        <p className="text-slate-400 text-sm mt-1">Contact an admin if you think this is a mistake</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed header — title, filters, table column header. Doesn't scroll. */}
      <div className="flex-shrink-0">
        <PageHeader
          title="Tasks"
          description="Track and manage team tasks"
          action={
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#6692C5] hover:bg-[#4F7CB3] text-white text-sm font-medium rounded-lg transition-colors"
            >
              + New Task
            </button>
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  statusFilter === f.value
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPriorityOnly((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              priorityOnly
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
            )}
          >
            <Flag size={12} className={priorityOnly ? 'fill-red-500 text-red-500' : ''} />
            Priority only
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4">
          <TaskTableHeader />
        </div>
      </div>

      {/* Scrollable task list — only this area scrolls */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} />)}
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No tasks found"
            description={priorityOnly ? 'No priority tasks' : 'Create your first task to get started'}
          />
        ) : statusFilter ? (
          // Flat list when filtered by status
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                token={token!}
                queryKey={queryKey}
                onEdit={openTaskDetail}
                subtasks={subtaskMap[task.id] ?? []}
              />
            ))}
            {statusFilter === 'open' && (
              <TaskQuickAdd token={token!} status={statusFilter} queryKey={queryKey} />
            )}
          </div>
        ) : (
          // Grouped by status when showing all
          <div className="space-y-4">
            {Object.entries(grouped ?? {})
              .filter(([, statusTasks]) => statusTasks.length > 0)
              .map(([status, statusTasks]) => (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {STATUS_LABELS[status] ?? status}
                    </h3>
                    <span className="text-xs text-slate-400">({statusTasks.length})</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    {statusTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        token={token!}
                        queryKey={queryKey}
                        onEdit={openTaskDetail}
                        subtasks={subtaskMap[task.id] ?? []}
                      />
                    ))}
                    {status === 'open' && (
                      <TaskQuickAdd token={token!} status={status} queryKey={queryKey} />
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Create slide-over */}
      {showCreateModal && (
        <TaskSlideOver
          token={token!}
          onClose={() => setShowCreateModal(false)}
          queryKey={queryKey}
        />
      )}

      {/* Edit slide-over */}
      {editingTask && (
        <TaskSlideOver
          token={token!}
          task={editingTask}
          onClose={closeTaskDetail}
          onBack={parentTaskDetail ? popTaskDetail : undefined}
          backLabel={parentTaskDetail?.title}
          onOpenSubtask={pushTaskDetail}
          queryKey={queryKey}
          subtasks={subtaskMap[editingTask.id] ?? []}
        />
      )}
    </div>
  )
}
