'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { getContractDetailsFull } from '@/lib/api'
import type { ContractDetailsRaw } from '@/lib/types'
import { ContractLayout } from '../_components/contract-layout'
import { ContractIdProvider } from '../_components/contract-id-context'
import type { Contract, Crew, Pod, Scope, PurchaseOrder, Project } from '../_components/types'

function mapContract(raw: ContractDetailsRaw['contract'], project: ContractDetailsRaw['projects']): Contract {
  return {
    raNumber: raw.client_ra_number,
    clientFullName: `${raw.client_first_name} ${raw.client_last_name}`.replace(/\s+/g, ' ').trim(),
    clientEmail: raw.client_email_address,
    clientMobile: raw.client_contact_mobile,
    streetAddress: raw.street_address,
    suburb: raw.suburb,
    state: raw.state,
    builder: raw.builder,
    contractValue: raw.total_contract_value,
    status: raw.project_status,
    pif: raw.pif,
    notes: '',
    googleDriveUrl: raw.customer_folder_link || undefined,
    // Planned start is a project-level field (see update-project-start-date), not on the contract itself.
    // Normalize to a plain YYYY-MM-DD — the backend may return a full ISO timestamp.
    plannedStart: project?.start_date ? project.start_date.slice(0, 10) : undefined,
  }
}

function mapPod(raw: ContractDetailsRaw['contract']): Pod {
  return {
    sm: raw.sm_name,
    pm: raw.project_manager,
    pa: raw.private_assessor,
    am: '',
  }
}

function mapCrew(raw: ContractDetailsRaw['crew']): Crew[] {
  return raw.map(c => ({ name: c.user_name, role: c.role, crewName: c.crew_name }))
}

function mapScopes(raw: ContractDetailsRaw['scopes']): Scope[] {
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

function mapPos(raw: ContractDetailsRaw['po_summary']): PurchaseOrder[] {
  return [
    ...raw.supplier.data.map(p => ({ ...p, type: 'supplier' as const })),
    ...raw.subcontractor.data.map(p => ({ ...p, type: 'subcontractor' as const })),
  ]
}

function mapProjects(raw: ContractDetailsRaw['project_list']): Project[] {
  return (raw ?? []).map(p => ({
    id: p.id,
    projectName: p.project_name,
  }))
}

export default function ContractPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { token } = useAuthStore()
  const searchParams = useSearchParams()
  // Omitted on initial load from the home page — only sent once the user
  // switches projects via the header dropdown (see ProjectSwitcher).
  const projectId = searchParams.get('project') ?? undefined

  const { data, isLoading, isError } = useQuery({
    queryKey: ['contract-details-full', id, projectId],
    queryFn: () => getContractDetailsFull(token!, id, projectId),
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

  const contract = mapContract(data.contract, data.projects)
  const pod = mapPod(data.contract)
  const crew = mapCrew(data.crew)
  const scopes = mapScopes(data.scopes)
  const pos = mapPos(data.po_summary)
  const projects = mapProjects(data.project_list)
  const currentProjectId = data.projects?.id || undefined

  return (
    <div className="flex -m-4 md:-m-6 h-[calc(100svh-64px)] overflow-hidden">
      <ContractIdProvider contractId={id}>
        <ContractLayout
          contract={contract}
          crew={crew}
          pod={pod}
          scopes={scopes}
          pos={pos}
          projects={projects}
          currentProjectId={currentProjectId}
        />
      </ContractIdProvider>
    </div>
  )
}
