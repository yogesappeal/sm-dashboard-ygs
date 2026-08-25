'use client'

import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

// Native <input type="date"> renders its own locale placeholder (e.g. dd/mm/yyyy)
// that can't be restyled via the `placeholder` attribute. When empty, we hide the
// native input (opacity-0, still clickable to open the picker) and show a styled
// "Choose date" overlay behind it instead.
export function DateInput({
  value,
  onChange,
  min,
  className,
  hasError,
}: {
  value: string
  onChange: (value: string) => void
  min?: string
  className?: string
  hasError?: boolean
}) {
  return (
    <div className={cn('relative', !value && 'rounded-lg focus-within:ring-2 focus-within:ring-[#6692C5]/30')}>
      {!value && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-between rounded-lg border px-3 py-2 pointer-events-none',
            hasError ? 'border-red-300' : 'border-slate-200'
          )}
        >
          <span className="text-sm text-slate-400">Choose date</span>
          <Calendar size={14} className="text-slate-400 flex-shrink-0" />
        </div>
      )}
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className={cn(className, !value && 'opacity-0')}
      />
    </div>
  )
}
