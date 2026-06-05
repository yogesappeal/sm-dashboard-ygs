'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Loader2 } from 'lucide-react'
import { insertNewTask, updateExistingTask, searchContract } from '@/lib/api'
import { taskSchema } from '@/lib/utils/validation'
import { buildTaskRequestBody } from '@/lib/utils/tasks'
import { cn } from '@/lib/utils'
import type { TaskModel } from '@/lib/types'
import type { z } from 'zod'

type TaskForm = z.infer<typeof taskSchema>

interface TaskCreateEditModalProps {
  token: string
  task?: TaskModel | null
  onClose: () => void
  queryKey: unknown[]
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

export function TaskCreateEditModal({ token, task, onClose, queryKey }: TaskCreateEditModalProps) {
  const queryClient = useQueryClient()
  const isEditing = !!task

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TaskForm>({
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

  // Load contracts for project linking
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">
            {isEditing ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit((d) => mutation.mutateAsync(d))}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          <Field label="Title *" error={errors.title?.message}>
            <input
              {...register('title')}
              className={inputCls(!!errors.title)}
              placeholder="Task title"
              autoFocus
            />
          </Field>

          <Field label="Description" error={errors.description?.message}>
            <textarea
              {...register('description')}
              rows={2}
              className={inputCls(false)}
              placeholder="Optional description"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Due Date *" error={errors.dueDate?.message}>
              <input
                {...register('dueDate')}
                type="date"
                className={inputCls(!!errors.dueDate)}
              />
            </Field>
            <Field label="Status *" error={errors.status?.message}>
              <select {...register('status')} className={inputCls(!!errors.status)}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Assignee *" error={errors.assignee?.message}>
              <input
                {...register('assignee')}
                className={inputCls(!!errors.assignee)}
                placeholder="Name or email"
              />
            </Field>
            <Field label="Category *" error={errors.category?.message}>
              <input
                {...register('category')}
                className={inputCls(!!errors.category)}
                placeholder="e.g. Admin, Site"
              />
            </Field>
          </div>

          {contracts.length > 0 && (
            <Field label="Project (optional)" error={undefined}>
              <select
                defaultValue={task?.project_id ?? ''}
                onChange={(e) => {/* projectId handled in buildTaskRequestBody */}}
                className={inputCls(false)}
              >
                <option value="">No project</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.project_name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {mutation.isError && (
            <p className="text-xs text-red-500 text-center">
              Failed to {isEditing ? 'update' : 'create'} task. Please try again.
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit((d) => mutation.mutateAsync(d))}
            disabled={isSubmitting || mutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#6692C5] hover:bg-[#4F7CB3] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {(isSubmitting || mutation.isPending) && <Loader2 size={14} className="animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function inputCls(hasError: boolean) {
  return cn(
    'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors',
    'focus:ring-2 focus:ring-[#6692C5]/30 focus:border-[#6692C5]',
    hasError ? 'border-red-300' : 'border-slate-200'
  )
}
