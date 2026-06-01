'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, Edit2, X, Check } from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import {
  getPODetails,
  updatePurchaseOrderStatus,
  autoSendEmailPurchaseOrder,
} from '@/lib/api'
import { StatusBadge } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function POSubsDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [rejectDialog, setRejectDialog] = useState(false)
  const [acceptDialog, setAcceptDialog] = useState(false)
  const [sendEmailDialog, setSendEmailDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { data: details, isLoading } = useQuery({
    queryKey: ['po-detail', id],
    queryFn: async () => {
      const result = await getPODetails(token!, id)
      return Array.isArray(result) ? result[0] : result
    },
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
    mutationFn: () => autoSendEmailPurchaseOrder(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-detail', id] })
      setSendEmailDialog(false)
    },
  })

  const po = details

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 mb-6">
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
              {po?.poNumber ?? 'Subcontractor PO Detail'}
            </h1>
          )}
        </div>
        {po && (
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={po.status} />
            {po.status === 'PO Draft' && (
              <Link
                href={`/purchase-orders/subcontractor/new?edit=${id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Edit2 size={14} />
                Edit
              </Link>
            )}
            {po.status === 'PO Submitted' && (
              <>
                <button
                  onClick={() => setSendEmailDialog(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-[#C66EEB] hover:bg-[#A855D4] rounded-lg transition-colors"
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

      {isLoading ? (
        <PODetailSkeleton />
      ) : po ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <InfoCard title="PO Information">
              <InfoRow label="PO Number" value={po.poNumber} />
              <InfoRow label="Status" value={<StatusBadge status={po.status} />} />
              <InfoRow label="Type" value={<StatusBadge status={po.type} />} />
              <InfoRow label="Delivery Date" value={po.scheduledDate ? formatDate(po.scheduledDate) : '-'} />
              <InfoRow label="Created" value={formatDate(po.createdAt)} />
              {po.totalAmount != null && (
                <InfoRow label="Total Amount" value={formatCurrency(po.totalAmount)} />
              )}
            </InfoCard>

            {po.siteInformation && (
              <InfoCard title="Site Information">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{po.siteInformation}</p>
              </InfoCard>
            )}

            {po.orderDetails && (
              <InfoCard title="Job Details / Scope">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{po.orderDetails}</p>
              </InfoCard>
            )}
          </div>

          <div className="space-y-4">
            <InfoCard title="Subcontractor">
              <InfoRow label="Name" value={po.supplierName || '-'} />
              {po.supplierEmail && <InfoRow label="Email" value={po.supplierEmail} />}
              {po.supplierPhone && <InfoRow label="Phone" value={po.supplierPhone} />}
            </InfoCard>

            <InfoCard title="Client">
              <InfoRow
                label="Name"
                value={[po.clientFirstName, po.clientLastName].filter(Boolean).join(' ') || '-'}
              />
              <InfoRow label="Address" value={po.address || '-'} />
            </InfoCard>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center flex-1 text-slate-400">
          Purchase order not found
        </div>
      )}

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

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 flex-shrink-0 w-28">{label}</span>
      <span className="text-sm text-slate-700 text-right">{value}</span>
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
