'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, Edit2, X, Check, Clock, Calendar, CheckCircle2, Paperclip } from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import {
  getPurchaseOrderDetailsFull,
  updatePurchaseOrderStatus,
  autoSendEmailPurchaseOrder,
  respondNewDateRequest,
} from '@/lib/api'
import { StatusBadge } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PermissionGuard } from '@/components/shared/permission-guard'
import { AttachmentList } from '@/components/shared/attachment-list'
import { useToast } from '@/components/shared/toast'
import { cn, formatDate, formatDateTime, normalizeOrderItems } from '@/lib/utils'

export default function POSubsDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [rejectDialog, setRejectDialog] = useState(false)
  const [acceptDialog, setAcceptDialog] = useState(false)
  const [sendEmailDialog, setSendEmailDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rescheduleHandled, setRescheduleHandled] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'approve' | 'decline' | null>(null)
  const [responseMessage, setResponseMessage] = useState<string | null>(null)

  const { data: po, isLoading } = useQuery({
    queryKey: ['po-detail', id],
    queryFn: () => getPurchaseOrderDetailsFull(token!, id),
    enabled: !!token && !!id,
  })

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
      updatePurchaseOrderStatus(token!, id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      setRejectDialog(false)
      setAcceptDialog(false)
    },
  })

  const emailMutation = useMutation({
    mutationFn: () => autoSendEmailPurchaseOrder(token!, id, 'subcontractor'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-detail', id] })
      setSendEmailDialog(false)
      toast('PO email sent successfully.', 'success')
    },
    onError: () => {
      toast('Failed to send the PO email. Please try again.', 'error')
    },
  })

  const respondMutation = useMutation({
    mutationFn: (action: 'approve' | 'decline') =>
      respondNewDateRequest(token!, { po_id: id, action }),
    onSuccess: (res) => {
      setConfirmAction(null)
      setRescheduleHandled(true)
      setResponseMessage(res.message)
      queryClient.invalidateQueries({ queryKey: ['po-detail', id] })
    },
  })

  useEffect(() => {
    if (!responseMessage) return
    const t = setTimeout(() => setResponseMessage(null), 3500)
    return () => clearTimeout(t)
  }, [responseMessage])

  const deliveryDate = po ? formatDate(po.scheduled_date ?? '') || '-' : '-'
  const requestedDate = po ? formatDate(po.new_requested_date ?? '') || '-' : '-'
  const orderItems = po ? normalizeOrderItems(po.order_details) : []
  const showRescheduleBanner = po?.status === 'PO Rescheduled' && !rescheduleHandled
  const showRescheduleHistory = !!po?.reviewed_status

  return (
    // -m-4 md:-m-6 bleeds the whole page out of <main>'s own padding (see
    // app/(dashboard)/layout.tsx) so the top bar sits flush against the
    // global header at rest, matching contract-preview's page shell —
    // padding is reintroduced per-section below instead. The top bar is
    // fixed in place; only the body below it scrolls.
    <div className="flex flex-col h-full overflow-hidden relative -m-4 md:-m-6">
      {responseMessage && (
        <div className="fixed bottom-4 right-4 z-20 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 text-white text-xs font-medium shadow-lg">
          <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
          {responseMessage}
        </div>
      )}

      {/* Top bar — fixed, doesn't scroll */}
      <div className="flex-shrink-0 flex items-center gap-3 bg-slate-50 px-4 pt-4 pb-6 md:px-6 md:pt-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <Skeleton className="h-6 w-48" />
          ) : (
            <h1 className="text-lg font-semibold text-slate-800 truncate">
              {po?.po_number ?? 'Subcontractor PO Detail'}
            </h1>
          )}
        </div>
        {po && (
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={po.status} />
            <StatusBadge status={po.type} />
            {po.status === 'PO Draft' && (
              <PermissionGuard action="po:edit">
                <Link
                  href={`/purchase-orders/subcontractor/new?edit=${id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Edit2 size={14} />
                  Edit
                </Link>
              </PermissionGuard>
            )}
            {po.status === 'PO Submitted' && (
              <>
                <button
                  onClick={() => setSendEmailDialog(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-[#6692C5] hover:bg-[#4F7CB3] rounded-lg transition-colors"
                >
                  <Send size={14} />
                  Send PO
                </button>
                <button
                  onClick={() => setAcceptDialog(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                >
                  <Check size={14} />
                  Accept
                </button>
                <button
                  onClick={() => setRejectDialog(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                >
                  <X size={14} />
                  Reject
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Body — the only part of this page that scrolls */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 md:px-6 md:pb-6">
      {isLoading ? (
        <PODetailSkeleton />
      ) : po ? (
        <>
          {showRescheduleBanner && (
            <div className="flex items-start gap-4 mb-4 pl-4 pr-5 py-4 rounded-xl border border-orange-100 bg-orange-50/60 border-l-4 border-l-orange-400">
              <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Clock size={16} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-orange-800">Reschedule requested</p>
                <p className="text-xs text-orange-700/80 mt-0.5">
                  {po.po_number} - {po.supplier_name} has requested reschedule to {requestedDate}.
                </p>
                {po.external_notes && (
                  <p className="text-xs text-orange-700/80">Reason: {po.external_notes}</p>
                )}

                {confirmAction ? (
                  <div className="mt-3 px-3 py-2.5 rounded-lg bg-white border border-orange-200">
                    <p className="text-xs font-medium text-slate-700">
                      Are you sure you want to {confirmAction === 'approve' ? 'approve' : 'decline'} this reschedule request?
                    </p>
                    <div className="flex gap-2 mt-2.5">
                      <button
                        onClick={() => setConfirmAction(null)}
                        disabled={respondMutation.isPending}
                        className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => respondMutation.mutate(confirmAction)}
                        disabled={respondMutation.isPending}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-50',
                          confirmAction === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                        )}
                      >
                        {respondMutation.isPending
                          ? 'Submitting…'
                          : confirmAction === 'approve' ? 'Yes, approve' : 'Yes, decline'}
                      </button>
                    </div>
                    {respondMutation.isError && (
                      <p className="text-xs text-red-500 mt-2">Failed to submit. Try again.</p>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setConfirmAction('approve')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-green-300 bg-white hover:bg-green-50 text-green-600 font-medium rounded-lg transition-colors"
                    >
                      <Check size={12} /> Approve reschedule
                    </button>
                    <button
                      onClick={() => setConfirmAction('decline')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-200 bg-white hover:bg-red-50 text-red-500 font-medium rounded-lg transition-colors"
                    >
                      <X size={12} /> Decline
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-100/70 text-orange-700 text-xs font-medium flex-shrink-0 whitespace-nowrap">
                <Calendar size={12} />
                Requested date: {requestedDate}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <InfoCard title="PO Information">
                <InfoRow label="PO Number" value={po.po_number} />
                <InfoRow label="Status" value={<StatusBadge status={po.status} />} />
                <InfoRow label="Type" value={<StatusBadge status={po.type} />} />
                <InfoRow label="Delivery Date" value={deliveryDate} />
                <InfoRow label="Total Amount" value={<span className="font-semibold text-slate-800">${po.po_amount.toLocaleString()}</span>} />
              </InfoCard>

              {showRescheduleHistory && (
                <InfoCard title="Reschedule History" icon={<Clock size={12} className="text-slate-400" />}>
                  <InfoRow label="Original Date" value={formatDate(po.original_scheduled_date ?? '') || '-'} />
                  <InfoRow label="Requested Date" value={requestedDate} />
                  <InfoRow
                    label="Review Result"
                    value={
                      <span className={cn(
                        'font-semibold capitalize',
                        po.reviewed_status === 'approved' ? 'text-green-600' : 'text-red-500'
                      )}>
                        {po.reviewed_status}
                      </span>
                    }
                  />
                  <InfoRow label="Reviewed At" value={po.reviewed_at ? formatDateTime(po.reviewed_at) : '-'} />
                  <InfoRow label="Reason" value={po.external_notes || '-'} />
                </InfoCard>
              )}

              <InfoCard title="Scope">
                {po.scope_snapshot.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No scope selected</p>
                ) : (
                  <div className="-mx-4 -my-2">
                    {po.scope_snapshot.map((building, i) => (
                      <div key={building.building_id} className={cn('px-4 py-3', i > 0 && 'border-t border-slate-50')}>
                        <p className="text-sm font-semibold text-slate-700">{building.building_name || 'Building'}</p>
                        {building.trades.length > 0 && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {building.trades.map((t) => t.trade_name).join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </InfoCard>

              <InfoCard title="Job Details">
                {orderItems.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No job details</p>
                ) : (
                  <div className="-mx-4 -my-2">
                    {orderItems.map((item, i) => (
                      <div key={item.id} className={cn('px-4 py-3', i > 0 && 'border-t border-slate-50')}>
                        <p className="text-sm font-semibold text-slate-700">{item.name}</p>
                        {item.shortDescription && <p className="text-xs text-slate-400 mt-0.5">{item.shortDescription}</p>}
                        {item.description && (
                          <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{item.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </InfoCard>

              {po.attachments && po.attachments.length > 0 && (
                <InfoCard title="Attachments" icon={<Paperclip size={12} className="text-slate-400" />}>
                  <AttachmentList attachments={po.attachments} />
                </InfoCard>
              )}
            </div>

            <div className="space-y-4">
              <InfoCard title="Subcontractor">
                <InfoRow label="Name" value={po.supplier_name || '-'} />
                <InfoRow label="Email" value={po.supplier_email || '-'} />
                <InfoRow label="Phone" value={po.supplier_phone || '-'} />
              </InfoCard>

              <InfoCard title="Client">
                <InfoRow label="RA Number" value={po.ra_number || '-'} />
                <InfoRow
                  label="Name"
                  value={[po.client_first_name, po.client_last_name].filter(Boolean).join(' ') || '-'}
                />
                <InfoRow label="Address" value={po.address || '-'} />
              </InfoCard>

              <InfoCard title="Site Information">
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{po.site_information || '-'}</p>
              </InfoCard>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center flex-1 text-slate-400">
          Purchase order not found
        </div>
      )}
      </div>

      <ConfirmDialog
        open={acceptDialog}
        title="Accept Purchase Order"
        description="Are you sure you want to accept this subcontractor PO?"
        confirmLabel="Accept"
        variant="default"
        isLoading={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate({ status: 'PO Sent' })}
        onCancel={() => setAcceptDialog(false)}
      />

      <ConfirmDialog
        open={rejectDialog}
        title="Reject Purchase Order"
        description="Please provide a reason for rejection."
        confirmLabel="Reject"
        variant="danger"
        isLoading={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate({ status: 'PO Rejected', reason: rejectReason })}
        onCancel={() => { setRejectDialog(false); setRejectReason('') }}
      >
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason for rejection..."
          rows={3}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={sendEmailDialog}
        title="Send PO Email"
        description="This will automatically send the PO email to the subcontractor. Continue?"
        confirmLabel="Send Email"
        variant="default"
        isLoading={emailMutation.isPending}
        onConfirm={() => emailMutation.mutate()}
        onCancel={() => setSendEmailDialog(false)}
      />
    </div>
  )
}

function InfoCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        {icon}
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{title}</p>
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center py-2 border-b border-slate-50 last:border-0">
      <p className="text-xs text-slate-400 w-32 flex-shrink-0">{label}</p>
      <div className="text-sm text-slate-700 min-w-0">{value}</div>
    </div>
  )
}

function PODetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <Skeleton className="h-4 w-32 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
