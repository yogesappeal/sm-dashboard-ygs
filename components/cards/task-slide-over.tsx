'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Loader2, Flag, CalendarDays, Tag, Briefcase } from 'lucide-react'
import { insertNewTask, updateExistingTask, getDropdownContractScope } from '@/lib/api'
import { taskSchema } from '@/lib/utils/validation'
import { buildTaskRequestBody } from '@/lib/utils/tasks'
import { useToast } from '@/components/shared/toast'
import { messages } from '@/lib/messages'
import { cn, formatDate } from '@/lib/utils'
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
  const toast = useToast()
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
      priority: task?.priority ?? false,
      projectId: task?.project_id ?? '',
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
        priority: task.priority ?? false,
        projectId: task.project_id ?? '',
      })
    }
  }, [task, reset])

  const currentStatus = watch('status')
  const currentPriority = watch('priority')

  // Dropdown for the Project field — same source used for the PO/scope
  // contract pickers. searchContract is a text-search endpoint (needs a
  // typed query) and returns nothing for an empty string, which is why this
  // dropdown used to never render any options.
  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts-dropdown-scope'],
    queryFn: () => getDropdownContractScope(token),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  })

  const mutation = useMutation({
    mutationFn: (data: TaskForm) => {
      const body = buildTaskRequestBody({
        ...data,
        id: task?.id,
        due_date: data.dueDate,
        project_id: data.projectId || undefined,
      })
      return isEditing
        ? updateExistingTask(token, { task_id: task!.id, ...body })
        : insertNewTask(token, body)
    },
    onSuccess: () => {
      toast(isEditing ? messages.task.updateSuccess : messages.task.createSuccess, 'success')
      onClose()
      queryClient.invalidateQueries({ queryKey })
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
          {/* Hidden — assignee no longer editable from this form, but its
              existing value must still round-trip on save so editing a task
              doesn't silently wipe out who it's assigned to. */}
          <input type="hidden" {...register('assignee')} />

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              {...register('title')}
              className={fieldCls(!!errors.title)}
              placeholder="Task title…"
              autoFocus={!isEditing}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className={cn(fieldCls(false), 'resize-none')}
              placeholder="Add description…"
            />
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setValue('status', o.value)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                      currentStatus === o.value
                        ? cn(o.color, 'border-transparent')
                        : 'border-slate-200 text-slate-400 hover:border-slate-300'
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <FieldRow icon={<CalendarDays size={15} className="text-slate-400 flex-shrink-0" />} label="Due Date">
              <input
                {...register('dueDate')}
                type="date"
                className={cn(fieldCls(!!errors.dueDate), 'w-auto cursor-pointer')}
              />
              {errors.dueDate && <p className="text-xs text-red-500">{errors.dueDate.message}</p>}
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

            {/* Priority flag */}
            <FieldRow icon={<Flag size={15} className={currentPriority ? 'text-red-500 fill-red-500' : 'text-slate-400 flex-shrink-0'} />} label="Priority">
              <button
                type="button"
                onClick={() => setValue('priority', !currentPriority)}
                className={cn(
                  'flex items-center gap-1.5 text-sm transition-colors',
                  currentPriority ? 'text-red-500 font-medium' : 'text-slate-400'
                )}
              >
                {currentPriority ? 'Flagged as priority' : 'Flag as priority'}
              </button>
            </FieldRow>

            {/* Project */}
            {contracts.length > 0 && (
              <FieldRow icon={<Briefcase size={15} className="text-slate-400 flex-shrink-0" />} label="Project">
                <select
                  {...register('projectId')}
                  className="flex-1 text-sm text-slate-700 border-0 outline-none bg-transparent cursor-pointer"
                >
                  <option value="">No project</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>{c.dropdown_label}</option>
                  ))}
                </select>
              </FieldRow>
            )}
          </div>

          {/* Task meta — created/updated/due info, only meaningful once the task exists */}
          {isEditing && task && (
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-400">
              {[
                task.due_date && `Due ${formatDate(task.due_date)}`,
                `Created ${formatDate(task.created_at)}`,
                task.updated_at && task.updated_at !== task.created_at && `Updated ${formatDate(task.updated_at)}`,
              ].filter(Boolean).join(' · ')}
            </div>
          )}

          {mutation.isError && (
            <p className="text-xs text-red-500 text-center">
              {isEditing ? messages.task.updateError : messages.task.createError}
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

function fieldCls(hasError: boolean) {
  return cn(
    'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors',
    'focus:ring-2 focus:ring-[#6692C5]/30 focus:border-[#6692C5]',
    hasError ? 'border-red-300' : 'border-slate-200'
  )
}
