'use client'

import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { getContractDetailsFull } from '@/lib/api'
import type { ContractDetailsRaw } from '@/lib/types'
import { ContractLayout } from './_components/contract-layout'
import { STATIC_CONTRACT_ID } from './_components/constants'
import type { DummyContract, DummyCrew, DummyPod, DummyScope, DummyPO } from './_components/types'

function mapContract(raw: ContractDetailsRaw['contract']): DummyContract {
  return {
    raNumber: raw.client_ra_number,
    clientFullName: `${raw.client_first_name} ${raw.client_last_name}`.replace(/\s+/g, ' ').trim(),
    streetAddress: raw.street_address,
    suburb: raw.suburb,
    state: raw.state,
    builder: raw.builder,
    contractValue: raw.total_contract_value,
    status: raw.project_status,
    pif: raw.pif,
    notes: '',
    googleDriveUrl: raw.customer_folder_link || undefined,
  }
}

function mapPod(raw: ContractDetailsRaw['contract']): DummyPod {
  return {
    sm: raw.sm_name,
    pm: raw.project_manager,
    pa: raw.private_assessor,
    am: '',
  }
}

function mapCrew(raw: ContractDetailsRaw['crew']): DummyCrew[] {
  return raw.map(c => ({ name: c.user_name, role: c.role }))
}

function mapScopes(raw: ContractDetailsRaw['scopes']): DummyScope[] {
  return raw.map(s => ({
    scope_id: s.id,
    scope_number: s.scoping_number,
    scope_name: s.scoping_name,
    order_status: s.order_status,
    scope_details: s.items.map(item => ({
      building_id: item.building_id,
      building_name: item.building_name,
      status: item.status,
      // Real API only carries status at building level — propagate it down
      // to each trade so left-panel's derivePriorities (trade-level check) still works.
      trades: item.trades.map(t => ({ trade_id: t.trade_id, trade_name: t.trade_name, status: item.status })),
    })),
  }))
}

function mapPos(raw: ContractDetailsRaw['po_summary']): DummyPO[] {
  return [
    ...raw.supplier.data.map(p => ({ ...p, type: 'supplier' as const })),
    ...raw.subcontractor.data.map(p => ({ ...p, type: 'subcontractor' as const })),
  ]
}

export default function ContractPreviewPage() {
  const { token } = useAuthStore()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['contract-details-full', STATIC_CONTRACT_ID],
    queryFn: () => getContractDetailsFull(token!, STATIC_CONTRACT_ID),
    enabled: !!token,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100svh-64px)] -m-4 md:-m-6">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading contract...</span>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-[calc(100svh-64px)] -m-4 md:-m-6">
        <p className="text-sm text-slate-400">Failed to load contract.</p>
      </div>
    )
  }

  const contract = mapContract(data.contract)
  const pod = mapPod(data.contract)
  const crew = mapCrew(data.crew)
  const scopes = mapScopes(data.scopes)
  const pos = mapPos(data.po_summary)

  return (
    <div className="flex -m-4 md:-m-6 h-[calc(100svh-64px)] overflow-hidden">
      <ContractLayout contract={contract} crew={crew} pod={pod} scopes={scopes} pos={pos} />
    </div>
  )
}
