'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { insertNewTask } from '@/lib/api'
import { cn } from '@/lib/utils'

interface TaskQuickAddProps {
  token: string
  status: string
  queryKey: unknown[]
  parentTaskId?: string
  placeholder?: string
}

export function TaskQuickAdd({ token, status, queryKey, parentTaskId, placeholder = 'Task title…' }: TaskQuickAddProps) {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAdding) inputRef.current?.focus()
  }, [isAdding])

  const mutation = useMutation({
    mutationFn: (taskTitle: string) =>
      insertNewTask(token, {
        title: taskTitle,
        status,
        description: '',
        due_date: null,
        assignee: '',
        category: '',
        priority: false,
        project_id: null,
        parent_task_id: parentTaskId ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setTitle('')
      // tetap buka supaya user bisa langsung tambah task berikutnya
      inputRef.current?.focus()
    },
  })

  const handleSave = () => {
    const trimmed = title.trim()
    if (!trimmed) { setIsAdding(false); return }
    mutation.mutate(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
    if (e.key === 'Escape') { setTitle(''); setIsAdding(false) }
  }

  const handleBlur = () => {
    // sedikit delay supaya mutation.mutate punya waktu jalan sebelum blur collapse
    setTimeout(() => {
      if (!mutation.isPending) { setTitle(''); setIsAdding(false) }
    }, 150)
  }

  const addLabel = parentTaskId ? 'Add subtask' : 'Add task'

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-[#6692C5] hover:bg-[#6692C5]/5 transition-colors border-t border-slate-100"
      >
        <Plus size={14} className="flex-shrink-0" />
        <span className="text-xs font-medium">{addLabel}</span>
      </button>
    )
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-t border-[#6692C5]/20 bg-[#6692C5]/5">
      {/* Dimmed checkbox placeholder */}
      <div className="mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 border-slate-200 bg-white" />

      {/* Input area */}
      <div className="flex-1 min-w-0">
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full text-sm font-medium text-slate-800 placeholder:text-slate-300 bg-transparent outline-none"
        />
        <p className="text-xs text-slate-300 mt-0.5">
          ↵ to save · Esc to cancel
        </p>
      </div>

      {/* Loading / save indicator */}
      <div className={cn('flex-shrink-0 mt-0.5', !mutation.isPending && 'invisible')}>
        <Loader2 size={14} className="animate-spin text-[#6692C5]" />
      </div>
    </div>
  )
}
