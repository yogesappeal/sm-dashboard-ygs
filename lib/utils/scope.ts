import type { ScopeItem, Items, ScopeTradeDraft, ScopeDetail, ScopeSnapshotBuilding } from '../types'

export function generateScopeItem(
  buildingName: string,
  tradeItems: string
): ScopeItem {
  return {
    id: crypto.randomUUID(),
    buildingName,
    tradeItems,
  }
}

export function parseScopeItems(raw: unknown[]): ScopeItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const r = item as Record<string, unknown>
    return {
      id: String(r.id ?? crypto.randomUUID()),
      buildingName: String(r.buildingName ?? r.building_name ?? ''),
      tradeItems: String(r.tradeItems ?? r.trade_items ?? ''),
    }
  })
}

export function mapBuildingTrades(items: Items[]): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const item of items) {
    result[item.buildingName] = item.trades.map((t) => t.name)
  }
  return result
}

// TEMP: testing helpers for the trade-first input flow (scope-create-modal.tsx).
export function generateScopeTradeDraft(name: string, buildingNames: string[]): ScopeTradeDraft {
  return { id: crypto.randomUUID(), name, buildingNames }
}

// Inverts the trade→buildings UI state back into the existing building→trades wire
// shape — do not change this shape. A trade whose buildingNames is empty simply never
// matches any building below, so it's naturally excluded without special-casing.
export function scopeDraftsToItems(
  buildings: string[],
  trades: ScopeTradeDraft[]
): { building_name: string; trades: string }[] {
  return buildings.map((b) => ({
    building_name: b,
    trades: trades
      .filter((t) => t.buildingNames.includes(b))
      .map((t) => t.name)
      .join(', '),
  }))
}

// Backend scope.type can come back as a literal 'both', or as a comma-separated
// list of the individual types — e.g. 'Supplier, Subs' (subcontractor is
// abbreviated 'Subs', not spelled out) — normalize either shape to the single
// value the Type <select> options expect:
//   Supplier, Subs -> both | Supplier -> supplier | Subs -> subcontractor
export function normalizeScopeType(type: string): 'supplier' | 'subcontractor' | 'both' {
  const parts = type.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
  const hasSupplier = parts.some((t) => t.includes('supplier') || t === 'both')
  const hasSubcontractor = parts.some((t) => t.includes('sub') || t === 'both')
  if (hasSupplier && hasSubcontractor) return 'both'
  if (hasSubcontractor) return 'subcontractor'
  return 'supplier'
}

// Which PO types can be created against a scope — a scope whose type is
// supplier-only (or subcontractor-only) can't have the other kind of PO
// raised against it.
export function scopeAllowedPoTypes(type: string): ('supplier' | 'subcontractor')[] {
  const normalized = normalizeScopeType(type)
  if (normalized === 'both') return ['supplier', 'subcontractor']
  return [normalized]
}

// Inverse of normalizeScopeType — converts the Type <select> value back into the
// label shape the backend expects on insert/update (see normalizeScopeType above).
export function scopeTypeToLabel(type: 'supplier' | 'subcontractor' | 'both'): string {
  switch (type) {
    case 'both': return 'Supplier, Subs'
    case 'subcontractor': return 'Subs'
    default: return 'Supplier'
  }
}

// ─── PO builder submit helpers ────────────────────────────────────────────
// Shared by the Supplier/Subcontractor PO forms and contract-preview's inline
// Create PO canvas — all three use the same trade-first builder UI shape.

export interface OrderBuildingSelection {
  buildingId: string
  buildingName: string
  checked: boolean
  notes?: string
}

export interface OrderTradeSelection {
  tradeId: string
  tradeName: string
  checked: boolean
  buildings: OrderBuildingSelection[]
}

// Inverts the trade-first PO builder UI state (trade -> checked buildings) into
// the building-first scope_snapshot shape insert-purchase-order expects.
export function buildScopeSnapshot(trades: OrderTradeSelection[]): ScopeSnapshotBuilding[] {
  const buildingMap = new Map<string, ScopeSnapshotBuilding>()
  for (const trade of trades) {
    if (!trade.checked) continue
    for (const building of trade.buildings) {
      if (!building.checked) continue
      if (!buildingMap.has(building.buildingId)) {
        buildingMap.set(building.buildingId, {
          building_id: building.buildingId,
          building_name: building.buildingName,
          trades: [],
        })
      }
      buildingMap.get(building.buildingId)!.trades.push({ trade_id: trade.tradeId, trade_name: trade.tradeName })
    }
  }
  return Array.from(buildingMap.values())
}

// order_details is a single free-text note on the backend — fold the
// per-building notes from the trade-first builder into one readable string.
export function buildOrderDetailsNote(trades: OrderTradeSelection[]): string {
  const lines: string[] = []
  for (const trade of trades) {
    if (!trade.checked) continue
    for (const building of trade.buildings) {
      const notes = building.notes?.trim()
      if (!building.checked || !notes) continue
      lines.push(`${trade.tradeName} — ${building.buildingName}: ${notes}`)
    }
  }
  return lines.join('\n')
}

// Inverts existing backend scope_details (building-first: building -> trades) into the
// trade-first draft shape the builder UI edits (trade -> buildings), for edit prefill.
export function scopeDetailsToDrafts(details: ScopeDetail[]): { buildings: string[]; trades: ScopeTradeDraft[] } {
  const buildings: string[] = []
  for (const d of details) {
    if (d.building_name && !buildings.some((b) => b.toLowerCase() === d.building_name.toLowerCase())) {
      buildings.push(d.building_name)
    }
  }

  const tradeMap = new Map<string, ScopeTradeDraft>()
  for (const d of details) {
    for (const t of d.trades) {
      const key = t.trade_name.toLowerCase()
      const existing = tradeMap.get(key)
      if (existing) {
        if (!existing.buildingNames.includes(d.building_name)) existing.buildingNames.push(d.building_name)
      } else {
        tradeMap.set(key, generateScopeTradeDraft(t.trade_name, [d.building_name]))
      }
    }
  }

  return { buildings, trades: Array.from(tradeMap.values()) }
}
