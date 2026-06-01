const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ...(options.headers ?? {}),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, text)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string, token: string) =>
    request<T>(path, token, { method: 'GET' }),

  post: <T>(path: string, token: string, body: unknown) =>
    request<T>(path, token, { method: 'POST', body: JSON.stringify(body) }),

  patch: <T>(path: string, token: string, body: unknown) =>
    request<T>(path, token, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string, token: string) =>
    request<T>(path, token, { method: 'DELETE' }),

  upload: <T>(path: string, token: string, formData: FormData) =>
    request<T>(path, token, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    }),
}
