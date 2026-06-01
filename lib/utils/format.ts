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
