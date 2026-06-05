'use client'

import { useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { getClientsPaginated, getSuppliersPaginated, insertPurchaseOrder } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface MaterialRow {
  id: string
  description: string
  qty: string
  unit: string
  unitRate: string
}

function calcAmount(qty: string, unitRate: string): number {
  const q = parseFloat(qty) || 0
  const r = parseFloat(unitRate) || 0
  return q * r
}

export default function POSupplierFormPage() {
  return (
    <Suspense>
      <POSupplierFormInner />
    </Suspense>
  )
}

function POSupplierFormInner() {
  const { token, user } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [contractId, setContractId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [siteInfo, setSiteInfo] = useState('')
  const [materials, setMaterials] = useState<MaterialRow[]>([
    { id: '1', description: '', qty: '', unit: '', unitRate: '' },
  ])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: contractsData } = useQuery({
    queryKey: ['contracts-dropdown'],
    queryFn: () => getClientsPaginated(token!, { limit: 100 }),
    enabled: !!token,
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-dropdown'],
    queryFn: () => getSuppliersPaginated(token!, { limit: 100, type: 'Supplier' }),
    enabled: !!token,
  })

  const contracts = contractsData?.data ?? []
  const suppliers = suppliersData?.data ?? []

  const insertMutation = useMutation({
    mutationFn: (body: unknown) => insertPurchaseOrder(token!, body),
    onSuccess: () => router.push('/purchase-orders'),
  })

  const addRow = useCallback(() => {
    setMaterials((prev) => [
      ...prev,
      { id: String(Date.now()), description: '', qty: '', unit: '', unitRate: '' },
    ])
  }, [])

  const removeRow = useCallback((id: string) => {
    setMaterials((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const updateRow = useCallback((id: string, field: keyof MaterialRow, value: string) => {
    setMaterials((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }, [])

  const totalAmount = materials.reduce(
    (sum, r) => sum + calcAmount(r.qty, r.unitRate),
    0
  )

  const validate = () => {
    const e: Record<string, string> = {}
    if (!contractId) e.contractId = 'Select a contract'
    if (!supplierId) e.supplierId = 'Select a supplier'
    if (!deliveryDate) e.deliveryDate = 'Select delivery date'
    if (materials.every((r) => !r.description)) e.materials = 'Add at least one material'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (isDraft: boolean) => {
    if (!validate()) return
    const body = {
      contract_id: contractId,
      supplier_id: supplierId,
      supplier_name: supplierName,
      scheduled_date: deliveryDate,
      site_information: siteInfo,
      type: 'supplier',
      status: isDraft ? 'PO Draft' : 'PO Submitted',
      sm_name: user?.full_name ?? '',
      order_details: materials.map((r) => ({
        description: r.description,
        quantity: parseFloat(r.qty) || 0,
        unit: r.unit,
        unit_rate: parseFloat(r.unitRate) || 0,
        amount: calcAmount(r.qty, r.unitRate),
      })),
      total_amount: totalAmount,
    }
    insertMutation.mutate(body)
  }

  const fieldClass = (field: string) =>
    `w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30 ${
      errors[field] ? 'border-red-300' : 'border-slate-200'
    }`

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">
          {editId ? 'Edit Supplier PO' : 'New Supplier PO'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: main form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contract & Supplier */}
          <FormCard title="Order Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Contract <span className="text-red-400">*</span>
                </label>
                <select
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value)}
                  className={fieldClass('contractId')}
                >
                  <option value="">Select contract...</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.project_name}
                    </option>
                  ))}
                </select>
                {errors.contractId && <p className="text-xs text-red-400 mt-1">{errors.contractId}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Supplier <span className="text-red-400">*</span>
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => {
                    setSupplierId(e.target.value)
                    const s = suppliers.find((s) => s.id === e.target.value)
                    setSupplierName(s?.name ?? '')
                  }}
                  className={fieldClass('supplierId')}
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.supplierId && <p className="text-xs text-red-400 mt-1">{errors.supplierId}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Delivery Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className={fieldClass('deliveryDate')}
                />
                {errors.deliveryDate && <p className="text-xs text-red-400 mt-1">{errors.deliveryDate}</p>}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Site Information</label>
              <textarea
                value={siteInfo}
                onChange={(e) => setSiteInfo(e.target.value)}
                rows={3}
                placeholder="Enter site information..."
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30 resize-none"
              />
            </div>
          </FormCard>

          {/* Materials */}
          <FormCard title="Material / Order Items">
            {errors.materials && (
              <p className="text-xs text-red-400 mb-3">{errors.materials}</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-3">Description</th>
                    <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-3 w-20">Qty</th>
                    <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-3 w-20">Unit</th>
                    <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-3 w-28">Unit Rate</th>
                    <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-3 w-28">Amount</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {materials.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3">
                        <input
                          value={row.description}
                          onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                          placeholder="Item description"
                          className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#6692C5]/30"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min="0"
                          value={row.qty}
                          onChange={(e) => updateRow(row.id, 'qty', e.target.value)}
                          placeholder="0"
                          className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#6692C5]/30"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          value={row.unit}
                          onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                          placeholder="pcs"
                          className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#6692C5]/30"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min="0"
                          value={row.unitRate}
                          onChange={(e) => updateRow(row.id, 'unitRate', e.target.value)}
                          placeholder="0.00"
                          className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#6692C5]/30"
                        />
                      </td>
                      <td className="py-2 pr-3 text-slate-700 text-xs font-medium">
                        {formatCurrency(calcAmount(row.qty, row.unitRate))}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => removeRow(row.id)}
                          disabled={materials.length === 1}
                          className="text-slate-300 hover:text-red-400 transition-colors disabled:opacity-20"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={addRow}
              className="flex items-center gap-1.5 mt-3 text-xs text-[#6692C5] hover:text-[#4F7CB3] font-medium transition-colors"
            >
              <Plus size={14} />
              Add Item
            </button>
          </FormCard>
        </div>

        {/* Right: summary + actions */}
        <div className="space-y-4">
          <FormCard title="Summary">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Items</span>
                <span className="font-medium">{materials.filter((r) => r.description).length}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-100 pt-2 mt-2">
                <span className="text-slate-600 font-medium">Total Amount</span>
                <span className="font-semibold text-slate-800">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </FormCard>

          <div className="space-y-2">
            <button
              onClick={() => handleSubmit(false)}
              disabled={insertMutation.isPending}
              className="w-full py-2.5 bg-[#6692C5] hover:bg-[#4F7CB3] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {insertMutation.isPending ? 'Submitting...' : 'Submit PO'}
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={insertMutation.isPending}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>
          </div>

          {insertMutation.isError && (
            <p className="text-xs text-red-400 text-center">
              Failed to save. Please try again.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      {children}
    </div>
  )
}
