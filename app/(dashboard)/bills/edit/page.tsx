'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  ArrowLeft,
  Save,
  Send,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { MOCK_BILLS } from '@/lib/data/mock-bills'
import type { Bill } from '@/lib/types/bill'

// TODO: Replace MOCK_BILLS with useQuery(() => getBillById(token!, id))

/** Mock PDF invoice rendered as an HTML page for preview */
function PdfPreview({ bill }: { bill: Bill }) {
  const li = bill.line_items[0]
  return (
    <div className="w-full max-w-[520px] aspect-[1/1.414] bg-white shadow-md flex flex-col p-10 mx-auto text-slate-800">
      <div className="flex justify-between items-start mb-12">
        <div>
          <h2 className="text-2xl font-bold text-[#6692C5] mb-1">TAX INVOICE</h2>
          <p className="text-sm font-semibold">Invoice No: {bill.reference}</p>
          <p className="text-xs text-slate-500">Date: {bill.date}</p>
        </div>
        <div className="text-right">
          <h3 className="font-bold text-base">{bill.supplier}</h3>
          <p className="text-xs text-slate-500 mt-1">ABN 12 345 678 901<br />123 Industrial Way<br />Port Adelaide, SA 5015</p>
        </div>
      </div>
      <div className="mb-8">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Bill To:</p>
        <p className="text-sm">Acme Construction Corp<br />Level 4, 100 King St<br />Melbourne VIC 3000</p>
      </div>
      <div className="flex-1">
        <div className="h-px bg-slate-200 mb-3" />
        <div className="flex text-xs font-semibold text-slate-400 mb-2 px-1">
          <div className="w-16">Item</div>
          <div className="flex-1">Description</div>
          <div className="w-10 text-right">Qty</div>
          <div className="w-20 text-right">Unit Price</div>
          <div className="w-16 text-right">Total</div>
        </div>
        <div className="h-px bg-slate-200 mb-3" />
        {bill.line_items.map((li) => (
          <div key={li.id} className="flex text-sm px-1 mb-2">
            <div className="w-16 font-mono text-xs text-slate-500">{li.item_code}</div>
            <div className="flex-1">{li.description}</div>
            <div className="w-10 text-right">{li.quantity}</div>
            <div className="w-20 text-right">${li.unit_price.toFixed(2)}</div>
            <div className="w-16 text-right font-medium">${(li.unit_price * li.quantity).toFixed(2)}</div>
          </div>
        ))}
      </div>
      <div className="w-56 self-end mt-4 space-y-1">
        <div className="flex justify-between text-sm">
          <span>Subtotal (ex GST)</span>
          <span>${li ? (li.unit_price * li.quantity).toFixed(2) : '0.00'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>GST (10%)</span>
          <span>${(bill.amount - (li ? li.unit_price * li.quantity : 0)).toFixed(2)}</span>
        </div>
        <div className="h-px bg-slate-200" />
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>${bill.amount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

function EditBillContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const billId = searchParams.get('bill') ?? MOCK_BILLS[0]?.id ?? ''
  const bill = MOCK_BILLS.find((b) => b.id === billId) ?? MOCK_BILLS[0]

  const [supplier, setSupplier] = useState(bill?.supplier ?? '')
  const [date, setDate] = useState(bill?.date ?? '')
  const [dueDate, setDueDate] = useState(bill?.due_date ?? '')
  const [reference, setReference] = useState(bill?.reference ?? '')
  const [note, setNote] = useState('')

  if (!bill) {
    return <div className="flex-1 flex items-center justify-center text-slate-400">Bill not found.</div>
  }

  function handleSave() {
    // TODO: PATCH /functions/v1/update-bill with form state
    router.push(`/bills?bill=${bill.id}`)
  }

  function handleSaveAndSubmit() {
    // TODO: PATCH /functions/v1/update-and-submit-bill with form state
    router.push(`/bills?bill=${bill.id}`)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden -m-4 md:-m-6">
      {/* ── Top action bar ── */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 flex-shrink-0 z-10">
        <div className="flex flex-col">
          <button
            onClick={() => router.push(`/bills?bill=${bill.id}`)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors mb-0.5"
          >
            <ArrowLeft size={13} />
            {bill.supplier} / Bills
          </button>
          <h1 className="text-base font-semibold text-slate-800">Edit Bill</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Save size={15} />
            Save changes
          </button>
          <button
            onClick={handleSaveAndSubmit}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#6692C5] hover:bg-[#4F7CB3] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Send size={15} />
            Save and submit for approval
          </button>
        </div>
      </div>

      {/* ── Split view ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: PDF preview */}
        <div className="w-[42%] flex-shrink-0 flex flex-col border-r border-slate-200 overflow-hidden">
          {/* PDF toolbar */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800 text-slate-200 flex-shrink-0">
            <span className="text-xs font-medium truncate">{bill.files[0]?.name ?? 'No file'}</span>
            <div className="flex items-center gap-1">
              <button className="p-1.5 hover:bg-slate-700 rounded transition-colors"><ZoomOut size={14} /></button>
              <span className="text-[11px] w-10 text-center">100%</span>
              <button className="p-1.5 hover:bg-slate-700 rounded transition-colors"><ZoomIn size={14} /></button>
              <button className="p-1.5 hover:bg-slate-700 rounded transition-colors"><RotateCw size={14} /></button>
              <div className="w-px h-4 bg-slate-600 mx-1" />
              <button className="p-1.5 hover:bg-slate-700 rounded transition-colors"><ChevronLeft size={14} /></button>
              <span className="text-[11px]">1 of {bill.files[0] ? 3 : 0}</span>
              <button className="p-1.5 hover:bg-slate-700 rounded transition-colors"><ChevronRight size={14} /></button>
            </div>
          </div>

          {/* PDF canvas area */}
          <div className="flex-1 overflow-auto bg-slate-300 flex items-start justify-center p-6">
            <PdfPreview bill={bill} />
          </div>
        </div>

        {/* Right: Editable form */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6 min-w-0">
          {/* Supplier Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Supplier Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Contact</label>
                <select
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30 focus:border-[#6692C5]/50 bg-white"
                >
                  <option>Stratco</option>
                  <option>Bunnings Trade</option>
                  <option>East Coast Waste Pty Ltd</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30 focus:border-[#6692C5]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30 focus:border-[#6692C5]/50"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Reference / Invoice No.</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30 focus:border-[#6692C5]/50"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Note for approvers (Internal)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Enter comments or context for the approval routing..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30 focus:border-[#6692C5]/50 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Line Items</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>Currency: <span className="font-medium text-slate-700">AUD</span></span>
                <span>Amounts are: <span className="font-medium text-slate-700">Tax exclusive</span></span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[780px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['Item Code', 'Description', 'Qty', 'Unit Price', 'Account', 'Tax Rate', 'Tags / Tracking', 'Amount'].map((col) => (
                      <th key={col} className="px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap last:text-right">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bill.line_items.map((li) => (
                    <tr key={li.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                      <td className="px-3 py-2">
                        <input
                          defaultValue={li.item_code}
                          className="w-full bg-transparent border border-transparent group-hover:border-slate-200 focus:border-[#6692C5] focus:bg-white rounded px-2 py-1 text-sm font-mono text-slate-700 focus:outline-none transition-all"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          defaultValue={li.description}
                          className="w-full bg-transparent border border-transparent group-hover:border-slate-200 focus:border-[#6692C5] focus:bg-white rounded px-2 py-1 text-sm text-slate-700 focus:outline-none transition-all"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          defaultValue={li.quantity}
                          className="w-16 bg-transparent border border-transparent group-hover:border-slate-200 focus:border-[#6692C5] focus:bg-white rounded px-2 py-1 text-sm text-slate-700 text-right focus:outline-none transition-all"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          defaultValue={li.unit_price.toFixed(2)}
                          className="w-24 bg-transparent border border-transparent group-hover:border-slate-200 focus:border-[#6692C5] focus:bg-white rounded px-2 py-1 text-sm text-slate-700 text-right focus:outline-none transition-all"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select className="w-full bg-transparent border border-transparent group-hover:border-slate-200 focus:border-[#6692C5] focus:bg-white rounded px-2 py-1 text-xs text-slate-700 focus:outline-none transition-all appearance-none">
                          <option>{li.account}</option>
                          <option>105 - Equipment Hire</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select className="w-full bg-transparent border border-transparent group-hover:border-slate-200 focus:border-[#6692C5] focus:bg-white rounded px-2 py-1 text-xs text-slate-700 focus:outline-none transition-all appearance-none">
                          <option>{li.tax_rate}</option>
                          <option>GST Free</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600 w-max">
                            {li.sm_dept}
                          </span>
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600 w-max truncate max-w-[130px]" title={li.site_tag}>
                            {li.site_tag}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-sm text-slate-800">
                        {li.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-start justify-between px-4 py-3 border-t border-slate-100">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors">
                <Plus size={13} />
                Add line
              </button>
              <div className="w-56 bg-slate-50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono">{bill.line_items.reduce((s, li) => s + li.unit_price * li.quantity, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Total Tax</span>
                  <span className="font-mono">{bill.line_items.reduce((s, li) => s + (li.amount - li.unit_price * li.quantity), 0).toFixed(2)}</span>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="flex justify-between text-sm font-bold text-slate-800">
                  <span>Total AUD</span>
                  <span className="font-mono">{bill.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Attached Files */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Attached Files</h2>
            <div className="space-y-2">
              {bill.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{file.name}</p>
                      <p className="text-xs text-slate-400">{file.size_mb} MB</p>
                    </div>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 rounded-full transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {/* Upload zone */}
              <button className="w-full py-5 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-[#6692C5]/40 hover:text-[#6692C5] transition-all flex flex-col items-center gap-1 group">
                <UploadCloud size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Click to upload or drag files here</span>
                <span className="text-xs">PDF, JPG, PNG up to 10MB</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EditBillPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading…</div>}>
      <EditBillContent />
    </Suspense>
  )
}
