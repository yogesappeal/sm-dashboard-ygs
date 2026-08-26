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
  ClipboardList,
  MessageSquare,
  CheckCircle2,
  XCircle,
  HelpCircle,
  History,
  ChevronDown,
  ChevronUp,
  Edit2,
  Eye,
  ExternalLink,
  Paperclip,
  Send,
  User,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
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
}

interface Bill {
  id: string
  billNumber: string
  supplierName: string
  poNumber: string
  address: string
  issueDate: string
  dueDate: string
  amount: number
  status: 'ON REVIEW' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Revision Requested'
  category: 'review' | 'approval' | 'all'
  createdIn: string
  company: string
  lineItems: LineItem[]
  approvers: { name: string; role: string; avatar?: string }[]
  auditTrail: AuditTrailEvent[]
}

const INITIAL_BILLS: Bill[] = [
  {
    id: 'b-1',
    billNumber: 'INV0163',
    supplierName: 'Cody Gold Roof Plumbing Services',
    poNumber: 'PO-4820-AH',
    address: '121 Jubilee Ave, Forest Lake, QLD, 4078',
    issueDate: '24 Aug 2026',
    dueDate: '31 Aug 2026',
    amount: 1171.50,
    status: 'ON REVIEW',
    category: 'review',
    createdIn: 'Created in Xero',
    company: 'AusHail',
    lineItems: [
      {
        id: 'li-1',
        description: 'Roof plumbing repair & flashing maintenance service',
        quantity: 1.0,
        unitPrice: 1065.0,
        account: '100 - Sub Contractor',
        tax: 'GST on Expenses (10%)',
        amount: 1065.0,
      },
    ],
    approvers: [
      { name: 'Sarah Jenkins', role: 'Site Manager' },
      { name: 'Marcus Vance', role: 'Operations Lead' },
    ],
    auditTrail: [
      {
        id: 'at-1',
        type: 'xero',
        title: 'Pulled request from Xero.',
        date: '12 Aug 2026, 10:18',
      },
      {
        id: 'at-2',
        type: 'system',
        title: 'This request has been updated in Xero and thus the workflow has been restarted.',
        date: '24 Aug 2026, 10:39',
      },
      {
        id: 'at-3',
        type: 'action',
        title: 'Started over approval workflow for this request',
        user: 'Ely Novy',
        date: '21 Aug 2026, 15:15 via Web',
      },
      {
        id: 'at-4',
        type: 'comment',
        title: 'Comment',
        user: 'Ely Novy',
        notes: 'Here is the updated one, can you do a quick check? Matthew Tutini',
        date: '24 Aug 2026, 11:00 via Web',
      },
    ],
  },
  {
    id: 'b-2',
    billNumber: '22101',
    supplierName: 'Australis Safety Rail Pty Ltd',
    poNumber: 'PO-3918-AH',
    address: '45 Industrial Pkwy, Wacol, QLD, 4076',
    issueDate: '20 Aug 2026',
    dueDate: '30 Aug 2026',
    amount: 2851.20,
    status: 'ON REVIEW',
    category: 'review',
    createdIn: 'Created in Xero',
    company: 'AusHail',
    lineItems: [
      {
        id: 'li-2',
        description: 'Perimeter safety rail hire and installation for roof perimeter',
        quantity: 1.0,
        unitPrice: 2592.0,
        account: '200 - Safety Equipment',
        tax: 'GST on Expenses (10%)',
        amount: 2592.0,
      },
    ],
    approvers: [
      { name: 'Alex Johnson', role: 'Operations' },
    ],
    auditTrail: [
      {
        id: 'at-5',
        type: 'xero',
        title: 'Imported bill 22101 from Xero Integration.',
        date: '20 Aug 2026, 09:30',
      },
    ],
  },
  {
    id: 'b-3',
    billNumber: '0439149',
    supplierName: 'Queensland Sheet Metal & Roofing Supplies',
    poNumber: 'PO-9201-AH',
    address: '88 Magnesium Dr, Crestmead, QLD, 4132',
    issueDate: '18 Aug 2026',
    dueDate: '28 Aug 2026',
    amount: 4627.39,
    status: 'Pending Approval',
    category: 'approval',
    createdIn: 'Created in Xero',
    company: 'AusHail',
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
    approvers: [
      { name: 'Marcus Vance', role: 'Operations Admin' },
    ],
    auditTrail: [
      {
        id: 'at-6',
        type: 'xero',
        title: 'Bill submitted and matched to PO-9201-AH.',
        date: '18 Aug 2026, 14:12',
      },
    ],
  },
  {
    id: 'b-4',
    billNumber: 'BILL-2026-0894',
    supplierName: 'Timber & Framing Suppliers',
    poNumber: 'PO-1029-AH',
    address: '77 Boundary Rd, Coopers Plains, QLD, 4108',
    issueDate: '25 Jul 2026',
    dueDate: '24 Aug 2026',
    amount: 18250.00,
    status: 'Pending Approval',
    category: 'approval',
    createdIn: 'Created in Xero',
    company: 'AusHail',
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
    approvers: [
      { name: 'Sarah Jenkins', role: 'Site Manager' },
    ],
    auditTrail: [
      {
        id: 'at-7',
        type: 'system',
        title: 'Submitted for final approval by Site Manager.',
        date: '25 Jul 2026, 15:10',
      },
    ],
  },
  {
    id: 'b-5',
    billNumber: 'BILL-2026-0895',
    supplierName: 'A1 Plumbing Supplies',
    poNumber: 'PO-5510-AH',
    address: '12 Commercial Rd, Acacia Ridge, QLD, 4110',
    issueDate: '08 Aug 2026',
    dueDate: '07 Sep 2026',
    amount: 4120.00,
    status: 'Revision Requested',
    category: 'all',
    createdIn: 'Created in Xero',
    company: 'AusHail',
    lineItems: [
      {
        id: 'li-6',
        description: 'PVC Pipe 100mm DWV (6m length)',
        quantity: 40.0,
        unitPrice: 68.0,
        account: '100 - Sub Contractor',
        tax: 'GST on Expenses (10%)',
        amount: 2720.0,
      },
    ],
    approvers: [],
    auditTrail: [
      {
        id: 'at-8',
        type: 'action',
        title: 'Revision Requested',
        user: 'Marcus Smith',
        date: '10 Aug 2026, 16:30',
        notes: 'Quantities delivered on site do not match invoice.',
      },
    ],
  },
  {
    id: 'b-6',
    billNumber: 'BILL-2026-0893',
    supplierName: 'Metro Electrical Services',
    poNumber: 'PO-9201-AH',
    address: '99 Logan Rd, Woolloongabba, QLD, 4102',
    issueDate: '05 Aug 2026',
    dueDate: '04 Sep 2026',
    amount: 6720.50,
    status: 'Approved',
    category: 'all',
    createdIn: 'Created in Xero',
    company: 'AusHail',
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
    approvers: [],
    auditTrail: [
      {
        id: 'at-9',
        type: 'action',
        title: 'Approved for payment',
        user: 'Alex Johnson',
        date: '06 Aug 2026, 10:05',
      },
    ],
  },
]

interface BillsWorkspaceProps {
  categoryFilter: 'review' | 'approval' | 'all'
}

export function BillsWorkspace({ categoryFilter }: BillsWorkspaceProps) {
  const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS)
  const [selectedBillId, setSelectedBillId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddressMore, setShowAddressMore] = useState(false)
  const [commentText, setCommentText] = useState('')

  // Accordion state for Right Detail sections
  const [openDetailsCard, setOpenDetailsCard] = useState(true)
  const [openWorkflowCard, setOpenWorkflowCard] = useState(true)
  const [openAuditCard, setOpenAuditCard] = useState(true)

  const toast = useToast()

  // Filter bills according to the category prop
  const filteredCategoryBills = useMemo(() => {
    return bills.filter((b) => {
      let matchesCategory = true
      if (categoryFilter === 'review') {
        matchesCategory = b.status === 'ON REVIEW'
      } else if (categoryFilter === 'approval') {
        matchesCategory = b.status === 'Pending Approval'
      }

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

  const pageTitle =
    categoryFilter === 'review'
      ? 'Requires my review (all)'
      : categoryFilter === 'approval'
      ? 'Requires my approval (all)'
      : 'All Bills'

  const pageDescription =
    categoryFilter === 'review'
      ? 'Bills waiting on your review before they can be submitted for approval'
      : categoryFilter === 'approval'
      ? 'Bills waiting on your approval'
      : 'View and manage all bills'

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(val)
  }

  // Handlers for bill workflow actions
  const handleApprove = useCallback((id: string) => {
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
  }, [toast])

  const handleSubmitForApproval = useCallback((id: string) => {
    setBills((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const nowStr = new Date().toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
          return {
            ...b,
            status: 'Pending Approval',
            auditTrail: [
              ...b.auditTrail,
              {
                id: `at-${Date.now()}`,
                type: 'action',
                title: 'Submitted for manager approval',
                user: 'Current User',
                date: `${nowStr} via Web`,
              },
            ],
          }
        }
        return b
      })
    )
    toast('Submitted for approval!', 'info')
  }, [toast])

  const handleReject = useCallback((id: string) => {
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
  }, [toast])

  const handleSendComment = useCallback(() => {
    if (!commentText.trim() || !selectedBill) return
    const nowStr = new Date().toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
    const newComment: AuditTrailEvent = {
      id: `at-${Date.now()}`,
      type: 'comment',
      title: 'Comment',
      user: 'Current User',
      notes: commentText.trim(),
      date: `${nowStr} via Web`,
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

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      <div className="flex-shrink-0">
        <PageHeader title={pageTitle} description={pageDescription} />
      </div>

      {/* Main Workspace Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Contextual Left List Pane */}
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
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                        X
                      </div>
                      <span className="text-xs font-semibold text-slate-800 line-clamp-2 leading-tight">
                        Bill {bill.billNumber} from {bill.supplierName}
                      </span>
                    </div>
                    <StatusBadge status={bill.status} />
                  </div>

                  <div className="pl-7 flex justify-between items-center text-xs mt-2">
                    <span className="font-bold text-slate-800">{formatCurrency(bill.amount)}</span>
                    <span className="text-[11px] text-slate-400 font-medium">{bill.company}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

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
                    <button
                      onClick={() => setShowAddressMore((prev) => !prev)}
                      className="text-xs text-[#6692C5] font-medium flex items-center gap-1 hover:underline mt-1"
                    >
                      {showAddressMore ? 'View less' : 'View more'}
                      <ChevronDown
                        size={14}
                        className={cn('transition-transform', showAddressMore && 'rotate-180')}
                      />
                    </button>
                    {showAddressMore && (
                      <div className="pt-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                        <p><span className="font-semibold text-slate-700">PO Ref:</span> {selectedBill.poNumber}</p>
                        <p><span className="font-semibold text-slate-700">Company:</span> {selectedBill.company}</p>
                      </div>
                    )}
                  </div>

                  <div className="text-right flex flex-col items-end gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-slate-800">
                        {formatCurrency(selectedBill.amount)}
                      </span>
                      <StatusBadge status={selectedBill.status} />
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedBill.status === 'ON REVIEW' && (
                        <button
                          onClick={() => handleSubmitForApproval(selectedBill.id)}
                          className="px-3.5 py-1.5 bg-[#6692C5] hover:bg-[#4F7CB3] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                        >
                          Submit for approval
                        </button>
                      )}

                      {selectedBill.status === 'Pending Approval' && (
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
                      )}

                      <button
                        onClick={() => toast('Edit feature coming soon', 'info')}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <Edit2 size={13} />
                        Edit
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                    X
                  </div>
                  <span>{selectedBill.createdIn} ({selectedBill.company})</span>
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

                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
                  <button
                    onClick={() => toast('Opening Xero link...', 'info')}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    Open in Xero
                    <ExternalLink size={13} />
                  </button>

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
                    <div className="border border-[#6692C5]/30 bg-[#6692C5]/5 rounded-xl p-3.5 inline-block min-w-[240px]">
                      <div className="flex justify-between items-center mb-2 text-xs">
                        <span className="font-semibold text-slate-700">Review & Approval Step</span>
                        <span className="text-[10px] font-bold uppercase text-[#6692C5] bg-[#6692C5]/10 px-2 py-0.5 rounded">
                          Active
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedBill.approvers.map((appr, i) => (
                          <div
                            key={i}
                            className="w-7 h-7 rounded-full bg-[#6692C5] text-white flex items-center justify-center text-xs font-bold ring-2 ring-white"
                            title={`${appr.name} (${appr.role})`}
                          >
                            {appr.name[0]}
                          </div>
                        ))}
                        {selectedBill.approvers.length === 0 && (
                          <span className="text-xs text-slate-400 italic">No assigned approvers</span>
                        )}
                      </div>
                    </div>
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
                        {/* Timeline Bullet */}
                        <div className="absolute -left-[31px] top-0.5 w-5 h-5 rounded-full bg-white border-2 border-[#6692C5] flex items-center justify-center text-[9px] font-bold text-[#6692C5]">
                          {ev.type === 'xero' ? 'X' : '✓'}
                        </div>

                        {ev.type === 'comment' ? (
                          <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="w-7 h-7 rounded-full bg-[#6692C5]/20 text-[#6692C5] flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {ev.user?.[0] ?? 'U'}
                            </div>
                            <div className="flex-1 text-xs">
                              <div className="flex justify-between items-center mb-1">
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
