import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded bg-slate-200', className)} />
  )
}

export function MetricsSkeleton() {
  return (
    <div className="flex gap-3 w-full h-[130px]">
      <Skeleton className="flex-1 h-full rounded-lg" />
      <Skeleton className="flex-1 h-full rounded-lg" />
      <Skeleton className="flex-1 h-full rounded-lg" />
      <Skeleton className="flex-1 h-full rounded-lg" />
    </div>
  )
}

export function TableRowSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="flex-[11] h-4 rounded" />
          <Skeleton className="flex-[3] h-4 rounded" />
          <Skeleton className="flex-[2] h-4 rounded" />
          <Skeleton className="flex-[3] h-4 rounded" />
          <Skeleton className="flex-[2] h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}
