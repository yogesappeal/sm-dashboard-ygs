import { useQuery } from '@tanstack/react-query'
import { validatePoResponseToken } from '@/lib/api'

// One-shot token validation for the public PO response pages — never silently
// refetched (no user session to invalidate against, and re-validating on
// focus/mount would let a link-preview bot re-trigger it repeatedly).
export function usePoResponseToken(token: string) {
  return useQuery({
    queryKey: ['po-response', token],
    queryFn: () => validatePoResponseToken(token),
    retry: false,
    staleTime: Infinity,
  })
}
