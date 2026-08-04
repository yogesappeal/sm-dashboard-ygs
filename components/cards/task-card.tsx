'use client'

import { useState, useRef, useEffect } from 'react'
import { Flag, CalendarDays, Loader2, ArrowUpRight, ChevronRight, ChevronDown } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTaskStatus, updateTaskPriority, updateExistingTask } from '@/lib/api'
import { TaskQuickAdd } from '@/components/cards/task-quick-add'
import { formatDate, toDateInputValue } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { TASK_CATEGORIES } from '@/lib/utils/tasks'
import type { TaskModel } from '@/lib/types'

interface TaskCardProps {
  task: TaskModel
  token: string
  queryKey: unknown[]
  onEdit: (task: TaskModel) => void
  subtasks?: TaskModel[]
}

const STATUS_CYCLE: Record<string, string> = {
  open: 'in_progress',
  in_progress: 'done',
  done: 'open',
}

type EditingField = 'title' | 'due_date' | 'assignee' | 'category' | null

// ─────────────────────────────────────────────────────────────────────────────
// Shared patch mutation builder — keeps full task body intact
// ─────────────────────────────────────────────────────────────────────────────
function usePatchMutation(token: string, task: TaskModel, queryKey: unknown[]) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<{ title: string; due_date: string; assignee: string; category: string }>) =>
      updateExistingTask(token, {
        task_id: task.id,
        title:       patch.title       ?? task.title,
        description: task.description  ?? '',
        due_date:    patch.due_date    ?? task.due_date,
        assignee:    patch.assignee    ?? task.assignee,
        category:    patch.category    ?? task.category,
        status:      task.status,
        priority:    task.priority,
        project_id:  task.project_id,
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// SubtaskRow — compact row for child tasks (no further nesting)
// ─────────────────────────────────────────────────────────────────────────────
function SubtaskRow({ task, token, queryKey, onEdit }: Omit<TaskCardProps, 'subtasks'>) {
  const queryClient = useQueryClient()
  const [optimisticStatus, setOptimisticStatus] = useState(task.status)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isEditingTitle) setEditTitle(task.title)
  }, [task.title, isEditingTitle])

  useEffect(() => {
    if (isEditingTitle) inputRef.current?.focus()
  }, [isEditingTitle])

  useEffect(() => {
    setOptimisticStatus(task.status)
  }, [task.status])

  const statusMutation = useMutation({
    mutationFn: (s: string) => updateTaskStatus(token, task.id, s),
    onMutate: (s) => setOptimisticStatus(s),
    onError: () => setOptimisticStatus(task.status),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  const patchMutation = usePatchMutation(token, task, queryKey)

  const handleTitleSave = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== task.title) patchMutation.mutate({ title: trimmed })
    else setEditTitle(task.title)
    setIsEditingTitle(false)
  }

  const isCompleted = optimisticStatus === 'done'

  return (
    <div className={cn(
      'flex items-center gap-2.5 px-4 py-2 border-b border-slate-100/80 last:border-0',
      'hover:bg-white/60 transition-colors group/sub',
      isCompleted && 'opacity-50',
    )}>
      {/* Subtask indent line */}
      <div className="w-4 flex-shrink-0 flex items-center justify-end">
        <div className="w-px h-4 bg-slate-200 rounded-full" />
      </div>

      {/* Checkbox */}
      <button
        onClick={() => statusMutation.mutate(STATUS_CYCLE[optimisticStatus] ?? 'open')}
        disabled={statusMutation.isPending}
        role="checkbox"
        aria-checked={isCompleted}
        className={cn(
          'w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors',
          isCompleted           ? 'bg-[#6692C5] border-[#6692C5]'
          : optimisticStatus === 'in_progress' ? 'border-blue-400 bg-blue-50'
          : 'border-slate-200 hover:border-[#6692C5]',
        )}
      >
        {statusMutation.isPending ? (
          <Loader2 size={8} className="animate-spin text-white" />
        ) : isCompleted ? (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : optimisticStatus === 'in_progress' ? (
          <span className="w-1 h-1 rounded-full bg-blue-400" />
        ) : null}
      </button>

      {/* Title */}
      <div className="flex-[10] min-w-0">
        {isEditingTitle ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleTitleSave() }
              if (e.key === 'Escape') { setEditTitle(task.title); setIsEditingTitle(false) }
            }}
            className="w-full text-xs font-medium text-slate-700 bg-white border border-[#6692C5] rounded px-1.5 py-0.5 outline-none ring-1 ring-[#6692C5]/20"
          />
        ) : (
          <p
            onClick={() => setIsEditingTitle(true)}
            className={cn(
              'text-xs font-medium text-slate-600 truncate cursor-text hover:text-[#6692C5] transition-colors w-fit max-w-full',
              isCompleted && 'line-through text-slate-400',
            )}
          >
            {editTitle}
          </p>
        )}
      </div>

      {/* Project Name — subtasks share the parent's project, left blank for column alignment */}
      <div className="flex-[2] hidden md:block" />

      {/* Category — subtasks have no category of their own */}
      <div className="flex-[2] hidden sm:block" />

      {/* Due date */}
      <div className="flex-[2] hidden sm:flex items-center">
        {task.due_date && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <CalendarDays size={10} />
            {formatDate(task.due_date)}
          </span>
        )}
      </div>

      {/* Priority — subtasks don't carry their own priority flag */}
      <div className="flex-[1] hidden sm:block" />

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity flex-shrink-0 w-12 justify-end">
        <button
          onClick={() => onEdit(task)}
          title="Open detail"
          className="p-1 rounded hover:bg-slate-100 transition-colors"
        >
          <ArrowUpRight size={12} className="text-slate-400" />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskCard — main row with inline editing + subtask expand/collapse
// ─────────────────────────────────────────────────────────────────────────────
export function TaskCard({ task, token, queryKey, onEdit, subtasks = [] }: TaskCardProps) {
  const queryClient = useQueryClient()
  const [optimisticStatus, setOptimisticStatus] = useState(task.status)
  const [optimisticPriority, setOptimisticPriority] = useState(task.priority)
  const [editingField, setEditingField] = useState<EditingField>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [editValues, setEditValues] = useState({
    title:    task.title,
    due_date: toDateInputValue(task.due_date),
    assignee: task.assignee  ?? '',
    category: task.category  ?? '',
  })
  const titleInputRef = useRef<HTMLInputElement>(null)
  const fieldInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editingField) {
      setEditValues({
        title:    task.title,
        due_date: toDateInputValue(task.due_date),
        assignee: task.assignee  ?? '',
        category: task.category  ?? '',
      })
    }
  }, [task.title, task.due_date, task.assignee, task.category, editingField])

  useEffect(() => {
    if (editingField === 'title') titleInputRef.current?.focus()
    else if (editingField) fieldInputRef.current?.focus()
  }, [editingField])

  useEffect(() => {
    setOptimisticStatus(task.status)
  }, [task.status])

  useEffect(() => {
    setOptimisticPriority(task.priority)
  }, [task.priority])

  const statusMutation = useMutation({
    mutationFn: (s: string) => updateTaskStatus(token, task.id, s),
    onMutate: (s) => setOptimisticStatus(s),
    onError: () => setOptimisticStatus(task.status),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  const priorityMutation = useMutation({
    mutationFn: (p: boolean) => updateTaskPriority(token, task.id, p),
    onMutate: (p) => setOptimisticPriority(p),
    onError: () => setOptimisticPriority(task.priority),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  const patchMutation = usePatchMutation(token, task, queryKey)

  const saveField = (field: Exclude<EditingField, null>) => {
    const next = editValues[field].trim()
    const prev = (task[field as keyof TaskModel] as string) ?? ''
    if (next !== prev) patchMutation.mutate({ [field]: next })
    else setEditValues((v) => ({ ...v, [field]: prev }))
    setEditingField(null)
  }

  const cancelField = (field: Exclude<EditingField, null>) => {
    setEditValues((v) => ({ ...v, [field]: (task[field as keyof TaskModel] as string) ?? '' }))
    setEditingField(null)
  }

  const handleKey = (e: React.KeyboardEvent, field: Exclude<EditingField, null>) => {
    if (e.key === 'Enter') { e.preventDefault(); saveField(field) }
    if (e.key === 'Escape') cancelField(field)
  }

  const handleDueDateChange = (val: string) => {
    setEditValues((v) => ({ ...v, due_date: val }))
    patchMutation.mutate({ due_date: val })
    setEditingField(null)
  }

  const handleCategoryChange = (val: string) => {
    setEditValues((v) => ({ ...v, category: val }))
    patchMutation.mutate({ category: val })
    setEditingField(null)
  }

  const isCompleted = optimisticStatus === 'done'
  const hasSubtasks = subtasks.length > 0

  return (
    <>
      {/* ── Main task row ──────────────────────────────────────── */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50/40 transition-colors group',
        isCompleted && 'opacity-60',
        isExpanded && 'border-b-0',
      )}>

        {/* Status checkbox */}
        <button
          onClick={() => statusMutation.mutate(STATUS_CYCLE[optimisticStatus] ?? 'open')}
          disabled={statusMutation.isPending}
          role="checkbox"
          aria-checked={isCompleted}
          className={cn(
            'w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors',
            isCompleted              ? 'bg-[#6692C5] border-[#6692C5]'
            : optimisticStatus === 'in_progress' ? 'border-blue-400 bg-blue-50'
            : 'border-slate-300 hover:border-[#6692C5]',
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

        {/* Title column */}
        <div className="flex-[10] min-w-0 flex items-center gap-2">
          {editingField === 'title' ? (
            <input
              ref={titleInputRef}
              value={editValues.title}
              onChange={(e) => setEditValues((v) => ({ ...v, title: e.target.value }))}
              onBlur={() => saveField('title')}
              onKeyDown={(e) => handleKey(e, 'title')}
              className="w-full min-w-0 text-sm font-medium text-slate-800 bg-white border border-[#6692C5] rounded-md px-2 py-0.5 outline-none ring-2 ring-[#6692C5]/20"
            />
          ) : (
            <p
              onClick={() => setEditingField('title')}
              title="Click to rename"
              className={cn(
                'min-w-0 flex-shrink text-sm text-slate-800 font-medium truncate cursor-text hover:text-[#6692C5] transition-colors',
                isCompleted && 'line-through text-slate-400',
                patchMutation.isPending && 'opacity-60',
              )}
            >
              {editValues.title}
            </p>
          )}

          {/* Subtask count badge (collapsed) */}
          {hasSubtasks && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#6692C5] transition-colors whitespace-nowrap flex-shrink-0"
            >
              <span className="w-3.5 h-3.5 rounded-sm bg-slate-100 flex items-center justify-center text-[10px] font-semibold">
                {subtasks.length}
              </span>
              subtask{subtasks.length > 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Project Name column */}
        <div className="flex-[2] hidden md:block min-w-0">
          {task.project_name && (
            <span className="text-xs text-slate-400 truncate block">{task.project_name}</span>
          )}
        </div>

        {/* Category column */}
        <div className="flex-[2] min-w-0">
          {editingField === 'category' ? (
            <select
              autoFocus
              value={editValues.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              onBlur={() => setEditingField(null)}
              className="text-xs px-2 py-0.5 border border-[#6692C5] rounded-full outline-none text-[#6692C5] ring-1 ring-[#6692C5]/20 bg-white cursor-pointer"
            >
              <option value="">Select…</option>
              {TASK_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : editValues.category ? (
            <button onClick={() => setEditingField('category')} className="text-xs px-2 py-0.5 rounded-full bg-[#6692C5]/10 text-[#6692C5] border border-[#6692C5]/20 hover:border-[#6692C5] transition-colors whitespace-nowrap">
              {editValues.category}
            </button>
          ) : (
            <button onClick={() => setEditingField('category')} className="text-xs text-slate-300 hover:text-[#6692C5] transition-colors opacity-0 group-hover:opacity-100 whitespace-nowrap">
              + Category
            </button>
          )}
        </div>

        {/* Due date column */}
        <div className="flex-[2] min-w-0">
          {editingField === 'due_date' ? (
            <input
              ref={fieldInputRef}
              type="date"
              value={editValues.due_date}
              onChange={(e) => handleDueDateChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') cancelField('due_date') }}
              onBlur={() => setEditingField(null)}
              className="text-xs border border-[#6692C5] rounded-md px-1.5 py-0.5 outline-none text-slate-700 ring-1 ring-[#6692C5]/20"
            />
          ) : editValues.due_date ? (
            <button onClick={() => setEditingField('due_date')} className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#6692C5] transition-colors whitespace-nowrap">
              <CalendarDays size={11} />
              {formatDate(editValues.due_date)}
            </button>
          ) : (
            <button onClick={() => setEditingField('due_date')} className="hidden sm:flex items-center gap-1 text-xs text-slate-300 hover:text-[#6692C5] transition-colors opacity-0 group-hover:opacity-100 whitespace-nowrap">
              <CalendarDays size={11} />
              Due date
            </button>
          )}
        </div>

        {/* Priority column */}
        <div className="flex-[1] flex justify-start">
          <button
            onClick={() => priorityMutation.mutate(!optimisticPriority)}
            disabled={priorityMutation.isPending}
            title={optimisticPriority ? 'Remove priority' : 'Mark as priority'}
            className="p-1 rounded hover:bg-slate-100 transition-colors"
          >
            <Flag size={14} className={cn(optimisticPriority ? 'fill-red-500 text-red-500' : 'text-slate-200')} />
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0 w-12 justify-end">
          {/* Expand subtasks */}
          <button
            onClick={() => setIsExpanded((v) => !v)}
            title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
            className="p-1 rounded hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
          >
            <ChevronRight
              size={14}
              className={cn('text-slate-400 transition-transform', isExpanded && 'rotate-90')}
            />
          </button>

          {/* Open slide-over */}
          <button
            onClick={() => onEdit(task)}
            title="Open detail"
            className="p-1 rounded hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
          >
            <ArrowUpRight size={14} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* ── Subtasks section ───────────────────────────────────── */}
      {isExpanded && (
        <div className="bg-slate-50/50 border-b border-slate-100">
          {subtasks.map((sub) => (
            <SubtaskRow
              key={sub.id}
              task={sub}
              token={token}
              queryKey={queryKey}
              onEdit={onEdit}
            />
          ))}
          <TaskQuickAdd
            token={token}
            status={task.status}
            queryKey={queryKey}
            parentTaskId={task.id}
            category={task.category}
            projectId={task.project_id}
            placeholder="Subtask title…"
          />
        </div>
      )}
    </>
  )
}

export function TaskTableHeader() {
  const label = (text: string, flex: string, hidden?: string) => (
    <span className={cn('text-xs font-semibold text-slate-500 uppercase tracking-wide', flex, hidden)}>
      {text}
    </span>
  )

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b-2 border-slate-200 bg-slate-50/50">
      <div className="w-5" />
      <span className="flex-[10] flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Task List
        <ChevronDown size={12} className="text-slate-400" />
      </span>
      {label('RA Number', 'flex-[2]', 'hidden md:block')}
      {label('Category', 'flex-[2]')}
      {label('Due Date', 'flex-[2]')}
      {label('Priority', 'flex-[1]')}
      <div className="w-12 flex-shrink-0" />
    </div>
  )
}
