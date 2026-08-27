'use client'

import { useState, useMemo, useCallback } from 'react'
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
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { PermissionGuard } from '@/components/shared/permission-guard'
import { usePermission } from '@/lib/hooks/use-permission'
import { StatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/components/shared/toast'
import { cn } from '@/lib/utils'

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  account: string
  tax: string
  amount: number
}

interface AuditTrailEvent {
  id: string
  type: 'system' | 'xero' | 'action' | 'comment'
  title: string
  subtitle?: string
  date: string
  user?: string
  userAvatar?: string
  notes?: string
  isMine?: boolean // comment authored by the current user — right-aligned bubble
}

interface BillFile {
  id: string
  name: string
  sizeMb: number
  type: 'pdf' | 'image' | 'other'
  url: string
}

interface Bill {
  id: string
  billNumber: string
  supplierName: string
  address: string
  issueDate: string
  dueDate: string
  amount: number
  status: 'Pending Approval' | 'Approved' | 'Rejected'
  lineItems: LineItem[]
  approvers: { name: string; role: string; avatar?: string }[]
  auditTrail: AuditTrailEvent[]
  files: BillFile[]
}

// Ported from Resource/BillWorkspace2.tsx — maps a file's type/extension to
// the icon + colors the Files & Attachments card renders it with, and
// whether it's previewable inline vs. download-only.
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
    canPreview: false,
  }
}

const INITIAL_BILLS: Bill[] = [
  {
    id: 'b-3',
    billNumber: '0439149',
    supplierName: 'Queensland Sheet Metal & Roofing Supplies',
    address: '88 Magnesium Dr, Crestmead, QLD, 4132',
    issueDate: '18 Aug 2026',
    dueDate: '28 Aug 2026',
    amount: 4627.39,
    status: 'Pending Approval',
    lineItems: [
      {
        id: 'li-3',
        description: 'Custom corrugated steel roof sheets (0.48mm BMT)',
        quantity: 120.0,
        unitPrice: 35.0,
        account: '150 - Materials',
        tax: 'GST on Expenses (10%)',
        amount: 4206.72,
      },
    ],
    files: [
      {
        id: 'file-3',
        name: 'QBCC Level 2 and Consumer Guide - CS Security - AD Deposit.pdf',
        sizeMb: 0.3,
        type: 'pdf',
        url: '/bills-attachments/qbcc-level-2-consumer-guide.pdf',
      },
    ],
    approvers: [
      { name: 'Marcus Vance', role: 'Operations Admin' },
    ],
    auditTrail: [
      {
        id: 'at-5',
        type: 'xero',
        title: 'Pulled request from Xero',
        date: '18 Aug 2026, 08:00',
      },
      {
        id: 'at-6',
        type: 'xero',
        title: 'Bill submitted and matched to PO-9201-AH.',
        date: '18 Aug 2026, 14:12',
      },
      {
        id: 'at-6a',
        type: 'comment',
        title: 'Comment',
        user: 'Matthew Tutini',
        notes: 'Please double check the freight surcharge on this one before approving.',
        date: '18 Aug 2026, 15:05 via Web',
      },
      {
        id: 'at-6b',
        type: 'comment',
        title: 'Comment',
        user: 'Ryan Cotter',
        notes: 'Confirmed with the supplier — freight is already included in the unit price.',
        date: '18 Aug 2026, 15:22 via Web',
        isMine: true,
      },
    ],
  },
  {
    id: 'b-4',
    billNumber: 'BILL-2026-0894',
    supplierName: 'Timber & Framing Suppliers',
    address: '77 Boundary Rd, Coopers Plains, QLD, 4108',
    issueDate: '25 Jul 2026',
    dueDate: '24 Aug 2026',
    amount: 18250.00,
    status: 'Pending Approval',
    lineItems: [
      {
        id: 'li-4',
        description: 'MGP10 Treated Pine 90x45 (6.0m)',
        quantity: 250.0,
        unitPrice: 42.0,
        account: '150 - Materials',
        tax: 'GST on Expenses (10%)',
        amount: 10500.0,
      },
      {
        id: 'li-5',
        description: 'MGP10 Treated Pine 70x45 (5.4m)',
        quantity: 230.0,
        unitPrice: 31.0,
        account: '150 - Materials',
        tax: 'GST on Expenses (10%)',
        amount: 7130.0,
      },
    ],
    files: [
      {
        id: 'file-4a',
        name: 'QBCC Level 2 and Consumer Guide - CS Security - AD Deposit.pdf',
        sizeMb: 0.3,
        type: 'pdf',
        url: '/bills-attachments/qbcc-level-2-consumer-guide.pdf',
      },
      {
        id: 'file-4b',
        name: 'site-photo-delivery-docket.png',
        sizeMb: 0.19,
        type: 'image',
        url: '/bills-attachments/site-photo-delivery-docket.png',
      },
    ],
    approvers: [
      { name: 'Sarah Jenkins', role: 'Site Manager' },
    ],
    auditTrail: [
      {
        id: 'at-8b',
        type: 'xero',
        title: 'Pulled request from Xero',
        date: '25 Jul 2026, 09:00',
      },
      {
        id: 'at-7',
        type: 'system',
        title: 'Submitted for final approval by Site Manager.',
        date: '25 Jul 2026, 15:10',
      },
      {
        id: 'at-8',
        type: 'comment',
        title: 'Comment',
        user: 'Matthew Tutini',
        notes: 'Delivery docket matches the quantities on this bill — good to approve.',
        date: '25 Jul 2026, 15:20 via Web',
      },
      {
        id: 'at-8a',
        type: 'comment',
        title: 'Comment',
        user: 'Ryan Cotter',
        notes: 'Thanks for checking — approving now.',
        date: '25 Jul 2026, 15:31 via Web',
        isMine: true,
      },
    ],
  },
  {
    id: 'b-6',
    billNumber: 'BILL-2026-0893',
    supplierName: 'Metro Electrical Services',
    address: '99 Logan Rd, Woolloongabba, QLD, 4102',
    issueDate: '05 Aug 2026',
    dueDate: '04 Sep 2026',
    amount: 6720.50,
    status: 'Approved',
    lineItems: [
      {
        id: 'li-7',
        description: 'Electrical Conduit & Cable Roll (2.5mm)',
        quantity: 12.0,
        unitPrice: 185.0,
        account: '100 - Sub Contractor',
        tax: 'GST on Expenses (10%)',
        amount: 2220.0,
      },
    ],
    files: [],
    approvers: [],
    auditTrail: [
      {
        id: 'at-8c',
        type: 'xero',
        title: 'Pulled request from Xero',
        date: '05 Aug 2026, 09:00',
      },
      {
        id: 'at-9',
        type: 'action',
        title: 'Approved for payment',
        user: 'Alex Johnson',
        date: '06 Aug 2026, 10:05',
      },
      {
        id: 'at-9a',
        type: 'comment',
        title: 'Comment',
        user: 'Matthew Tutini',
        notes: 'Nice work getting this one through quickly.',
        date: '06 Aug 2026, 10:12 via Web',
      },
      {
        id: 'at-9b',
        type: 'comment',
        title: 'Comment',
        user: 'Ryan Cotter',
        notes: 'Cheers — all good on our end.',
        date: '06 Aug 2026, 10:15 via Web',
        isMine: true,
      },
    ],
  },
]

interface BillsWorkspaceProps {
  categoryFilter: 'approval' | 'all'
}

export function BillsWorkspace({ categoryFilter }: BillsWorkspaceProps) {
  const canApproveBills = usePermission('bill:approve')
  const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS)
  const [selectedBillId, setSelectedBillId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [commentText, setCommentText] = useState('')

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

  const toast = useToast()

  // Filter bills according to the category prop
  const filteredCategoryBills = useMemo(() => {
    return bills.filter((b) => {
      const matchesCategory = categoryFilter === 'approval' ? b.status === 'Pending Approval' : true

      const matchesSearch =
        b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.supplierName.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesCategory && matchesSearch
    })
  }, [bills, categoryFilter, searchQuery])

  // Select first bill in list if current selection is invalid
  const selectedBill = useMemo(() => {
    const found = filteredCategoryBills.find((b) => b.id === selectedBillId)
    if (found) return found
    return filteredCategoryBills[0] ?? null
  }, [filteredCategoryBills, selectedBillId])

  const activeAttachment = useMemo(() => {
    if (!selectedBill || !activeAttachmentId) return null
    return selectedBill.files.find((f) => f.id === activeAttachmentId) ?? null
  }, [selectedBill, activeAttachmentId])

  const activeTypeInfo = useMemo(
    () => (activeAttachment ? getFileTypeInfo(activeAttachment) : null),
    [activeAttachment]
  )

  const pageTitle = categoryFilter === 'approval' ? 'Requires my approval (all)' : 'All Bills'

  const pageDescription =
    categoryFilter === 'approval' ? 'Bills waiting on your approval' : 'View and manage all bills'

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(val)
  }

  // Handlers for bill workflow actions. Each bails out if the role lacks
  // bill:approve — enforced here (not just by hiding the button) since these
  // are the only two mutating actions Bills has left.
  const handleApprove = useCallback((id: string) => {
    if (!canApproveBills) return
    setBills((prev) =>
      prev.map((b) => {
        if (b.id === id) {
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
              },
            ],
          }
        }
        return b
      })
    )
    toast('Bill approved successfully!', 'success')
  }, [toast, canApproveBills])

  const handleReject = useCallback((id: string) => {
    if (!canApproveBills) return
    setBills((prev) =>
      prev.map((b) => {
        if (b.id === id) {
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
              },
            ],
          }
        }
        return b
      })
    )
    toast('Bill rejected', 'error')
  }, [toast, canApproveBills])

  const handleSendComment = useCallback(() => {
    if (!commentText.trim() || !selectedBill) return
    const nowStr = new Date().toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
    const newComment: AuditTrailEvent = {
      id: `at-${Date.now()}`,
      type: 'comment',
      title: 'Comment',
      user: 'Ryan Cotter',
      notes: commentText.trim(),
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
  }, [commentText, selectedBill, toast])

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

      {/* Main Workspace Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Either Bills List or Document Previewer (PDF / Image) */}
        {showLeftPreview ? (
          <div className="w-80 md:w-96 bg-slate-900/5 border-r border-slate-200 flex flex-col flex-shrink-0 h-full overflow-hidden relative">
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

              {/* Zoom & Action Controls */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {activeTypeInfo?.canPreview && (
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
                <button
                  type="button"
                  onClick={() => toast(`Downloading ${activeAttachment?.name || 'document'}...`, 'info')}
                  className="p-1.5 text-slate-500 hover:text-[#6692C5] hover:bg-[#6692C5]/10 rounded-lg transition-colors"
                  title="Download File"
                >
                  <Download size={14} />
                </button>
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

            {/* Document Render Canvas */}
            <div className="flex-1 overflow-auto p-4 flex justify-center bg-slate-200/60">
              {!activeAttachment || !activeTypeInfo ? (
                <div className="m-auto text-xs text-slate-400">No document available to preview</div>
              ) : !activeTypeInfo.canPreview ? (
                <div className="m-auto flex flex-col items-center justify-center p-6 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 border border-amber-100">
                    <activeTypeInfo.icon size={28} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Preview Not Available</h3>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    <strong className="text-slate-700 font-mono">{activeAttachment.name}</strong> can&apos;t be previewed inline. Only PDF and image files are supported.
                  </p>
                  <button
                    type="button"
                    onClick={() => toast(`Downloading ${activeAttachment.name}...`, 'info')}
                    className="px-4 py-2 bg-[#6692C5] hover:bg-[#4F7CB3] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Download size={13} />
                    Download File
                  </button>
                </div>
              ) : activeTypeInfo.icon === ImageIcon ? (
                <div
                  style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: 'top center' }}
                  className="w-full flex flex-col items-center transition-transform duration-150"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeAttachment.url}
                    alt={activeAttachment.name}
                    className="max-w-full h-auto rounded-lg shadow-xl border border-slate-300 object-contain bg-white"
                  />
                </div>
              ) : (
                <div
                  style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: 'top center' }}
                  className="w-full min-h-[780px] flex flex-col items-center transition-transform duration-150"
                >
                  <iframe
                    src={`${activeAttachment.url}#toolbar=0&navpanes=0`}
                    className="w-full h-full min-h-[780px] bg-white rounded-lg shadow-xl border border-slate-300"
                    title={activeAttachment.name}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
        <div className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-full overflow-hidden">
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
              {filteredCategoryBills.length}
            </span>
          </div>

          {/* List items for this category */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredCategoryBills.length === 0 ? (
              <div className="px-4 py-12 text-center text-xs text-slate-400">
                No bills found for this view
              </div>
            ) : (
              filteredCategoryBills.map((bill) => (
                <div
                  key={bill.id}
                  onClick={() => setSelectedBillId(bill.id)}
                  className={cn(
                    'p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50',
                    selectedBill?.id === bill.id
                      ? 'bg-[#6692C5]/10 border-l-4 border-[#6692C5] shadow-xs'
                      : 'bg-white'
                  )}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-xs font-semibold text-slate-800 line-clamp-2 leading-tight min-w-0 pr-2">
                      Bill {bill.billNumber} from {bill.supplierName}
                    </span>
                    <StatusBadge status={bill.status} size="xs" />
                  </div>

                  <div className="text-xs mt-2">
                    <span className="font-bold text-slate-800">{formatCurrency(bill.amount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        )}

        {/* Right Detail Workspace */}
        <div className="flex-1 bg-slate-50 overflow-y-auto p-4 md:p-6 space-y-5">
          {selectedBill ? (
            <div className="space-y-5">
              {/* Header Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1 max-w-xl">
                    <h2 className="text-lg font-bold text-slate-800">
                      Bill {selectedBill.billNumber} from {selectedBill.supplierName}
                    </h2>
                    <div className="text-xs text-slate-500 leading-relaxed">
                      Address<br />
                      {selectedBill.address}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-slate-800">
                        {formatCurrency(selectedBill.amount)}
                      </span>
                      <StatusBadge status={selectedBill.status} />
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedBill.status === 'Pending Approval' && (
                        <PermissionGuard action="bill:approve">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApprove(selectedBill.id)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(selectedBill.id)}
                              className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors"
                            >
                              Reject
                            </button>
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-3 border-t border-slate-100 mt-2">
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
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Unit Price</th>
                        <th className="px-4 py-3">Account</th>
                        <th className="px-4 py-3">Tax</th>
                        <th className="px-4 py-3 text-right">Amount AUD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedBill.lineItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-800">{item.description}</td>
                          <td className="px-4 py-3 text-right">{item.quantity.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-3">{item.account}</td>
                          <td className="px-4 py-3">{item.tax}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <div className="w-full sm:w-64 text-xs space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                    <div className="text-slate-400 text-[11px] mb-1 italic">Amounts are Tax Exclusive</div>
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 pb-2 border-b border-slate-200">
                      <span>GST on Expenses (10%):</span>
                      <span>{formatCurrency(gstTax)}</span>
                    </div>
                    <div className="flex justify-between pt-1 font-bold text-slate-800 text-sm">
                      <span>Total:</span>
                      <span className="text-[#6692C5]">{formatCurrency(totalAmount)}</span>
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
                    {selectedBill.files.length === 0 ? (
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
                              onClick={() => {
                                setActiveAttachmentId(file.id)
                                setPdfZoom(100)
                                setShowLeftPreview(true)
                                toast(
                                  fInfo.canPreview
                                    ? `Loaded ${file.name} on left side`
                                    : `${file.name} cannot be previewed in browser`,
                                  'info'
                                )
                              }}
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
                              {fInfo.canPreview ? (
                                <button
                                  type="button"
                                  className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 group-hover:bg-[#6692C5] group-hover:text-white group-hover:border-[#6692C5] rounded-lg text-xs font-medium flex items-center gap-1 shadow-xs transition-colors flex-shrink-0"
                                >
                                  <Eye size={12} />
                                  Preview
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="px-2.5 py-1 bg-white border border-slate-200 text-slate-400 group-hover:border-amber-400 group-hover:text-amber-700 rounded-lg text-xs font-medium flex items-center gap-1 shadow-xs transition-colors flex-shrink-0"
                                >
                                  <Download size={12} />
                                  Download
                                </button>
                              )}
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

                {openAuditCard && (
                  <div className="relative pl-6 space-y-5 border-l-2 border-slate-100 ml-2 pt-1">
                    {selectedBill.auditTrail.map((ev) => (
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
                              ev.isMine
                                ? 'flex-row-reverse ml-auto bg-[#6692C5]/10 border-[#6692C5]/20'
                                : 'bg-slate-50 border-slate-100'
                            )}
                          >
                            <div
                              className={cn(
                                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                                ev.isMine ? 'bg-[#6692C5] text-white' : 'bg-[#6692C5]/20 text-[#6692C5]'
                              )}
                            >
                              {ev.user?.[0] ?? 'U'}
                            </div>
                            <div className="flex-1 text-xs">
                              <div
                                className={cn(
                                  'flex items-center justify-between mb-1',
                                  ev.isMine && 'flex-row-reverse'
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
                    ))}
                  </div>
                )}
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
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#6692C5]/30 focus:border-[#6692C5]"
                  />
                  <button
                    type="button"
                    onClick={() => toast('Attachment feature available soon', 'info')}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Paperclip size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={handleSendComment}
                    className="px-4 py-2.5 bg-[#6692C5] hover:bg-[#4F7CB3] text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Send size={13} />
                    Send
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Select a bill from the left list to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
