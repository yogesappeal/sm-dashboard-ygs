'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FileText, Loader2, X, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'
import { useAuthStore } from '@/lib/store'
import { useToast } from '@/components/shared/toast'
import { getPOAttachmentURL } from '@/lib/api'
import type { PODetailAttachment } from '@/lib/types'

interface PreviewState {
  name: string
  url: string
  isImage: boolean
}

const ZOOM_MIN = 1
const ZOOM_MAX = 4
const ZOOM_STEP = 0.5

function AttachmentPreviewModal({ attachment, onClose }: { attachment: PreviewState; onClose: () => void }) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)

  const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))

  const zoomBy = (delta: number) => {
    setZoom((z) => {
      const next = clampZoom(z + delta)
      if (next === ZOOM_MIN) setPan({ x: 0, y: 0 })
      return next
    })
  }

  const resetZoom = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (!attachment.isImage) return
    e.preventDefault()
    zoomBy(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoom === ZOOM_MIN) return
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return
    const { startX, startY, panX, panY } = dragState.current
    setPan({ x: panX + (e.clientX - startX), y: panY + (e.clientY - startY) })
  }

  const handlePointerUp = () => {
    dragState.current = null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex-shrink-0">
          <p className="text-sm font-semibold text-slate-800 truncate pr-4">{attachment.name}</p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {attachment.isImage && (
              <>
                <button onClick={() => zoomBy(-ZOOM_STEP)} disabled={zoom === ZOOM_MIN}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Zoom out">
                  <ZoomOut size={16} />
                </button>
                <button onClick={() => zoomBy(ZOOM_STEP)} disabled={zoom === ZOOM_MAX}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Zoom in">
                  <ZoomIn size={16} />
                </button>
                <button onClick={resetZoom} disabled={zoom === ZOOM_MIN}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Reset zoom">
                  <RotateCcw size={14} />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-1" />
              </>
            )}
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Open in new tab"
            >
              <Download size={16} />
            </a>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div
          className="flex-1 overflow-hidden bg-slate-100 flex items-center justify-center p-4"
          onWheel={handleWheel}
        >
          {attachment.isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachment.url}
              alt={attachment.name}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              draggable={false}
              className={cn('max-w-full max-h-full object-contain rounded-lg shadow-sm select-none', zoom > ZOOM_MIN && 'cursor-grab active:cursor-grabbing')}
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: dragState.current ? 'none' : 'transform 0.15s ease-out' }}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center shadow-sm">
                <FileText size={24} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">Preview not available for this file type.</p>
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#6692C5] hover:bg-[#4F7CB3] text-white rounded-lg transition-colors"
              >
                <Download size={14} /> Open file
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic', 'heif']

// `file_type` shape coming back from the backend isn't guaranteed (mime type
// vs bare extension vs missing) — fall back to sniffing the file name's
// extension so real images still preview inline instead of falling to the
// generic "Open file" state.
function isImageAttachment(att: PODetailAttachment) {
  const type = att.file_type?.toLowerCase() ?? ''
  if (type.startsWith('image/') || IMAGE_EXTENSIONS.includes(type)) return true
  const ext = att.file_name.split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_EXTENSIONS.includes(ext)
}

// Clicking a row fetches a signed URL for that attachment and shows it in an
// in-app preview modal — used by the PO detail views wherever po.attachments
// is present.
export function AttachmentList({ attachments }: { attachments: PODetailAttachment[] }) {
  const { token } = useAuthStore()
  const toast = useToast()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)

  async function openAttachment(att: PODetailAttachment) {
    if (!token || loadingId) return
    setLoadingId(att.id)
    try {
      const res = await getPOAttachmentURL(token, att.id)
      const url = 'url' in res ? res.url : res.data.url
      if (!url) throw new Error('missing url')
      setPreview({ name: att.file_name, url, isImage: isImageAttachment(att) })
    } catch (err) {
      console.error('Failed to resolve attachment url:', err)
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
          onClick={() => openAttachment(att)}
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

      {preview && <AttachmentPreviewModal attachment={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
