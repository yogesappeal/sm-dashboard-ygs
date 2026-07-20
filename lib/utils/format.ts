export function formatCurrency(
  amount: number,
  currency = 'AUD',
  locale = 'en-AU'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-AU').format(n)
}

export function formatTradesList(trades: string[]): string {
  if (!trades || trades.length === 0) return ''
  if (trades.length === 1) return trades[0]
  return trades.join(', ')
}

export function truncate(str: string, maxLength: number): string {
  if (!str) return ''
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength)}...`
}

export function initials(name: string): string {
  if (!name) return ''
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function capitalise(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export interface NormalizedOrderItem {
  id: string
  name: string
  shortDescription: string
  description: string
}

// order_details comes back in different shapes depending on how the PO was
// created: an array of {name, shortDescription, description} (per the
// documented API), an array of {trade_name, building_name, notes} (supplier
// POs created from the contract-preview Create PO form), or a plain string
// (subcontractor POs, which save the job description as free text).
export function normalizeOrderItems(raw: unknown): NormalizedOrderItem[] {
  if (typeof raw === 'string') {
    return raw.trim() ? [{ id: 'text', name: 'Job Description', shortDescription: '', description: raw }] : []
  }
  if (!Array.isArray(raw)) return []
  return raw.map((item, i) => {
    const o = item as Record<string, unknown>
    return {
      id: typeof o.id === 'string' ? o.id : String(i),
      name: (o.name as string) ?? (o.trade_name as string) ?? `Item ${i + 1}`,
      shortDescription: (o.shortDescription as string) ?? (o.building_name as string) ?? '',
      description: (o.description as string) ?? (o.notes as string) ?? '',
    }
  })
}
