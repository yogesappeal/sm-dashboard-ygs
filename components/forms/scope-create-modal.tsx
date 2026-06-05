'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import { insertScopeWithItems, searchContract } from '@/lib/api'
import { generateScopeItem } from '@/lib/utils/scope'
import { cn } from '@/lib/utils'
import type { ScopeItem } from '@/lib/types'

interface ScopeForm {
  scopeName: string
  contractId: string
  type: string
  notes: string
}

interface ScopeCreateModalProps {
  token: string
  onClose: () => void
  queryKey: unknown[]
}

export function ScopeCreateModal({ token, onClose, queryKey }: ScopeCreateModalProps) {
  const queryClient = useQueryClient()
  const [items, setItems] = useState<ScopeItem[]>([generateScopeItem('', '')])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ScopeForm>({
    defaultValues: { type: 'supplier', notes: '' },
  })

  const { data: contractsData } = useQuery({
    queryKey: ['contracts-search', ''],
    queryFn: () => searchContract(token, ''),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  })
  const contracts = contractsData?.data ?? []

  const createMutation = useMutation({
    mutationFn: (data: ScopeForm) =>
      insertScopeWithItems(token, {
        scope_name: data.scopeName,
        contract_id: data.contractId,
        type: data.type,
        notes: data.notes,
        items: items
          .filter((i) => i.buildingName.trim())
          .map((i) => ({ building_name: i.buildingName, trade_items: i.tradeItems })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      onClose()
    },
  })

  const addItem = () => setItems((prev) => [...prev, generateScopeItem('', '')])
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))
  const updateItem = (id: string, field: keyof ScopeItem, value: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)))

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-[437px] bg-white border-l border-slate-200 shadow-xl flex flex-col rounded-tl-[50px]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-slate-100">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-500">New Entry</p>
            <p className="font-medium text-slate-800">Create Scope of Work</p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit((d) => createMutation.mutateAsync(d))}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          <Field label="Scope Name *" error={errors.scopeName?.message}>
            <input
              {...register('scopeName', { required: 'Scope name is required' })}
              className={inputCls(!!errors.scopeName)}
              placeholder="e.g. Full House Package"
              autoFocus
            />
          </Field>

          <Field label="Contract *" error={errors.contractId?.message}>
            <select
              {...register('contractId', { required: 'Contract is required' })}
              className={inputCls(!!errors.contractId)}
            >
              <option value="">Select contract…</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.project_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Type *" error={errors.type?.message}>
            <select
              {...register('type', { required: 'Type is required' })}
              className={inputCls(!!errors.type)}
            >
              <option value="supplier">Supplier</option>
              <option value="subcontractor">Subcontractor</option>
              <option value="both">Both</option>
            </select>
          </Field>

          {/* Scope Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Scope Items</label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-xs text-[#6692C5] hover:text-[#4F7CB3] transition-colors"
              >
                <Plus size={12} /> Add Building
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex gap-2 items-start bg-slate-50 rounded-xl p-3">
                  <div className="flex-1 space-y-2">
                    <input
                      value={item.buildingName}
                      onChange={(e) => updateItem(item.id, 'buildingName', e.target.value)}
                      placeholder="Building name (e.g. House, Garage)"
                      className={inputCls(false)}
                    />
                    <input
                      value={item.tradeItems}
                      onChange={(e) => updateItem(item.id, 'tradeItems', e.target.value)}
                      placeholder="Trade items (e.g. Roofing, Interior)"
                      className={inputCls(false)}
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-slate-300 hover:text-red-400 transition-colors mt-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Field label="Notes" error={undefined}>
            <textarea
              {...register('notes')}
              rows={3}
              className={inputCls(false)}
              placeholder="Additional notes (optional)"
            />
          </Field>

          {createMutation.isError && (
            <p className="text-xs text-red-500 text-center">Failed to create scope. Please try again.</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#6692C5] hover:bg-[#4F7CB3] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {(isSubmitting || createMutation.isPending) && <Loader2 size={14} className="animate-spin" />}
              Create Scope
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function inputCls(hasError: boolean) {
  return cn(
    'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors',
    'focus:ring-2 focus:ring-[#6692C5]/30 focus:border-[#6692C5]',
    hasError ? 'border-red-300' : 'border-slate-200'
  )
}
