'use client'

import { useState } from 'react'
import { Star, CalendarDays, Edit2, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTaskStatus, updateTaskPriority } from '@/lib/api'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { TaskModel } from '@/lib/types'

interface TaskCardProps {
  task: TaskModel
  token: string
  queryKey: unknown[]
  onEdit: (task: TaskModel) => void
}

const STATUS_CYCLE: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'pending',
}

export function TaskCard({ task, token, queryKey, onEdit }: TaskCardProps) {
  const queryClient = useQueryClient()
  const [optimisticStatus, setOptimisticStatus] = useState(task.status)
  const [optimisticPriority, setOptimisticPriority] = useState(task.priority)

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => updateTaskStatus(token, task.id, newStatus),
    onMutate: (newStatus) => setOptimisticStatus(newStatus),
    onError: () => setOptimisticStatus(task.status),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  const priorityMutation = useMutation({
    mutationFn: (newPriority: boolean) => updateTaskPriority(token, task.id, newPriority),
    onMutate: (newPriority) => setOptimisticPriority(newPriority),
    onError: () => setOptimisticPriority(task.priority),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  const handleStatusToggle = () => {
    const next = STATUS_CYCLE[optimisticStatus] ?? 'pending'
    statusMutation.mutate(next)
  }

  const handlePriorityToggle = () => {
    priorityMutation.mutate(!optimisticPriority)
  }

  const isCompleted = optimisticStatus === 'completed'

  return (
    <div className={cn(
      'flex items-start gap-3 px-4 py-3.5 bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group',
      isCompleted && 'opacity-60'
    )}>
      {/* Status checkbox */}
      <button
        onClick={handleStatusToggle}
        disabled={statusMutation.isPending}
        className={cn(
          'mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors',
          isCompleted
            ? 'bg-[#C66EEB] border-[#C66EEB]'
            : optimisticStatus === 'in_progress'
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-300 hover:border-[#C66EEB]'
        )}
      >
        {statusMutation.isPending ? (
          <Loader2 size={10} className="animate-spin text-white" />
        ) : isCompleted ? (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : optimisticStatus === 'in_progress' ? (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
        ) : null}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm text-slate-800 font-medium truncate', isCompleted && 'line-through text-slate-400')}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-slate-400 truncate mt-0.5">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {task.project_name && (
            <span className="text-xs text-slate-400 truncate max-w-[120px]">{task.project_name}</span>
          )}
          {task.category && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-[#C66EEB] border border-purple-100">
              {task.category}
            </span>
          )}
          {task.due_date && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <CalendarDays size={11} />
              {formatDate(task.due_date)}
            </span>
          )}
          {task.assignee && (
            <span className="text-xs text-slate-400">@{task.assignee}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handlePriorityToggle}
          disabled={priorityMutation.isPending}
          title={optimisticPriority ? 'Remove priority' : 'Mark as priority'}
          className="p-1 rounded hover:bg-slate-100 transition-colors"
        >
          <Star
            size={14}
            className={cn(
              'transition-colors',
              optimisticPriority ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'
            )}
          />
        </button>
        <button
          onClick={() => onEdit(task)}
          title="Edit task"
          className="p-1 rounded hover:bg-slate-100 transition-colors"
        >
          <Edit2 size={13} className="text-slate-400" />
        </button>
      </div>

      {/* Priority indicator (always visible) */}
      {optimisticPriority && (
        <Star size={12} className="fill-yellow-400 text-yellow-400 flex-shrink-0 mt-1 group-hover:hidden" />
      )}
    </div>
  )
}

export function TaskTableHeader() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b-2 border-slate-200 bg-slate-50/50">
      <div className="w-5" />
      <span className="flex-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">Task</span>
      <span className="w-20 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:block">Due</span>
      <span className="w-16" />
    </div>
  )
}
