'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { getClientsPaginated, getSuppliersPaginated, insertPurchaseOrderSubcontractor } from '@/lib/api'

export default function POSubsFormPage() {
  return (
    <Suspense>
      <POSubsFormInner />
    </Suspense>
  )
}

function POSubsFormInner() {
  const { token, user } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [contractId, setContractId] = useState('')
  const [subsId, setSubsId] = useState('')
  const [subsName, setSubsName] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [siteInfo, setSiteInfo] = useState('')
  const [jobDetails, setJobDetails] = useState('')
  const [totalPrice, setTotalPrice] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: contractsData } = useQuery({
    queryKey: ['contracts-dropdown'],
    queryFn: () => getClientsPaginated(token!, { limit: 100 }),
    enabled: !!token,
  })

  const { data: subsData } = useQuery({
    queryKey: ['subs-dropdown'],
    queryFn: () => getSuppliersPaginated(token!, { limit: 100, type: 'Subcontractor' }),
    enabled: !!token,
  })

  const contracts = contractsData?.data ?? []
  const subsList = subsData?.data ?? []

  const insertMutation = useMutation({
    mutationFn: (body: unknown) => insertPurchaseOrderSubcontractor(token!, body),
    onSuccess: () => router.push('/purchase-orders'),
  })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!contractId) e.contractId = 'Select a contract'
    if (!subsId) e.subsId = 'Select a subcontractor'
    if (!deliveryDate) e.deliveryDate = 'Select delivery date'
    if (!totalPrice || parseFloat(totalPrice) <= 0) e.totalPrice = 'Enter total price'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (isDraft: boolean) => {
    if (!validate()) return
    const body = {
      contract_id: contractId,
      subs_id: subsId,
      subs_name: subsName,
      scheduled_date: deliveryDate,
      site_information: siteInfo,
      order_details: jobDetails,
      total_price: parseFloat(totalPrice) || 0,
      type: 'subcontractor',
      status: isDraft ? 'PO Draft' : 'PO Submitted',
      sm_name: user?.full_name ?? '',
    }
    insertMutation.mutate(body)
  }

  const fieldClass = (field: string) =>
    `w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C66EEB]/30 ${
      errors[field] ? 'border-red-300' : 'border-slate-200'
    }`

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">
          {editId ? 'Edit Subcontractor PO' : 'New Subcontractor PO'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
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
                  Subcontractor <span className="text-red-400">*</span>
                </label>
                <select
                  value={subsId}
                  onChange={(e) => {
                    setSubsId(e.target.value)
                    const s = subsList.find((s) => s.id === e.target.value)
                    setSubsName(s?.name ?? '')
                  }}
                  className={fieldClass('subsId')}
                >
                  <option value="">Select subcontractor...</option>
                  {subsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.subsId && <p className="text-xs text-red-400 mt-1">{errors.subsId}</p>}
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

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Total Price (AUD) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                  placeholder="0.00"
                  className={fieldClass('totalPrice')}
                />
                {errors.totalPrice && <p className="text-xs text-red-400 mt-1">{errors.totalPrice}</p>}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Site Information</label>
              <textarea
                value={siteInfo}
                onChange={(e) => setSiteInfo(e.target.value)}
                rows={3}
                placeholder="Enter site information..."
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C66EEB]/30 resize-none"
              />
            </div>
          </FormCard>

          <FormCard title="Job Details">
            <textarea
              value={jobDetails}
              onChange={(e) => setJobDetails(e.target.value)}
              rows={5}
              placeholder="Describe the job scope and details..."
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C66EEB]/30 resize-none"
            />
          </FormCard>
        </div>

        <div className="space-y-4">
          <FormCard title="Summary">
            <div className="space-y-2">
              <div className="flex justify-between text-sm border-t border-slate-100 pt-2">
                <span className="text-slate-600 font-medium">Total Price</span>
                <span className="font-semibold text-slate-800">
                  {totalPrice ? `$${parseFloat(totalPrice).toLocaleString('en-AU', { minimumFractionDigits: 2 })}` : '$0.00'}
                </span>
              </div>
            </div>
          </FormCard>

          <div className="space-y-2">
            <button
              onClick={() => handleSubmit(false)}
              disabled={insertMutation.isPending}
              className="w-full py-2.5 bg-[#C66EEB] hover:bg-[#A855D4] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
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
