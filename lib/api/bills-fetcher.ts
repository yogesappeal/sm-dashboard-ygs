// Bills live on a separate Supabase project (NEXT_PUBLIC_BILLS_SUPABASE_URL)
// from the rest of the app (NEXT_PUBLIC_SUPABASE_URL, used by ./fetcher.ts),
// so it can't reuse that fetcher — and this project's edge functions reject
// requests carrying the main app's `apikey` header, so only `Authorization:
// Bearer <token>` is sent here (confirmed via direct curl testing in an
// earlier session). `token` is passed in explicitly by every call site
// rather than read from a store, since the Bills API currently requires a
// separately-issued token entered by the user — see the temporary Bearer
// Token field in components/bills/bills-workspace.tsx.
const BILLS_BASE_URL = process.env.NEXT_PUBLIC_BILLS_SUPABASE_URL ?? ''

export class BillsApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'BillsApiError'
  }
}

async function request<T>(path: string, token: string): Promise<T> {
  if (!BILLS_BASE_URL) {
    throw new BillsApiError(0, 'NEXT_PUBLIC_BILLS_SUPABASE_URL is not configured')
  }
  const res = await fetch(`${BILLS_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new BillsApiError(res.status, text || `Request failed (${res.status})`)
  }

  return res.json() as Promise<T>
}

export const billsApi = {
  get: <T>(path: string, token: string) => request<T>(path, token),
}
