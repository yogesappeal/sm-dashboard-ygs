import type { ScopeItem, Items } from '../types'

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
