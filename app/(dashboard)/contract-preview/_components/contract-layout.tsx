'use client'

import { useReducer } from 'react'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'
import { canvasReducer, initialCanvas } from './canvas-state'
import { LeftPanel } from './left-panel'
import { CenterPanel } from './center-panel'
import { RightPanel } from './right-panel'
import { StatusBadge } from '@/components/ui/status-badge'
import type { DummyContract, DummyCrew, DummyScope, DummyPO } from './types'

interface ContractLayoutProps {
  contract: DummyContract
  crew: DummyCrew[]
  scopes: DummyScope[]
  pos: DummyPO[]
}

function TopBar({ contract, pos }: { contract: DummyContract; pos: DummyPO[] }) {
  const totalAmount = pos.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const remaining = contract.contractValue - totalAmount

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

      <div className="hidden lg:flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
        <Calendar size={13} className="text-slate-400" />
        <span>Planned Start:</span>
        <span className="text-slate-400 italic">Not set</span>
      </div>

      <div className="hidden lg:flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
        <Clock size={13} className="text-slate-400" />
        <span>Days Open:</span>
        <span className="font-semibold text-slate-700">14</span>
      </div>

      <div className="hidden xl:flex items-center gap-3 flex-shrink-0 ml-2 pl-3 border-l border-slate-200">
        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Remaining SUM</p>
          <p className="text-sm font-bold text-slate-800">${remaining.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">In ADS</p>
          <p className="text-sm font-bold text-[#6692C5]">${contract.contractValue.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

export function ContractLayout({ contract, crew, scopes, pos }: ContractLayoutProps) {
  const [canvas, dispatch] = useReducer(canvasReducer, initialCanvas)

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Top contract bar */}
      <TopBar contract={contract} pos={pos} />

      {/* 3-panel row */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left panel */}
        <div className="w-[350px] shrink-0 border-r border-slate-200 overflow-hidden flex flex-col">
          <LeftPanel contract={contract} crew={crew} scopes={scopes} pos={pos} />
        </div>

        {/* Center canvas */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <CenterPanel canvas={canvas} onCanvas={dispatch} />
        </div>

        {/* Right panel */}
        <div className="w-[330px] shrink-0 border-l border-slate-200 overflow-hidden flex flex-col">
          <RightPanel scopes={scopes} pos={pos} onCanvas={dispatch} />
        </div>
      </div>
    </div>
  )
}
