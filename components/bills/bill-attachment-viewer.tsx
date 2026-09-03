'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import type { BillFile } from '@/lib/types'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface BillAttachmentViewerProps {
  file: BillFile
  zoom: number
}

// Ported from Resource/billAttachmentviewr.tsx — replaces the old <img>/
// <iframe> preview (bills-workspace.tsx) with a real PDF.js render for PDFs
// (true reflow on zoom, unlike an iframe's #zoom= param which only takes
// effect on a fresh navigation) and a validated image render, both fetched
// as a blob first so an API error or HTML page returned in place of the
// actual file is caught before being handed to the browser/PDF.js.
export function BillAttachmentViewer({ file, zoom }: BillAttachmentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(720)
  const [numPages, setNumPages] = useState(0)
  const [imageNaturalWidth, setImageNaturalWidth] = useState<number | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const renderedZoom = useDeferredValue(zoom)
  const renderedContainerWidth = useDeferredValue(containerWidth)
  const isPdf = file.type === 'pdf' || file.name.toLowerCase().endsWith('.pdf')

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const updateWidth = (width: number) => {
      if (width > 0) setContainerWidth(width)
    }
    updateWidth(element.getBoundingClientRect().width)

    const observer = new ResizeObserver(([entry]) => updateWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [previewUrl])

  useEffect(() => {
    // Deferred a tick (not called synchronously in the effect body) per
    // react-hooks/set-state-in-effect.
    Promise.resolve().then(() => {
      setNumPages(0)
      setImageNaturalWidth(null)
    })
  }, [file.id])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    let objectUrl: string | null = null

    if (!file.url) {
      Promise.resolve().then(() => {
        if (cancelled) return
        setPreviewUrl(null)
        setPreviewError(null)
      })
      return () => {
        cancelled = true
      }
    }

    Promise.resolve().then(() => {
      if (cancelled) return
      setPreviewUrl(null)
      setPreviewError(null)
    })

    void fetch(file.url, {
      credentials: 'same-origin',
      signal: controller.signal,
      headers: { Accept: isPdf ? 'application/pdf' : 'image/*' },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`The attachment could not be retrieved (${response.status}).`)
        }

        const contentType = response.headers.get('content-type')?.toLowerCase() || ''
        // A JSON/HTML response is usually an API error or metadata payload.
        // Do not hand it to the browser or PDF.js as if it were a file.
        if (contentType.includes('application/json') || contentType.includes('text/html')) {
          throw new Error('The attachment service returned data instead of the file.')
        }
        if (isPdf && contentType && !contentType.includes('pdf') && !contentType.includes('octet-stream')) {
          throw new Error(`Expected a PDF file but received ${contentType}.`)
        }
        if (!isPdf && contentType && !contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
          throw new Error(`Expected an image file but received ${contentType}.`)
        }

        const blob = await response.blob()
        if (!blob.size) throw new Error('The attachment file is empty.')
        if (isPdf) {
          const signature = new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer())
          if (signature !== '%PDF-') {
            throw new Error('The attachment service did not return a valid PDF file.')
          }
        }

        objectUrl = URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return
        setPreviewError(caught instanceof Error ? caught.message : 'Unable to load this attachment.')
      })

    return () => {
      cancelled = true
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [file.url, isPdf])

  const fitWidth = Math.max(280, Math.min(760, renderedContainerWidth - 48))
  const renderedWidth = Math.round((fitWidth * renderedZoom) / 100)
  const imageWidth = useMemo(() => {
    const requestedWidth = (fitWidth * renderedZoom) / 100
    return Math.round(imageNaturalWidth ? Math.min(requestedWidth, imageNaturalWidth) : requestedWidth)
  }, [fitWidth, imageNaturalWidth, renderedZoom])

  if (!file.url) {
    return <ViewerMessage>This attachment does not have a preview URL.</ViewerMessage>
  }

  if (previewError) return <ViewerMessage>{previewError}</ViewerMessage>

  if (!previewUrl) return <ViewerMessage>Loading attachment…</ViewerMessage>

  return (
    <div ref={containerRef} className="min-w-full w-full">
      {isPdf ? (
        <Document
          key={`${file.id}-${previewUrl}`}
          file={previewUrl}
          onLoadSuccess={({ numPages: loadedPages }) => setNumPages(loadedPages)}
          loading={<ViewerMessage>Loading PDF…</ViewerMessage>}
          error={<ViewerMessage>Unable to display this PDF. Check the attachment URL or permissions.</ViewerMessage>}
          className="w-max min-w-full flex flex-col items-center gap-5"
        >
          {Array.from({ length: numPages }, (_, index) => (
            <Page
              key={`${file.id}-${index + 1}`}
              pageNumber={index + 1}
              width={renderedWidth}
              devicePixelRatio={typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2)}
              renderTextLayer
              renderAnnotationLayer
              className="overflow-hidden bg-white shadow-xl border border-slate-400"
            />
          ))}
        </Document>
      ) : (
        <div className="w-max min-w-full flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`${file.id}-${previewUrl}`}
            src={previewUrl}
            alt={file.name}
            onLoad={(event) => setImageNaturalWidth(event.currentTarget.naturalWidth)}
            style={{ width: `${imageWidth}px` }}
            className="block max-w-none h-auto object-contain bg-white shadow-xl border border-slate-400"
            draggable={false}
          />
        </div>
      )}
    </div>
  )
}

function ViewerMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-64 w-full max-w-xl flex items-center justify-center rounded-xl border border-slate-300 bg-white p-8 text-center text-sm font-medium text-slate-600 shadow-sm">
      {children}
    </div>
  )
}
