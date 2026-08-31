'use client'

import { BillsAccessGuard } from '@/components/bills/bills-access-guard'
import { BillsWorkspace } from '@/components/bills/bills-workspace'

export default function AllBillsPage() {
  return (
    <BillsAccessGuard>
      <BillsWorkspace scope="all" />
    </BillsAccessGuard>
  )
}
