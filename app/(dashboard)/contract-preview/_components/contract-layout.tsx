'use client'

import { useReducer, useRef, useState, useEffect } from 'react'
import { ArrowLeft, Calendar, Clock, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { canvasReducer, initialCanvas } from './canvas-state'
import { LeftPanel } from './left-panel'
import { CenterPanel } from './center-panel'
import { RightPanel } from './right-panel'
import { StatusBadge } from '@/components/ui/status-badge'
import type { DummyContract, DummyCrew, DummyPod, DummyScope, DummyPO } from './types'

interface ContractLayoutProps {
  contract: DummyContract
  crew: DummyCrew[]
  pod: DummyPod
  scopes: DummyScope[]
  pos: DummyPO[]
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

function PlannedStartField({ value, onConfirm }: { value: string; onConfirm: (v: string) => void }) {
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

  function handleOpen() {
    setPending(value)
    setOpen(true)
  }

  function handleConfirm() {
    if (!pending) return
    onConfirm(pending)
    setOpen(false)
  }

  function handleCancel() {
    setPending(value)
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
        <div className="absolute top-full mt-2 right-0 z-20 w-56 bg-white rounded-xl border border-slate-200 shadow-lg p-3">
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
              onClick={handleConfirm}
              disabled={!pending || pending === value}
              className="px-3 py-1.5 text-xs bg-[#6692C5] hover:bg-[#5a82b3] text-white font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TopBar({ contract, pos }: { contract: DummyContract; pos: DummyPO[] }) {
  const totalAmount = pos.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const remaining = contract.contractValue - totalAmount

  const [plannedStart, setPlannedStart] = useState(contract.plannedStart ?? '')
  const daysOpen = plannedStart ? daysUntil(plannedStart) : null

  return (
    <div className="flex items-center gap-4 px-4 h-12 bg-white border-b border-slate-200 flex-shrink-0 min-w-0">
      <Link href="/" className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0">
        <ArrowLeft size={16} />
      </Link>

      <div className="flex items-center gap-2 min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 truncate">
          {contract.clientFullName} / {contract.streetAddress}, {contract.suburb}
        </p>
        <StatusBadge status={contract.status} />
      </div>

      <PlannedStartField value={plannedStart} onConfirm={setPlannedStart} />

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

export function ContractLayout({ contract, crew, pod, scopes, pos }: ContractLayoutProps) {
  const [canvas, dispatch] = useReducer(canvasReducer, initialCanvas)

  // TEMP: left/right panel toggles for testing — remove this block (and the toolbar below) to revert.
  const [leftHidden, setLeftHidden] = useState(false)
  const [rightHidden, setRightHidden] = useState(false)
  const isCreatingPo = canvas.view === 'create-po'

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Top contract bar */}
      <TopBar contract={contract} pos={pos} />

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
