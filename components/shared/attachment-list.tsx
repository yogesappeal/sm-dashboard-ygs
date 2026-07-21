'use client'

import { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'
import { useAuthStore } from '@/lib/store'
import { useToast } from '@/components/shared/toast'
import { getPOAttachmentURL } from '@/lib/api'
import type { PODetailAttachment } from '@/lib/types'

// Clicking a row fetches a signed URL for that attachment and opens it in a
// new tab — used by the PO detail views wherever po.attachments is present.
export function AttachmentList({ attachments }: { attachments: PODetailAttachment[] }) {
  const { token } = useAuthStore()
  const toast = useToast()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function openAttachment(id: string) {
    if (!token || loadingId) return
    setLoadingId(id)
    // Open the tab synchronously, inside the click handler — if we wait for the
    // URL fetch first, the browser no longer treats window.open as user-initiated
    // and silently blocks it (no error, tab just never appears).
    const newTab = window.open('', '_blank', 'noopener,noreferrer')
    try {
      const res = await getPOAttachmentURL(token, id)
      const url = 'url' in res ? res.url : res.data.url
      if (!url) throw new Error('missing url')
      if (newTab) newTab.location.href = url
      else window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('Failed to resolve attachment url:', err)
      newTab?.close()
      toast('Failed to open attachment. Try again.', 'error')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="-mx-4 -my-2">
      {attachments.map((att, i) => (
        <button
          key={att.id}
          type="button"
          onClick={() => openAttachment(att.id)}
          disabled={loadingId === att.id}
          className={cn(
            'w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 transition-colors disabled:opacity-60',
            i > 0 && 'border-t border-slate-50'
          )}
        >
          {loadingId === att.id ? (
            <Loader2 size={14} className="text-slate-400 flex-shrink-0 animate-spin" />
          ) : (
            <FileText size={14} className="text-slate-400 flex-shrink-0" />
          )}
          <span className="text-sm text-slate-700 truncate flex-1">{att.file_name}</span>
          <span className="text-xs text-slate-400 flex-shrink-0">{formatFileSize(att.file_size)}</span>
        </button>
      ))}
    </div>
  )
}
