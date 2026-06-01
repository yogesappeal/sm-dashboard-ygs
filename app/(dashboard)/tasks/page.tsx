'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckSquare, Star } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { getAllTasks } from '@/lib/api'
import { groupTasksByStatus } from '@/lib/utils/tasks'
import { PageHeader } from '@/components/shared/page-header'
import { TaskCard } from '@/components/cards/task-card'
import { TaskCreateEditModal } from '@/components/forms/task-create-edit-modal'
import { EmptyState } from '@/components/ui/empty-state'
import { TableRowSkeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { TaskModel } from '@/lib/types'

const FEATURE_TASK = process.env.NEXT_PUBLIC_FEATURE_TASK === 'true'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
}

export default function TasksPage() {
  const { token } = useAuthStore()

  const [statusFilter, setStatusFilter] = useState('')
  const [priorityOnly, setPriorityOnly] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskModel | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const queryKey = ['tasks', statusFilter]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getAllTasks(token!, { status: statusFilter || undefined }),
    enabled: !!token && FEATURE_TASK,
    staleTime: 60 * 1000,
  })

  const allTasks = Array.isArray(data) ? data : []
  const tasks = priorityOnly ? allTasks.filter((t) => t.priority) : allTasks
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

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Tasks"
        description="Track and manage team tasks"
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#C66EEB] hover:bg-[#A855D4] text-white text-sm font-medium rounded-lg transition-colors"
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
              ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
              : 'border-slate-200 text-slate-500 hover:border-slate-300'
          )}
        >
          <Star size={12} className={priorityOnly ? 'fill-yellow-400 text-yellow-400' : ''} />
          Priority only
        </button>
      </div>

      {/* Task list */}
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
              onEdit={setEditingTask}
            />
          ))}
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
                      onEdit={setEditingTask}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <TaskCreateEditModal
          token={token!}
          onClose={() => setShowCreateModal(false)}
          queryKey={queryKey}
        />
      )}

      {/* Edit modal */}
      {editingTask && (
        <TaskCreateEditModal
          token={token!}
          task={editingTask}
          onClose={() => setEditingTask(null)}
          queryKey={queryKey}
        />
      )}
    </div>
  )
}
