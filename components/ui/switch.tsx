'use client'

import { cn } from '@/lib/utils'

export function Switch({
  checked,
  onChange,
  activeColor = 'bg-[#6692C5]',
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  activeColor?: string
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full p-0.5 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30',
        checked ? activeColor : 'bg-slate-200'
      )}
    >
      {label && <span className="sr-only">{label}</span>}
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  )
}
