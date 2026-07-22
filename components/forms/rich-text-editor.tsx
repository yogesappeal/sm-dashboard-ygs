'use client'

import { useEffect, useRef } from 'react'
import { Bold, Italic, List, ListOrdered } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

// Lightweight rich-text input built on contentEditable + document.execCommand —
// no editor library. Good enough for bold/italic/lists; doesn't aim to replace
// a full editor (no proper undo stack, cross-browser HTML output can vary
// slightly). Value is plain HTML, stored as-is in order_details.
export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  // contentEditable owns its own DOM once mounted — only push `value` in when
  // it actually differs from what's on screen (e.g. edit-mode prefill arriving
  // after mount), never on every keystroke, or the cursor would jump to the end.
  const lastValue = useRef(value)

  useEffect(() => {
    if (!ref.current) return
    if (value !== lastValue.current && value !== ref.current.innerHTML) {
      ref.current.innerHTML = value
      lastValue.current = value
    }
  }, [value])

  function exec(command: string) {
    document.execCommand(command)
    ref.current?.focus()
    handleInput()
  }

  function handleInput() {
    if (!ref.current) return
    const html = ref.current.innerHTML
    lastValue.current = html
    onChange(html)
  }

  const isEmpty = !value || value === '<br>'

  return (
    <div className={cn('border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#6692C5]/30', className)}>
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-100 bg-slate-50">
        <ToolbarButton icon={Bold} label="Bold" onClick={() => exec('bold')} />
        <ToolbarButton icon={Italic} label="Italic" onClick={() => exec('italic')} />
        <ToolbarButton icon={List} label="Bullet list" onClick={() => exec('insertUnorderedList')} />
        <ToolbarButton icon={ListOrdered} label="Numbered list" onClick={() => exec('insertOrderedList')} />
      </div>
      <div className="relative">
        {isEmpty && placeholder && (
          <span className="pointer-events-none absolute top-2 left-3 text-sm text-slate-400">
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          contentEditable
          onInput={handleInput}
          suppressContentEditableWarning
          className={cn(
            'w-full text-sm px-3 py-2 min-h-[120px] focus:outline-none',
            '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5',
          )}
        />
      </div>
    </div>
  )
}

function ToolbarButton({ icon: Icon, label, onClick }: { icon: typeof Bold; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      // mousedown (not click) so the editor's selection isn't lost to focus
      // change before execCommand runs.
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className="p-1.5 rounded text-slate-500 hover:bg-slate-200/70 hover:text-slate-700 transition-colors"
    >
      <Icon size={14} />
    </button>
  )
}
