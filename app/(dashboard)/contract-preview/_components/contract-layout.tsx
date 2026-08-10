'use client'

import { useReducer, useRef, useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Calendar, ChevronDown, Clock, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn, todayDateOnly } from '@/lib/utils'
import { canvasReducer, initialCanvas } from './canvas-state'
import { LeftPanel } from './left-panel'
import { CenterPanel } from './center-panel'
import { RightPanel } from './right-panel'
import { StatusBadge } from '@/components/ui/status-badge'
import { DateInput } from '@/components/ui/date-input'
import { useAuthStore } from '@/lib/store'
import { usePermission } from '@/lib/hooks/use-permission'
import { updateProjectStartDate } from '@/lib/api'
import type { Contract, Crew, Pod, Scope, PurchaseOrder, Project } from './types'

interface ContractLayoutProps {
  contract: Contract
  crew: Crew[]
  pod: Pod
  scopes: Scope[]
  pos: PurchaseOrder[]
  projects: Project[]
  currentProjectId?: string
}

// Accepts either a plain YYYY-MM-DD or a full ISO timestamp — always normalize
// to a date-only string before parsing so appending 'T00:00:00' can't produce
// a malformed value (e.g. "...ZT00:00:00").
function toDateOnly(iso: string) {
  return iso.slice(0, 10)
}

function formatPlannedDate(iso: string) {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(toDateOnly(iso) + 'T00:00:00'))
}

function daysSince(iso: string) {
  const target = new Date(toDateOnly(iso) + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - target.getTime()) / 86400000)
}

function PlannedStartField({ projectId, value }: { projectId?: string; value: string }) {
  const { token } = useAuthStore()
  const canEdit = usePermission('contract:edit-planned-start')
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(value)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setPending(value)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open, value])

  // Just saves the date — it does NOT shift trade PO dates. Conflicts between
  // this date and existing trade planned_po_date values are surfaced as a
  // warning in the right panel (see PlannedStartConflictBanner), where the
  // user can modify or clear the affected trade dates themselves.
  const mutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project selected')
      if (pending && pending < todayDateOnly()) throw new Error('Planned start can\'t be a past date.')
      await updateProjectStartDate(token!, { project_id: projectId, start_date: pending || null })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-details-full'] })
      setOpen(false)
    },
  })

  function handleOpen() {
    setPending(value)
    mutation.reset()
    setOpen(true)
  }

  function handleCancel() {
    setPending(value)
    mutation.reset()
    setOpen(false)
  }

  const errorMessage = mutation.isError
    ? (mutation.error instanceof Error ? mutation.error.message : 'Failed to save planned start date.')
    : null

  const today = todayDateOnly()
  // Only flag past dates the user is actively picking — the existing saved
  // value is naturally in the past once its date has come and gone, and
  // that's not an error worth surfacing just for opening the picker.
  const isPastDate = !!pending && pending !== value && pending < today

  return (
    <div ref={wrapperRef} className="relative hidden lg:flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
      <Calendar size={13} className="text-slate-400" />
      <span>Planned Start:</span>
      {canEdit ? (
        <button
          onClick={handleOpen}
          className={cn(
            'font-medium hover:underline underline-offset-2 transition-colors',
            value ? 'text-slate-700' : 'text-slate-400 italic'
          )}
        >
          {value ? formatPlannedDate(value) : 'Not set'}
        </button>
      ) : (
        <span className={cn('font-medium', value ? 'text-slate-700' : 'text-slate-400 italic')}>
          {value ? formatPlannedDate(value) : 'Not set'}
        </span>
      )}

      {canEdit && open && (
        <div className="absolute top-full mt-2 right-0 z-20 w-72 bg-white rounded-xl border border-slate-200 shadow-lg p-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Planned start date</p>
          <DateInput
            value={pending}
            min={today}
            onChange={setPending}
            className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30"
          />
          {isPastDate ? (
            <p className="text-xs text-red-500 mt-2">Planned start can&apos;t be a past date.</p>
          ) : pending && pending !== value && (
            <p className="text-xs text-slate-500 mt-2">
              Set planned start to <span className="font-semibold text-slate-700">{formatPlannedDate(pending)}</span>?
            </p>
          )}
          {errorMessage && (
            <p className="text-xs text-red-500 mt-2">{errorMessage}</p>
          )}
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={!pending || pending === value || !projectId || mutation.isPending || isPastDate}
              className="px-3 py-1.5 text-xs bg-[#6692C5] hover:bg-[#5a82b3] text-white font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function truncateLabel(text: string, max = 60) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

// NOTE: switching projects only updates the `project` URL query param for now —
// contract-details isn't re-fetched per-project since the backend doesn't support
// a contract id + project id scoped fetch yet.
function ProjectSwitcher({ contract, projects, currentProjectId }: {
  contract: Contract
  projects: Project[]
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
  const fullLabel = selectedProject?.projectName ? `${selectedProject.projectName} — ${contractLabel}` : contractLabel
  const label = truncateLabel(fullLabel)

  if (projects.length === 0) {
    return <p className="text-sm font-semibold text-slate-800 truncate min-w-0" title={fullLabel}>{label}</p>
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
        title={fullLabel}
      >
        <span className="text-sm font-semibold text-slate-800 truncate">{label}</span>
        <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-20 w-80 max-w-[90vw] bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 max-h-72 overflow-y-auto">
          {projects.map(p => {
            const itemFullLabel = p.projectName ? `${p.projectName} — ${contractLabel}` : contractLabel
            return (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                title={itemFullLabel}
                className={cn(
                  'w-full flex items-center px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors',
                  p.id === selectedProject?.id ? 'bg-[#6692C5]/5 text-[#6692C5] font-medium' : 'text-slate-600'
                )}
              >
                <span className="truncate">{truncateLabel(itemFullLabel)}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TopBar({ contract, projects, currentProjectId, projectId }: {
  contract: Contract
  projects: Project[]
  currentProjectId?: string
  projectId?: string
}) {
  const plannedStart = contract.plannedStart ?? ''
  const daysOpen = plannedStart ? daysSince(plannedStart) : null

  return (
    <div className="flex items-center gap-4 px-4 h-12 bg-white border-b border-slate-200 flex-shrink-0 min-w-0">
      <Link href="/" className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0">
        <ArrowLeft size={16} />
      </Link>

      <div className="flex items-center gap-2 min-w-0 flex-1">
        <ProjectSwitcher contract={contract} projects={projects} currentProjectId={currentProjectId} />
        <StatusBadge status={contract.status} className="flex-shrink-0" />
      </div>

      <PlannedStartField projectId={projectId ?? undefined} value={plannedStart} />

      <div className="hidden lg:flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
        <Clock size={13} className="text-slate-400" />
        <span>Days Open:</span>
        {daysOpen === null ? (
          <span className="text-slate-400 italic">Not set</span>
        ) : (
          <span className={cn('font-semibold', 'text-slate-700')}>
            {daysOpen === 0 ? 'Today' : daysOpen < 0 ? `Starts in ${Math.abs(daysOpen)}d` : `${daysOpen}d`}
          </span>
        )}
      </div>

      <div className="hidden xl:flex items-center gap-2 flex-shrink-0 ml-2 pl-3 border-l border-slate-200">
        <span className="px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 text-xs font-medium whitespace-nowrap">
          Remaining SUM: <span className="font-bold">${contract.remainingBalance.toLocaleString()}</span>
        </span>
        <span className="px-3 py-1.5 rounded-full bg-blue-50 text-[#6692C5] text-xs font-medium whitespace-nowrap">
          In ADS: <span className="font-bold">${contract.adsBalance.toLocaleString()}</span>
        </span>
      </div>
    </div>
  )
}

export function ContractLayout({ contract, crew, pod, scopes, pos, projects, currentProjectId }: ContractLayoutProps) {
  const [canvas, dispatch] = useReducer(canvasReducer, initialCanvas)
  const searchParams = useSearchParams()
  // Same resolution ProjectSwitcher uses: URL `project` param wins, falling
  // back to the project the current contract-details fetch resolved to.
  const projectId = searchParams.get('project') ?? currentProjectId

  // TEMP: left/right panel toggles for testing — remove this block (and the toolbar below) to revert.
  const [leftHidden, setLeftHidden] = useState(false)
  const [rightHidden, setRightHidden] = useState(false)
  const isCreatingPo = canvas.view === 'create-po'

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Top contract bar */}
      <TopBar contract={contract} projects={projects} currentProjectId={currentProjectId} projectId={projectId ?? undefined} />

      {/* 3-panel row */}
      {/* isolate: keeps the z-10 collapse handles below from bleeding past
          this row and competing with the sticky header's own stacking
          context (see the same fix in center-panel.tsx's ActivityCanvas). */}
      <div className="relative isolate flex flex-1 overflow-hidden min-h-0">
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
            <LeftPanel contract={contract} crew={crew} pod={pod} scopes={scopes} pos={pos} projectId={projectId ?? undefined} />
          </div>
        )}

        {/* Center canvas */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <CenterPanel canvas={canvas} onCanvas={dispatch} />
        </div>

        {/* Right panel */}
        {!rightHidden && (
          <div className="w-[330px] shrink-0 border-l border-slate-200 overflow-hidden flex flex-col">
            <RightPanel pos={pos} onCanvas={dispatch} plannedStart={contract.plannedStart} />
          </div>
        )}
      </div>
    </div>
  )
}
