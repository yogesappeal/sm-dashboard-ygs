'use client'

import { BillsWorkspace } from '@/components/bills/bills-workspace'

export default function RequiresMyApprovalPage() {
  return <BillsWorkspace categoryFilter="approval" />
}
