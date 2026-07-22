'use client'

import { useEffect, useRef, useState } from 'react'
import { Paperclip, Upload, X, FileText, Loader2, AlertCircle } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'
import { useAuthStore } from '@/lib/store'
import { uploadPOAttachment, deletePOAttachment } from '@/lib/api'
import type { PODetailAttachment } from '@/lib/types'

// Gated behind NEXT_PUBLIC_FEATURE_ATTACHMENTS — off by default (see .env.example).
// Callers should check the flag before rendering this section.
export const FEATURE_ATTACHMENTS = process.env.NEXT_PUBLIC_FEATURE_ATTACHMENTS === 'true'

interface AttachmentEntry {
  key: string
  fileName: string
  fileSize: number
  // Only newly-added entries carry the raw File (needed to upload it) — entries
  // seeded from an existing PO's attachments are already uploaded server-side.
  file?: File
  status: 'uploading' | 'done' | 'error'
  attachmentId?: string
}

interface PoAttachmentsSectionProps {
  // Ids of attachments already uploaded and ready to pass into insert-purchase-order's
  // attachment_ids — the section uploads to the server itself (attachments must exist
  // before the PO does), it only reports the resulting ids back up to the form.
  attachmentIds: string[]
  onAttachmentIdsChange: (ids: string[]) => void
  // Uploads are async — if the caller lets the user submit while a file is still
  // uploading, that attachment's id won't exist yet and gets silently dropped from
  // attachment_ids. Callers should disable their Submit button while this is true.
  onUploadingChange?: (uploading: boolean) => void
  // Attachments already linked to the PO being edited — seeded once as 'done'
  // entries so the sync effect below doesn't wipe them out on mount.
  initialAttachments?: PODetailAttachment[]
}

export function PoAttachmentsSection({ attachmentIds, onAttachmentIdsChange, onUploadingChange, initialAttachments }: PoAttachmentsSectionProps) {
  const { token } = useAuthStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [entries, setEntries] = useState<AttachmentEntry[]>(() =>
    (initialAttachments ?? []).map((a) => ({
      key: a.id,
      fileName: a.file_name,
      fileSize: a.file_size,
      status: 'done' as const,
      attachmentId: a.id,
    }))
  )

  // Keep the parent's attachment_ids in sync with whichever entries finished uploading.
  useEffect(() => {
    const doneIds = entries.filter((e) => e.status === 'done' && e.attachmentId).map((e) => e.attachmentId!)
    const changed = doneIds.length !== attachmentIds.length || doneIds.some((id, i) => id !== attachmentIds[i])
    if (changed) onAttachmentIdsChange(doneIds)
    onUploadingChange?.(entries.some((e) => e.status === 'uploading'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])

  async function addFiles(list: FileList | null) {
    if (!list || list.length === 0 || !token) return
    const newEntries: { key: string; file: File }[] = Array.from(list).map((file) => ({
      key: crypto.randomUUID(),
      file,
    }))
    setEntries((prev) => [
      ...prev,
      ...newEntries.map(({ key, file }): AttachmentEntry => ({
        key, file, fileName: file.name, fileSize: file.size, status: 'uploading',
      })),
    ])

    for (const entry of newEntries) {
      try {
        const res = await uploadPOAttachment(token, entry.file)
        const attachmentId = res?.data?.attachment_id
        // A response without an id is as good as a failed upload — mark it as an
        // error instead of silently succeeding with nothing to pass into
        // attachment_ids (that gap is invisible in the UI otherwise).
        if (!attachmentId) {
          console.error('po-attachments upload response missing attachment_id:', res)
          setEntries((prev) => prev.map((e) => e.key !== entry.key ? e : { ...e, status: 'error' }))
          continue
        }
        setEntries((prev) => prev.map((e) =>
          e.key !== entry.key ? e : { ...e, status: 'done', attachmentId }
        ))
      } catch {
        setEntries((prev) => prev.map((e) => e.key !== entry.key ? e : { ...e, status: 'error' }))
      }
    }
  }

  async function removeEntry(entry: AttachmentEntry) {
    setEntries((prev) => prev.filter((e) => e.key !== entry.key))
    if (entry.status === 'done' && entry.attachmentId && token) {
      // Best-effort cleanup — the attachment isn't linked to any PO yet, so a
      // failure here just leaves an orphaned file server-side, nothing user-visible.
      deletePOAttachment(token, entry.attachmentId).catch(() => {})
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Paperclip size={14} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700">Attachments</h3>
        <span className="text-xs text-slate-400">(optional)</span>
      </div>
      <p className="text-xs text-slate-400 mb-3">Attach quotes, drawings, or supporting documents for this PO</p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex flex-col items-center justify-center gap-1.5 py-6 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-[#6692C5] hover:text-[#6692C5] hover:bg-[#6692C5]/5 transition-colors"
      >
        <Upload size={18} />
        <span className="text-xs font-medium">Click to upload files</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
        />
      </button>

      {entries.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {entries.map((entry) => (
            <div
              key={entry.key}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border',
                entry.status === 'error' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'
              )}
            >
              {entry.status === 'uploading' ? (
                <Loader2 size={14} className="text-slate-400 flex-shrink-0 animate-spin" />
              ) : entry.status === 'error' ? (
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
              ) : (
                <FileText size={14} className="text-slate-400 flex-shrink-0" />
              )}
              <span className={cn('text-xs truncate flex-1', entry.status === 'error' ? 'text-red-600' : 'text-slate-700')}>
                {entry.fileName}
              </span>
              {entry.status === 'error' ? (
                <span className="text-[10px] text-red-500 flex-shrink-0">Upload failed</span>
              ) : (
                <span className="text-[10px] text-slate-400 flex-shrink-0">{formatFileSize(entry.fileSize)}</span>
              )}
              <button
                type="button"
                onClick={() => removeEntry(entry)}
                className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
