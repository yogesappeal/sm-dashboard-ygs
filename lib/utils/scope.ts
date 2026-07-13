import type { ScopeItem, Items, ScopeTradeDraft, ScopeDetail } from '../types'

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
): { building_name: string; trade_items: string }[] {
  return buildings.map((b) => ({
    building_name: b,
    trade_items: trades
      .filter((t) => t.buildingNames.includes(b))
      .map((t) => t.name)
      .join(', '),
  }))
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
