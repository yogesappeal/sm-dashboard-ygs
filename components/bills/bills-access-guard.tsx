'use client'

import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { usePermission } from '@/lib/hooks/use-permission'

// Every Bills route renders behind this. Bills is Site Manager-only — this
// enforces that at the route level (direct URL access included), not just
// by hiding the sidebar entry. See lib/permissions.ts `bill:access`.
export function BillsAccessGuard({ children }: { children: ReactNode }) {
  const canAccessBills = usePermission('bill:access')

  if (!canAccessBills) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Lock className="text-slate-300" size={28} />
        </div>
        <p className="text-slate-700 font-medium">You don&apos;t have access to Bills</p>
        <p className="text-slate-400 text-sm mt-1">Contact an admin if you think this is a mistake</p>
      </div>
    )
  }

  return <>{children}</>
}
