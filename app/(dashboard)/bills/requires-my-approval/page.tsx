'use client'

import { BillsAccessGuard } from '@/components/bills/bills-access-guard'
import { BillsWorkspace } from '@/components/bills/bills-workspace'

export default function RequiresMyApprovalPage() {
  return (
    <BillsAccessGuard>
      <BillsWorkspace categoryFilter="approval" />
    </BillsAccessGuard>
  )
}
