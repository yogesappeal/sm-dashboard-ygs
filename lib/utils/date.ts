import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'

export function formatDate(dateString: string, pattern = 'dd MMM yyyy'): string {
  if (!dateString) return ''
  const date = parseISO(dateString)
  if (!isValid(date)) return dateString
  return format(date, pattern)
}

export function formatDateTime(dateString: string): string {
  return formatDate(dateString, 'dd MMM yyyy, HH:mm')
}

/** Convert an ISO timestamp to the yyyy-MM-dd shape <input type="date"> requires. */
export function toDateInputValue(dateString?: string | null): string {
  if (!dateString) return ''
  const date = parseISO(dateString)
  if (!isValid(date)) return ''
  return format(date, 'yyyy-MM-dd')
}

export function relativeTime(dateString: string): string {
  if (!dateString) return ''
  const date = parseISO(dateString)
  if (!isValid(date)) return dateString
  return formatDistanceToNow(date, { addSuffix: true })
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}
