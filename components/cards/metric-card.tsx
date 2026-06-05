'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: number | string
  isActive?: boolean
  onClick?: () => void
  className?: string
}

export function MetricCard({ label, value, isActive = false, onClick, className }: MetricCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 min-w-0 rounded-xl border p-4 text-left transition-all duration-150',
        'hover:shadow-md hover:border-[#6692C5]/50',
        isActive
          ? 'bg-[#6692C5]/10 border-[#6692C5]/40 shadow-sm'
          : 'bg-white border-slate-200',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-slate-600 font-medium truncate">{label}</span>
        <CheckCircle2
          size={16}
          className={cn(
            'flex-shrink-0 transition-colors',
            isActive ? 'text-[#6692C5]' : 'text-slate-300'
          )}
        />
      </div>
      <p className={cn(
        'text-4xl font-bold leading-none transition-colors',
        isActive ? 'text-[#6692C5]' : 'text-[#6692C5]'
      )}>
        {value ?? '-'}
      </p>
    </button>
  )
}

interface OpsMetricCardProps {
  label: string
  value: number | string
  href: string
  className?: string
}

export function OpsMetricCard({ label, value, href, className }: OpsMetricCardProps) {
  return (
    <a
      href={href}
      className={cn(
        'flex-1 min-w-0 rounded-xl border border-slate-200 bg-white p-4 text-left',
        'hover:shadow-md hover:border-[#6692C5]/50 transition-all duration-150',
        className
      )}
    >
      <p className="text-sm text-slate-600 font-medium mb-3">{label}</p>
      <p className="text-4xl font-bold text-[#6692C5] leading-none">{value ?? '-'}</p>
    </a>
  )
}
