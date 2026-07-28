'use client'

import { useRef } from 'react'
import { List } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BulletNotesInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
}

// Plain-text notes input with a bullet-insert button. Deliberately plain text
// rather than HTML: each note becomes a `description` field in a structured
// order_details item (see buildOrderDetailsItems in lib/utils/scope.ts), and
// HTML there would need sanitizing everywhere it's later rendered. A "- "
// line prefix reads as a bullet without that risk.
export function BulletNotesInput({ value, onChange, placeholder, rows = 3, className }: BulletNotesInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const insertBullet = () => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length

    // No selection — just insert a new bullet line at the cursor.
    if (start === end) {
      const atLineStart = start === 0 || value[start - 1] === '\n'
      const prefix = atLineStart ? '- ' : '\n- '
      const next = value.slice(0, start) + prefix + value.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        const pos = start + prefix.length
        el.setSelectionRange(pos, pos)
        el.focus()
      })
      return
    }

    // Text selected — toggle the bullet on every line the selection touches
    // instead of replacing the selected text with the bullet marker: if every
    // line already has one, strip it; otherwise add it to the lines missing it.
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const lineEnd = value.indexOf('\n', end) === -1 ? value.length : value.indexOf('\n', end)
    const block = value.slice(lineStart, lineEnd)
    const lines = block.split('\n')
    const allBulleted = lines.every((line) => line.startsWith('- ') || line.trim() === '')
    const prefixed = lines
      .map((line) => {
        if (allBulleted) return line.startsWith('- ') ? line.slice(2) : line
        return line.startsWith('- ') ? line : `- ${line}`
      })
      .join('\n')
    const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd)
    onChange(next)
    requestAnimationFrame(() => {
      el.setSelectionRange(lineStart, lineStart + prefixed.length)
      el.focus()
    })
  }

  // Enter on a bullet line continues the list with a new "- " line; Enter on an
  // already-empty bullet line ends it instead, matching how markdown/notes
  // editors handle list continuation.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') return
    const el = e.currentTarget
    const start = el.selectionStart
    const end = el.selectionEnd
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const currentLine = value.slice(lineStart, start)
    const match = currentLine.match(/^(\s*)-\s/)
    if (!match) return

    e.preventDefault()
    const bulletPrefix = match[0]
    const lineContent = currentLine.slice(bulletPrefix.length)

    if (lineContent.trim() === '') {
      const next = value.slice(0, lineStart) + value.slice(start)
      onChange(next)
      requestAnimationFrame(() => el.setSelectionRange(lineStart, lineStart))
      return
    }

    const insertion = '\n' + bulletPrefix
    const next = value.slice(0, start) + insertion + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      const pos = start + insertion.length
      el.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className={cn('border border-slate-200 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-[#6692C5]/40 focus-within:border-[#6692C5]', className)}>
      <div className="flex items-center px-2 py-1 border-b border-slate-100 bg-slate-50">
        <button
          type="button"
          title="Bullet point"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertBullet}
          className="p-1 rounded text-slate-500 hover:bg-slate-200/70 hover:text-slate-700 transition-colors"
        >
          <List size={12} />
        </button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        className="w-full text-xs px-3 py-2 focus:outline-none resize-y placeholder:text-slate-300"
      />
    </div>
  )
}
