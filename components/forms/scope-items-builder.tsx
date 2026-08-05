'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateScopeTradeDraft } from '@/lib/utils/scope'
import type { ScopeTradeDraft } from '@/lib/types'

// TEMP: testing a trade-first input flow — buildings are entered once, each trade
// snapshots the current building list (default: applies to all buildings), and
// buildings can be excluded per trade (with a way to re-add them back). Shared by
// scope-create-modal.tsx and scope-slide-over.tsx; the parent owns the buildings/
// trades state and does the submit-time mapping via scopeDraftsToItems.
interface ScopeItemsBuilderProps {
  buildings: string[]
  trades: ScopeTradeDraft[]
  onBuildingsChange: (buildings: string[]) => void
  onTradesChange: (trades: ScopeTradeDraft[]) => void
  buildingsError?: string
  tradesError?: string
}

export function ScopeItemsBuilder({ buildings, trades, onBuildingsChange, onTradesChange, buildingsError, tradesError }: ScopeItemsBuilderProps) {
  function addBuilding(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    if (buildings.some((b) => b.toLowerCase() === trimmed.toLowerCase())) return
    onBuildingsChange([...buildings, trimmed])
  }

  function removeBuilding(name: string) {
    onBuildingsChange(buildings.filter((b) => b !== name))
    // Cascade: a building removed from the master list is removed from every trade too.
    onTradesChange(trades.map((t) => ({ ...t, buildingNames: t.buildingNames.filter((b) => b !== name) })))
  }

  function addTrade(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    if (trades.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) return
    // Snapshot the current buildings — a building added later does NOT retroactively
    // attach to trades created earlier.
    onTradesChange([...trades, generateScopeTradeDraft(trimmed, [...buildings])])
  }

  const removeTrade = (id: string) => onTradesChange(trades.filter((t) => t.id !== id))

  const removeBuildingFromTrade = (tradeId: string, buildingName: string) =>
    onTradesChange(
      trades.map((t) => (t.id === tradeId ? { ...t, buildingNames: t.buildingNames.filter((b) => b !== buildingName) } : t))
    )

  const addBuildingToTrade = (tradeId: string, buildingName: string) =>
    onTradesChange(
      trades.map((t) =>
        t.id === tradeId && !t.buildingNames.includes(buildingName)
          ? { ...t, buildingNames: [...t.buildingNames, buildingName] }
          : t
      )
    )

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-2">Buildings</label>
        <ChipInput placeholder="Type a building (e.g., Main House or Garage) ," onCommit={addBuilding} />
        {buildings.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {buildings.map((b) => (
              <Chip key={b} label={b} onRemove={() => removeBuilding(b)} />
            ))}
          </div>
        )}
        {buildingsError && <p className="text-xs text-red-500 mt-1.5">{buildingsError}</p>}
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 block mb-2">Trades</label>
        <ChipInput placeholder="Type a trade (e.g., Roofing or Plumbing) ," onCommit={addTrade} />
        {trades.length > 0 && (
          <div className="space-y-2 mt-2">
            {trades.map((trade) => (
              <TradeBlock
                key={trade.id}
                trade={trade}
                allBuildings={buildings}
                onRemoveTrade={() => removeTrade(trade.id)}
                onRemoveBuilding={(b) => removeBuildingFromTrade(trade.id, b)}
                onAddBuilding={(b) => addBuildingToTrade(trade.id, b)}
              />
            ))}
          </div>
        )}
        {tradesError && <p className="text-xs text-red-500 mt-1.5">{tradesError}</p>}
      </div>
    </div>
  )
}

// TEMP: reusable chip-commit input — type text, press Enter/comma or click the +
// button to commit. Uncommitted text is also committed on blur.
function ChipInput({
  placeholder,
  onCommit,
}: {
  placeholder: string
  onCommit: (value: string) => void
}) {
  const [text, setText] = useState('')

  function commit() {
    if (!text.trim()) return
    onCommit(text)
    setText('')
  }

  return (
    <div className="flex gap-2 items-center">
      <input
        value={text}
        onChange={(e) => setText(e.target.value.replace(',', ''))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            commit()
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
        className={cn(inputCls(false), 'flex-1')}
      />
      <button
        type="button"
        onClick={commit}
        disabled={!text.trim()}
        className="flex items-center justify-center w-8 h-8 flex-shrink-0 rounded-lg border border-slate-200 text-slate-400 hover:text-[#6692C5] hover:border-[#6692C5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

// TEMP: removable pill used for both the Buildings list and per-trade building chips.
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2 py-0.5 text-xs text-slate-600">
      {label}
      <button type="button" onClick={onRemove} className="text-slate-300 hover:text-red-400 transition-colors">
        <X size={10} />
      </button>
    </span>
  )
}

// TEMP: one committed trade + the buildings it currently applies to (defaults to a
// snapshot of all buildings at the time the trade was created). Buildings excluded
// from this trade are listed below as dashed pills that can be clicked to re-add.
function TradeBlock({
  trade,
  allBuildings,
  onRemoveTrade,
  onRemoveBuilding,
  onAddBuilding,
}: {
  trade: ScopeTradeDraft
  allBuildings: string[]
  onRemoveTrade: () => void
  onRemoveBuilding: (buildingName: string) => void
  onAddBuilding: (buildingName: string) => void
}) {
  const excluded = allBuildings.filter((b) => !trade.buildingNames.includes(b))

  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{trade.name}</p>
        <button
          type="button"
          onClick={onRemoveTrade}
          className="text-slate-300 hover:text-red-400 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
      {trade.buildingNames.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {trade.buildingNames.map((b) => (
            <Chip key={b} label={b} onRemove={() => onRemoveBuilding(b)} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic mt-1.5">No buildings — won&apos;t be saved</p>
      )}
      {excluded.length > 0 && (
        <div className={cn('flex flex-wrap gap-1.5', trade.buildingNames.length > 0 ? 'mt-2 pt-2 border-t border-slate-200' : 'mt-1.5')}>
          {excluded.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => onAddBuilding(b)}
              className="inline-flex items-center gap-1 border border-dashed border-slate-300 rounded-full px-2 py-0.5 text-xs text-slate-400 hover:text-[#6692C5] hover:border-[#6692C5] transition-colors"
            >
              <Plus size={10} /> {b}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function inputCls(hasError: boolean) {
  return cn(
    'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors',
    'focus:ring-2 focus:ring-[#6692C5]/30 focus:border-[#6692C5]',
    hasError ? 'border-red-300' : 'border-slate-200'
  )
}
