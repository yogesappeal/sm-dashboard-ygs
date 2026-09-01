'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
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
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { PermissionGuard } from '@/components/shared/permission-guard'
import { usePermission } from '@/lib/hooks/use-permission'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  mapCommentsAndAuditLogToAuditTrail,
  unwrapApiData,
  formatCurrencyAmount,
  NO_DATA,
} from '@/lib/api'
import type { Bill, BillFile, AuditTrailEvent, ApiComment, ApiAuditLogEntry, BillScope } from '@/lib/types'
import { cn } from '@/lib/utils'

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
    // Every type gets an attempted inline preview now (via <iframe> — see
    // the "other" render branch) rather than being blocked outright; the
    // browser renders what it natively can (PDF, images, text, CSV, HTML)
    // and shows nothing for formats it can't (e.g. .docx/.xlsx), so the
    // Download button next to the preview stays the fallback for those.
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
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
  const { token, user } = useAuthStore()

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

  // Optional note shown under Approve/Reject while a bill is still pending
  // — sent as the `comment` field on whichever action is taken, separate
  // from `commentText` above (the always-visible "Leave a comment" box,
  // which only ever posts a local audit-trail note).
  const [approvalComment, setApprovalComment] = useState('')

  // Which bill currently has an approve/reject request in flight — disables
  // both buttons on that bill only, so switching to another bill isn't
  // blocked by an unrelated pending action.
  const [actionPendingId, setActionPendingId] = useState<string | null>(null)

  // Accordion state for Right Detail sections
  const [openDetailsCard, setOpenDetailsCard] = useState(true)
  const [openFilesCard, setOpenFilesCard] = useState(true)
  const [openWorkflowCard, setOpenWorkflowCard] = useState(true)
  const [openAuditCard, setOpenAuditCard] = useState(true)

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
        setBillsError(err instanceof Error ? err.message : 'Failed to load bills')
      })
      .finally(() => {
        if (!cancelled) setBillsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, scope, billsReloadKey])

  // Search is still client-side — scoping (which view) is server-side now,
  // search within a view isn't.
  const filteredBills = useMemo(() => {
    return bills.filter(
      (b) =>
        b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [bills, searchQuery])

  // Select first bill in list if current selection is invalid
  const selectedBill = useMemo(() => {
    const found = filteredBills.find((b) => b.id === selectedBillId)
    if (found) return found
    return filteredBills[0] ?? null
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

  // Once the list loads, if there's no valid selection yet, fall back to
  // the first bill — same instant-local/background-URL split as
  // selectBill() above.
  useEffect(() => {
    if (bills.length === 0) return
    if (selectedBillId && bills.some((b) => b.id === selectedBillId)) return

    const fallbackId = filteredBills[0]?.id
    if (!fallbackId) return

    // Deferred a tick (not called synchronously in the effect body) per
    // react-hooks/set-state-in-effect — resolves before paint, so there's
    // no visible delay before the fallback selection shows.
    Promise.resolve().then(() => setSelectedBillIdState(fallbackId))

    const params = new URLSearchParams(searchParams.toString())
    params.set('bill', fallbackId)
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [bills, filteredBills, selectedBillId, searchParams, router])


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
        setDetailError(err instanceof Error ? err.message : 'Failed to load bill details')
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
  // detail pane and must stay reachable there.
  const showMobileLeftSlot = !mobileDetailOpen || showLeftPreview
  const showMobileRightSlot = mobileDetailOpen && !showLeftPreview

  // True while the selected bill's line items / files / audit trail are
  // still being fetched (see the detail-fetch effect above) — the Header
  // Card's own summary fields come straight from the list fetch and don't
  // need to wait on this.
  const isSelectedBillDetailLoading =
    !!selectedBill && detailLoading && !detailLoadedIds.has(selectedBill.id)

  const pageTitle =
    scope === 'pending'
      ? 'Requires My Approval'
      : scope === 'approved_by_me'
        ? 'Approved by Me'
        : 'All Bills'

  const pageDescription =
    scope === 'pending'
      ? 'Bills waiting on your approval'
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
    async (id: string) => {
      if (!canApproveBills || !token) return
      setActionPendingId(id)
      const comment = approvalComment.trim()
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
                  user: 'Current User',
                  date: `${nowStr} via Web`,
                  notes: comment || undefined,
                },
              ],
            }
          })
        )
        setApprovalComment('')
        toast('Bill approved successfully!', 'success')
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Failed to approve bill', 'error')
      } finally {
        setActionPendingId(null)
      }
    },
    [toast, canApproveBills, token, approvalComment]
  )

  const handleReject = useCallback(
    async (id: string) => {
      if (!canApproveBills || !token) return
      setActionPendingId(id)
      const comment = approvalComment.trim()
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
                  user: 'Current User',
                  date: `${nowStr} via Web`,
                  notes: comment || undefined,
                },
              ],
            }
          })
        )
        setApprovalComment('')
        toast('Bill rejected', 'error')
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Failed to reject bill', 'error')
      } finally {
        setActionPendingId(null)
      }
    },
    [toast, canApproveBills, token, approvalComment]
  )

  // Posts to GET/POST .../comments, then appends the comment locally on
  // success (the endpoint's response shape for the created comment isn't
  // confirmed, so this mirrors the approve/reject pattern of updating state
  // from what we sent rather than parsing the response).
  const handleSendComment = useCallback(async () => {
    const body = commentText.trim()
    if (!body || !selectedBill || !token) return

    setCommentSending(true)
    try {
      await postBillComment(token, selectedBill.id, body)
      const nowStr = new Date().toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
      const newComment: AuditTrailEvent = {
        id: `at-${Date.now()}`,
        type: 'comment',
        title: 'Comment',
        user: 'You',
        notes: body,
        date: `${nowStr} via Web`,
        isMine: true,
      }

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
      toast(err instanceof Error ? err.message : 'Failed to send comment', 'error')
    } finally {
      setCommentSending(false)
    }
  }, [commentText, selectedBill, token, toast])

  // Opens the preview panel immediately; if the file's URL hasn't been
  // resolved yet (bill detail only gives storage location, not a URL),
  // fetches it from getBillAttachment() first.
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

      if (file.url) {
        toast(`Loaded ${file.name} on left side`, 'info')
        return
      }

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
        setAttachmentUrlError(err instanceof Error ? err.message : 'Failed to load attachment')
        toast(`Couldn't load ${file.name}`, 'error')
      } finally {
        setAttachmentUrlLoading(false)
      }
    },
    [selectedBill, token, toast]
  )

  // Subtotal calculations
  const subtotal = useMemo(() => {
    if (!selectedBill) return 0
    return selectedBill.lineItems.reduce((acc, item) => acc + item.amount, 0)
  }, [selectedBill])

  const gstTax = useMemo(() => subtotal * 0.1, [subtotal])
  const totalAmount = useMemo(() => subtotal + gstTax, [subtotal, gstTax])

  // Approval workflow steps derived from the bill's status
  const workflowSteps = useMemo(() => {
    if (!selectedBill) return []
    // Bills only ever reach this workspace once they're past review (Bills
    // is approve/reject only now — see bill:approve), so Review is always done.
    const approvalStatus = selectedBill.status === 'Approved' ? 'completed' : 'active'

    return [
      { id: 'review', label: 'Review', status: 'completed' as const },
      { id: 'approval', label: 'Approval', status: approvalStatus },
    ]
  }, [selectedBill])

  const approvalCondition = useMemo(() => {
    if (!selectedBill || selectedBill.approvers.length === 0) return 'No assigned approvers'
    return selectedBill.approvers.map((a) => a.name).join(', ')
  }, [selectedBill])

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
          Workspace" panel further down this file. */}
      <div className="flex-1 flex overflow-hidden">
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
                  onClick={() => setShowLeftPreview(false)}
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
              ) : activeTypeInfo.icon === ImageIcon ? (
                // Zoom is a percentage of the panel's own width (not a fixed
                // px base) so 100% always fills the available canvas exactly
                // — no leftover whitespace — and scales automatically as the
                // panel's responsive width changes. It's a real box-width
                // change rather than a CSS transform: scale(), so the
                // browser decodes/paints the bitmap at the target size
                // instead of stretching an already-rasterized image, which
                // is what was causing the blurriness.
                <div
                  style={{ width: `${pdfZoom}%` }}
                  className="flex-shrink-0 flex flex-col items-center transition-[width] duration-150 ease-out"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeAttachment.url}
                    alt={activeAttachment.name}
                    className="w-full h-auto rounded-lg shadow-xl border border-slate-300 object-contain bg-white"
                  />
                </div>
              ) : activeAttachment.type === 'pdf' ? (
                // Unlike the <img> above, resizing this iframe's CSS box
                // doesn't make the browser's native PDF viewer re-render
                // bigger — that viewer computes its "fit to width" once, at
                // load, and doesn't react to later box resizes. So zoom is
                // driven instead through the viewer's own #zoom= open
                // parameter, which does control it live — but only if the
                // browser actually re-navigates the iframe. A URL that
                // differs *only* in its fragment (e.g. just #zoom=115 vs
                // #zoom=100) is treated as an in-page fragment jump, not a
                // real navigation, so the new zoom param gets ignored; the
                // `?z=` query param forces a genuine reload so the new zoom
                // level actually takes effect. No `key` here, though — that
                // would fully unmount/remount the iframe (blank flash on
                // every click); updating `src` on the same element instead
                // keeps the previous page visible until the new one is ready.
                <div className="w-full min-h-[780px] flex flex-col items-center">
                  <iframe
                    // `activeAttachment.url` is a Supabase Storage signed URL
                    // and already has its own `?token=<jwt>` query string —
                    // appending `?z=` here (instead of `&`) would put a
                    // second `?` in the URL, which browsers still treat as
                    // part of the query string, corrupting the JWT (breaks
                    // with "InvalidJWT: Failed to base64url decode the
                    // signature"). `&` (or `?` only if there's no existing
                    // query string) is required.
                    src={`${activeAttachment.url}${activeAttachment.url.includes('?') ? '&' : '?'}z=${pdfZoom}#toolbar=0&navpanes=0&zoom=${pdfZoom}`}
                    className="w-full h-full min-h-[780px] bg-white rounded-lg shadow-xl border border-slate-300"
                    title={activeAttachment.name}
                  />
                </div>
              ) : (
                // Any other file type — the browser renders whatever it
                // natively can inline (text, CSV, HTML, ...) and shows a
                // blank frame for formats it can't (e.g. .docx/.xlsx); the
                // Download button in the toolbar above is the fallback for
                // those rather than blocking the attempt outright.
                <div className="w-full h-full flex flex-col items-center gap-2">
                  <iframe
                    src={activeAttachment.url}
                    className="w-full h-full min-h-[780px] bg-white rounded-lg shadow-xl border border-slate-300"
                    title={activeAttachment.name}
                  />
                  <p className="text-[10px] text-slate-400 flex-shrink-0">
                    Nothing showing? Use Download in the toolbar above — this file type may not be viewable in-browser.
                  </p>
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
                  placeholder="Search bill or supplier..."
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
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-xs font-semibold text-slate-800 line-clamp-2 leading-tight min-w-0 pr-2">
                        Bill {bill.billNumber}
                        {bill.supplierName !== NO_DATA && ` from ${bill.supplierName}`}
                      </span>
                      <StatusBadge status={bill.status} size="xs" />
                    </div>

                    <div className="text-xs mt-2">
                      <div className="text-slate-400 text-[10px] mb-0.5">Total</div>
                      <span className="font-bold text-slate-800">{formatCurrency(bill.amount, bill.currencyCode)}</span>
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
                      {selectedBill.supplierName !== NO_DATA && ` from ${selectedBill.supplierName}`}
                    </h2>
                    <div className="text-xs text-slate-500 leading-relaxed">
                      Address<br />
                      {selectedBill.address}
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
                          <div className="flex flex-col items-end gap-2 w-full md:w-80">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApprove(selectedBill.id)}
                                disabled={actionPendingId === selectedBill.id}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
                              >
                                {actionPendingId === selectedBill.id && <Loader2 size={12} className="animate-spin" />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(selectedBill.id)}
                                disabled={actionPendingId === selectedBill.id}
                                className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                              >
                                {actionPendingId === selectedBill.id && <Loader2 size={12} className="animate-spin" />}
                                Reject
                              </button>
                            </div>

                            {/* Optional note sent as the `comment` field on
                                whichever action is taken, and added to the
                                audit trail — only shown while the bill is
                                still awaiting a decision. */}
                            <div className="w-full text-left">
                              <textarea
                                value={approvalComment}
                                onChange={(e) => setApprovalComment(e.target.value)}
                                disabled={actionPendingId === selectedBill.id}
                                placeholder="Add an optional comment..."
                                rows={2}
                                className="w-full text-xs text-slate-800 placeholder:text-slate-400 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#6692C5]/30 focus:border-[#6692C5] resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                              />
                              <p className="text-[10px] text-slate-400 mt-1">
                                Sent with your decision and added to this bill&apos;s audit trail. Leave blank to approve or reject without a comment.
                              </p>
                            </div>
                          </div>
                        </PermissionGuard>
                      )}
                    </div>
                  </div>
                </div>
              </div>

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
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs pt-3 border-t border-slate-100 mt-2">
                    <div>
                      <div className="text-slate-400 mb-1">Date</div>
                      <div className="text-slate-800 font-semibold">{selectedBill.issueDate}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Due Date</div>
                      <div className="text-slate-800 font-semibold">{selectedBill.dueDate}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Reference</div>
                      <div className="text-slate-800 font-semibold font-mono">{selectedBill.billNumber}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">PO Reference</div>
                      <div className="text-slate-800 font-semibold font-mono">
                        {selectedBill.reference ?? NO_DATA}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Currency</div>
                      <div className="text-slate-800 font-semibold">{selectedBill.currencyCode ?? NO_DATA}</div>
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
                                <Eye size={12} />
                                Preview
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
                      {workflowSteps.map((step, idx) => (
                        <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={cn(
                              'px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border',
                              step.status === 'active'
                                ? 'bg-[#6692C5] text-white border-[#6692C5] shadow-sm'
                                : step.status === 'completed'
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-white text-slate-400 border-slate-200 opacity-60'
                            )}
                          >
                            {step.status === 'completed' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#6692C5]" />
                            )}
                            {step.status === 'active' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                            {step.label}
                          </span>
                          {idx < workflowSteps.length - 1 && (
                            <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Approval condition: Any of{' '}
                      <span className="font-semibold text-slate-600">{approvalCondition}</span>
                    </p>
                    {(selectedBill.approvalStepName || selectedBill.decision) && (
                      <p className="text-xs text-slate-400 mt-1">
                        {selectedBill.approvalStepName && (
                          <>
                            Current step:{' '}
                            <span className="font-semibold text-slate-600">
                              {selectedBill.approvalStepName}
                              {selectedBill.approvalStage != null && ` (stage ${selectedBill.approvalStage})`}
                            </span>
                          </>
                        )}
                        {selectedBill.decision && (
                          <>
                            {selectedBill.approvalStepName && ' — '}
                            Decision:{' '}
                            <span className="font-semibold text-slate-600 capitalize">
                              {selectedBill.decision}
                            </span>
                            {selectedBill.decidedDate && ` on ${selectedBill.decidedDate}`}
                          </>
                        )}
                      </p>
                    )}
                  </div>
                )}
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
                ) : openAuditCard && selectedBill.auditTrail.length === 0 ? (
                  <div className="text-xs text-slate-400 py-2 italic">No activity recorded for this bill.</div>
                ) : openAuditCard ? (
                  <div className="relative pl-6 space-y-5 border-l-2 border-slate-100 ml-2 pt-1">
                    {selectedBill.auditTrail.map((ev) => {
                      // Comments fetched from the API carry `authorId`,
                      // compared here (at render time) against the current
                      // user rather than baked in at fetch time — the fetch
                      // is cached per bill, and `user` can still be loading
                      // when it first runs, so a comparison done then could
                      // go stale. Locally-created comments (one you just
                      // sent) set `isMine` directly instead, with no
                      // `authorId` to compare.
                      const isMine = ev.isMine || (!!ev.authorId && ev.authorId === user?.reference_id)

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
                          <div className="text-xs space-y-0.5">
                            <div className="font-medium text-slate-800">
                              {ev.user && <span className="font-semibold text-slate-900">{ev.user}: </span>}
                              {ev.title}
                            </div>
                            <div className="text-[10px] text-slate-400">{ev.date}</div>
                            {ev.notes && (
                              <div className="text-slate-500 bg-slate-50 border border-slate-100 p-2 rounded-lg mt-1 italic">
                                "{ev.notes}"
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
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              {bills.length === 0 ? 'No bills found.' : 'Select a bill from the left list to view details.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
