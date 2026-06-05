'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Loader2, Star, CalendarDays, User, Tag, Briefcase } from 'lucide-react'
import { insertNewTask, updateExistingTask, searchContract } from '@/lib/api'
import { taskSchema } from '@/lib/utils/validation'
import { buildTaskRequestBody } from '@/lib/utils/tasks'
import { cn } from '@/lib/utils'
import type { TaskModel } from '@/lib/types'
import type { z } from 'zod'

type TaskForm = z.infer<typeof taskSchema>

interface TaskSlideOverProps {
  token: string
  task?: TaskModel | null
  onClose: () => void
  queryKey: unknown[]
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-slate-100 text-slate-600' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-50 text-blue-600' },
  { value: 'completed', label: 'Completed', color: 'bg-green-50 text-green-600' },
]

export function TaskSlideOver({ token, task, onClose, queryKey }: TaskSlideOverProps) {
  const queryClient = useQueryClient()
  const isEditing = !!task

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      dueDate: task?.due_date ?? '',
      assignee: task?.assignee ?? '',
      category: task?.category ?? '',
      status: task?.status ?? 'pending',
    },
  })

  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description ?? '',
        dueDate: task.due_date ?? '',
        assignee: task.assignee ?? '',
        category: task.category ?? '',
        status: task.status ?? 'pending',
      })
    }
  }, [task, reset])

  const currentStatus = watch('status')
  const currentPriority = watch('priority' as keyof TaskForm)

  const { data: contractsData } = useQuery({
    queryKey: ['contracts-search', ''],
    queryFn: () => searchContract(token, ''),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  })
  const contracts = contractsData?.data ?? []

  const mutation = useMutation({
    mutationFn: (data: TaskForm) => {
      const body = buildTaskRequestBody({
        ...data,
        id: task?.id,
        project_id: task?.project_id,
      })
      return isEditing
        ? updateExistingTask(token, { task_id: task!.id, ...body })
        : insertNewTask(token, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      onClose()
    },
  })

  const statusOption = STATUS_OPTIONS.find((s) => s.value === currentStatus) ?? STATUS_OPTIONS[0]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-[480px] bg-white border-l border-slate-200 shadow-xl flex flex-col rounded-tl-[50px]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-slate-100">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-500">{isEditing ? 'Task Detail' : 'New Entry'}</p>
            <p className="font-medium text-slate-800 truncate">
              {isEditing ? task.title : 'Create Task'}
            </p>
          </div>
          {/* Status pill in header */}
          <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', statusOption.color)}>
            {statusOption.label}
          </span>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit((d) => mutation.mutateAsync(d))}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {/* Title — prominent */}
          <div>
            <input
              {...register('title')}
              className={cn(
                'w-full text-base font-medium text-slate-800 placeholder:text-slate-300',
                'border-0 border-b-2 rounded-none px-0 py-2 outline-none bg-transparent transition-colors',
                errors.title ? 'border-red-300' : 'border-slate-100 focus:border-[#6692C5]'
              )}
              placeholder="Task title…"
              autoFocus={!isEditing}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full text-sm text-slate-600 placeholder:text-slate-300 border-0 resize-none outline-none bg-transparent"
              placeholder="Add description…"
            />
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            {/* Status */}
            <FieldRow icon={<span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', {
              'bg-slate-400': currentStatus === 'pending',
              'bg-blue-400': currentStatus === 'in_progress',
              'bg-green-400': currentStatus === 'completed',
            })} />} label="Status">
              <select
                {...register('status')}
                className="text-sm text-slate-700 border-0 outline-none bg-transparent cursor-pointer"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FieldRow>

            {/* Due Date */}
            <FieldRow icon={<CalendarDays size={15} className="text-slate-400 flex-shrink-0" />} label="Due Date">
              <input
                {...register('dueDate')}
                type="date"
                className={cn(
                  'text-sm text-slate-700 border-0 outline-none bg-transparent cursor-pointer',
                  errors.dueDate && 'text-red-500'
                )}
              />
              {errors.dueDate && <p className="text-xs text-red-500">{errors.dueDate.message}</p>}
            </FieldRow>

            {/* Assignee */}
            <FieldRow icon={<User size={15} className="text-slate-400 flex-shrink-0" />} label="Assignee">
              <input
                {...register('assignee')}
                className={cn(
                  'flex-1 text-sm text-slate-700 border-0 outline-none bg-transparent placeholder:text-slate-300',
                  errors.assignee && 'placeholder:text-red-300'
                )}
                placeholder="Name or email"
              />
              {errors.assignee && <p className="text-xs text-red-500">{errors.assignee.message}</p>}
            </FieldRow>

            {/* Category */}
            <FieldRow icon={<Tag size={15} className="text-slate-400 flex-shrink-0" />} label="Category">
              <input
                {...register('category')}
                className={cn(
                  'flex-1 text-sm text-slate-700 border-0 outline-none bg-transparent placeholder:text-slate-300',
                  errors.category && 'placeholder:text-red-300'
                )}
                placeholder="e.g. Admin, Site"
              />
              {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
            </FieldRow>

            {/* Priority toggle */}
            <FieldRow icon={<Star size={15} className="text-slate-400 flex-shrink-0" />} label="Priority">
              <button
                type="button"
                onClick={() => setValue('priority' as keyof TaskForm, !currentPriority as never)}
                className={cn(
                  'flex items-center gap-1.5 text-sm transition-colors',
                  currentPriority ? 'text-yellow-500' : 'text-slate-400'
                )}
              >
                <Star
                  size={14}
                  className={currentPriority ? 'fill-yellow-400 text-yellow-400' : ''}
                />
                {currentPriority ? 'High priority' : 'No priority'}
              </button>
            </FieldRow>

            {/* Project */}
            {contracts.length > 0 && (
              <FieldRow icon={<Briefcase size={15} className="text-slate-400 flex-shrink-0" />} label="Project">
                <select
                  defaultValue={task?.project_id ?? ''}
                  className="flex-1 text-sm text-slate-700 border-0 outline-none bg-transparent cursor-pointer"
                >
                  <option value="">No project</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>{c.project_name}</option>
                  ))}
                </select>
              </FieldRow>
            )}
          </div>

          {mutation.isError && (
            <p className="text-xs text-red-500 text-center">
              Failed to {isEditing ? 'update' : 'create'} task. Please try again.
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#6692C5] hover:bg-[#4F7CB3] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {(isSubmitting || mutation.isPending) && <Loader2 size={14} className="animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

function FieldRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 min-h-[32px]">
      <div className="flex items-center gap-2 w-28 flex-shrink-0 pt-0.5">
        {icon}
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="flex-1 flex items-center flex-wrap gap-1">{children}</div>
    </div>
  )
}
