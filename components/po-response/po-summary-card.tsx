import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { PoResponsePo } from '@/lib/types'

export function PoSummaryCard({ po }: { po: PoResponsePo }) {
  const clientName = [po.client_first_name, po.client_last_name].map((s) => s?.trim()).filter(Boolean).join(' ')

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800 truncate">{po.po_number}</p>
        <StatusBadge status={po.po_status} />
      </div>

      <div className="px-5 py-4 space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <SummaryRow label="Supplier" value={po.supplier_name} />
          <SummaryRow label="Scheduled Date" value={formatDate(po.scheduled_date) || po.scheduled_date} />
          {po.type !== 'subcontractor' && <SummaryRow label="Delivery Method" value={po.method} />}
          {po.type === 'subcontractor' && po.po_amount > 0 && (
            <SummaryRow label="Total Price" value={formatCurrency(po.po_amount)} />
          )}
          {clientName && <SummaryRow label="Client" value={clientName} />}
          {po.address && <SummaryRow label="Address" value={po.address} />}
        </div>

        {po.order_details?.details && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Order Details</p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{po.order_details.details}</p>
          </div>
        )}

        {po.site_information && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Site Information</p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{po.site_information}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-slate-700 mt-0.5">{value || '-'}</p>
    </div>
  )
}
