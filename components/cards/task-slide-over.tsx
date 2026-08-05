'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Loader2, Flag, CalendarDays, Tag, Briefcase, Paperclip, History as HistoryIcon, ArrowLeft, ChevronRight, Trash2, RotateCcw } from 'lucide-react'
import { insertNewTask, updateExistingTask, updateTaskStatus, getDropdownContractScope, getTaskById, getTaskHistory } from '@/lib/api'
import { taskSchema } from '@/lib/utils/validation'
import { buildTaskRequestBody, TASK_CATEGORIES } from '@/lib/utils/tasks'
import { TaskQuickAdd } from '@/components/cards/task-quick-add'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/shared/toast'
import { messages } from '@/lib/messages'
import { cn, formatDate, relativeTime, toDateInputValue } from '@/lib/utils'
import type { TaskModel, TaskHistoryEntry } from '@/lib/types'
import type { z } from 'zod'

type TaskForm = z.infer<typeof taskSchema>

interface TaskSlideOverProps {
  token: string
  task?: TaskModel | null
  onClose: () => void
  queryKey: unknown[]
  subtasks?: TaskModel[]
  /** Present when this panel was opened by drilling into a subtask — lets the user step back up instead of closing entirely. */
  onBack?: () => void
  backLabel?: string
  /** Called when a subtask row is clicked, to drill into its own detail. */
  onOpenSubtask?: (task: TaskModel) => void
}

const STATUS_CYCLE: Record<string, string> = {
  open: 'in_progress',
  in_progress: 'done',
  done: 'open',
}

type DetailTab = 'subtask' | 'attachments' | 'history'

const DETAIL_TABS: { value: DetailTab; label: string }[] = [
  { value: 'subtask', label: 'Subtask' },
  { value: 'attachments', label: 'Attachments' },
  { value: 'history', label: 'History' },
]

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: 'bg-slate-100 text-slate-600' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-50 text-blue-600' },
  { value: 'done', label: 'Done', color: 'bg-green-50 text-green-600' },
]

const STATUS_WORD: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  done: 'Done',
}

const FIELD_LABELS: Record<string, string> = {
  due_date: 'due date',
  project_id: 'project',
  category: 'category',
  title: 'title',
  description: 'description',
  assignee: 'assignee',
}

const HISTORY_PAGE_SIZE = 10

export function TaskSlideOver({ token, task, onClose, queryKey, subtasks = [], onBack, backLabel, onOpenSubtask }: TaskSlideOverProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const isEditing = !!task
  const [activeTab, setActiveTab] = useState<DetailTab>('subtask')
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_SIZE)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    setHistoryLimit(HISTORY_PAGE_SIZE)
    // Subtasks can't have subtasks of their own — land on Attachments instead.
    setActiveTab(task?.parent_task_id ? 'attachments' : 'subtask')
  }, [task?.id, task?.parent_task_id])

  // Fetch the freshest copy of the task on open — the `task` prop is just
  // whatever was cached from the list fetch, which may be stale.
  const { data: taskDetail } = useQuery({
    queryKey: ['task', task?.id],
    queryFn: () => getTaskById(token, task!.id),
    enabled: !!token && isEditing,
    staleTime: 0,
  })

  const activeTask = taskDetail ?? task
  const isSubtask = !!activeTask?.parent_task_id
  const isDeleted = activeTask?.is_active === false

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      dueDate: toDateInputValue(task?.due_date),
      assignee: task?.assignee ?? '',
      category: task?.category ?? 'General',
      status: task?.status ?? 'open',
      priority: task?.priority ?? false,
      projectId: task?.project_id ?? '',
    },
  })

  useEffect(() => {
    if (activeTask) {
      reset({
        title: activeTask.title,
        description: activeTask.description ?? '',
        dueDate: toDateInputValue(activeTask.due_date),
        assignee: activeTask.assignee ?? '',
        category: activeTask.category ?? '',
        status: activeTask.status ?? 'open',
        priority: activeTask.priority ?? false,
        projectId: activeTask.project_id ?? '',
      })
    }
  }, [activeTask, reset])

  // History tab — fetched lazily, only once the tab is actually opened.
  const { data: history = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ['task-history', task?.id],
    queryFn: () => getTaskHistory(token, task!.id),
    enabled: !!token && isEditing && activeTab === 'history',
    staleTime: 30 * 1000,
  })

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
      const selectedContract = contracts.find((c) => c.id === data.projectId)
      const body = buildTaskRequestBody({
        ...data,
        id: task?.id,
        due_date: data.dueDate,
        project_id: data.projectId || undefined,
        project_name: selectedContract?.client_ra_number,
      })
      return isEditing
        ? updateExistingTask(token, { task_id: task!.id, ...body })
        : insertNewTask(token, body)
    },
    onSuccess: () => {
      toast(isEditing ? messages.task.updateSuccess : messages.task.createSuccess, 'success')
      // Drilled into from a parent task — return to it instead of closing the whole panel.
      if (onBack) onBack()
      else onClose()
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // Soft delete — keeps the row but flips is_active off, same request shape
  // as a normal edit save so no other field gets clobbered.
  const deleteMutation = useMutation({
    mutationFn: () => {
      const current = activeTask ?? task!
      const body = buildTaskRequestBody(current)
      return updateExistingTask(token, { task_id: current.id, ...body, is_active: false })
    },
    onSuccess: () => {
      toast(messages.task.deleteSuccess, 'success')
      setShowDeleteDialog(false)
      if (onBack) onBack()
      else onClose()
      queryClient.invalidateQueries({ queryKey })
    },
    onError: () => {
      toast(messages.task.deleteError, 'error')
    },
  })

  // Restore — flips is_active back on. No confirmation needed since it's non-destructive.
  const restoreMutation = useMutation({
    mutationFn: () => {
      const current = activeTask ?? task!
      const body = buildTaskRequestBody(current)
      return updateExistingTask(token, { task_id: current.id, ...body, is_active: true })
    },
    onSuccess: () => {
      toast(messages.task.restoreSuccess, 'success')
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['task', task?.id] })
    },
    onError: () => {
      toast(messages.task.restoreError, 'error')
    },
  })

  const statusOption = STATUS_OPTIONS.find((s) => s.value === currentStatus) ?? STATUS_OPTIONS[0]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-[480px] bg-white border-l border-slate-200 shadow-xl flex flex-col rounded-tl-[50px]">
        {/* Breadcrumb — only shown when this panel was opened by drilling into a subtask */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-6 pt-5 text-xs font-medium text-slate-400 hover:text-[#6692C5] transition-colors"
          >
            <ArrowLeft size={12} />
            <span className="truncate">Back to {backLabel ?? 'parent task'}</span>
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-slate-100">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-500">{isEditing ? 'Task Detail' : 'New Entry'}</p>
            <p className="font-medium text-slate-800 truncate">
              {isEditing ? activeTask?.title : 'Create Task'}
            </p>
          </div>
          {/* Status pill in header */}
          <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', statusOption.color)}>
            {statusOption.label}
          </span>
          {isEditing && (
            isDeleted ? (
              <button
                type="button"
                onClick={() => restoreMutation.mutate()}
                disabled={restoreMutation.isPending}
                title="Restore task"
                className="text-slate-400 hover:text-green-600 transition-colors disabled:opacity-50"
              >
                {restoreMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                title="Delete task"
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            )
          )}
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit((d) => mutation.mutateAsync(d))}
          className="flex-1 flex flex-col overflow-hidden"
        >
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
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

            {/* Category — subtasks inherit this from their parent, so it's not editable here */}
            {!isSubtask && (
              <FieldRow icon={<Tag size={15} className="text-slate-400 flex-shrink-0" />} label="Category">
                <select
                  {...register('category')}
                  className={cn(
                    'flex-1 text-sm text-slate-700 border-0 outline-none bg-transparent cursor-pointer',
                    !watch('category') && 'text-slate-300'
                  )}
                >
                  <option value="">Select category…</option>
                  {TASK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
              </FieldRow>
            )}

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

            {/* Project — subtasks inherit this from their parent, so it's not editable here */}
            {!isSubtask && contracts.length > 0 && (
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
          {isEditing && activeTask && (
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-400">
              {[
                activeTask.due_date && `Due ${formatDate(activeTask.due_date)}`,
                `Created ${formatDate(activeTask.created_at)}`,
                activeTask.updated_at && activeTask.updated_at !== activeTask.created_at && `Updated ${formatDate(activeTask.updated_at)}`,
              ].filter(Boolean).join(' · ')}
            </div>
          )}

          {/* Subtask / Attachments / History */}
          {isEditing && task && (
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-5 border-b border-slate-100">
                {DETAIL_TABS.filter((t) => t.value !== 'subtask' || !isSubtask).map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setActiveTab(t.value)}
                    className={cn(
                      'pb-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                      activeTab === t.value
                        ? 'text-[#6692C5] border-[#6692C5]'
                        : 'text-slate-400 border-transparent hover:text-slate-600'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="pt-3">
                {activeTab === 'subtask' && !isSubtask && (
                  <div className="-mx-6">
                    {subtasks.length === 0 ? (
                      <p className="px-6 py-3 text-xs text-slate-400">No subtasks yet</p>
                    ) : (
                      subtasks.map((sub) => (
                        <SubtaskListItem key={sub.id} task={sub} token={token} queryKey={queryKey} onOpen={onOpenSubtask} />
                      ))
                    )}
                    <TaskQuickAdd
                      token={token}
                      status={task.status}
                      queryKey={queryKey}
                      parentTaskId={task.id}
                      category={activeTask?.category}
                      projectId={activeTask?.project_id}
                      projectName={activeTask?.project_name}
                      placeholder="Subtask title…"
                    />
                  </div>
                )}

                {activeTab === 'attachments' && (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                    <Paperclip size={20} className="text-slate-300" />
                    <p className="text-xs text-slate-400">Attachments aren&apos;t available yet</p>
                  </div>
                )}

                {activeTab === 'history' && (
                  isHistoryLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={16} className="animate-spin text-slate-300" />
                    </div>
                  ) : history.length === 0 ? (
                    <p className="px-0 py-3 text-xs text-slate-400">No history yet</p>
                  ) : (
                    <div className="-mx-6">
                      {history.slice(0, historyLimit).map((entry) => (
                        <HistoryItem key={entry.id} entry={entry} />
                      ))}
                      {history.length > historyLimit && (
                        <button
                          type="button"
                          onClick={() => setHistoryLimit((n) => n + HISTORY_PAGE_SIZE)}
                          className="w-full text-center py-2.5 text-xs font-medium text-[#6692C5] hover:bg-[#6692C5]/5 transition-colors"
                        >
                          Load more
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {mutation.isError && (
            <p className="text-xs text-red-500 text-center">
              {isEditing ? messages.task.updateError : messages.task.createError}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 flex gap-2 px-6 py-4 border-t border-slate-100 bg-white">
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
            onClick={onBack ?? onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
        </form>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete this task?"
        description="This will remove the task from your list. This action can't be undone from here."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </>
  )
}

function SubtaskListItem({ task, token, queryKey, onOpen }: { task: TaskModel; token: string; queryKey: unknown[]; onOpen?: (task: TaskModel) => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [optimisticStatus, setOptimisticStatus] = useState(task.status)

  useEffect(() => {
    setOptimisticStatus(task.status)
  }, [task.status])

  const statusMutation = useMutation({
    mutationFn: (s: string) => updateTaskStatus(token, task.id, s),
    onMutate: (s) => setOptimisticStatus(s),
    onError: () => {
      setOptimisticStatus(task.status)
      toast(messages.task.updateError, 'error')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  const isCompleted = optimisticStatus === 'done'

  return (
    <div className="flex items-start gap-3 px-6 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
      <button
        onClick={() => statusMutation.mutate(STATUS_CYCLE[optimisticStatus] ?? 'open')}
        disabled={statusMutation.isPending}
        role="checkbox"
        aria-checked={isCompleted}
        className={cn(
          'mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors',
          isCompleted            ? 'bg-[#6692C5] border-[#6692C5]'
          : optimisticStatus === 'in_progress' ? 'border-blue-400 bg-blue-50'
          : 'border-slate-300 hover:border-[#6692C5]',
        )}
      >
        {isCompleted ? (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : optimisticStatus === 'in_progress' ? (
          <span className="w-1 h-1 rounded-full bg-blue-400" />
        ) : null}
      </button>

      <div
        className={cn('flex-1 min-w-0', onOpen && 'cursor-pointer')}
        onClick={onOpen ? () => onOpen(task) : undefined}
      >
        <p className={cn('text-sm text-slate-700 truncate', isCompleted && 'line-through text-slate-400', onOpen && 'hover:text-[#6692C5] transition-colors')}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
            <span className="font-medium text-slate-500">Description: </span>
            {task.description}
          </p>
        )}
      </div>

      {onOpen && <ChevronRight size={14} className="text-slate-300 flex-shrink-0 mt-0.5" />}
    </div>
  )
}

function describeHistoryEntry(entry: TaskHistoryEntry): string {
  // Priority is stored as a true/false string — show it as plain language
  // instead of exposing the raw boolean to the user.
  if (entry.field_name === 'priority') {
    return entry.new_value === 'true' ? 'marked this task as priority' : 'removed the priority flag'
  }

  if (entry.field_name === 'status') {
    const from = entry.old_value ? STATUS_WORD[entry.old_value] ?? entry.old_value : null
    const to = entry.new_value ? STATUS_WORD[entry.new_value] ?? entry.new_value : null
    if (from && to) return `changed status from ${from} to ${to}`
    if (to) return `changed status to ${to}`
  }

  if (entry.note) return entry.note

  if (entry.field_name) {
    const label = FIELD_LABELS[entry.field_name] ?? entry.field_name.replace(/_/g, ' ')
    if (entry.old_value && entry.new_value) return `changed the ${label} from "${entry.old_value}" to "${entry.new_value}"`
    if (entry.new_value) return `set the ${label} to "${entry.new_value}"`
    return `updated the ${label}`
  }

  return entry.action.replace(/_/g, ' ')
}

function HistoryItem({ entry }: { entry: TaskHistoryEntry }) {
  return (
    <div className="flex items-start gap-2.5 px-6 py-2.5 border-b border-slate-50 last:border-0">
      <HistoryIcon size={13} className="text-slate-300 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-600">
          <span className="font-medium text-slate-700">{entry.actor_name ?? 'System'}</span>{' '}
          {describeHistoryEntry(entry)}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">{relativeTime(entry.created_at)}</p>
      </div>
    </div>
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
