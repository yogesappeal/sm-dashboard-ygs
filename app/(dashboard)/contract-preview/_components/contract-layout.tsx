'use client'

import { useReducer, useRef, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Calendar, ChevronDown, Clock, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { canvasReducer, initialCanvas } from './canvas-state'
import { LeftPanel } from './left-panel'
import { CenterPanel } from './center-panel'
import { RightPanel } from './right-panel'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAuthStore } from '@/lib/store'
import { getScopeDetailByContractId, updateScopeItems, updateContractPlannedStart } from '@/lib/api'
import { useContractId } from './contract-id-context'
import type { DummyContract, DummyCrew, DummyPod, DummyScope, DummyPO, DummyProject } from './types'

interface ContractLayoutProps {
  contract: DummyContract
  crew: DummyCrew[]
  pod: DummyPod
  scopes: DummyScope[]
  pos: DummyPO[]
  projects: DummyProject[]
  currentProjectId?: string
}

function formatPlannedDate(iso: string) {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(iso + 'T00:00:00'))
}

function daysUntil(iso: string) {
  const target = new Date(iso + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(a + 'T00:00:00').getTime() - new Date(b + 'T00:00:00').getTime()) / 86400000)
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

interface ImpactedTrade {
  tradeId: string
  tradeName: string
  newDate: string
  overdue: boolean
}

function PlannedStartField({ contractId, value }: { contractId: string; value: string }) {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(value)
  const [reviewing, setReviewing] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Shares the cache with RightPanel's scope query — no extra fetch if it's already loaded.
  const { data: scopeData } = useQuery({
    queryKey: ['scope-by-contract', contractId],
    queryFn: () => getScopeDetailByContractId(token!, contractId),
    enabled: !!token,
  })

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setReviewing(false)
        setPending(value)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open, value])

  const deltaDays = pending && value ? daysBetween(pending, value) : 0
  const today0 = new Date().setHours(0, 0, 0, 0)

  const impacted: ImpactedTrade[] = deltaDays === 0
    ? []
    : (scopeData?.scope_details.flatMap(b => b.trades) ?? [])
        .filter((t): t is typeof t & { planned_po_date: string } => !!t.planned_po_date)
        .map(t => {
          const newDate = addDays(t.planned_po_date, deltaDays)
          return {
            tradeId: t.trade_id,
            tradeName: t.trade_name,
            newDate,
            overdue: new Date(newDate + 'T00:00:00').getTime() < today0,
          }
        })
  const overdueCount = impacted.filter(t => t.overdue).length

  const mutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        updateContractPlannedStart(token!, { contract_id: contractId, planned_start_date: pending || null }),
        impacted.length > 0 && scopeData
          ? updateScopeItems(token!, {
              scope_id: scopeData.scope_id,
              trades: impacted.map(t => ({ trade_id: t.tradeId, planned_po_date: t.newDate })),
            })
          : Promise.resolve(null),
      ])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-details-full', contractId] })
      queryClient.invalidateQueries({ queryKey: ['scope-by-contract', contractId] })
      setOpen(false)
      setReviewing(false)
    },
  })

  function handleOpen() {
    setPending(value)
    setReviewing(false)
    setOpen(true)
  }

  function handleNext() {
    if (!pending || pending === value) return
    if (impacted.length > 0) setReviewing(true)
    else mutation.mutate()
  }

  function handleCancel() {
    setPending(value)
    setReviewing(false)
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative hidden lg:flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
      <Calendar size={13} className="text-slate-400" />
      <span>Planned Start:</span>
      <button
        onClick={handleOpen}
        className={cn(
          'font-medium hover:underline underline-offset-2 transition-colors',
          value ? 'text-slate-700' : 'text-slate-400 italic'
        )}
      >
        {value ? formatPlannedDate(value) : 'Not set'}
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 z-20 w-72 bg-white rounded-xl border border-slate-200 shadow-lg p-3">
          {!reviewing ? (
            <>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Planned start date</p>
              <input
                type="date"
                value={pending}
                onChange={e => setPending(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30"
              />
              {pending && pending !== value && (
                <p className="text-xs text-slate-500 mt-2">
                  Set planned start to <span className="font-semibold text-slate-700">{formatPlannedDate(pending)}</span>?
                  {impacted.length > 0 && (
                    <> This will shift {impacted.length} trade PO date{impacted.length === 1 ? '' : 's'} by {Math.abs(deltaDays)} day{Math.abs(deltaDays) === 1 ? '' : 's'}.</>
                  )}
                </p>
              )}
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNext}
                  disabled={!pending || pending === value}
                  className="px-3 py-1.5 text-xs bg-[#6692C5] hover:bg-[#5a82b3] text-white font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {impacted.length > 0 ? 'Review impact' : 'Confirm'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-600">
                Shifting planned start by{' '}
                <span className="font-semibold">{deltaDays > 0 ? `+${deltaDays}` : deltaDays} day{Math.abs(deltaDays) === 1 ? '' : 's'}</span>
                {' '}will move:
              </p>
              <div className="max-h-40 overflow-y-auto mt-2 border border-slate-100 rounded-lg divide-y divide-slate-100">
                {impacted.map(t => (
                  <div key={t.tradeId} className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <span className="text-[11px] text-slate-600 truncate">{t.tradeName}</span>
                    <span className={cn('text-[11px] font-medium whitespace-nowrap', t.overdue ? 'text-red-500' : 'text-slate-500')}>
                      {formatPlannedDate(t.newDate)}
                    </span>
                  </div>
                ))}
              </div>
              {overdueCount > 0 && (
                <p className="text-xs text-red-500 mt-2">
                  {overdueCount} trade{overdueCount === 1 ? '' : 's'} will become overdue.
                </p>
              )}
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => setReviewing(false)}
                  disabled={mutation.isPending}
                  className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Back
                </button>
                <button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                  className="px-3 py-1.5 text-xs bg-[#6692C5] hover:bg-[#5a82b3] text-white font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {mutation.isPending ? 'Saving...' : 'Confirm & Save'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// NOTE: switching projects only updates the `project` URL query param for now —
// contract-details isn't re-fetched per-project since the backend doesn't support
// a contract id + project id scoped fetch yet.
function ProjectSwitcher({ contract, projects, currentProjectId }: {
  contract: DummyContract
  projects: DummyProject[]
  currentProjectId?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const contractLabel = `${contract.clientFullName} / ${contract.streetAddress}, ${contract.suburb}`
  const selectedProjectId = searchParams.get('project') ?? currentProjectId
  const selectedProject = projects.find(p => p.id === selectedProjectId) ?? projects[0]
  const label = selectedProject?.projectName ? `${selectedProject.projectName} — ${contractLabel}` : contractLabel

  if (projects.length === 0) {
    return <p className="text-sm font-semibold text-slate-800 truncate min-w-0">{label}</p>
  }

  function handleSelect(projectId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('project', projectId)
    router.push(`?${params.toString()}`, { scroll: false })
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative min-w-0">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1 max-w-full text-left hover:text-[#6692C5] transition-colors"
      >
        <span className="text-sm font-semibold text-slate-800 truncate">{label}</span>
        <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-20 w-80 max-w-[90vw] bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 max-h-72 overflow-y-auto">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              className={cn(
                'w-full flex items-center px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors',
                p.id === selectedProject?.id ? 'bg-[#6692C5]/5 text-[#6692C5] font-medium' : 'text-slate-600'
              )}
            >
              <span className="truncate">{p.projectName ? `${p.projectName} — ${contractLabel}` : contractLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TopBar({ contract, pos, projects, currentProjectId }: {
  contract: DummyContract
  pos: DummyPO[]
  projects: DummyProject[]
  currentProjectId?: string
}) {
  const contractId = useContractId()
  const totalAmount = pos.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const remaining = contract.contractValue - totalAmount

  const plannedStart = contract.plannedStart ?? ''
  const daysOpen = plannedStart ? daysUntil(plannedStart) : null

  return (
    <div className="flex items-center gap-4 px-4 h-12 bg-white border-b border-slate-200 flex-shrink-0 min-w-0">
      <Link href="/" className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0">
        <ArrowLeft size={16} />
      </Link>

      <div className="flex items-center gap-2 min-w-0 flex-1">
        <ProjectSwitcher contract={contract} projects={projects} currentProjectId={currentProjectId} />
        <StatusBadge status={contract.status} className="flex-shrink-0" />
      </div>

      <PlannedStartField contractId={contractId} value={plannedStart} />

      <div className="hidden lg:flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
        <Clock size={13} className="text-slate-400" />
        <span>Days Open:</span>
        {daysOpen === null ? (
          <span className="text-slate-400 italic">Not set</span>
        ) : (
          <span className={cn('font-semibold', daysOpen < 0 ? 'text-red-500' : 'text-slate-700')}>
            {daysOpen === 0 ? 'Today' : daysOpen < 0 ? `Overdue ${Math.abs(daysOpen)}d` : `${daysOpen}d`}
          </span>
        )}
      </div>

      <div className="hidden xl:flex items-center gap-2 flex-shrink-0 ml-2 pl-3 border-l border-slate-200">
        <span className="px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 text-xs font-medium whitespace-nowrap">
          Remaining SUM: <span className="font-bold">${remaining.toLocaleString()}</span>
        </span>
        <span className="px-3 py-1.5 rounded-full bg-blue-50 text-[#6692C5] text-xs font-medium whitespace-nowrap">
          In ADS: <span className="font-bold">${contract.contractValue.toLocaleString()}</span>
        </span>
      </div>
    </div>
  )
}

export function ContractLayout({ contract, crew, pod, scopes, pos, projects, currentProjectId }: ContractLayoutProps) {
  const [canvas, dispatch] = useReducer(canvasReducer, initialCanvas)

  // TEMP: left/right panel toggles for testing — remove this block (and the toolbar below) to revert.
  const [leftHidden, setLeftHidden] = useState(false)
  const [rightHidden, setRightHidden] = useState(false)
  const isCreatingPo = canvas.view === 'create-po'

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Top contract bar */}
      <TopBar contract={contract} pos={pos} projects={projects} currentProjectId={currentProjectId} />

      {/* 3-panel row */}
      <div className="relative flex flex-1 overflow-hidden min-h-0">
        {/* TEMP: floating collapse handles — sit on the panel borders, remove this block to revert */}
        {isCreatingPo && (
          <>
            <button
              onClick={() => setLeftHidden(v => !v)}
              style={{ left: leftHidden ? '8px' : '336px' }}
              className="absolute top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-slate-300 shadow-md flex items-center justify-center text-slate-500 hover:text-slate-700 hover:shadow-lg transition-all"
              title={leftHidden ? 'Show left panel' : 'Hide left panel'}
            >
              {leftHidden ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            </button>
            <button
              onClick={() => setRightHidden(v => !v)}
              style={{ right: rightHidden ? '8px' : '317px' }}
              className="absolute top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-slate-300 shadow-md flex items-center justify-center text-slate-500 hover:text-slate-700 hover:shadow-lg transition-all"
              title={rightHidden ? 'Show right panel' : 'Hide right panel'}
            >
              {rightHidden ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
            </button>
          </>
        )}

        {/* Left panel */}
        {!leftHidden && (
          <div className="w-[350px] shrink-0 border-r border-slate-200 overflow-hidden flex flex-col">
            <LeftPanel contract={contract} crew={crew} pod={pod} scopes={scopes} pos={pos} />
          </div>
        )}

        {/* Center canvas */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <CenterPanel canvas={canvas} onCanvas={dispatch} />
        </div>

        {/* Right panel */}
        {!rightHidden && (
          <div className="w-[330px] shrink-0 border-l border-slate-200 overflow-hidden flex flex-col">
            <RightPanel pos={pos} onCanvas={dispatch} />
          </div>
        )}
      </div>
    </div>
  )
}
