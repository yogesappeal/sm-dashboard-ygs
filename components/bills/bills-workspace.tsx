'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  Receipt,
  FileCheck2,
  AlertCircle,
  X,
  Calendar,
  Building,
  FileText,
  DollarSign,
  ArrowRight,
  ChevronRight,
  ClipboardList,
  MessageSquare,
  CheckCircle2,
  XCircle,
  HelpCircle,
  History,
  ChevronDown,
  ChevronUp,
  Eye,
  Paperclip,
  Send,
  User,
  Download,
  ImageIcon,
  FileQuestion,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Maximize2,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { PermissionGuard } from '@/components/shared/permission-guard'
import { usePermission } from '@/lib/hooks/use-permission'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// pdfjs-dist (via react-pdf) reaches for browser-only globals (DOMMatrix,
// Path2D, ...) as soon as it's imported, which crashes Next's server-side
// render pass for this otherwise-client component — ssr: false skips that
// pass entirely so it only ever loads in the browser.
const BillAttachmentViewer = dynamic(
  () => import('@/components/bills/bill-attachment-viewer').then((m) => m.BillAttachmentViewer),
  { ssr: false }
)
import { useToast } from '@/components/shared/toast'
import { useAuthStore } from '@/lib/store'
import {
  getBills,
  getBillDetail,
  getBillComments,
  getBillAuditLog,
  postBillComment,
  getBillAttachment,
  approveBill,
  rejectBill,
  mapApiBillToBill,
  mapApiCommentToAuditEvent,
  mapCommentsAndAuditLogToAuditTrail,
  unwrapApiData,
  formatCurrencyAmount,
  NO_DATA,
  ApiError,
} from '@/lib/api'
import type { Bill, BillFile, AuditTrailEvent, ApiComment, ApiAuditLogEntry, BillScope, Assignment } from '@/lib/types'
import { cn } from '@/lib/utils'

// Every failed API call in this file surfaces its error via `err.message` —
// for an ApiError (see lib/api/fetcher.ts) that's the raw HTTP response
// body (a Postgres/edge-function error string, a JSON blob, sometimes an
// HTML error page), never meant for a Site Manager to read. This maps the
// handful of statuses worth distinguishing to plain-language copy, and
// falls back to the caller's own generic message (e.g. "Failed to load
// bills") for anything else — never the raw body.
function getFriendlyErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 401:
      case 403:
        return 'Your session has expired or you don’t have permission to do this. Please log in again.'
      case 404:
        return 'This bill could not be found — it may have been removed.'
      case 408:
        return 'The request took too long. Please try again.'
      case 429:
        return 'Too many requests — please wait a moment and try again.'
      default:
        return err.status >= 500
          ? 'Something went wrong on our end. Please try again shortly.'
          : fallback
    }
  }
  if (err instanceof TypeError) {
    // fetch() rejects with a plain TypeError on a network failure (offline,
    // DNS, CORS) — its message ("Failed to fetch") is just as unhelpful.
    return 'Network error — please check your connection and try again.'
  }
  return fallback
}

// Ported from Resource/BillWorkspace2.tsx — maps a file's type/extension to
// the icon + colors the Files & Attachments card renders it with, and
// whether it's previewable inline vs. download-only. Kept here (rather than
// in lib/api/bills.ts) since it returns lucide icon components and Tailwind
// classes — presentation, not data.
function getFileTypeInfo(file: BillFile) {
  if (file.type === 'pdf') {
    return {
      label: 'PDF Document',
      icon: FileText,
      colorClass: 'bg-red-50 text-red-600',
      badgeClass: 'text-red-700 bg-red-50 border-red-200',
      canPreview: true,
    }
  }

  if (file.type === 'image') {
    const ext = file.name.split('.').pop()?.toUpperCase() || 'IMG'
    return {
      label: `Image (${ext})`,
      icon: ImageIcon,
      colorClass: 'bg-indigo-50 text-indigo-600',
      badgeClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      canPreview: true,
    }
  }

  const ext = file.name.split('.').pop()?.toUpperCase() || ''
  return {
    label: ext ? `${ext} File` : 'File Attachment',
    icon: ext === 'XLSX' || ext === 'CSV' ? FileSpreadsheet : FileQuestion,
    colorClass: 'bg-amber-50 text-amber-700',
    badgeClass: 'text-amber-700 bg-amber-50 border-amber-200',
    // Clicking still opens the viewer panel (see the "other" render branch)
    // rather than being blocked outright, but no browser can reliably
    // render these inline (.docx/.xlsx/...), so it shows a plain "can't
    // preview" message with a Download action instead of attempting one.
    canPreview: true,
  }
}

// Shimmer placeholders, matching the shapes of what they stand in for —
// same `Skeleton` primitive (components/ui/skeleton.tsx) used on the
// purchase-orders / contract detail pages, rather than a spinner, so Bills'
// loading states are visually consistent with the rest of the app.
function BillListItemSkeleton() {
  return (
    <div className="p-4 border-b border-slate-100">
      <div className="flex justify-between items-start mb-1.5 gap-2">
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
      </div>
      <Skeleton className="h-3 w-10 mb-1.5" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

function BillDetailSkeleton() {
  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="space-y-2 w-full md:w-40">
            <Skeleton className="h-6 w-28 ml-auto" />
            <Skeleton className="h-7 w-24 ml-auto rounded-lg" />
          </div>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <Skeleton className="h-4 w-20 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Line Items Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>

      {/* Files & Attachments Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

interface BillsWorkspaceProps {
  // Each sidebar route passes its own scope — see GET /bills?scope=<value>
  // in lib/api/bills.ts.
  scope: BillScope
}

export function BillsWorkspace({ scope }: BillsWorkspaceProps) {
  const canApproveBills = usePermission('bill:approve')

  // Bills now lives on the same Supabase project as the rest of the app
  // (NEXT_PUBLIC_SUPABASE_URL) and accepts the app's own authenticated
  // session token — no more manual entry.
  const { token, user, authUserId } = useAuthStore()

  const router = useRouter()
  const searchParams = useSearchParams()
  // Local state (not searchParams.get('bill') directly) is what drives
  // rendering — router.push/replace triggers a real Next.js navigation
  // (an RSC round-trip, ~200ms+ even for a same-page query change), which
  // made clicking a bill feel laggy when this read straight from the URL.
  // The URL is still kept in sync (selectBill / the auto-select effect
  // below) for deep-linking, just as a background side effect that
  // doesn't block the click from rendering instantly.
  const [selectedBillId, setSelectedBillIdState] = useState(() => searchParams.get('bill') ?? '')

  // Keeps local state in sync when the URL changes from outside a click
  // here — browser back/forward, or a pasted/bookmarked link. Deferred a
  // tick per react-hooks/set-state-in-effect (see the fallback-selection
  // effect below for why).
  useEffect(() => {
    const urlBillId = searchParams.get('bill') ?? ''
    Promise.resolve().then(() => {
      setSelectedBillIdState((prev) => (urlBillId && urlBillId !== prev ? urlBillId : prev))
    })
  }, [searchParams])

  const [bills, setBills] = useState<Bill[]>([])
  const [billsLoading, setBillsLoading] = useState(false)
  const [billsError, setBillsError] = useState<string | null>(null)
  const [billsReloadKey, setBillsReloadKey] = useState(0)

  // Per-bill detail (line items, files, audit trail) is fetched lazily on
  // selection — getBillDetail + getBillActivities in parallel — since the
  // bills list endpoint likely only returns summary fields.
  const [detailLoadedIds, setDetailLoadedIds] = useState<Set<string>>(new Set())
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [commentText, setCommentText] = useState('')
  const [commentSending, setCommentSending] = useState(false)

  // Which bill currently has an approve/reject request in flight — disables
  // both buttons on that bill only, so switching to another bill isn't
  // blocked by an unrelated pending action.
  const [actionPendingId, setActionPendingId] = useState<string | null>(null)

  // Approve/Reject now confirm via ConfirmDialog (components/ui/confirm-dialog.tsx
  // — the same one purchase-orders/suppliers/tasks already use) instead of
  // acting immediately on click. Approve is a plain yes/no — only Reject
  // requires a comment (sent as the `comment` field on the mutation,
  // separate from `commentText` below, the always-visible "Leave a comment"
  // box, which only ever posts a local audit-trail note).
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'approve' | 'reject'; billId: string } | null>(null)
  const [rejectDialogComment, setRejectDialogComment] = useState('')

  // Accordion state for Right Detail sections
  const [openDetailsCard, setOpenDetailsCard] = useState(true)
  const [openFilesCard, setOpenFilesCard] = useState(true)
  const [openWorkflowCard, setOpenWorkflowCard] = useState(true)
  const [openAuditCard, setOpenAuditCard] = useState(true)
  // "All" shows the merged feed (audit-log + comments) already fetched
  // together — no separate request per tab, just a client-side filter of
  // what's already in selectedBill.auditTrail.
  const [auditTab, setAuditTab] = useState<'all' | 'comments'>('comments')

  // Attachment preview — ported from Resource/BillWorkspace2.tsx: clicking a
  // file in Files & Attachments swaps the left list pane for a document
  // viewer (image via <img>, PDF via <iframe>) instead of opening a modal.
  const [showLeftPreview, setShowLeftPreview] = useState(false)
  const [activeAttachmentId, setActiveAttachmentId] = useState<string>('')
  const [pdfZoom, setPdfZoom] = useState(100)
  // The bill detail response only gives an attachment's storage location,
  // not a usable URL — resolved just-in-time via getBillAttachment() when
  // Preview is clicked.
  const [attachmentUrlLoading, setAttachmentUrlLoading] = useState(false)
  const [attachmentUrlError, setAttachmentUrlError] = useState<string | null>(null)

  // Mobile-only master/detail toggle — desktop (md: and up) always shows
  // both panes side by side, completely unaffected by this. Below md, only
  // one pane is visible at a time: the bills list until a bill is tapped,
  // then the detail workspace, with an explicit "Back to Bills List" way
  // back. Ignored entirely at md+ via the `md:flex`/`md:block` overrides
  // applied alongside it further down.
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

  // Forces the attachment viewer into a landscape-style, side-by-side
  // layout on mobile — unconditionally, the same way regardless of the
  // device's actual physical orientation at the time. No native
  // `screen.orientation.lock()` attempt and no reacting to real
  // portrait/landscape state: both were tried in earlier versions of this
  // feature and dropped on purpose —
  // - The native lock only works on some Android browsers, never iOS
  //   (Apple's WebKit has no `lock()` at all), so relying on it meant the
  //   feature behaved differently per platform, which is exactly the
  //   inconsistency this version avoids.
  // - Reacting to real orientation (rotating only while portrait, turning
  //   it off once landscape was reached) meant a physical rotation *while*
  //   already forced could race with the browser's own reflow, and it's
  //   the reason this looked different depending on whether the phone
  //   happened to be portrait or landscape when you opened the viewer.
  // This version is a single, deterministic CSS transform applied purely
  // from screen *size* (phone-sized or not) — never orientation — so the
  // result is identical every time, on every platform.
  //
  // `mobileQuery` matches on EITHER dimension (comma = OR in a media
  // query) so a phone that happens to already be in landscape (tall
  // dimension now the width) still counts as phone-sized, not mistaken
  // for a small desktop window.
  const [isMobileAttachmentLandscapeMode, setIsMobileAttachmentLandscapeMode] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mobileQuery = window.matchMedia('(max-width: 767px), (max-height: 767px)')

    const update = () => {
      setIsMobileAttachmentLandscapeMode(showLeftPreview && mobileQuery.matches)
    }
    update()
    mobileQuery.addEventListener('change', update)
    return () => {
      mobileQuery.removeEventListener('change', update)
    }
  }, [showLeftPreview])

  const toast = useToast()

  // Re-fetches whenever the token changes, or `scope` (set by which sidebar
  // route rendered this component) changes — GET /bills?scope=<value>.
  useEffect(() => {
    if (!token) return
    let cancelled = false

    // Deferred a tick (not called synchronously in the effect body) per
    // react-hooks/set-state-in-effect — resolves before paint, so there's
    // no visible delay before the loading state shows.
    Promise.resolve().then(() => {
      if (cancelled) return
      setBillsLoading(true)
      setBillsError(null)
    })

    getBills(token, scope)
      .then((json) => {
        if (cancelled) return
        const list = unwrapApiData(json) ?? []
        setBills(list.map((b) => mapApiBillToBill(b)))
      })
      .catch((err) => {
        if (cancelled) return
        setBillsError(getFriendlyErrorMessage(err, 'Failed to load bills'))
      })
      .finally(() => {
        if (!cancelled) setBillsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, scope, billsReloadKey])

  // Search is still client-side — scoping (which view) is server-side now,
  // search within a view isn't. Amount matches two ways: the raw number
  // (so "5647" finds a $5,647.40 bill) and the formatted currency string
  // (so "$5,647.40" or "5,647" also works, punctuation and all).
  const filteredBills = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return bills
    const numericQuery = query.replace(/[^0-9.]/g, '')
    return bills.filter((b) => {
      const formattedAmount = formatCurrencyAmount(b.amount, b.currencyCode).toLowerCase()
      return (
        b.billNumber.toLowerCase().includes(query) ||
        b.supplierName.toLowerCase().includes(query) ||
        formattedAmount.includes(query) ||
        (numericQuery !== '' && String(b.amount).includes(numericQuery))
      )
    })
  }, [bills, searchQuery])

  // No auto-select — until the user actually clicks a bill (or a
  // ?bill=<id> deep link resolves to one), nothing is selected and the
  // Right Detail Workspace shows a "select a bill" prompt instead of
  // silently opening whichever bill happened to be first in the list.
  const selectedBill = useMemo(() => {
    return filteredBills.find((b) => b.id === selectedBillId) ?? null
  }, [filteredBills, selectedBillId])

  // Selecting a bill updates local state immediately (instant render) and
  // syncs the URL in the background — router.push isn't awaited or relied
  // on for anything visible, it's purely so the URL stays
  // shareable/bookmarkable.
  const selectBill = useCallback(
    (id: string) => {
      setSelectedBillIdState(id)
      const params = new URLSearchParams(searchParams.toString())
      params.set('bill', id)
      router.push(`?${params.toString()}`, { scroll: false })
    },
    [searchParams, router]
  )


  // Fetch this bill's full detail (line items, attachments) plus its
  // comments and audit log the first time it's selected, then cache —
  // getBillDetail(), getBillComments(), and getBillAuditLog() in parallel.
  // Comments/audit-log each fail independently (defaulting to []) so one
  // failing doesn't block the rest of the detail from showing.
  useEffect(() => {
    const id = selectedBill?.id
    if (!id || !token || detailLoadedIds.has(id)) return
    let cancelled = false

    // Deferred a tick — see the bills-list effect above for why.
    Promise.resolve().then(() => {
      if (cancelled) return
      setDetailLoading(true)
      setDetailError(null)
    })

    Promise.all([
      getBillDetail(token, id),
      getBillComments(token, id).catch(() => [] as ApiComment[]),
      getBillAuditLog(token, id).catch(() => [] as ApiAuditLogEntry[]),
    ])
      .then(([billJson, commentsJson, auditLogJson]) => {
        if (cancelled) return
        const apiBill = unwrapApiData(billJson)
        const comments = unwrapApiData(commentsJson)
        const auditLog = unwrapApiData(auditLogJson)

        setBills((prev) =>
          prev.map((b) =>
            b.id === id
              ? {
                ...mapApiBillToBill(apiBill, b),
                auditTrail: mapCommentsAndAuditLogToAuditTrail(
                  Array.isArray(comments) ? comments : [],
                  Array.isArray(auditLog) ? auditLog : []
                ),
              }
              : b
          )
        )
        setDetailLoadedIds((prev) => new Set(prev).add(id))
      })
      .catch((err) => {
        if (cancelled) return
        setDetailError(getFriendlyErrorMessage(err, 'Failed to load bill details'))
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedBill?.id, token, detailLoadedIds])

  const activeAttachment = useMemo(() => {
    if (!selectedBill || !activeAttachmentId) return null
    return selectedBill.files.find((f) => f.id === activeAttachmentId) ?? null
  }, [selectedBill, activeAttachmentId])

  const activeTypeInfo = useMemo(
    () => (activeAttachment ? getFileTypeInfo(activeAttachment) : null),
    [activeAttachment]
  )

  // Mobile-only visibility for the two top-level panes (see
  // mobileDetailOpen above). The preview always takes priority over the
  // detail pane on mobile since it's opened from a control inside the
  // detail pane and must stay reachable there — except in
  // isMobileAttachmentLandscapeMode, where both panes show together
  // side-by-side (attachment left, detail right) like desktop, since a
  // landscape-shaped phone screen has the room for it.
  const showMobileLeftSlot = !mobileDetailOpen || showLeftPreview
  const showMobileRightSlot = (mobileDetailOpen && !showLeftPreview) || isMobileAttachmentLandscapeMode

  // True while the selected bill's line items / files / audit trail are
  // still being fetched (see the detail-fetch effect above) — the Header
  // Card's own summary fields come straight from the list fetch and don't
  // need to wait on this.
  const isSelectedBillDetailLoading =
    !!selectedBill && detailLoading && !detailLoadedIds.has(selectedBill.id)

  const pageTitle =
    scope === 'pending'
      ? 'Requires My Approval'
      : scope === 'rejected_by_me'
        ? 'Rejected'
        : scope === 'approved_by_me'
          ? 'Approved'
          : 'All Bills'

  const pageDescription =
    scope === 'pending'
      ? 'Bills waiting on your approval'
      : scope === 'rejected_by_me'
        ? 'Bills you have rejected'
        : scope === 'approved_by_me'
          ? 'Bills you have approved'
          : 'View and manage all bills'

  // Defaults to AUD (matching prior mock-data behavior everywhere this is
  // called without a currency) but respects the bill's own currencyCode
  // where it's known, fixing amounts silently mislabeled as AUD.
  const formatCurrency = (val: number, currencyCode?: string) => formatCurrencyAmount(val, currencyCode)

  // Handlers for bill workflow actions. Each bails out if the role lacks
  // bill:approve — enforced here (not just by hiding the button) since these
  // are the only two mutating actions Bills has left. The bill's status is
  // set locally right after a successful call (the approve/reject endpoints
  // don't return the updated bill) rather than by refetching — mirrors the
  // audit-trail entry, which is likewise appended locally since Get Bill
  // Activities isn't guaranteed to reflect the action immediately either.
  const handleApprove = useCallback(
    async (id: string, comment: string) => {
      if (!canApproveBills || !token) return
      setActionPendingId(id)
      try {
        await approveBill(token, id, comment)
        setBills((prev) =>
          prev.map((b) => {
            if (b.id !== id) return b
            const nowStr = new Date().toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
            return {
              ...b,
              status: 'Approved',
              auditTrail: [
                ...b.auditTrail,
                {
                  id: `at-${Date.now()}`,
                  type: 'action',
                  title: 'Approved for payment',
                  user: user?.full_name || 'Current User',
                  date: `${nowStr} via Web`,
                  changes: [{ label: 'Decision', from: 'Pending', to: 'Approved' }],
                },
              ],
            }
          })
        )
        toast('Bill approved successfully!', 'success')
      } catch (err) {
        toast(getFriendlyErrorMessage(err, 'Failed to approve bill'), 'error')
      } finally {
        setActionPendingId(null)
      }
    },
    [toast, canApproveBills, token, user]
  )

  const handleReject = useCallback(
    async (id: string, comment: string) => {
      if (!canApproveBills || !token) return
      setActionPendingId(id)
      try {
        await rejectBill(token, id, comment)
        setBills((prev) =>
          prev.map((b) => {
            if (b.id !== id) return b
            const nowStr = new Date().toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
            return {
              ...b,
              status: 'Rejected',
              auditTrail: [
                ...b.auditTrail,
                {
                  id: `at-${Date.now()}`,
                  type: 'action',
                  title: 'Rejected bill',
                  user: user?.full_name || 'Current User',
                  date: `${nowStr} via Web`,
                  changes: [{ label: 'Decision', from: 'Pending', to: 'Rejected' }],
                },
              ],
            }
          })
        )
        setRejectDialogComment('')
        toast('Bill rejected', 'error')
      } catch (err) {
        toast(getFriendlyErrorMessage(err, 'Failed to reject bill'), 'error')
      } finally {
        setActionPendingId(null)
      }
    },
    [toast, canApproveBills, token, user]
  )

  // Posts to POST .../comments, then appends the comment locally from the
  // response body (confirmed shape: {id, body, author: {id, name},
  // created_at, ...}) rather than refetching the whole comments list.
  const handleSendComment = useCallback(async () => {
    const body = commentText.trim()
    if (!body || !selectedBill || !token) return

    setCommentSending(true)
    try {
      const json = await postBillComment(token, selectedBill.id, body)
      const apiComment = unwrapApiData(json)
      // Built straight from the API's own response (author name, id,
      // created_at, ...) rather than guessed client-side, so it matches
      // exactly what a subsequent refetch of this bill's comments would
      // show — no separate "You"/local-timestamp placeholder to reconcile.
      const newComment: AuditTrailEvent = { ...mapApiCommentToAuditEvent(apiComment), isMine: true }

      setBills((prev) =>
        prev.map((b) => {
          if (b.id === selectedBill.id) {
            return {
              ...b,
              auditTrail: [...b.auditTrail, newComment],
            }
          }
          return b
        })
      )
      setCommentText('')
      toast('Comment added to audit trail', 'info')
    } catch (err) {
      toast(getFriendlyErrorMessage(err, 'Failed to send comment'), 'error')
    } finally {
      setCommentSending(false)
    }
  }, [commentText, selectedBill, token, toast])

  // Opens the preview panel and always resolves a fresh signed URL from
  // getBillAttachment() — never reuses whatever's cached on `file.url`.
  // Supabase's signed URL expires after `signed_url_ttl_sec` (~120s — see
  // lib/types/bill.ts), so a URL fetched once and reused indefinitely (the
  // previous behavior) would silently start failing with a raw
  // `InvalidJWT: "exp" claim timestamp check failed` once a bill's been
  // open longer than that — e.g. close the preview, keep working on the
  // bill for a couple minutes, reopen the same file. Re-resolving on every
  // open costs one extra request but is the only way to guarantee the URL
  // handed to BillAttachmentViewer is still valid.
  const resolveAndPreviewAttachment = useCallback(
    async (file: BillFile) => {
      if (!selectedBill) return
      const fInfo = getFileTypeInfo(file)

      if (!fInfo.canPreview) {
        toast(`${file.name} cannot be previewed in browser`, 'info')
        return
      }

      setActiveAttachmentId(file.id)
      setPdfZoom(100)
      setShowLeftPreview(true)
      setAttachmentUrlError(null)

      if (!token) return
      setAttachmentUrlLoading(true)
      try {
        const json = await getBillAttachment(token, selectedBill.id, file.id)
        const apiAttachment = unwrapApiData(json)
        const resolvedUrl = apiAttachment.signed_url ?? ''
        if (!resolvedUrl) throw new Error('No preview URL returned for this attachment')

        setBills((prev) =>
          prev.map((b) =>
            b.id !== selectedBill.id
              ? b
              : { ...b, files: b.files.map((f) => (f.id === file.id ? { ...f, url: resolvedUrl } : f)) }
          )
        )
        toast(`Loaded ${file.name} on left side`, 'info')
      } catch (err) {
        setAttachmentUrlError(getFriendlyErrorMessage(err, 'Failed to load attachment'))
        toast(`Couldn't load ${file.name}`, 'error')
      } finally {
        setAttachmentUrlLoading(false)
      }
    },
    [selectedBill, token, toast]
  )

  // Auto-opens a pending bill's first attachment once its detail has
  // genuinely finished loading — saves the extra click of opening the file
  // yourself while reviewing something you're about to approve/reject.
  // Only for "Pending Approval" bills, and it's a no-op if the bill has no
  // attachments.
  //
  // Re-triggers every time you come back to a bill (select bill A, select
  // bill B, select bill A again -> auto-opens again on that second visit),
  // not just the very first time — tracked by remembering only the *last*
  // selected bill id (a ref, not state, since it's bookkeeping that
  // shouldn't itself trigger a re-render) rather than a permanent
  // "already tried" set. While you stay on the same bill, `selectedBill`'s
  // object identity can still change (e.g. after sending a comment
  // updates `bills`), but its `id` doesn't, so the guard below keeps this
  // from re-firing on every unrelated update — only an actual id change
  // (a real re-entry) does.
  //
  // Gates on `detailLoadedIds.has(id)` specifically, NOT a derived
  // "isLoading" boolean — right after a bill is first selected, detail
  // fetching hasn't started yet, so a naive "not loading" check reads as
  // true for one render before the fetch effect below even calls
  // setDetailLoading(true). That false negative would let this effect run
  // immediately with `files` still empty (from the list-only summary),
  // mark this id as "handled" via the ref, and then skip the real attempt
  // once detail actually finishes loading moments later — attachments
  // would silently never auto-open. `detailLoadedIds` only gains an id
  // after a real successful fetch, so it can't false-positive that way.
  const lastAutoOpenAttemptedBillId = useRef<string | null>(null)
  useEffect(() => {
    if (!selectedBill) return
    if (!detailLoadedIds.has(selectedBill.id)) return
    if (selectedBill.status !== 'Pending Approval') return
    if (lastAutoOpenAttemptedBillId.current === selectedBill.id) return
    lastAutoOpenAttemptedBillId.current = selectedBill.id

    const firstFile = selectedBill.files[0]
    if (!firstFile) return
    // Deferred a tick (not called synchronously in the effect body) per
    // react-hooks/set-state-in-effect.
    Promise.resolve().then(() => resolveAndPreviewAttachment(firstFile))
  }, [selectedBill, detailLoadedIds, resolveAndPreviewAttachment])

  // Subtotal calculations
  const subtotal = useMemo(() => {
    if (!selectedBill) return 0
    return selectedBill.lineItems.reduce((acc, item) => acc + item.amount, 0)
  }, [selectedBill])

  const gstTax = useMemo(() => subtotal * 0.1, [subtotal])
  const totalAmount = useMemo(() => subtotal + gstTax, [subtotal, gstTax])

  // Approval workflow stages derived from the bill's real assignments[] —
  // grouped by stage number since more than one approver can share a stage.
  // A stage's own status comes from its approvers' decisions, not from
  // comparing against approvalStage, since a stage can be reached and still
  // have some approvers pending.
  const workflowStages = useMemo(() => {
    if (!selectedBill) return []
    const byStage = new Map<number, Assignment[]>()
    for (const a of selectedBill.assignments) {
      if (!byStage.has(a.stage)) byStage.set(a.stage, [])
      byStage.get(a.stage)!.push(a)
    }
    return Array.from(byStage.entries())
      .sort(([a], [b]) => a - b)
      .map(([stage, approvers]) => {
        const status: 'completed' | 'rejected' | 'active' | 'pending' = approvers.some((a) => a.decision === 'rejected')
          ? 'rejected'
          : approvers.every((a) => a.decision === 'approved')
            ? 'completed'
            : selectedBill.approvalStage === stage
              ? 'active'
              : 'pending'
        return { stage, stepName: approvers[0]?.stepName ?? NO_DATA, status, approvers }
      })
  }, [selectedBill])

  // The current stage's approver names — shown as the "Any of ..." condition
  // beneath the stage pills, deduped since the same approver can appear more
  // than once for the same stage in real data.
  const approvalCondition = useMemo(() => {
    if (!selectedBill) return NO_DATA
    const currentStageApprovers = selectedBill.assignments.filter((a) => a.stage === selectedBill.approvalStage)
    if (currentStageApprovers.length === 0) return 'No assigned approvers'
    const names = Array.from(new Set(currentStageApprovers.map((a) => a.approverName)))
    return names.join(', ')
  }, [selectedBill])

  const visibleAuditTrail = useMemo(() => {
    if (!selectedBill) return []
    if (auditTab === 'comments') return selectedBill.auditTrail.filter((ev) => ev.type === 'comment')
    return selectedBill.auditTrail
  }, [selectedBill, auditTab])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      <div className="flex-shrink-0">
        <PageHeader title={pageTitle} description={pageDescription} />
      </div>

      {/* Main Workspace Split Layout — left:right ratio is set via the
          flex-N classes below. Only the two values sharing a row matter
          (their ratio, not their sum), and the two left-side states — the
          Bills List and the attachment preview above it — are independent,
          so each can have its own ratio against the "Right Detail
          Workspace" panel further down this file.

          In isMobileAttachmentLandscapeMode, this whole row (both panes
          together, already laid out side-by-side via flex) is what gets
          pinned fullscreen and rotated — not just the attachment pane
          alone — so the two panes keep their side-by-side arrangement
          instead of one covering the whole screen by itself.

          `z-40` (not higher) is deliberate: it sits above normal page
          content but stays BELOW ConfirmDialog's `z-50` portal
          (components/ui/confirm-dialog.tsx, shared with purchase-orders/
          suppliers/tasks) and Toast's `z-[200]` (components/shared/toast.tsx)
          — an earlier version of this used `z-[100]`, which sat ABOVE the
          dialog and silently swallowed every click meant for it, since the
          dialog portals to `document.body` outside this rotated subtree
          entirely and stacking is purely z-index-driven once both sides
          have an explicit value, regardless of DOM/mount order. */}
      <div
        className={cn(
          'flex-1 flex overflow-hidden',
          isMobileAttachmentLandscapeMode && 'fixed inset-0 z-40'
        )}
        style={
          isMobileAttachmentLandscapeMode
            ? {
                width: '100vh',
                height: '100vw',
                transform: 'rotate(90deg) translateY(-100%)',
                transformOrigin: 'top left',
              }
            : undefined
        }
      >
        {/* Left Side: Either Bills List or Document Previewer (PDF / Image) */}
        {showLeftPreview ? (
          <div
            className={cn(
              showMobileLeftSlot ? 'flex' : 'hidden',
              'md:flex flex-col flex-45 min-w-0 md:min-w-80 bg-slate-900/5 border-r border-slate-200 h-full overflow-hidden relative'
            )}
          >
            {/* Viewer Header Toolbar */}
            <div className="h-12 bg-white border-b border-slate-200 px-3 flex items-center justify-between flex-shrink-0 shadow-2xs z-10">
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowLeftPreview(false)
                    // Also drops back out of the mobile detail pane — pre-
                    // existing (not landscape-specific) mismatch between
                    // this button's own label/tooltip and its actual
                    // behavior: on mobile, closing just the attachment
                    // used to reveal the bill *detail* pane underneath,
                    // one level short of the bills list this button says
                    // it returns to. Harmless on desktop, which ignores
                    // mobileDetailOpen entirely via its own `md:` overrides.
                    setMobileDetailOpen(false)
                  }}
                  className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold flex-shrink-0"
                  title="Return to bills list"
                >
                  <ArrowRight size={14} className="rotate-180" />
                </button>
                <div className="h-4 w-px bg-slate-200 mx-0.5 flex-shrink-0" />
                {activeTypeInfo && (
                  <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0', activeTypeInfo.colorClass)}>
                    <activeTypeInfo.icon size={13} />
                  </div>
                )}
                <span className="text-xs font-bold text-slate-800 truncate">
                  {activeAttachment?.name || 'Document'}
                </span>
              </div>

              {/* Zoom & Action Controls — only meaningful for PDF (URL zoom
                  param) and images (width-based zoom); the generic iframe
                  used for every other file type doesn't respond to this. */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {(activeAttachment?.type === 'pdf' || activeAttachment?.type === 'image') && (
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setPdfZoom((z) => Math.max(50, z - 15))}
                      className="w-6 h-6 rounded hover:bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors font-bold text-xs"
                      title="Zoom Out"
                    >
                      -
                    </button>
                    <span className="px-1 font-mono text-[10px] text-slate-700 min-w-[32px] text-center font-medium">
                      {pdfZoom}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setPdfZoom((z) => Math.min(175, z + 15))}
                      className="w-6 h-6 rounded hover:bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors font-bold text-xs"
                      title="Zoom In"
                    >
                      +
                    </button>
                  </div>
                )}
                {(activeAttachment?.type === 'pdf' || activeAttachment?.type === 'image') && (
                  <button
                    type="button"
                    onClick={() => setPdfZoom(100)}
                    disabled={pdfZoom === 100}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                    title="Fit to width"
                  >
                    <Maximize2 size={14} />
                  </button>
                )}
                {activeAttachment?.url && (
                  <a
                    href={activeAttachment.url}
                    download={activeAttachment.name}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download size={14} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setShowLeftPreview(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Close Preview"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Document Render Canvas — padding kept minimal so the document
                gets as much of the panel as possible. */}
            <div className="flex-1 overflow-auto p-1.5 flex justify-center bg-slate-200/60">
              {attachmentUrlLoading ? (
                <div className="m-auto flex flex-col items-center gap-2 text-xs text-slate-400">
                  <Loader2 size={20} className="animate-spin" />
                  Loading document...
                </div>
              ) : attachmentUrlError ? (
                <div className="m-auto flex flex-col items-center justify-center p-6 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <AlertCircle size={28} className="text-rose-500 mb-3" />
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Couldn&apos;t load document</h3>
                  <p className="text-xs text-slate-500 mb-4">{attachmentUrlError}</p>
                  <button
                    type="button"
                    onClick={() => activeAttachment && resolveAndPreviewAttachment(activeAttachment)}
                    className="px-4 py-2 bg-[#6692C5] hover:bg-[#4F7CB3] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <RefreshCw size={13} />
                    Retry
                  </button>
                </div>
              ) : !activeAttachment || !activeTypeInfo ? (
                <div className="m-auto text-xs text-slate-400">No document available to preview</div>
              ) : activeTypeInfo.icon === ImageIcon || activeAttachment.type === 'pdf' ? (
                // Fetches the file as a blob, validates it (catches an API
                // error/HTML page returned in place of the real file), then
                // renders via react-pdf (true reflow on zoom, unlike an
                // iframe's #zoom= param which only re-renders on a fresh
                // navigation) or a validated <img> — see
                // components/bills/bill-attachment-viewer.tsx.
                <BillAttachmentViewer file={activeAttachment} zoom={pdfZoom} />
              ) : (
                // Any other file type (.docx, .xlsx, ...) — no browser can
                // reliably render these inline, so rather than attempting
                // an iframe that usually just shows blank, say so plainly
                // and hand the user a direct way to get the file instead.
                <div className="m-auto flex flex-col items-center justify-center p-6 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xs">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-3', activeTypeInfo.colorClass)}>
                    <activeTypeInfo.icon size={22} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Preview not available</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    {activeAttachment.name}{' '}
                    can&apos;t be previewed in the browser. Download it to view the file.
                  </p>
                  <a
                    href={activeAttachment.url}
                    download={activeAttachment.name}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-[#6692C5] hover:bg-[#4F7CB3] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Download size={13} />
                    Download
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              showMobileLeftSlot ? 'flex' : 'hidden',
              'md:flex flex-col flex-23 min-w-0 md:min-w-80 bg-white border-r border-slate-200 h-full overflow-hidden'
            )}
          >
            {/* Search bar */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bill, supplier, or amount..."
                  className="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#6692C5]/30 focus:border-[#6692C5] bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Header count badge for selected view */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Bills List</span>
              <span className="bg-[#6692C5]/10 text-[#6692C5] px-2 py-0.5 rounded-full text-[11px] font-bold">
                {filteredBills.length}
              </span>
            </div>

            {/* List items for this category */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {!token || billsLoading ? (
                <div>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <BillListItemSkeleton key={i} />
                  ))}
                </div>
              ) : billsError ? (
                <div className="px-4 py-12 flex flex-col items-center gap-3 text-center">
                  <AlertCircle size={22} className="text-rose-500" />
                  <p className="text-xs text-slate-500">{billsError}</p>
                  <button
                    type="button"
                    onClick={() => setBillsReloadKey((k) => k + 1)}
                    className="px-3 py-1.5 bg-[#6692C5] hover:bg-[#4F7CB3] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw size={12} />
                    Retry
                  </button>
                </div>
              ) : filteredBills.length === 0 ? (
                <div className="px-4 py-12 text-center text-xs text-slate-400">
                  {bills.length === 0 ? 'No bills found.' : 'No bills found for this view'}
                </div>
              ) : (
                filteredBills.map((bill) => (
                  <div
                    key={bill.id}
                    onClick={() => {
                      selectBill(bill.id)
                      setMobileDetailOpen(true)
                    }}
                    className={cn(
                      'p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50',
                      selectedBill?.id === bill.id
                        ? 'bg-[#6692C5]/10 border-l-4 border-[#6692C5] shadow-xs'
                        : 'bg-white'
                    )}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <span className="text-xs text-slate-500 leading-tight min-w-0 truncate">
                        Bill From{' '}
                        <span className="font-semibold text-slate-800">{bill.supplierName}</span>
                      </span>
                      <StatusBadge status={bill.status} size="xs" />
                    </div>

                    <div className="flex justify-between items-end gap-2 mt-2">
                      <div>
                        <div className="text-slate-400 text-[10px] mb-0.5">Total</div>
                        <span className="text-sm font-bold text-[#6692C5]">
                          {formatCurrency(bill.amount, bill.currencyCode)}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">{bill.billNumber}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Right Detail Workspace */}
        <div
          className={cn(
            showMobileRightSlot ? 'block' : 'hidden',
            'md:block flex-60 min-w-0 bg-slate-50 overflow-y-auto p-4 md:p-6 space-y-5'
          )}
        >
          {!token || billsLoading ? (
            <BillDetailSkeleton />
          ) : billsError ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
              <AlertCircle size={28} className="text-rose-500" />
              <p className="text-sm text-slate-500">{billsError}</p>
              <button
                type="button"
                onClick={() => setBillsReloadKey((k) => k + 1)}
                className="px-4 py-2 bg-[#6692C5] hover:bg-[#4F7CB3] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={13} />
                Retry
              </button>
            </div>
          ) : selectedBill ? (
            <div className="space-y-5">
              {/* Mobile-only: return to the bills list without disturbing
                  the desktop side-by-side layout, which never renders
                  this (md:hidden). */}
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="md:hidden flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowRight size={14} className="rotate-180" />
                Back to Bills List
              </button>

              {/* Header Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                  <div className="space-y-1 max-w-xl">
                    <h2 className="text-lg font-bold text-slate-800">
                      Bill {selectedBill.billNumber}
                    </h2>
                    {/* Address is never provided by this API — the supplier
                        name is shown here instead, so the field isn't just
                        wasted space. Supplier comes from bill detail
                        (contact.name), fetched lazily after selection, so
                        this shimmers rather than flashing "No data" first. */}
                    <div className="text-xs text-slate-600 leading-relaxed">
                      Supplier<br />
                      {isSelectedBillDetailLoading ? (
                        <Skeleton className="h-4 w-32 mt-0.5" />
                      ) : (
                        <span className="font-semibold text-slate-800">{selectedBill.supplierName}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end md:text-right gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl font-bold text-slate-800">
                        {formatCurrency(selectedBill.amount, selectedBill.currencyCode)}
                      </span>
                      <StatusBadge status={selectedBill.status} />
                      {selectedBill.externalStatus && (
                        <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                          Xero: {selectedBill.externalStatus}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedBill.status === 'Pending Approval' && (
                        <PermissionGuard action="bill:approve">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setConfirmDialog({ type: 'approve', billId: selectedBill.id })}
                              disabled={actionPendingId === selectedBill.id || isSelectedBillDetailLoading}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
                            >
                              {actionPendingId === selectedBill.id && <Loader2 size={12} className="animate-spin" />}
                              Approve
                            </button>
                            <button
                              onClick={() => setConfirmDialog({ type: 'reject', billId: selectedBill.id })}
                              disabled={actionPendingId === selectedBill.id || isSelectedBillDetailLoading}
                              className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                            >
                              {actionPendingId === selectedBill.id && <Loader2 size={12} className="animate-spin" />}
                              Reject
                            </button>
                          </div>
                        </PermissionGuard>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Approve/Reject confirmation — components/ui/confirm-dialog.tsx,
                  the same shared ConfirmDialog used across purchase-orders,
                  suppliers, and tasks. Rendered here rather than gated on
                  selectedBill.status === 'Pending Approval' like the buttons
                  above, so a dialog that's already open stays visible through
                  the brief window where the mutation's own success handler
                  flips the bill's status before this closes it. */}
              <ConfirmDialog
                open={confirmDialog?.type === 'approve'}
                title="Approve Bill"
                description={`Are you sure you want to approve Bill ${selectedBill.billNumber}?`}
                confirmLabel="Approve"
                variant="default"
                isLoading={!!confirmDialog && actionPendingId === confirmDialog.billId}
                rotate={isMobileAttachmentLandscapeMode}
                onConfirm={async () => {
                  if (!confirmDialog) return
                  await handleApprove(confirmDialog.billId, '')
                  setConfirmDialog(null)
                }}
                onCancel={() => setConfirmDialog(null)}
              />

              <ConfirmDialog
                open={confirmDialog?.type === 'reject'}
                title="Reject Bill"
                description={`Are you sure you want to reject Bill ${selectedBill.billNumber}?`}
                confirmLabel="Reject"
                variant="danger"
                isLoading={!!confirmDialog && actionPendingId === confirmDialog.billId}
                confirmDisabled={!rejectDialogComment.trim()}
                rotate={isMobileAttachmentLandscapeMode}
                onConfirm={async () => {
                  if (!confirmDialog || !rejectDialogComment.trim()) return
                  await handleReject(confirmDialog.billId, rejectDialogComment.trim())
                  setConfirmDialog(null)
                }}
                onCancel={() => setConfirmDialog(null)}
              >
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectDialogComment}
                  onChange={(e) => setRejectDialogComment(e.target.value)}
                  placeholder="Explain why this bill is being rejected..."
                  rows={3}
                  className="w-full text-sm text-slate-800 placeholder:text-slate-400 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 resize-none"
                />
              </ConfirmDialog>

              {/* Details Card Accordion */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <button
                  onClick={() => setOpenDetailsCard((v) => !v)}
                  className="w-full flex items-center justify-between text-slate-800 font-semibold text-sm mb-2"
                >
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    <span>Details</span>
                  </div>
                  {openDetailsCard ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {openDetailsCard && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs pt-3 border-t border-slate-100 mt-2">
                    <div>
                      <div className="text-slate-400 mb-1">Date</div>
                      {isSelectedBillDetailLoading ? (
                        <Skeleton className="h-4 w-20" />
                      ) : (
                        <div className="text-slate-800 font-semibold">{selectedBill.issueDate}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Due Date</div>
                      {isSelectedBillDetailLoading ? (
                        <Skeleton className="h-4 w-20" />
                      ) : (
                        <div className="text-slate-800 font-semibold">{selectedBill.dueDate}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Reference</div>
                      {isSelectedBillDetailLoading ? (
                        <Skeleton className="h-4 w-20" />
                      ) : (
                        <div className="text-slate-800 font-semibold font-mono">{selectedBill.billNumber}</div>
                      )}
                    </div>
                    {/* PO Reference temporarily hidden — restore by
                        uncommenting. */}
                    {/* <div>
                      <div className="text-slate-400 mb-1">PO Reference</div>
                      {isSelectedBillDetailLoading ? (
                        <Skeleton className="h-4 w-20" />
                      ) : (
                        <div className="text-slate-800 font-semibold font-mono">
                          {selectedBill.reference ?? NO_DATA}
                        </div>
                      )}
                    </div> */}
                    <div>
                      <div className="text-slate-400 mb-1">Currency</div>
                      {isSelectedBillDetailLoading ? (
                        <Skeleton className="h-4 w-16" />
                      ) : (
                        <div className="text-slate-800 font-semibold">{selectedBill.currencyCode ?? NO_DATA}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Line Items Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-800 font-semibold text-sm flex items-center gap-2">
                    <ClipboardList size={16} className="text-slate-400" />
                    Line Items
                  </h3>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                      <tr>
                        <th className="px-3 md:px-4 py-3">Description</th>
                        <th className="px-3 md:px-4 py-3 text-right">Qty</th>
                        <th className="px-3 md:px-4 py-3 text-right">Unit Price</th>
                        <th className="px-3 md:px-4 py-3">Account</th>
                        <th className="px-3 md:px-4 py-3">Tax</th>
                        <th className="px-3 md:px-4 py-3">SM/Dept</th>
                        <th className="px-3 md:px-4 py-3">Site/Tag</th>
                        <th className="px-3 md:px-4 py-3 text-right">Amount AUD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {isSelectedBillDetailLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 8 }).map((__, j) => (
                              <td key={j} className="px-3 md:px-4 py-3">
                                <Skeleton className="h-4 w-full" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : detailError ? (
                        <tr>
                          <td colSpan={8} className="px-3 md:px-4 py-6 text-center text-rose-500">
                            {detailError}
                          </td>
                        </tr>
                      ) : selectedBill.lineItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 md:px-4 py-6 text-center text-slate-400 italic">
                            No line items found for this bill.
                          </td>
                        </tr>
                      ) : (
                        selectedBill.lineItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-3 md:px-4 py-3 font-medium text-slate-800">{item.description}</td>
                            <td className="px-3 md:px-4 py-3 text-right">{item.quantity.toFixed(2)}</td>
                            <td className="px-3 md:px-4 py-3 text-right">
                              {formatCurrency(item.unitPrice, selectedBill.currencyCode)}
                            </td>
                            <td className="px-3 md:px-4 py-3">{item.account}</td>
                            <td className="px-3 md:px-4 py-3">{item.tax}</td>
                            <td className="px-3 md:px-4 py-3">{item.smDept}</td>
                            <td className="px-3 md:px-4 py-3">{item.siteTag}</td>
                            <td className="px-3 md:px-4 py-3 text-right font-semibold text-slate-800">
                              {formatCurrency(item.amount, selectedBill.currencyCode)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <div className="w-full sm:w-64 text-xs space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                    <div className="text-slate-400 text-[11px] mb-1 italic">Amounts are Tax Exclusive</div>
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal, selectedBill.currencyCode)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 pb-2 border-b border-slate-200">
                      <span>GST on Expenses (10%):</span>
                      <span>{formatCurrency(gstTax, selectedBill.currencyCode)}</span>
                    </div>
                    <div className="flex justify-between pt-1 font-bold text-slate-800 text-sm">
                      <span>Total:</span>
                      <span className="text-[#6692C5]">{formatCurrency(totalAmount, selectedBill.currencyCode)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit Trail Card Accordion */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <button
                  onClick={() => setOpenAuditCard((v) => !v)}
                  className="w-full flex items-center justify-between text-slate-800 font-semibold text-sm mb-4"
                >
                  <div className="flex items-center gap-2">
                    <History size={16} className="text-slate-400" />
                    <span>Audit Trail</span>
                  </div>
                  {openAuditCard ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {openAuditCard && (
                  <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1 mb-4">
                    {(['comments', 'all'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setAuditTab(tab)}
                        className={cn(
                          'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                          auditTab === tab
                            ? 'bg-white text-[#6692C5] shadow-xs'
                            : 'text-slate-500 hover:text-slate-700'
                        )}
                      >
                        {tab === 'all' ? 'All' : 'Comments'}
                      </button>
                    ))}
                  </div>
                )}

                {openAuditCard && isSelectedBillDetailLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : openAuditCard && detailError ? (
                  <div className="text-xs text-rose-500 py-2">{detailError}</div>
                ) : openAuditCard && visibleAuditTrail.length === 0 ? (
                  <div className="text-xs text-slate-400 py-2 italic">
                    {auditTab === 'comments' ? 'No comments yet.' : 'No activity recorded for this bill.'}
                  </div>
                ) : openAuditCard ? (
                  <div className="relative pl-6 space-y-5 border-l-2 border-slate-100 ml-2 pt-1">
                    {visibleAuditTrail.map((ev) => {
                      // Comments/audit-log entries fetched from the API
                      // carry `authorId`, compared here (at render time)
                      // against `authUserId` — the Supabase Auth id, which
                      // is what the backend actually stamps authors/actors
                      // with (author_user_id/approver_user_id), NOT
                      // `user.reference_id` (a separate internal id from
                      // the app's own /user profile endpoint — comparing
                      // against that always came out false). Computed at
                      // render time rather than baked in at fetch time
                      // since the fetch is cached per bill and `authUserId`
                      // can still be loading when it first runs. Locally-
                      // created comments (one you just sent) set `isMine`
                      // directly instead, with no `authorId` to compare.
                      const isMine = ev.isMine || (!!ev.authorId && ev.authorId === authUserId)

                      return (
                        <div key={ev.id} className="relative group">
                          {/* Timeline Bullet — comments get a plain marker, no check/approval icon */}
                          <div
                            className={cn(
                              'absolute -left-[31px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                              ev.type === 'comment' ? 'bg-slate-300' : 'bg-emerald-500 text-white'
                            )}
                          >
                            {ev.type !== 'comment' && '✓'}
                          </div>

                          {ev.type === 'comment' ? (
                            <div
                              className={cn(
                                'flex items-start gap-3 p-3 rounded-xl border max-w-[85%]',
                                isMine
                                  ? 'flex-row-reverse ml-auto bg-[#6692C5]/10 border-[#6692C5]/20'
                                  : 'bg-slate-50 border-slate-100'
                              )}
                            >
                              <div
                                className={cn(
                                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                                  isMine ? 'bg-[#6692C5] text-white' : 'bg-[#6692C5]/20 text-[#6692C5]'
                                )}
                              >
                                {ev.user?.[0] ?? 'U'}
                              </div>
                              <div className="flex-1 text-xs">
                                <div
                                  className={cn(
                                    'flex items-center justify-between mb-1',
                                    isMine && 'flex-row-reverse'
                                  )}
                                >
                                  <span className="font-semibold text-slate-800">{ev.user}</span>
                                  <span className="text-[10px] text-slate-400">{ev.date}</span>
                                </div>
                                <p className="text-slate-700 font-medium">"{ev.notes}"</p>
                              </div>
                            </div>
                          ) : (
                            // Action/system entries — a bordered card (matching
                            // the comment bubbles' card treatment, rather than
                            // floating unstyled text) with an optional
                            // before -> after "changes" table and an optional
                            // comment callout, both collapsible sections since
                            // not every entry has either.
                            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden max-w-[85%]">
                              <div className="flex items-start justify-between gap-3 px-3 pt-2.5 pb-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-slate-800">{ev.title}</div>
                                  {ev.user && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">By {ev.user}</div>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 flex-shrink-0 whitespace-nowrap">
                                  {ev.date}
                                </span>
                              </div>

                              {ev.changes && ev.changes.length > 0 && (
                                <div className="border-t border-slate-100 divide-y divide-slate-100">
                                  {ev.changes.map((change, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                                    >
                                      <span className="text-slate-400 flex-shrink-0">{change.label}</span>
                                      <span className="flex items-center gap-1.5 min-w-0 text-right">
                                        <span className="text-slate-400 line-through truncate">{change.from}</span>
                                        <ChevronRight size={10} className="text-slate-300 flex-shrink-0" />
                                        <span className="text-slate-800 font-semibold truncate">{change.to}</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              {/* Comment Input Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                    placeholder="Leave a comment..."
                    disabled={commentSending}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#6692C5]/30 focus:border-[#6692C5] disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={handleSendComment}
                    disabled={commentSending || !commentText.trim()}
                    className="px-4 py-2.5 bg-[#6692C5] hover:bg-[#4F7CB3] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    {commentSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    Send
                  </button>
                </div>
              </div>

              {/* Files & Attachments Card Accordion */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <button
                  onClick={() => setOpenFilesCard((v) => !v)}
                  className="w-full flex items-center justify-between text-slate-800 font-semibold text-sm mb-2"
                >
                  <div className="flex items-center gap-2">
                    <Paperclip size={16} className="text-slate-400" />
                    <span>Files &amp; Attachments</span>
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                      {selectedBill.files.length}
                    </span>
                  </div>
                  {openFilesCard ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {openFilesCard && (
                  <div className="pt-3 border-t border-slate-100 mt-2">
                    {isSelectedBillDetailLoading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Skeleton className="h-14 w-full rounded-xl" />
                        <Skeleton className="h-14 w-full rounded-xl" />
                      </div>
                    ) : detailError ? (
                      <div className="text-xs text-rose-500 py-2">{detailError}</div>
                    ) : selectedBill.files.length === 0 ? (
                      <div className="text-xs text-slate-400 py-2 italic">
                        No attached documents found for this bill.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedBill.files.map((file) => {
                          const fInfo = getFileTypeInfo(file)
                          const FIcon = fInfo.icon
                          const isPreviewableType = file.type === 'pdf' || file.type === 'image'
                          return (
                            <div
                              key={file.id}
                              onClick={() => resolveAndPreviewAttachment(file)}
                              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-[#6692C5]/50 hover:bg-[#6692C5]/5 transition-all cursor-pointer group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', fInfo.colorClass)}>
                                  <FIcon size={18} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-[#6692C5] transition-colors">
                                    {file.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400">{file.sizeMb} MB &middot; {fInfo.label}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 group-hover:bg-[#6692C5] group-hover:text-white group-hover:border-[#6692C5] rounded-lg text-xs font-medium flex items-center gap-1 shadow-xs transition-colors flex-shrink-0"
                              >
                                {isPreviewableType ? <Eye size={12} /> : <Download size={12} />}
                                {isPreviewableType ? 'Preview' : 'Download'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Approval Workflow Card Accordion */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <button
                  onClick={() => setOpenWorkflowCard((v) => !v)}
                  className="w-full flex items-center justify-between text-slate-800 font-semibold text-sm mb-2"
                >
                  <div className="flex items-center gap-2">
                    <FileCheck2 size={16} className="text-slate-400" />
                    <span>Approval Workflow</span>
                  </div>
                  {openWorkflowCard ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {openWorkflowCard && (
                  <div className="pt-3 border-t border-slate-100 mt-2">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {workflowStages.map((stage, idx) => (
                        <div key={stage.stage} className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={cn(
                              'px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border',
                              stage.status === 'active'
                                ? 'bg-[#6692C5] text-white border-[#6692C5] shadow-sm'
                                : stage.status === 'completed'
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : stage.status === 'rejected'
                                    ? 'bg-red-50 text-red-600 border-red-200'
                                    : 'bg-white text-slate-400 border-slate-200 opacity-60'
                            )}
                          >
                            {stage.status === 'completed' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#6692C5]" />
                            )}
                            {stage.status === 'active' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                            {stage.status === 'rejected' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            )}
                            Stage {stage.stage} · {stage.stepName}
                          </span>
                          {idx < workflowStages.length - 1 && (
                            <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Approval condition: Any of{' '}
                      <span className="font-semibold text-slate-600">{approvalCondition}</span>
                    </p>

                    <div className="mt-4 space-y-3">
                      {workflowStages.map((stage) => (
                        <div key={stage.stage} className="border border-slate-100 rounded-xl p-3">
                          <div className="text-xs font-semibold text-slate-600 mb-2">
                            Stage {stage.stage} · {stage.stepName}
                          </div>
                          <div className="space-y-2">
                            {stage.approvers.map((a, i) => (
                              <div key={`${a.approverId ?? a.approverName}-${i}`} className="flex items-start gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <User size={12} className="text-slate-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-medium text-slate-700">{a.approverName}</span>
                                    {a.decision === 'approved' && (
                                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                                        <CheckCircle2 size={12} /> Approved
                                      </span>
                                    )}
                                    {a.decision === 'rejected' && (
                                      <span className="inline-flex items-center gap-1 text-xs text-red-500">
                                        <XCircle size={12} /> Rejected
                                      </span>
                                    )}
                                    {a.decision !== 'approved' && a.decision !== 'rejected' && (
                                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                        <HelpCircle size={12} /> Pending
                                      </span>
                                    )}
                                  </div>
                                  {a.decidedAt && (
                                    <div className="text-[11px] text-slate-400 mt-0.5">{a.decidedAt}</div>
                                  )}
                                  {a.comment && (
                                    <div className="text-xs text-slate-500 mt-1 italic">&quot;{a.comment}&quot;</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedBill.decision && (
                      <p className="text-xs text-slate-400 mt-3">
                        Overall decision:{' '}
                        <span className="font-semibold text-slate-600 capitalize">{selectedBill.decision}</span>
                        {selectedBill.decidedDate && ` on ${selectedBill.decidedDate}`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 text-sm text-center px-6">
              <Receipt size={28} className="text-slate-300" />
              {bills.length === 0 ? 'No bills found.' : 'Please select a bill from the list to view details.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
