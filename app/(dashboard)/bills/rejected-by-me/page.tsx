'use client'

import { BillsAccessGuard } from '@/components/bills/bills-access-guard'
import { BillsWorkspace } from '@/components/bills/bills-workspace'

export default function RejectedByMeBillsPage() {
  return (
    <BillsAccessGuard>
      <BillsWorkspace scope="rejected_by_me" />
    </BillsAccessGuard>
  )
}
