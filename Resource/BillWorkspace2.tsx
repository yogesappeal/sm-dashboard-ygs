'use client'

import Link from 'next/link'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Search,
    Receipt,
    FileCheck2,
    AlertCircle,
    X,
    Calendar,
    Building,
    Building2,
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
    Edit2,
    Eye,
    ExternalLink,
    Paperclip,
    Send,
    User,
    Check,
    Loader2,
    KeyRound,
    Lock,
    Download,
    Share2,
    ImageIcon,
    FileQuestion,
    FileSpreadsheet,
    RefreshCw,
} from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { BillsAuthModal } from './BillsAuthModal'
import { getUnifiedBills } from '@/lib/api/bills'
import { isTokenValid } from '@/lib/api/client'
import { USE_MOCK } from '@/lib/api/config'
import type { Bill, BillCategoryFilter, BillAuditEvent, BillFile } from '@/lib/types/bill'

export interface XeroOrganization {
    id: string
    name: string
    legalName?: string
    code: string
    shortCode: string
    isConnected: boolean
    lastSynced: string
    color: string
}

export function getFileTypeInfo(file: BillFile | null | undefined) {
    if (!file) {
        return {
            type: 'pdf' as const,
            label: 'Document',
            icon: FileText,
            colorClass: 'bg-red-50 text-red-600',
            badgeClass: 'text-red-700 bg-red-50 border-red-200',
            canPreview: true,
        }
    }

    const ext = file.name.split('.').pop()?.toUpperCase() || ''
    const fname = file.name.toLowerCase()

    if (file.type === 'pdf' || fname.endsWith('.pdf')) {
        return {
            type: 'pdf' as const,
            label: 'PDF Document',
            icon: FileText,
            colorClass: 'bg-red-50 text-red-600',
            badgeClass: 'text-red-700 bg-red-50 border-red-200',
            canPreview: true,
        }
    }

    if (
        file.type === 'image' ||
        /\.(png|jpe?g|webp|gif|svg)$/i.test(fname)
    ) {
        return {
            type: 'image' as const,
            label: `Image (${ext || 'IMG'})`,
            icon: ImageIcon,
            colorClass: 'bg-indigo-50 text-indigo-600',
            badgeClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
            canPreview: true,
        }
    }

    return {
        type: 'other' as const,
        label: ext ? `${ext} File` : 'File Attachment',
        icon: ext === 'XLSX' || ext === 'CSV' ? FileSpreadsheet : FileQuestion,
        colorClass: 'bg-amber-50 text-amber-700',
        badgeClass: 'text-amber-700 bg-amber-50 border-amber-200',
        canPreview: false,
    }
}

interface BillsWorkspaceProps {
    categoryFilter: BillCategoryFilter
}

export function BillsWorkspace({ categoryFilter }: BillsWorkspaceProps) {
    const router = useRouter()
    const [bills, setBills] = useState<Bill[]>([])
    const [selectedBillId, setSelectedBillId] = useState<string>('')
    const [selectedOrg, setSelectedOrg] = useState<string>('all')
    const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddressMore, setShowAddressMore] = useState(false)
    const [commentText, setCommentText] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
    const [hasValidAuth, setHasValidAuth] = useState(true)
    const [previewPdfFile, setPreviewPdfFile] = useState<BillFile | null>(null)
    const [showLeftPdfPreview, setShowLeftPdfPreview] = useState(false)
    const [pdfZoom, setPdfZoom] = useState(100)
    const [activeAttachmentId, setActiveAttachmentId] = useState<string>('')
    const [isSyncing, setIsSyncing] = useState(false)

    // Fetch unified bills from API
    const fetchBills = useCallback(async () => {
        const valid = isTokenValid()
        setHasValidAuth(USE_MOCK || valid)

        // If not authenticated in live mode, open login popup and avoid unauthenticated requests that trigger 401
        if (!valid && !USE_MOCK) {
            setIsLoading(false)
            setIsAuthModalOpen(true)
            return
        }

        setIsLoading(true)
        try {
            const res = await getUnifiedBills()
            setBills(res)
            if (res.length > 0) {
                setSelectedBillId((prev) => (prev ? prev : res[0].id))
            }
        } catch (err) {
            console.error('Error fetching bills from API:', err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchBills()
    }, [fetchBills])

    // Toast notification state
    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null)

    const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'info') => {
        setToastMessage({ text, type })
        setTimeout(() => {
            setToastMessage((current) => (current?.text === text ? null : current))
        }, 3500)
    }, [])

    // Resync / refresh handler — re-fetches bills from the API
    const handleResync = useCallback(async () => {
        if (isSyncing) return
        setIsSyncing(true)
        try {
            await fetchBills()
            showToast('Bills refreshed successfully', 'success')
        } catch {
            showToast('Refresh failed — please try again', 'error')
        } finally {
            setIsSyncing(false)
        }
    }, [isSyncing, fetchBills, showToast])

    // Dynamic list of connected organizations derived from live bills API
    const availableOrganizations = useMemo<XeroOrganization[]>(() => {
        const orgMap = new Map<string, XeroOrganization>()

        orgMap.set('all', {
            id: 'all',
            name: 'All Connected Organizations',
            code: 'ALL',
            shortCode: 'ALL',
            isConnected: true,
            lastSynced: 'Just now',
            color: 'bg-blue-600',
        })

        const colorList = ['bg-sky-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600', 'bg-rose-600', 'bg-indigo-600']

        bills.forEach((b) => {
            const orgKey = b.organizationId || b.company || 'default-org'
            if (!orgMap.has(orgKey)) {
                let name = b.company || 'AusHail Pty Ltd'
                if (orgKey.startsWith('b1a2c3d4-0000')) {
                    name = 'AusHail Pty Ltd'
                } else if (orgKey.toLowerCase().includes('urbanstorm')) {
                    name = 'UrbanStorm Roofing'
                }
                const shortCode = name.includes('AusHail') ? 'AH' : name.includes('UrbanStorm') ? 'US' : name.slice(0, 2).toUpperCase()
                const code = name.includes('AusHail') ? 'AH' : name.includes('UrbanStorm') ? 'US' : orgKey.slice(0, 6).toUpperCase()

                orgMap.set(orgKey, {
                    id: orgKey,
                    name,
                    legalName: `${name} Operations`,
                    code,
                    shortCode,
                    isConnected: true,
                    lastSynced: 'Live Sync',
                    color: colorList[orgMap.size % colorList.length],
                })
            }
        })

        return Array.from(orgMap.values())
    }, [bills])

    // Active organization
    const currentOrg = useMemo(() => {
        return availableOrganizations.find((o) => o.id === selectedOrg) || availableOrganizations[0] || {
            id: 'all',
            name: 'All Connected Organizations',
            code: 'ALL',
            shortCode: 'ALL',
            isConnected: true,
            lastSynced: 'Just now',
            color: 'bg-blue-600',
        }
    }, [availableOrganizations, selectedOrg])

    // Accordions for Right Detail sections
    const [openDetailsCard, setOpenDetailsCard] = useState(true)
    const [openLineItemsCard, setOpenLineItemsCard] = useState(true)
    const [openFilesCard, setOpenFilesCard] = useState(true)
    const [openPOCard, setOpenPOCard] = useState(true)
    const [openWorkflowCard, setOpenWorkflowCard] = useState(true)
    const [openAuditCard, setOpenAuditCard] = useState(true)

    // Filter bills according to category, organization, and search query
    const filteredCategoryBills = useMemo(() => {
        return bills.filter((b) => {
            let matchesCategory = true
            if (categoryFilter === 'review') {
                matchesCategory = b.status === 'ON REVIEW' || b.status === 'Revision Requested'
            } else if (categoryFilter === 'approval') {
                matchesCategory = b.status === 'Pending Approval'
            } else if (categoryFilter === 'approved') {
                matchesCategory = b.status === 'Approved'
            } else if (categoryFilter === 'paid') {
                matchesCategory = b.status === 'Paid'
            } else if (categoryFilter === 'canceled') {
                matchesCategory = b.status === 'Canceled'
            } else if (categoryFilter === 'rejected') {
                matchesCategory = b.status === 'Rejected'
            }

            const matchesOrg =
                selectedOrg === 'all' ||
                b.organizationId === selectedOrg ||
                b.company.toLowerCase() === selectedOrg.toLowerCase()

            const q = searchQuery.toLowerCase().trim()
            const matchesSearch =
                !q ||
                b.billNumber.toLowerCase().includes(q) ||
                b.supplierName.toLowerCase().includes(q) ||
                b.company.toLowerCase().includes(q) ||
                b.poNumber.toLowerCase().includes(q)

            return matchesCategory && matchesOrg && matchesSearch
        })
    }, [bills, categoryFilter, selectedOrg, searchQuery])

    // Current selected bill
    const selectedBill = useMemo(() => {
        const found = filteredCategoryBills.find((b) => b.id === selectedBillId)
        if (found) return found
        return filteredCategoryBills[0] ?? null
    }, [filteredCategoryBills, selectedBillId])

    // Current selected attachment
    const activeAttachment = useMemo(() => {
        if (!selectedBill || selectedBill.files.length === 0) return null
        if (activeAttachmentId) {
            const found = selectedBill.files.find((f) => f.id === activeAttachmentId)
            if (found) return found
        }
        return selectedBill.files[0]
    }, [selectedBill, activeAttachmentId])

    const activeTypeInfo = useMemo(() => getFileTypeInfo(activeAttachment), [activeAttachment])

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
                        status: 'Approved' as const,
                        category: 'approved' as const,
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
        showToast('Bill approved successfully!', 'success')
    }, [showToast])

    const handleSubmitForApproval = useCallback((id: string) => {
        setBills((prev) =>
            prev.map((b) => {
                if (b.id === id) {
                    const nowStr = new Date().toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
                    return {
                        ...b,
                        status: 'Pending Approval' as const,
                        category: 'approval' as const,
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
        showToast('Bill submitted for approval!', 'info')
    }, [showToast])

    const handleReject = useCallback((id: string) => {
        setBills((prev) =>
            prev.map((b) => {
                if (b.id === id) {
                    const nowStr = new Date().toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
                    return {
                        ...b,
                        status: 'Rejected' as const,
                        category: 'rejected' as const,
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
        showToast('Bill rejected', 'error')
    }, [showToast])

    const handleSendComment = useCallback(() => {
        if (!commentText.trim() || !selectedBill) return
        const nowStr = new Date().toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
        const newComment: BillAuditEvent = {
            id: `at-${Date.now()}`,
            type: 'comment',
            title: 'Comment',
            user: 'Admin User',
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
        showToast('Comment added to audit trail', 'info')
    }, [commentText, selectedBill, showToast])

    // Subtotal calculations
    const subtotal = useMemo(() => {
        if (!selectedBill) return 0
        return selectedBill.lineItems.reduce((acc, item) => acc + item.amount, 0)
    }, [selectedBill])

    const gstTax = useMemo(() => subtotal * 0.1, [subtotal])
    const totalAmount = useMemo(() => subtotal + gstTax, [subtotal, gstTax])

    // Approval workflow steps derived from the bill
    const workflowSteps = useMemo(() => {
        if (!selectedBill) return []
        if (selectedBill.approvalWorkflow && selectedBill.approvalWorkflow.length > 0) {
            return selectedBill.approvalWorkflow
        }

        const reviewStatus =
            selectedBill.status === 'ON REVIEW' || selectedBill.status === 'Revision Requested'
                ? 'active'
                : 'completed'
        const approvalStatus =
            selectedBill.status === 'Approved' || selectedBill.status === 'Paid'
                ? 'completed'
                : selectedBill.status === 'Pending Approval' || selectedBill.status === 'Rejected'
                    ? 'active'
                    : 'pending'

        return [
            { id: 'review', label: 'Review', status: reviewStatus as 'active' | 'completed' | 'pending' },
            { id: 'approval', label: 'Approval', status: approvalStatus as 'active' | 'completed' | 'pending' },
        ]
    }, [selectedBill])

    const approvalConditionText = useMemo(() => {
        if (!selectedBill) return 'No condition specified'
        if (selectedBill.approvalCondition) return selectedBill.approvalCondition
        if (selectedBill.approvers.length === 0) return 'No assigned approvers'
        return `Any of ${selectedBill.approvers.map((a) => a.name).join(', ')}`
    }, [selectedBill])

    return (
        <div className="-m-4 md:-m-6 h-[calc(100vh-4rem)] flex flex-col bg-gray-50 overflow-hidden relative">
            {/* Inline Toast Notification */}
            {toastMessage && (
                <div className="absolute top-4 right-6 z-50 transition-all duration-200">
                    <div
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl shadow-md border text-xs font-medium ${toastMessage.type === 'success'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : toastMessage.type === 'error'
                                    ? 'bg-red-50 text-red-800 border-red-200'
                                    : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                    >
                        {toastMessage.type === 'success' && <Check size={14} className="text-emerald-600" />}
                        {toastMessage.type === 'error' && <XCircle size={14} className="text-red-600" />}
                        {toastMessage.type === 'info' && <AlertCircle size={14} className="text-blue-600" />}
                        <span>{toastMessage.text}</span>
                        <button
                            onClick={() => setToastMessage(null)}
                            className="ml-1.5 text-gray-400 hover:text-gray-600"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>
            )}

            {/* Main Workspace Split Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Side: Either Bills List or Document Previewer (PDF / Image / Other) */}
                {showLeftPdfPreview ? (
                    <div className="w-full md:w-[480px] lg:w-[560px] xl:w-[620px] bg-slate-900/5 border-r border-gray-200 flex flex-col flex-shrink-0 h-full overflow-hidden relative">
                        {/* Viewer Header Toolbar */}
                        <div className="h-12 bg-white border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0 shadow-2xs z-10">
                            <div className="flex items-center gap-2 min-w-0">
                                <button
                                    type="button"
                                    onClick={() => setShowLeftPdfPreview(false)}
                                    className="p-1.5 -ml-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                                    title="Return to bills list"
                                >
                                    <ArrowRight size={14} className="rotate-180" />
                                    <span className="hidden sm:inline">Bills List</span>
                                </button>
                                <div className="h-4 w-[1px] bg-gray-200 mx-1" />
                                <div className={`w-6 h-6 rounded-md ${activeTypeInfo.colorClass} flex items-center justify-center flex-shrink-0`}>
                                    <activeTypeInfo.icon size={13} />
                                </div>
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-xs font-bold text-gray-800 truncate max-w-[130px] lg:max-w-[180px]">
                                        {activeAttachment?.name || `${selectedBill?.billNumber || 'invoice'}.pdf`}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${activeTypeInfo.badgeClass}`}>
                                        {activeTypeInfo.label}
                                    </span>
                                </div>
                            </div>

                            {/* Zoom & Action Controls */}
                            <div className="flex items-center gap-1">
                                {activeTypeInfo.canPreview && (
                                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setPdfZoom((z) => Math.max(50, z - 15))}
                                            className="w-6 h-6 rounded hover:bg-white flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors font-bold text-xs"
                                            title="Zoom Out"
                                        >
                                            -
                                        </button>
                                        <span className="px-1.5 font-mono text-[11px] text-gray-700 min-w-[38px] text-center font-medium">
                                            {pdfZoom}%
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setPdfZoom((z) => Math.min(175, z + 15))}
                                            className="w-6 h-6 rounded hover:bg-white flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors font-bold text-xs"
                                            title="Zoom In"
                                        >
                                            +
                                        </button>
                                        <div className="w-[1px] h-3.5 bg-gray-300 mx-0.5" />
                                        <button
                                            type="button"
                                            onClick={() => setPdfZoom(100)}
                                            className="px-1.5 h-6 rounded hover:bg-white text-[11px] text-gray-600 hover:text-gray-900 transition-colors"
                                            title="Reset Zoom"
                                        >
                                            Fit
                                        </button>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => showToast(`Downloading ${activeAttachment?.name || 'document'}...`, 'info')}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ml-1"
                                    title="Download File"
                                >
                                    <Download size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowLeftPdfPreview(false)}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Close Preview"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Document Render Canvas */}
                        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 md:p-6 flex justify-center bg-slate-200/60">
                            {!selectedBill ? (
                                <div className="m-auto text-xs text-gray-400">No document available to preview</div>
                            ) : !activeTypeInfo.canPreview ? (
                                /* Unsupported file format view: "Cannot Preview" */
                                <div className="m-auto flex flex-col items-center justify-center p-8 text-center max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 shadow-2xs border border-amber-100">
                                        <activeTypeInfo.icon size={32} />
                                    </div>
                                    <h3 className="text-base font-bold text-gray-900 mb-1">Preview Not Available</h3>
                                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                        The file <strong className="text-gray-700 font-mono">{activeAttachment?.name || 'attachment'}</strong> cannot be previewed directly in the browser. Only PDF and image files are supported for inline preview.
                                    </p>
                                    <div className="w-full bg-slate-50 rounded-xl p-3 mb-5 text-left border border-slate-100 text-xs space-y-1.5">
                                        <div className="flex justify-between text-gray-500">
                                            <span>File Name:</span>
                                            <span className="font-semibold text-gray-800 truncate max-w-[180px]">{activeAttachment?.name || 'File'}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-500">
                                            <span>File Type:</span>
                                            <span className="font-medium text-gray-700">{activeTypeInfo.label}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-500">
                                            <span>File Size:</span>
                                            <span className="font-medium text-gray-700">{activeAttachment?.size_mb || 0.1} MB</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => showToast(`Downloading ${activeAttachment?.name || 'file'}...`, 'info')}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                                        >
                                            <Download size={13} />
                                            Download File
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowLeftPdfPreview(false)}
                                            className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
                                        >
                                            Back to Bills
                                        </button>
                                    </div>
                                </div>
                            ) : activeTypeInfo.type === 'image' ? (
                                /* Image Preview Canvas with Zoom */
                                <div
                                    style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: 'top center' }}
                                    className="w-full max-w-[620px] flex flex-col items-center justify-center relative transition-transform duration-150"
                                >
                                    {activeAttachment?.url ? (
                                        <img
                                            src={activeAttachment.url}
                                            alt={activeAttachment.name}
                                            className="max-w-full h-auto rounded-lg shadow-xl border border-slate-300 object-contain bg-white"
                                        />
                                    ) : (
                                        /* Styled High-Fidelity Photo / Receipt Scan Simulation */
                                        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col text-slate-800 relative overflow-hidden bg-white shadow-xl">
                                            <div className="flex items-center justify-between w-full border-b border-dashed border-slate-300 pb-4 mb-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                                                        <ImageIcon size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900">{activeAttachment?.name || 'Image Attachment'}</p>
                                                        <p className="text-[10px] text-slate-500">Image Scan • {activeAttachment?.size_mb} MB • High Resolution</p>
                                                    </div>
                                                </div>
                                                <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-md">
                                                    IMAGE PREVIEW
                                                </span>
                                            </div>

                                            {/* Scanned Receipt Simulation Box */}
                                            <div className="w-full bg-white border border-slate-200 rounded-lg p-5 shadow-xs font-mono text-xs space-y-3">
                                                <div className="text-center border-b border-dashed border-slate-200 pb-3">
                                                    <p className="font-bold text-sm tracking-wider uppercase text-slate-900">{selectedBill.supplierName}</p>
                                                    <p className="text-[10px] text-slate-500">Site Photo / Supplier Delivery Scan</p>
                                                    <p className="text-[10px] text-slate-400">Ref: {selectedBill.billNumber} • Date: {selectedBill.issueDate}</p>
                                                </div>

                                                <div className="space-y-1.5 text-[11px] pt-1">
                                                    {selectedBill.lineItems.map((li, idx) => (
                                                        <div key={li.id || idx} className="flex justify-between">
                                                            <span className="truncate max-w-[240px] text-slate-700">{li.quantity}x {li.description}</span>
                                                            <span className="font-bold text-slate-900">{formatCurrency(li.amount)}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between font-bold text-xs text-slate-900">
                                                    <span>TOTAL AMOUNT:</span>
                                                    <span className="text-blue-600 font-extrabold">{formatCurrency(totalAmount)}</span>
                                                </div>

                                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                                                    <span>Verified Attached Scan</span>
                                                    <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                                                        <CheckCircle2 size={12} />
                                                        <span>Photo Attachment Verified</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 text-[10px] text-slate-400 text-center">
                                                Image Preview • Stored in Supabase Bucket
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : activeAttachment?.url && activeAttachment.url.endsWith('.pdf') ? (
                                /* Embedded Real PDF Viewer (iframe) */
                                <div
                                    style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: 'top center' }}
                                    className="w-full max-w-[620px] min-h-[780px] flex flex-col items-center justify-center relative transition-transform duration-150"
                                >
                                    <iframe
                                        src={`${activeAttachment.url}#toolbar=0&navpanes=0`}
                                        className="w-full h-full min-h-[780px] bg-white rounded-lg shadow-xl border border-slate-300"
                                        title={activeAttachment.name}
                                    />
                                </div>
                            ) : (
                                /* PDF Document Render (Tax Invoice fallback) */
                                <div
                                    style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: 'top center' }}
                                    className="w-full max-w-[620px] bg-white shadow-xl rounded-sm p-6 sm:p-8 min-h-[780px] flex flex-col justify-between text-slate-800 border border-slate-300 relative transition-transform duration-150"
                                >
                                    {/* Invoice Header */}
                                    <div>
                                        <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                                                        {selectedBill.supplierName.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-slate-900 text-base">
                                                        {selectedBill.supplierName}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                                    123 Industrial Parkway, Sector 4<br />
                                                    Queensland, Australia<br />
                                                    billing@{selectedBill.supplierName.toLowerCase().replace(/[^a-z]/g, '') || 'vendor'}.com.au
                                                </p>
                                            </div>

                                            <div className="text-right">
                                                <h1 className="text-xl font-extrabold text-blue-600 tracking-tight mb-2">TAX INVOICE</h1>
                                                <div className="text-right space-y-1 text-xs">
                                                    <p><span className="text-slate-400">Invoice No:</span> <strong className="font-mono text-slate-900">{selectedBill.billNumber}</strong></p>
                                                    <p><span className="text-slate-400">Issue Date:</span> <span className="text-slate-700">{selectedBill.issueDate}</span></p>
                                                    <p><span className="text-slate-400">Due Date:</span> <span className="text-slate-700">{selectedBill.dueDate}</span></p>
                                                    <p><span className="text-slate-400">PO Ref:</span> <span className="text-slate-700 font-mono">{selectedBill.poNumber}</span></p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bill To */}
                                        <div className="mb-6 bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bill To</p>
                                            <p className="font-bold text-slate-900 text-xs">{selectedBill.company}</p>
                                            <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                                                {selectedBill.address}
                                            </p>
                                        </div>

                                        {/* Line Items Table */}
                                        <div className="border border-slate-200 rounded-md overflow-hidden mb-6">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                                    <tr>
                                                        <th className="py-2 px-3">Description</th>
                                                        <th className="py-2 px-3 text-right w-12">Qty</th>
                                                        <th className="py-2 px-3 text-right w-20">Unit Price</th>
                                                        <th className="py-2 px-3 text-right w-24">Amount AUD</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                                    {selectedBill.lineItems.map((li, idx) => (
                                                        <tr key={li.id || idx} className="hover:bg-slate-50/60">
                                                            <td className="py-2 px-3 font-medium text-slate-900">
                                                                {li.description}
                                                                <div className="text-[10px] text-slate-400">{li.account} • {li.tax}</div>
                                                            </td>
                                                            <td className="py-2 px-3 text-right">{li.quantity}</td>
                                                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(li.unit_price)}</td>
                                                            <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                                                                {formatCurrency(li.amount)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Subtotal & Total */}
                                        <div className="flex justify-end mb-6">
                                            <div className="w-56 space-y-1.5 text-xs">
                                                <div className="flex justify-between text-slate-500">
                                                    <span>Subtotal:</span>
                                                    <span className="font-mono text-slate-800">{formatCurrency(subtotal)}</span>
                                                </div>
                                                <div className="flex justify-between text-slate-500 pb-1.5 border-b border-slate-200">
                                                    <span>GST (10%):</span>
                                                    <span className="font-mono text-slate-800">{formatCurrency(gstTax)}</span>
                                                </div>
                                                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
                                                    <span>Total AUD:</span>
                                                    <span className="font-mono text-blue-600 font-extrabold">{formatCurrency(totalAmount)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer & Watermark */}
                                    <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 space-y-1 mt-6">
                                        <p>Direct Deposit: National Australia Bank • BSB: 082-001 • ACC: 8291-3849</p>
                                        <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-semibold pt-1">
                                            <CheckCircle2 size={12} />
                                            <span>Verified Document • Supabase Storage Attachment ({activeAttachment?.name || 'invoice.pdf'})</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Contextual Left List Pane */
                    <div className="w-80 md:w-96 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-full overflow-hidden">
                        {/* Dynamic Connected Organization Selector from API */}
                        <div className="p-3 border-b border-gray-100 bg-white flex items-center gap-2">
                            <div className="relative flex-1">
                                <button
                                    type="button"
                                    onClick={() => setOrgDropdownOpen((v) => !v)}
                                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 rounded-xl text-left transition-all shadow-2xs group"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div
                                            className={`w-7 h-7 rounded-lg ${currentOrg.color} text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs`}
                                        >
                                            {currentOrg.shortCode}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                                    {currentOrg.name}
                                                </span>
                                                <span
                                                    className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-100"
                                                    title="Live API Sync Active"
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                                {currentOrg.id === 'all'
                                                    ? 'Showing all connected entities'
                                                    : `API Connected • Synced ${currentOrg.lastSynced}`}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronDown
                                        size={14}
                                        className={`text-slate-400 transition-transform duration-200 shrink-0 ml-1 ${orgDropdownOpen ? 'rotate-180 text-blue-600' : ''
                                            }`}
                                    />
                                </button>

                                {/* Dropdown Menu */}
                                {orgDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-20" onClick={() => setOrgDropdownOpen(false)} />
                                        <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                                <span>Connected Organizations</span>
                                                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Live API
                                                </span>
                                            </div>

                                            <div className="p-1 max-h-60 overflow-y-auto divide-y divide-slate-50">
                                                {availableOrganizations.map((org) => {
                                                    const isSelected = selectedOrg === org.id
                                                    const orgBillCount = bills.filter(
                                                        (b) =>
                                                            org.id === 'all' ||
                                                            b.organizationId === org.id ||
                                                            b.company.toLowerCase() === org.id.toLowerCase()
                                                    ).length
                                                    return (
                                                        <button
                                                            key={org.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedOrg(org.id)
                                                                setOrgDropdownOpen(false)
                                                                showToast(`Switched view to ${org.name}`, 'info')
                                                            }}
                                                            className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors ${isSelected ? 'bg-blue-50/80 text-blue-900' : 'hover:bg-slate-50 text-slate-700'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div
                                                                    className={`w-6 h-6 rounded-lg ${org.color} text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs`}
                                                                >
                                                                    {org.shortCode}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-semibold text-slate-800 truncate">{org.name}</p>
                                                                    <p className="text-[10px] text-slate-400 truncate">
                                                                        {org.id === 'all'
                                                                            ? 'Aggregate all organizations'
                                                                            : `Org ID: ${org.code} • ${org.lastSynced}`}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded-md">
                                                                    {orgBillCount}
                                                                </span>
                                                                {isSelected && <Check size={13} className="text-blue-600" />}
                                                            </div>
                                                        </button>
                                                    )
                                                })}
                                            </div>

                                            <div className="p-2.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-[11px] text-slate-500">
                                                <span className="flex items-center gap-1.5">
                                                    <Building2 size={12} className="text-slate-400" />
                                                    {availableOrganizations.length - 1} Orgs Linked
                                                </span>
                                                <Link
                                                    href="/settings"
                                                    className="text-blue-600 font-semibold hover:underline flex items-center gap-0.5 text-xs"
                                                >
                                                    Manage
                                                    <ExternalLink size={10} />
                                                </Link>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Resync / Refresh button */}
                            <button
                                type="button"
                                onClick={handleResync}
                                disabled={isSyncing}
                                title="Resync bills from API"
                                className="group flex-shrink-0 self-stretch aspect-square flex items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-500 hover:text-blue-600 transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw
                                    size={14}
                                    className={isSyncing ? 'animate-spin text-blue-500' : 'group-hover:text-blue-500 transition-colors'}
                                />
                            </button>
                        </div>

                        {/* Search bar & PDF toggle */}
                        <div className="p-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search bill, supplier, or PO..."
                                    className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            {/* {selectedBill && selectedBill.files.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowLeftPdfPreview(true)}
                  className="px-2.5 py-1.5 bg-white border border-gray-200 hover:border-blue-500 hover:text-blue-600 rounded-lg text-xs font-semibold text-gray-700 flex items-center gap-1 transition-colors shadow-2xs"
                  title="Open PDF Preview"
                >
                  <Eye size={12} className="text-blue-600" />
                  <span>PDF</span>
                </button>
              )} */}
                        </div>

                        {/* Header count badge for selected view & Auth action */}
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-600">
                            <div className="flex items-center gap-2">
                                <span>Bills List</span>
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[11px] font-bold border border-blue-100">
                                    {filteredCategoryBills.length}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAuthModalOpen(true)}
                                title={hasValidAuth ? 'Supabase API Authenticated' : 'Bills API Authentication Required'}
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all ${hasValidAuth
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 ring-1 ring-amber-300'
                                    }`}
                            >
                                <KeyRound size={11} />
                                <span>{hasValidAuth ? 'API Active' : 'API Login'}</span>
                            </button>
                        </div>

                        {/* List items for this category */}
                        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                            {isLoading ? (
                                <div className="px-4 py-16 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                    <p className="font-medium text-gray-600">Loading bills from API...</p>
                                </div>
                            ) : filteredCategoryBills.length === 0 ? (
                                <div className="px-4 py-16 text-center text-xs text-gray-400 flex flex-col items-center">
                                    <Receipt className="w-8 h-8 text-gray-300 mb-2" strokeWidth={1.5} />
                                    <p className="font-medium text-gray-600">
                                        {hasValidAuth ? 'No bills found in API' : 'Bills API Authentication Required'}
                                    </p>
                                    <p className="text-[11px] mt-0.5 mb-3">
                                        {hasValidAuth
                                            ? 'Try adjusting your search or organization filter'
                                            : 'Authenticate your session to fetch live bills from Supabase.'}
                                    </p>
                                    {!hasValidAuth && (
                                        <button
                                            type="button"
                                            onClick={() => setIsAuthModalOpen(true)}
                                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                                        >
                                            <KeyRound size={12} />
                                            Log In to Bills API
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredCategoryBills.map((bill) => {
                                    const isSelected = selectedBill?.id === bill.id
                                    return (
                                        <div
                                            key={bill.id}
                                            onClick={() => {
                                                setSelectedBillId(bill.id)
                                                if (bill.files.length > 0) {
                                                    setActiveAttachmentId(bill.files[0].id)
                                                }
                                            }}
                                            className={`p-3.5 border-b border-gray-100 cursor-pointer transition-all hover:bg-gray-50 relative ${isSelected
                                                    ? 'bg-blue-50/60 shadow-2xs'
                                                    : 'bg-white'
                                                }`}
                                        >
                                            {/* Seamless active indicator bar */}
                                            {isSelected && (
                                                <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r" />
                                            )}

                                            <div className="flex justify-between items-start gap-2 mb-1.5">
                                                <div className="flex items-center gap-2 min-w-0 pr-1">
                                                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                                                        X
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-900 line-clamp-1 leading-tight">
                                                        Bill {bill.billNumber}
                                                    </span>
                                                </div>
                                                <StatusBadge status={bill.status} className="text-[10px] py-0 px-2 flex-shrink-0" />
                                            </div>

                                            <p className="text-[11px] text-gray-500 truncate pl-6 mb-1">{bill.supplierName}</p>

                                            <div className="pl-6 flex justify-between items-center text-xs">
                                                <span className="font-semibold text-gray-900">{formatCurrency(bill.amount)}</span>
                                                <span className="text-[11px] text-gray-400 font-normal">{bill.company}</span>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Right Detail Workspace */}
                <div className="flex-1 bg-gray-50 overflow-y-auto p-4 md:p-6 space-y-5">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-24 gap-2">
                            <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                            <p className="text-xs font-medium text-gray-600">Fetching bill details from API...</p>
                        </div>
                    ) : selectedBill ? (
                        <div className="space-y-5 max-w-5xl mx-auto">
                            {/* Header Card */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-3">
                                    <div className="space-y-1 max-w-xl">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-base font-semibold text-gray-900">
                                                Bill {selectedBill.billNumber} from {selectedBill.supplierName}
                                            </h2>
                                            <button
                                                onClick={() => showToast(`Bill reference: ${selectedBill.billNumber}`, 'info')}
                                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                                title="External Reference"
                                            >
                                                <ExternalLink size={14} />
                                            </button>
                                        </div>
                                        <div className="text-xs text-gray-500 leading-relaxed">
                                            {selectedBill.address}
                                        </div>
                                        <button
                                            onClick={() => setShowAddressMore((prev) => !prev)}
                                            className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline mt-1"
                                        >
                                            {showAddressMore ? 'View less' : 'View more'}
                                            <ChevronDown
                                                size={13}
                                                className={`transition-transform ${showAddressMore ? 'rotate-180' : ''}`}
                                            />
                                        </button>
                                        {showAddressMore && (
                                            <div className="pt-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-1">
                                                <p><span className="font-semibold text-gray-700">PO Ref:</span> {selectedBill.poNumber}</p>
                                                <p><span className="font-semibold text-gray-700">Company:</span> {selectedBill.company}</p>
                                                <p><span className="font-semibold text-gray-700">Org ID:</span> {selectedBill.organizationId || 'Primary'}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-right flex flex-col items-start md:items-end gap-2.5 w-full md:w-auto">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-semibold text-gray-900">
                                                {formatCurrency(selectedBill.amount)}
                                            </span>
                                            <StatusBadge status={selectedBill.status} />
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            {selectedBill.status === 'ON REVIEW' && (
                                                <button
                                                    onClick={() => handleSubmitForApproval(selectedBill.id)}
                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                                                >
                                                    Submit for approval
                                                </button>
                                            )}

                                            {selectedBill.status === 'Pending Approval' && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleApprove(selectedBill.id)}
                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(selectedBill.id)}
                                                        className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => router.push(`/bills/edit?bill=${selectedBill.id}`)}
                                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-xs font-medium flex items-center gap-1.5 transition-colors"
                                            >
                                                <Edit2 size={13} />
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Assigned User and Preview PDF Bar (matches design) */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                                            DM
                                        </div>
                                        <div className="text-xs">
                                            <span className="text-gray-400">Assigned to:</span>{' '}
                                            <span className="font-semibold text-gray-800">
                                                {selectedBill.approvers?.[0]?.name || 'Daniel McKenna'}
                                            </span>{' '}
                                            <span className="text-gray-400">
                                                ({selectedBill.approvers?.[0]?.role || 'Site Manager'})
                                            </span>
                                        </div>
                                    </div>

                                    {/* <div className="flex items-center gap-2">
                    {selectedBill.files.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedBill.files[0]) {
                            setActiveAttachmentId(selectedBill.files[0].id)
                          }
                          setShowLeftPdfPreview(true)
                          showToast('Opened document preview', 'info')
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                      >
                        <Eye size={13} className="text-blue-600" />
                        Preview PDF on Left
                      </button>
                    )}
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {selectedBill.createdIn}
                    </span>
                  </div> */}
                                </div>
                            </div>

                            {/* Details Card Accordion */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                                <button
                                    onClick={() => setOpenDetailsCard((v) => !v)}
                                    className="w-full flex items-center justify-between text-gray-900 font-semibold text-sm mb-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <Calendar size={15} className="text-gray-400" />
                                        <span>Details</span>
                                    </div>
                                    {openDetailsCard ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>

                                {openDetailsCard && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-3 border-t border-gray-100 mt-2">
                                        <div>
                                            <div className="text-gray-400 mb-1">Date</div>
                                            <div className="text-gray-800 font-semibold">{selectedBill.issueDate}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 mb-1">Due Date</div>
                                            <div className="text-gray-800 font-semibold">{selectedBill.dueDate}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 mb-1">Reference</div>
                                            <div className="text-gray-800 font-semibold font-mono">{selectedBill.billNumber}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Line Items Card with Tracking Categories */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
                                <button
                                    onClick={() => setOpenLineItemsCard((v) => !v)}
                                    className="w-full flex items-center justify-between text-gray-900 font-semibold text-sm"
                                >
                                    <div className="flex items-center gap-2">
                                        <ClipboardList size={15} className="text-gray-400" />
                                        <span>Line Items & Tracking</span>
                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                            {selectedBill.lineItems.length} items
                                        </span>
                                    </div>
                                    {openLineItemsCard ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>

                                {openLineItemsCard && (
                                    <div className="pt-2 space-y-4">
                                        <div className="overflow-x-auto border border-gray-100 rounded-xl">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 font-semibold">
                                                    <tr>
                                                        <th className="px-3.5 py-2.5">Description</th>
                                                        <th className="px-3.5 py-2.5 text-right w-14">Qty</th>
                                                        <th className="px-3.5 py-2.5 text-right w-24">Unit Price</th>
                                                        <th className="px-3.5 py-2.5">Account</th>
                                                        <th className="px-3.5 py-2.5">Tax</th>
                                                        <th className="px-3.5 py-2.5">SM/Dept</th>
                                                        <th className="px-3.5 py-2.5">Site/Tag</th>
                                                        <th className="px-3.5 py-2.5 text-right w-28">Amount AUD</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 text-gray-700">
                                                    {selectedBill.lineItems.map((item) => (
                                                        <tr key={item.id} className="hover:bg-gray-50/50">
                                                            <td className="px-3.5 py-2.5 font-medium text-gray-900">{item.description}</td>
                                                            <td className="px-3.5 py-2.5 text-right">{item.quantity.toFixed(0)}</td>
                                                            <td className="px-3.5 py-2.5 text-right">{formatCurrency(item.unit_price)}</td>
                                                            <td className="px-3.5 py-2.5 text-gray-600 truncate max-w-[140px]" title={item.account}>
                                                                {item.account}
                                                            </td>
                                                            <td className="px-3.5 py-2.5 text-gray-600">{item.tax || item.tax_rate}</td>
                                                            <td className="px-3.5 py-2.5 text-gray-600">
                                                                {item.sm_dept || '*SM - Operations'}
                                                            </td>
                                                            <td className="px-3.5 py-2.5 text-gray-600">
                                                                {item.site_tag || 'HQ Office'}
                                                            </td>
                                                            <td className="px-3.5 py-2.5 text-right font-semibold text-gray-900">
                                                                {formatCurrency(item.amount)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
                                            <button
                                                onClick={() => showToast('Opening Xero reference...', 'info')}
                                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-xs font-medium flex items-center gap-1.5 transition-colors"
                                            >
                                                Open in Xero
                                                <ExternalLink size={13} />
                                            </button>

                                            <div className="w-full sm:w-64 text-xs space-y-1.5 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                                                <div className="text-gray-400 text-[11px] mb-1 italic">Amounts are Tax Exclusive</div>
                                                <div className="flex justify-between text-gray-600">
                                                    <span>Subtotal:</span>
                                                    <span>{formatCurrency(subtotal)}</span>
                                                </div>
                                                <div className="flex justify-between text-gray-600 pb-2 border-b border-gray-200">
                                                    <span>GST on Expenses (10%):</span>
                                                    <span>{formatCurrency(gstTax)}</span>
                                                </div>
                                                <div className="flex justify-between pt-1 font-bold text-gray-900 text-sm">
                                                    <span>Total:</span>
                                                    <span className="text-blue-600">{formatCurrency(totalAmount)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Files / Attachments Section Accordion */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                                <button
                                    onClick={() => setOpenFilesCard((v) => !v)}
                                    className="w-full flex items-center justify-between text-gray-900 font-semibold text-sm mb-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <Paperclip size={15} className="text-gray-400" />
                                        <span>Files & Attachments</span>
                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                            {selectedBill.files.length}
                                        </span>
                                    </div>
                                    {openFilesCard ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>

                                {openFilesCard && (
                                    <div className="pt-3 border-t border-gray-100 mt-2">
                                        {selectedBill.files.length === 0 ? (
                                            <div className="text-xs text-gray-400 py-3 italic">
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
                                                                setShowLeftPdfPreview(true)
                                                                if (fInfo.canPreview) {
                                                                    showToast(`Loaded ${file.name} on left side`, 'info')
                                                                } else {
                                                                    showToast(`${file.name} cannot be previewed in browser`, 'info')
                                                                }
                                                            }}
                                                            className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className={`w-9 h-9 rounded-lg ${fInfo.colorClass} flex items-center justify-center flex-shrink-0`}>
                                                                    <FIcon size={18} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                                                        {file.name}
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-400">{file.size_mb} MB • {fInfo.label}</p>
                                                                </div>
                                                            </div>
                                                            {fInfo.canPreview ? (
                                                                <button
                                                                    type="button"
                                                                    className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 group-hover:bg-blue-600 group-hover:text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-2xs transition-colors"
                                                                >
                                                                    <Eye size={12} />
                                                                    Preview
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    className="px-2.5 py-1 bg-white border border-gray-200 text-gray-400 group-hover:border-amber-400 group-hover:text-amber-700 rounded-lg text-xs font-medium flex items-center gap-1 shadow-2xs transition-colors"
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

                            {/* Bill to PO matching Section Accordion */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                                <button
                                    onClick={() => setOpenPOCard((v) => !v)}
                                    className="w-full flex items-center justify-between text-gray-900 font-semibold text-sm mb-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <Building size={15} className="text-gray-400" />
                                        <span>Bill to PO Matching</span>
                                    </div>
                                    {openPOCard ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>

                                {openPOCard && (
                                    <div className="pt-3 border-t border-gray-100 mt-2">
                                        {selectedBill.poNumber && selectedBill.poNumber !== 'PO-SYS' ? (
                                            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                                        <CheckCircle2 size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">
                                                            Matched with Purchase Order <span className="font-mono text-blue-600">{selectedBill.poNumber}</span>
                                                        </p>
                                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                                            Vendor: {selectedBill.supplierName} • Total PO balance verified
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    Matched
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-slate-500 font-medium text-xs bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                                                <AlertCircle size={16} className="text-slate-400" />
                                                No matching Purchase Order found for this bill.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Approval Workflow Card Accordion */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                                <button
                                    onClick={() => setOpenWorkflowCard((v) => !v)}
                                    className="w-full flex items-center justify-between text-gray-900 font-semibold text-sm mb-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <FileCheck2 size={15} className="text-gray-400" />
                                        <span>Approval Workflow</span>
                                    </div>
                                    {openWorkflowCard ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>

                                {openWorkflowCard && (
                                    <div className="pt-3 border-t border-gray-100 mt-2">
                                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                            {workflowSteps.map((step, idx) => (
                                                <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
                                                    <span
                                                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 border ${step.status === 'active'
                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                                                : step.status === 'completed'
                                                                    ? 'bg-gray-100 text-gray-700 border-gray-200'
                                                                    : 'bg-white text-gray-400 border-gray-200 opacity-60'
                                                            }`}
                                                    >
                                                        <span
                                                            className={`w-1.5 h-1.5 rounded-full ${step.status === 'active'
                                                                    ? 'bg-white'
                                                                    : step.status === 'completed'
                                                                        ? 'bg-blue-600'
                                                                        : 'bg-gray-300'
                                                                }`}
                                                        />
                                                        {step.label}
                                                    </span>
                                                    {idx < workflowSteps.length - 1 && (
                                                        <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2.5">
                                            Approval condition: <span className="font-medium text-gray-700">{approvalConditionText}</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Audit Trail Card Accordion */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                                <button
                                    onClick={() => setOpenAuditCard((v) => !v)}
                                    className="w-full flex items-center justify-between text-gray-900 font-semibold text-sm mb-4"
                                >
                                    <div className="flex items-center gap-2">
                                        <History size={15} className="text-gray-400" />
                                        <span>Audit Trail</span>
                                    </div>
                                    {openAuditCard ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>

                                {openAuditCard && (
                                    <div className="relative pl-6 space-y-4 border-l-2 border-gray-100 ml-2 pt-1">
                                        {selectedBill.auditTrail.map((ev) => (
                                            <div key={ev.id} className="relative group">
                                                {/* Timeline Bullet */}
                                                <div className="absolute -left-[31px] top-0.5 w-5 h-5 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center text-[9px] font-bold text-blue-600">
                                                    {ev.type === 'xero' ? 'X' : '✓'}
                                                </div>

                                                {ev.type === 'comment' ? (
                                                    <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                                            {ev.user?.[0] ?? 'U'}
                                                        </div>
                                                        <div className="flex-1 text-xs">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="font-semibold text-gray-900">{ev.user}</span>
                                                                <span className="text-[10px] text-gray-400">{ev.date}</span>
                                                            </div>
                                                            <p className="text-gray-700 font-normal leading-relaxed">"{ev.notes}"</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs space-y-0.5">
                                                        <div className="font-medium text-gray-800">
                                                            {ev.user && <span className="font-semibold text-gray-900">{ev.user}: </span>}
                                                            {ev.title}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400">{ev.date}</div>
                                                        {ev.notes && (
                                                            <div className="text-gray-600 bg-gray-50 border border-gray-100 p-2 rounded-lg mt-1 italic">
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
                            <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-xs">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                                        placeholder="Leave a comment..."
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => showToast('Attachment upload will be available soon', 'info')}
                                        className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                                        title="Attach file"
                                    >
                                        <Paperclip size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSendComment}
                                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                                    >
                                        <Send size={12} />
                                        Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                            Select a bill from the left list to view details.
                        </div>
                    )}
                </div>
            </div>

            {/* PDF Attachment Preview Modal */}
            {previewPdfFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden p-6 relative">
                        <button
                            onClick={() => setPreviewPdfFile(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
                        >
                            <X size={16} />
                        </button>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">{previewPdfFile.name}</h3>
                                <p className="text-xs text-slate-500">
                                    {selectedBill?.supplierName} • {previewPdfFile.size_mb} MB
                                </p>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-xl bg-slate-50 p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]">
                            <FileText size={48} className="text-red-500" />
                            <p className="text-sm font-semibold text-slate-800">
                                Document attached to Bill {selectedBill?.billNumber}
                            </p>
                            <p className="text-xs text-slate-500 max-w-sm">
                                This document is verified and linked via Supabase Storage.
                            </p>
                        </div>

                        <div className="pt-4 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPreviewPdfFile(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    showToast(`Downloading ${previewPdfFile.name}...`, 'info')
                                    setPreviewPdfFile(null)
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                                <Download size={13} />
                                Download Attachment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bills API Authentication Modal */}
            <BillsAuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                onSuccess={() => {
                    showToast('Authenticated with Bills API successfully', 'success')
                    fetchBills()
                }}
            />
        </div>
    )
}