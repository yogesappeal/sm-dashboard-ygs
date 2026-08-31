'use client'

import { BillsAccessGuard } from '@/components/bills/bills-access-guard'
import { BillsWorkspace } from '@/components/bills/bills-workspace'

export default function ApprovedByMeBillsPage() {
  return (
    <BillsAccessGuard>
      <BillsWorkspace scope="approved_by_me" />
    </BillsAccessGuard>
  )
}
