'use client'

import { useState } from 'react'
import { X, Plus, FileText, Send, Check, XCircle, ChevronDown, Clock, Package, Activity, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/status-badge'
import type { CanvasContext, CanvasAction } from './canvas-state'

// ─── Activity Canvas ──────────────────────────────────────────────────────────

const ACTIVITIES = [
  { id: 1, Icon: Package, color: 'bg-blue-100 text-blue-500', label: 'PO-2026-003 created', sub: 'Plumbing Mate · Subcontractor PO · $3,200', date: '12 Feb 2026, 2:00 PM' },
  { id: 2, Icon: Send, color: 'bg-purple-100 text-purple-500', label: 'PO-2026-002 submitted to Elec Sub', sub: 'Status changed: PO Draft → PO Submitted', date: '11 Feb 2026, 11:30 AM' },
  { id: 3, Icon: Package, color: 'bg-blue-100 text-blue-500', label: 'PO-2026-001 created', sub: 'Roofing Co. · Supplier PO · $12,500', date: '10 Feb 2026, 9:00 AM' },
  { id: 4, Icon: CheckCircle2, color: 'bg-green-100 text-green-500', label: 'Scope SC-2026-00001 updated', sub: 'House · Electrical status changed to In Progress', date: '8 Feb 2026, 3:15 PM' },
  { id: 5, Icon: AlertCircle, color: 'bg-red-100 text-red-500', label: 'Plumbing flagged as Urgent', sub: 'House · Plumbing — immediate action required', date: '7 Feb 2026, 10:00 AM' },
  { id: 6, Icon: FileText, color: 'bg-slate-100 text-slate-500', label: 'Contract created', sub: "SC-2026-00001-3E3 — Lisa D'Hondt", date: '10 Jan 2026, 9:00 AM' },
]

function ActivityCanvas() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Activity</h2>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-5 bottom-5 w-px bg-slate-100" />

          <div className="flex flex-col gap-1">
            {ACTIVITIES.map((a) => (
              <div key={a.id} className="flex items-start gap-4 relative group">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ring-4 ring-white', a.color)}>
                  <a.Icon size={16} />
                </div>
                <div className="flex-1 bg-white rounded-xl border border-slate-100 px-4 py-3 mb-3 hover:border-slate-200 transition-colors">
                  <p className="text-sm font-medium text-slate-700">{a.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.sub}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Clock size={10} className="text-slate-300" />
                    <p className="text-[10px] text-slate-300">{a.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Create PO Canvas ─────────────────────────────────────────────────────────

const SUPPLIERS = ['Roofing Co.', 'BlueScope Steel', 'Dulux Paint', 'James Hardie', 'CSR Building Products']
const SUBS = ['Elec Sub Pty Ltd', 'Plumbing Mate', 'Render Bros', 'Insulation Plus', 'Tiling Express']

function MaterialRow({ onRemove }: { onRemove: () => void }) {
  return (
    <div className="grid grid-cols-[2fr_80px_80px_120px_32px] gap-2 items-center">
      <input className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C66EEB]/30 focus:border-[#C66EEB]" placeholder="Description" />
      <input className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C66EEB]/30 focus:border-[#C66EEB] text-center" placeholder="Qty" type="number" />
      <input className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C66EEB]/30 focus:border-[#C66EEB]" placeholder="Unit" />
      <input className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C66EEB]/30 focus:border-[#C66EEB]" placeholder="0.00" type="number" />
      <button onClick={onRemove} className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors">
        <X size={14} />
      </button>
    </div>
  )
}

function CreatePOCanvas({
  canvas,
  onCanvas,
}: {
  canvas: Extract<CanvasContext, { view: 'create-po' }>
  onCanvas: (a: CanvasAction) => void
}) {
  const [type, setType] = useState<'supplier' | 'subcontractor'>(canvas.poType)
  const [rows, setRows] = useState([1])

  return (
    <div className="flex flex-col h-full">
      {/* Canvas header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Create Purchase Order</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {canvas.buildingName && canvas.tradeName
              ? `${canvas.buildingName} · ${canvas.tradeName}`
              : 'Fill in supplier and material details'}
          </p>
        </div>
        <button
          onClick={() => onCanvas({ type: 'SHOW_ACTIVITY' })}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <div className="space-y-5">
          {/* Type toggle */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
            {(['supplier', 'subcontractor'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  'px-5 py-2 text-sm font-medium rounded-lg transition-colors capitalize',
                  type === t ? 'bg-[#C66EEB] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Supplier information card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Supplier Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {type === 'supplier' ? 'Supplier Name' : 'Subcontractor Name'}
                </label>
                <div className="relative">
                  <select className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C66EEB]/30 focus:border-[#C66EEB] appearance-none bg-white">
                    <option value="">Choose {type === 'supplier' ? 'supplier' : 'subcontractor'}</option>
                    {(type === 'supplier' ? SUPPLIERS : SUBS).map(s => <option key={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Delivery Date</label>
                <input type="date" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C66EEB]/30 focus:border-[#C66EEB]" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Site Information</label>
                <textarea rows={2} placeholder="Type here..." className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C66EEB]/30 focus:border-[#C66EEB] resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Delivery Method</label>
                <div className="flex items-center gap-4 mt-1">
                  {['Pickup', 'Delivery'].map(m => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="delivery" value={m} defaultChecked={m === 'Delivery'} className="accent-[#C66EEB]" />
                      <span className="text-sm text-slate-600">{m}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Scope details */}
          {type === 'supplier' ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Material Order</h3>
              {/* Table header */}
              <div className="grid grid-cols-[2fr_80px_80px_120px_32px] gap-2 mb-2">
                {['Description', 'Qty', 'Unit', 'Rate (AUD)', ''].map((h, i) => (
                  <p key={i} className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{h}</p>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {rows.map((r) => (
                  <MaterialRow key={r} onRemove={() => setRows(prev => prev.filter(x => x !== r))} />
                ))}
              </div>
              <button
                onClick={() => setRows(prev => [...prev, Date.now()])}
                className="mt-3 flex items-center gap-1.5 text-sm text-[#C66EEB] hover:text-purple-700 font-medium transition-colors"
              >
                <Plus size={14} /> Add Row
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Job Details</h3>
              <div className="space-y-4">
                <div className="w-1/2">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Total Price (AUD)</label>
                  <input type="number" placeholder="0.00" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C66EEB]/30 focus:border-[#C66EEB]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Job Details</label>
                  <textarea rows={4} placeholder="Describe the scope of work in detail..." className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C66EEB]/30 focus:border-[#C66EEB] resize-none" />
                </div>
              </div>
            </div>
          )}

          {/* Attachment */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Attachment</h3>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-[#C66EEB]/40 transition-colors cursor-pointer">
              <FileText size={20} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Drop files here or <span className="text-[#C66EEB] font-medium">browse</span></p>
              <p className="text-xs text-slate-300 mt-1">PDF, JPG, PNG up to 10MB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-slate-200 bg-white flex-shrink-0">
        <button
          onClick={() => onCanvas({ type: 'SHOW_ACTIVITY' })}
          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <X size={14} /> Cancel
        </button>
        <button className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          Save as Draft
        </button>
        <button className="flex items-center gap-2 px-5 py-2 text-sm bg-[#C66EEB] hover:bg-[#b55fd4] text-white font-medium rounded-lg transition-colors shadow-sm">
          Preview PO
        </button>
      </div>
    </div>
  )
}

// ─── PO Detail Canvas ─────────────────────────────────────────────────────────

const DUMMY_PO_DETAILS: Record<string, {
  po_number: string; type: string; status: string; supplier_name: string
  delivery_date: string; site_info: string; amount: number
  email: string; phone: string; order_details: string
}> = {
  'po-1': {
    po_number: 'PO-2026-001', type: 'supplier', status: 'PO Draft',
    supplier_name: 'Roofing Co.', delivery_date: '20 Feb 2026',
    site_info: '25 Lake Point Way, Lake Point Way NSW',
    amount: 12500, email: 'contact@roofingco.com.au', phone: '+61 2 9000 1234',
    order_details: 'Supply and deliver Colorbond roofing sheets — 120 sqm. Include all fixings, flashing and ridge capping.',
  },
  'po-2': {
    po_number: 'PO-2026-002', type: 'subcontractor', status: 'PO Submitted',
    supplier_name: 'Elec Sub Pty Ltd', delivery_date: '25 Feb 2026',
    site_info: '25 Lake Point Way, Lake Point Way NSW',
    amount: 8200, email: 'jobs@elecsub.com.au', phone: '+61 2 9000 5678',
    order_details: 'Rewire entire house (4 bed, 2 bath). Supply and install new switchboard. Test and certify all circuits.',
  },
  'po-3': {
    po_number: 'PO-2026-003', type: 'subcontractor', status: 'PO Completed',
    supplier_name: 'Plumbing Mate', delivery_date: '15 Feb 2026',
    site_info: '25 Lake Point Way, Lake Point Way NSW',
    amount: 3200, email: 'info@plumbingmate.com.au', phone: '+61 2 9000 9012',
    order_details: 'Replace all bathroom and kitchen fixtures. Repair burst pipe in garage. Test all connections.',
  },
}

function PODetailCanvas({
  canvas,
  onCanvas,
}: {
  canvas: Extract<CanvasContext, { view: 'po-detail' }>
  onCanvas: (a: CanvasAction) => void
}) {
  const [showReject, setShowReject] = useState(false)
  const po = DUMMY_PO_DETAILS[canvas.poId] ?? DUMMY_PO_DETAILS['po-1']

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-800">{po.po_number}</h2>
          <StatusBadge status={po.status} />
          <StatusBadge status={po.type} />
        </div>
        <div className="flex items-center gap-2">
          {po.status === 'PO Draft' && (
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#C66EEB] hover:bg-[#b55fd4] text-white font-medium rounded-lg transition-colors">
              <Send size={12} /> Send PO
            </button>
          )}
          {po.status === 'PO Submitted' && (
            <>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors">
                <Check size={12} /> Accept
              </button>
              <button
                onClick={() => setShowReject(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-200 bg-red-50 hover:bg-red-100 text-red-500 font-medium rounded-lg transition-colors"
              >
                <XCircle size={12} /> Reject
              </button>
            </>
          )}
          <button
            onClick={() => onCanvas({ type: 'SHOW_ACTIVITY' })}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Reject reason */}
      {showReject && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex-shrink-0">
          <p className="text-xs font-semibold text-red-700 mb-2">Reason for rejection</p>
          <textarea rows={2} placeholder="Explain why this PO is being rejected..." className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 resize-none bg-white" />
          <div className="flex gap-2 mt-3">
            <button onClick={() => setShowReject(false)} className="px-4 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <button className="px-4 py-1.5 text-sm bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors">Confirm Reject</button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <div className="grid grid-cols-3 gap-4 content-start">
          {/* Main info */}
          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">PO Information</p>
              </div>
              {[
                { label: 'PO Number', value: po.po_number },
                { label: 'Status', value: <StatusBadge status={po.status} /> },
                { label: 'Type', value: <StatusBadge status={po.type} /> },
                { label: 'Delivery Date', value: po.delivery_date },
                { label: 'Total Amount', value: <span className="font-semibold text-slate-800">${po.amount.toLocaleString()}</span> },
              ].map(row => (
                <div key={row.label} className="flex items-center px-4 py-3 border-b border-slate-50 last:border-0">
                  <p className="text-xs text-slate-400 w-36 flex-shrink-0">{row.label}</p>
                  <div className="text-sm text-slate-700">{row.value}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Order Details</p>
              </div>
              <div className="px-4 py-4">
                <p className="text-sm text-slate-600 leading-relaxed">{po.order_details}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Site Information</p>
              </div>
              <div className="px-4 py-4">
                <p className="text-sm text-slate-600">{po.site_info}</p>
              </div>
            </div>
          </div>

          {/* Side cards */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {po.type === 'supplier' ? 'Supplier' : 'Subcontractor'}
                </p>
              </div>
              {[
                { label: 'Name', value: po.supplier_name },
                { label: 'Email', value: po.email },
                { label: 'Phone', value: po.phone },
              ].map(row => (
                <div key={row.label} className="px-4 py-3 border-b border-slate-50 last:border-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{row.label}</p>
                  <p className="text-xs text-slate-700 font-medium break-all">{row.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Client</p>
              </div>
              {[
                { label: 'Name', value: "Lisa D'Hondt" },
                { label: 'Address', value: '25 Lake Point Way, NSW' },
                { label: 'Mobile', value: '+1 235689' },
              ].map(row => (
                <div key={row.label} className="px-4 py-3 border-b border-slate-50 last:border-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{row.label}</p>
                  <p className="text-xs text-slate-700 font-medium">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Center Panel ─────────────────────────────────────────────────────────────

export function CenterPanel({ canvas, onCanvas }: {
  canvas: CanvasContext
  onCanvas: (action: CanvasAction) => void
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {canvas.view === 'activity' && <ActivityCanvas />}
      {canvas.view === 'create-po' && <CreatePOCanvas canvas={canvas} onCanvas={onCanvas} />}
      {canvas.view === 'po-detail' && <PODetailCanvas canvas={canvas} onCanvas={onCanvas} />}
    </div>
  )
}
