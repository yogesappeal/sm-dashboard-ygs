'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { usePoResponseToken } from '@/lib/hooks/use-po-response-token'
import { acceptPoResponse, rejectPoResponse, submitPoRescheduleRequest } from '@/lib/api'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { PoResponseSkeleton } from '@/components/po-response/po-response-skeleton'
import { PoSummaryCard } from '@/components/po-response/po-summary-card'
import { LinkInvalidState } from '@/components/po-response/link-invalid-state'
import { ActionSuccessState } from '@/components/po-response/action-success-state'
import { useToast } from '@/components/shared/toast'
import { formatDate } from '@/lib/utils'
import type { PoResponseAction } from '@/lib/types'

const VALID_ACTIONS: PoResponseAction[] = ['accept', 'reschedule', 'reject']

export default function PoResponsePage() {
  const { action, token } = useParams<{ action: string; token: string }>()
  const toast = useToast()

  const isValidAction = VALID_ACTIONS.includes(action as PoResponseAction)
  const { data, isLoading, isError } = usePoResponseToken(token)
  const [succeeded, setSucceeded] = useState(false)

  if (!isValidAction) {
    return <LinkInvalidState variant="invalid" />
  }

  if (isLoading) {
    return <PoResponseSkeleton />
  }

  if (isError || !data || data.linkStatus !== 'valid' || !data.po) {
    if (data?.linkStatus === 'used') {
      return <LinkInvalidState variant="used" respondedStatus={data.po?.po_status} />
    }
    if (data?.linkStatus === 'expired') {
      return <LinkInvalidState variant="expired" />
    }
    return <LinkInvalidState variant="invalid" />
  }

  if (succeeded) {
    return <ActionSuccessState variant={action as PoResponseAction} />
  }

  return (
    <div className="space-y-4">
      <PoSummaryCard po={data.po} />
      {action === 'accept' && (
        <AcceptForm
          token={token}
          currentScheduledDate={data.po.scheduled_date}
          onSuccess={() => setSucceeded(true)}
          onError={(m) => toast(m, 'error')}
        />
      )}
      {action === 'reject' && (
        <RejectForm
          token={token}
          currentScheduledDate={data.po.scheduled_date}
          onSuccess={() => setSucceeded(true)}
          onError={(m) => toast(m, 'error')}
        />
      )}
      {action === 'reschedule' && (
        <RescheduleForm
          token={token}
          currentDate={data.po.scheduled_date}
          onSuccess={() => setSucceeded(true)}
          onError={(m) => toast(m, 'error')}
        />
      )}
    </div>
  )
}

interface FormProps {
  token: string
  onSuccess: () => void
  onError: (message: string) => void
}

function AcceptForm({ token, currentScheduledDate, onSuccess, onError }: FormProps & { currentScheduledDate: string }) {
  const [open, setOpen] = useState(false)
  const mutation = useMutation({
    mutationFn: () => acceptPoResponse(token, currentScheduledDate),
    onSuccess: () => { setOpen(false); onSuccess() },
    onError: () => { setOpen(false); onError('Failed to accept the purchase order. Please try again.') },
  })

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-sm text-slate-600 mb-4">
        By accepting, you confirm you can deliver this purchase order as scheduled above.
      </p>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 bg-[#6692C5] hover:bg-[#4F7CB3] text-white text-sm font-medium rounded-lg transition-colors"
      >
        Accept Order
      </button>

      <ConfirmDialog
        open={open}
        title="Accept Purchase Order"
        description="Are you sure you want to accept this purchase order?"
        confirmLabel="Confirm Accept"
        variant="default"
        isLoading={mutation.isPending}
        onConfirm={() => mutation.mutate()}
        onCancel={() => setOpen(false)}
      />
    </div>
  )
}

function RejectForm({ token, currentScheduledDate, onSuccess, onError }: FormProps & { currentScheduledDate: string }) {
  const [reason, setReason] = useState('')
  const [open, setOpen] = useState(false)
  const mutation = useMutation({
    mutationFn: () => rejectPoResponse(token, reason, currentScheduledDate),
    onSuccess: () => { setOpen(false); onSuccess() },
    onError: () => { setOpen(false); onError('Failed to reject the purchase order. Please try again.') },
  })

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        Reason for rejection <span className="text-red-400">*</span>
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="Let the site manager know why you're rejecting this order..."
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
      />
      <button
        onClick={() => setOpen(true)}
        disabled={!reason.trim()}
        className="w-full mt-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        Submit Rejection
      </button>

      <ConfirmDialog
        open={open}
        title="Reject Purchase Order"
        description="This cannot be undone. Are you sure you want to reject this purchase order?"
        confirmLabel="Confirm Reject"
        variant="danger"
        isLoading={mutation.isPending}
        onConfirm={() => mutation.mutate()}
        onCancel={() => setOpen(false)}
      />
    </div>
  )
}

function RescheduleForm({
  token, currentDate, onSuccess, onError,
}: FormProps & { currentDate: string | null }) {
  const [newDate, setNewDate] = useState('')
  const [reason, setReason] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  const mutation = useMutation({
    mutationFn: () => submitPoRescheduleRequest(token, newDate, reason),
    onSuccess,
    onError: () => onError('Failed to submit the new date. Please try again.'),
  })

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      {currentDate && (
        <p className="text-xs text-slate-500">
          Currently scheduled for <span className="font-medium text-slate-700">{formatDate(currentDate)}</span>
        </p>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          New date <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          min={today}
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          Reason <span className="text-red-400">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Let the site manager know why you need to reschedule..."
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30 resize-none"
        />
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={!newDate || !reason.trim() || mutation.isPending}
        className="w-full py-2.5 bg-[#6692C5] hover:bg-[#4F7CB3] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
        {mutation.isPending ? 'Submitting...' : 'Confirm New Date'}
      </button>
    </div>
  )
}
